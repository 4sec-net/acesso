/* Lambda — API de lançamentos financeiros.
   Um único handler roteia GET/POST/PUT/DELETE em /transactions.
   O usuário é identificado pelo `sub` do JWT do Cognito (isolamento por usuário).
   O SDK v3 já vem no runtime Node 20 da AWS — sem dependências extras. */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;

// CORS é tratado pelo API Gateway (CorsConfiguration); aqui só o Content-Type.
const HEADERS = { "Content-Type": "application/json" };
const reply = (status, body) => ({
  statusCode: status,
  headers: HEADERS,
  body: body === undefined ? "" : JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    const claims = (event.requestContext &&
      event.requestContext.authorizer &&
      event.requestContext.authorizer.jwt &&
      event.requestContext.authorizer.jwt.claims) || {};
    const userId = claims.sub;
    if (!userId) return reply(401, { message: "Não autenticado" });

    const method = event.requestContext.http.method;
    const id = event.pathParameters && event.pathParameters.id;
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === "GET") {
      const out = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
      }));
      return reply(200, (out.Items || []).map(strip));
    }

    if (method === "POST" || method === "PUT") {
      const txId = method === "PUT" ? id : (body.id || newId());
      if (!txId) return reply(400, { message: "id obrigatório" });
      const tx = validate(body);
      const item = { userId, txId, ...tx, created: Number(body.created) || Date.now() };
      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return reply(method === "POST" ? 201 : 200, strip(item));
    }

    if (method === "DELETE") {
      if (!id) return reply(400, { message: "id obrigatório" });
      await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { userId, txId: id } }));
      return reply(204);
    }

    return reply(405, { message: "Método não suportado" });
  } catch (e) {
    if (e.statusCode) return reply(e.statusCode, { message: e.message });
    console.error(e);
    return reply(500, { message: "Erro interno" });
  }
};

function validate(b) {
  const bad = (m) => { const e = new Error(m); e.statusCode = 400; return e; };
  const type = b.type === "income" ? "income" : b.type === "expense" ? "expense" : null;
  if (!type) throw bad("type inválido (income|expense)");
  const amount = Number(b.amount);
  if (!(amount > 0)) throw bad("amount inválido");
  if (!b.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(b.date))) throw bad("date inválida (YYYY-MM-DD)");
  const desc = String(b.desc || "").trim().slice(0, 120);
  if (!desc) throw bad("desc obrigatória");
  const category = String(b.category || (type === "income" ? "outros_in" : "outros_out")).slice(0, 40);
  return { type, desc, amount: Math.round(amount * 100) / 100, date: b.date, category };
}

// Converte a chave interna (userId/txId) para o formato do app (id).
function strip(item) {
  const { userId, txId, ...rest } = item;
  return { id: txId, ...rest };
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
