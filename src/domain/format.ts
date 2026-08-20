import dayjs from 'dayjs';

import './locale';

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatarMoeda(valor: number): string {
  return MOEDA.format(valor);
}

/** Converte o texto digitado ("1.234,56" ou "1234.56") em número. */
export function parsearValor(texto: string): number {
  const limpo = texto
    .replace(/[^\d.,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const numero = Number.parseFloat(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

export function formatarData(iso: string | null): string {
  return iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
}

/** Mês corrente no formato YYYY-MM usado por `renda_mensal`. */
export function mesAtual(): string {
  return dayjs().format('YYYY-MM');
}
