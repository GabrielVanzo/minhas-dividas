import dayjs from 'dayjs';
import { Divida, OcorrenciaComDivida, TipoDivida } from '@/data/types';
import { converterParaOcorrencias, ocorrenciasIniciais, vencimentoRecorrenteNoMes } from '@/domain/divida';
import { formatarValorEditavel, parsearValor } from '@/domain/format';
import {
  calcularResumo,
  deslocarMes,
  distanciaEmMeses,
  intervaloNavegavel,
  rotuloMes,
} from '@/domain/mes';
import { descricaoPrazo, ordenarOcorrencias, situacaoOcorrencia } from '@/domain/ocorrencia';
import { dividirEmCentavos, planejarParcelas } from '@/domain/parcelas';
import { BaseRecorrente, ehProjecao, projetarRecorrentes } from '@/domain/projecao';

const HOJE = dayjs('2026-08-20').startOf('day');

function o(p: Partial<OcorrenciaComDivida>): OcorrenciaComDivida {
  return {
    id: p.id ?? p.nome ?? 'x',
    dividaId: p.dividaId ?? 'd1',
    workspaceId: 'local',
    ownerId: 'me',
    dataVencimento: p.dataVencimento ?? '2026-08-20',
    valor: p.valor ?? 100,
    status: p.status ?? 'pendente',
    numeroParcela: p.numeroParcela ?? null,
    totalParcelas: p.totalParcelas ?? null,
    pagoEm: p.pagoEm ?? null,
    nome: p.nome ?? 'x',
    tipo: (p.tipo ?? 'pontual') as TipoDivida,
    categoria: p.categoria ?? null,
  };
}

let falhas = 0;
function eq(rotulo: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(
    `${ok ? 'ok  ' : 'FALHA'} ${rotulo}${ok ? '' : `\n      obtido=${JSON.stringify(obtido)} esperado=${JSON.stringify(esperado)}`}`,
  );
}

// --- divisão em centavos: não pode sobrar nem faltar dinheiro ---
eq('300 em 6x -> parcelas iguais', dividirEmCentavos(300, 6), [50, 50, 50, 50, 50, 50]);
eq('100 em 3x -> última absorve a sobra', dividirEmCentavos(100, 3), [33.33, 33.33, 33.34]);
eq('100 em 3x soma exatamente 100',
  dividirEmCentavos(100, 3).reduce((a, b) => a + b, 0), 100);
eq('0,10 em 3x', dividirEmCentavos(0.1, 3), [0.03, 0.03, 0.04]);
eq('1 em 1x', dividirEmCentavos(1, 1), [1]);

// --- planejamento de parcelas ---
const seis = planejarParcelas('2026-01-15', 6, 300);
eq('6 parcelas geradas', seis.length, 6);
eq('1ª parcela mantém a data', seis[0].data, '2026-01-15');
eq('2ª parcela cai no mês seguinte', seis[1].data, '2026-02-15');
eq('6ª parcela seis meses depois', seis[5].data, '2026-06-15');
eq('numeração vai de 1 a 6', [seis[0].numero, seis[5].numero], [1, 6]);
eq('cada parcela vale 50', seis[0].valor, 50);

const dia31 = planejarParcelas('2026-01-31', 3, 90);
eq('dia 31 clampa em fevereiro', dia31[1].data, '2026-02-28');
eq('dia 31 volta a 31 em março', dia31[2].data, '2026-03-31');

// --- ocorrências iniciais por tipo ---
eq('pontual gera 1 ocorrência',
  ocorrenciasIniciais({ tipo: 'pontual', dataVencimento: '2026-09-10' }, 250, null).length, 1);
eq('pontual usa o valor cheio',
  ocorrenciasIniciais({ tipo: 'pontual', dataVencimento: '2026-09-10' }, 250, null)[0].valor, 250);
