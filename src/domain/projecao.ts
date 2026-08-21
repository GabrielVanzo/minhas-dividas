import { Divida, OcorrenciaComDivida } from '@/data/types';

import { vencimentoRecorrenteNoMes } from './divida';
import { Mes } from './mes';

/**
 * Projeção de recorrentes em meses que ainda não chegaram.
 *
 * Recorrente só vira linha no banco quando o mês abre — é isso que permite ao
 * valor nascer da última ocorrência paga, a melhor estimativa para uma conta
 * que varia. Materializar meses futuros só porque o usuário passou os olhos
 * congelaria o valor de hoje num mês distante e estragaria essa heurística.
 *
 * Então a visão de um mês futuro é montada assim: o que existe de verdade
 * (pontuais e parcelas, que já nasceram no cadastro) sai do banco, e as
 * recorrentes entram como **estimativa calculada na hora**, sem gravar nada.
 * São marcadas com `projetada` para a UI deixar claro que é previsão e não
 * oferecer ações que exigiriam uma linha real.
 */
export interface BaseRecorrente {
  divida: Divida;
  /** Valor da última ocorrência paga da dívida; 0 se nunca houve uma. */
  ultimoValor: number;
}

const PREFIXO_PROJECAO = 'projecao:';

/** Id sintético, estável dentro do mês — serve de `key` na lista. */
export function idProjecao(dividaId: string, mes: Mes): string {
  return `${PREFIXO_PROJECAO}${dividaId}:${mes}`;
}

export function ehProjecao(id: string): boolean {
  return id.startsWith(PREFIXO_PROJECAO);
}

/**
 * Monta as recorrentes de um mês futuro. Dívida que já tenha ocorrência real
 * no mês é ignorada — o dado gravado sempre ganha da estimativa.
 */
export function projetarRecorrentes(
  bases: BaseRecorrente[],
  mes: Mes,
  jaExistentes: OcorrenciaComDivida[],
): OcorrenciaComDivida[] {
  const comLinhaReal = new Set(jaExistentes.map((o) => o.dividaId));
  const projetadas: OcorrenciaComDivida[] = [];

  for (const { divida, ultimoValor } of bases) {
    if (comLinhaReal.has(divida.id)) continue;

    const data = vencimentoRecorrenteNoMes(divida, mes);
    if (!data) continue;

    projetadas.push({
      id: idProjecao(divida.id, mes),
      dividaId: divida.id,
      workspaceId: divida.workspaceId,
      ownerId: divida.ownerId,
      dataVencimento: data,
      valor: ultimoValor,
      status: 'pendente',
      numeroParcela: null,
      totalParcelas: null,
      pagoEm: null,
      nome: divida.nome,
      tipo: divida.tipo,
      categoria: divida.categoria,
      projetada: true,
    });
  }

  return projetadas;
}
