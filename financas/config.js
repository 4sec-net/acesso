/* Configuração da nuvem (AWS).
   Preenchido automaticamente pelo deploy (backend/deploy-frontend.sh) a partir
   das saídas do CloudFormation.

   Enquanto `apiUrl` estiver vazio, o app roda em MODO LOCAL (localStorage, sem
   login) — ótimo para testar antes de publicar na AWS. Assim que `apiUrl` for
   preenchido, o app passa para o MODO NUVEM (login via Cognito + API/DynamoDB). */
window.AWS_CONFIG = {
  region: "",
  userPoolId: "",
  clientId: "",
  apiUrl: ""
};
