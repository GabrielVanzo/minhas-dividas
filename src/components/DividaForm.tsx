import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  criarOcorrencias,
  listarOcorrenciasDaDivida,
  removerPendentesDaDivida,
} from '@/data/ocorrenciasRepository';
import { NovaDivida, TipoDivida } from '@/data/types';
import { ocorrenciasIniciais, ROTULO_TIPO } from '@/domain/divida';
import { formatarMoeda, parsearValor } from '@/domain/format';
import { espacoInferior, useAlturaTeclado } from '@/hooks/useAlturaTeclado';
import { dividirEmCentavos } from '@/domain/parcelas';

const OPCOES_TIPO = (['recorrente', 'parcelada', 'pontual'] as TipoDivida[]).map((tipo) => ({
  valor: tipo,
  rotulo: ROTULO_TIPO[tipo],
}));

interface Estado {
  nome: string;
  tipo: TipoDivida;
  /** Pontual: o valor. Parcelada: o valor TOTAL, que o app divide. */
  valor: string;
  dataVencimento: string | null;
  diaVencimento: string;
  totalParcelas: string;
  categoria: string;
}

const ESTADO_INICIAL: Estado = {
  nome: '',
  tipo: 'recorrente',
  valor: '',
  dataVencimento: null,
  diaVencimento: '',
  totalParcelas: '',
  categoria: '',
};

type Erros = Partial<Record<keyof Estado, string>>;

