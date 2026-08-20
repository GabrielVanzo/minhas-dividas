import { getDatabase } from './db';
import { ChavePreferencia, OWNER_LOCAL, WORKSPACE_LOCAL } from './types';

export async function obterPreferencia(chave: ChavePreferencia): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ valor: string }>(
    `SELECT valor FROM preferencias
     WHERE workspace_id = ? AND owner_id = ? AND chave = ?`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
    chave,
  );
  return row?.valor ?? null;
}

export async function definirPreferencia(
  chave: ChavePreferencia,
  valor: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO preferencias (workspace_id, owner_id, chave, valor)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (workspace_id, owner_id, chave)
     DO UPDATE SET valor = excluded.valor`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
    chave,
    valor,
  );
}
