import crypto from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { modules, getModule, getActivity } from "../../data/game-content.js";
import {
  MODULE_IDS,
  applyScore,
  computeRanking,
  createModuleScore,
  createTeamScores,
  ensureTeamScore,
  evaluateAnswer,
  findClaimItem,
  findQuestion,
  getActivityItemCount,
  getQuestionPoints,
  makeAttemptKey,
  makeClaimKey,
  normalizeCompact,
  normalizeText,
  publicModuleCatalog,
  sanitizeText
} from "../../assets/js/scoring.js";

const STORE_NAME = "arena-sl-sessions";
const LOCAL_STORE_PATH = process.env.ARENA_LOCAL_STORE_PATH || join(tmpdir(), "arena-sl-treinamentos", "arena-sl-dev-store.json");
const MAX_HISTORY = 140;
const MAX_REQUEST_LOG = 500;
let localStorageQueue = Promise.resolve();

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(status, payload) {
  return {
    statusCode: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(payload)
  };
}

function ok(data, status = 200) {
  return json(status, { ok: true, data });
}

function fail(error) {
  console.error("API error", {
    name: error?.name,
    message: error?.message,
    stack: error?.stack
  });
  if (!(error instanceof HttpError) || error.status >= 500) {
    return json(500, { ok: false, error: { code: "internal_error", message: "Erro interno da API." } });
  }

  const status = error instanceof HttpError ? error.status : 500;
  const code = error instanceof HttpError ? error.code : "internal_error";
  const message = error instanceof HttpError ? error.message : "Erro interno da API.";
  return json(status, { ok: false, error: { code, message } });
}

function toWebResponse(response) {
  return new Response(response.statusCode === 204 ? null : response.body, {
    status: response.statusCode,
    headers: response.headers || {}
  });
}

async function toLegacyEvent(request) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  return {
    httpMethod: method,
    path: url.pathname,
    rawUrl: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body: hasBody ? await request.text() : "",
    isBase64Encoded: false
  };
}

function nowIso() {
  return new Date().toISOString();
}

