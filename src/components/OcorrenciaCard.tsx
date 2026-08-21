import { CalendarDays, Check, Layers, RefreshCw } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Cores, ESTILO_STATUS } from '@/constants/theme';
import { OcorrenciaComDivida, TipoDivida } from '@/data/types';
import { ROTULO_TIPO } from '@/domain/divida';
import { formatarMoeda } from '@/domain/format';
import { descricaoPrazo, situacaoOcorrencia } from '@/domain/ocorrencia';

const ICONE_TIPO: Record<TipoDivida, typeof RefreshCw> = {
  recorrente: RefreshCw,
  parcelada: Layers,
  pontual: CalendarDays,
};

interface Props {
  ocorrencia: OcorrenciaComDivida;
  /** Toque no corpo do card — abre o cadastro da dívida. */
  onPress: () => void;
  /** Toque na caixa de marcar — alterna pago/pendente na hora. */
  onAlternarPago: () => void;
  /** Toque no valor — edição rápida, sem sair da lista. */
  onEditarValor: () => void;
}

export function OcorrenciaCard({ ocorrencia, onPress, onAlternarPago, onEditarValor }: Props) {
  const situacao = situacaoOcorrencia(ocorrencia);
  const estilo = ESTILO_STATUS[situacao];
  const IconeTipo = ICONE_TIPO[ocorrencia.tipo];
  const paga = ocorrencia.status === 'paga';
  const semValor = ocorrencia.valor <= 0;
  // Projeção não tem linha no banco: nada para marcar como paga nem para editar.
  const projetada = ocorrencia.projetada === true;

  return (
    <View
      className={`mb-3 flex-row overflow-hidden rounded-card border border-ink-500 bg-ink-700 ${
        paga ? 'opacity-55' : ''
      }`}>
      <View className={`w-1 ${projetada ? 'bg-ink-400' : estilo.faixa}`} />

      {projetada ? (
        <View className="items-center justify-center py-3.5 pl-3.5 pr-1">
          <View className="h-7 w-7 rounded-full border-2 border-dashed border-ink-500" />
        </View>
      ) : (
        /* Marcar como paga — alvo grande, sem navegar */
        <Pressable
          onPress={onAlternarPago}
          hitSlop={6}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: paga }}
          accessibilityLabel={
            paga ? `Desmarcar ${ocorrencia.nome} como paga` : `Marcar ${ocorrencia.nome} como paga`
          }
          className="items-center justify-center py-3.5 pl-3.5 pr-1 active:opacity-60">
          <View
            className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
              paga ? 'border-ok bg-ok' : 'border-ink-400'
            }`}>
            {paga ? <Check size={15} color={Cores.fundo} strokeWidth={3.5} /> : null}
          </View>
        </Pressable>
      )}

      <Pressable onPress={onPress} className="flex-1 py-3.5 pl-2.5 pr-4 active:opacity-80">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text
              className={`text-base font-semibold text-mist-100 ${paga ? 'line-through' : ''}`}
              numberOfLines={1}>
              {ocorrencia.nome}
            </Text>

            <View className="mt-1 flex-row items-center gap-1.5">
              <IconeTipo size={13} color={Cores.textoFraco} />
              <Text className="text-xs text-mist-300" numberOfLines={1}>
                {ROTULO_TIPO[ocorrencia.tipo]}
                {ocorrencia.numeroParcela && ocorrencia.totalParcelas
                  ? ` · ${ocorrencia.numeroParcela}/${ocorrencia.totalParcelas}`
                  : ''}
                {ocorrencia.categoria ? ` · ${ocorrencia.categoria}` : ''}
              </Text>
            </View>
          </View>

          {projetada ? (
            <Text className="text-base font-bold text-mist-300">
              {semValor ? '—' : formatarMoeda(ocorrencia.valor)}
            </Text>
          ) : (
            <Pressable onPress={onEditarValor} hitSlop={8} className="active:opacity-60">
              {semValor ? (
                <View className="rounded-lg border border-dashed border-warn px-2.5 py-1">
                  <Text className="text-xs font-semibold text-warn">Informar valor</Text>
                </View>
              ) : (
                <Text className="text-base font-bold text-mist-100">
                  {formatarMoeda(ocorrencia.valor)}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <View
            className={`rounded-full px-2.5 py-1 ${
              projetada ? 'bg-brand-500/[0.12]' : estilo.chipFundo
            }`}>
            <Text
              className={`text-[11px] font-semibold ${
                projetada ? 'text-brand-400' : estilo.chipTexto
              }`}>
              {projetada ? 'Previsto' : estilo.rotulo}
            </Text>
          </View>

          <Text className="text-xs text-mist-400">
            {descricaoPrazo(ocorrencia)}
            {!paga ? ` · ${ocorrencia.dataVencimento.slice(8, 10)}/${ocorrencia.dataVencimento.slice(5, 7)}` : ''}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
