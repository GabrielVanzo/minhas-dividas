# Handover — Quitaê

Documento de contexto para agentes/pessoas que pegarem o projeto daqui.
Responde ao prompt original de 4 fases e registra o que mudou no caminho.

**Estado:** as 4 fases estão concluídas. O app roda, o APK é gerado localmente e
está instalado num aparelho real. `main` está atualizada (commit `b437e1c`).

> Leia também o `README.md` (arquitetura, modelo de dados, como gerar o APK) e o
> `AGENTS.md` (regras curtas do projeto). Este arquivo é o histórico e o "porquê".

---

## O que é o app

Controle pessoal de dívidas, **100% offline**. Sem backend, sem conta, sem sync.
Tudo em SQLite no aparelho. Distribuição por APK entre poucos celulares
(o autor, esposa e mãe).

O app **se chama Quitaê** — o nome "Minhas Dívidas" do prompt original era
provisório. A pasta do repositório continua `Minhas-Dividas`, **sem acento e sem
renomear de propósito**: Gradle e CMake quebram com caracteres não-ASCII no
caminho do projeto.

---

## Status por fase do prompt original

### Fase 1 — Setup, dados, CRUD de dívidas, lista ✅

Feito. Expo SDK 57 + expo-router + NativeWind (dark) + expo-sqlite.
Tabelas `dividas`, `reservas`, `renda_mensal` criadas na migração 1, todas já com
`workspace_id` e `owner_id` como o prompt pediu.

**Desvio:** o prompt dava a opção "drizzle-orm ou queries diretas". Optei por
**queries diretas**. Motivo: o schema é pequeno e estável, e drizzle traria uma
camada de build/config a mais num projeto cujo requisito declarado era
"simplicidade de configuração".

### Fase 2 — Filtros, ordenação, renda mensal, cálculo ✅

Feito. Ordenação por vencimento/valor/nome/tipo, filtro por tipo, tela de Resumo
com renda do mês e saldo (sobra/falta) com destaque visual quando negativo.

A regra de incidência (recorrente todo mês; parcelada enquanto há parcelas;
pontual só no mês do vencimento) vive em `src/domain/mes.ts`, pura e testável.

### Fase 3 — Reservas e polimento ✅

Feito. Reservas com CRUD e total; o total aparece no Resumo **como informação e
não é descontado do saldo** (exatamente como o prompt pediu). Ícones via
`lucide-react-native`, empty states desenhados, tela de Ajustes com nome do
usuário, categorias e tema.

**Além do pedido:** categorias viraram uma **tabela gerenciável** (migração 2),
semeada com 6 categorias comuns, em vez de texto livre. Excluir uma categoria
desassocia as dívidas que a usavam — nada é apagado junto.

### Fase 4 — APK ✅

Feito, **100% local, sem conta EAS** (nem gratuita).

**Desvio importante:** o prompt citava `eas.json` / `eas build --local`. Não foi
usado EAS de forma alguma. O caminho é `expo prebuild` (já executado) +
`./gradlew assembleRelease`, e **a pasta `android/` está versionada no git**.

Isso não é o padrão do Expo e tem uma consequência que precisa ficar clara:

> Rodar `npx expo prebuild --clean` **sobrescreve** `android/app/build.gradle` e
> apaga o bloco de assinatura. Se precisar rodar (ao subir de SDK, por exemplo),
> restaure o bloco depois com `git diff`.

Motivo de versionar: a pasta carrega a configuração de assinatura de release, e
o app precisa ser atualizável por cima nos celulares da família.

---

## Decisões que valem conhecer antes de mexer

### Identidade do app — congelada

- `applicationId`: `com.gabrielsantos.quitae`
- banco: `quitae.db`

Para o Android, o `applicationId` **é** a identidade do app. Trocá-lo faz o
aparelho enxergar um app novo: não atualiza por cima, e remover o antigo apaga
todos os dados. Renomear o arquivo do banco tem efeito equivalente (o app abre
um banco vazio).

Os dois foram renomeados de `minhasdividas` para `quitae` **de propósito no
momento em que o banco foi zerado** — antes de existir base instalada. A partir
do momento em que o APK circular entre os celulares, considere ambos congelados.

### Migrações são append-only

`src/data/db.ts` aplica migrações em ordem e usa `PRAGMA user_version`. **Nunca
edite uma migração já instalada em algum celular** — adicione uma nova no fim do
array.

### Telas não conhecem SQLite

Todo acesso a dados passa pelos repositórios em `src/data/`. É isso que mantém
aberta a porta de trocar SQLite por API sem reescrever UI. Regra de negócio fica
em `src/domain/`, pura, rodando em Node.

