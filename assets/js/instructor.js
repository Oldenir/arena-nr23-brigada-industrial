import { api } from "./api.js";
import { getInstructorToken, removeInstructorSession, saveInstructorSession } from "./state.js";
import { query, replaceQuery } from "./router.js";
import { renderPodium, renderRanking } from "./ranking.js";
import { renderQr } from "./qr.js";
import { $, $$, describeError, escapeHTML, formatDateTime, formatTime, setStatus, teamUrl, toast } from "./utils.js";

let code = "";
let instructorToken = "";
let session = null;
let selectedActivityId = "";
let pollTimer = null;

init();

function init() {
  $("#createSessionForm").addEventListener("submit", createSession);
  $("#openSessionForm").addEventListener("submit", openSession);
  $("#copyLinkBtn").addEventListener("click", copyLink);
  $("#finishSessionBtn").addEventListener("click", finishSession);
  $("#deleteSessionBtn").addEventListener("click", deleteSession);
  $("#openActivityBtn").addEventListener("click", () => activityAction("open"));
  $("#pauseActivityBtn").addEventListener("click", () => activityAction("pause"));
  $("#closeActivityBtn").addEventListener("click", () => activityAction("close"));
  $("#hintBtn").addEventListener("click", () => activityAction("hint"));
  $("#resetRankingBtn").addEventListener("click", resetRanking);
  $("#restartSessionBtn").addEventListener("click", restartSession);
  $("#manualScoreForm").addEventListener("submit", manualScore);
  $$("[data-module-switch]").forEach((button) => {
    button.addEventListener("click", () => switchModule(button.dataset.moduleSwitch));
  });

  const params = query();
  if (params.session) {
    code = normalizeCode(params.session);
    instructorToken = getInstructorToken(code);
    if (instructorToken) sync(true);
  }
}

async function createSession(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const data = await api.createSession({
      className: form.get("className"),
      moduleId: form.get("moduleId")
    });
    code = data.session.code;
    instructorToken = data.instructorToken;
    saveInstructorSession(code, instructorToken);
    replaceQuery({ session: code });
    updateSession(data.session);
    startPolling();
    toast("Sessão criada com sucesso.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function openSession(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  code = normalizeCode(form.get("code"));
  instructorToken = getInstructorToken(code);
  if (!instructorToken) {
    toast("Token administrativo não encontrado neste navegador.", "error");
    return;
  }
  await sync(true);
  replaceQuery({ session: code });
  startPolling();
}

async function sync(showErrors = false) {
  if (!code || !instructorToken) return;
  setStatus($("#apiStatus"), "", "sincronizando");
  try {
    const health = await api.health();
    const data = await api.getSession(code, { instructorToken });
    updateSession(data.session);
    setStatus($("#apiStatus"), "online", health.status === "online" ? "API online" : "conectado");
  } catch (error) {
    setStatus($("#apiStatus"), "error", "erro ao sincronizar");
    if (showErrors) toast(describeError(error), "error");
  }
}

function startPolling() {
  window.clearInterval(pollTimer);
  pollTimer = window.setInterval(() => sync(false), 2600);
}

function updateSession(nextSession) {
  session = nextSession;
  selectedActivityId = selectedActivityId || session.activeActivityId || session.catalog.activities[0]?.id || "";
  $("#sessionSetup").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");
  renderDashboard();
}

function renderDashboard() {
  $("#sessionStatus").textContent = session.status === "open" ? "Sessão aberta" : "Sessão encerrada";
  $("#sessionTitle").textContent = session.className;
  $("#sessionMeta").textContent = `${session.code} - ${session.catalog.title}`;
  $("#teamCount").textContent = session.teams.length;
  $("#activeActivityLabel").textContent = activeActivity()?.title || "Nenhuma";
  $("#syncTime").textContent = formatTime(session.serverTime);
  $("#teamLink").href = teamUrl(session.code, { module: session.activeModule });
  $("#teamLink").textContent = teamUrl(session.code, { module: session.activeModule });
  renderQr($("#qrCanvas"), $("#teamLink").href);
  renderModuleButtons();
  renderActivities();
  renderPodium($("#podium"), session.ranking);
  renderRanking($("#ranking"), session.ranking);
  renderTeams();
  renderHistory();
  renderScoreSelect();
}

function renderModuleButtons() {
  $$("[data-module-switch]").forEach((button) => {
    button.classList.toggle("active", button.dataset.moduleSwitch === session.activeModule);
  });
}

function renderActivities() {
  $("#activityList").innerHTML = session.catalog.activities.map((activity) => `
    <button type="button" data-activity="${activity.id}" class="${activity.id === selectedActivityId ? "active" : ""}">
      <strong>${escapeHTML(activity.title)}</strong>
      <small>${escapeHTML(activity.subtitle || `${activity.points || 0} pontos`)}</small>
    </button>
  `).join("");
  $$("#activityList [data-activity]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedActivityId = button.dataset.activity;
      activityAction("select");
      renderActivities();
    });
  });
}

