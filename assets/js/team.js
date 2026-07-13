import { api } from "./api.js";
import { getTeamCredential, saveTeamCredential } from "./state.js";
import { query, replaceQuery } from "./router.js";
import { renderRanking } from "./ranking.js";
import { $, describeError, escapeHTML, setStatus, toast } from "./utils.js";
import { renderActivity as renderWordSearch } from "./activities/word-search.js";
import { renderActivity as renderCrossword } from "./activities/crossword.js";
import { renderActivity as renderTrueFalse } from "./activities/true-false.js";
import { renderActivity as renderFireClass } from "./activities/fire-class.js";
import { renderActivity as renderExtinguisher } from "./activities/extinguisher.js";
import { renderActivity as renderFillBlank } from "./activities/fill-blank.js";
import { renderActivity as renderSafeSequence } from "./activities/safe-sequence.js";
import { renderActivity as renderInspection } from "./activities/inspection.js";
import { renderActivity as renderIndustrialEmergency } from "./activities/industrial-emergency.js";
import { renderActivity as renderFirstAid } from "./activities/first-aid.js";

const renderers = {
  "word-search": renderWordSearch,
  crossword: renderCrossword,
  "true-false": renderTrueFalse,
  "fire-class": renderFireClass,
  extinguisher: renderExtinguisher,
  "fill-blank": renderFillBlank,
  "safe-sequence": renderSafeSequence,
  inspection: renderInspection,
  "industrial-emergency": renderIndustrialEmergency
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
    stage.innerHTML = "<h2>Sessão encerrada</h2><p>O instrutor encerrou esta sessão.</p>";
    return;
  }
  const activity = session.catalog.activities.find((item) => item.id === session.activeActivityId);
  if (!activity || session.activityStatus === "waiting") {
    stage.innerHTML = "<h2>Sala de espera</h2><p>Aguarde o instrutor liberar uma atividade.</p>";
    return;
  }
  if (session.activityStatus === "paused") {
    stage.innerHTML = `<h2>${escapeHTML(activity.title)}</h2><p>Atividade pausada pelo instrutor.</p>`;
    return;
  }
  if (session.activityStatus === "closed" || session.activityStatus === "selected") {
    stage.innerHTML = `<h2>${escapeHTML(activity.title)}</h2><p>Aguardando liberação do instrutor.</p>`;
    return;
  }
  const renderer = renderers[activity.id] || (session.activeModule === "first-aid" ? renderFirstAid : null);
  if (!renderer) {
    stage.innerHTML = "<h2>Atividade indisponível</h2><p>O módulo desta atividade não foi carregado.</p>";
    return;
  }
  renderer({
    root: stage,
    code,
    teamToken,
    session,
    moduleId: session.activeModule,
    activity,
    updateSession
  });
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}
