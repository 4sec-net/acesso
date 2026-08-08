# 🤖 Deploy automático via GitHub Actions (OIDC)

O workflow [`.github/workflows/deploy-financas.yml`](../.github/workflows/deploy-financas.yml)
faz o deploy do app na AWS a cada push em `financas/**` ou `backend/**` — **sem
guardar chaves da AWS no GitHub**. Ele usa **OIDC**: o GitHub Actions assume um
papel (IAM Role) temporário na sua conta.

Configuração é **uma vez só**. Enquanto a variável `AWS_ROLE_ARN` não existir, o
workflow não faz nada (trava de segurança).

---

## Passo 1 — Provedor OIDC do GitHub na sua conta AWS

(Se já existir um provedor para `token.actions.githubusercontent.com`, pule.)

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

## Passo 2 — Papel (IAM Role) que o GitHub vai assumir

Descubra o ID da conta e crie a política de confiança limitada a este repositório:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

cat > trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "repo:4sec-net/acesso:*" }
    }
  }]
}
EOF

aws iam create-role \
  --role-name financas-github-deploy \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text
```

Guarde o **ARN** do papel retornado.

## Passo 3 — Permissões do papel

O deploy cria/atualiza CloudFormation, Cognito, Lambda, API Gateway, DynamoDB,
S3, CloudFront e o papel de execução da Lambda. Para simplificar o começo, use
uma política ampla e **restrinja depois**:

```bash
aws iam attach-role-policy \
  --role-name financas-github-deploy \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

> Para escopo mínimo, troque por uma política com acesso a:
> `cloudformation, s3, cloudfront, cognito-idp, lambda, dynamodb, apigateway,
> logs, acm:Describe*/List*` e `iam` (Create/Delete/Get/Pass Role e Attach/Detach
> Policy) restrito aos recursos da stack. Posso gerar essa política se quiser.

## Passo 4 — Variáveis no repositório GitHub

Em **Settings → Secrets and variables → Actions → aba _Variables_**, crie:

| Nome | Valor |
|------|-------|
| `AWS_ROLE_ARN` | ARN do papel do Passo 2 |
| `AWS_REGION` | `us-east-1` |
| `STACK_NAME` | `financas` |
| `APP_DOMAIN` | `financas.acessocloud.com.br` |
| `ACM_CERTIFICATE_ARN` | ARN do certificado (ver `DOMINIO.md`) |
| `ALLOWED_ORIGIN` | `https://financas.acessocloud.com.br` |

> `APP_DOMAIN`, `ACM_CERTIFICATE_ARN` e `ALLOWED_ORIGIN` são opcionais: sem eles,
> o deploy roda no domínio padrão do CloudFront. Nada aqui é segredo — por isso
> ficam em _Variables_, não em _Secrets_.

## Passo 5 — Rodar

- **Automático:** qualquer push que altere `financas/**` ou `backend/**`.
- **Manual:** aba **Actions → Deploy Finanças (AWS) → Run workflow**.

Ao final, o endereço do app aparece no **Summary** da execução.

---

### Observações

- O certificado ACM e o DNS (Passos 1–3 do [`DOMINIO.md`](DOMINIO.md)) ainda são
  feitos uma vez fora do CI, porque dependem de validação no seu provedor de DNS.
  Depois disso, o CI cuida de todos os deploys.
- O papel é limitado ao repositório `4sec-net/acesso` pela condição `sub` da
  política de confiança. Para limitar a uma branch específica, troque o
  `repo:4sec-net/acesso:*` por `repo:4sec-net/acesso:ref:refs/heads/main`.