function randomToken(prefix) {
  return `${prefix}_${crypto.randomBytes(24).toString("base64url")}`;
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function shortId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("base64url")}`;
}

function normalizeCode(code) {
  return sanitizeText(code, 12).toUpperCase().replace(/\s+/g, "");
}

function sessionKey(code) {
  return `session:${normalizeCode(code)}`;
}

function parseRoute(event) {
  const method = event.httpMethod || "GET";
  let path = event.path || "/";
  path = path.replace(/^\/\.netlify\/functions\/api\/?/, "/api/");
  path = path.replace(/^\/\.netlify\/functions\/api$/, "/api");
  path = path.replace(/^\/api\/?/, "/");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { method, parts };
}

function bodyJson(event) {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "invalid_json", "O corpo da requisição precisa ser JSON válido.");
  }
}

function getHeader(event, name) {
  const headers = event.headers || {};
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  return found ? headers[found] : "";
}

function requireIdempotency(payload) {
  const key = sanitizeText(payload.idempotencyKey, 90);
  if (!key || key.length < 8) {
    throw new HttpError(400, "missing_idempotency_key", "Envie uma idempotencyKey válida para evitar pontuação duplicada.");
  }
  return key;
}

function makeSession(className, moduleId, code) {
  const instructorToken = randomToken("inst");
  const at = nowIso();
  return {
    id: shortId("sess"),
    code,
    className,
    instructorTokenHash: tokenHash(instructorToken),
    activeModule: MODULE_IDS.includes(moduleId) ? moduleId : "nr23",
    activeActivityId: null,
    activityStatus: "waiting",
    status: "open",
    teams: [],
    claims: {},
    attempts: {},
    achievements: {},
    revealedHints: {},
    requestLog: {},
    history: [],
    createdAt: at,
    updatedAt: at,
    version: 1,
    _plainInstructorToken: instructorToken
  };
}

function publicTeam(team) {
  return {
    id: team.id,
    name: team.name,
    members: team.members,
    color: team.color,
    symbol: team.symbol,
    joinedAt: team.joinedAt,
    lastSeenAt: team.lastSeenAt,
    scores: team.scores
  };
}

function authInstructor(session, event, payload = {}) {
  const token = payload.instructorToken || getHeader(event, "x-instructor-token");
  if (!token || tokenHash(token) !== session.instructorTokenHash) {
    throw new HttpError(401, "invalid_instructor_token", "Token do instrutor inválido ou ausente.");
  }
}

function findTeamByToken(session, event, payload = {}) {
  const token = payload.teamToken || getHeader(event, "x-team-token");
  if (!token) return null;
  const hash = tokenHash(token);
  return session.teams.find((team) => team.teamTokenHash === hash) || null;
}

function requireTeam(session, event, payload = {}) {
  const team = findTeamByToken(session, event, payload);
  if (!team) throw new HttpError(401, "invalid_team_token", "Equipe não identificada nesta sessão.");
  team.lastSeenAt = nowIso();
  return team;
}

function assertPlayable(session, moduleId, activityId) {
  if (session.status !== "open") throw new HttpError(409, "session_closed", "A sessão está encerrada.");
  if (session.activeModule !== moduleId || session.activeActivityId !== activityId) {
    throw new HttpError(409, "activity_not_active", "Esta atividade não está liberada no momento.");
  }
  if (session.activityStatus !== "open") {
    throw new HttpError(409, "activity_not_open", "A atividade está pausada ou encerrada.");
  }
}

function pushHistory(session, entry) {
  session.history.unshift({
    id: entry.id || shortId("hist"),
    at: entry.at || nowIso(),
    moduleId: entry.moduleId || session.activeModule,
    activityId: entry.activityId || session.activeActivityId,
    teamId: entry.teamId || null,
    teamName: entry.teamName || null,
    action: entry.action,
    points: Number(entry.points || 0),
    attemptId: entry.attemptId || null,
    detail: entry.detail || ""
  });
  session.history = session.history.slice(0, MAX_HISTORY);
}

function pruneRequestLog(session) {
  const entries = Object.entries(session.requestLog || {});
  if (entries.length <= MAX_REQUEST_LOG) return;
  session.requestLog = Object.fromEntries(entries.slice(entries.length - MAX_REQUEST_LOG));
}

function progressForTeam(session, team, moduleId) {
  const module = getModule(moduleId);
  const moduleAttempts = Object.entries(session.attempts || {}).filter(([key, value]) => key.startsWith(`${team.id}:${moduleId}:`) && value.final);
  const moduleClaims = Object.values(session.claims || {}).filter((claim) => claim.moduleId === moduleId && claim.teamId === team.id && ["word-search", "crossword"].includes(claim.kind));
  const completed = moduleAttempts.length + moduleClaims.length;
  const total = module.activities.reduce((sum, activity) => sum + getActivityItemCount(activity), 0);
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0
  };
}

function publicClaims(session) {
  const output = {};
  for (const [key, claim] of Object.entries(session.claims || {})) {
    output[key] = {
      moduleId: claim.moduleId,
      activityId: claim.activityId,
      itemId: claim.itemId,
      teamId: claim.teamId,
      teamName: claim.teamName,
      at: claim.at
    };
  }
  return output;
}

function publicSession(session, event = {}, payload = {}) {
  const team = findTeamByToken(session, event, payload);
  const includeHint = Boolean(session.revealedHints?.[session.activeActivityId]);
  const activeModule = getModule(session.activeModule);
  const catalog = publicModuleCatalog(activeModule, {
    teamSeed: team?.id || session.code,
    includeHint
  });
  const teams = session.teams.map(publicTeam);
  const rankings = Object.fromEntries(MODULE_IDS.map((moduleId) => [moduleId, computeRanking(session.teams, moduleId)]));
  const progress = Object.fromEntries(session.teams.map((item) => [item.id, progressForTeam(session, item, session.activeModule)]));
  const myAttempts = team
    ? Object.fromEntries(
      Object.entries(session.attempts || {})
        .filter(([key]) => key.startsWith(`${team.id}:`))
        .map(([key, value]) => [key.replace(`${team.id}:`, ""), value])
    )
    : {};

  return {
    id: session.id,
    code: session.code,
    className: session.className,
    activeModule: session.activeModule,
    activeActivityId: session.activeActivityId,
    activityStatus: session.activityStatus,
    status: session.status,
    teams,
    rankings,
    ranking: rankings[session.activeModule],
    claims: publicClaims(session),
    progress,
    myAttempts,
    catalog,
    history: session.history.slice(0, 35),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    serverTime: nowIso(),
    currentTeamId: team?.id || null
  };
}

function resetModule(session, moduleId) {
  for (const team of session.teams) {
    team.scores[moduleId] = createModuleScore();
  }
  for (const key of Object.keys(session.attempts)) {
    if (key.includes(`:${moduleId}:`)) delete session.attempts[key];
  }
  for (const key of Object.keys(session.claims)) {
    if (key.startsWith(`${moduleId}:`)) delete session.claims[key];
  }
}

function resetCompetition(session) {
  for (const team of session.teams) team.scores = createTeamScores();
  session.claims = {};
  session.attempts = {};
  session.achievements = {};
  session.requestLog = {};
  session.history = [];
  session.activeActivityId = null;
  session.activityStatus = "waiting";
  session.status = "open";
}

async function mutateSession(storage, code, mutator) {
  const key = sessionKey(code);
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const loaded = await storage.get(key);
    if (!loaded.data) throw new HttpError(404, "session_not_found", "Sessão não encontrada.");
    const session = loaded.data;
    const result = await mutator(session);
    if (result?.noSave) return result;
    pruneRequestLog(session);
    session.updatedAt = nowIso();
    session.version = Number(session.version || 0) + 1;
    const saved = await storage.set(key, session, loaded.etag);
    if (saved.modified !== false) return result;
  }
  throw new HttpError(409, "write_conflict", "Não foi possível gravar a sessão por concorrência. Tente novamente.");
}

function idempotent(session, team, idempotencyKey, executor) {
  const requestKey = `${team.id}:${idempotencyKey}`;
  if (session.requestLog?.[requestKey]) {
    return { ...session.requestLog[requestKey], noSave: true };
  }
  const response = executor(requestKey);
  session.requestLog[requestKey] = {
    status: response.status || 200,
    body: response.body
  };
  return response;
}

function answerRoute(session, event, payload) {
  const team = requireTeam(session, event, payload);
  const idempotencyKey = requireIdempotency(payload);
  const moduleId = sanitizeText(payload.moduleId, 24);
  const activityId = sanitizeText(payload.activityId, 80);
  const activity = getActivity(moduleId, activityId);
  if (!activity) throw new HttpError(404, "activity_not_found", "Atividade não encontrada.");
  assertPlayable(session, moduleId, activityId);

  return idempotent(session, team, idempotencyKey, () => {
    const question = findQuestion(activity, payload.questionId);
    if (!question) throw new HttpError(400, "question_not_found", "Questão inválida para esta atividade.");
    const attemptKey = `${team.id}:${makeAttemptKey(moduleId, activityId, question.id)}`;
    const current = session.attempts[attemptKey] || { attempts: 0, final: false, correct: false };
    if (current.final) {
      throw new HttpError(409, "already_answered", "Esta questão já foi finalizada pela equipe.");
    }

    const maxAttempts = activity.maxAttempts || (activity.type === "fill-blank" ? 2 : 1);
    if (current.attempts >= maxAttempts) {
      throw new HttpError(409, "attempt_limit", "Limite de tentativas atingido.");
    }

    const startedAt = Number(payload.startedAt || Date.now());
    const responseMs = Math.max(0, Date.now() - startedAt);
    const evaluated = evaluateAnswer(activity, payload);
    if (!evaluated.ok) throw new HttpError(400, "invalid_answer", evaluated.error);

    current.attempts += 1;
    current.correct = Boolean(evaluated.correct);
    current.final = evaluated.correct || current.attempts >= maxAttempts;
    current.lastAt = nowIso();
    current.explanation = evaluated.explanation;
    current.expected = current.final ? evaluated.expected : null;
    session.attempts[attemptKey] = current;

    let points = 0;
    let bonus = 0;
    if (evaluated.correct) {
      points = getQuestionPoints(activity, true);
      if (activity.type === "emergency") {
        const firstKey = makeClaimKey(moduleId, activityId, question.id);
        if (!session.claims[firstKey]) {
          bonus = Number(activity.firstBonus || 0);
          session.claims[firstKey] = {
            moduleId,
            activityId,
            itemId: question.id,
            teamId: team.id,
            teamName: team.name,
            at: nowIso(),
            kind: "first_emergency"
          };
        }
      }
    }

    const finalPoints = points + bonus;
    const isFinalWrong = current.final && !evaluated.correct;
    if (evaluated.correct || isFinalWrong) {
      applyScore(team, moduleId, {
        points: finalPoints,
        correct: evaluated.correct ? 1 : 0,
        wrong: evaluated.correct ? 0 : 1,
        completed: 1,
        responseMs
      });
      pushHistory(session, {
        moduleId,
        activityId,
        teamId: team.id,
        teamName: team.name,
        action: evaluated.correct ? "Resposta correta" : "Resposta incorreta",
        points: finalPoints,
        attemptId: idempotencyKey,
        detail: question.prompt || question.statement || question.id
      });
    } else if (!evaluated.correct) {
      applyScore(team, moduleId, { wrong: 1, responseMs });
      pushHistory(session, {
        moduleId,
        activityId,
        teamId: team.id,
        teamName: team.name,
        action: "Tentativa incorreta",
        points: 0,
        attemptId: idempotencyKey,
        detail: question.prompt || question.statement || question.id
      });
    }

    return {
      body: {
        result: evaluated.correct ? "correct" : "wrong",
        correct: evaluated.correct,
        final: current.final,
        attempts: current.attempts,
        maxAttempts,
        points: finalPoints,
        bonus,
        explanation: evaluated.explanation,
        expected: current.final ? evaluated.expected : null,
        session: publicSession(session, event, payload)
      }
    };
  });
}

function claimRoute(session, event, payload) {
  const team = requireTeam(session, event, payload);
  const idempotencyKey = requireIdempotency(payload);
  const moduleId = sanitizeText(payload.moduleId, 24);
  const activityId = sanitizeText(payload.activityId, 80);
  const itemId = sanitizeText(payload.itemId, 80);
  const activity = getActivity(moduleId, activityId);
  if (!activity) throw new HttpError(404, "activity_not_found", "Atividade não encontrada.");
  if (!["word-search", "crossword"].includes(activity.type)) {
    throw new HttpError(400, "invalid_claim_activity", "Esta atividade não usa conquista competitiva.");
  }
  assertPlayable(session, moduleId, activityId);

  return idempotent(session, team, idempotencyKey, () => {
    const item = findClaimItem(activity, itemId);
    if (!item) throw new HttpError(400, "claim_item_not_found", "Item competitivo inválido.");
    const claimKey = makeClaimKey(moduleId, activityId, itemId);
    const previous = session.claims[claimKey];
    if (previous) {
      return {
        status: 409,
        body: {
          result: "already_claimed",
          winner: previous.teamName,
          points: 0,
          session: publicSession(session, event, payload)
        }
      };
    }

    const submitted = normalizeCompact(payload.answer || payload.submittedWord);
    const expected = normalizeCompact(item.answer || item.term);
    if (submitted !== expected) {
      applyScore(team, moduleId, { wrong: 1, responseMs: Math.max(0, Date.now() - Number(payload.startedAt || Date.now())) });
      pushHistory(session, {
        moduleId,
        activityId,
        teamId: team.id,
        teamName: team.name,
        action: "Tentativa incorreta",
        points: 0,
        attemptId: idempotencyKey,
        detail: item.clue || itemId
      });
      return {
        body: {
          result: "wrong",
          correct: false,
          points: 0,
          explanation: "Resposta não confere com o item selecionado.",
          session: publicSession(session, event, payload)
        }
      };
    }

    const at = nowIso();
    session.claims[claimKey] = {
      moduleId,
      activityId,
      itemId,
      teamId: team.id,
      teamName: team.name,
      at,
      kind: activity.type
    };
    applyScore(team, moduleId, {
      points: activity.points,
      correct: 1,
      completed: 1,
      responseMs: Math.max(0, Date.now() - Number(payload.startedAt || Date.now())),
      at
    });
    pushHistory(session, {
      moduleId,
      activityId,
      teamId: team.id,
      teamName: team.name,
      action: "Conquista competitiva",
      points: activity.points,
      attemptId: idempotencyKey,
      detail: item.term || item.answer || itemId
    });
    return {
      body: {
        result: "claimed",
        correct: true,
        points: activity.points,
        winner: team.name,
        session: publicSession(session, event, payload)
      }
    };
  });
}

async function route(storage, event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: {}, body: "" };
  const { method, parts } = parseRoute(event);
  const payload = method === "GET" || method === "DELETE" ? {} : bodyJson(event);

  if (method === "GET" && parts[0] === "health") {
    return ok({ status: "online", storage: storage.kind || "memory", store: STORE_NAME, at: nowIso() });
  }

  if (method === "GET" && parts.length === 0) {
    return ok({ service: "ARENA SL API", routes: ["health", "sessions"] });
  }

  if (method === "POST" && parts[0] === "sessions" && parts.length === 1) {
    const className = sanitizeText(payload.className, 80);
    if (className.length < 3) throw new HttpError(400, "invalid_class_name", "Informe o nome da turma com pelo menos 3 caracteres.");
    let created = null;
    for (let tries = 0; tries < 20; tries += 1) {
      const code = `BRG-${crypto.randomInt(1000, 10000)}`;
      const session = makeSession(className, payload.moduleId, code);
      const instructorToken = session._plainInstructorToken;
      delete session._plainInstructorToken;
      const saved = await storage.create(sessionKey(code), session);
      if (saved.modified !== false) {
        created = { session, instructorToken };
        break;
      }
    }
    if (!created) throw new HttpError(409, "code_collision", "Não foi possível gerar código único de sessão.");
    return ok({ session: publicSession(created.session, event, payload), instructorToken: created.instructorToken }, 201);
  }

  if (parts[0] !== "sessions" || !parts[1]) {
    throw new HttpError(404, "route_not_found", "Rota não encontrada.");
  }

  const code = normalizeCode(parts[1]);

  if (method === "GET" && parts.length === 2) {
    const loaded = await storage.get(sessionKey(code));
    if (!loaded.data) throw new HttpError(404, "session_not_found", "Sessão não encontrada.");
    return ok({ session: publicSession(loaded.data, event, payload) });
  }

  if (method === "POST" && parts[2] === "join") {
    const result = await mutateSession(storage, code, (session) => {
      if (session.status !== "open") throw new HttpError(409, "session_closed", "A sessão está encerrada.");
      const name = sanitizeText(payload.name, 50);
      if (name.length < 2) throw new HttpError(400, "invalid_team_name", "Informe o nome da equipe.");
      const existing = session.teams.find((team) => normalizeText(team.name) === normalizeText(name));
      if (existing) throw new HttpError(409, "duplicate_team_name", "Já existe uma equipe com esse nome nesta sessão.");
      const token = randomToken("team");
      const team = {
        id: shortId("team"),
        teamTokenHash: tokenHash(token),
        name,
        members: sanitizeText(payload.members, 160),
        color: sanitizeText(payload.color, 20) || "#e23a34",
        symbol: sanitizeText(payload.symbol, 4) || "A",
        scores: createTeamScores(),
        joinedAt: nowIso(),
        lastSeenAt: nowIso()
      };
      session.teams.push(team);
      pushHistory(session, {
        action: "Equipe entrou",
        teamId: team.id,
        teamName: team.name,
        points: 0,
        detail: "Entrada confirmada na sessão"
      });
      return { body: { team: publicTeam(team), teamToken: token, session: publicSession(session, event, { teamToken: token }) }, status: 201 };
    });
    return ok(result.body, result.status || 200);
  }

  if (method === "POST" && parts[2] === "activity") {
    const result = await mutateSession(storage, code, (session) => {
      authInstructor(session, event, payload);
      const action = sanitizeText(payload.action, 30);
      if (action === "module") {
        const moduleId = MODULE_IDS.includes(payload.moduleId) ? payload.moduleId : "nr23";
        session.activeModule = moduleId;
        session.activeActivityId = null;
        session.activityStatus = "waiting";
      } else if (["select", "open"].includes(action)) {
        const moduleId = MODULE_IDS.includes(payload.moduleId) ? payload.moduleId : session.activeModule;
        const activityId = sanitizeText(payload.activityId, 80);
        if (!getActivity(moduleId, activityId)) throw new HttpError(400, "activity_not_found", "Atividade inválida.");
        session.activeModule = moduleId;
        session.activeActivityId = activityId;
        session.activityStatus = action === "open" ? "open" : "selected";
      } else if (action === "pause") {
        if (!session.activeActivityId) throw new HttpError(409, "no_activity", "Nenhuma atividade selecionada.");
        session.activityStatus = "paused";
      } else if (action === "close") {
        session.activityStatus = "closed";
      } else if (action === "hint") {
        if (!session.activeActivityId) throw new HttpError(409, "no_activity", "Nenhuma atividade selecionada.");
        session.revealedHints[session.activeActivityId] = true;
      } else if (action === "reset-ranking") {
        resetModule(session, session.activeModule);
        pushHistory(session, { action: "Ranking zerado", points: 0, detail: getModule(session.activeModule).title });
      } else if (action === "restart") {
        resetCompetition(session);
        pushHistory(session, { action: "Competição reiniciada", points: 0, detail: "Sessão mantida com equipes cadastradas" });
      } else {
        throw new HttpError(400, "invalid_action", "Ação de atividade inválida.");
      }
      return { body: { session: publicSession(session, event, payload) } };
    });
    return ok(result.body, result.status || 200);
  }

  if (method === "POST" && parts[2] === "answer") {
    const result = await mutateSession(storage, code, (session) => answerRoute(session, event, payload));
    return ok(result.body, result.status || 200);
  }

  if (method === "POST" && parts[2] === "claim") {
    const result = await mutateSession(storage, code, (session) => claimRoute(session, event, payload));
    return ok(result.body, result.status || 200);
  }

  if (method === "POST" && parts[2] === "score") {
    const result = await mutateSession(storage, code, (session) => {
      authInstructor(session, event, payload);
      const team = session.teams.find((item) => item.id === payload.teamId);
      if (!team) throw new HttpError(404, "team_not_found", "Equipe não encontrada.");
      const rawPoints = Number(payload.points);
      if (!Number.isFinite(rawPoints) || rawPoints === 0 || Math.abs(rawPoints) > 100) {
        throw new HttpError(400, "invalid_points", "Informe pontos entre -100 e 100, sem zero.");
      }
      applyScore(team, session.activeModule, { points: rawPoints });
      pushHistory(session, {
        action: rawPoints > 0 ? "Bônus manual" : "Penalidade manual",
        teamId: team.id,
        teamName: team.name,
        points: rawPoints,
        detail: sanitizeText(payload.reason, 100) || "Ajuste do instrutor"
      });
      return { body: { session: publicSession(session, event, payload) } };
    });
    return ok(result.body, result.status || 200);
  }

  if (method === "POST" && parts[2] === "reset") {
    const result = await mutateSession(storage, code, (session) => {
      authInstructor(session, event, payload);
      resetCompetition(session);
      return { body: { session: publicSession(session, event, payload) } };
    });
    return ok(result.body);
  }

  if (method === "POST" && parts[2] === "finish") {
    const result = await mutateSession(storage, code, (session) => {
      authInstructor(session, event, payload);
      session.status = "finished";
      session.activityStatus = "closed";
      pushHistory(session, { action: "Sessão encerrada", points: 0, detail: "Instrutor encerrou a sessão" });
      return { body: { session: publicSession(session, event, payload) } };
    });
    return ok(result.body);
  }

  if (method === "DELETE" && parts.length === 2) {
    const loaded = await storage.get(sessionKey(code));
    if (!loaded.data) throw new HttpError(404, "session_not_found", "Sessão não encontrada.");
    authInstructor(loaded.data, event, payload);
    await storage.delete(sessionKey(code));
    return ok({ deleted: true, code });
  }

  throw new HttpError(404, "route_not_found", "Rota não encontrada.");
}

export function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial).map(([key, value]) => [key, { value, etag: shortId("etag") }]));
  return {
    async get(key) {
      const entry = data.get(key);
      return entry ? { data: structuredClone(entry.value), etag: entry.etag } : { data: null, etag: null };
    },
    async create(key, value) {
      if (data.has(key)) return { modified: false };
      data.set(key, { value: structuredClone(value), etag: shortId("etag") });
      return { modified: true };
    },
    async set(key, value, etag) {
      const entry = data.get(key);
      if (!entry) return { modified: false };
      if (etag && entry.etag !== etag) return { modified: false };
      data.set(key, { value: structuredClone(value), etag: shortId("etag") });
      return { modified: true };
    },
    async delete(key) {
      data.delete(key);
      return { modified: true };
    }
  };
}

async function createLocalFileStorage() {
  async function withLocalLock(task) {
    const previous = localStorageQueue;
    let release;
    localStorageQueue = new Promise((resolve) => { release = resolve; });
    await previous.catch(() => {});
    try {
      return await task();
    } finally {
      release();
    }
  }

  async function readAll() {
    try {
      return JSON.parse(await readFile(LOCAL_STORE_PATH, "utf8"));
    } catch {
      return {};
    }
  }
  async function writeAll(value) {
    await mkdir(dirname(LOCAL_STORE_PATH), { recursive: true });
    await writeFile(LOCAL_STORE_PATH, JSON.stringify(value, null, 2), "utf8");
  }
  return {
    kind: "local-file",
    async get(key) {
      return withLocalLock(async () => {
        const all = await readAll();
        const entry = all[key];
        return entry ? { data: entry.value, etag: entry.etag } : { data: null, etag: null };
      });
    },
    async create(key, value) {
      return withLocalLock(async () => {
        const all = await readAll();
        if (all[key]) return { modified: false };
        all[key] = { value, etag: shortId("etag") };
        await writeAll(all);
        return { modified: true };
      });
    },
    async set(key, value, etag) {
      return withLocalLock(async () => {
        const all = await readAll();
        if (!all[key]) return { modified: false };
        if (etag && all[key].etag !== etag) return { modified: false };
        all[key] = { value, etag: shortId("etag") };
        await writeAll(all);
        return { modified: true };
      });
    },
    async delete(key) {
      return withLocalLock(async () => {
        const all = await readAll();
        delete all[key];
        await writeAll(all);
        if (!Object.keys(all).length) {
          try { await unlink(LOCAL_STORE_PATH); } catch {}
        }
        return { modified: true };
      });
    }
  };
}

function isBlobPreconditionError(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status);
  if (status === 412) return true;

  const code = String(error?.code || error?.cause?.code || "");
  if (code === "PRECONDITION_FAILED" || code === "ERR_PRECONDITION_FAILED") return true;

  const message = String(error?.message || "");
  return error?.name === "BlobsInternalError" && (message.includes("412") || /pre.?condition/i.test(message));
}

function blobWriteResult(result) {
  return { modified: result?.modified !== false };
}

export function createNetlifyBlobStorage(store) {
  return {
    kind: "netlify-blobs",
    async get(key) {
      const entry = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
      if (!entry || entry.data === null) return { data: null, etag: null };
      return { data: entry.data, etag: entry.etag };
    },
    async create(key, value) {
      try {
        const result = await store.setJSON(key, value, { onlyIfNew: true });
        return blobWriteResult(result);
      } catch (error) {
        if (isBlobPreconditionError(error)) return { modified: false };
        throw error;
      }
    },
    async set(key, value, etag) {
      try {
        const result = await store.setJSON(key, value, etag ? { onlyIfMatch: etag } : undefined);
        return blobWriteResult(result);
      } catch (error) {
        if (isBlobPreconditionError(error)) return { modified: false };
        throw error;
      }
    },
    async delete(key) {
      await store.delete(key);
      return { modified: true };
    }
  };
}

async function createBlobStorage() {
  if (process.env.NETLIFY_DEV === "true" || process.env.ARENA_LOCAL_STORE === "1" || process.env.NODE_ENV === "test") {
    return createLocalFileStorage();
  }
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    return createNetlifyBlobStorage(store);
  } catch (error) {
    if (error?.name === "MissingBlobsEnvironmentError") {
      throw new HttpError(
        500,
        "blobs_environment_missing",
        "Netlify Blobs não foi inicializado pelo runtime da Function. Use a Function moderna com default export e Request/Response no deploy Netlify."
      );
    }
    throw error;
  }
}

export function createApi(storage) {
  return async (event) => {
    try {
      return await route(storage, event);
    } catch (error) {
      return fail(error);
    }
  };
}

export default async function handler(request, context) {
  try {
    const event = await toLegacyEvent(request);
    const storage = await createBlobStorage();
    const response = await createApi(storage)(event, context);
    return toWebResponse(response);
  } catch (error) {
    return toWebResponse(fail(error));
  }
}

export const contentModules = modules;
