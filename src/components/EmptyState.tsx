import { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Cores } from '@/constants/theme';

interface Props {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  acaoRotulo?: string;
  onAcao?: () => void;
}

export function EmptyState({ icone: Icone, titulo, descricao, acaoRotulo, onAcao }: Props) {
  return (
    <View className="items-center px-8 py-16">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-ink-600">
        <Icone size={26} color={Cores.textoFraco} />
      </View>

      <Text className="mb-1.5 text-center text-lg font-semibold text-mist-100">{titulo}</Text>
      <Text className="text-center text-sm leading-5 text-mist-300">{descricao}</Text>

      {acaoRotulo && onAcao ? (
        <Pressable
          onPress={onAcao}
          className="mt-6 rounded-full bg-brand-500 px-6 py-3 active:opacity-80">
          <Text className="text-sm font-semibold text-white">{acaoRotulo}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
