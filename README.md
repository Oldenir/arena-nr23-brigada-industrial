# ARENA SL TREINAMENTOS - NR 23 Brigada Industrial

Aplicação web para aulas presenciais de Brigada Industrial, com módulo principal de NR 23, módulo extra de Primeiros Socorros, painel do instrutor, entrada das equipes por QR Code/celular, ranking online e persistência em Netlify Functions + Netlify Blobs.

## O que está incluído

- `index.html`: portal de entrada.
- `instrutor.html`: central do instrutor OLDENIR.
- `equipe.html`: tela das equipes.
- `self-test.html`: diagnóstico rápido antes da aula.
- `assets/js/activities/`: jogos por toque.
- `data/`: conteúdo estruturado usado pela API e pelos catálogos públicos.
- `netlify/functions/api.js`: API central com tokens, idempotência, ranking, histórico e persistência.
- `tests/`: testes automatizados do conteúdo, pontuação e API.

## Requisitos

- Node.js 20 ou superior.
- Netlify CLI para testar as Functions localmente.
- Projeto Netlify para publicar com Netlify Blobs.

Instalação:

```bash
npm install
npm test
```

Se preferir pnpm:

```bash
pnpm install
pnpm test
pnpm run check
```

## Teste local correto

Use Netlify Dev:

```bash
netlify dev
```

Abra a URL exibida no terminal, normalmente `http://localhost:8888`.

Não use `python -m http.server` para validar a versão de produção. Ele abre os arquivos estáticos, mas não executa `/api/*`, criação de sessão, pontuação, ranking, QR com backend nem persistência.

Durante `netlify dev`, a Function grava dados temporários no diretório temporário do sistema para não disparar reload da CLI. No deploy Netlify, a mesma API usa Netlify Blobs.

## Rotas úteis

- `/`: portal.
- `/instrutor.html` ou `/instrutor`: central do instrutor.
- `/equipe.html` ou `/equipe`: entrada das equipes.
- `/self-test.html` ou `/self-test`: diagnóstico rápido.
- `/api/health`: saúde da API.

## Publicação no Netlify

O projeto já contém `netlify.toml`.

- Build command: vazio.
- Publish directory: `.`.
- Functions directory: `netlify/functions`.
- Node: 20+.

As rotas `/api/*` são redirecionadas para `/.netlify/functions/api/*`. As pastas internas `data`, `tests` e `netlify` são bloqueadas por redirecionamento para evitar exposição direta.

## Deploy manual

1. Rode `npm install` e `npm test`.
2. Rode `netlify dev` e valide `/self-test`.
3. Faça login no Netlify.
4. Publique a pasta raiz do projeto.
5. Abra a URL publicada.
6. Rode `/self-test` no domínio publicado.

## Deploy via Git

1. Envie o repositório para GitHub/GitLab/Bitbucket.
2. Crie um site no Netlify conectado ao repositório.
3. Confirme as configurações do `netlify.toml`.
4. Faça deploy.
5. Abra `/self-test`.
6. Abra `/instrutor.html`, crie uma sessão e teste com um celular.

## Fluxo do instrutor

1. Abra `/instrutor.html`.
2. Crie uma sessão informando o nome da turma.
3. Compartilhe o QR Code ou copie o link público.
4. Aguarde as equipes entrarem.
5. Escolha o módulo.
6. Selecione e libere uma atividade.
7. Acompanhe ranking, pódio, progresso e histórico.
8. Use pausa, dica, encerramento de atividade, bônus e penalidade quando necessário.
9. Encerre ou apague a sessão ao final da aula.

O token administrativo fica salvo somente no navegador que criou a sessão. Se outro navegador abrir o mesmo código, ele não terá permissão administrativa sem esse token.

## Fluxo da equipe

1. Escaneie o QR Code ou abra `/equipe.html?session=CODIGO`.
2. Informe nome da equipe, integrantes opcionais, cor e símbolo.
3. Aguarde o instrutor liberar uma atividade.
4. Responda pelo celular.
5. Se a página atualizar, o token local recupera a equipe no mesmo aparelho.

## Teste com dois celulares

1. No notebook, abra `/instrutor.html` e crie a sessão.
2. No celular A, entre pelo QR Code e cadastre a Equipe A.
3. No celular B, entre pelo mesmo QR Code e cadastre a Equipe B.
4. Libere `Caça-palavras` ou `Cruzadinha`.
5. Peça para os dois celulares tentarem o mesmo item.
6. Confira se só uma equipe conquista os pontos.
7. Libere uma atividade de pergunta.
8. Confira se o ranking e o histórico mudam sem recarregar o painel.

## Sessão, recuperação e reset

- Criar sessão: feito no painel do instrutor.
- Reabrir sessão: informe o código em `/instrutor.html`; o token precisa estar salvo no mesmo navegador.
- Recuperar equipe: abra novamente o link da sessão no mesmo celular.
- Zerar ranking do módulo: remove pontuação e tentativas apenas do módulo ativo.
- Reiniciar competição: mantém equipes cadastradas e limpa pontuação/tentativas.
- Encerrar sessão: bloqueia novas pontuações.
- Apagar sessão: remove a sessão do backend.

## Persistência

Em produção, a persistência usa Netlify Blobs com consistência forte. A API grava somente dados necessários para sessão, equipes, ranking, histórico, tentativas, conquistas e tokens com hash. O cliente nunca envia a pontuação final; ele envia respostas ou conquistas, e a API valida antes de pontuar.

## Ranking

Há rankings separados para Brigada Industrial e Primeiros Socorros.

Critérios de desempate:

1. Maior pontuação.
2. Maior número de acertos.
3. Menor número de erros.
4. Menor tempo total de resposta.
5. Equipe que pontuou primeiro.

## Solução de problemas

- `404` em `/api/*`: use `netlify dev` ou publique no Netlify; servidor estático simples não executa Functions.
- `404` em página publicada: confirme que o diretório publicado é a raiz (`.`) e que `index.html` está na raiz.
- API offline no painel: abra `/api/health`; se falhar, verifique Netlify Functions e logs do deploy.
- Self-test com erro de catálogo: publique novamente a raiz completa, incluindo `data`, `assets` e `netlify/functions`.
- QR Code não aparece: copie o link público exibido; verifique acesso à CDN do gerador de QR.
- Equipe não pontua: confirme sessão aberta, atividade liberada e módulo correto.
- Nome duplicado: use outro nome de equipe na mesma sessão.
- Token perdido: reentrar cria uma nova identificação local; a pontuação antiga permanece no ranking.

## Checklist de 15 minutos antes da aula

1. Abrir a URL publicada.
2. Rodar `/self-test`.
3. Abrir `/instrutor.html`.
4. Criar uma sessão de teste.
5. Escanear o QR Code com um celular.
6. Cadastrar uma equipe.
7. Liberar uma atividade curta.
8. Responder pelo celular.
9. Conferir ranking, pódio e histórico.
10. Atualizar a página do celular e confirmar recuperação da equipe.
11. Testar bônus ou penalidade manual.
12. Apagar a sessão de teste.
