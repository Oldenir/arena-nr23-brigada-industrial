import { api } from "./api.js";
import { getInstructorToken, removeInstructorSession, saveInstructorSession } from "./state.js";
import { query, replaceQuery } from "./router.js";
import { renderPodium, renderRanking } from "./ranking.js";
import { renderQr } from "./qr.js";
import { $, $$, describeError, escapeHTML, formatDateTime, formatTime, setStatus, teamUrl, toast } from "./utils.js";
import { WORD_SEARCH_SIZE, buildGrid as buildWordGrid, contrastColor, findWordPath } from "./activities/word-search.js";
import { buildCells as buildCrosswordCells } from "./activities/crossword.js";

let code = "";
let instructorToken = "";
let session = null;
let selectedActivityId = "";
let pollTimer = null;
let confirmDialog = null;

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
  renderActivityMonitor();
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
  $("#activityList").innerHTML = session.catalog.activities.map((activity) => {
    const isSelected = activity.id === selectedActivityId;
    const isActive = activity.id === session.activeActivityId;
    const statusLabel = isActive ? activityStatusLabel(session.activityStatus) : "";
    return `
    <button type="button" data-activity="${activity.id}" class="activity-card ${isSelected ? "active" : ""} ${isActive ? `is-${session.activityStatus}` : ""}">
      <span class="activity-card-title">${escapeHTML(activity.title)}</span>
      <span class="activity-card-desc">${escapeHTML(activity.subtitle || `${activity.points || 0} pontos`)}</span>
      <span class="activity-card-meta">
        ${isSelected ? "<em>Selecionada</em>" : ""}
        ${statusLabel ? `<em>${statusLabel}</em>` : ""}
      </span>
    </button>
  `;
  }).join("");
  $$("#activityList [data-activity]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedActivityId = button.dataset.activity;
      activityAction("select");
      renderActivities();
    });
  });
}

