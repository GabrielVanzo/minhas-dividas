import { ArrowUpDown, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FolhaModal } from '@/components/FolhaModal';
import { Cores } from '@/constants/theme';
import { TipoDivida, TIPOS_DIVIDA } from '@/data/types';
import { ROTULO_TIPO } from '@/domain/divida';
import { CampoOrdenacao, ROTULO_ORDENACAO } from '@/domain/ocorrencia';

const CAMPOS: CampoOrdenacao[] = ['vencimento', 'valor', 'nome', 'tipo'];

function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 active:scale-95 active:opacity-70 ${
        ativo ? 'border-brand-500 bg-brand-500/15' : 'border-ink-500 bg-ink-700'
      }`}>
      <Text className={`text-[13px] font-medium ${ativo ? 'text-brand-400' : 'text-mist-300'}`}>
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
          <Text className="text-xs font-medium text-mist-200">{ROTULO_ORDENACAO[ordenacao]}</Text>
        </Pressable>
      </View>

      <FolhaModal visivel={menuAberto} onFechar={() => setMenuAberto(false)} titulo="Ordenar por">
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
      </FolhaModal>
    </View>
  );
}