eq('parcelada gera N ocorrências',
  ocorrenciasIniciais({ tipo: 'parcelada', dataVencimento: '2026-09-10' }, 300, 6).length, 6);
eq('recorrente não gera nada no cadastro',
  ocorrenciasIniciais({ tipo: 'recorrente', dataVencimento: null }, 0, null).length, 0);

// --- vencimento de recorrente no mês ---
eq('recorrente dia 10 em setembro',
  vencimentoRecorrenteNoMes(
    { tipo: 'recorrente', diaVencimento: 10 } as never, '2026-09'), '2026-09-10');
eq('recorrente dia 31 em fevereiro clampa',
  vencimentoRecorrenteNoMes(
    { tipo: 'recorrente', diaVencimento: 31 } as never, '2026-02'), '2026-02-28');

// --- situação da ocorrência ---
eq('vencida ontem -> atrasada',
  situacaoOcorrencia(o({ dataVencimento: '2026-08-19' }), HOJE), 'atrasada');
eq('vence hoje -> proxima',
  situacaoOcorrencia(o({ dataVencimento: '2026-08-20' }), HOJE), 'proxima');
eq('vence em 7 dias -> proxima',
  situacaoOcorrencia(o({ dataVencimento: '2026-08-27' }), HOJE), 'proxima');
eq('vence em 8 dias -> em dia',
  situacaoOcorrencia(o({ dataVencimento: '2026-08-28' }), HOJE), 'em_dia');
eq('paga vence qualquer prazo',
  situacaoOcorrencia(o({ dataVencimento: '2026-01-01', status: 'paga' }), HOJE), 'paga');

eq('prazo de atrasada', descricaoPrazo(o({ dataVencimento: '2026-08-18' }), HOJE), 'Atrasada há 2 dias');
eq('prazo de hoje', descricaoPrazo(o({ dataVencimento: '2026-08-20' }), HOJE), 'Vence hoje');
eq('prazo de amanhã', descricaoPrazo(o({ dataVencimento: '2026-08-21' }), HOJE), 'Vence amanhã');
eq('prazo de paga mostra a data',
  descricaoPrazo(o({ status: 'paga', pagoEm: '2026-08-15T12:00:00.000Z' }), HOJE),
  'Paga em 15/08');

// --- ordenação ---
const lista = [
  o({ id: 'c', nome: 'Cartão', dataVencimento: '2026-08-25', valor: 300 }),
  o({ id: 'a', nome: 'Aluguel', dataVencimento: '2026-08-05', valor: 1500 }),
  o({ id: 'p', nome: 'Paga', dataVencimento: '2026-08-01', valor: 999, status: 'paga' }),
];
eq('ordena por vencimento, pagas no fim',
  ordenarOcorrencias(lista, 'vencimento').map((x) => x.id), ['a', 'c', 'p']);
eq('ordena por valor, pagas no fim',
  ordenarOcorrencias(lista, 'valor').map((x) => x.id), ['a', 'c', 'p']);
eq('ordena por nome, pagas no fim',
  ordenarOcorrencias(lista, 'nome').map((x) => x.id), ['a', 'c', 'p']);

// --- resumo do mês ---
const doMes = [
  o({ id: '1', dataVencimento: '2026-08-05', valor: 1000, tipo: 'recorrente' }),
  o({ id: '2', dataVencimento: '2026-08-10', valor: 500, tipo: 'parcelada', status: 'paga' }),
  o({ id: '3', dataVencimento: '2026-09-10', valor: 700, tipo: 'pontual' }),
];
const r = calcularResumo(doMes, '2026-08', 4000);
eq('total do mês soma só o mês de referência', r.totalMes, 1500);
eq('já pago', r.pago, 500);
eq('falta pagar', r.aPagar, 1000);
eq('saldo = renda - total do mês', r.saldo, 2500);
eq('ocorrências do mês exclui setembro', r.ocorrenciasDoMes.length, 2);
eq('quebra por tipo: recorrente', r.porTipo.recorrente, { total: 1000, quantidade: 1 });
eq('quebra por tipo: parcelada', r.porTipo.parcelada, { total: 500, quantidade: 1 });
eq('quebra por tipo: pontual (fora do mês)', r.porTipo.pontual, { total: 0, quantidade: 0 });

