import * as Crypto from 'expo-crypto';

import { getDatabase } from './db';
import { NovaReserva, OWNER_LOCAL, Reserva, WORKSPACE_LOCAL } from './types';

interface ReservaRow {
  id: string;
  workspace_id: string;
  owner_id: string;
  nome: string;
  valor: number;
  finalidade: string | null;
  criado_em: string;
}

function toReserva(row: ReservaRow): Reserva {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    nome: row.nome,
    valor: row.valor,
    finalidade: row.finalidade,
    criadoEm: row.criado_em,
  };
}

export async function listarReservas(): Promise<Reserva[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReservaRow>(
    `SELECT * FROM reservas WHERE workspace_id = ? AND owner_id = ? ORDER BY criado_em DESC`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
  );
  return rows.map(toReserva);
}

export async function obterReserva(id: string): Promise<Reserva | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReservaRow>(`SELECT * FROM reservas WHERE id = ?`, id);
  return row ? toReserva(row) : null;
}

export async function totalReservado(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(valor) AS total FROM reservas WHERE workspace_id = ? AND owner_id = ?`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
  );
  return row?.total ?? 0;
}

export async function criarReserva(entrada: NovaReserva): Promise<Reserva> {
  const db = await getDatabase();
  const reserva: Reserva = {
    ...entrada,
    id: Crypto.randomUUID(),
    workspaceId: WORKSPACE_LOCAL,
    ownerId: OWNER_LOCAL,
    criadoEm: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO reservas (id, workspace_id, owner_id, nome, valor, finalidade, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    reserva.id,
    reserva.workspaceId,
    reserva.ownerId,
    reserva.nome,
    reserva.valor,
    reserva.finalidade,
    reserva.criadoEm,
  );

  return reserva;
}

export async function atualizarReserva(id: string, entrada: NovaReserva): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE reservas SET nome = ?, valor = ?, finalidade = ? WHERE id = ?`,
    entrada.nome,
    entrada.valor,
    entrada.finalidade,
    id,
  );
}

export async function removerReserva(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM reservas WHERE id = ?`, id);
}
