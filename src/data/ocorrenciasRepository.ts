import * as Crypto from 'expo-crypto';

import { vencimentoRecorrenteNoMes } from '@/domain/divida';
import { intervaloNavegavel, IntervaloMeses, mesCorrente } from '@/domain/mes';
import { ParcelaPlanejada } from '@/domain/parcelas';
import { BaseRecorrente, projetarRecorrentes } from '@/domain/projecao';

import { getDatabase } from './db';
import { DividaRow, toDivida } from './dividasRepository';
import { Divida, Ocorrencia, OcorrenciaComDivida, OWNER_LOCAL, WORKSPACE_LOCAL } from './types';

interface OcorrenciaRow {
  id: string;
  divida_id: string;
  workspace_id: string;
  owner_id: string;
  data_vencimento: string;
  valor: number;
  status: 'pendente' | 'paga';
  numero_parcela: number | null;
  total_parcelas: number | null;
  pago_em: string | null;
}

interface OcorrenciaComDividaRow extends OcorrenciaRow {
  nome: string;
  tipo: Divida['tipo'];
  categoria: string | null;
}

function toOcorrencia(row: OcorrenciaComDividaRow): OcorrenciaComDivida {
  return {
    id: row.id,
    dividaId: row.divida_id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    dataVencimento: row.data_vencimento,
    valor: row.valor,
    status: row.status,
    numeroParcela: row.numero_parcela,
    totalParcelas: row.total_parcelas,
    pagoEm: row.pago_em,
    nome: row.nome,
    tipo: row.tipo,
    categoria: row.categoria,
  };
}

const SELECT_COM_DIVIDA = `
  SELECT o.*, d.nome, d.tipo, d.categoria
  FROM ocorrencias o
  JOIN dividas d ON d.id = o.divida_id
  WHERE o.workspace_id = ? AND o.owner_id = ? AND d.ativa = 1
`;

/**
 * O que a Home mostra: tudo que vence no mês (pago ou não) **mais** o que
 * ficou pendente de meses anteriores. Uma conta atrasada não pode sumir da
 * vista só porque o mês virou.
 */
export async function listarPainel(mes: string): Promise<OcorrenciaComDivida[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OcorrenciaComDividaRow>(
    `${SELECT_COM_DIVIDA}
       AND (substr(o.data_vencimento, 1, 7) = ?
            OR (o.status = 'pendente' AND o.data_vencimento < ?))
     ORDER BY o.data_vencimento`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
    mes,
    `${mes}-01`,
  );
  return rows.map(toOcorrencia);
}

/** Só as ocorrências de um mês — base do Resumo. */
export async function listarOcorrenciasDoMes(mes: string): Promise<OcorrenciaComDivida[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OcorrenciaComDividaRow>(
    `${SELECT_COM_DIVIDA} AND substr(o.data_vencimento, 1, 7) = ? ORDER BY o.data_vencimento`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
    mes,
  );
  return rows.map(toOcorrencia);
}

/**
 * A visão de um mês qualquer, para a navegação entre meses.
 *
 * Mês passado e mês corrente mostram só o que existe no banco — o que
 * aconteceu, aconteceu. Mês futuro ganha por cima a projeção das recorrentes,
 * senão o total do mês mentiria por omissão (apareceriam as parcelas, mas não
 * o aluguel). A projeção não grava nada: ver `src/domain/projecao.ts`.
 */
export async function listarMes(mes: string): Promise<OcorrenciaComDivida[]> {
  const reais = await listarOcorrenciasDoMes(mes);
  if (mes <= mesCorrente()) return reais;

  const projetadas = projetarRecorrentes(await basesDeProjecao(), mes, reais);
  return [...reais, ...projetadas].sort((a, b) =>
    a.dataVencimento.localeCompare(b.dataVencimento),
  );
}

/** Recorrentes ativas com o último valor pago — insumo da projeção. */
async function basesDeProjecao(): Promise<BaseRecorrente[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DividaRow & { ultimo_valor: number }>(
    `SELECT d.*,
            COALESCE((SELECT o.valor FROM ocorrencias o
                      WHERE o.divida_id = d.id AND o.status = 'paga'
                      ORDER BY o.data_vencimento DESC LIMIT 1), 0) AS ultimo_valor
     FROM dividas d
     WHERE d.workspace_id = ? AND d.owner_id = ?
       AND d.tipo = 'recorrente' AND d.ativa = 1`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
  );

  return rows.map((row) => ({ divida: toDivida(row), ultimoValor: row.ultimo_valor }));
}

