import { ArrowUpDown, Check } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Cores } from '@/constants/theme';
import { TipoDivida, TIPOS_DIVIDA } from '@/data/types';
import { CampoOrdenacao, ROTULO_ORDENACAO, ROTULO_TIPO } from '@/domain/divida';
import { useState } from 'react';

const CAMPOS: CampoOrdenacao[] = ['vencimento', 'valor', 'nome', 'tipo'];

function Chip({
  rotulo,
  ativo,
  onPress,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 active:opacity-70 ${
        ativo ? 'border-brand-500 bg-brand-500/15' : 'border-ink-500 bg-ink-700'
      }`}>
      <Text
        className={`text-[13px] font-medium ${ativo ? 'text-brand-400' : 'text-mist-300'}`}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

interface Props {
  tiposSelecionados: TipoDivida[];
  onAlternarTipo: (tipo: TipoDivida) => void;
  onLimparTipos: () => void;
  ordenacao: CampoOrdenacao;
  onOrdenar: (campo: CampoOrdenacao) => void;
  quantidade: number;
}

export function ControlesLista({
  tiposSelecionados,
  onAlternarTipo,
  onLimparTipos,
  ordenacao,
  onOrdenar,
  quantidade,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const semFiltro = tiposSelecionados.length === 0;

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        <Chip rotulo="Todas" ativo={semFiltro} onPress={onLimparTipos} />
        {TIPOS_DIVIDA.map((tipo) => (
          <Chip
            key={tipo}
            rotulo={ROTULO_TIPO[tipo]}
            ativo={tiposSelecionados.includes(tipo)}
            onPress={() => onAlternarTipo(tipo)}
          />
        ))}
      </ScrollView>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs text-mist-400">
          {quantidade} {quantidade === 1 ? 'dívida' : 'dívidas'}
        </Text>

        <Pressable
          onPress={() => setMenuAberto(true)}
          className="flex-row items-center gap-1.5 rounded-full border border-ink-500 bg-ink-700 px-3 py-1.5 active:opacity-70">
          <ArrowUpDown size={13} color={Cores.textoFraco} />
          <Text className="text-xs font-medium text-mist-200">
            {ROTULO_ORDENACAO[ordenacao]}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={menuAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAberto(false)}>
        <Pressable
          onPress={() => setMenuAberto(false)}
          className="flex-1 justify-end bg-black/60">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl border-t border-ink-500 bg-ink-800 px-5 pb-10 pt-3">
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-ink-500" />
            <Text className="mb-3 text-sm font-semibold text-mist-200">Ordenar por</Text>

            {CAMPOS.map((campo) => {
              const ativo = campo === ordenacao;
              return (
                <Pressable
                  key={campo}
                  onPress={() => {
                    onOrdenar(campo);
                    setMenuAberto(false);
                  }}
                  className="flex-row items-center justify-between py-3.5 active:opacity-70">
                  <Text
                    className={`text-base ${ativo ? 'font-semibold text-brand-400' : 'text-mist-100'}`}>
                    {ROTULO_ORDENACAO[campo]}
                  </Text>
                  {ativo ? <Check size={18} color={Cores.marcaClara} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