const vazio = calcularResumo([], '2026-08', 0);
eq('mês vazio -> total zero', vazio.totalMes, 0);
eq('mês vazio -> saldo zero', vazio.saldo, 0);

const negativo = calcularResumo(
  [o({ dataVencimento: '2026-08-05', valor: 1500 })], '2026-08', 1000);
eq('saldo negativo quando falta', negativo.saldo, -500);

// --- conversão do modelo antigo (migração 3) ---
const convPontual = converterParaOcorrencias(
  { tipo: 'pontual', valor: 250, dataVencimento: '2026-09-10',
    diaVencimentoRecorrente: null, parcelaAtual: null, parcelaTotal: null }, '2026-08');
eq('conversão pontual -> 1 ocorrência', convPontual.length, 1);
eq('conversão pontual preserva valor e data',
  [convPontual[0].valor, convPontual[0].data], [250, '2026-09-10']);

const convParc = converterParaOcorrencias(
  { tipo: 'parcelada', valor: 50, dataVencimento: '2026-08-15',
    diaVencimentoRecorrente: null, parcelaAtual: 3, parcelaTotal: 6 }, '2026-08');
eq('conversão parcelada -> 6 ocorrências', convParc.length, 6);
eq('parcelas anteriores à atual ficam pagas',
  convParc.map((x) => x.paga), [true, true, false, false, false, false]);
eq('parcela atual mantém a data original', convParc[2].data, '2026-08-15');
eq('parcela 1 caminha 2 meses para trás', convParc[0].data, '2026-06-15');
eq('parcela 6 caminha 3 meses para frente', convParc[5].data, '2026-11-15');
eq('conversão parcelada preserva o valor da parcela', convParc[0].valor, 50);

const convRec = converterParaOcorrencias(
  { tipo: 'recorrente', valor: 120, dataVencimento: null,
    diaVencimentoRecorrente: 10, parcelaAtual: null, parcelaTotal: null }, '2026-08');
eq('conversão recorrente -> 1 ocorrência no mês corrente', convRec.length, 1);
eq('conversão recorrente usa o dia do vencimento', convRec[0].data, '2026-08-10');
eq('conversão recorrente preserva o valor', convRec[0].valor, 120);

eq('rótulo do mês em português', rotuloMes('2026-08'), 'Agosto de 2026');

// --- navegação entre meses ---
eq('desloca um mês para frente', deslocarMes('2026-08', 1), '2026-09');
eq('desloca virando o ano', deslocarMes('2026-12', 1), '2027-01');
eq('desloca para trás virando o ano', deslocarMes('2026-01', -2), '2025-11');
eq('distância em meses', distanciaEmMeses('2026-08', '2026-11'), 3);
eq('distância negativa para trás', distanciaEmMeses('2026-08', '2026-06'), -2);

eq('sem parceladas, alcança 2 meses atrás e o mês seguinte',
  intervaloNavegavel('2026-08', null), { primeiro: '2026-06', ultimo: '2026-09' });
eq('parcelada em 6x estica o limite para frente',
  intervaloNavegavel('2026-08', '2027-01'), { primeiro: '2026-06', ultimo: '2027-01' });
eq('última parcela no passado não encolhe além do mês seguinte',
  intervaloNavegavel('2026-08', '2026-03'), { primeiro: '2026-06', ultimo: '2026-09' });
eq('limite para trás vira o ano',
  intervaloNavegavel('2026-01', null).primeiro, '2025-11');

