import dayjs from 'dayjs';

/**
 * Uma parcela planejada, antes de virar linha em `ocorrencias`.
 * `data` é YYYY-MM-DD.
 */
export interface ParcelaPlanejada {
  numero: number;
  total: number;
  data: string;
  valor: number;
}

/**
 * Ajusta o dia ao mês de destino: dia 31 em fevereiro vira 28 (ou 29).
 * Sem isso, dayjs rolaria para o mês seguinte.
 */
export function comDiaClampado(base: dayjs.Dayjs, dia: number): dayjs.Dayjs {
  return base.date(Math.min(dia, base.daysInMonth())).startOf('day');
}

/**
 * Divide um total em N parcelas **em centavos**, para não sobrar nem faltar
 * dinheiro: 100 em 3x vira 33,33 + 33,33 + 33,34. A sobra vai toda na última
 * parcela, que é como banco e loja fazem.
 */
export function dividirEmCentavos(valorTotal: number, total: number): number[] {
  const centavosTotais = Math.round(valorTotal * 100);
  const base = Math.floor(centavosTotais / total);
  const sobra = centavosTotais - base * total;
  return Array.from({ length: total }, (_, i) =>
    i === total - 1 ? (base + sobra) / 100 : base / 100,
  );
}

/**
 * Planeja as N parcelas de uma dívida parcelada: vencimentos mensais
 * sequenciais a partir de `dataInicial`, preservando o dia sempre que o mês
 * comportar.
 */
export function planejarParcelas(
  dataInicial: string,
  totalParcelas: number,
  valorTotal: number,
): ParcelaPlanejada[] {
  const inicio = dayjs(dataInicial).startOf('day');
  const dia = inicio.date();
  const valores = dividirEmCentavos(valorTotal, totalParcelas);

  return valores.map((valor, i) => ({
    numero: i + 1,
    total: totalParcelas,
    data: comDiaClampado(inicio.add(i, 'month'), dia).format('YYYY-MM-DD'),
    valor,
  }));
}
