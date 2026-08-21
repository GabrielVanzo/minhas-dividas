import { useFocusEffect } from 'expo-router';
import { PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavegadorMes } from '@/components/NavegadorMes';
import { Cores } from '@/constants/theme';
import {
  garantirRecorrentesDoMes,
  limitesDeNavegacao,
  listarMes,
} from '@/data/ocorrenciasRepository';
import { definirRenda, obterRenda } from '@/data/rendaRepository';
import { totalReservado } from '@/data/reservasRepository';
import { OcorrenciaComDivida, TIPOS_DIVIDA } from '@/data/types';
import { ROTULO_TIPO } from '@/domain/divida';
import { formatarMoeda, formatarValorEditavel, parsearValor } from '@/domain/format';
import {
  calcularResumo,
  intervaloNavegavel,
  IntervaloMeses,
  Mes,
  mesCorrente,
} from '@/domain/mes';

/** Só o mês corrente materializa recorrentes; os demais são leitura. */
async function carregarMes(mes: Mes): Promise<OcorrenciaComDivida[]> {
  if (mes === mesCorrente()) await garantirRecorrentesDoMes(mes);
  return listarMes(mes);
}

export default function ResumoScreen() {
  const insets = useSafeAreaInsets();
  const [mes, setMes] = useState<Mes>(mesCorrente);
  const [intervalo, setIntervalo] = useState<IntervaloMeses>(() =>
    intervaloNavegavel(mesCorrente(), null),
  );
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaComDivida[]>([]);
  const [rendaTexto, setRendaTexto] = useState('');
  const [reservado, setReservado] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const irPara = useCallback(async (destino: Mes) => {
    setMes(destino);
    const [lista, renda] = await Promise.all([carregarMes(destino), obterRenda(destino)]);
    setOcorrencias(lista);
    setRendaTexto(renda ? formatarValorEditavel(renda.valor) : '');
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      // Recalcula o mês a cada foco: pega a virada se o app ficou aberto.
      const atual = mesCorrente();
      setMes(atual);

      Promise.all([
        carregarMes(atual),
        limitesDeNavegacao(),
        obterRenda(atual),
        totalReservado(),
      ])
        .then(([lista, limites, renda, reservas]) => {
          if (!ativo) return;
          setOcorrencias(lista);
          setIntervalo(limites);
          setRendaTexto(renda ? formatarValorEditavel(renda.valor) : '');
          setReservado(reservas);
        })
        .finally(() => ativo && setCarregando(false));
      return () => {
        ativo = false;
      };
    }, []),
  );

  const renda = parsearValor(rendaTexto);
  const resumo = useMemo(
    () => calcularResumo(ocorrencias, mes, renda),
    [ocorrencias, mes, renda],
  );

  // Salva ao sair do campo — evita escrever no banco a cada tecla.
  function salvarRenda() {
    const valor = parsearValor(rendaTexto);
    setRendaTexto(valor > 0 ? formatarValorEditavel(valor) : '');
    definirRenda(mes, valor);
  }

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-900">
        <ActivityIndicator color={Cores.marca} />
      </View>
    );
  }

  const positivo = resumo.saldo >= 0;
  const previstas = resumo.ocorrenciasDoMes.filter((o) => o.projetada).length;
  const comprometido = renda > 0 ? Math.min(resumo.totalMes / renda, 1) : 0;
  const progressoPago = resumo.totalMes > 0 ? resumo.pago / resumo.totalMes : 0;

  return (
    <ScrollView
      className="flex-1 bg-ink-900"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled">
      <Text className="mb-3 text-[13px] font-medium uppercase tracking-widest text-mist-400">
        Resumo do mês
      </Text>

      <NavegadorMes mes={mes} intervalo={intervalo} onMudar={irPara} />

      {/* Renda */}
      <View className="mt-6 rounded-card border border-ink-500 bg-ink-700 p-4">
        <View className="mb-2 flex-row items-center gap-2">
          <Wallet size={14} color={Cores.textoFraco} />
          <Text className="text-[13px] font-medium text-mist-200">Renda do mês</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-semibold text-mist-300">R$</Text>
          <TextInput
            value={rendaTexto}
            onChangeText={setRendaTexto}
            onBlur={salvarRenda}
            placeholder="0,00"
            placeholderTextColor={Cores.textoApagado}
            keyboardType="decimal-pad"
            returnKeyType="done"
            className="flex-1 text-2xl font-bold text-mist-100"
          />
        </View>
      </View>

      {/* Saldo */}
      <View
        className={`mt-3 overflow-hidden rounded-card border p-5 ${
          positivo ? 'border-ok/30 bg-ok/[0.07]' : 'border-danger/40 bg-danger/[0.09]'
        }`}>
        <View className="flex-row items-center gap-2">
          {positivo ? (
            <TrendingUp size={15} color={Cores.ok} />
          ) : (
            <TrendingDown size={15} color={Cores.perigo} />
          )}
          <Text
            className={`text-[13px] font-semibold uppercase tracking-wide ${
              positivo ? 'text-ok' : 'text-danger'
            }`}>
            {positivo ? 'Sobra no mês' : 'Falta no mês'}
          </Text>
        </View>

        <Text className={`mt-1.5 text-4xl font-bold ${positivo ? 'text-mist-100' : 'text-danger'}`}>
          {formatarMoeda(Math.abs(resumo.saldo))}
        </Text>

        {renda > 0 ? (
          <View className="mt-4">
            <View className="h-1.5 overflow-hidden rounded-full bg-ink-600">
              <View
                style={{ width: `${comprometido * 100}%` }}
                className={`h-full rounded-full ${positivo ? 'bg-ok' : 'bg-danger'}`}
              />
            </View>
            <Text className="mt-2 text-xs text-mist-300">
              {Math.round(comprometido * 100)}% da renda comprometida com dívidas
            </Text>
          </View>
        ) : null}

        <View className="mt-4 gap-1.5 border-t border-white/[0.07] pt-4">
          <LinhaValor rotulo="Renda" valor={formatarMoeda(renda)} />
          <LinhaValor rotulo="Dívidas do mês" valor={`− ${formatarMoeda(resumo.totalMes)}`} />
        </View>
      </View>

      {/* Total do mês x já pago x falta pagar */}
      <View className="mt-3 rounded-card border border-ink-500 bg-ink-700 p-4">
        <View className="flex-row">
          <Coluna rotulo="Total do mês" valor={formatarMoeda(resumo.totalMes)} />
          <Coluna rotulo="Já pago" valor={formatarMoeda(resumo.pago)} cor="text-ok" />
          <Coluna
            rotulo="Falta pagar"
            valor={formatarMoeda(resumo.aPagar)}
            cor={resumo.aPagar > 0 ? 'text-warn' : 'text-mist-300'}
          />
        </View>

        {resumo.totalMes > 0 ? (
          <View className="mt-4">
            <View className="h-1.5 overflow-hidden rounded-full bg-ink-600">
              <View
                style={{ width: `${progressoPago * 100}%` }}
                className="h-full rounded-full bg-ok"
              />
            </View>
            <Text className="mt-2 text-xs text-mist-400">
              {Math.round(progressoPago * 100)}% das contas do mês já quitadas
            </Text>
          </View>
        ) : null}

        {previstas > 0 ? (
          <Text className="mt-3 border-t border-white/[0.07] pt-3 text-xs text-mist-300">
            Inclui {previstas} {previstas === 1 ? 'recorrente prevista' : 'recorrentes previstas'}
            {' '}pelo último valor pago. O número real só se firma quando o mês chegar.
          </Text>
        ) : null}
      </View>

      {/* Reservado — informativo, de propósito fora da conta do saldo */}
      {reservado > 0 ? (
        <View className="mt-3 flex-row items-center gap-3 rounded-card border border-ink-500 bg-ink-700 px-4 py-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-ok/10">
            <PiggyBank size={17} color={Cores.ok} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] text-mist-100">Guardado em reservas</Text>
            <Text className="mt-0.5 text-xs text-mist-400">Não entra na conta do saldo acima</Text>
          </View>
          <Text className="text-[15px] font-semibold text-ok">{formatarMoeda(reservado)}</Text>
        </View>
      ) : null}

      {/* Composição por tipo */}
      {resumo.ocorrenciasDoMes.length > 0 ? (
        <>
          <Secao titulo="Composição" />
          <View className="rounded-card border border-ink-500 bg-ink-700 px-4">
            {TIPOS_DIVIDA.filter((tipo) => resumo.porTipo[tipo].quantidade > 0).map(
              (tipo, indice) => (
                <View
                  key={tipo}
                  className={`flex-row items-center justify-between py-3.5 ${
                    indice > 0 ? 'border-t border-ink-500' : ''
                  }`}>
                  <View>
                    <Text className="text-[15px] text-mist-100">{ROTULO_TIPO[tipo]}</Text>
                    <Text className="mt-0.5 text-xs text-mist-400">
                      {resumo.porTipo[tipo].quantidade}{' '}
                      {resumo.porTipo[tipo].quantidade === 1 ? 'conta' : 'contas'}
                    </Text>
                  </View>
                  <Text className="text-[15px] font-semibold text-mist-100">
                    {formatarMoeda(resumo.porTipo[tipo].total)}
                  </Text>
                </View>
              ),
            )}
          </View>

          <Secao titulo="O que vence neste mês" />
          <View className="rounded-card border border-ink-500 bg-ink-700 px-4">
            {resumo.ocorrenciasDoMes.map((ocorrencia, indice) => (
              <View
                key={ocorrencia.id}
                className={`flex-row items-center justify-between gap-3 py-3.5 ${
                  indice > 0 ? 'border-t border-ink-500' : ''
                } ${ocorrencia.status === 'paga' ? 'opacity-55' : ''}`}>
                <View className="flex-1">
                  <Text className="text-[15px] text-mist-100" numberOfLines={1}>
                    {ocorrencia.nome}
                  </Text>
                  <Text className="mt-0.5 text-xs text-mist-400">
                    {ROTULO_TIPO[ocorrencia.tipo]}
                    {ocorrencia.numeroParcela && ocorrencia.totalParcelas
                      ? ` · parcela ${ocorrencia.numeroParcela}/${ocorrencia.totalParcelas}`
                      : ''}
                    {ocorrencia.status === 'paga' ? ' · paga' : ''}
                    {ocorrencia.projetada ? ' · previsto' : ''}
                  </Text>
                </View>
                <Text className="text-[15px] font-semibold text-mist-100">
                  {formatarMoeda(ocorrencia.valor)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View className="mt-6 items-center rounded-card border border-dashed border-ink-500 px-6 py-10">
          <Text className="text-center text-sm text-mist-300">
            Nenhuma conta vence neste mês.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Coluna({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] uppercase tracking-wide text-mist-400">{rotulo}</Text>
      <Text className={`mt-1 text-[15px] font-bold ${cor ?? 'text-mist-100'}`}>{valor}</Text>
    </View>
  );
}

function LinhaValor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-mist-300">{rotulo}</Text>
      <Text className="text-sm font-medium text-mist-200">{valor}</Text>
    </View>
  );
}

function Secao({ titulo }: { titulo: string }) {
  return (
    <Text className="mb-2.5 mt-6 text-[13px] font-semibold uppercase tracking-wide text-mist-400">
      {titulo}
    </Text>
  );
}
