import * as Crypto from 'expo-crypto';

import { getDatabase } from './db';
import { Divida, NovaDivida, OWNER_LOCAL, TipoDivida, WORKSPACE_LOCAL } from './types';

export interface DividaRow {
  id: string;
  workspace_id: string;
  owner_id: string;
  nome: string;
  tipo: TipoDivida;
  categoria: string | null;
  dia_vencimento: number | null;
  data_vencimento: string | null;
  ativa: number;
  criado_em: string;
}

export function toDivida(row: DividaRow): Divida {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    nome: row.nome,
    tipo: row.tipo,
    categoria: row.categoria,
    diaVencimento: row.dia_vencimento,
    dataVencimento: row.data_vencimento,
    ativa: row.ativa === 1,
    criadoEm: row.criado_em,
  };
}

/** Zera os campos que não pertencem ao tipo escolhido. */
function normalizar(entrada: NovaDivida): NovaDivida {
  switch (entrada.tipo) {
    case 'recorrente':
      return { ...entrada, dataVencimento: null };
    case 'parcelada':
    case 'pontual':
      return { ...entrada, diaVencimento: null };
  }
}

export async function listarDividas(): Promise<Divida[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DividaRow>(
    `SELECT * FROM dividas WHERE workspace_id = ? AND owner_id = ? ORDER BY criado_em DESC`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
  );
  return rows.map(toDivida);
}

export async function obterDivida(id: string): Promise<Divida | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DividaRow>(`SELECT * FROM dividas WHERE id = ?`, id);
  return row ? toDivida(row) : null;
}

export async function criarDivida(entrada: NovaDivida): Promise<Divida> {
  const db = await getDatabase();
  const dados = normalizar(entrada);
  const divida: Divida = {
    id: Crypto.randomUUID(),
    workspaceId: WORKSPACE_LOCAL,
    ownerId: OWNER_LOCAL,
    ativa: dados.ativa ?? true,
    criadoEm: new Date().toISOString(),
    nome: dados.nome,
    tipo: dados.tipo,
    categoria: dados.categoria,
    diaVencimento: dados.diaVencimento,
    dataVencimento: dados.dataVencimento,
  };

  await db.runAsync(
    `INSERT INTO dividas
       (id, workspace_id, owner_id, nome, tipo, categoria, dia_vencimento,
        data_vencimento, ativa, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    divida.id,
    divida.workspaceId,
    divida.ownerId,
    divida.nome,
    divida.tipo,
    divida.categoria,
    divida.diaVencimento,
    divida.dataVencimento,
    divida.ativa ? 1 : 0,
    divida.criadoEm,
  );

  return divida;
}

export async function atualizarDivida(id: string, entrada: NovaDivida): Promise<void> {
  const db = await getDatabase();
  const dados = normalizar(entrada);

  await db.runAsync(
    `UPDATE dividas SET
       nome = ?, tipo = ?, categoria = ?, dia_vencimento = ?,
       data_vencimento = ?, ativa = ?
     WHERE id = ?`,
    dados.nome,
    dados.tipo,
    dados.categoria,
    dados.diaVencimento,
    dados.dataVencimento,
    (dados.ativa ?? true) ? 1 : 0,
    id,
  );
}

/** As ocorrências saem junto, por causa do ON DELETE CASCADE. */
export async function removerDivida(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM dividas WHERE id = ?`, id);
}
