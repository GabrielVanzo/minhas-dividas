import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarOff, SearchX, WalletMinimal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { ControlesLista } from '@/components/ControlesLista';
import { EmptyState } from '@/components/EmptyState';
import { FolhaModal } from '@/components/FolhaModal';
import { NavegadorMes } from '@/components/NavegadorMes';
import { OcorrenciaCard } from '@/components/OcorrenciaCard';
import { BotaoPrimario, Campo, EntradaTexto } from '@/components/form';
import { Cores } from '@/constants/theme';
import {
  atualizarValorOcorrencia,
  garantirRecorrentesDoMes,
  limitesDeNavegacao,
  listarMes,
  listarPainel,
  marcarPaga,
  marcarPendente,
} from '@/data/ocorrenciasRepository';
import { obterPreferencia } from '@/data/preferenciasRepository';
import { OcorrenciaComDivida, TipoDivida } from '@/data/types';
import { formatarMoeda, formatarValorEditavel, parsearValor } from '@/domain/format';
import { intervaloNavegavel, IntervaloMeses, Mes, mesCorrente } from '@/domain/mes';
import { CampoOrdenacao, ordenarOcorrencias } from '@/domain/ocorrencia';

/**
 * O mês corrente é o único que materializa recorrentes e que arrasta contas
 * atrasadas de meses anteriores. Nos outros, a lista é só o que vence ali —
 * com as recorrentes projetadas quando o mês ainda não chegou.
 */
async function carregarMes(mes: Mes): Promise<OcorrenciaComDivida[]> {
  if (mes !== mesCorrente()) return listarMes(mes);
  await garantirRecorrentesDoMes(mes);
  return listarPainel(mes);
}

export default function DividasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mes, setMes] = useState<Mes>(mesCorrente);
  const [intervalo, setIntervalo] = useState<IntervaloMeses>(() =>
    intervaloNavegavel(mesCorrente(), null),
  );
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaComDivida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ordenacao, setOrdenacao] = useState<CampoOrdenacao>('vencimento');
  const [tipos, setTipos] = useState<TipoDivida[]>([]);
  const [nome, setNome] = useState('');

  // Edição rápida de valor, sem sair da lista.
  const [emEdicao, setEmEdicao] = useState<OcorrenciaComDivida | null>(null);
  const [valorTexto, setValorTexto] = useState('');

  const irPara = useCallback(async (destino: Mes) => {
    setMes(destino);
    setOcorrencias(await carregarMes(destino));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      // Volta sempre ao mês corrente ao reabrir a aba: ele é o foco do app.
      const atual = mesCorrente();
      setMes(atual);

      Promise.all([carregarMes(atual), limitesDeNavegacao(), obterPreferencia('nome_usuario')])
        .then(([lista, limites, nomeSalvo]) => {
          if (!ativo) return;
          setOcorrencias(lista);
          setIntervalo(limites);
          setNome(nomeSalvo ?? '');
        })
        .finally(() => ativo && setCarregando(false));
      return () => {
        ativo = false;
      };
    }, []),
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
    if (ocorrencia.projetada) return;
    if (ocorrencia.status === 'paga') {
      await marcarPendente(ocorrencia.id);
    } else {
      await marcarPaga(ocorrencia.id);
    }
    setOcorrencias(await carregarMes(mes));
  }

  function abrirEdicaoValor(ocorrencia: OcorrenciaComDivida) {
    if (ocorrencia.projetada) return;
    setEmEdicao(ocorrencia);
    setValorTexto(ocorrencia.valor > 0 ? formatarValorEditavel(ocorrencia.valor) : '');
  }

  async function salvarValor() {
    if (!emEdicao) return;
    await atualizarValorOcorrencia(emEdicao.id, parsearValor(valorTexto));
    setEmEdicao(null);
    setOcorrencias(await carregarMes(mes));
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

  const corrente = mesCorrente();
  const futuro = mes > corrente;
  const passado = mes < corrente;
  const semNenhuma = ocorrencias.length === 0;

  const rotuloValor = futuro ? 'Previsto' : passado ? 'Ainda em aberto' : 'Falta pagar';
  const rotuloVazio = futuro
    ? 'Nada previsto para este mês'
    : passado
      ? 'Nada em aberto neste mês'
      : 'Nada a pagar neste mês';

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
                  ? rotuloVazio
                  : `${rotuloValor} · ${resumo.quantidade} ${
                      resumo.quantidade === 1 ? 'conta' : 'contas'
                    }`}
                {resumo.pagas > 0
                  ? ` · ${resumo.pagas} ${resumo.pagas === 1 ? 'paga' : 'pagas'}`
                  : ''}
              </Text>
            </View>

            <NavegadorMes mes={mes} intervalo={intervalo} onMudar={irPara} />

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
          !semNenhuma ? (
            <EmptyState
              icone={SearchX}
              titulo="Nada com esse filtro"
              descricao="Nenhuma conta deste tipo vence no período."
              acaoRotulo="Limpar filtro"
              onAcao={() => setTipos([])}
            />
          ) : mes !== corrente ? (
            <EmptyState
              icone={CalendarOff}
              titulo="Mês sem contas"
              descricao="Nada vence neste mês."
              acaoRotulo="Voltar para hoje"
              onAcao={() => irPara(corrente)}
            />
          ) : (
            <EmptyState
              icone={WalletMinimal}
              titulo="Tudo limpo por aqui"
              descricao="Cadastre sua primeira dívida para acompanhar vencimentos e valores em um só lugar."
              acaoRotulo="Cadastrar dívida"
              onAcao={() => router.push('/divida/nova')}
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
