import { useFocusEffect } from 'expo-router';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cores } from '@/constants/theme';
import { listarDividas } from '@/data/dividasRepository';
import { definirRenda, obterRenda } from '@/data/rendaRepository';
import { Divida, TipoDivida, TIPOS_DIVIDA } from '@/data/types';
import { ROTULO_TIPO } from '@/domain/divida';
import { formatarMoeda, parsearValor } from '@/domain/format';
import { calcularResumo, incidenciaNoMes, mesCorrente, parcelaDoMes, rotuloMes } from '@/domain/mes';

export default function ResumoScreen() {
  const insets = useSafeAreaInsets();
  const [mes, setMes] = useState(mesCorrente);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [rendaTexto, setRendaTexto] = useState('');
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      // Recalcula o mês a cada foco: pega a virada se o app ficou aberto.
      const atual = mesCorrente();
      setMes(atual);

      Promise.all([listarDividas(), obterRenda(atual)])
        .then(([lista, renda]) => {
          if (!ativo) return;
          setDividas(lista);
          setRendaTexto(renda ? formatarValorEditavel(renda.valor) : '');
        })
        .finally(() => ativo && setCarregando(false));
      return () => {
        ativo = false;
      };
    }, []),
  );

  const renda = parsearValor(rendaTexto);
  const resumo = useMemo(() => calcularResumo(dividas, mes, renda), [dividas, mes, renda]);

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
  const comprometido = renda > 0 ? Math.min(resumo.totalDividas / renda, 1) : 0;

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
        Resumo de
      </Text>
      <Text className="mt-1 text-2xl font-bold text-mist-100">{rotuloMes(mes)}</Text>

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

        <Text
          className={`mt-1.5 text-4xl font-bold ${positivo ? 'text-mist-100' : 'text-danger'}`}>
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
          <LinhaValor rotulo="Dívidas do mês" valor={`− ${formatarMoeda(resumo.totalDividas)}`} />
        </View>
      </View>

      {/* Composição por tipo */}
      {resumo.dividasDoMes.length > 0 ? (
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
                      {resumo.porTipo[tipo].quantidade === 1 ? 'dívida' : 'dívidas'}
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
            {resumo.dividasDoMes.map((divida, indice) => {
              const parcela = parcelaDoMes(divida, mes);
              return (
                <View
                  key={divida.id}
                  className={`flex-row items-center justify-between gap-3 py-3.5 ${
                    indice > 0 ? 'border-t border-ink-500' : ''
                  }`}>
                  <View className="flex-1">
                    <Text className="text-[15px] text-mist-100" numberOfLines={1}>
                      {divida.nome}
                    </Text>
                    <Text className="mt-0.5 text-xs text-mist-400">
                      {ROTULO_TIPO[divida.tipo]}
                      {parcela && divida.parcelaTotal
                        ? ` · parcela ${parcela}/${divida.parcelaTotal}`
                        : ''}
                    </Text>
                  </View>
                  <Text className="text-[15px] font-semibold text-mist-100">
                    {formatarMoeda(incidenciaNoMes(divida, mes))}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View className="mt-6 items-center rounded-card border border-dashed border-ink-500 px-6 py-10">
          <Text className="text-center text-sm text-mist-300">
            Nenhuma dívida vence neste mês.
          </Text>
        </View>
      )}
    </ScrollView>
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

/** "1234.5" -> "1.234,50", no formato que o campo aceita de volta. */
function formatarValorEditavel(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
