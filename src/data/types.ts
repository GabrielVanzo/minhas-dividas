/**
 * Tipos do domínio persistido.
 *
 * Todas as entidades já nascem com `workspaceId` e `ownerId` — hoje sempre
 * com os valores locais abaixo. Isso existe só para que um eventual modo
 * multi-perfil / workspace compartilhado não exija migração de schema.
 */

export const WORKSPACE_LOCAL = 'local';
export const OWNER_LOCAL = 'me';

export type TipoDivida = 'recorrente' | 'parcelada' | 'pontual';

export const TIPOS_DIVIDA: TipoDivida[] = ['recorrente', 'parcelada', 'pontual'];

/**
 * O cadastro da dívida — um *template*, criado uma vez.
 * Não guarda valor: quem tem valor é cada ocorrência.
 */
export interface Divida {
  id: string;
  workspaceId: string;
  ownerId: string;
  nome: string;
  tipo: TipoDivida;
  categoria: string | null;
  /** 1..31, só para `recorrente`. */
  diaVencimento: number | null;
  /**
   * `pontual`: a data única.
   * `parcelada`: vencimento da 1ª parcela (as demais saem daí).
   * `recorrente`: sempre null — use `diaVencimento`.
   */
  dataVencimento: string | null; // YYYY-MM-DD
  ativa: boolean;
  criadoEm: string; // ISO 8601
}

export type NovaDivida = Omit<Divida, 'id' | 'workspaceId' | 'ownerId' | 'criadoEm' | 'ativa'> & {
  ativa?: boolean;
};

export type StatusOcorrencia = 'pendente' | 'paga';

/**
 * O que de fato vence, aparece na lista e é pago. Uma linha por mês/parcela.
 */
export interface Ocorrencia {
  id: string;
  dividaId: string;
  workspaceId: string;
  ownerId: string;
  dataVencimento: string; // YYYY-MM-DD
  valor: number;
  status: StatusOcorrencia;
  /** Só para parceladas: 3 de 6. */
  numeroParcela: number | null;
  totalParcelas: number | null;
  pagoEm: string | null; // ISO 8601
}

/** Ocorrência já com os dados do template — é o que a lista consome. */
export interface OcorrenciaComDivida extends Ocorrencia {
  nome: string;
  tipo: TipoDivida;
  categoria: string | null;
  /**
   * Estimativa de recorrente num mês futuro, calculada na hora e **nunca
   * gravada**. Sem linha no banco, não aceita ser paga nem editada.
   * Ver `src/domain/projecao.ts`.
   */
  projetada?: boolean;
}

export type NovaOcorrencia = Omit<Ocorrencia, 'id' | 'workspaceId' | 'ownerId'>;

export interface Reserva {
  id: string;
  workspaceId: string;
  ownerId: string;
  nome: string;
  valor: number;
  finalidade: string | null;
  criadoEm: string;
}

export type NovaReserva = Omit<Reserva, 'id' | 'workspaceId' | 'ownerId' | 'criadoEm'>;

export interface RendaMensal {
  id: string;
  workspaceId: string;
  ownerId: string;
  /** YYYY-MM */
  mesReferencia: string;
  valor: number;
}

export interface Categoria {
  id: string;
  workspaceId: string;
  ownerId: string;
  nome: string;
  criadoEm: string;
}

/** Chaves aceitas em `preferencias`. Tema já existe aqui para o dia em que houver light. */
export type ChavePreferencia = 'nome_usuario' | 'tema';
