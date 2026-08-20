import { Plus } from 'lucide-react-native';
import { Pressable } from 'react-native';

/** FAB de "adicionar", ancorado no canto inferior direito acima da barra de abas. */
export function BotaoFlutuante({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ bottom: 24 }}
      className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-black/50 active:scale-95 active:opacity-80">
      <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
    </Pressable>
  );
}
