import test from "node:test";
import assert from "node:assert/strict";
import handler, { createApi, createMemoryStorage, createNetlifyBlobStorage } from "../netlify/functions/api.js";

function makeBlobStoreStub() {
  const data = new Map();
  let etagCounter = 0;
  const nextEtag = () => `etag-${++etagCounter}`;

  return {
    async getWithMetadata(key) {
      const entry = data.get(key);
      return entry ? { data: structuredClone(entry.value), etag: entry.etag, metadata: {} } : null;
    },
    async setJSON(key, value, options = {}) {
      const entry = data.get(key);
      if (options.onlyIfNew && entry) return { modified: false };
      if (options.onlyIfMatch && (!entry || entry.etag !== options.onlyIfMatch)) return { modified: false };
      const etag = nextEtag();
      data.set(key, { value: structuredClone(value), etag });
      return { modified: true, etag };
    },
    async delete(key) {
      data.delete(key);
    }
  };
}

test("adaptador Netlify Blobs normaliza writes condicionais", async () => {
  const storage = createNetlifyBlobStorage(makeBlobStoreStub());

  assert.deepEqual(await storage.create("session:BRG-0001", { className: "Turma A" }), { modified: true });
  assert.deepEqual(await storage.create("session:BRG-0001", { className: "Turma B" }), { modified: false });

  const loaded = await storage.get("session:BRG-0001");
  assert.equal(loaded.data.className, "Turma A");

  assert.deepEqual(await storage.set("session:BRG-0001", { className: "Turma C" }, loaded.etag), { modified: true });
  assert.deepEqual(await storage.set("session:BRG-0001", { className: "Turma D" }, loaded.etag), { modified: false });
  assert.deepEqual(await storage.delete("session:BRG-0001"), { modified: true });
});

test("adaptador Netlify Blobs trata apenas precondicao como conflito", async () => {
  const preconditionError = Object.assign(new Error("Netlify Blobs internal error (412 status code)"), {
    name: "BlobsInternalError"
  });
  const conflictStorage = createNetlifyBlobStorage({
    async getWithMetadata() {
      return null;
    },
    async setJSON() {
      throw preconditionError;
    },
    async delete() {}
  });
  assert.deepEqual(await conflictStorage.create("session:BRG-0001", {}), { modified: false });

  const realErrorStorage = createNetlifyBlobStorage({
    async getWithMetadata() {
      return null;
    },
    async setJSON() {
      throw new Error("boom");
    },
    async delete() {}
  });
  await assert.rejects(() => realErrorStorage.set("session:BRG-0001", {}, "etag-1"), /boom/);
});

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

