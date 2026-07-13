# ARENA SL TREINAMENTOS - NR 23 Brigada Industrial

Aplicação web para aulas de Brigada Industrial com jogo principal de NR 23, módulo extra de Primeiros Socorros, painel do instrutor, entrada das equipes por celular, QR Code, ranking online e persistência por Netlify Functions + Netlify Blobs.

## Arquitetura

- `index.html`: portal dos módulos.
- `instrutor.html`: central do instrutor OLDENIR.
- `equipe.html`: acesso das equipes por QR Code ou link.
- `assets/js/activities/`: atividades jogáveis por toque.
- `data/`: conteúdo estruturado baseado em `docs/Brigada Industrial correta.pdf`.
- `netlify/functions/api.js`: API central, validação, tokens, idempotência, ranking e persistência.
- `tests/`: testes com Node test runner.

## Requisitos

- Node.js 20 ou superior.
- Netlify CLI para testar Functions localmente.
- Conta/projeto Netlify para publicar com Netlify Blobs.

## Instalação

```bash
npm install
npm test
```

## Teste local correto

```bash
netlify dev
```

Acesse a URL exibida pelo Netlify CLI, normalmente `http://localhost:8888`.

`python -m http.server` não testa as Netlify Functions, portanto não valida criação de sessão, ranking, pontuação, QR com backend ou persistência.

Durante `netlify dev`, a Function usa um arquivo local em `.netlify/arena-sl-dev-store.json` para facilitar testes sem vincular um projeto. No deploy Netlify, a persistência usa Netlify Blobs.

## Publicação

1. Envie o repositório para o Netlify.
2. Use `netlify.toml` já incluído.
3. A pasta publicada é a raiz (`.`).
4. As rotas `/api/*` são redirecionadas para a Function central.
5. O arquivo `index.html` fica na raiz publicada, evitando 404 no deploy manual.

## Fluxo do instrutor

1. Abra `/instrutor.html`.
2. Crie uma sessão informando a turma.
3. Compartilhe o QR Code ou copie o link público.
4. Aguarde as equipes entrarem.
5. Escolha o módulo e a atividade.
6. Use `Liberar atividade`, `Pausar`, `Encerrar atividade` e `Revelar dica`.
7. Acompanhe ranking, pódio, progresso e histórico.

O token administrativo fica salvo apenas no navegador do instrutor que criou a sessão.

## Fluxo da equipe

1. Escaneie o QR Code ou abra `/equipe.html?session=CODIGO`.
2. Informe nome da equipe, integrantes opcionais e cor/símbolo.
3. Aguarde a liberação da atividade.
4. Responda pelo celular.
5. Se a página atualizar, o token local identifica a equipe novamente; pontuação e progresso ficam no backend.

## Ranking

Há rankings separados para:

- Brigada Industrial.
- Primeiros Socorros.

Critérios de desempate:

1. Maior pontuação.
2. Maior número de acertos.
3. Menor número de erros.
4. Menor tempo total de resposta.
5. Equipe que pontuou primeiro.

O cliente nunca envia pontos finais. Ele envia respostas ou conquistas; a API valida, calcula a pontuação e grava o histórico.

## Recuperação de sessão

Use o código da sessão em `/instrutor.html`. A reabertura administrativa exige que o token do instrutor esteja salvo no mesmo navegador. As equipes podem reabrir pelo link da sessão enquanto mantiverem o token local.

## Solução de problemas

- `404` em `/api/*`: execute com `netlify dev` ou publique no Netlify.
- QR Code não aparece: o link continua visível para copiar; verifique acesso à CDN do gerador de QR.
- Equipe não pontua: confirme se a atividade está liberada e a sessão não foi encerrada.
- Nome duplicado: use outro nome de equipe na mesma sessão.
- LocalStorage apagado: a equipe precisa entrar novamente; a pontuação antiga permanece no backend.

## Checklist para aula

- Criar sessão.
- Testar QR Code com um celular.
- Conferir status `API online`.
- Cadastrar equipes.
- Liberar uma atividade curta para teste.
- Confirmar ranking ao vivo.
- Alternar para Primeiros Socorros se for usar o jogo extra.
- Encerrar ou apagar a sessão ao final, conforme necessidade.
