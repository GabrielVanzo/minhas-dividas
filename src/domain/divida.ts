import dayjs, { Dayjs } from 'dayjs';

import { Divida, TipoDivida } from '@/data/types';

export type StatusDivida = 'atrasada' | 'proxima' | 'em_dia' | 'quitada';

/** Dias de antecedência para uma dívida entrar em "próxima do vencimento". */
export const JANELA_PROXIMA_DIAS = 7;

export function hoje(): Dayjs {
  return dayjs().startOf('day');
}

/**
 * Data em que a dívida vence "agora" — é o que ordena a Home.
 *
 * - pontual/parcelada: a própria `dataVencimento`.
 * - recorrente: a ocorrência deste mês; se já passou, a do mês que vem.
 *   Meses curtos são tratados clampando o dia (dia 31 em fevereiro → dia 28/29).
 */
export function vencimentoEfetivo(divida: Divida, referencia: Dayjs = hoje()): Dayjs | null {
  if (divida.tipo === 'recorrente') {
    const dia = divida.diaVencimentoRecorrente;
    if (!dia) return null;

    const desteMes = comDiaClampado(referencia, dia);
    return desteMes.isBefore(referencia) ? comDiaClampado(referencia.add(1, 'month'), dia) : desteMes;
  }

  return divida.dataVencimento ? dayjs(divida.dataVencimento).startOf('day') : null;
}

function comDiaClampado(base: Dayjs, dia: number): Dayjs {
  return base.date(Math.min(dia, base.daysInMonth())).startOf('day');
}

export function estaQuitada(divida: Divida): boolean {
  if (!divida.ativa) return true;
  if (divida.tipo === 'parcelada' && divida.parcelaAtual && divida.parcelaTotal) {
    return divida.parcelaAtual > divida.parcelaTotal;
  }
  return false;
}

export function statusDivida(divida: Divida, referencia: Dayjs = hoje()): StatusDivida {
  if (estaQuitada(divida)) return 'quitada';

  const vencimento = vencimentoEfetivo(divida, referencia);
  if (!vencimento) return 'em_dia';

  const dias = vencimento.diff(referencia, 'day');
  if (dias < 0) return 'atrasada';
  if (dias <= JANELA_PROXIMA_DIAS) return 'proxima';
  return 'em_dia';
}

/** Texto curto de prazo, ex. "vence em 3 dias", "atrasada há 2 dias". */
export function descricaoPrazo(divida: Divida, referencia: Dayjs = hoje()): string {
  if (estaQuitada(divida)) return 'Quitada';

  const vencimento = vencimentoEfetivo(divida, referencia);
  if (!vencimento) return 'Sem vencimento';

  const dias = vencimento.diff(referencia, 'day');
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  if (dias > 1) return `Vence em ${dias} dias`;
  if (dias === -1) return 'Atrasada há 1 dia';
  return `Atrasada há ${Math.abs(dias)} dias`;
}

export const ROTULO_TIPO: Record<TipoDivida, string> = {
  recorrente: 'Recorrente',
  parcelada: 'Parcelada',
  pontual: 'Pontual',
};

export type CampoOrdenacao = 'vencimento' | 'valor' | 'nome' | 'tipo';

export const ROTULO_ORDENACAO: Record<CampoOrdenacao, string> = {
  vencimento: 'Vencimento',
  valor: 'Valor',
  nome: 'Nome',
  tipo: 'Tipo',
};

/**
 * Ordena sem mutar. Dívidas quitadas e sem vencimento vão sempre para o fim,
 * independentemente do critério escolhido.
 */
export function ordenarDividas(
  dividas: Divida[],
  campo: CampoOrdenacao,
  referencia: Dayjs = hoje(),
): Divida[] {
  return [...dividas].sort((a, b) => {
    const quitadaA = estaQuitada(a) ? 1 : 0;
    const quitadaB = estaQuitada(b) ? 1 : 0;
    if (quitadaA !== quitadaB) return quitadaA - quitadaB;

    switch (campo) {
      case 'valor':
        return b.valor - a.valor;
      case 'nome':
        return a.nome.localeCompare(b.nome, 'pt-BR');
      case 'tipo': {
        const porTipo = a.tipo.localeCompare(b.tipo);
        if (porTipo !== 0) return porTipo;
        return compararVencimento(a, b, referencia);
      }
      case 'vencimento':
      default:
        return compararVencimento(a, b, referencia);
    }
  });
}

function compararVencimento(a: Divida, b: Divida, referencia: Dayjs): number {
  const va = vencimentoEfetivo(a, referencia);
  const vb = vencimentoEfetivo(b, referencia);
  if (!va && !vb) return a.nome.localeCompare(b.nome, 'pt-BR');
  if (!va) return 1;
  if (!vb) return -1;
  return va.valueOf() - vb.valueOf();
}
