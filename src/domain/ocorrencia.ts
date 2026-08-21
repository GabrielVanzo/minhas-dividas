import dayjs, { Dayjs } from 'dayjs';

import { OcorrenciaComDivida } from '@/data/types';

/** Como a ocorrência se apresenta na lista. `paga` vence qualquer prazo. */
export type SituacaoOcorrencia = 'paga' | 'atrasada' | 'proxima' | 'em_dia';

/** Dias de antecedência para entrar em "próxima do vencimento". */
export const JANELA_PROXIMA_DIAS = 7;

export function hoje(): Dayjs {
  return dayjs().startOf('day');
}

export function situacaoOcorrencia(
  ocorrencia: { dataVencimento: string; status: string },
  referencia: Dayjs = hoje(),
): SituacaoOcorrencia {
  if (ocorrencia.status === 'paga') return 'paga';

  const dias = dayjs(ocorrencia.dataVencimento).startOf('day').diff(referencia, 'day');
  if (dias < 0) return 'atrasada';
  if (dias <= JANELA_PROXIMA_DIAS) return 'proxima';
  return 'em_dia';
}

/** Texto curto de prazo, ex. "vence em 3 dias", "atrasada há 2 dias". */
export function descricaoPrazo(
  ocorrencia: { dataVencimento: string; status: string; pagoEm?: string | null },
  referencia: Dayjs = hoje(),
): string {
  if (ocorrencia.status === 'paga') {
    return ocorrencia.pagoEm ? `Paga em ${dayjs(ocorrencia.pagoEm).format('DD/MM')}` : 'Paga';
  }

  const dias = dayjs(ocorrencia.dataVencimento).startOf('day').diff(referencia, 'day');
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  if (dias > 1) return `Vence em ${dias} dias`;
  if (dias === -1) return 'Atrasada há 1 dia';
  return `Atrasada há ${Math.abs(dias)} dias`;
}

export type CampoOrdenacao = 'vencimento' | 'valor' | 'nome' | 'tipo';

export const ROTULO_ORDENACAO: Record<CampoOrdenacao, string> = {
  vencimento: 'Vencimento',
  valor: 'Valor',
  nome: 'Nome',
  tipo: 'Tipo',
};

/**
 * Ordena sem mutar. Ocorrências pagas vão sempre para o fim, qualquer que
 * seja o critério — elas continuam visíveis, mas não competem com o que
 * ainda precisa de atenção.
 */
export function ordenarOcorrencias(
  ocorrencias: OcorrenciaComDivida[],
  campo: CampoOrdenacao,
): OcorrenciaComDivida[] {
  return [...ocorrencias].sort((a, b) => {
    const pagaA = a.status === 'paga' ? 1 : 0;
    const pagaB = b.status === 'paga' ? 1 : 0;
    if (pagaA !== pagaB) return pagaA - pagaB;

    switch (campo) {
      case 'valor':
        return b.valor - a.valor;
      case 'nome':
        return a.nome.localeCompare(b.nome, 'pt-BR');
      case 'tipo': {
        const porTipo = a.tipo.localeCompare(b.tipo);
        if (porTipo !== 0) return porTipo;
        return compararVencimento(a, b);
      }
      case 'vencimento':
      default:
        return compararVencimento(a, b);
    }
  });
}

function compararVencimento(a: OcorrenciaComDivida, b: OcorrenciaComDivida): number {
  const diff = a.dataVencimento.localeCompare(b.dataVencimento);
  return diff !== 0 ? diff : a.nome.localeCompare(b.nome, 'pt-BR');
}