// --- projeção de recorrentes em mês futuro ---
function d(p: Partial<Divida>): Divida {
  return {
    id: p.id ?? 'd1',
    workspaceId: 'local',
    ownerId: 'me',
    nome: p.nome ?? 'Luz',
    tipo: 'recorrente',
    categoria: p.categoria ?? null,
    diaVencimento: p.diaVencimento ?? 10,
    dataVencimento: null,
    ativa: true,
    criadoEm: '2026-01-01T00:00:00.000Z',
  };
}

const bases: BaseRecorrente[] = [
  { divida: d({ id: 'luz', nome: 'Luz', diaVencimento: 5 }), ultimoValor: 150 },
  { divida: d({ id: 'aluguel', nome: 'Aluguel', diaVencimento: 10 }), ultimoValor: 1107 },
];

const proj = projetarRecorrentes(bases, '2026-10', []);
eq('projeta uma ocorrência por recorrente', proj.length, 2);
eq('projeção cai no dia do template', proj.map((x) => x.dataVencimento),
  ['2026-10-05', '2026-10-10']);
eq('projeção usa o último valor pago', proj.map((x) => x.valor), [150, 1107]);
eq('projeção nasce pendente', proj.every((x) => x.status === 'pendente'), true);
eq('projeção vem marcada', proj.every((x) => x.projetada === true), true);
eq('id de projeção é reconhecível', proj.every((x) => ehProjecao(x.id)), true);
eq('ids de projeção são únicos no mês', new Set(proj.map((x) => x.id)).size, 2);
eq('mesma dívida em meses diferentes gera ids diferentes',
  projetarRecorrentes(bases, '2026-11', [])[0].id !== proj[0].id, true);

eq('ocorrência real no mês vence a projeção',
  projetarRecorrentes(bases, '2026-10',
    [o({ dividaId: 'luz', dataVencimento: '2026-10-05' })]).map((x) => x.dividaId),
  ['aluguel']);

eq('recorrente sem valor pago projeta zero',
  projetarRecorrentes([{ divida: d({ id: 'nova' }), ultimoValor: 0 }], '2026-10', [])[0].valor, 0);

eq('dia 31 clampa no mês curto',
  projetarRecorrentes([{ divida: d({ id: 'x', diaVencimento: 31 }), ultimoValor: 10 }],
    '2027-02', [])[0].dataVencimento, '2027-02-28');

// resumo continua somando com as projeções dentro
const comProjecao = calcularResumo(
  [...projetarRecorrentes(bases, '2026-10', []),
   o({ id: 'parc', dataVencimento: '2026-10-15', valor: 50, tipo: 'parcelada' })],
  '2026-10', 3000);
eq('total do mês futuro soma projeção + parcela', comProjecao.totalMes, 1307);
eq('mês futuro não tem nada pago', comProjecao.pago, 0);

// --- leitura de valor digitado ---
eq('vírgula decimal', parsearValor('1234,56'), 1234.56);
eq('ponto de milhar + vírgula decimal', parsearValor('1.234,56'), 1234.56);
eq('ponto decimal (teclado sem vírgula)', parsearValor('1234.56'), 1234.56);
eq('ponto decimal com 1 casa', parsearValor('3.7'), 3.7);
eq('ponto de milhar sozinho', parsearValor('1.500'), 1500);
eq('milhar múltiplo', parsearValor('1.234.567'), 1234567);
eq('dez mil com centavos', parsearValor('10.000,00'), 10000);
eq('inteiro puro', parsearValor('1500'), 1500);
eq('centavos só', parsearValor('0,50'), 0.5);
eq('texto vazio -> 0', parsearValor(''), 0);
eq('lixo -> 0', parsearValor('abc'), 0);
eq('com símbolo de moeda', parsearValor('R$ 2.500,90'), 2500.9);

for (const valor of [1234.56, 1500, 0.5, 10000, 999999.99]) {
  eq(`ida e volta ${valor}`, parsearValor(formatarValorEditavel(valor)), valor);
}

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
