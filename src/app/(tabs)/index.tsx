import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, SearchX, WalletMinimal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ControlesLista } from '@/components/ControlesLista';
import { DividaCard } from '@/components/DividaCard';
import { EmptyState } from '@/components/EmptyState';
import { Cores } from '@/constants/theme';
import { listarDividas } from '@/data/dividasRepository';
import { Divida, TipoDivida } from '@/data/types';
import { CampoOrdenacao, estaQuitada, ordenarDividas, statusDivida } from '@/domain/divida';
import { formatarMoeda } from '@/domain/format';

export default function DividasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ordenacao, setOrdenacao] = useState<CampoOrdenacao>('vencimento');
  const [tipos, setTipos] = useState<TipoDivida[]>([]);

  // Recarrega ao voltar do formulário — mais simples que propagar estado global.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarDividas()
        .then((lista) => ativo && setDividas(lista))
        .finally(() => ativo && setCarregando(false));
      return () => {
        ativo = false;
      };
    }, []),
  );

  // Lista vazia de tipos = sem filtro, mostra tudo.
  const visiveis = useMemo(() => {
    const filtradas = tipos.length === 0 ? dividas : dividas.filter((d) => tipos.includes(d.tipo));
    return ordenarDividas(filtradas, ordenacao);
  }, [dividas, tipos, ordenacao]);

  const resumo = useMemo(() => {
    const abertas = visiveis.filter((d) => !estaQuitada(d));
    return {
      total: abertas.reduce((soma, d) => soma + d.valor, 0),
      quantidade: abertas.length,
      atrasadas: abertas.filter((d) => statusDivida(d) === 'atrasada').length,
    };
  }, [visiveis]);

  function alternarTipo(tipo: TipoDivida) {
    setTipos((atuais) =>
      atuais.includes(tipo) ? atuais.filter((t) => t !== tipo) : [...atuais, tipo],
    );
  }

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-900">
        <ActivityIndicator color={Cores.marca} />
      </View>
    );
  }

  const semNenhumaDivida = dividas.length === 0;

  return (
    <View className="flex-1 bg-ink-900">
      <FlatList
        data={visiveis}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 96,
        }}
        ListHeaderComponent={
          <View>
            <View className="mb-5">
              <Text className="text-[13px] font-medium uppercase tracking-widest text-mist-400">
                {tipos.length === 0 ? 'Minhas dívidas' : 'Filtrado'}
              </Text>

              <Text className="mt-1 text-3xl font-bold text-mist-100">
                {formatarMoeda(resumo.total)}
              </Text>

              <Text className="mt-1 text-sm text-mist-300">
                {resumo.quantidade === 0
                  ? 'Nenhuma dívida em aberto'
                  : `${resumo.quantidade} em aberto`}
                {resumo.atrasadas > 0
                  ? ` · ${resumo.atrasadas} atrasada${resumo.atrasadas > 1 ? 's' : ''}`
                  : ''}
              </Text>
            </View>

            {semNenhumaDivida ? null : (
              <ControlesLista
                tiposSelecionados={tipos}
                onAlternarTipo={alternarTipo}
                onLimparTipos={() => setTipos([])}
                ordenacao={ordenacao}
                onOrdenar={setOrdenacao}
                quantidade={visiveis.length}
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <DividaCard
            divida={item}
            onPress={() => router.push({ pathname: '/divida/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          semNenhumaDivida ? (
            <EmptyState
              icone={WalletMinimal}
              titulo="Tudo limpo por aqui"
              descricao="Cadastre sua primeira dívida para acompanhar vencimentos e valores em um só lugar."
              acaoRotulo="Cadastrar dívida"
              onAcao={() => router.push('/divida/nova')}
            />
          ) : (
            <EmptyState
              icone={SearchX}
              titulo="Nada com esse filtro"
              descricao="Nenhuma dívida do tipo selecionado. Ajuste o filtro para ver as outras."
              acaoRotulo="Mostrar todas"
              onAcao={() => setTipos([])}
            />
          )
        }
      />

      <Pressable
        onPress={() => router.push('/divida/nova')}
        style={{ bottom: 24 }}
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-black/50 active:opacity-80">
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}
