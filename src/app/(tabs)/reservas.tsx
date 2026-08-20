import { useFocusEffect } from 'expo-router';
import { PiggyBank, Target, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { EmptyState } from '@/components/EmptyState';
import { FolhaModal } from '@/components/FolhaModal';
import { BotaoPrimario, Campo, EntradaTexto } from '@/components/form';
import { Cores } from '@/constants/theme';
import {
  atualizarReserva,
  criarReserva,
  listarReservas,
  removerReserva,
} from '@/data/reservasRepository';
import { Reserva } from '@/data/types';
import { formatarMoeda, formatarValorEditavel, parsearValor } from '@/domain/format';

interface Rascunho {
  nome: string;
  valor: string;
  finalidade: string;
}

const RASCUNHO_VAZIO: Rascunho = { nome: '', valor: '', finalidade: '' };

export default function ReservasScreen() {
  const insets = useSafeAreaInsets();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [folhaAberta, setFolhaAberta] = useState(false);
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>(RASCUNHO_VAZIO);
  const [erros, setErros] = useState<Partial<Rascunho>>({});

  const recarregar = useCallback(() => {
    return listarReservas().then(setReservas);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarReservas()
        .then((lista) => ativo && setReservas(lista))
        .finally(() => ativo && setCarregando(false));
      return () => {
        ativo = false;
      };
    }, []),
  );

  const total = useMemo(
    () => reservas.reduce((soma, r) => soma + r.valor, 0),
    [reservas],
  );

  function abrirNova() {
    setEditando(null);
    setRascunho(RASCUNHO_VAZIO);
    setErros({});
    setFolhaAberta(true);
  }

  function abrirEdicao(reserva: Reserva) {
    setEditando(reserva);
    setRascunho({
      nome: reserva.nome,
      valor: formatarValorEditavel(reserva.valor),
      finalidade: reserva.finalidade ?? '',
    });
    setErros({});
    setFolhaAberta(true);
  }

  async function salvar() {
    const novosErros: Partial<Rascunho> = {};
    if (!rascunho.nome.trim()) novosErros.nome = 'Dê um nome para a reserva';

    const valor = parsearValor(rascunho.valor);
    if (valor <= 0) novosErros.valor = 'Informe um valor maior que zero';

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const entrada = {
      nome: rascunho.nome.trim(),
      valor,
      finalidade: rascunho.finalidade.trim() || null,
    };

    if (editando) {
      await atualizarReserva(editando.id, entrada);
    } else {
      await criarReserva(entrada);
    }

    setFolhaAberta(false);
    await recarregar();
  }

  function confirmarRemocao(reserva: Reserva) {
    Alert.alert('Excluir reserva', `Remover "${reserva.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removerReserva(reserva.id);
          setFolhaAberta(false);
          await recarregar();
        },
      },
    ]);
  }

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-900">
        <ActivityIndicator color={Cores.marca} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink-900">
      <FlatList
        data={reservas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 96,
        }}
        ListHeaderComponent={
          <View className="mb-5">
            <Text className="text-[13px] font-medium uppercase tracking-widest text-mist-400">
              Total reservado
            </Text>
            <Text className="mt-1 text-3xl font-bold text-mist-100">{formatarMoeda(total)}</Text>
            <Text className="mt-1 text-sm text-mist-300">
              {reservas.length === 0
                ? 'Nenhum guardadinho ainda'
                : `${reservas.length} ${reservas.length === 1 ? 'reserva' : 'reservas'}`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => abrirEdicao(item)}
            className="mb-3 flex-row items-center gap-3 rounded-card border border-ink-500 bg-ink-700 px-4 py-3.5 active:opacity-80">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-ok/10">
              <PiggyBank size={18} color={Cores.ok} />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-mist-100" numberOfLines={1}>
                {item.nome}
              </Text>
              {item.finalidade ? (
                <View className="mt-1 flex-row items-center gap-1.5">
                  <Target size={12} color={Cores.textoFraco} />
                  <Text className="flex-1 text-xs text-mist-300" numberOfLines={1}>
                    {item.finalidade}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text className="text-base font-bold text-ok">{formatarMoeda(item.valor)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icone={PiggyBank}
            titulo="Nenhum guardadinho"
            descricao="Registre o dinheiro que você já separou — para uma meta específica ou só para ter reserva."
            acaoRotulo="Criar reserva"
            onAcao={abrirNova}
          />
        }
      />

      <BotaoFlutuante onPress={abrirNova} />

      <FolhaModal
        visivel={folhaAberta}
        onFechar={() => setFolhaAberta(false)}
        titulo={editando ? 'Editar reserva' : 'Nova reserva'}>
        <Campo rotulo="Nome" erro={erros.nome}>
          <EntradaTexto
            value={rascunho.nome}
            onChangeText={(t) => setRascunho((r) => ({ ...r, nome: t }))}
            placeholder="Ex.: Reserva de emergência"
            erro={Boolean(erros.nome)}
          />
        </Campo>

        <Campo rotulo="Valor guardado" erro={erros.valor}>
          <EntradaTexto
            value={rascunho.valor}
            onChangeText={(t) => setRascunho((r) => ({ ...r, valor: t }))}
            placeholder="0,00"
            keyboardType="decimal-pad"
            erro={Boolean(erros.valor)}
          />
        </Campo>

        <Campo rotulo="Finalidade" dica="Opcional — para que esse dinheiro é">
          <EntradaTexto
            value={rascunho.finalidade}
            onChangeText={(t) => setRascunho((r) => ({ ...r, finalidade: t }))}
            placeholder="Ex.: Troca do notebook"
          />
        </Campo>

        <BotaoPrimario rotulo={editando ? 'Salvar' : 'Criar reserva'} onPress={salvar} />

        {editando ? (
          <Pressable
            onPress={() => confirmarRemocao(editando)}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-ink-500 py-4 active:opacity-70">
            <Trash2 size={16} color={Cores.perigo} />
            <Text className="text-base font-semibold text-danger">Excluir reserva</Text>
          </Pressable>
        ) : null}
      </FolhaModal>
    </View>
  );
}
