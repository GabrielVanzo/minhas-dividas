# Quitaê

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
      resumo.tsx       Resumo do mês — renda, total, saldo, reservado
      reservas.tsx     Guardadinhos
      config.tsx       Nome do usuário, categorias, tema
    divida/nova.tsx    cadastro
    divida/[id].tsx    edição
  components/          UI reutilizável (cards, formulário, controles)
  constants/theme.ts   paleta em JS, espelho do tailwind.config.js
  data/                ÚNICA camada que conhece SQLite
    db.ts              conexão + migrações versionadas
    types.ts           tipos do domínio persistido
    *Repository.ts     CRUD por entidade (dívidas, reservas, renda,
                       categorias, preferências)
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

**reservas** — `nome`, `valor`, `finalidade` (opcional). O total aparece no
Resumo como informação e **não** é descontado do saldo — dinheiro guardado não
é dívida paga.

**renda_mensal** — uma linha por `mes_referencia` (`YYYY-MM`), garantido por índice único.

**categorias** — lista gerenciável em Ajustes, semeada na migração 2 com seis
categorias comuns. O formulário de dívida escolhe entre elas em vez de texto
livre. Excluir uma categoria **desassocia** as dívidas que a usavam; nada é
apagado junto.

**preferencias** — pares chave/valor por workspace (`nome_usuario`, `tema`).

## Ícones e logo

Os ícones são gerados a partir de `assets/logo/quitae-master-1024.png` (extraído
do SVG original, que embute a arte em raster — não é vetor de verdade, por isso
o PNG de 1024 é a melhor fonte disponível).

- `assets/images/icon.png` — arte cheia, fundo `#161A23`
- `assets/images/android-icon-foreground.png` — só a marca, dentro da zona
  segura do ícone adaptativo; o fundo vem de `adaptiveIcon.backgroundColor`
- `assets/images/android-icon-monochrome.png` — silhueta para o tema do Android 13+
- `assets/images/splash-icon.png` e `logo-marca.png` — a marca sem fundo

Como o `android/` é versionado e não passa por `prebuild`, os arquivos em
`android/app/src/main/res/mipmap-*/` foram gerados junto e precisam ser
regerados se o logo mudar.

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

O build é **100% local**. Não usa conta EAS, paga ou gratuita.

### Pré-requisitos (uma vez por máquina)

O Gradle do React Native **não roda em Java 26**. Este projeto usa Temurin 21:

```bash
mkdir -p ~/.jdks && cd ~/.jdks
curl -L -o t21.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/mac/aarch64/jdk/hotspot/normal/eclipse"
tar xzf t21.tar.gz && rm t21.tar.gz
```

Também é preciso o Android SDK em `~/Library/Android/sdk`.

> **O caminho do projeto não pode ter acento.** A pasta se chama
> `Minhas-Dividas`, sem o `í`, justamente por isso — o Gradle e o CMake
> tropeçam em caracteres não-ASCII no caminho.

### Gerar um APK novo

```bash
cd android
JAVA_HOME=~/.jdks/jdk-21.0.12.1+1/Contents/Home \
ANDROID_HOME=~/Library/Android/sdk \
./gradlew assembleRelease
```

O APK sai em:

```
android/app/build/outputs/apk/release/app-release.apk
```

Ele sai com **~44 MB** porque é compilado só para `arm64-v8a` — a arquitetura de
qualquer Android lançado nos últimos anos. Incluir também `armeabi-v7a` e as
duas `x86` (que só servem para emulador) levava o arquivo para 114 MB, tamanho
ruim de mandar por WhatsApp. A lista fica em `reactNativeArchitectures`, no
`android/gradle.properties`.

### Antes de gerar uma versão nova: suba o `versionCode`

Em `android/app/build.gradle`:

```gradle
versionCode 1        // incremente a cada APK que você for distribuir
versionName "1.0.0"  // o que aparece para o usuário
```

O Android usa o `versionCode` para decidir o que é atualização. Mandando dois
APKs diferentes com o mesmo número, o aparelho pode recusar a instalação por
cima — e aí só resta desinstalar, o que **apaga todas as dívidas e reservas**.
O `version` do `app.json` não controla isso: como o `android/` é versionado e
não regenerado por `prebuild`, quem manda é o `build.gradle`.

### Por que o pacote ainda se chama `minhasdividas`

O app se chama **Quitaê**, mas o `applicationId` continua
`com.gabrielsantos.minhasdividas` e o banco continua `minhas-dividas.db`.
Isso é de propósito: para o Android, o `applicationId` **é** a identidade do
app. Trocá-lo faria o aparelho tratar o Quitaê como um app novo — sem
atualização por cima, e a versão antiga só sairia desinstalando, o que
**apaga todas as dívidas e reservas**. O mesmo vale para o nome do arquivo do
banco: renomeá-lo faria o app abrir um banco vazio.

Só o nome exibido mudou (`app_name`, `rootProject.name` e o `name` do
`app.json`). Se um dia o app for para a Play Store, aí sim vale escolher um
`applicationId` definitivo — mas antes de existir base instalada.

### Instalar no celular

Com o aparelho conectado por USB e depuração ativada:

```bash
~/Library/Android/sdk/platform-tools/adb install -r \
  android/app/build/outputs/apk/release/app-release.apk
```

O `-r` atualiza por cima, preservando os dados. Para os outros celulares, basta
mandar o arquivo `.apk` por WhatsApp/Drive e abrir no aparelho (é preciso
permitir "instalar de fontes desconhecidas").

### Assinatura — leia antes de perder o arquivo

O APK é assinado com uma chave própria, não com a de debug. Dois arquivos
sustentam isso e **nenhum dos dois está no git**:

- `android/app/release.keystore`
- `android/keystore.properties`

**Faça backup dos dois.** Se você perder qualquer um, o Android passa a tratar
os APKs novos como um app diferente: não dá para atualizar por cima, só
desinstalar e reinstalar — e desinstalar **apaga todas as dívidas e reservas**.

Se os arquivos não existirem, o build não quebra: ele cai na chave de debug
(veja `hasReleaseKeystore` em `android/app/build.gradle`).

### Por que `android/` está versionado

Normalmente essa pasta é descartável e regenerada por `expo prebuild`. Aqui ela
é versionada porque carrega a configuração de assinatura. A consequência: rodar
`npx expo prebuild --clean` **sobrescreve** `android/app/build.gradle` e apaga o
bloco de assinatura. Se precisar fazer isso (ao subir de SDK, por exemplo),
restaure o bloco com `git diff` depois.
