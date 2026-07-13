import { api } from "./api.js";
import { getTeamCredential, saveTeamCredential } from "./state.js";
import { query, replaceQuery } from "./router.js";
import { renderRanking } from "./ranking.js";
import { $, describeError, escapeHTML, setStatus, toast } from "./utils.js";
import * as wordSearchActivity from "./activities/word-search.js";
import * as crosswordActivity from "./activities/crossword.js";
import * as trueFalseActivity from "./activities/true-false.js";
import * as fireClassActivity from "./activities/fire-class.js";
import * as extinguisherActivity from "./activities/extinguisher.js";
import * as fillBlankActivity from "./activities/fill-blank.js";
import * as safeSequenceActivity from "./activities/safe-sequence.js";
import * as inspectionActivity from "./activities/inspection.js";
import * as industrialEmergencyActivity from "./activities/industrial-emergency.js";
import * as firstAidActivity from "./activities/first-aid.js";

const renderers = {
  "word-search": wordSearchActivity,
  crossword: crosswordActivity,
  "true-false": trueFalseActivity,
  "fire-class": fireClassActivity,
  extinguisher: extinguisherActivity,
  "fill-blank": fillBlankActivity,
  "safe-sequence": safeSequenceActivity,
  inspection: inspectionActivity,
  "industrial-emergency": industrialEmergencyActivity
};

const identities = [
  ["#e23a34", "A"],
  ["#ffd24a", "B"],
  ["#2fb76e", "C"],
  ["#5fb3ff", "D"],
  ["#ff7a1a", "E"],
  ["#a78bfa", "F"],
  ["#ef5da8", "G"],
  ["#f7f8fa", "H"]
];

let code = "";
let teamToken = "";
let session = null;
let pollTimer = null;
const draftState = {};

init();

function init() {
  renderIdentityChoices();
  const params = query();
  code = normalizeCode(params.session || "");
  if (params.module) {
    $("#moduleLabel").textContent = params.module === "first-aid" ? "Primeiros Socorros" : "Brigada Industrial";
  }
  const codeInput = $("#joinForm [name='code']");
  if (code) codeInput.value = code;

  $("#joinForm").addEventListener("submit", join);

  if (code) {
    const credential = getTeamCredential(code);
    if (credential?.token) {
      teamToken = credential.token;
      sync(true);
      startPolling();
    }
  }
}

function renderIdentityChoices() {
  $("#identityChoices").innerHTML = identities.map(([color, symbol], index) => `
    <label>
      <input type="radio" name="identity" value="${color}|${symbol}" ${index === 0 ? "checked" : ""}>
      <span class="identity-token" style="background:${color}; color:${color === "#f7f8fa" ? "#111318" : "#fff"}">${symbol}</span>
    </label>
  `).join("");
}

