import { SituacaoOcorrencia } from '@/domain/ocorrencia';

/**
 * Espelho em JS da paleta declarada em `tailwind.config.js`.
 * Use as classes Tailwind na UI; estas constantes são só para APIs
 * que exigem a cor crua (navegação, StatusBar, props de ícone).
 */
export const Cores = {
  fundo: '#0A0B0F',
  superficie: '#12141A',
  card: '#191C24',
  cardElevado: '#222630',
  borda: '#2E333F',
  bordaForte: '#3D4351',

  texto: '#F4F6FB',
  textoSuave: '#C8CEDC',
  textoFraco: '#8D96AA',
  textoApagado: '#646D80',

  marca: '#5B7CFA',
  marcaClara: '#7C9CFF',

  ok: '#37D399',
  atencao: '#F5B849',
  perigo: '#FF6B6B',
} as const;

interface EstiloStatus {
  rotulo: string;
  cor: string;
  /** Classes Tailwind do chip de status no card. */
  chipFundo: string;
  chipTexto: string;
  /** Faixa vertical colorida na borda esquerda do card. */
  faixa: string;
}

export const ESTILO_STATUS: Record<SituacaoOcorrencia, EstiloStatus> = {
  atrasada: {
    rotulo: 'Atrasada',
    cor: Cores.perigo,
    chipFundo: 'bg-danger/15',
    chipTexto: 'text-danger',
    faixa: 'bg-danger',
  },
  proxima: {
    rotulo: 'Próxima',
    cor: Cores.atencao,
    chipFundo: 'bg-warn/15',
    chipTexto: 'text-warn',
    faixa: 'bg-warn',
  },
  em_dia: {
    rotulo: 'Em dia',
    cor: Cores.ok,
    chipFundo: 'bg-ok/15',
    chipTexto: 'text-ok',
    faixa: 'bg-ok',
  },
  paga: {
    rotulo: 'Paga',
    cor: Cores.textoApagado,
    chipFundo: 'bg-mist-400/15',
    chipTexto: 'text-mist-400',
    faixa: 'bg-mist-400',
  },
};
