import dayjs from 'dayjs';
import { Divida } from '@/data/types';
import {
  descricaoPrazo,
  ordenarDividas,
  statusDivida,
  vencimentoEfetivo,
} from '@/domain/divida';
import { calcularResumo, incidenciaNoMes, parcelaDoMes, rotuloMes } from '@/domain/mes';

const HOJE = dayjs('2026-08-20').startOf('day');

function d(p: Partial<Divida>): Divida {
  return {
    id: p.nome ?? 'x',
    workspaceId: 'local',
    ownerId: 'me',
    nome: p.nome ?? 'x',
    tipo: p.tipo ?? 'pontual',
    valor: p.valor ?? 100,
    dataVencimento: p.dataVencimento ?? null,
    diaVencimentoRecorrente: p.diaVencimentoRecorrente ?? null,
    parcelaAtual: p.parcelaAtual ?? null,
    parcelaTotal: p.parcelaTotal ?? null,
    categoria: null,
    ativa: p.ativa ?? true,
    criadoEm: '2026-01-01T00:00:00.000Z',
  };
}

let falhas = 0;
function eq(rotulo: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${rotulo}${ok ? '' : `\n      obtido=${JSON.stringify(obtido)} esperado=${JSON.stringify(esperado)}`}`);
}

// --- vencimento efetivo de recorrentes ---
eq('recorrente dia 25 -> 25/08 (ainda neste mês)',
  vencimentoEfetivo(d({ tipo: 'recorrente', diaVencimentoRecorrente: 25 }), HOJE)?.format('YYYY-MM-DD'),
  '2026-08-25');

eq('recorrente dia 10 -> 10/09 (já passou este mês)',
  vencimentoEfetivo(d({ tipo: 'recorrente', diaVencimentoRecorrente: 10 }), HOJE)?.format('YYYY-MM-DD'),
  '2026-09-10');

eq('recorrente dia 20 -> hoje conta como não vencida',
  vencimentoEfetivo(d({ tipo: 'recorrente', diaVencimentoRecorrente: 20 }), HOJE)?.format('YYYY-MM-DD'),
  '2026-08-20');

eq('recorrente dia 31 em fevereiro -> clampa para 28',
  vencimentoEfetivo(d({ tipo: 'recorrente', diaVencimentoRecorrente: 31 }), dayjs('2026-02-01'))?.format('YYYY-MM-DD'),
  '2026-02-28');

// --- status ---
eq('vencida ontem -> atrasada', statusDivida(d({ dataVencimento: '2026-08-19' }), HOJE), 'atrasada');
eq('vence hoje -> proxima', statusDivida(d({ dataVencimento: '2026-08-20' }), HOJE), 'proxima');
eq('vence em 7 dias -> proxima', statusDivida(d({ dataVencimento: '2026-08-27' }), HOJE), 'proxima');
eq('vence em 8 dias -> em dia', statusDivida(d({ dataVencimento: '2026-08-28' }), HOJE), 'em_dia');
eq('parcela 13/12 -> quitada',
  statusDivida(d({ tipo: 'parcelada', parcelaAtual: 13, parcelaTotal: 12, dataVencimento: '2026-08-19' }), HOJE),
  'quitada');
eq('inativa -> quitada', statusDivida(d({ ativa: false, dataVencimento: '2026-08-19' }), HOJE), 'quitada');

// --- prazos ---
eq('prazo hoje', descricaoPrazo(d({ dataVencimento: '2026-08-20' }), HOJE), 'Vence hoje');
eq('prazo amanhã', descricaoPrazo(d({ dataVencimento: '2026-08-21' }), HOJE), 'Vence amanhã');
eq('prazo atrasada 3d', descricaoPrazo(d({ dataVencimento: '2026-08-17' }), HOJE), 'Atrasada há 3 dias');

// --- ordenação ---
const lista = [
  d({ nome: 'Cartão', tipo: 'recorrente', diaVencimentoRecorrente: 5, valor: 800 }),   // 05/09
  d({ nome: 'Atrasado', dataVencimento: '2026-08-15', valor: 50 }),                     // 15/08
  d({ nome: 'Quitada', tipo: 'parcelada', parcelaAtual: 13, parcelaTotal: 12, dataVencimento: '2026-08-01', valor: 9999 }),
  d({ nome: 'Aluguel', tipo: 'recorrente', diaVencimentoRecorrente: 25, valor: 1500 }), // 25/08
];

eq('ordem por vencimento (quitada no fim)',
  ordenarDividas(lista, 'vencimento', HOJE).map((x) => x.nome),
  ['Atrasado', 'Aluguel', 'Cartão', 'Quitada']);

eq('ordem por valor desc (quitada no fim)',
  ordenarDividas(lista, 'valor', HOJE).map((x) => x.nome),
  ['Aluguel', 'Cartão', 'Atrasado', 'Quitada']);

eq('ordem por nome (quitada no fim)',
  ordenarDividas(lista, 'nome', HOJE).map((x) => x.nome),
  ['Aluguel', 'Atrasado', 'Cartão', 'Quitada']);

// --- incidência mensal ---
const recorrente = d({ nome: 'Aluguel', tipo: 'recorrente', diaVencimentoRecorrente: 10, valor: 1500 });
eq('recorrente incide no mês corrente', incidenciaNoMes(recorrente, '2026-08'), 1500);
eq('recorrente incide em qualquer mês', incidenciaNoMes(recorrente, '2027-03'), 1500);

const pontual = d({ nome: 'IPVA', tipo: 'pontual', dataVencimento: '2026-09-15', valor: 900 });
eq('pontual incide só no mês do vencimento', incidenciaNoMes(pontual, '2026-09'), 900);
eq('pontual não incide antes', incidenciaNoMes(pontual, '2026-08'), 0);
eq('pontual não incide depois', incidenciaNoMes(pontual, '2026-10'), 0);

// parcela 3/12 vencendo em 10/08/2026 -> parcelas 3..12 caem de 08/2026 a 05/2027
const parcelada = d({
  nome: 'Notebook', tipo: 'parcelada', valor: 250,
  dataVencimento: '2026-08-10', parcelaAtual: 3, parcelaTotal: 12,
});
eq('parcelada incide no mês da parcela atual', incidenciaNoMes(parcelada, '2026-08'), 250);
eq('parcelada incide na última parcela (05/2027)', incidenciaNoMes(parcelada, '2027-05'), 250);
eq('parcelada não incide após a última', incidenciaNoMes(parcelada, '2027-06'), 0);
eq('parcelada não incide antes da parcela atual', incidenciaNoMes(parcelada, '2026-07'), 0);
eq('parcela do mês 08/2026 é a 3ª', parcelaDoMes(parcelada, '2026-08'), 3);
eq('parcela do mês 10/2026 é a 5ª', parcelaDoMes(parcelada, '2026-10'), 5);
eq('parcela do mês 05/2027 é a 12ª', parcelaDoMes(parcelada, '2027-05'), 12);
eq('parcela fora da janela é null', parcelaDoMes(parcelada, '2027-06'), null);

// última parcela: atual == total -> incide só neste mês
const ultima = d({
  nome: 'Última', tipo: 'parcelada', valor: 100,
  dataVencimento: '2026-08-05', parcelaAtual: 12, parcelaTotal: 12,
});
eq('última parcela incide no mês dela', incidenciaNoMes(ultima, '2026-08'), 100);
eq('última parcela não incide no mês seguinte', incidenciaNoMes(ultima, '2026-09'), 0);

eq('quitada não incide', incidenciaNoMes(d({ tipo: 'recorrente', diaVencimentoRecorrente: 5, ativa: false }), '2026-08'), 0);

// --- resumo do mês ---
const resumo = calcularResumo([recorrente, pontual, parcelada, ultima], '2026-08', 4000);
eq('total do mês soma só quem incide', resumo.totalDividas, 1500 + 250 + 100);
eq('saldo = renda - total', resumo.saldo, 4000 - 1850);
eq('dívidas do mês exclui a pontual de setembro',
  resumo.dividasDoMes.map((x) => x.nome).sort(),
  ['Aluguel', 'Notebook', 'Última']);
eq('quebra por tipo: recorrente', resumo.porTipo.recorrente, { total: 1500, quantidade: 1 });
eq('quebra por tipo: parcelada', resumo.porTipo.parcelada, { total: 350, quantidade: 2 });
eq('quebra por tipo: pontual', resumo.porTipo.pontual, { total: 0, quantidade: 0 });

const negativo = calcularResumo([recorrente], '2026-08', 1000);
eq('saldo negativo quando falta', negativo.saldo, -500);

const semRenda = calcularResumo([], '2026-08', 0);
eq('mês vazio -> total zero', semRenda.totalDividas, 0);
eq('mês vazio -> saldo zero', semRenda.saldo, 0);

eq('rótulo do mês em português', rotuloMes('2026-08'), 'Agosto de 2026');

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