async function join(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  code = normalizeCode(form.get("code"));
  const [color, symbol] = String(form.get("identity") || identities[0].join("|")).split("|");
  try {
    const data = await api.joinSession(code, {
      name: form.get("name"),
      members: form.get("members"),
      color,
      symbol
    });
    teamToken = data.teamToken;
    saveTeamCredential(code, data.team.id, teamToken);
    replaceQuery({ session: code });
    updateSession(data.session);
    startPolling();
    toast("Equipe conectada à sessão.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function sync(showErrors = false) {
  if (!code || !teamToken) return;
  setStatus($("#connectionStatus"), "", "sincronizando");
  try {
    const data = await api.getSession(code, { teamToken });
    updateSession(data.session);
    setStatus($("#connectionStatus"), "online", "conectado");
  } catch (error) {
    setStatus($("#connectionStatus"), "error", "erro ao sincronizar");
    if (showErrors) toast(describeError(error), "error");
  }
}

function startPolling() {
  window.clearInterval(pollTimer);
  pollTimer = window.setInterval(() => sync(false), 3000);
}

function updateSession(nextSession) {
  session = nextSession;
  $("#joinPanel").classList.add("hidden");
  $("#roomPanel").classList.remove("hidden");
  renderRoom();
}

function renderRoom() {
  if (!session) return;
  const team = session.teams.find((item) => item.id === session.currentTeamId);
  const moduleId = session.activeModule;
  const score = team?.scores?.[moduleId]?.points || 0;
  $("#moduleLabel").textContent = session.catalog.title;
  $("#teamName").textContent = team?.name || "Equipe";
  $("#sessionInfo").textContent = `${session.className} - ${session.code}`;
  $("#teamScore").textContent = score;
  $("#firstAidNotice").classList.toggle("hidden", moduleId !== "first-aid");
  renderRanking($("#ranking"), session.ranking);
  renderStage();
}

function renderStage() {
  const stage = $("#activeActivity");
  if (session.status !== "open") {
    clearAllDrafts();
    renderStageMessage(stage, "session-closed", "<h2>Sessão encerrada</h2><p>O instrutor encerrou esta sessão.</p>");
    return;
  }

  const activity = session.catalog.activities.find((item) => item.id === session.activeActivityId);
  if (!activity || session.activityStatus === "waiting") {
    renderStageMessage(stage, `waiting:${session.code}:${session.activeModule}`, "<h2>Sala de espera</h2><p>Aguarde o instrutor liberar uma atividade.</p>");
    return;
  }
  if (session.activityStatus === "paused") {
    renderStageMessage(stage, `paused:${activityRenderKey(session, activity)}`, `<h2>${escapeHTML(activity.title)}</h2><p>Atividade pausada pelo instrutor.</p>`);
    return;
  }
  if (session.activityStatus === "closed" || session.activityStatus === "selected") {
    renderStageMessage(stage, `selected:${activityRenderKey(session, activity)}`, `<h2>${escapeHTML(activity.title)}</h2><p>Aguardando liberação do instrutor.</p>`);
    return;
  }

  const renderer = renderers[activity.id] || (session.activeModule === "first-aid" ? firstAidActivity : null);
  if (!renderer?.renderActivity) {
    renderStageMessage(stage, `missing:${activity.id}`, "<h2>Atividade indisponível</h2><p>O módulo desta atividade não foi carregado.</p>");
    return;
  }

  const key = activityRenderKey(session, activity);
  const ctx = activityContext(stage, activity);
  if (stage.dataset.activityRenderKey !== key) {
    renderer.renderActivity(ctx);
    stage.dataset.activityRenderKey = key;
    stage.dataset.stageMessageKey = "";
    return;
  }
  renderer.updateActivity?.(ctx);
}

function renderStageMessage(stage, key, html) {
  if (stage.dataset.stageMessageKey === key) return;
  stage.dataset.stageMessageKey = key;
  stage.dataset.activityRenderKey = "";
  stage.innerHTML = html;
}

function activityContext(stage, activity) {
  return {
    root: stage,
    code,
    teamToken,
    session,
    moduleId: session.activeModule,
    activity,
    draftActivity: getActivityDraft(session.activeModule, activity.id),
    updateSession,
    clearQuestionDraft: (questionId) => clearQuestionDraft(session.activeModule, activity.id, questionId),
    clearActivityDraft: () => clearActivityDraft(session.activeModule, activity.id)
  };
}

function activityRenderKey(currentSession, activity) {
  return [
    currentSession.code,
    currentSession.activeModule,
    currentSession.activeActivityId,
    currentSession.activityStatus,
    activity?.id || "",
    activity?.type || "",
    activity?.hint || "",
    activity?.questions?.length || 0,
    activity?.words?.length || 0,
    activity?.entries?.length || 0
  ].join(":");
}

function getActivityDraft(moduleId, activityId) {
  draftState[moduleId] ||= {};
  draftState[moduleId][activityId] ||= {};
  return draftState[moduleId][activityId];
}

function clearQuestionDraft(moduleId, activityId, questionId) {
  if (draftState[moduleId]?.[activityId]) delete draftState[moduleId][activityId][questionId];
}

function clearActivityDraft(moduleId, activityId) {
  if (draftState[moduleId]) delete draftState[moduleId][activityId];
}

function clearAllDrafts() {
  for (const key of Object.keys(draftState)) delete draftState[key];
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}
