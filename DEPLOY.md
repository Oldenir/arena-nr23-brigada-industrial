# Deploy - ARENA SL TREINAMENTOS

## Pré-validação

Execute na raiz do projeto:

```bash
npm install
npm test
```

Para validar Functions localmente:

```bash
netlify dev
```

Abra:

- `http://localhost:8888/api/health`
- `http://localhost:8888/self-test`
- `http://localhost:8888/instrutor.html`
- `http://localhost:8888/equipe.html`

## Configuração Netlify

O arquivo `netlify.toml` já define:

- Publish directory: `.`
- Functions directory: `netlify/functions`
- Build command: vazio
- API: `/api/*` para `/.netlify/functions/api/:splat`
- Bloqueio direto de `/data/*`, `/tests/*` e `/netlify/*`

Use Node.js 20 ou superior no ambiente Netlify.

## Deploy manual

1. Faça login no Netlify.
2. Crie ou abra o site.
3. Envie a pasta raiz do projeto.
4. Aguarde o deploy concluir.
5. Abra a URL publicada.
6. Rode `/self-test`.
7. Abra `/instrutor.html`.
8. Crie uma sessão de teste.
9. Entre com um celular pelo QR Code.
10. Apague a sessão de teste.

## Deploy via Git

1. Envie o repositório para o provedor Git.
2. No Netlify, escolha "Import from Git".
3. Selecione o repositório.
4. Confirme que o Netlify leu `netlify.toml`.
5. Publique.
6. Rode `/self-test` no domínio final.

## Netlify Blobs

Em produção, a Function usa `@netlify/blobs` no store `arena-sl-sessions`. Não é preciso expor token no frontend. Os tokens de instrutor e equipe ficam em hash no backend; o valor original fica somente no navegador que criou/entrou na sessão.

Durante `netlify dev`, a persistência usa um arquivo temporário fora da pasta do projeto como fallback local. Esse arquivo não deve ser publicado.

## Teste pós-deploy

1. `/api/health` deve responder `online`.
2. `/self-test` deve terminar como `APROVADO`.
3. `/instrutor.html` deve criar sessão.
4. `/equipe.html?session=CODIGO` deve permitir entrada de equipe.
5. Uma atividade liberada deve pontuar e aparecer no ranking.
6. Atualizar a página da equipe deve recuperar a equipe no mesmo celular.

## Erros comuns

- `404` em `/api/health`: Functions não foram publicadas ou redirecionamento não foi aplicado.
- `404` em `/instrutor.html`: raiz errada no publish directory.
- Self-test cria sessão mas não apaga: conferir token administrativo no log da Function e tentar apagar pela central no mesmo navegador.
- Ranking não persiste após atualizar: verificar Netlify Blobs e logs da Function.
