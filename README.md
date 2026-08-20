# Minhas Dívidas

App de controle pessoal de dívidas, **100% offline**. Sem backend, sem conta,
sem sync — tudo mora no SQLite do próprio aparelho.

Feito para instalar em poucos celulares via APK, não para a loja.

## Stack

| Peça | Escolha | Por quê |
| --- | --- | --- |
| Runtime | Expo SDK 57 (RN 0.86) | build local de APK sem conta paga |
| Navegação | expo-router | roteamento por arquivo, já vem no template |
| Persistência | expo-sqlite | filtros/ordenação/somas sem reinventar roda |
| Estilo | NativeWind 4 + Tailwind 3.4 | dark theme rápido, sem CSS-in-JS verboso |
| Datas | dayjs | leve, API previsível |
| Ícones | lucide-react-native | traço consistente, combina com o tema |

> NativeWind 4 exige **Tailwind 3.4** — o Tailwind 4 só funciona no NativeWind 5,
> que ainda é preview. Não atualize o `tailwindcss` sem trocar o NativeWind junto.

## Rodando em desenvolvimento

```bash
npm install
npm start          # abre o Metro; use o Expo Go ou um dev build
npm run android    # abre direto no emulador/dispositivo Android
```

## Verificando a lógica financeira

As regras de vencimento, status e ordenação têm um script de verificação que roda
em Node puro (sem emulador):

```bash
npm run verificar
```

## Arquitetura

```
src/
  app/                 telas (rotas do expo-router)
    _layout.tsx        stack raiz, tema dark, abertura do banco
    (tabs)/
      _layout.tsx      barra de abas
      index.tsx        Dívidas — lista com filtro e ordenação
      resumo.tsx       Resumo do mês — renda, total, saldo
    divida/nova.tsx    cadastro
    divida/[id].tsx    edição
  components/          UI reutilizável (cards, formulário, controles)
  constants/theme.ts   paleta em JS, espelho do tailwind.config.js
  data/                ÚNICA camada que conhece SQLite
    db.ts              conexão + migrações versionadas
    types.ts           tipos do domínio persistido
    *Repository.ts     CRUD por entidade
  domain/              regras puras, testáveis em Node
    divida.ts          status, vencimento efetivo, ordenação
    mes.ts             incidência mensal e resumo financeiro
    format.ts          moeda e datas em pt-BR
```

**Regra que sustenta o resto:** as telas nunca importam `expo-sqlite`. Elas falam
só com os repositórios em `src/data/`. Trocar o SQLite por uma API remota um dia
significa reescrever esses arquivos e nada mais.

### Multi-perfil no futuro

Todas as tabelas já têm `workspace_id` e `owner_id` (hoje fixos em `local` / `me`).
Não há login, sync nem compartilhamento — mas o schema não vai precisar migrar
quando/se isso existir.

### Migrações

`src/data/db.ts` guarda um array `MIGRATIONS` aplicado em ordem, controlado pelo
`PRAGMA user_version` do SQLite. Para mudar o schema, **adicione uma função nova
no fim do array** — nunca edite uma migração já instalada em algum celular.

## Modelo de dados

**dividas** — `tipo` define quais campos valem:

| tipo | campos usados |
| --- | --- |
| `recorrente` | `dia_vencimento_recorrente` (1–31) |
| `parcelada` | `data_vencimento` (da parcela atual), `parcela_atual`, `parcela_total` |
| `pontual` | `data_vencimento` |

O repositório zera os campos que não pertencem ao tipo escolhido, então não
sobra lixo quando o usuário troca o tipo no formulário.

**reservas** — `nome`, `valor`, `finalidade` (opcional).

**renda_mensal** — uma linha por `mes_referencia` (`YYYY-MM`), garantido por índice único.

## Como o mês é calculado

`src/domain/mes.ts` decide quanto cada dívida pesa num mês (`YYYY-MM`):

| tipo | incide quando |
| --- | --- |
| `recorrente` | todo mês, sempre o mesmo valor |
| `parcelada` | do mês da parcela atual até o da última parcela |
| `pontual` | só no mês da `data_vencimento` |

Dívidas quitadas ou inativas nunca incidem.

**Premissa das parceladas:** parcelas mensais de valor igual. Guardamos o
vencimento da *parcela atual* e derivamos as demais somando meses — o que não
cobre financiamento com parcela variável. Se isso virar necessidade, o lugar de
mexer é `incidenciaNoMes`.

O saldo do mês é `renda − total`. Negativo aparece em vermelho no Resumo, junto
da fatia da renda já comprometida.

## Gerando o APK

_(Fase 4 — a documentar.)_