/**
 * Até onde a navegação entre meses pode ir.
 *
 * O limite para frente sai da última parcela/pontual cadastrada: uma compra em
 * 6x precisa ser visível até o fim. Recorrentes ficam de fora do `MAX` de
 * propósito — sendo infinitas, empurrariam o limite para sempre.
 */
export async function limitesDeNavegacao(): Promise<IntervaloMeses> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ mes: string | null }>(
    `SELECT MAX(substr(o.data_vencimento, 1, 7)) AS mes
     FROM ocorrencias o JOIN dividas d ON d.id = o.divida_id
     WHERE o.workspace_id = ? AND o.owner_id = ? AND d.ativa = 1
       AND d.tipo <> 'recorrente'`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
  );
  return intervaloNavegavel(mesCorrente(), row?.mes ?? null);
}

export async function listarOcorrenciasDaDivida(dividaId: string): Promise<Ocorrencia[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OcorrenciaComDividaRow>(
    `SELECT o.*, d.nome, d.tipo, d.categoria
     FROM ocorrencias o JOIN dividas d ON d.id = o.divida_id
     WHERE o.divida_id = ? ORDER BY o.data_vencimento`,
    dividaId,
  );
  return rows.map(toOcorrencia);
}

export async function criarOcorrencias(
  dividaId: string,
  parcelas: ParcelaPlanejada[],
): Promise<void> {
  if (parcelas.length === 0) return;
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    for (const p of parcelas) {
      await db.runAsync(
        `INSERT INTO ocorrencias
           (id, divida_id, workspace_id, owner_id, data_vencimento, valor,
            status, numero_parcela, total_parcelas)
         VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`,
        Crypto.randomUUID(),
        dividaId,
        WORKSPACE_LOCAL,
        OWNER_LOCAL,
        p.data,
        p.valor,
        p.total > 1 ? p.numero : null,
        p.total > 1 ? p.total : null,
      );
    }
  });
}

/**
 * Garante a ocorrência do mês para cada dívida recorrente ativa.
 *
 * O valor nasce copiado da última ocorrência **paga** da mesma dívida — é a
 * melhor estimativa disponível para uma conta que varia (luz, água). Sem
 * nenhuma paga ainda, nasce 0 e o card pede o preenchimento.
 *
 * O `WHERE NOT EXISTS` deixa a operação idempotente: abrir o mês duas vezes
 * não duplica nada.
 */
export async function garantirRecorrentesDoMes(mes: string): Promise<void> {
  const db = await getDatabase();
  const recorrentes = await db.getAllAsync<{ id: string; dia_vencimento: number | null }>(
    `SELECT id, dia_vencimento FROM dividas
     WHERE workspace_id = ? AND owner_id = ? AND tipo = 'recorrente' AND ativa = 1`,
    WORKSPACE_LOCAL,
    OWNER_LOCAL,
  );

  for (const r of recorrentes) {
    if (!r.dia_vencimento) continue;
    const data = vencimentoRecorrenteNoMes(
      { tipo: 'recorrente', diaVencimento: r.dia_vencimento } as Divida,
      mes,
    );
    if (!data) continue;

    await db.runAsync(
      `INSERT INTO ocorrencias
         (id, divida_id, workspace_id, owner_id, data_vencimento, valor, status)
       SELECT ?, ?, ?, ?, ?,
              COALESCE((SELECT o.valor FROM ocorrencias o
                        WHERE o.divida_id = ? AND o.status = 'paga'
                        ORDER BY o.data_vencimento DESC LIMIT 1), 0),
              'pendente'
       WHERE NOT EXISTS (
         SELECT 1 FROM ocorrencias o2
         WHERE o2.divida_id = ? AND substr(o2.data_vencimento, 1, 7) = ?
       )`,
      Crypto.randomUUID(),
      r.id,
      WORKSPACE_LOCAL,
      OWNER_LOCAL,
      data,
      r.id,
      r.id,
      mes,
    );
  }
}

export async function marcarPaga(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ocorrencias SET status = 'paga', pago_em = ? WHERE id = ?`,
    new Date().toISOString(),
    id,
  );
}

export async function marcarPendente(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE ocorrencias SET status = 'pendente', pago_em = NULL WHERE id = ?`, id);
}

export async function atualizarValorOcorrencia(id: string, valor: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE ocorrencias SET valor = ? WHERE id = ?`, valor, id);
}

/**
 * Remove só as ocorrências ainda pendentes de uma dívida. Usada quando o
 * usuário reedita uma parcelada: o que já foi pago é histórico e fica.
 */
export async function removerPendentesDaDivida(dividaId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM ocorrencias WHERE divida_id = ? AND status = 'pendente'`, dividaId);
}
