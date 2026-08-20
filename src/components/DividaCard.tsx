import { CalendarDays, Layers, RefreshCw } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Cores, ESTILO_STATUS } from '@/constants/theme';
import { Divida, TipoDivida } from '@/data/types';
import { descricaoPrazo, ROTULO_TIPO, statusDivida, vencimentoEfetivo } from '@/domain/divida';
import { formatarMoeda } from '@/domain/format';

const ICONE_TIPO: Record<TipoDivida, typeof RefreshCw> = {
  recorrente: RefreshCw,
  parcelada: Layers,
  pontual: CalendarDays,
};

interface Props {
  divida: Divida;
  onPress: () => void;
}

export function DividaCard({ divida, onPress }: Props) {
  const status = statusDivida(divida);
  const estilo = ESTILO_STATUS[status];
  const IconeTipo = ICONE_TIPO[divida.tipo];
  const vencimento = vencimentoEfetivo(divida);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row overflow-hidden rounded-card border border-ink-500 bg-ink-700 active:opacity-80">
      <View className={`w-1 ${estilo.faixa}`} />

      <View className="flex-1 px-4 py-3.5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-mist-100" numberOfLines={1}>
              {divida.nome}
            </Text>

            <View className="mt-1 flex-row items-center gap-1.5">
              <IconeTipo size={13} color={Cores.textoFraco} />
              <Text className="text-xs text-mist-300">
                {ROTULO_TIPO[divida.tipo]}
                {divida.tipo === 'parcelada' && divida.parcelaTotal
                  ? ` · ${divida.parcelaAtual ?? 1}/${divida.parcelaTotal}`
                  : ''}
                {divida.categoria ? ` · ${divida.categoria}` : ''}
              </Text>
            </View>
          </View>

          <Text className="text-base font-bold text-mist-100">{formatarMoeda(divida.valor)}</Text>
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <View className={`rounded-full px-2.5 py-1 ${estilo.chipFundo}`}>
            <Text className={`text-[11px] font-semibold ${estilo.chipTexto}`}>{estilo.rotulo}</Text>
          </View>

          <Text className="text-xs text-mist-400">
            {descricaoPrazo(divida)}
            {vencimento ? ` · ${vencimento.format('DD/MM')}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
