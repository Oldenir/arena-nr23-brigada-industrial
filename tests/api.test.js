import test from "node:test";
import assert from "node:assert/strict";
import { createApi, createMemoryStorage } from "../netlify/functions/api.js";

function makeCaller() {
  const api = createApi(createMemoryStorage());
  return async function call(method, path, body, headers = {}) {
    const response = await api({
      httpMethod: method,
      path,
      headers,
      body: body ? JSON.stringify(body) : ""
    });
    const payload = response.body ? JSON.parse(response.body) : {};
    return { status: response.statusCode, payload };
  };
}

async function createSession(call) {
  const created = await call("POST", "/api/sessions", { className: "Turma Teste", moduleId: "nr23" });
  assert.equal(created.status, 201);
  return {
    code: created.payload.data.session.code,
    instructorToken: created.payload.data.instructorToken
  };
}

async function join(call, code, name) {
  const joined = await call("POST", `/api/sessions/${code}/join`, { name, color: "#e23a34", symbol: name[0] });
  assert.equal(joined.status, 201);
  return {
    team: joined.payload.data.team,
    teamToken: joined.payload.data.teamToken
  };
}

test("cria sessão e impede nome de equipe duplicado", async () => {
  const call = makeCaller();
  const { code } = await createSession(call);
  await join(call, code, "Alfa");
  const duplicate = await call("POST", `/api/sessions/${code}/join`, { name: " alfa " });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.payload.ok, false);
});

test("bloqueia palavra competitiva para apenas uma equipe", async () => {
  const call = makeCaller();
  const { code, instructorToken } = await createSession(call);
  const alfa = await join(call, code, "Alfa");
  const bravo = await join(call, code, "Bravo");
  await call("POST", `/api/sessions/${code}/activity`, {
    action: "open",
    moduleId: "nr23",
    activityId: "word-search"
  }, { "x-instructor-token": instructorToken });

  const first = await call("POST", `/api/sessions/${code}/claim`, {
    moduleId: "nr23",
    activityId: "word-search",
    itemId: "brigada",
    answer: "BRIGADA",
    idempotencyKey: "word-claim-0001"
  }, { "x-team-token": alfa.teamToken });
  assert.equal(first.status, 200);
  assert.equal(first.payload.data.result, "claimed");

  const second = await call("POST", `/api/sessions/${code}/claim`, {
    moduleId: "nr23",
    activityId: "word-search",
    itemId: "brigada",
    answer: "BRIGADA",
    idempotencyKey: "word-claim-0002"
  }, { "x-team-token": bravo.teamToken });
  assert.equal(second.status, 409);
  assert.equal(second.payload.data.result, "already_claimed");
});

test("bloqueia resposta de cruzadinha já conquistada", async () => {
  const call = makeCaller();
  const { code, instructorToken } = await createSession(call);
  const alfa = await join(call, code, "Alfa");
  const bravo = await join(call, code, "Bravo");
  await call("POST", `/api/sessions/${code}/activity`, {
    action: "open",
    moduleId: "nr23",
    activityId: "crossword"
  }, { "x-instructor-token": instructorToken });

  const first = await call("POST", `/api/sessions/${code}/claim`, {
    moduleId: "nr23",
    activityId: "crossword",
    itemId: "calor",
    answer: "calor",
    idempotencyKey: "cross-claim-0001"
  }, { "x-team-token": alfa.teamToken });
  assert.equal(first.payload.data.result, "claimed");

  const second = await call("POST", `/api/sessions/${code}/claim`, {
    moduleId: "nr23",
    activityId: "crossword",
    itemId: "calor",
    answer: "calor",
    idempotencyKey: "cross-claim-0002"
  }, { "x-team-token": bravo.teamToken });
  assert.equal(second.status, 409);
  assert.equal(second.payload.data.result, "already_claimed");
});

test("idempotência evita pontuação duplicada e tentativa duplicada é recusada", async () => {
  const call = makeCaller();
  const { code, instructorToken } = await createSession(call);
  const alfa = await join(call, code, "Alfa");
  await call("POST", `/api/sessions/${code}/activity`, {
    action: "open",
    moduleId: "nr23",
    activityId: "true-false"
  }, { "x-instructor-token": instructorToken });

  const body = {
    moduleId: "nr23",
    activityId: "true-false",
    questionId: "vf-01",
    answer: true,
    idempotencyKey: "answer-idem-0001"
  };
  const first = await call("POST", `/api/sessions/${code}/answer`, body, { "x-team-token": alfa.teamToken });
  const again = await call("POST", `/api/sessions/${code}/answer`, body, { "x-team-token": alfa.teamToken });
  assert.equal(first.payload.data.points, 10);
  assert.equal(again.payload.data.points, 10);

  const duplicate = await call("POST", `/api/sessions/${code}/answer`, {
    ...body,
    idempotencyKey: "answer-idem-0002"
  }, { "x-team-token": alfa.teamToken });
  assert.equal(duplicate.status, 409);

  const state = await call("GET", `/api/sessions/${code}`, null, { "x-team-token": alfa.teamToken });
  assert.equal(state.payload.data.session.ranking[0].score.points, 10);
});

test("rankings de NR23 e primeiros socorros não se misturam", async () => {
  const call = makeCaller();
  const { code, instructorToken } = await createSession(call);
  const alfa = await join(call, code, "Alfa");
  await call("POST", `/api/sessions/${code}/activity`, {
    action: "open",
    moduleId: "first-aid",
    activityId: "aid-true-false"
  }, { "x-instructor-token": instructorToken });

  const answer = await call("POST", `/api/sessions/${code}/answer`, {
    moduleId: "first-aid",
    activityId: "aid-true-false",
    questionId: "aid-vf-01",
    answer: true,
    idempotencyKey: "aid-answer-0001"
  }, { "x-team-token": alfa.teamToken });
  assert.equal(answer.payload.data.points, 10);

  const state = answer.payload.data.session;
  assert.equal(state.rankings["first-aid"][0].score.points, 10);
  assert.equal(state.rankings.nr23[0].score.points, 0);
});
