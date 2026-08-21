import { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { espacoInferior, useAlturaTeclado } from '@/hooks/useAlturaTeclado';

/**
 * Bottom sheet padrão do app: fundo escurecido, cantos superiores arredondados
 * e alça de arraste. Fecha ao tocar fora ou no botão de voltar do Android.
 *
 * A folha sobe junto com o teclado. Não dá para delegar isso ao
 * `KeyboardAvoidingView`: o `Modal` abre numa janela própria, fora do alcance
 * do `adjustResize` — ver `useAlturaTeclado`.
 */
export function FolhaModal({
  visivel,
  onFechar,
  titulo,
  children,
}: {
  visivel: boolean;
  onFechar: () => void;
  titulo?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const teclado = useAlturaTeclado();

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onFechar}>
      <Pressable onPress={onFechar} className="flex-1 justify-end bg-black/70">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ paddingBottom: espacoInferior(teclado, insets.bottom, 24) }}
          className="rounded-t-3xl border-t border-ink-500 bg-ink-800 px-5 pt-3">
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-ink-500" />
          {titulo ? (
            <Text className="mb-4 text-lg font-semibold text-mist-100">{titulo}</Text>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
