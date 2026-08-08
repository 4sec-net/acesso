# 📱 Guia: publicar o app **Finanças** na Google Play Store

Este app é uma **PWA** (site instalável e offline) empacotada como app Android
via **TWA (Trusted Web Activity)** usando o **Bubblewrap**. Você reaproveita 100%
do código de `financas/` — não há reescrita.

> Resumo do fluxo: **hospedar o PWA → gerar o `.aab` com Bubblewrap → verificar o
> domínio (assetlinks) → subir no Play Console → preencher a ficha → publicar.**

---

## 0) Pré-requisitos (uma vez)

| Item | Como obter | Custo |
|------|-----------|-------|
| Conta **Google Play Console** | https://play.google.com/console (login Google) | **US$ 25**, taxa única |
| **Node.js 18+** | https://nodejs.org | grátis |
| **JDK 17** | https://adoptium.net | grátis |
| **Bubblewrap CLI** | `npm i -g @bubblewrap/cli` | grátis |

> O Bubblewrap baixa sozinho o Android SDK e o JDK na primeira execução
> (ele pergunta os caminhos — pode aceitar os padrões).

---

## 1) Hospedar o PWA na internet

A TWA **carrega o app de uma URL pública HTTPS**. Você precisa publicar a pasta
do site em algum lugar. Duas opções:

### Opção A — GitHub Pages (grátis, já configurável neste repo)
Depois do merge para a branch de deploy, o app fica em:

```
https://4sec-net.github.io/acesso/financas/
```

⚠️ **Atenção — Digital Asset Links:** o arquivo de verificação precisa ficar na
**raiz do domínio (origin)**, ou seja em
`https://4sec-net.github.io/.well-known/assetlinks.json`. Como o `github.io` é
compartilhado, isso exige um repositório chamado `4sec-net.github.io`. Por isso,
para TWA, **recomendamos um domínio próprio** (Opção B).

### Opção B — Domínio próprio (recomendado para TWA)
Ex.: `financas.acessocloud.com.br` apontando para GitHub Pages / Netlify / Vercel.
Aí você controla a raiz e o `assetlinks.json` fica em:

```
https://financas.acessocloud.com.br/.well-known/assetlinks.json
```

Substitua `SEU-DOMINIO.com.br` nos arquivos `twa-manifest.json` e
`.well-known/assetlinks.json` pelo domínio escolhido.

> Se preferir **não hospedar nada**, o caminho é usar **Capacitor** em vez de TWA
> (o app embute os arquivos e não precisa de servidor). Me avise que eu monto.

---

## 2) Testar o PWA no celular (opcional, mas recomendado)

Abra a URL pública no **Chrome do Android** → menu **⋮ → Instalar app**.
Ele deve abrir em tela cheia, funcionar offline e salvar os lançamentos.
Se isso funciona, a TWA vai funcionar.

---

## 3) Gerar o app Android (`.aab`) com Bubblewrap

Num terminal, dentro de uma pasta vazia:

```bash
# 3.1 – inicializar a partir do manifest do PWA já hospedado
bubblewrap init --manifest="https://SEU-DOMINIO.com.br/financas/manifest.webmanifest"
```

Responda as perguntas (ou aproveite os valores já prontos em
`financas/twa-manifest.json` — pode copiar esse arquivo para a pasta e rodar
`bubblewrap build` direto). Valores sugeridos:

- **Package name / Application ID:** `com.acessocloud.financas`
- **Display mode:** `standalone`
- **Orientation:** `portrait`
- **Status bar / theme color:** `#0b1120`
- **Ícone:** `https://SEU-DOMINIO.com.br/financas/icons/icon-512.png`
- **Maskable icon:** `https://SEU-DOMINIO.com.br/financas/icons/maskable-512.png`

Na primeira vez ele cria a **chave de assinatura** (keystore). **GUARDE MUITO
BEM** o arquivo `android.keystore` e as senhas — sem eles você não consegue
atualizar o app depois.

```bash
# 3.2 – gerar o pacote de publicação
bubblewrap build
```

Saídas geradas:
- `app-release-bundle.aab` → **é este que sobe na Play Store**
- `app-release-signed.apk` → para testar direto no celular (`adb install`)

Para atualizar o app no futuro: aumente `appVersionCode` (+1) e
`appVersionName` no `twa-manifest.json` e rode `bubblewrap update && bubblewrap build`.

