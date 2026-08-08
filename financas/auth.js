/* auth.js — autenticação com Amazon Cognito, sem SDK (chamadas diretas à API
   AWSCognitoIdentityProviderService via fetch). Mantém o app com zero build.
   Fluxo: cadastro -> confirmação por e-mail -> login (USER_PASSWORD_AUTH).
   Tokens ficam no localStorage; o idToken é usado como Bearer na API. */
window.AuthAPI = (function () {
  "use strict";
  const cfg = window.AWS_CONFIG || {};
  const KEY = "financas.auth.v1";
  const endpoint = () => `https://cognito-idp.${cfg.region}.amazonaws.com/`;

  async function idp(target, body) {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService." + target,
      },
      body: JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(friendly(data.__type, data.message));
      err.type = data.__type;
      throw err;
    }
    return data;
  }

  // Mensagens de erro do Cognito em português.
  function friendly(type, msg) {
    const t = (type || "").split("#").pop();
    const map = {
      NotAuthorizedException: "E-mail ou senha incorretos.",
      UserNotConfirmedException: "Confirme seu e-mail antes de entrar.",
      UsernameExistsException: "Já existe uma conta com esse e-mail.",
      CodeMismatchException: "Código de confirmação inválido.",
      ExpiredCodeException: "Código expirado. Peça um novo.",
      InvalidPasswordException: "Senha fraca: use ao menos 8 caracteres, com letra e número.",
      InvalidParameterException: "Verifique os dados informados.",
      UserNotFoundException: "Conta não encontrada.",
      LimitExceededException: "Muitas tentativas. Tente novamente em instantes.",
      TooManyRequestsException: "Muitas tentativas. Aguarde um momento.",
    };
    return map[t] || msg || "Não foi possível concluir a operação.";
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (_) { return null; }
  }
  function saveSession(auth) {
    const now = Date.now();
    const sess = {
      idToken: auth.IdToken,
      accessToken: auth.AccessToken,
      refreshToken: auth.RefreshToken,
      expiresAt: now + (auth.ExpiresIn || 3600) * 1000 - 60000, // margem de 1 min
    };
    if (!sess.refreshToken) {
      const prev = getSession();
      if (prev) sess.refreshToken = prev.refreshToken; // refresh não retorna novo refreshToken
    }
    localStorage.setItem(KEY, JSON.stringify(sess));
    return sess;
  }
  function clear() { localStorage.removeItem(KEY); }

  async function signUp(email, password) {
    return idp("SignUp", {
      ClientId: cfg.clientId, Username: email, Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    });
  }
  async function confirmSignUp(email, code) {
    return idp("ConfirmSignUp", { ClientId: cfg.clientId, Username: email, ConfirmationCode: code });
  }
  async function resendCode(email) {
    return idp("ResendConfirmationCode", { ClientId: cfg.clientId, Username: email });
  }
  async function signIn(email, password) {
    const data = await idp("InitiateAuth", {
      ClientId: cfg.clientId, AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: { USERNAME: email, PASSWORD: password },
    });
    return saveSession(data.AuthenticationResult);
  }
  async function forgotPassword(email) {
    return idp("ForgotPassword", { ClientId: cfg.clientId, Username: email });
  }
  async function confirmForgot(email, code, password) {
    return idp("ConfirmForgotPassword", {
      ClientId: cfg.clientId, Username: email, ConfirmationCode: code, Password: password,
    });
  }
  async function refresh() {
    const s = getSession();
    if (!s || !s.refreshToken) throw new Error("Sessão expirada.");
    const data = await idp("InitiateAuth", {
      ClientId: cfg.clientId, AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: { REFRESH_TOKEN: s.refreshToken },
    });
    return saveSession(data.AuthenticationResult);
  }
  async function getIdToken() {
    let s = getSession();
    if (!s) return null;
    if (Date.now() >= s.expiresAt) {
      try { s = await refresh(); } catch (_) { clear(); return null; }
    }
    return s.idToken;
  }
  function isLoggedIn() { return !!getSession(); }
  function email() {
    const s = getSession();
    if (!s) return null;
    try { return JSON.parse(atob(s.idToken.split(".")[1])).email || null; } catch (_) { return null; }
  }
  function signOut() { clear(); }

  return { signUp, confirmSignUp, resendCode, signIn, forgotPassword, confirmForgot,
           getIdToken, isLoggedIn, email, signOut };
})();
