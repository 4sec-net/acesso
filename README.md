# Acesso Cloud — Site institucional

Landing page institucional da **Acesso Cloud**, empresa de consultoria e
suporte especializado em **migração para a AWS** (Amazon Web Services).

## ✨ Recursos

- Site de página única, responsivo (mobile, tablet e desktop)
- Tema escuro moderno com paleta AWS (laranja), gradientes e microanimações
- Seções: Hero, Serviços, Processo (4 etapas), Diferenciais, Pacotes, Sobre e Contato
- Contato via **WhatsApp** (botão flutuante + links) para +55 (31) 98470-3859
- Menu mobile, contadores animados, reveal on scroll e formulário com validação
- **Zero dependências** e **sem etapa de build** — HTML, CSS e JS puros

## 📁 Estrutura

```
.
├── index.html        # Estrutura e conteúdo do site
├── styles.css        # Estilos e design system (tokens em :root)
├── script.js         # Interações: menu, contadores, animações, formulário
├── assets/
│   └── favicon.svg   # Ícone do site
└── README.md
```

## 🚀 Como visualizar

Basta abrir o `index.html` no navegador. Para servir localmente:

```bash
# Python
python3 -m http.server 8000

# ou Node
npx serve .
```

Depois acesse `http://localhost:8000`.

## 🎨 Personalização

- **Cores da marca:** edite as variáveis em `:root` no início do `styles.css`
  (`--brand`, `--brand-2`, `--brand-grad`).
- **Conteúdo:** textos, serviços e planos ficam diretamente no `index.html`.
- **Contato:** ajuste e-mail e telefone na seção `#contato`. O formulário hoje
  faz validação no cliente; conecte a um backend/serviço de e-mail para envio real.

## 💰 Programa de Finanças (`/financas`)

Aplicativo de **controle financeiro pessoal**, também 100% estático e sem
dependências, seguindo o mesmo design system do site.

- Registre **receitas** e **despesas** com descrição, valor, data e categoria
- **Dashboard** com saldo do mês, totais e taxa de economia
- **Gráfico de rosca** de despesas por categoria e **barras** dos últimos 6 meses
- Navegação **mês a mês**, busca e filtro por tipo
- **Editar/excluir** lançamentos e **importar/exportar** backup em JSON
- **PWA** instalável e offline (pronto para virar app Android — ver `financas/GUIA-PLAYSTORE.md`)

O app funciona em **dois modos**, escolhidos automaticamente:

- **Local** — sem login, dados no `localStorage` (padrão enquanto a nuvem não está
  configurada). Ótimo para testar: abra `financas/index.html`.
- **Nuvem** — login multiusuário e dados na AWS. Ativado automaticamente após o
  deploy do backend (o script preenche `financas/config.js`).

```
financas/
├── index.html            # Estrutura do app + tela de login
├── styles.css            # Estilos (mesmos tokens do site)
├── script.js             # Lógica: lançamentos, gráficos, modos local/nuvem
├── config.js             # Configuração da AWS (gerada no deploy)
├── auth.js               # Autenticação Cognito (sem SDK)
├── api.js                # Cliente da API
├── manifest.webmanifest  # PWA
├── service-worker.js     # Cache offline
├── privacidade.html      # Política de privacidade
├── icons/                # Ícones do PWA/app
├── twa-manifest.json     # Config do Bubblewrap (Play Store)
└── GUIA-PLAYSTORE.md      # Guia de publicação na Play Store
```

## ☁️ Backend na AWS (`/backend`)

Infraestrutura serverless (AWS SAM) com **Cognito + API Gateway + Lambda +
DynamoDB** e hospedagem em **S3 + CloudFront**. Deploy em dois comandos:

```bash
cd backend
./deploy.sh              # cria a infraestrutura
./deploy-frontend.sh     # publica o app e gera o config.js
```

Detalhes em [`backend/README.md`](backend/README.md).

## 🌐 Deploy

O **site institucional** é 100% estático e pode ser publicado em qualquer host
(GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, etc.). O **app de finanças
com nuvem** é publicado na AWS pelos scripts em `backend/`.