---

## 4) Verificar o domínio (Digital Asset Links) — tira a barra de URL

Sem isso, o app abre com uma barrinha de endereço do Chrome. Para remover:

1. No **Play Console**, após criar o app (passo 5), vá em
   **Configuração → Integridade do app → Chave de assinatura do app** e copie a
   **impressão digital SHA-256**.
   > ⚠️ Use a do **"App signing key"** (a que o Google gerencia), **não** a da
   > chave de upload — é o erro mais comum.
2. Cole esse SHA-256 em `.well-known/assetlinks.json` no lugar de
   `SUBSTITUA_PELO_SHA256_...`.
3. Publique o `assetlinks.json` no seu domínio, acessível em
   `https://SEU-DOMINIO/.well-known/assetlinks.json` (sem redirecionamento,
   `Content-Type: application/json`).
4. Confira em: https://developers.google.com/digital-asset-links/tools/generator

O `package_name` no arquivo já está como `com.acessocloud.financas` — mantenha
igual ao Application ID do app.

---

## 5) Criar e enviar o app no Play Console

1. **Criar app** → nome “Finanças”, idioma **Português (Brasil)**, tipo **App**,
   **Gratuito**.
2. **Produção → Criar nova versão** → faça upload do **`app-release-bundle.aab`**.
   - Ative o **Play App Signing** (recomendado, é o padrão).
3. Preencha os questionários obrigatórios:
   - **Classificação de conteúdo** (questionário IARC).
   - **Público-alvo** e conteúdo.
   - **Segurança dos dados**: este app **não coleta nem envia dados** — tudo fica
     no aparelho (localStorage). Declare isso (nenhum dado coletado/compartilhado).
   - **Política de privacidade**: a Play exige uma URL. Você pode publicar uma
     página simples (posso gerar um `privacidade.html` para você).
4. **Ficha da Play Store** (passo 6).
5. Envie para **revisão**. A primeira análise costuma levar de horas a alguns dias.

---

## 6) Assets da ficha da loja (o que a Play pede)

| Asset | Especificação | Status |
|-------|---------------|--------|
| Ícone do app | **512×512 PNG** | ✅ use `icons/icon-512.png` |
| Feature graphic | **1024×500 PNG/JPG** | ⬜ posso gerar |
| Screenshots do telefone | 2 a 8 imagens, mín. 320px | ⬜ dá pra capturar do app rodando |
| Descrição curta | até 80 caracteres | ver sugestão abaixo |
| Descrição completa | até 4000 caracteres | ver sugestão abaixo |

**Descrição curta (sugestão):**
> Controle suas finanças: receitas, despesas e saldo do mês, tudo no seu aparelho.

**Descrição completa (sugestão):**
> O Finanças é um controle financeiro pessoal simples e rápido. Registre receitas
> e despesas por categoria, acompanhe seu saldo mensal, veja gráficos de gastos e
> a evolução dos últimos meses. Funciona offline e mantém seus dados apenas no seu
> aparelho — nada é enviado para servidores. Faça backup dos seus lançamentos
> exportando em JSON quando quiser.
>
> • Receitas e despesas por categoria
> • Saldo, totais e taxa de economia do mês
> • Gráfico de despesas por categoria e evolução de 6 meses
> • Busca e filtros
> • Importar/exportar backup (JSON)
> • 100% offline e privado

---

## Referência rápida dos arquivos deste repo

```
financas/
├── index.html, styles.css, script.js   # o app (PWA)
├── manifest.webmanifest                 # manifest do PWA
├── service-worker.js                    # cache offline
├── icons/                               # ícones 192/512 + maskable + apple-touch
├── twa-manifest.json                    # config do Bubblewrap (edite o domínio)
└── GUIA-PLAYSTORE.md                    # este guia
.well-known/assetlinks.json              # verificação do domínio (cole o SHA-256)
```

---

### Precisa de ajuda em algum passo?
Posso, aqui mesmo:
- Gerar a **página de política de privacidade** (`privacidade.html`).
- Gerar o **feature graphic 1024×500** e um mockup de screenshots.
- Configurar o **deploy no GitHub Pages** para esta branch.
- Trocar a abordagem para **Capacitor** (sem precisar hospedar site).

É só pedir.
