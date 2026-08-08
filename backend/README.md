# ☁️ Backend serverless (AWS) — app Finanças

Infraestrutura como código (AWS SAM) que provê **tudo** que o app precisa na nuvem:

| Camada | Serviço AWS |
|--------|-------------|
| Login / cadastro (multiusuário) | **Amazon Cognito** (User Pool) |
| API REST | **API Gateway (HTTP API)** + **AWS Lambda** (Node 20) |
| Banco de dados | **DynamoDB** (isolado por usuário: `userId` + `txId`) |
| Hospedagem do app | **S3** + **CloudFront** (HTTPS, CDN) |

O frontend detecta a nuvem automaticamente: enquanto `financas/config.js` estiver
vazio, o app roda em **modo local** (localStorage, sem login); depois do deploy,
o script preenche o `config.js` e o app passa a usar **login + API + DynamoDB**.

---

## Pré-requisitos

- **AWS CLI** configurado (`aws configure`) com credenciais da sua conta.
- **AWS SAM CLI** (`brew install aws-sam-cli` ou veja a doc oficial).
- Permissões para criar Cognito, Lambda, API Gateway, DynamoDB, S3 e CloudFront.

## Deploy em 2 comandos

```bash
cd backend

# 1) Infraestrutura (Cognito + API + DynamoDB + S3 + CloudFront)
./deploy.sh                 # ou: ./deploy.sh minha-stack

# 2) Publica o app, gera o config.js e invalida o cache do CloudFront
./deploy-frontend.sh        # use o mesmo nome de stack do passo 1
```

Ao final, o endereço público do app (CloudFront) é exibido no terminal.
A região padrão é `us-east-1`; para outra, use `AWS_REGION=sa-east-1 ./deploy.sh`.

> **Dica (custo):** tudo é *pay-per-use*. Cognito tem camada gratuita generosa,
> DynamoDB em modo *on-demand* e Lambda/API Gateway cobram por requisição.
> Para um uso pessoal/pequeno, o custo tende a ficar próximo de zero.

## Como funciona a segurança

- O usuário se cadastra/loga via Cognito e recebe um **JWT (idToken)**.
- O app envia esse token em `Authorization: Bearer <idToken>` nas chamadas.
- O **JWT authorizer** do API Gateway valida o token (emissor = seu User Pool,
  audiência = seu App Client) antes de chegar na Lambda.
- A Lambda usa o `sub` (id do usuário) do token como **partição** no DynamoDB,
  garantindo que cada pessoa só enxergue os próprios lançamentos.

## Endpoints da API

| Método | Rota | Ação |
|--------|------|------|
| GET | `/transactions` | lista os lançamentos do usuário |
| POST | `/transactions` | cria um lançamento |
| PUT | `/transactions/{id}` | atualiza um lançamento |
| DELETE | `/transactions/{id}` | remove um lançamento |

Corpo (POST/PUT):
```json
{ "id": "abc123", "type": "expense", "desc": "Mercado",
  "amount": 120.5, "date": "2026-08-08", "category": "alimentacao" }
```

## Depois do primeiro deploy (recomendado)

1. **Restringir o CORS** à URL do CloudFront (em vez de `*`):
   ```bash
   ./deploy.sh minha-stack   # após editar o parâmetro, ou:
   sam deploy --parameter-overrides AllowedOrigin=https://SEU_ID.cloudfront.net
   ```
2. (Opcional) **Domínio próprio** no CloudFront + certificado no ACM.
3. Para o **app Android (Play Store / sideload)**, veja
   [`../financas/GUIA-PLAYSTORE.md`](../financas/GUIA-PLAYSTORE.md). Com hospedagem
   própria (CloudFront/seu domínio), o `assetlinks.json` já é publicado na raiz
   pelo `deploy-frontend.sh`.

## Estrutura

```
backend/
├── template.yaml          # infraestrutura (SAM/CloudFormation)
├── src/
│   ├── handler.mjs        # Lambda (roteia GET/POST/PUT/DELETE)
│   └── package.json       # usa o AWS SDK v3 já incluído no runtime
├── deploy.sh              # deploy da infraestrutura
├── deploy-frontend.sh     # publica o app + gera config.js
└── README.md
```

## Remover tudo

```bash
sam delete --stack-name financas
```
(Se o bucket do site tiver arquivos, esvazie-o antes: `aws s3 rm s3://BUCKET --recursive`.)
