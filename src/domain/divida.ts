import dayjs, { Dayjs } from 'dayjs';

import { Divida, TipoDivida } from '@/data/types';

import { comDiaClampado, ParcelaPlanejada, planejarParcelas } from './parcelas';

export const ROTULO_TIPO: Record<TipoDivida, string> = {
  recorrente: 'Recorrente',
  parcelada: 'Parcelada',
  pontual: 'Pontual',
};

/**
 * A ocorrência do mês para uma dívida recorrente: mesmo dia do mês de
 * referência, clampado quando o mês é curto.
 */
export function vencimentoRecorrenteNoMes(divida: Divida, mes: string): string | null {
  if (divida.tipo !== 'recorrente' || !divida.diaVencimento) return null;
  return comDiaClampado(dayjs(`${mes}-01`), divida.diaVencimento).format('YYYY-MM-DD');
}

/**
 * As ocorrências que uma dívida recém-cadastrada gera de imediato.
 *
 * - pontual: uma só, com a data e o valor informados.
 * - parcelada: as N parcelas, com o total já dividido.
 * - recorrente: nenhuma aqui — quem cria é a abertura do mês, porque o valor
 *   só se conhece quando a conta chega.
 */
export function ocorrenciasIniciais(
  divida: Pick<Divida, 'tipo' | 'dataVencimento'>,
  valorTotal: number,
  totalParcelas: number | null,
): ParcelaPlanejada[] {
  if (divida.tipo === 'pontual' && divida.dataVencimento) {
    return [{ numero: 1, total: 1, data: divida.dataVencimento, valor: valorTotal }];
  }

  if (divida.tipo === 'parcelada' && divida.dataVencimento && totalParcelas && totalParcelas > 0) {
    return planejarParcelas(divida.dataVencimento, totalParcelas, valorTotal);
  }

  return [];
}

/**
 * Converte uma dívida do modelo antigo (valor fixo + contador de parcelas)
 * nas ocorrências equivalentes. Usada só pela migração 3.
 *
 * Para parceladas, as parcelas anteriores à `parcelaAtual` viram ocorrências
 * já **pagas**: o usuário estava naquele ponto, então elas aconteceram. As
 * demais ficam pendentes.
 */
export interface DividaAntiga {
  tipo: TipoDivida;
  valor: number;
  dataVencimento: string | null;
  diaVencimentoRecorrente: number | null;
  parcelaAtual: number | null;
  parcelaTotal: number | null;
}

export interface OcorrenciaConvertida {
  data: string;
  valor: number;
  numero: number | null;
  total: number | null;
  paga: boolean;
}

export function converterParaOcorrencias(
  antiga: DividaAntiga,
  mesCorrente: string,
): OcorrenciaConvertida[] {
  if (antiga.tipo === 'pontual' && antiga.dataVencimento) {
    return [
      { data: antiga.dataVencimento, valor: antiga.valor, numero: null, total: null, paga: false },
    ];
  }

  if (antiga.tipo === 'parcelada' && antiga.dataVencimento && antiga.parcelaTotal) {
    const atual = antiga.parcelaAtual ?? 1;
    const base = dayjs(antiga.dataVencimento).startOf('day');
    const dia = base.date();

    // `dataVencimento` no modelo antigo era o vencimento da parcela ATUAL,
    // então as anteriores caminham para trás no calendário.
    return Array.from({ length: antiga.parcelaTotal }, (_, i) => {
      const numero = i + 1;
      const deslocamento = numero - atual;
      return {
        data: comDiaClampado(base.add(deslocamento, 'month'), dia).format('YYYY-MM-DD'),
        valor: antiga.valor,
        numero,
        total: antiga.parcelaTotal,
        paga: numero < atual,
      };
    });
  }

  if (antiga.tipo === 'recorrente' && antiga.diaVencimentoRecorrente) {
    // Uma única ocorrência no mês corrente, só para não perder o valor que o
    // usuário já tinha cadastrado. Os meses seguintes nascem na abertura do mês.
    return [
      {
        data: comDiaClampado(
          dayjs(`${mesCorrente}-01`),
          antiga.diaVencimentoRecorrente,
        ).format('YYYY-MM-DD'),
        valor: antiga.valor,
        numero: null,
        total: null,
        paga: false,
      },
    ];
  }

  return [];
}

export type { Dayjs };
