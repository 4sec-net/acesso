/* ============================================================
   Finanças — controle financeiro pessoal
   Dois modos:
   • LOCAL  — sem login, dados em localStorage (quando AWS_CONFIG.apiUrl vazio)
   • NUVEM  — login via Cognito, dados na API (DynamoDB) via api.js
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.AWS_CONFIG || {};
  const CLOUD = !!CFG.apiUrl;              // modo nuvem ativo?
  const STORAGE_KEY = "financas.transactions.v1";
  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const CATEGORIES = {
    expense: [
      { id: "moradia",     name: "Moradia",        color: "#ff9900", icon: "🏠" },
      { id: "alimentacao", name: "Alimentação",    color: "#ec6f2b", icon: "🍽️" },
      { id: "transporte",  name: "Transporte",     color: "#f472b6", icon: "🚗" },
      { id: "saude",       name: "Saúde",          color: "#34d399", icon: "💊" },
      { id: "lazer",       name: "Lazer",          color: "#60a5fa", icon: "🎬" },
      { id: "educacao",    name: "Educação",       color: "#a78bfa", icon: "📚" },
      { id: "compras",     name: "Compras",        color: "#fbbf24", icon: "🛍️" },
      { id: "contas",      name: "Contas & Assinaturas", color: "#22d3ee", icon: "🧾" },
      { id: "outros_out",  name: "Outros",         color: "#94a3b8", icon: "📦" },
    ],
    income: [
      { id: "salario",     name: "Salário",        color: "#34d399", icon: "💼" },
      { id: "freelance",   name: "Freelance",      color: "#22d3ee", icon: "💻" },
      { id: "investimento",name: "Investimentos",  color: "#a78bfa", icon: "📈" },
      { id: "vendas",      name: "Vendas",         color: "#fbbf24", icon: "🏷️" },
      { id: "outros_in",   name: "Outros",         color: "#94a3b8", icon: "💰" },
    ],
  };

  const MONTHS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

  /* ---------- Estado ---------- */
  let transactions = [];
  let view = new Date();
  view.setDate(1);
  let filterText = "";
  let filterType = "all";

  /* ---------- Helpers ---------- */
  function $(sel) { return document.querySelector(sel); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function catInfo(type, id) {
    return (CATEGORIES[type] || []).find((c) => c.id === id) || { name: "—", color: "#94a3b8", icon: "•" };
  }
  function fmtDate(iso) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }
  function ym(date) { return { y: date.getFullYear(), m: date.getMonth() }; }
  function inMonth(iso, y, m) { const [ty, tm] = iso.split("-").map(Number); return ty === y && tm - 1 === m; }
  function plural(n) { return `${n} lançamento${n === 1 ? "" : "s"}`; }
  function toISO(d) { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function normalize(t) {
    return { id: t.id || uid(), type: t.type, desc: t.desc, amount: Number(t.amount),
             date: t.date, category: t.category, created: t.created || Date.now() };
  }
  function cacheLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); } catch (_) {} }
  function loadLocal() {
    try { const a = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(a) ? a : []; } catch (_) { return []; }
  }

  /* ============================================================
     Camada de dados (Store) — abstrai LOCAL x NUVEM
     ============================================================ */
  const Store = {
    async init() {
      if (CLOUD) {
        try {
          const remote = await window.DataAPI.list();
          transactions = remote.map(normalize);
          cacheLocal();
        } catch (e) {
          if (e.auth) throw e;                 // sessão inválida -> volta ao login
          transactions = loadLocal();          // offline: usa cache local (leitura)
          toast("Sem conexão — mostrando dados salvos localmente.");
        }
      } else {
        transactions = loadLocal();
      }
    },
    async create(tx) {
      const t = normalize(tx);
      if (CLOUD) { const saved = await window.DataAPI.create(t); Object.assign(t, normalize(saved)); }
      transactions.push(t);
      cacheLocal();
      return t;
    },
    async update(id, patch) {
      const t = transactions.find((x) => x.id === id);
      if (!t) return;
      Object.assign(t, patch);
      if (CLOUD) await window.DataAPI.update(id, t);
      cacheLocal();
    },
    async remove(id) {
      if (CLOUD) await window.DataAPI.remove(id);
      transactions = transactions.filter((x) => x.id !== id);
      cacheLocal();
    },
    async replaceAll(list) {
      const norm = list.map(normalize);
      if (CLOUD) {
        // Envia cada item; o backend faz upsert por (userId, id).
        for (const t of norm) { const saved = await window.DataAPI.create(t); Object.assign(t, normalize(saved)); }
        transactions = norm;
      } else {
        transactions = norm;
      }
      cacheLocal();
    },
  };

  /* ============================================================
     Render principal
     ============================================================ */
  function render() {
    const { y, m } = ym(view);
    $("#monthLabel").textContent = `${MONTHS[m]} ${y}`;

    const monthTx = transactions.filter((t) => inMonth(t.date, y, m));
    const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    $("#sumIncome").textContent = BRL.format(income);
    $("#sumExpense").textContent = BRL.format(expense);
    const balEl = $("#sumBalance");
    balEl.textContent = BRL.format(balance);
    balEl.classList.toggle("pos", balance > 0);
    balEl.classList.toggle("neg", balance < 0);
    $("#balanceHint").textContent = monthTx.length === 0 ? "Sem lançamentos" : (balance >= 0 ? "No azul 🎉" : "No vermelho");
    $("#incomeCount").textContent = plural(monthTx.filter((t) => t.type === "income").length);
    $("#expenseCount").textContent = plural(monthTx.filter((t) => t.type === "expense").length);
    const rate = income > 0 ? Math.round((balance / income) * 100) : null;
    $("#savingRate").textContent = rate === null ? "—" : `${rate}%`;

    renderDonut(monthTx, expense);
    renderBars();
    renderTable(monthTx);
  }

  function renderDonut(monthTx, expenseTotal) {
    const donut = $("#donut"), legend = $("#legend");
    $("#donutTotal").textContent = BRL.format(expenseTotal);
    donut.innerHTML = ""; legend.innerHTML = "";

    const byCat = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const R = 15.915;
    donut.appendChild(circle(R, "rgba(148,163,184,.14)", 100, 0));

    if (expenseTotal === 0) { legend.innerHTML = '<li style="color:var(--muted)">Sem despesas neste mês.</li>'; return; }

    let offset = 0;
    entries.forEach(([catId, val]) => {
      const info = catInfo("expense", catId);
      const pct = (val / expenseTotal) * 100;
      donut.appendChild(circle(R, info.color, pct, offset));
      offset += pct;
      const li = document.createElement("li");
      li.innerHTML =
        `<span class="lg-color" style="background:${info.color}"></span>` +
        `<span class="lg-name">${info.icon} ${escapeHtml(info.name)}</span>` +
        `<span class="lg-val">${BRL.format(val)}</span>` +
        `<span class="lg-pct">${Math.round(pct)}%</span>`;
      legend.appendChild(li);
    });
  }

  function circle(r, color, pct, offset) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", "21"); c.setAttribute("cy", "21"); c.setAttribute("r", r);
    c.setAttribute("stroke", color);
    c.setAttribute("stroke-dasharray", `${pct} ${100 - pct}`);
    c.setAttribute("stroke-dashoffset", `${25 - offset}`);
    c.setAttribute("stroke-linecap", pct >= 100 ? "butt" : "round");
    return c;
  }

  function renderBars() {
    const wrap = $("#bars"); wrap.innerHTML = "";
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(view.getFullYear(), view.getMonth() - i, 1);
      const { y, m } = ym(d);
      const tx = transactions.filter((t) => inMonth(t.date, y, m));
      months.push({
        label: MONTHS[m].slice(0, 3),
        income: tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        expense: tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    const max = Math.max(1, ...months.flatMap((x) => [x.income, x.expense]));
    months.forEach((mo) => {
      const g = document.createElement("div");
      g.className = "bar-group";
      const ih = Math.round((mo.income / max) * 100), eh = Math.round((mo.expense / max) * 100);
      g.innerHTML =
        `<div class="bar-pair">` +
          `<span class="bar in" style="height:${ih}%" title="Receitas: ${BRL.format(mo.income)}"></span>` +
          `<span class="bar out" style="height:${eh}%" title="Despesas: ${BRL.format(mo.expense)}"></span>` +
        `</div><span class="bar-label">${mo.label}</span>`;
      wrap.appendChild(g);
    });
  }

  function renderTable(monthTx) {
    const body = $("#txBody"), empty = $("#emptyState");
    body.innerHTML = "";
    let list = monthTx.slice();
    if (filterType !== "all") list = list.filter((t) => t.type === filterType);
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter((t) => t.desc.toLowerCase().includes(q) || catInfo(t.type, t.category).name.toLowerCase().includes(q));
    }
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.created < b.created ? 1 : -1)));

    if (list.length === 0) {
      empty.hidden = false;
      $("#emptyState p").textContent = monthTx.length === 0 ? "Nenhum lançamento neste mês." : "Nenhum lançamento corresponde ao filtro.";
      return;
    }
    empty.hidden = true;

    const frag = document.createDocumentFragment();
    list.forEach((t) => {
      const info = catInfo(t.type, t.category), isIn = t.type === "income";
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td><div class="tx-desc"><span class="tx-ico ${isIn ? "in" : "out"}">${info.icon}</span><span>${escapeHtml(t.desc)}</span></div></td>` +
        `<td><span class="cat-tag">${escapeHtml(info.name)}</span></td>` +
        `<td class="col-date">${fmtDate(t.date)}</td>` +
        `<td class="col-amount amount ${isIn ? "pos" : "neg"}">${isIn ? "+" : "−"} ${BRL.format(t.amount)}</td>` +
        `<td class="col-actions"><div class="row-actions">` +
          `<button class="mini-btn edit" data-id="${t.id}" title="Editar" aria-label="Editar">✎</button>` +
          `<button class="mini-btn del" data-id="${t.id}" title="Excluir" aria-label="Excluir">🗑</button>` +
        `</div></td>`;
      frag.appendChild(tr);
    });
    body.appendChild(frag);
  }

  /* ============================================================
     Modal (novo / editar)
     ============================================================ */
  let currentType = "expense";

  function fillCategories(type) {
    const sel = $("#fCategory"); sel.innerHTML = "";
    CATEGORIES[type].forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id; opt.textContent = `${c.icon} ${c.name}`;
      sel.appendChild(opt);
    });
  }
  function setType(type) {
    currentType = type;
    $("#segExpense").classList.toggle("is-active", type === "expense");
    $("#segIncome").classList.toggle("is-active", type === "income");
    fillCategories(type);
  }
  function openModal(tx) {
    $("#txForm").reset();
    if (tx) {
      $("#modalTitle").textContent = "Editar lançamento";
      $("#txId").value = tx.id;
      setType(tx.type);
      $("#fDesc").value = tx.desc; $("#fAmount").value = tx.amount;
      $("#fDate").value = tx.date; $("#fCategory").value = tx.category;
    } else {
      $("#modalTitle").textContent = "Novo lançamento";
      $("#txId").value = ""; setType("expense");
      const now = new Date();
      const useView = ym(view).y !== now.getFullYear() || ym(view).m !== now.getMonth();
      const d = useView ? new Date(view.getFullYear(), view.getMonth(), 1) : now;
      $("#fDate").value = toISO(d);
    }
    $("#modal").hidden = false;
    setTimeout(() => $("#fDesc").focus(), 40);
  }
  function closeModal() { $("#modal").hidden = true; }

  async function submitForm(e) {
    e.preventDefault();
    const id = $("#txId").value;
    const desc = $("#fDesc").value.trim();
    const amount = Math.round(parseFloat($("#fAmount").value) * 100) / 100;
    const date = $("#fDate").value;
    const category = $("#fCategory").value;
    if (!desc || !date || !(amount > 0)) { toast("Preencha descrição, valor e data."); return; }

    const saveBtn = $("#saveBtn");
    saveBtn.disabled = true; saveBtn.textContent = "Salvando…";
    try {
      if (id) {
        await Store.update(id, { type: currentType, desc, amount, date, category });
        toast("Lançamento atualizado.");
      } else {
        await Store.create({ type: currentType, desc, amount, date, category });
        toast("Lançamento adicionado.");
      }
      const [ty, tm] = date.split("-").map(Number);
      view = new Date(ty, tm - 1, 1);
      closeModal();
      render();
    } catch (err) {
      if (err.auth) return handleAuthLoss();
      toast(err.message || "Erro ao salvar.");
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = "Salvar";
    }
  }

  async function deleteTx(id) {
    const t = transactions.find((x) => x.id === id);
    if (!t) return;
    if (!confirm(`Excluir "${t.desc}" (${BRL.format(t.amount)})?`)) return;
    try {
      await Store.remove(id);
      render();
      toast("Lançamento excluído.");
    } catch (err) {
      if (err.auth) return handleAuthLoss();
      toast(err.message || "Erro ao excluir.");
    }
  }

  /* ---------- Import / Export ---------- */
  function exportData() {
    if (transactions.length === 0) { toast("Nada para exportar ainda."); return; }
    const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `financas-${toISO(new Date())}.json`; a.click();
    URL.revokeObjectURL(url);
    toast("Backup exportado.");
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("formato");
        const valid = data.filter((t) => t && (t.type === "income" || t.type === "expense") &&
          typeof t.desc === "string" && typeof t.amount === "number" && typeof t.date === "string");
        if (valid.length === 0) throw new Error("vazio");
        const extra = CLOUD ? " Eles serão enviados para a sua conta na nuvem." : "";
        if (!confirm(`Importar ${valid.length} lançamento(s)? Isso substitui os dados atuais.${extra}`)) return;
        toast("Importando…");
        await Store.replaceAll(valid.map((t) => ({
          id: t.id || uid(), type: t.type, desc: t.desc, amount: t.amount, date: t.date,
          category: t.category || (t.type === "income" ? "outros_in" : "outros_out"), created: t.created || Date.now(),
        })));
        render();
        toast(`${valid.length} lançamento(s) importados.`);
      } catch (err) {
        if (err.auth) return handleAuthLoss();
        toast(err.message === "formato" || err.message === "vazio" ? "Arquivo inválido." : (err.message || "Erro ao importar."));
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* ---------- Dados de exemplo (apenas modo local, 1ª visita) ---------- */
  function seedIfEmpty() {
    if (CLOUD) return;
    if (loadLocal().length > 0) return;
    const now = new Date();
    const iso = (day) => toISO(new Date(now.getFullYear(), now.getMonth(), day));
    transactions = [
      { id: uid(), type: "income",  desc: "Salário",            amount: 5200, date: iso(5),  category: "salario",     created: Date.now() },
      { id: uid(), type: "expense", desc: "Aluguel",            amount: 1450, date: iso(6),  category: "moradia",     created: Date.now() },
      { id: uid(), type: "expense", desc: "Supermercado",       amount: 680,  date: iso(8),  category: "alimentacao", created: Date.now() },
      { id: uid(), type: "expense", desc: "Gasolina",           amount: 320,  date: iso(10), category: "transporte",  created: Date.now() },
      { id: uid(), type: "expense", desc: "Internet + celular", amount: 210,  date: iso(12), category: "contas",      created: Date.now() },
      { id: uid(), type: "expense", desc: "Cinema",             amount: 90,   date: iso(15), category: "lazer",       created: Date.now() },
      { id: uid(), type: "income",  desc: "Freela design",      amount: 800,  date: iso(18), category: "freelance",   created: Date.now() },
    ];
    cacheLocal();
  }

  /* ============================================================
     Autenticação (modo nuvem) — telas de login/cadastro
     ============================================================ */
  const Auth = {
    pendingEmail: "",
    show(screen) {
      document.querySelectorAll(".auth-form[data-screen]").forEach((el) => {
        el.hidden = el.dataset.screen !== screen;
      });
      $("#authError").hidden = true;
    },
    err(msg) { const el = $("#authError"); el.textContent = msg; el.hidden = false; },
    busy(form, on, label) {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = on; if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || "Aguarde…"; } else { btn.textContent = btn.dataset.label || btn.textContent; } }
    },
    open() { $("#authScreen").hidden = false; document.body.classList.add("locked"); },
    close() { $("#authScreen").hidden = true; document.body.classList.remove("locked"); },
  };

  function handleAuthLoss() {
    window.AuthAPI.signOut();
    toast("Sua sessão expirou. Faça login novamente.");
    Auth.show("login");
    Auth.open();
  }

  function bindAuth() {
    $("#toSignup").addEventListener("click", (e) => { e.preventDefault(); Auth.show("signup"); });
    $("#toLogin").addEventListener("click", (e) => { e.preventDefault(); Auth.show("login"); });
    $("#toForgot").addEventListener("click", (e) => { e.preventDefault(); Auth.show("forgot"); });
    $("#forgotToLogin").addEventListener("click", (e) => { e.preventDefault(); Auth.show("login"); });

    // Login
    $("#formLogin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#loginEmail").value.trim(), pass = $("#loginPass").value;
      Auth.busy(e.target, true, "Entrando…");
      try { await window.AuthAPI.signIn(email, pass); await startApp(); Auth.close(); }
      catch (err) {
        if (err.type && err.type.includes("UserNotConfirmed")) { Auth.pendingEmail = email; Auth.show("confirm"); $("#confirmHint").textContent = `Enviamos um código para ${email}.`; }
        else Auth.err(err.message);
      } finally { Auth.busy(e.target, false); }
    });

    // Cadastro
    $("#formSignup").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#signupEmail").value.trim(), pass = $("#signupPass").value;
      if (pass.length < 8) return Auth.err("A senha precisa ter ao menos 8 caracteres.");
      Auth.busy(e.target, true, "Criando…");
      try {
        await window.AuthAPI.signUp(email, pass);
        Auth.pendingEmail = email;
        $("#confirmHint").textContent = `Enviamos um código de confirmação para ${email}.`;
        Auth.show("confirm");
      } catch (err) { Auth.err(err.message); } finally { Auth.busy(e.target, false); }
    });

    // Confirmação de e-mail
    $("#formConfirm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = $("#confirmCode").value.trim();
      Auth.busy(e.target, true, "Confirmando…");
      try {
        await window.AuthAPI.confirmSignUp(Auth.pendingEmail, code);
        toast("Conta confirmada! Faça login.");
        $("#loginEmail").value = Auth.pendingEmail;
        Auth.show("login");
      } catch (err) { Auth.err(err.message); } finally { Auth.busy(e.target, false); }
    });
    $("#resendCode").addEventListener("click", async (e) => {
      e.preventDefault();
      try { await window.AuthAPI.resendCode(Auth.pendingEmail); toast("Novo código enviado."); }
      catch (err) { Auth.err(err.message); }
    });

    // Esqueci a senha (etapa 1: pedir código · etapa 2: redefinir)
    $("#formForgot").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#forgotEmail").value.trim();
      Auth.busy(e.target, true, "Enviando…");
      try {
        if ($("#forgotStep2").hidden) {
          await window.AuthAPI.forgotPassword(email);
          $("#forgotStep2").hidden = false;
          $("#forgotSubmit").dataset.label = "Redefinir senha"; // busy(false) aplica este texto
          toast("Enviamos um código para seu e-mail.");
        } else {
          const code = $("#forgotCode").value.trim();
          const pass = $("#forgotPass").value;
          if (pass.length < 8) throw new Error("A nova senha precisa ter ao menos 8 caracteres.");
          await window.AuthAPI.confirmForgot(email, code, pass);
          toast("Senha redefinida! Faça login.");
          $("#loginEmail").value = email;
          $("#forgotStep2").hidden = true;
          $("#forgotSubmit").dataset.label = "Enviar código";
          Auth.show("login");
        }
      } catch (err) { Auth.err(err.message); } finally { Auth.busy(e.target, false); }
    });

    // Logout
    $("#btnLogout").addEventListener("click", () => {
      window.AuthAPI.signOut();
      transactions = [];
      Auth.show("login");
      Auth.open();
    });
  }

  /* ============================================================
     Boot / eventos do app
     ============================================================ */
  function bindApp() {
    $("#btnNew").addEventListener("click", () => openModal(null));
    $("#btnEmptyNew").addEventListener("click", () => openModal(null));
    $("#closeModal").addEventListener("click", closeModal);
    $("#cancelModal").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
    $("#txForm").addEventListener("submit", submitForm);
    $("#segExpense").addEventListener("click", () => setType("expense"));
    $("#segIncome").addEventListener("click", () => setType("income"));
    $("#prevMonth").addEventListener("click", () => { view.setMonth(view.getMonth() - 1); render(); });
    $("#nextMonth").addEventListener("click", () => { view.setMonth(view.getMonth() + 1); render(); });
    $("#btnToday").addEventListener("click", () => { view = new Date(); view.setDate(1); render(); });
    $("#search").addEventListener("input", (e) => { filterText = e.target.value.trim(); render(); });
    $("#filterType").addEventListener("change", (e) => { filterType = e.target.value; render(); });
    $("#txBody").addEventListener("click", (e) => {
      const btn = e.target.closest("button"); if (!btn) return;
      const id = btn.dataset.id;
      if (btn.classList.contains("edit")) openModal(transactions.find((t) => t.id === id));
      else if (btn.classList.contains("del")) deleteTx(id);
    });
    $("#btnExport").addEventListener("click", exportData);
    $("#btnImport").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", (e) => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ""; });
  }

  // Carrega os dados e desenha o app (usado após login e no boot local).
  async function startApp() {
    if (CLOUD) {
      const email = window.AuthAPI.email();
      $("#userEmail").textContent = email || "";
      $("#userChip").hidden = false;
      const note = $("#footerNote");
      if (note) note.textContent = "Seus dados ficam guardados com segurança na sua conta (nuvem AWS) e sincronizam entre aparelhos.";
    }
    await Store.init();
    render();
    // Atalho do manifest / shortcut do app.
    if (new URLSearchParams(location.search).get("action") === "new") openModal(null);
  }

  async function boot() {
    bindApp();
    if (CLOUD) {
      bindAuth();
      if (window.AuthAPI.isLoggedIn()) {
        try { await startApp(); Auth.close(); return; }
        catch (e) { window.AuthAPI.signOut(); }
      }
      Auth.show("login");
      Auth.open();
    } else {
      seedIfEmpty();
      await startApp();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

/* ---------- PWA: registro do Service Worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