export function DividaForm({ dividaId }: { dividaId?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const teclado = useAlturaTeclado();
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [erros, setErros] = useState<Erros>({});
  const [categorias, setCategorias] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(Boolean(dividaId));
  const [salvando, setSalvando] = useState(false);
  /** Quantas ocorrências dessa dívida já foram pagas — trava a reedição. */
  const [pagas, setPagas] = useState(0);

  const editando = Boolean(dividaId);

  useEffect(() => {
    listarCategorias().then((lista) => setCategorias(lista.map((c) => c.nome)));
  }, []);

  useEffect(() => {
    if (!dividaId) return;

    Promise.all([obterDivida(dividaId), listarOcorrenciasDaDivida(dividaId)]).then(
      ([divida, ocorrencias]) => {
        if (divida) {
          const parceladas = ocorrencias.filter((o) => o.totalParcelas);
          setEstado({
            nome: divida.nome,
            tipo: divida.tipo,
            valor: '',
            dataVencimento: divida.dataVencimento,
            diaVencimento: divida.diaVencimento?.toString() ?? '',
            totalParcelas: parceladas[0]?.totalParcelas?.toString() ?? '',
            categoria: divida.categoria ?? '',
          });
          setPagas(ocorrencias.filter((o) => o.status === 'paga').length);
        }
        setCarregando(false);
      },
    );
  }, [dividaId]);

  function alterar<K extends keyof Estado>(campo: K, valor: Estado[K]) {
    setEstado((atual) => ({ ...atual, [campo]: valor }));
    setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  }

  /** Só tipos que materializam ocorrências no cadastro pedem valor. */
  const pedeValor = estado.tipo !== 'recorrente';
  const valorTotal = parsearValor(estado.valor);
  const total = Number.parseInt(estado.totalParcelas, 10);

  const previaParcela =
    estado.tipo === 'parcelada' && valorTotal > 0 && Number.isFinite(total) && total > 0
      ? dividirEmCentavos(valorTotal, total)
      : null;

  function validar(): NovaDivida | null {
    const novosErros: Erros = {};

    if (!estado.nome.trim()) novosErros.nome = 'Dê um nome para identificar a dívida';

    const dia = Number.parseInt(estado.diaVencimento, 10);

    if (estado.tipo === 'recorrente' && (!Number.isFinite(dia) || dia < 1 || dia > 31)) {
      novosErros.diaVencimento = 'Informe um dia entre 1 e 31';
    }

    if (pedeValor && valorTotal <= 0) {
      novosErros.valor = 'Informe um valor maior que zero';
    }

    if (estado.tipo === 'parcelada') {
      if (!estado.dataVencimento) {
        novosErros.dataVencimento = 'Informe o vencimento da 1ª parcela';
      }
      if (!Number.isFinite(total) || total < 1) {
        novosErros.totalParcelas = 'Informe em quantas vezes';
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
      categoria: estado.categoria.trim() || null,
      diaVencimento: estado.tipo === 'recorrente' ? dia : null,
      dataVencimento: estado.tipo === 'recorrente' ? null : estado.dataVencimento,
    };
  }

  async function salvar() {
    const entrada = validar();
    if (!entrada) return;

    setSalvando(true);
    try {
      if (dividaId) {
        await atualizarDivida(dividaId, entrada);
        // Regerar só faz sentido quando o usuário informou um valor novo.
        // O que já foi pago é histórico e nunca é tocado.
        if (pedeValor && valorTotal > 0) {
          await removerPendentesDaDivida(dividaId);
          await criarOcorrencias(
            dividaId,
            ocorrenciasIniciais(entrada, valorTotal, estado.tipo === 'parcelada' ? total : null),
          );
        }
      } else {
        const divida = await criarDivida(entrada);
        await criarOcorrencias(
          divida.id,
          ocorrenciasIniciais(entrada, valorTotal, estado.tipo === 'parcelada' ? total : null),
        );
      }
      router.back();
    } catch (e) {
      setSalvando(false);
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : String(e));
    }
  }

  function confirmarRemocao() {
    if (!dividaId) return;
    Alert.alert(
      'Excluir dívida',
      `Remover "${estado.nome}" e todos os seus vencimentos, inclusive os já pagos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await removerDivida(dividaId);
            router.back();
          },
        },
      ],
    );
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
    <View className="flex-1 bg-ink-900">
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          // Espaço para o teclado: com edge-to-edge o sistema não redimensiona
          // mais a janela, então o rodapé do formulário ficaria coberto.
          paddingBottom: espacoInferior(teclado, insets.bottom, 40),
        }}
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

        {estado.tipo === 'recorrente' ? (
          <>
            <Campo
              rotulo="Dia do vencimento"
              dica="Em meses mais curtos, o vencimento cai no último dia disponível"
              erro={erros.diaVencimento}>
              <EntradaTexto
                value={estado.diaVencimento}
                onChangeText={(t) => alterar('diaVencimento', t.replace(/\D/g, ''))}
                placeholder="Ex.: 10"
                keyboardType="number-pad"
                maxLength={2}
                erro={Boolean(erros.diaVencimento)}
              />
            </Campo>

            <View className="mb-5 rounded-xl border border-ink-500 bg-ink-700 px-4 py-3.5">
              <Text className="text-[13px] font-medium text-mist-200">
                O valor você informa mês a mês
              </Text>
              <Text className="mt-1 text-xs text-mist-400">
                Todo mês o Quitaê cria o vencimento sozinho, já com o valor do mês
                anterior. Quando a conta chegar diferente, é só tocar no valor na lista.
              </Text>
            </View>
          </>
        ) : null}

        {estado.tipo === 'parcelada' ? (
          <>
            <Campo rotulo="Valor total" dica="O total da compra — o app divide" erro={erros.valor}>
              <EntradaTexto
                value={estado.valor}
                onChangeText={(t) => alterar('valor', t)}
                placeholder="0,00"
                keyboardType="decimal-pad"
                erro={Boolean(erros.valor)}
              />
            </Campo>

            <Campo rotulo="Em quantas vezes" erro={erros.totalParcelas}>
              <EntradaTexto
                value={estado.totalParcelas}
                onChangeText={(t) => alterar('totalParcelas', t.replace(/\D/g, ''))}
                placeholder="Ex.: 6"
                keyboardType="number-pad"
                maxLength={3}
                erro={Boolean(erros.totalParcelas)}
              />
            </Campo>

            {previaParcela ? (
              <View className="mb-5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3">
                <Text className="text-[13px] font-semibold text-brand-400">
                  {total}x de {formatarMoeda(previaParcela[0])}
                </Text>
                {previaParcela[total - 1] !== previaParcela[0] ? (
                  <Text className="mt-1 text-xs text-mist-300">
                    A última fica {formatarMoeda(previaParcela[total - 1])} para fechar o
                    total sem sobra de centavos.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Campo rotulo="Vencimento da 1ª parcela" erro={erros.dataVencimento}>
              <SeletorData
                valor={estado.dataVencimento}
                onMudar={(iso) => alterar('dataVencimento', iso)}
                erro={Boolean(erros.dataVencimento)}
              />
            </Campo>
          </>
        ) : null}

        {estado.tipo === 'pontual' ? (
          <>
            <Campo rotulo="Valor" erro={erros.valor}>
              <EntradaTexto
                value={estado.valor}
                onChangeText={(t) => alterar('valor', t)}
                placeholder="0,00"
                keyboardType="decimal-pad"
                erro={Boolean(erros.valor)}
              />
            </Campo>

            <Campo rotulo="Data de vencimento" erro={erros.dataVencimento}>
              <SeletorData
                valor={estado.dataVencimento}
                onMudar={(iso) => alterar('dataVencimento', iso)}
                erro={Boolean(erros.dataVencimento)}
              />
            </Campo>
          </>
        ) : null}

        {editando && pedeValor ? (
          <View className="mb-5 rounded-xl border border-ink-500 bg-ink-700 px-4 py-3.5">
            <Text className="text-xs text-mist-300">
              Deixe o valor em branco para manter os vencimentos como estão. Se preencher,
              os vencimentos ainda não pagos são refeitos
              {pagas > 0
                ? ` — os ${pagas} já pagos ${pagas === 1 ? 'fica' : 'ficam'} intocados.`
                : '.'}
            </Text>
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
            rotulo={salvando ? 'Salvando…' : editando ? 'Salvar' : 'Cadastrar dívida'}
            onPress={salvar}
            desabilitado={salvando}
          />
        </View>

        {editando ? (
          <Pressable
            onPress={confirmarRemocao}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-ink-500 py-4 active:opacity-70">
            <Trash2 size={16} color={Cores.perigo} />
            <Text className="text-base font-semibold text-danger">Excluir dívida</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
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