### NativeWind 4 + Tailwind 3.4

Não atualize o Tailwind para 4.x sem migrar o NativeWind para 5 junto — são
incompatíveis.

---

## Armadilhas já encontradas (não repita)

**Cache do autolinking guarda o nome do pacote.**
Ao renomear o `applicationId`, o build falhou duas vezes seguidas. O autolinking
grava o pacote em `android/build/generated/autolinking/autolinking.json` e
regerava `ReactNativeApplicationEntryPoint.java` apontando para o pacote antigo,
mesmo com o `namespace` já trocado. Foi preciso apagar **os dois** caches:

```bash
rm -rf android/build/generated/autolinking android/app/build/generated/autolinking
```

**`| tail` engole o código de saída do Gradle.**
`./gradlew ... | tail -12` retorna o status do `tail`, não do Gradle — um
`BUILD FAILED` chega como "exit 0". Capture o log inteiro num arquivo e cheque o
`$?` de verdade.

**O bundle Hermes guarda strings acentuadas em UTF-16.**
`grep` ASCII no `index.android.bundle` não acha `"Quitaê"` nem `"Total em
aberto"` (por causa do `·`), mas acha `quitae.db`. Para conferir se um APK tem
determinado texto, busque também em `utf-16-le`.

**Splash do Android 12+ é mascarado em círculo.**
A arte do splash precisa de folga. Numa primeira tentativa a marca ocupava 92%
do drawable e o sistema cortou as faíscas. O correto: drawable de 288dp com a
marca em 120dp (o `imageWidth` do `app.json`), ou seja ~42%.

**Ícones nativos não são regerados sozinhos.**
Como o `android/` é versionado e o `prebuild` não roda, os arquivos em
`android/app/src/main/res/mipmap-*/` e `drawable-*/` foram gerados à mão a partir
de `assets/logo/quitae-master-1024.png`. Se o logo mudar, precisam ser regerados.

**O `versionCode` está em 1 e é manual.**
Está fixo em `android/app/build.gradle`. O `version` do `app.json` **não**
controla isso. Suba o número a cada APK distribuído — mandando dois APKs
diferentes com o mesmo `versionCode`, alguns aparelhos recusam a atualização.

---

## Bugs corrigidos que valem registro

**`parsearValor` errava por 100x.** A função removia todo ponto como separador de
milhar, então `"1500.50"` virava `150050`. Como o teclado decimal do Android
costuma oferecer ponto, dava para gravar R$ 150.050,00 no lugar de R$ 1.500,50 —
silenciosamente, num app de controle financeiro. A regra atual: vírgula é sempre
decimal; havendo só pontos, um ponto com 3 dígitos depois é milhar. Coberto por
17 testes, incluindo ida-e-volta com `formatarValorEditavel`.

**`.gitignore` engolia a chave de debug.** A regra `*.keystore` pegava também
`android/app/debug.keystore`, que precisa ser versionada junto com o `android/`.
Hoje há um `!android/app/debug.keystore` explícito.

**Escopo `owner_id` faltando** em `removerCategoria` e `contarUsos`.

---

## Estado atual e o que ficou de fora

**Verificado em aparelho real** (moto g86 5G): app abre, migrações rodam, banco
nasce zerado, renda com ponto decimal grava certo, dados persistem entre
reinícios, launcher mostra "Quitaê" com o ícone novo.

**Qualidade:** `npx tsc --noEmit`, `npm run lint` e `npm run verificar`
(59 asserções de domínio, rodando em Node via tsx) — todos limpos.

**APK:** ~44 MB, só `arm64-v8a`. As outras três arquiteturas
(`armeabi-v7a` e as duas `x86`, de emulador) levavam o arquivo a 114 MB sem
servir a nenhum aparelho real da família.

### Não implementado (fora do escopo do prompt)

- Login, sync, compartilhamento de workspace. O schema já tem
  `workspace_id`/`owner_id` para não travar esse caminho, mas nada além disso.
- Tema claro. A estrutura aceita (`ChavePreferencia` já prevê `tema`), mas só
  existe o escuro.
- iOS. O `bundleIdentifier` está definido, nada foi testado.

### Pendências conhecidas

- **Subir o `versionCode`** antes de distribuir o próximo APK.
- **Backup de `android/app/release.keystore` e `android/keystore.properties`.**
  Nenhum dos dois está no git (correto). Perder qualquer um impede atualizar o
  app por cima — só desinstalando, o que apaga tudo.
- Dependências transitivas do template que sobraram no `package.json`
  (`react-dom`, `react-native-web`, `expo-font`, `expo-linking`...). São exigidas
  pelo expo-router ou pelo alvo web; foram mantidas de propósito.
