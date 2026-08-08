# 🌐 Configurar o domínio `financas.acessocloud.com.br`

Passo a passo para publicar o app no seu domínio (CloudFront + HTTPS) e deixar a
TWA (app Android) verificada, sem barra de URL.

> Região: o certificado do CloudFront **precisa** estar em **us-east-1**
> (N. Virginia), independentemente da região da stack.

---

## 1) Solicitar o certificado (ACM, em us-east-1)

```bash
aws acm request-certificate \
  --region us-east-1 \
  --domain-name financas.acessocloud.com.br \
  --validation-method DNS \
  --query CertificateArn --output text
```

Guarde o **ARN** retornado. Em seguida, pegue o registro CNAME de validação:

```bash
aws acm describe-certificate --region us-east-1 \
  --certificate-arn <ARN> \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord"
```

Crie esse **CNAME de validação** no DNS do domínio `acessocloud.com.br`
(no seu provedor de DNS ou Route 53). Aguarde o status ficar `ISSUED`:

```bash
aws acm wait certificate-validated --region us-east-1 --certificate-arn <ARN>
```

## 2) Deploy da stack com o domínio

```bash
cd backend
export DOMAIN=financas.acessocloud.com.br
export CERT_ARN=<ARN-do-passo-1>
export ALLOWED_ORIGIN=https://financas.acessocloud.com.br
./deploy.sh
```

Anote a saída **CloudFrontDomain** (algo como `d123abc.cloudfront.net`).

## 3) Apontar o DNS para o CloudFront

Crie um registro no DNS do domínio:

```
Tipo:  CNAME
Nome:  financas            (→ financas.acessocloud.com.br)
Valor: <CloudFrontDomain>  (ex.: d123abc.cloudfront.net)
```

> Usando **Route 53**, prefira um **registro ALIAS A** apontando para a
> distribuição do CloudFront (resolve o apex/subdomínio sem CNAME).

## 4) Publicar o app

```bash
./deploy-frontend.sh
```

Isso envia o app para o S3, gera o `financas/config.js` (ligando o modo nuvem),
publica o `assetlinks.json` em
`https://financas.acessocloud.com.br/.well-known/assetlinks.json` e limpa o cache.

Abra **https://financas.acessocloud.com.br** — deve carregar a tela de login. 🎉

## 5) App Android (TWA)

O `financas/twa-manifest.json` já está com o domínio certo. Depois de gerar o app
com o Bubblewrap (ver [`../financas/GUIA-PLAYSTORE.md`](../financas/GUIA-PLAYSTORE.md)),
copie a impressão **SHA-256** da chave de assinatura para
`../.well-known/assetlinks.json` e rode `./deploy-frontend.sh` de novo para
republicar. Isso remove a barra de URL do app.

---

### Resumo dos comandos

```bash
# 1. Certificado (us-east-1) + validação DNS
# 2.
cd backend
export DOMAIN=financas.acessocloud.com.br
export CERT_ARN=arn:aws:acm:us-east-1:...:certificate/...
export ALLOWED_ORIGIN=https://financas.acessocloud.com.br
./deploy.sh
# 3. CNAME financas -> <CloudFrontDomain>
# 4.
./deploy-frontend.sh
```
