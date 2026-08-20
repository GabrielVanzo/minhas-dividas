import { useFocusEffect } from 'expo-router';
import { Check, Moon, Plus, Tag, User, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FolhaModal } from '@/components/FolhaModal';
import { BotaoPrimario, Campo, EntradaTexto } from '@/components/form';
import { Cores } from '@/constants/theme';
import {
  contarUsos,
  criarCategoria,
  listarCategorias,
  removerCategoria,
} from '@/data/categoriasRepository';
import { definirPreferencia, obterPreferencia } from '@/data/preferenciasRepository';
import { Categoria } from '@/data/types';

export default function ConfigScreen() {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [folhaAberta, setFolhaAberta] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [erroCategoria, setErroCategoria] = useState<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      Promise.all([obterPreferencia('nome_usuario'), listarCategorias()])
        .then(([valor, lista]) => {
          if (!ativo) return;
          setNome(valor ?? '');
          setCategorias(lista);
        })
        .finally(() => ativo && setCarregando(false));
      return () => {
        ativo = false;
      };
    }, []),
  );

  function salvarNome() {
    definirPreferencia('nome_usuario', nome.trim());
  }

  async function adicionarCategoria() {
    const limpo = novaCategoria.trim();
    if (!limpo) {
      setErroCategoria('Informe um nome');
      return;
    }
    if (categorias.some((c) => c.nome.toLowerCase() === limpo.toLowerCase())) {
      setErroCategoria('Já existe uma categoria com esse nome');
      return;
    }

    await criarCategoria(limpo);
    setCategorias(await listarCategorias());
    setNovaCategoria('');
    setErroCategoria(undefined);
    setFolhaAberta(false);
  }

  async function confirmarRemocao(categoria: Categoria) {
    const usos = await contarUsos(categoria.nome);
    const aviso =
      usos > 0
        ? `${usos} ${usos === 1 ? 'dívida usa' : 'dívidas usam'} esta categoria. ${
            usos === 1 ? 'Ela ficará' : 'Elas ficarão'
          } sem categoria — nada é excluído.`
        : 'Essa categoria não está em uso.';

    Alert.alert(`Excluir "${categoria.nome}"`, aviso, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removerCategoria(categoria.id);
          setCategorias(await listarCategorias());
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
    <ScrollView
      className="flex-1 bg-ink-900"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled">
      <Text className="text-[13px] font-medium uppercase tracking-widest text-mist-400">
        Ajustes
      </Text>
      <Text className="mt-1 text-2xl font-bold text-mist-100">Preferências</Text>

      <Secao icone={User} titulo="Seu nome" />
      <View className="rounded-card border border-ink-500 bg-ink-700 p-4">
        <EntradaTexto
          value={nome}
          onChangeText={setNome}
          onBlur={salvarNome}
          placeholder="Como você quer ser chamado"
        />
        <Text className="mt-2 text-xs text-mist-400">
          Fica só neste aparelho. Serve para identificar o perfil se um dia houver mais de um.
        </Text>
      </View>

      <Secao icone={Tag} titulo="Categorias" />
      <View className="rounded-card border border-ink-500 bg-ink-700 px-4">
        {categorias.length === 0 ? (
          <Text className="py-5 text-center text-sm text-mist-300">
            Nenhuma categoria. Crie uma para agrupar suas dívidas.
          </Text>
        ) : (
          categorias.map((categoria, indice) => (
            <View
              key={categoria.id}
              className={`flex-row items-center justify-between py-3.5 ${
                indice > 0 ? 'border-t border-ink-500' : ''
              }`}>
              <Text className="flex-1 text-[15px] text-mist-100">{categoria.nome}</Text>
              <Pressable
                onPress={() => confirmarRemocao(categoria)}
                hitSlop={10}
                className="h-8 w-8 items-center justify-center rounded-full active:bg-danger/15">
                <X size={16} color={Cores.textoFraco} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Pressable
        onPress={() => {
          setNovaCategoria('');
          setErroCategoria(undefined);
          setFolhaAberta(true);
        }}
        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-ink-400 py-3.5 active:opacity-70">
        <Plus size={16} color={Cores.marcaClara} />
        <Text className="text-sm font-semibold text-brand-400">Nova categoria</Text>
      </Pressable>

      <Secao icone={Moon} titulo="Tema" />
      <View className="flex-row items-center justify-between rounded-card border border-ink-500 bg-ink-700 px-4 py-4">
        <View className="flex-1">
          <Text className="text-[15px] text-mist-100">Escuro</Text>
          <Text className="mt-0.5 text-xs text-mist-400">
            Único tema por enquanto — a estrutura já aceita um claro no futuro.
          </Text>
        </View>
        <Check size={18} color={Cores.marcaClara} />
      </View>

      <FolhaModal
        visivel={folhaAberta}
        onFechar={() => setFolhaAberta(false)}
        titulo="Nova categoria">
        <Campo rotulo="Nome" erro={erroCategoria}>
          <EntradaTexto
            value={novaCategoria}
            onChangeText={(t) => {
              setNovaCategoria(t);
              setErroCategoria(undefined);
            }}
            placeholder="Ex.: Streaming"
            autoFocus
            erro={Boolean(erroCategoria)}
          />
        </Campo>
        <BotaoPrimario rotulo="Adicionar" onPress={adicionarCategoria} />
      </FolhaModal>
    </ScrollView>
  );
}

function Secao({ icone: Icone, titulo }: { icone: typeof User; titulo: string }) {
  return (
    <View className="mb-2.5 mt-7 flex-row items-center gap-2">
      <Icone size={14} color={Cores.textoFraco} />
      <Text className="text-[13px] font-semibold uppercase tracking-wide text-mist-400">
        {titulo}
      </Text>
    </View>
  );
}
