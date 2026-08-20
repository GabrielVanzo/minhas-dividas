import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BotaoPrimario,
  Campo,
  EntradaTexto,
  SeletorData,
  SeletorOpcoes,
} from '@/components/form';
import { Cores } from '@/constants/theme';
import { listarCategorias } from '@/data/categoriasRepository';
import {
  atualizarDivida,
  criarDivida,
  obterDivida,
  removerDivida,
} from '@/data/dividasRepository';
import { NovaDivida, TipoDivida } from '@/data/types';
import { ROTULO_TIPO } from '@/domain/divida';
import { formatarValorEditavel, parsearValor } from '@/domain/format';

const OPCOES_TIPO = (['recorrente', 'parcelada', 'pontual'] as TipoDivida[]).map((tipo) => ({
  valor: tipo,
  rotulo: ROTULO_TIPO[tipo],
}));

interface Estado {
  nome: string;
  tipo: TipoDivida;
  valor: string;
  dataVencimento: string | null;
  diaVencimentoRecorrente: string;
  parcelaAtual: string;
  parcelaTotal: string;
  categoria: string;
}

const ESTADO_INICIAL: Estado = {
  nome: '',
  tipo: 'recorrente',
  valor: '',
  dataVencimento: null,
  diaVencimentoRecorrente: '',
  parcelaAtual: '1',
  parcelaTotal: '',
  categoria: '',
};

type Erros = Partial<Record<keyof Estado, string>>;

