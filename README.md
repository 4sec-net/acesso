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

## 🌐 Deploy

Por ser 100% estático, pode ser publicado em qualquer host estático:
GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, entre outros.