function renderTeams() {
  const progress = session.progress || {};
  $("#teamList").innerHTML = session.teams.length ? session.teams.map((team) => {
    const item = progress[team.id] || { completed: 0, total: 0, percent: 0 };
    return `
      <article class="team-card">
        <header>
          <strong><span class="team-badge" style="background:${escapeHTML(team.color)}"></span> ${escapeHTML(team.name)}</strong>
          <small>${escapeHTML(team.symbol || "")}</small>
        </header>
        <p>${team.members ? escapeHTML(team.members) : "Integrantes não informados"}</p>
        <div class="progress-bar"><span style="width:${item.percent}%"></span></div>
        <small>${item.completed}/${item.total} itens concluídos - visto ${formatDateTime(team.lastSeenAt)}</small>
      </article>
    `;
  }).join("") : "<p class=\"empty\">Nenhuma equipe conectada.</p>";
}

function renderHistory() {
  $("#historyList").innerHTML = session.history.length ? session.history.map((item) => `
    <article class="history-item">
      <strong>${escapeHTML(item.action)} ${item.points ? `(${item.points > 0 ? "+" : ""}${item.points})` : ""}</strong>
      <span>${escapeHTML(item.teamName || "Instrutor")} - ${escapeHTML(item.detail || "")}</span>
      <small>${formatDateTime(item.at)} - ${escapeHTML(item.attemptId || item.id)}</small>
    </article>
  `).join("") : "<p class=\"empty\">Sem registros ainda.</p>";
}

function renderScoreSelect() {
  const select = $("#manualScoreForm [name='teamId']");
  const current = select.value;
  select.innerHTML = session.teams.map((team) => `<option value="${team.id}">${escapeHTML(team.name)}</option>`).join("");
  if (current) select.value = current;
}

async function activityAction(action) {
  if (!session) return;
  try {
    const activityId = selectedActivityId || session.activeActivityId;
    const data = await api.activity(session.code, {
      action,
      activityId,
      moduleId: session.activeModule
    }, instructorToken);
    updateSession(data.session);
    toast(action === "open" ? "Atividade liberada." : "Comando aplicado.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function switchModule(moduleId) {
  try {
    const data = await api.activity(session.code, { action: "module", moduleId }, instructorToken);
    selectedActivityId = data.session.catalog.activities[0]?.id || "";
    updateSession(data.session);
    toast(`Módulo ativo: ${data.session.catalog.title}`);
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function resetRanking() {
  if (!confirm("Zerar ranking e tentativas do módulo ativo?")) return;
  try {
    const data = await api.activity(session.code, { action: "reset-ranking" }, instructorToken);
    updateSession(data.session);
    toast("Ranking do módulo zerado.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function restartSession() {
  if (!confirm("Reiniciar a competição mantendo as equipes cadastradas?")) return;
  try {
    const data = await api.reset(session.code, instructorToken);
    updateSession(data.session);
    toast("Competição reiniciada.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function manualScore(event) {
  event.preventDefault();
  const submitter = event.submitter;
  const form = new FormData(event.currentTarget);
  let points = Number(form.get("points"));
  if (submitter?.value === "penalty" && points > 0) points *= -1;
  try {
    const data = await api.score(session.code, {
      teamId: form.get("teamId"),
      points,
      reason: form.get("reason")
    }, instructorToken);
    updateSession(data.session);
    toast("Pontuação manual registrada.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function finishSession() {
  if (!confirm("Encerrar esta sessão? As equipes não poderão pontuar depois disso.")) return;
  try {
    const data = await api.finish(session.code, instructorToken);
    updateSession(data.session);
    toast("Sessão encerrada.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function deleteSession() {
  if (!confirm("Apagar definitivamente esta sessão?")) return;
  try {
    await api.deleteSession(session.code, instructorToken);
    removeInstructorSession(session.code);
    window.clearInterval(pollTimer);
    session = null;
    code = "";
    instructorToken = "";
    $("#dashboard").classList.add("hidden");
    $("#sessionSetup").classList.remove("hidden");
    toast("Sessão apagada.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText($("#teamLink").href);
    toast("Link da equipe copiado.");
  } catch {
    toast("Não foi possível copiar automaticamente.", "error");
  }
}

function activeActivity() {
  return session.catalog.activities.find((activity) => activity.id === session.activeActivityId);
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}
