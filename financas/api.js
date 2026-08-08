/* api.js — cliente da API (API Gateway + Lambda + DynamoDB).
   Envia o idToken do Cognito no header Authorization: Bearer <token>. */
window.DataAPI = (function () {
  "use strict";
  const cfg = window.AWS_CONFIG || {};

  async function req(method, path, body) {
    const token = await window.AuthAPI.getIdToken();
    if (!token) { const e = new Error("Não autenticado."); e.auth = true; throw e; }
    const res = await fetch(cfg.apiUrl + path, {
      method,
      headers: Object.assign(
        { Authorization: "Bearer " + token },
        body ? { "Content-Type": "application/json" } : {}
      ),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { const e = new Error("Sessão expirada."); e.auth = true; throw e; }
    if (!res.ok) {
      let msg = "Erro na API (" + res.status + ")";
      try { const d = await res.json(); if (d.message) msg = d.message; } catch (_) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  return {
    list: () => req("GET", "/transactions"),
    create: (tx) => req("POST", "/transactions", tx),
    update: (id, tx) => req("PUT", "/transactions/" + encodeURIComponent(id), tx),
    remove: (id) => req("DELETE", "/transactions/" + encodeURIComponent(id)),
  };
})();
