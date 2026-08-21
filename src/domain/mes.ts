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

/** Desloca um mês em N meses. N negativo anda para trás. */
export function deslocarMes(mes: Mes, meses: number): Mes {
  return dayjs(`${mes}-01`).add(meses, 'month').format('YYYY-MM');
}

/** Quantos meses de `a` até `b`. Negativo se `b` vem antes. */
export function distanciaEmMeses(a: Mes, b: Mes): number {
  return dayjs(`${b}-01`).diff(dayjs(`${a}-01`), 'month');
}

/** Até onde a navegação anda para trás. */
export const MESES_PARA_TRAS = 2;

export interface IntervaloMeses {
  primeiro: Mes;
  ultimo: Mes;
}

/**
 * A janela de meses que a navegação alcança.
 *
 * Para trás é fixo: {@link MESES_PARA_TRAS} meses, o suficiente para achar uma
 * conta esquecida sem virar um histórico infinito.
 *
 * Para frente, quem manda são as dívidas **com fim**: uma compra em 6x precisa
 * ser visível até a última parcela. Recorrentes não entram nessa conta — não
 * têm fim, e deixá-las decidir empurraria o limite para sempre. O mês seguinte
 * é o piso: dá para espiar o próximo mês mesmo sem nada parcelado em aberto.
 */
export function intervaloNavegavel(corrente: Mes, ultimoComVencimento: Mes | null): IntervaloMeses {
  const piso = deslocarMes(corrente, 1);
  return {
    primeiro: deslocarMes(corrente, -MESES_PARA_TRAS),
    // Comparação lexicográfica basta: YYYY-MM ordena como texto.
    ultimo: ultimoComVencimento && ultimoComVencimento > piso ? ultimoComVencimento : piso,
  };
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
