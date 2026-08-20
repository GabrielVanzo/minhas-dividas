import * as Crypto from 'expo-crypto';

import { getDatabase } from './db';
import { OWNER_LOCAL, RendaMensal, WORKSPACE_LOCAL } from './types';

interface RendaRow {
  id: string;
  workspace_id: string;
  owner_id: string;
  mes_referencia: string;
  valor: number;
}

function toRenda(row: RendaRow): RendaMensal {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    mesReferencia: row.mes_referencia,
    valor: row.valor,
  };
}

/** @param mes formato YYYY-MM */
export async function obterRenda(mes: string): Promise<RendaMensal | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<RendaRow>(
    `SELECT * FROM renda_mensal
     WHERE workspace_id = ? AND owner_id = ? AND mes_referencia = ?`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
    mes,
  );
  return row ? toRenda(row) : null;
}

/** Insere ou sobrescreve a renda do mês (índice único garante 1 linha por mês). */
export async function definirRenda(mes: string, valor: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO renda_mensal (id, workspace_id, owner_id, mes_referencia, valor)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (workspace_id, owner_id, mes_referencia)
     DO UPDATE SET valor = excluded.valor`,
    Crypto.randomUUID(),
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
    mes,
    valor,
  );
}
