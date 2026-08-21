import { useFocusEffect, useRouter } from 'expo-router';
import { SearchX, WalletMinimal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { ControlesLista } from '@/components/ControlesLista';
import { EmptyState } from '@/components/EmptyState';
import { FolhaModal } from '@/components/FolhaModal';
import { OcorrenciaCard } from '@/components/OcorrenciaCard';
import { BotaoPrimario, Campo, EntradaTexto } from '@/components/form';
import { Cores } from '@/constants/theme';
import {
  atualizarValorOcorrencia,
  garantirRecorrentesDoMes,
  listarPainel,
  marcarPaga,
  marcarPendente,
} from '@/data/ocorrenciasRepository';
import { obterPreferencia } from '@/data/preferenciasRepository';
import { OcorrenciaComDivida, TipoDivida } from '@/data/types';
import { formatarMoeda, formatarValorEditavel, parsearValor } from '@/domain/format';
import { mesCorrente } from '@/domain/mes';
import { CampoOrdenacao, ordenarOcorrencias } from '@/domain/ocorrencia';

export default function DividasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaComDivida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ordenacao, setOrdenacao] = useState<CampoOrdenacao>('vencimento');
  const [tipos, setTipos] = useState<TipoDivida[]>([]);
  const [nome, setNome] = useState('');

  // Edição rápida de valor, sem sair da lista.
  const [emEdicao, setEmEdicao] = useState<OcorrenciaComDivida | null>(null);
  const [valorTexto, setValorTexto] = useState('');

  const recarregar = useCallback(async () => {
    const mes = mesCorrente();
    // Abrir o mês é o gatilho que materializa as recorrentes dele.
    await garantirRecorrentesDoMes(mes);
    return listarPainel(mes);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      Promise.all([recarregar(), obterPreferencia('nome_usuario')])
        .then(([lista, nomeSalvo]) => {
          if (!ativo) return;
          setOcorrencias(lista);
          setNome(nomeSalvo ?? '');
        })
        .finally(() => ativo && setCarregando(false));
      return () => {
        ativo = false;
      };
    }, [recarregar]),
  );

  // Lista vazia de tipos = sem filtro, mostra tudo.
  const visiveis = useMemo(() => {
    const filtradas =
      tipos.length === 0 ? ocorrencias : ocorrencias.filter((o) => tipos.includes(o.tipo));
    return ordenarOcorrencias(filtradas, ordenacao);
  }, [ocorrencias, tipos, ordenacao]);

  const resumo = useMemo(() => {
    const pendentes = visiveis.filter((o) => o.status === 'pendente');
    return {
      aPagar: pendentes.reduce((soma, o) => soma + o.valor, 0),
      quantidade: pendentes.length,
      pagas: visiveis.length - pendentes.length,
    };
  }, [visiveis]);

  async function alternarPago(ocorrencia: OcorrenciaComDivida) {
    if (ocorrencia.status === 'paga') {
      await marcarPendente(ocorrencia.id);
    } else {
      await marcarPaga(ocorrencia.id);
    }
    setOcorrencias(await listarPainel(mesCorrente()));
  }

  function abrirEdicaoValor(ocorrencia: OcorrenciaComDivida) {
    setEmEdicao(ocorrencia);
    setValorTexto(ocorrencia.valor > 0 ? formatarValorEditavel(ocorrencia.valor) : '');
  }

  async function salvarValor() {
    if (!emEdicao) return;
    await atualizarValorOcorrencia(emEdicao.id, parsearValor(valorTexto));
    setEmEdicao(null);
    setOcorrencias(await listarPainel(mesCorrente()));
  }

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

  const semNenhuma = ocorrencias.length === 0;

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
                {tipos.length > 0 ? 'Filtrado' : nome ? `Olá, ${nome}` : 'Quitaê'}
              </Text>

              <Text className="mt-1 text-3xl font-bold text-mist-100">
                {formatarMoeda(resumo.aPagar)}
              </Text>

              <Text className="mt-1 text-sm text-mist-300">
                {resumo.quantidade === 0
                  ? 'Nada a pagar neste mês'
                  : `Falta pagar · ${resumo.quantidade} ${
                      resumo.quantidade === 1 ? 'conta' : 'contas'
                    }`}
                {resumo.pagas > 0
                  ? ` · ${resumo.pagas} ${resumo.pagas === 1 ? 'paga' : 'pagas'}`
                  : ''}
              </Text>
            </View>

            {semNenhuma ? null : (
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
          <OcorrenciaCard
            ocorrencia={item}
            onPress={() =>
              router.push({ pathname: '/divida/[id]', params: { id: item.dividaId } })
            }
            onAlternarPago={() => alternarPago(item)}
            onEditarValor={() => abrirEdicaoValor(item)}
          />
        )}
        ListEmptyComponent={
          semNenhuma ? (
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
              descricao="Nenhuma conta deste tipo vence no período."
              acaoRotulo="Limpar filtro"
              onAcao={() => setTipos([])}
            />
          )
        }
      />

      <BotaoFlutuante onPress={() => router.push('/divida/nova')} />

      <FolhaModal
        visivel={emEdicao !== null}
        onFechar={() => setEmEdicao(null)}
        titulo={emEdicao ? `Valor de ${emEdicao.nome}` : 'Valor'}>
        <Campo
          rotulo="Valor desta conta"
          dica="Vale só para este vencimento — os outros meses continuam como estão">
          <EntradaTexto
            value={valorTexto}
            onChangeText={setValorTexto}
            placeholder="0,00"
            keyboardType="decimal-pad"
            autoFocus
          />
        </Campo>
        <BotaoPrimario rotulo="Salvar valor" onPress={salvarValor} />
      </FolhaModal>
    </View>
  );
}
