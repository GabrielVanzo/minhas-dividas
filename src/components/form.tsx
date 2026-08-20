import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { CalendarDays } from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import { Platform, Pressable, Text, TextInput, TextInputProps, View } from 'react-native';

import { Cores } from '@/constants/theme';

export function Campo({
  rotulo,
  dica,
  erro,
  children,
}: {
  rotulo: string;
  dica?: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-[13px] font-medium text-mist-200">{rotulo}</Text>
      {children}
      {erro ? (
        <Text className="mt-1.5 text-xs text-danger">{erro}</Text>
      ) : dica ? (
        <Text className="mt-1.5 text-xs text-mist-400">{dica}</Text>
      ) : null}
    </View>
  );
}

export function EntradaTexto({ erro, ...props }: TextInputProps & { erro?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={Cores.textoApagado}
      className={`rounded-xl border bg-ink-600 px-4 py-3.5 text-base text-mist-100 ${
        erro ? 'border-danger' : 'border-ink-500'
      }`}
      {...props}
    />
  );
}

interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

/** Controle segmentado — usado para escolher o tipo da dívida. */
export function SeletorOpcoes<T extends string>({
  opcoes,
  selecionado,
  onSelecionar,
}: {
  opcoes: Opcao<T>[];
  selecionado: T;
  onSelecionar: (valor: T) => void;
}) {
  return (
    <View className="flex-row gap-2 rounded-xl border border-ink-500 bg-ink-600 p-1">
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === selecionado;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => onSelecionar(opcao.valor)}
            className={`flex-1 items-center rounded-lg py-2.5 ${ativo ? 'bg-brand-500' : ''}`}>
            <Text
              className={`text-[13px] font-semibold ${ativo ? 'text-white' : 'text-mist-300'}`}>
              {opcao.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Campo de data que abre o seletor nativo. `valor` é YYYY-MM-DD. */
export function SeletorData({
  valor,
  onMudar,
  erro,
}: {
  valor: string | null;
  onMudar: (iso: string) => void;
  erro?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const data = valor ? dayjs(valor).toDate() : new Date();

  return (
    <>
      <Pressable
        onPress={() => setAberto(true)}
        className={`flex-row items-center justify-between rounded-xl border bg-ink-600 px-4 py-3.5 active:opacity-80 ${
          erro ? 'border-danger' : 'border-ink-500'
        }`}>
        <Text className={`text-base ${valor ? 'text-mist-100' : 'text-mist-400'}`}>
          {valor ? dayjs(valor).format('DD/MM/YYYY') : 'Selecionar data'}
        </Text>
        <CalendarDays size={18} color={Cores.textoFraco} />
      </Pressable>

      {aberto ? (
        <DateTimePicker
          value={data}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant="dark"
          onChange={(evento, selecionada) => {
            if (Platform.OS !== 'ios') setAberto(false);
            if (evento.type === 'set' && selecionada) {
              onMudar(dayjs(selecionada).format('YYYY-MM-DD'));
              if (Platform.OS === 'ios') setAberto(false);
            } else if (Platform.OS === 'ios') {
              setAberto(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

export function BotaoPrimario({
  rotulo,
  onPress,
  desabilitado,
}: {
  rotulo: string;
  onPress: () => void;
  desabilitado?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      className={`items-center rounded-xl py-4 active:opacity-80 ${
        desabilitado ? 'bg-ink-600' : 'bg-brand-500'
      }`}>
      <Text
        className={`text-base font-semibold ${desabilitado ? 'text-mist-400' : 'text-white'}`}>
        {rotulo}
      </Text>
    </Pressable>
  );
}
