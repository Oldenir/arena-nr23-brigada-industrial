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
  const previousSession = session;
  session = nextSession;
  clearDraftForActivitySwitch(previousSession, nextSession);
  $("#joinPanel").classList.add("hidden");
  $("#roomPanel").classList.remove("hidden");
  renderRoom();
}

function renderRoom() {
  if (!session) return;
  updateTeamHeader();
  updateProgress();
  updateRankingPanel();
  renderActivityShell();
}

function updateTeamHeader() {
  const team = session.teams.find((item) => item.id === session.currentTeamId);
  const moduleId = session.activeModule;
  const score = team?.scores?.[moduleId]?.points || 0;
  $("#moduleLabel").textContent = session.catalog.title;
  $("#teamName").textContent = team?.name || "Equipe";
  $("#sessionInfo").textContent = `${session.className} - ${session.code}`;
  $("#teamScore").textContent = score;
}

function updateProgress() {
  const moduleId = session.activeModule;
  $("#firstAidNotice").classList.toggle("hidden", moduleId !== "first-aid");
}

function updateRankingPanel() {
  renderRanking($("#ranking"), session.ranking);
}

function renderActivityShell() {
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
    renderStageMessage(stage, `paused:${activityRenderKey(session)}`, `<h2>${escapeHTML(activity.title)}</h2><p>Atividade pausada pelo instrutor.</p>`);
    return;
  }
  if (session.activityStatus === "closed" || session.activityStatus === "selected") {
    renderStageMessage(stage, `selected:${activityRenderKey(session)}`, `<h2>${escapeHTML(activity.title)}</h2><p>Aguardando liberação do instrutor.</p>`);
    return;
  }

  const renderer = renderers[activity.id] || (session.activeModule === "first-aid" ? firstAidActivity : null);
  if (!renderer?.renderActivity) {
    renderStageMessage(stage, `missing:${activity.id}`, "<h2>Atividade indisponível</h2><p>O módulo desta atividade não foi carregado.</p>");
    return;
  }

  const key = activityRenderKey(session);
  const ctx = activityContext(stage, activity);
  if (stage.dataset.activityRenderKey !== key) {
    const snapshot = captureTransientState(stage);
    renderer.renderActivity(ctx);
    stage.dataset.activityRenderKey = key;
    stage.dataset.stageMessageKey = "";
    updateActivityStatus(ctx);
    restoreTransientState(stage, snapshot, key);
    return;
  }
  updateActivityStatus(ctx);
  updateClaims(ctx, renderer);
  updateFeedback(ctx);
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

function updateActivityStatus(ctx) {
  const header = ctx.root.querySelector("[data-activity-header]");
  if (!header) return;
  const title = header.querySelector("[data-activity-title]");
  const subtitle = header.querySelector("[data-activity-subtitle]");
  const points = header.querySelector("[data-activity-points]");
  const hint = header.querySelector("[data-activity-hint]");
  if (title) title.textContent = ctx.activity.title || "";
  if (subtitle) subtitle.textContent = ctx.activity.subtitle || "";
  if (points) points.textContent = `${Number(ctx.activity.points || 0)} pontos`;
  if (hint) {
    hint.textContent = ctx.activity.hint ? `Dica: ${ctx.activity.hint}` : "";
    hint.classList.toggle("hidden", !ctx.activity.hint);
  }
}

function updateClaims(ctx, renderer) {
  renderer.updateActivity?.(ctx);
}

function updateFeedback(ctx) {
  ctx.root.querySelectorAll("[data-question]").forEach((card) => {
    const attempt = ctx.session.myAttempts?.[`${ctx.moduleId}:${ctx.activity.id}:${card.dataset.question}`];
    if (attempt?.final) card.classList.add("is-final");
  });
}

function activityRenderKey(currentSession) {
  return [
    currentSession.code,
    currentSession.activeModule,
    currentSession.activeActivityId,
    currentSession.activityStatus
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

function clearDraftForActivitySwitch(previousSession, nextSession) {
  if (!previousSession?.activeActivityId) return;
  const sameActivity = previousSession.activeModule === nextSession?.activeModule
    && previousSession.activeActivityId === nextSession?.activeActivityId;
  if (!sameActivity) clearActivityDraft(previousSession.activeModule, previousSession.activeActivityId);
}

function captureTransientState(root) {
  const active = document.activeElement;
  const focusKey = active && root.contains(active) ? fieldKey(active) : "";
  const snapshot = {
    activityRenderKey: root.dataset.activityRenderKey || "",
    scrollTop: root.scrollTop,
    scrollLeft: root.scrollLeft,
    focusKey,
    selectionStart: null,
    selectionEnd: null,
    fields: {},
    sequences: {}
  };

  if (focusKey && typeof active.selectionStart === "number") {
    snapshot.selectionStart = active.selectionStart;
    snapshot.selectionEnd = active.selectionEnd;
  }

  root.querySelectorAll("input, textarea, select").forEach((control) => {
    const key = fieldKey(control);
    if (!key) return;
    snapshot.fields[key] = {
      value: control.value,
      checked: control.checked,
      scrollTop: control.scrollTop,
      scrollLeft: control.scrollLeft
    };
  });

  root.querySelectorAll("[data-sequence-list]").forEach((list) => {
    const key = list.dataset.sequenceList;
    snapshot.sequences[key] = [...list.querySelectorAll("[data-item-id]")].map((item) => item.dataset.itemId);
  });

  return snapshot;
}

function restoreTransientState(root, snapshot, nextRenderKey) {
  if (!snapshot || snapshot.activityRenderKey !== nextRenderKey) return;
  root.scrollTop = snapshot.scrollTop || 0;
  root.scrollLeft = snapshot.scrollLeft || 0;

  for (const [key, field] of Object.entries(snapshot.fields || {})) {
    const control = root.querySelector(`[data-draft-key="${cssAttribute(key)}"]`);
    if (!control || control.disabled) continue;
    if (control.type === "checkbox" || control.type === "radio") {
      control.checked = Boolean(field.checked);
    } else {
      control.value = field.value;
    }
    control.scrollTop = field.scrollTop || 0;
    control.scrollLeft = field.scrollLeft || 0;
  }

  for (const [key, order] of Object.entries(snapshot.sequences || {})) {
    const list = root.querySelector(`[data-sequence-list="${cssAttribute(key)}"]`);
    if (!list) continue;
    const byId = new Map([...list.children].map((item) => [item.dataset.itemId, item]));
    order.forEach((itemId) => {
      const item = byId.get(itemId);
      if (item) list.append(item);
    });
  }

  const focused = snapshot.focusKey
    ? root.querySelector(`[data-draft-key="${cssAttribute(snapshot.focusKey)}"]`)
    : null;
  if (focused && !focused.disabled) {
    focused.focus({ preventScroll: true });
    if (typeof focused.setSelectionRange === "function" && snapshot.selectionStart !== null) {
      focused.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    }
  }
}

function fieldKey(control) {
  if (!control) return "";
  if (control.dataset?.draftKey) return control.dataset.draftKey;
  const question = control.closest?.("[data-question]")?.dataset.question;
  if (question && control.name) return `question:${question}:${control.name}`;
  if (control.dataset?.r && control.dataset?.c) return `cell:${control.dataset.r}:${control.dataset.c}`;
  return "";
}

function cssAttribute(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}
