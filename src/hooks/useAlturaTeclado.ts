import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura do teclado em pixels; 0 quando fechado.
 *
 * Existe porque o `adjustResize` do AndroidManifest não resolve os dois casos
 * do app:
 *
 * - Dentro de um `Modal`, ele não vale — a folha abre numa janela própria, que
 *   não é redimensionada junto com a Activity.
 * - Com `edgeToEdgeEnabled` (padrão do Expo 57), o sistema deixou de
 *   redimensionar a janela: quem quiser espaço precisa consumir o inset do
 *   teclado por conta própria.
 *
 * Sem isso o teclado cobre o campo e o usuário digita às cegas.
 */
export function useAlturaTeclado(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    // No iOS o evento "will" chega junto com a animação; no Android só há "did".
    const aoAbrir = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const aoFechar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const abriu = Keyboard.addListener(aoAbrir, (e) => setAltura(e.endCoordinates.height));
    const fechou = Keyboard.addListener(aoFechar, () => setAltura(0));

    return () => {
      abriu.remove();
      fechou.remove();
    };
  }, []);

  return altura;
}

/**
 * Espaço a reservar embaixo do conteúdo.
 *
 * Com o teclado aberto ele já cobre a barra de navegação, então somar o inset
 * inferior empurraria o conteúdo alto demais — por isso é um ou o outro.
 */
export function espacoInferior(alturaTeclado: number, insetInferior: number, folga: number) {
  return (alturaTeclado > 0 ? alturaTeclado : insetInferior) + folga;
}
