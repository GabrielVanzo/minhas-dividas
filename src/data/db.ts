import * as SQLite from 'expo-sqlite';

const DB_NAME = 'minhas-dividas.db';

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
