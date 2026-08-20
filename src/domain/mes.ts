import dayjs, { Dayjs } from 'dayjs';

import { Divida, TipoDivida } from '@/data/types';

import { estaQuitada } from './divida';
import './locale';

/** Mês de referência no formato YYYY-MM. */
export type Mes = string;

export function mesDe(iso: string | Dayjs): Mes {
  return dayjs(iso).format('YYYY-MM');
}

export function mesCorrente(): Mes {
  return dayjs().format('YYYY-MM');
}

/**
 * Quanto esta dívida pesa no mês informado — 0 se ela não incide.
 *
 * - `recorrente`: incide todo mês, sempre o mesmo valor.
 * - `parcelada`: incide da parcela atual até a última. Assume parcelas
 *   mensais de valor igual (não cobre financiamento com valor variável).
 * - `pontual`: incide só no mês do vencimento.
 *
 * Dívidas quitadas ou inativas nunca incidem.
 */
export function incidenciaNoMes(divida: Divida, mes: Mes): number {
  if (estaQuitada(divida)) return 0;

  switch (divida.tipo) {
    case 'recorrente':
      return divida.diaVencimentoRecorrente ? divida.valor : 0;

    case 'pontual':
      return divida.dataVencimento && mesDe(divida.dataVencimento) === mes ? divida.valor : 0;

    case 'parcelada': {
      if (!divida.dataVencimento || !divida.parcelaTotal) return 0;

      const restantes = divida.parcelaTotal - (divida.parcelaAtual ?? 1);
      if (restantes < 0) return 0;

      const primeira = mesDe(divida.dataVencimento);
      const ultima = mesDe(dayjs(divida.dataVencimento).add(restantes, 'month'));

      return mes >= primeira && mes <= ultima ? divida.valor : 0;
    }
  }
}

/** Nº da parcela que vence no mês informado, ou null se não incide. */
export function parcelaDoMes(divida: Divida, mes: Mes): number | null {
  if (divida.tipo !== 'parcelada' || !divida.dataVencimento || !divida.parcelaTotal) return null;
  if (incidenciaNoMes(divida, mes) === 0) return null;

  const base = dayjs(divida.dataVencimento);
  const deslocamento = dayjs(`${mes}-01`).diff(base.startOf('month'), 'month');
  return (divida.parcelaAtual ?? 1) + deslocamento;
}

export interface TotalPorTipo {
  total: number;
  quantidade: number;
}

export interface ResumoMes {
  mes: Mes;
  renda: number;
  totalDividas: number;
  /** Positivo = sobra; negativo = falta. */
  saldo: number;
  /** Dívidas que efetivamente incidem no mês. */
  dividasDoMes: Divida[];
  porTipo: Record<TipoDivida, TotalPorTipo>;
}

export function calcularResumo(dividas: Divida[], mes: Mes, renda: number): ResumoMes {
  const porTipo: Record<TipoDivida, TotalPorTipo> = {
    recorrente: { total: 0, quantidade: 0 },
    parcelada: { total: 0, quantidade: 0 },
    pontual: { total: 0, quantidade: 0 },
  };

  const dividasDoMes: Divida[] = [];
  let totalDividas = 0;

  for (const divida of dividas) {
    const valor = incidenciaNoMes(divida, mes);
    if (valor === 0) continue;

    dividasDoMes.push(divida);
    totalDividas += valor;
    porTipo[divida.tipo].total += valor;
    porTipo[divida.tipo].quantidade += 1;
  }

  return {
    mes,
    renda,
    totalDividas,
    saldo: renda - totalDividas,
    dividasDoMes,
    porTipo,
  };
}

/** "Agosto de 2026" */
export function rotuloMes(mes: Mes): string {
  const texto = dayjs(`${mes}-01`).format('MMMM [de] YYYY');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
