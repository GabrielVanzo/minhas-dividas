import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Cores } from '@/constants/theme';
import { deslocarMes, IntervaloMeses, Mes, mesCorrente, rotuloMes } from '@/domain/mes';

interface Props {
  mes: Mes;
  intervalo: IntervaloMeses;
  onMudar: (mes: Mes) => void;
}

/**
 * Navegação entre meses. O mês corrente é o foco — por isso o atalho "Hoje"
 * só aparece quando o usuário saiu dele, e as setas travam nos limites em vez
 * de rolar para sempre por meses vazios.
 */
export function NavegadorMes({ mes, intervalo, onMudar }: Props) {
  const corrente = mesCorrente();
  const anterior = deslocarMes(mes, -1);
  const seguinte = deslocarMes(mes, 1);

  const podeVoltar = anterior >= intervalo.primeiro;
  const podeAvancar = seguinte <= intervalo.ultimo;
  const foraDoCorrente = mes !== corrente;

  return (
    <View className="mb-4 flex-row items-center gap-2 rounded-card border border-ink-500 bg-ink-700 p-1.5">
      <Seta
        direcao="anterior"
        habilitada={podeVoltar}
        onPress={() => onMudar(anterior)}
        rotulo="Mês anterior"
      />

      <View className="flex-1 items-center">
        <Text className="text-[15px] font-semibold text-mist-100">{rotuloMes(mes)}</Text>
        {foraDoCorrente ? (
          <Pressable
            onPress={() => onMudar(corrente)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar para o mês atual"
            className="active:opacity-60">
            <Text className="mt-0.5 text-[11px] font-medium text-brand-400">Voltar para hoje</Text>
          </Pressable>
        ) : (
          <Text className="mt-0.5 text-[11px] text-mist-400">Mês atual</Text>
        )}
      </View>

      <Seta
        direcao="seguinte"
        habilitada={podeAvancar}
        onPress={() => onMudar(seguinte)}
        rotulo="Próximo mês"
      />
    </View>
  );
}

function Seta({
  direcao,
  habilitada,
  onPress,
  rotulo,
}: {
  direcao: 'anterior' | 'seguinte';
  habilitada: boolean;
  onPress: () => void;
  rotulo: string;
}) {
  const Icone = direcao === 'anterior' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      onPress={habilitada ? onPress : undefined}
      disabled={!habilitada}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !habilitada }}
      className={`h-10 w-10 items-center justify-center rounded-xl ${
        habilitada ? 'bg-ink-600 active:opacity-60' : 'opacity-25'
      }`}>
      <Icone size={20} color={habilitada ? Cores.textoSuave : Cores.textoApagado} />
    </Pressable>
  );
}
