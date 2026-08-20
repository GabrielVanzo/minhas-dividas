# Minhas Dívidas — contexto para agentes

App Expo SDK 57 offline-first. Leia o `README.md` para arquitetura e modelo de dados.

## Regras do projeto

- **Telas não importam `expo-sqlite`.** Todo acesso a dados passa pelos
  repositórios em `src/data/`. Isso é o que mantém aberta a porta de trocar
  SQLite por API sem reescrever UI.
- **Regras de negócio ficam em `src/domain/`**, puras e testáveis em Node.
  Depois de mexer nelas, rode `npm run verificar`.
- **Migrações são append-only** em `src/data/db.ts`. Nunca edite uma existente.
- **NativeWind 4 + Tailwind 3.4.** Não atualize o Tailwind para 4.x sem migrar
  o NativeWind para 5 junto — são incompatíveis.
- Nomes de domínio (tipos, funções, campos) em **português**; APIs de terceiros
  ficam como são.
- Bottom sheets usam `FolhaModal`; o FAB usa `BotaoFlutuante`. Não recrie
  nenhum dos dois inline.

## Expo mudou

Consulte os docs versionados em https://docs.expo.dev/versions/v57.0.0/ antes de
usar qualquer API do SDK — várias assinaturas mudaram em relação a versões antigas.
