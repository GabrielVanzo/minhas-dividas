import dayjs, { Dayjs } from 'dayjs';

import { OcorrenciaComDivida, TipoDivida } from '@/data/types';

import './locale';

/** Mês de referência no formato YYYY-MM. */
export type Mes = string;

export function mesDe(iso: string | Dayjs): Mes {
  return dayjs(iso).format('YYYY-MM');
}

export function mesCorrente(): Mes {
  return dayjs().format('YYYY-MM');
}

export interface TotalPorTipo {
  total: number;
  quantidade: number;
}

export interface ResumoMes {
  mes: Mes;
  renda: number;
  /** Tudo que vence no mês, pago ou não. */
  totalMes: number;
  /** A parte já quitada. */
  pago: number;
  /** O que ainda falta pagar (totalMes - pago). */
  aPagar: number;
  /** Positivo = sobra; negativo = falta. Considera o mês inteiro. */
  saldo: number;
  ocorrenciasDoMes: OcorrenciaComDivida[];
  porTipo: Record<TipoDivida, TotalPorTipo>;
}

/**
 * O resumo é uma soma direta das ocorrências do mês — nada de recalcular
 * incidência a partir do template. Parcelas que acabaram simplesmente não
 * têm ocorrência no mês, e novas aparecem sozinhas.
 */
export function calcularResumo(
  ocorrencias: OcorrenciaComDivida[],
  mes: Mes,
  renda: number,
): ResumoMes {
  const porTipo: Record<TipoDivida, TotalPorTipo> = {
    recorrente: { total: 0, quantidade: 0 },
    parcelada: { total: 0, quantidade: 0 },
    pontual: { total: 0, quantidade: 0 },
  };

  const doMes = ocorrencias.filter((o) => mesDe(o.dataVencimento) === mes);

  let totalMes = 0;
  let pago = 0;

  for (const o of doMes) {
    totalMes += o.valor;
    if (o.status === 'paga') pago += o.valor;
    porTipo[o.tipo].total += o.valor;
    porTipo[o.tipo].quantidade += 1;
  }

  return {
    mes,
    renda,
    totalMes,
    pago,
    aPagar: totalMes - pago,
    saldo: renda - totalMes,
    ocorrenciasDoMes: doMes,
    porTipo,
  };
}

/** "Agosto de 2026" */
export function rotuloMes(mes: Mes): string {
  const texto = dayjs(`${mes}-01`).format('MMMM [de] YYYY');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
