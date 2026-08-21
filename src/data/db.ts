import * as SQLite from 'expo-sqlite';

import { converterParaOcorrencias, DividaAntiga } from '@/domain/divida';
import { mesCorrente } from '@/domain/mes';

const DB_NAME = 'quitae.db';

/**
 * Cada entrada é aplicada em ordem e o índice+1 vira o `user_version`.
 * Para evoluir o schema, adicione uma nova função no fim do array —
 * nunca edite uma migração já publicada.
 */
const MIGRATIONS: ((db: SQLite.SQLiteDatabase) => Promise<void>)[] = [
  async (db) => {
    await db.execAsync(`
      CREATE TABLE dividas (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT 'local',
        owner_id TEXT NOT NULL DEFAULT 'me',
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('recorrente', 'parcelada', 'pontual')),
        valor REAL NOT NULL,
        data_vencimento TEXT,
        dia_vencimento_recorrente INTEGER,
        parcela_atual INTEGER,
        parcela_total INTEGER,
        categoria TEXT,
        ativa INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT NOT NULL
      );

      CREATE INDEX idx_dividas_workspace ON dividas (workspace_id, ativa);

      CREATE TABLE reservas (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT 'local',
        owner_id TEXT NOT NULL DEFAULT 'me',
        nome TEXT NOT NULL,
        valor REAL NOT NULL,
        finalidade TEXT,
        criado_em TEXT NOT NULL
      );

      CREATE TABLE renda_mensal (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT 'local',
        owner_id TEXT NOT NULL DEFAULT 'me',
        mes_referencia TEXT NOT NULL,
        valor REAL NOT NULL
      );

      CREATE UNIQUE INDEX idx_renda_mes
        ON renda_mensal (workspace_id, owner_id, mes_referencia);
    `);
  },

  // Categorias gerenciáveis e preferências locais (nome do usuário, tema).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE categorias (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT 'local',
        owner_id TEXT NOT NULL DEFAULT 'me',
        nome TEXT NOT NULL,
        criado_em TEXT NOT NULL
      );

      CREATE UNIQUE INDEX idx_categorias_nome
        ON categorias (workspace_id, owner_id, nome);

      CREATE TABLE preferencias (
        workspace_id TEXT NOT NULL DEFAULT 'local',
        owner_id TEXT NOT NULL DEFAULT 'me',
        chave TEXT NOT NULL,
        valor TEXT NOT NULL,
        PRIMARY KEY (workspace_id, owner_id, chave)
      );
    `);

    // Semeia categorias comuns para o app não abrir vazio.
    // randomblob evita importar um gerador de UUID dentro da migração.
    for (const nome of ['Moradia', 'Cartão', 'Transporte', 'Saúde', 'Educação', 'Lazer']) {
      await db.runAsync(
        `INSERT INTO categorias (id, nome, criado_em)
         VALUES (lower(hex(randomblob(16))), ?, ?)`,
        nome,
        new Date().toISOString(),
      );
    }
  },

  // Dívida deixa de ter valor fixo: passa a ser um template, e o que vence
  // vira uma linha em `ocorrencias`. Converte o que já estava cadastrado.
  //
  // Ordem importa: as ocorrências só podem ser criadas DEPOIS de `dividas`
  // ser reescrita. Criar a FK antes faria o `DROP TABLE dividas` falhar, e
  // `PRAGMA foreign_keys` é ignorado dentro de uma transação.
  async (db) => {
    // 1. Lê o modelo antigo antes de a tabela mudar de forma.
    const antigas = await db.getAllAsync<{
      id: string;
      tipo: DividaAntiga['tipo'];
      valor: number;
      data_vencimento: string | null;
      dia_vencimento_recorrente: number | null;
      parcela_atual: number | null;
      parcela_total: number | null;
    }>(`SELECT id, tipo, valor, data_vencimento, dia_vencimento_recorrente,
               parcela_atual, parcela_total
        FROM dividas`);

    // 2. Reescreve `dividas` sem valor e sem os contadores de parcela.
    await db.execAsync(`
      CREATE TABLE dividas_nova (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT 'local',
        owner_id TEXT NOT NULL DEFAULT 'me',
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('recorrente', 'parcelada', 'pontual')),
        categoria TEXT,
        dia_vencimento INTEGER,
        data_vencimento TEXT,
        ativa INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT NOT NULL
      );

      INSERT INTO dividas_nova
        (id, workspace_id, owner_id, nome, tipo, categoria, dia_vencimento,
         data_vencimento, ativa, criado_em)
      SELECT id, workspace_id, owner_id, nome, tipo, categoria,
             dia_vencimento_recorrente, data_vencimento, ativa, criado_em
      FROM dividas;

      DROP TABLE dividas;
      ALTER TABLE dividas_nova RENAME TO dividas;

      CREATE INDEX idx_dividas_workspace ON dividas (workspace_id, ativa);
    `);

    // 3. Só agora a tabela de ocorrências, apontando para a `dividas` final.
    await db.execAsync(`
      CREATE TABLE ocorrencias (
        id TEXT PRIMARY KEY NOT NULL,
        divida_id TEXT NOT NULL REFERENCES dividas (id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL DEFAULT 'local',
        owner_id TEXT NOT NULL DEFAULT 'me',
        data_vencimento TEXT NOT NULL,
        valor REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pendente'
          CHECK (status IN ('pendente', 'paga')),
        numero_parcela INTEGER,
        total_parcelas INTEGER,
        pago_em TEXT
      );

      CREATE INDEX idx_ocorrencias_mes
        ON ocorrencias (workspace_id, owner_id, data_vencimento);
      CREATE INDEX idx_ocorrencias_divida ON ocorrencias (divida_id);
    `);

    // 4. Converte o que existia.
    const mes = mesCorrente();
    for (const antiga of antigas) {
      const convertidas = converterParaOcorrencias(
        {
          tipo: antiga.tipo,
          valor: antiga.valor,
          dataVencimento: antiga.data_vencimento,
          diaVencimentoRecorrente: antiga.dia_vencimento_recorrente,
          parcelaAtual: antiga.parcela_atual,
          parcelaTotal: antiga.parcela_total,
        },
        mes,
      );

      for (const o of convertidas) {
        await db.runAsync(
          `INSERT INTO ocorrencias
             (id, divida_id, data_vencimento, valor, status, numero_parcela, total_parcelas)
           VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)`,
          antiga.id,
          o.data,
          o.valor,
          o.paga ? 'paga' : 'pendente',
          o.numero,
          o.total,
        );
      }
    }
  },
];

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  for (let i = version; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await MIGRATIONS[i](db);
    });
    version = i + 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }

  return db;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Ponto único de acesso ao SQLite. Só os repositórios em `src/data/`
 * devem chamar isto — as telas falam apenas com os repositórios, para
 * que trocar SQLite por uma API remota não toque em UI.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

/** Chamado no boot da app, antes de esconder o splash. */
export async function initDatabase(): Promise<void> {
  await getDatabase();
}
