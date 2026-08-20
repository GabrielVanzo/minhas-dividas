import * as Crypto from 'expo-crypto';

import { getDatabase } from './db';
import { Categoria, OWNER_LOCAL, WORKSPACE_LOCAL } from './types';

interface CategoriaRow {
  id: string;
  workspace_id: string;
  owner_id: string;
  nome: string;
  criado_em: string;
}

function toCategoria(row: CategoriaRow): Categoria {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    nome: row.nome,
    criadoEm: row.criado_em,
  };
}

export async function listarCategorias(): Promise<Categoria[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoriaRow>(
    `SELECT * FROM categorias WHERE workspace_id = ? AND owner_id = ? ORDER BY nome COLLATE NOCASE`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
  );
  return rows.map(toCategoria);
}

/** Ignora duplicatas (índice único em nome) em vez de estourar erro na UI. */
export async function criarCategoria(nome: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO categorias (id, workspace_id, owner_id, nome, criado_em)
     VALUES (?, ?, ?, ?, ?)`,
    Crypto.randomUUID(),
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
    nome.trim(),
    new Date().toISOString(),
  );
}

/**
 * Remove a categoria e desassocia as dívidas que a usavam — elas continuam
 * existindo, só ficam sem categoria.
 */
export async function removerCategoria(id: string): Promise<void> {
  const db = await getDatabase();
  const categoria = await db.getFirstAsync<CategoriaRow>(
    `SELECT * FROM categorias WHERE id = ?`,
    id,
  );
  if (!categoria) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE dividas SET categoria = NULL
       WHERE categoria = ? AND workspace_id = ? AND owner_id = ?`,
      categoria.nome,
      WORKSPACE_LOCAL,
      OWNER_LOCAL,
    );
    await db.runAsync(`DELETE FROM categorias WHERE id = ?`, id);
  });
}

/** Quantas dívidas usam esta categoria — para avisar antes de remover. */
export async function contarUsos(nome: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM dividas
     WHERE categoria = ? AND workspace_id = ? AND owner_id = ?`,
    nome,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
  );
  return row?.total ?? 0;
}
