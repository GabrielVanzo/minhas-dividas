import dayjs from 'dayjs';

import './locale';

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatarMoeda(valor: number): string {
  return MOEDA.format(valor);
}

/**
 * Converte o texto digitado em número, aceitando as duas formas que aparecem
 * na prática: "1.234,56" (pt-BR) e "1234.56" (teclado que só oferece ponto).
 *
 * A regra: a vírgula, quando existe, é sempre o separador decimal. Havendo só
 * pontos, um único ponto seguido de 3 dígitos é milhar ("1.500" = mil e
 * quinhentos); qualquer outro caso é decimal ("1234.56", "3.7").
 */
export function parsearValor(texto: string): number {
  const limpo = texto.replace(/[^\d.,-]/g, '');
  if (!limpo) return 0;

  const temVirgula = limpo.includes(',');
  const pontos = limpo.split('.').length - 1;
  const casasAposUltimoPonto = limpo.length - limpo.lastIndexOf('.') - 1;

  // Um ponto sozinho separando 3 dígitos é milhar; nos demais casos, decimal.
  const pontoEhDecimal = !temVirgula && pontos === 1 && casasAposUltimoPonto !== 3;

  const normalizado = pontoEhDecimal
    ? limpo.replace(/,/g, '')
    : limpo.replace(/\./g, '').replace(',', '.');

  const numero = Number.parseFloat(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export function formatarData(iso: string | null): string {
  return iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
}

/**
 * Formata um número para dentro de um campo editável: "1.500,00".
 * O resultado volta a ser lido por `parsearValor` sem perda.
 */
export function formatarValorEditavel(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