test("health informa storage no contrato atual da API", async () => {
  const call = makeCaller();
  const health = await call("GET", "/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.payload.data.status, "online");
  assert.equal(health.payload.data.storage, "memory");
});

test("sessao criada pode ser recuperada, receber equipe e ser atualizada", async () => {
  const call = makeCaller();
  const created = await call("POST", "/api/sessions", { className: "Turma Teste", moduleId: "nr23" });
  assert.equal(created.status, 201);
  assert.match(created.payload.data.session.code, /^BRG-[A-Z0-9]{4}$/);
  assert.ok(created.payload.data.instructorToken);

  const code = created.payload.data.session.code;
  const instructorToken = created.payload.data.instructorToken;
  const loaded = await call("GET", `/api/sessions/${code}`);
  assert.equal(loaded.status, 200);
  assert.equal(loaded.payload.data.session.code, code);

  const alfa = await join(call, code, "Alfa");
  assert.equal(alfa.team.name, "Alfa");

  const activity = await call("POST", `/api/sessions/${code}/activity`, {
    action: "open",
    moduleId: "nr23",
    activityId: "fill-blank"
  }, { "x-instructor-token": instructorToken });
  assert.equal(activity.status, 200);
  assert.equal(activity.payload.data.session.activeActivityId, "fill-blank");
  assert.equal(activity.payload.data.session.teams.length, 1);
});

test("handler moderno responde Web Response para health", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  try {
    const response = await handler(new Request("https://arena-sl.test/api/health"), {});
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.data.status, "online");
    assert.equal(payload.data.storage, "local-file");
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
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

test("bloqueia claims simultâneos mesmo quando todos leem a mesma versão inicial", async () => {
  const storage = createMemoryStorage();
  const api = createApi({
    async get(key) {
      const result = await storage.get(key);
      if (key.startsWith("session:")) await new Promise((resolve) => setTimeout(resolve, 8));
      return result;
    },
    create: storage.create,
    async set(key, value, etag) {
      await new Promise((resolve) => setTimeout(resolve, 8));
      return storage.set(key, value, etag);
    },
    delete: storage.delete
  });
  async function call(method, path, body, headers = {}) {
    const response = await api({ httpMethod: method, path, headers, body: body ? JSON.stringify(body) : "" });
    return { status: response.statusCode, payload: response.body ? JSON.parse(response.body) : {} };
  }
  const { code, instructorToken } = await createSession(call);
  const alfa = await join(call, code, "Alfa");
  const bravo = await join(call, code, "Bravo");
  const charlie = await join(call, code, "Charlie");
  await call("POST", `/api/sessions/${code}/activity`, {
    action: "open",
    moduleId: "nr23",
    activityId: "word-search"
  }, { "x-instructor-token": instructorToken });

  const results = await Promise.all([alfa, bravo, charlie].map((team, index) => call("POST", `/api/sessions/${code}/claim`, {
    moduleId: "nr23",
    activityId: "word-search",
    itemId: "extintor",
    answer: "EXTINTOR",
    idempotencyKey: `simultaneous-${index}-0001`
  }, { "x-team-token": team.teamToken })));

  assert.equal(results.filter((result) => result.payload.data?.result === "claimed").length, 1);
  const state = await call("GET", `/api/sessions/${code}`, null, { "x-team-token": alfa.teamToken });
  assert.equal(Object.keys(state.payload.data.session.claims).length, 1);
  assert.equal(state.payload.data.session.history.filter((item) => item.action === "Conquista competitiva").length, 1);
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

test("protege comandos administrativos e atividade inativa", async () => {
  const call = makeCaller();
  const { code, instructorToken } = await createSession(call);
  const alfa = await join(call, code, "Alfa");

  const noAdmin = await call("POST", `/api/sessions/${code}/score`, {
    teamId: alfa.team.id,
    points: 50
  }, { "x-team-token": alfa.teamToken });
  assert.equal(noAdmin.status, 401);

  const inactive = await call("POST", `/api/sessions/${code}/answer`, {
    moduleId: "nr23",
    activityId: "true-false",
    questionId: "vf-01",
    answer: true,
    idempotencyKey: "inactive-answer-0001"
  }, { "x-team-token": alfa.teamToken });
  assert.equal(inactive.status, 409);

  const wrongToken = await call("POST", `/api/sessions/${code}/activity`, {
    action: "open",
    moduleId: "nr23",
    activityId: "true-false"
  }, { "x-instructor-token": `${instructorToken}-errado` });
  assert.equal(wrongToken.status, 401);
});

test("histórico acompanha soma de pontuação do ranking", async () => {
  const call = makeCaller();
  const { code, instructorToken } = await createSession(call);
  const alfa = await join(call, code, "Alfa");
  await call("POST", `/api/sessions/${code}/activity`, {
    action: "open",
    moduleId: "nr23",
    activityId: "true-false"
  }, { "x-instructor-token": instructorToken });
  await call("POST", `/api/sessions/${code}/answer`, {
    moduleId: "nr23",
    activityId: "true-false",
    questionId: "vf-01",
    answer: true,
    idempotencyKey: "history-sum-0001"
  }, { "x-team-token": alfa.teamToken });
  await call("POST", `/api/sessions/${code}/score`, {
    teamId: alfa.team.id,
    points: -3,
    reason: "Penalidade de teste"
  }, { "x-instructor-token": instructorToken });

  const state = await call("GET", `/api/sessions/${code}`, null, { "x-team-token": alfa.teamToken });
  const session = state.payload.data.session;
  const historyTotal = session.history
    .filter((item) => item.teamId === alfa.team.id && item.moduleId === "nr23")
    .reduce((sum, item) => sum + item.points, 0);
  assert.equal(session.rankings.nr23[0].score.points, historyTotal);
});