function activityStatusLabel(status) {
  if (status === "open") return "Liberada";
  if (status === "paused") return "Pausada";
  if (status === "closed") return "Encerrada";
  if (status === "selected") return "Selecionada";
  return "";
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
      <strong>${escapeHTML(formatHistoryTitle(item))}</strong>
      <span>${escapeHTML(formatHistoryDetail(item))}</span>
      <small>${formatDateTime(item.at)}</small>
    </article>
  `).join("") : "<p class=\"empty\">Sem registros ainda.</p>";
}

function renderActivityMonitor() {
  const root = $("#activityMonitor");
  const activity = activeActivity();
  if (!activity) {
    root.innerHTML = `
      <h2>Acompanhamento ao vivo</h2>
      <p class="empty">Aguardando seleção de atividade.</p>
    `;
    return;
  }
  if (activity.type === "word-search") {
    root.innerHTML = renderWordSearchMonitor(activity);
    return;
  }
  if (activity.type === "crossword") {
    root.innerHTML = renderCrosswordMonitor(activity);
    return;
  }
  root.innerHTML = renderGenericMonitor(activity);
}

function renderWordSearchMonitor(activity) {
  const grid = buildWordGrid(activity.words);
  const claimed = activity.words.map((word) => ({
    word,
    claim: claimFor(activity.id, word.id),
    path: claimFor(activity.id, word.id) ? findWordPath(grid, word.term) : []
  }));
  const byCell = new Map();
  claimed.forEach((item) => {
    if (!item.claim) return;
    item.path.forEach(([r, c]) => byCell.set(`${r}:${c}`, item));
  });
  const total = activity.words.length;
  const done = claimed.filter((item) => item.claim).length;
  return `
    <div class="monitor-header">
      <div>
        <h2>Caça-palavras ao vivo</h2>
        <p>${done ? `${done} de ${total} palavras conquistadas.` : "Aguardando primeira palavra."}</p>
      </div>
      <strong>${done}/${total}</strong>
    </div>
    <div class="monitor-word-layout">
      <div class="monitor-word-grid" style="--grid-size:${WORD_SEARCH_SIZE}" aria-label="Caça-palavras somente leitura">
        ${grid.flatMap((row, r) => row.map((letter, c) => {
          const item = byCell.get(`${r}:${c}`);
          return `<span class="${item ? "claimed" : ""}" ${item ? teamStyle(item.claim.teamId) : ""} title="${item ? escapeHTML(`${item.word.term} - ${item.claim.teamName}`) : ""}">${letter}</span>`;
        })).join("")}
      </div>
      <div class="monitor-list">
        ${claimed.map(({ word, claim }) => `
          <article class="monitor-claim ${claim ? "claimed" : ""}" ${claim ? teamStyle(claim.teamId) : ""}>
            <strong>${escapeHTML(word.term)}</strong>
            <span>${claim ? `${escapeHTML(claim.teamName)} · ${formatDateTime(claim.at)} · +${claim.points || activity.points}` : escapeHTML(word.clue)}</span>
          </article>
        `).join("")}
      </div>
    </div>
    ${renderClaimTeamSummary(activity)}
  `;
}

function renderCrosswordMonitor(activity) {
  const cells = buildCrosswordCells(activity);
  const total = activity.entries.length;
  const done = activity.entries.filter((entry) => claimFor(activity.id, entry.id)).length;
  return `
    <div class="monitor-header">
      <div>
        <h2>Cruzadinha ao vivo</h2>
        <p>${done ? `${done} de ${total} respostas conquistadas.` : "Aguardando respostas."}</p>
      </div>
      <strong>${done}/${total}</strong>
    </div>
    <div class="monitor-crossword-layout">
      <div class="monitor-cross-grid" style="--cross-cols:${activity.cols}" aria-label="Cruzadinha somente leitura">
        ${renderMonitorCrosswordCells(activity, cells)}
      </div>
      <div class="monitor-list">
        ${activity.entries.map((entry) => {
          const claim = claimFor(activity.id, entry.id);
          return `
            <article class="monitor-claim ${claim ? "claimed" : ""}" ${claim ? teamStyle(claim.teamId) : ""}>
              <strong>${entry.number}. ${entry.direction === "across" ? "Horizontal" : "Vertical"}</strong>
              <span>${escapeHTML(entry.clue)}</span>
              <small>${claim ? `${escapeHTML(claim.teamName)} · ${formatDateTime(claim.at)} · +${claim.points || activity.points}` : "Disponível"}</small>
            </article>
          `;
        }).join("")}
      </div>
    </div>
    ${renderClaimTeamSummary(activity)}
  `;
}

function renderMonitorCrosswordCells(activity, cells) {
  const html = [];
  for (let row = 0; row < activity.rows; row += 1) {
    for (let col = 0; col < activity.cols; col += 1) {
      const cell = cells.get(`${row}:${col}`);
      if (!cell) {
        html.push(`<span class="blocked"></span>`);
        continue;
      }
      const filled = monitorCrosswordCell(activity, cell);
      html.push(`
        <span class="${filled ? "claimed" : ""}" ${filled ? teamStyle(filled.claim.teamId) : ""}>
          ${cell.numbers.length ? `<small>${cell.numbers.join("/")}</small>` : ""}
          ${filled ? escapeHTML(filled.letter) : ""}
        </span>
      `);
    }
  }
  return html.join("");
}

function monitorCrosswordCell(activity, cell) {
  for (const entryId of cell.entries) {
    const entry = activity.entries.find((item) => item.id === entryId);
    const claim = claimFor(activity.id, entryId);
    if (!entry || !claim?.answer) continue;
    const index = entry.direction === "down" ? cell.row - entry.row : cell.col - entry.col;
    const letter = String(claim.answer || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()[index];
    if (letter) return { letter, claim };
  }
  return null;
}

function renderGenericMonitor(activity) {
  const progress = Object.entries(session.progress || {});
  return `
    <div class="monitor-header">
      <div>
        <h2>Acompanhamento ao vivo</h2>
        <p>${escapeHTML(activity.title)}</p>
      </div>
      <strong>${activityStatusLabel(session.activityStatus) || "Aguardando"}</strong>
    </div>
    <div class="monitor-progress-list">
      ${progress.length ? progress.map(([teamId, item]) => {
        const team = session.teams.find((candidate) => candidate.id === teamId);
        return `
          <article ${team ? teamStyle(team.id) : ""}>
            <strong>${escapeHTML(team?.name || "Equipe")}</strong>
            <span>${item.completed}/${item.total} itens finalizados</span>
            <div class="progress-bar"><span style="width:${item.percent}%"></span></div>
          </article>
        `;
      }).join("") : "<p class=\"empty\">Aguardando equipes.</p>"}
    </div>
  `;
}

function renderClaimTeamSummary(activity) {
  const claims = Object.values(session.claims || {}).filter((claim) => claim.moduleId === session.activeModule && claim.activityId === activity.id);
  if (!claims.length) return "<p class=\"monitor-state\">Nenhuma conquista registrada ainda.</p>";
  const byTeam = new Map();
  claims.forEach((claim) => {
    const current = byTeam.get(claim.teamId) || { teamId: claim.teamId, teamName: claim.teamName, count: 0, points: 0 };
    current.count += 1;
    current.points += Number(claim.points || activity.points || 0);
    byTeam.set(claim.teamId, current);
  });
  return `
    <div class="monitor-team-summary">
      ${[...byTeam.values()].map((entry) => `
        <span ${teamStyle(entry.teamId)}>${escapeHTML(entry.teamName)}: ${entry.count} itens · ${entry.points} pts</span>
      `).join("")}
    </div>
  `;
}

function claimFor(activityId, itemId) {
  return session.claims?.[`${session.activeModule}:${activityId}:${itemId}`] || null;
}

function teamStyle(teamId) {
  const team = session.teams.find((item) => item.id === teamId);
  const color = team?.color || "#68e493";
  return `style="--team-color:${escapeHTML(color)}; --team-text:${contrastColor(color)}"`;
}

function formatHistoryTitle(item) {
  const points = item.points ? ` (${item.points > 0 ? "+" : ""}${item.points})` : "";
  if (item.action === "Conquista competitiva") return `${item.teamName || "Equipe"} conquistou ${item.detail}${points}`;
  if (item.action === "Resposta correta") return `${item.teamName || "Equipe"} acertou${points}`;
  if (item.action === "Resposta incorreta") return `${item.teamName || "Equipe"} finalizou sem pontuar`;
  if (item.action === "Tentativa incorreta") return `${item.teamName || "Equipe"} tentou responder`;
  return `${item.action}${points}`;
}

function formatHistoryDetail(item) {
  const activity = session.catalog.activities.find((candidate) => candidate.id === item.activityId);
  return `${activity?.title || item.activityId || "Atividade"}${item.detail ? ` · ${item.detail}` : ""}`;
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
  const confirmed = await askConfirm({
    title: "Zerar ranking",
    message: "Zerar ranking e tentativas do módulo ativo?"
  });
  if (!confirmed) return;
  try {
    const data = await api.activity(session.code, { action: "reset-ranking" }, instructorToken);
    updateSession(data.session);
    toast("Ranking do módulo zerado.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function restartSession() {
  const confirmed = await askConfirm({
    title: "Reiniciar competição",
    message: "Reiniciar a competição mantendo as equipes cadastradas?"
  });
  if (!confirmed) return;
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
  const confirmed = await askConfirm({
    title: "Encerrar sessão",
    message: "Encerrar esta sessão? As equipes não poderão pontuar depois disso.",
    confirmLabel: "Encerrar"
  });
  if (!confirmed) return;
  try {
    const data = await api.finish(session.code, instructorToken);
    updateSession(data.session);
    toast("Sessão encerrada.");
  } catch (error) {
    toast(describeError(error), "error");
  }
}

async function deleteSession() {
  const confirmed = await askConfirm({
    title: "Apagar sessão",
    message: "Apagar definitivamente esta sessão?",
    confirmLabel: "Apagar"
  });
  if (!confirmed) return;
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

function askConfirm(options = {}) {
  const dialog = getConfirmDialog();
  const title = options.title || "Confirmar ação";
  const message = options.message || "Deseja continuar?";
  const confirmLabel = options.confirmLabel || "Confirmar";

  dialog.querySelector("[data-confirm-title]").textContent = title;
  dialog.querySelector("[data-confirm-message]").textContent = message;
  dialog.querySelector("[data-confirm-accept]").textContent = confirmLabel;

  return new Promise((resolve) => {
    const accept = dialog.querySelector("[data-confirm-accept]");
    const cancel = dialog.querySelector("[data-confirm-cancel]");
    const cleanup = (value) => {
      accept.removeEventListener("click", onAccept);
      cancel.removeEventListener("click", onCancel);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onBackdrop);
      dialog.classList.remove("open");
      if (dialog.open) dialog.close();
      resolve(value);
    };
    const onAccept = () => cleanup(true);
    const onCancel = (event) => {
      event?.preventDefault();
      cleanup(false);
    };
    const onBackdrop = (event) => {
      if (event.target === dialog) cleanup(false);
    };

    accept.addEventListener("click", onAccept);
    cancel.addEventListener("click", onCancel);
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("click", onBackdrop);
    dialog.classList.add("open");
    if (typeof dialog.showModal === "function") dialog.showModal();
    accept.focus();
  });
}

function getConfirmDialog() {
  if (confirmDialog) return confirmDialog;
  confirmDialog = document.createElement("dialog");
  confirmDialog.className = "confirm-dialog";
  confirmDialog.innerHTML = `
    <div class="confirm-dialog-card" role="document">
      <h2 data-confirm-title>Confirmar ação</h2>
      <p data-confirm-message>Deseja continuar?</p>
      <div class="button-row">
        <button class="button ghost" type="button" data-confirm-cancel>Cancelar</button>
        <button class="button danger" type="button" data-confirm-accept>Confirmar</button>
      </div>
    </div>
  `;
  document.body.append(confirmDialog);
  return confirmDialog;
}
