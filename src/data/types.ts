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

export interface Divida {
  id: string;
  workspaceId: string;
  ownerId: string;
  nome: string;
  tipo: TipoDivida;
  /** Valor da parcela/mensalidade, não o total do contrato. */
  valor: number;
  /**
   * `pontual`: a data única.
   * `parcelada`: vencimento da parcela atual.
   * `recorrente`: sempre null — use `diaVencimentoRecorrente`.
   */
  dataVencimento: string | null; // YYYY-MM-DD
  /** 1..31, apenas para `recorrente`. */
  diaVencimentoRecorrente: number | null;
  parcelaAtual: number | null;
  parcelaTotal: number | null;
  categoria: string | null;
  ativa: boolean;
  criadoEm: string; // ISO 8601
}

/** Campos que o formulário envia; o repositório preenche o resto. */
export type NovaDivida = Omit<
  Divida,
  'id' | 'workspaceId' | 'ownerId' | 'criadoEm' | 'ativa'
> & { ativa?: boolean };

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