export function DividaForm({ dividaId }: { dividaId?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [erros, setErros] = useState<Erros>({});
  const [categorias, setCategorias] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(Boolean(dividaId));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarCategorias().then((lista) => setCategorias(lista.map((c) => c.nome)));
  }, []);

  useEffect(() => {
    if (!dividaId) return;

    obterDivida(dividaId).then((divida) => {
      if (divida) {
        setEstado({
          nome: divida.nome,
          tipo: divida.tipo,
          valor: formatarValorEditavel(divida.valor),
          dataVencimento: divida.dataVencimento,
          diaVencimentoRecorrente: divida.diaVencimentoRecorrente?.toString() ?? '',
          parcelaAtual: divida.parcelaAtual?.toString() ?? '1',
          parcelaTotal: divida.parcelaTotal?.toString() ?? '',
          categoria: divida.categoria ?? '',
        });
      }
      setCarregando(false);
    });
  }, [dividaId]);

  function alterar<K extends keyof Estado>(campo: K, valor: Estado[K]) {
    setEstado((atual) => ({ ...atual, [campo]: valor }));
    setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  }

  function validar(): NovaDivida | null {
    const novosErros: Erros = {};

    if (!estado.nome.trim()) novosErros.nome = 'Dê um nome para identificar a dívida';

    const valor = parsearValor(estado.valor);
    if (valor <= 0) novosErros.valor = 'Informe um valor maior que zero';

    const dia = Number.parseInt(estado.diaVencimentoRecorrente, 10);
    const atual = Number.parseInt(estado.parcelaAtual, 10);
    const total = Number.parseInt(estado.parcelaTotal, 10);

    if (estado.tipo === 'recorrente' && (!Number.isFinite(dia) || dia < 1 || dia > 31)) {
      novosErros.diaVencimentoRecorrente = 'Informe um dia entre 1 e 31';
    }

    if (estado.tipo === 'parcelada') {
      if (!estado.dataVencimento) {
        novosErros.dataVencimento = 'Informe o vencimento da parcela atual';
      }
      if (!Number.isFinite(total) || total < 1) {
        novosErros.parcelaTotal = 'Informe o total de parcelas';
      } else if (!Number.isFinite(atual) || atual < 1 || atual > total) {
        novosErros.parcelaAtual = `Informe um número entre 1 e ${total}`;
      }
    }

    if (estado.tipo === 'pontual' && !estado.dataVencimento) {
      novosErros.dataVencimento = 'Informe a data de vencimento';
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return null;

    return {
      nome: estado.nome.trim(),
      tipo: estado.tipo,
      valor,
      dataVencimento: estado.tipo === 'recorrente' ? null : estado.dataVencimento,
      diaVencimentoRecorrente: estado.tipo === 'recorrente' ? dia : null,
      parcelaAtual: estado.tipo === 'parcelada' ? atual : null,
      parcelaTotal: estado.tipo === 'parcelada' ? total : null,
      categoria: estado.categoria.trim() || null,
    };
  }

  async function salvar() {
    const entrada = validar();
    if (!entrada) return;

    setSalvando(true);
    try {
      if (dividaId) {
        await atualizarDivida(dividaId, entrada);
      } else {
        await criarDivida(entrada);
      }
      router.back();
    } catch (e) {
      setSalvando(false);
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : String(e));
    }
  }

  function confirmarRemocao() {
    if (!dividaId) return;
    Alert.alert('Excluir dívida', `Remover "${estado.nome}" permanentemente?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removerDivida(dividaId);
          router.back();
        },
      },
    ]);
  }

  // Mantém visível a categoria já gravada mesmo que tenha sido excluída em Ajustes.
  const opcoesCategoria =
    estado.categoria && !categorias.includes(estado.categoria)
      ? [...categorias, estado.categoria]
      : categorias;

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-900">
        <ActivityIndicator color={Cores.marca} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-ink-900">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled">
        <Campo rotulo="Tipo">
          <SeletorOpcoes
            opcoes={OPCOES_TIPO}
            selecionado={estado.tipo}
            onSelecionar={(tipo) => alterar('tipo', tipo)}
          />
        </Campo>

        <Campo rotulo="Nome" erro={erros.nome}>
          <EntradaTexto
            value={estado.nome}
            onChangeText={(t) => alterar('nome', t)}
            placeholder="Ex.: Financiamento do carro"
            erro={Boolean(erros.nome)}
          />
        </Campo>

        <Campo
          rotulo={estado.tipo === 'recorrente' ? 'Valor mensal' : 'Valor'}
          dica={estado.tipo === 'parcelada' ? 'Valor de cada parcela, não o total' : undefined}
          erro={erros.valor}>
          <EntradaTexto
            value={estado.valor}
            onChangeText={(t) => alterar('valor', t)}
            placeholder="0,00"
            keyboardType="decimal-pad"
            erro={Boolean(erros.valor)}
          />
        </Campo>

        {estado.tipo === 'recorrente' ? (
          <Campo
            rotulo="Dia do vencimento"
            dica="Em meses mais curtos, o vencimento cai no último dia disponível"
            erro={erros.diaVencimentoRecorrente}>
            <EntradaTexto
              value={estado.diaVencimentoRecorrente}
              onChangeText={(t) => alterar('diaVencimentoRecorrente', t.replace(/\D/g, ''))}
              placeholder="Ex.: 10"
              keyboardType="number-pad"
              maxLength={2}
              erro={Boolean(erros.diaVencimentoRecorrente)}
            />
          </Campo>
        ) : (
          <Campo
            rotulo={
              estado.tipo === 'parcelada' ? 'Vencimento da parcela atual' : 'Data de vencimento'
            }
            erro={erros.dataVencimento}>
            <SeletorData
              valor={estado.dataVencimento}
              onMudar={(iso) => alterar('dataVencimento', iso)}
              erro={Boolean(erros.dataVencimento)}
            />
          </Campo>
        )}

        {estado.tipo === 'parcelada' ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Campo rotulo="Parcela atual" erro={erros.parcelaAtual}>
                <EntradaTexto
                  value={estado.parcelaAtual}
                  onChangeText={(t) => alterar('parcelaAtual', t.replace(/\D/g, ''))}
                  placeholder="1"
                  keyboardType="number-pad"
                  maxLength={3}
                  erro={Boolean(erros.parcelaAtual)}
                />
              </Campo>
            </View>
            <View className="flex-1">
              <Campo rotulo="Total de parcelas" erro={erros.parcelaTotal}>
                <EntradaTexto
                  value={estado.parcelaTotal}
                  onChangeText={(t) => alterar('parcelaTotal', t.replace(/\D/g, ''))}
                  placeholder="12"
                  keyboardType="number-pad"
                  maxLength={3}
                  erro={Boolean(erros.parcelaTotal)}
                />
              </Campo>
            </View>
          </View>
        ) : null}

        <Campo
          rotulo="Categoria"
          dica={
            categorias.length === 0
              ? 'Nenhuma categoria criada — adicione em Ajustes'
              : 'Opcional — gerencie a lista em Ajustes'
          }>
          <View className="flex-row flex-wrap gap-2">
            <ChipCategoria
              rotulo="Nenhuma"
              ativo={estado.categoria === ''}
              onPress={() => alterar('categoria', '')}
            />
            {opcoesCategoria.map((nome) => (
              <ChipCategoria
                key={nome}
                rotulo={nome}
                ativo={estado.categoria === nome}
                onPress={() => alterar('categoria', nome)}
              />
            ))}
          </View>
        </Campo>

        <View className="mt-2">
          <BotaoPrimario
            rotulo={salvando ? 'Salvando…' : dividaId ? 'Salvar alterações' : 'Cadastrar dívida'}
            onPress={salvar}
            desabilitado={salvando}
          />
        </View>

        {dividaId ? (
          <Pressable
            onPress={confirmarRemocao}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-ink-500 py-4 active:opacity-70">
            <Trash2 size={16} color={Cores.perigo} />
            <Text className="text-base font-semibold text-danger">Excluir dívida</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ChipCategoria({
  rotulo,
  ativo,
  onPress,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 active:opacity-70 ${
        ativo ? 'border-brand-500 bg-brand-500/15' : 'border-ink-500 bg-ink-600'
      }`}>
      <Text className={`text-[13px] font-medium ${ativo ? 'text-brand-400' : 'text-mist-300'}`}>
        {rotulo}
      </Text>
    </Pressable>
  );
}
