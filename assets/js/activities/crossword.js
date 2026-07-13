import { api } from "../api.js";
import { describeError, escapeHTML, newIdempotencyKey, normalizeCompact, toast } from "../utils.js";
import { header } from "./common.js";
import { contrastColor } from "./word-search.js";

export function renderActivity(ctx) {
  const cells = buildCells(ctx.activity);
  ctx.draftActivity.cells ||= {};
  ctx.root.innerHTML = `
    ${header(ctx)}
    <div class="crossword-wrap">
      <div class="cross-grid" style="--cross-cols:${ctx.activity.cols}" aria-label="Grade de cruzadinha">
        ${renderCells(ctx, cells)}
      </div>
      <div class="clue-list">
        ${ctx.activity.entries.map((entry) => renderEntryCard(ctx, entry)).join("")}
      </div>
    </div>
  `;
  updateActivity(ctx);
  attachCrossword(ctx);
}

export function updateActivity(ctx) {
  const teamById = new Map((ctx.session.teams || []).map((team) => [team.id, team]));
  const cells = buildCells(ctx.activity);
  ctx.root.querySelectorAll(".cross-cell input").forEach((input) => {
    const key = cellKey(input);
    const cell = cells.get(key);
    const claimed = cell ? claimedCellValue(ctx, cell) : "";
    if (claimed) return;
    input.disabled = false;
    input.value = ctx.draftActivity.cells?.[key] || "";
    const wrapper = input.closest(".cross-cell");
    wrapper?.classList.remove("claimed");
    wrapper?.style.removeProperty("--claim-color");
    wrapper?.style.removeProperty("--claim-text");
  });

  ctx.activity.entries.forEach((entry) => {
    const claim = claimFor(ctx, entry.id);
    const card = ctx.root.querySelector(`[data-entry="${cssEscape(entry.id)}"]`);
    const result = card?.querySelector(".answer-result");
    const button = card?.querySelector("[data-validate-entry]");
    const wasClaimed = card?.classList.contains("is-claimed");
    if (claim) {
      const team = teamById.get(claim.teamId) || {};
      const color = team.color || "#68e493";
      card?.classList.add("is-claimed");
      card?.style.setProperty("--claim-color", color);
      card?.style.setProperty("--claim-text", contrastColor(color));
      if (result) {
        result.className = "answer-result result-good";
        result.textContent = `Conquistada por ${claim.teamName}`;
      }
      if (button) button.disabled = true;
      fillClaimedEntry(ctx, entry, claim, color);
    } else {
      card?.classList.remove("is-claimed");
      card?.style.removeProperty("--claim-color");
      card?.style.removeProperty("--claim-text");
      if (wasClaimed && result) {
        result.className = "answer-result";
        result.textContent = "";
      }
      if (button && !card?.dataset.sending) button.disabled = false;
    }
  });
}

function renderEntryCard(ctx, entry) {
  const claim = claimFor(ctx, entry.id);
  const length = entryLength(entry);
  return `
    <article class="question-card crossword-clue ${claim ? "is-claimed" : ""}" data-entry="${entry.id}">
      <h3>${entry.number}. ${escapeHTML(entry.clue)}</h3>
      <small>${entry.direction === "across" ? "Horizontal" : "Vertical"} - ${length} letras</small>
      <button class="button primary" data-validate-entry type="button" ${claim ? "disabled" : ""}>Validar resposta</button>
      <div class="answer-result">${claim ? `Conquistada por ${escapeHTML(claim.teamName)}` : ""}</div>
    </article>
  `;
}

function claimKey(ctx, itemId) {
  return `${ctx.moduleId}:${ctx.activity.id}:${itemId}`;
}

function claimFor(ctx, itemId) {
  return ctx.session.claims?.[claimKey(ctx, itemId)] || null;
}

export function buildCells(activity) {
  const cells = new Map();
  for (const entry of activity.entries) {
    for (let i = 0; i < entryLength(entry); i += 1) {
      const row = entry.row + (entry.direction === "down" ? i : 0);
      const col = entry.col + (entry.direction === "across" ? i : 0);
      const key = `${row}:${col}`;
      const current = cells.get(key) || { row, col, numbers: [], entries: [] };
      if (i === 0) current.numbers.push(entry.number);
      current.entries.push(entry.id);
      cells.set(key, current);
    }
  }
  return cells;
}

function renderCells(ctx, cells) {
  const html = [];
  for (let row = 0; row < ctx.activity.rows; row += 1) {
    for (let col = 0; col < ctx.activity.cols; col += 1) {
      const cell = cells.get(`${row}:${col}`);
      if (!cell) {
        html.push(`<div class="cross-cell blocked"></div>`);
      } else {
        const key = `${row}:${col}`;
        const value = claimedCellValue(ctx, cell) || ctx.draftActivity.cells?.[key] || "";
        const claimed = Boolean(claimedCellValue(ctx, cell));
        html.push(`
          <div class="cross-cell ${claimed ? "claimed" : ""}">
            ${cell.numbers.length ? `<small>${cell.numbers.join("/")}</small>` : ""}
            <input maxlength="1" inputmode="text" autocomplete="off" value="${escapeHTML(value)}" data-r="${row}" data-c="${col}" data-draft-key="cell:${row}:${col}" data-entries="${cell.entries.join(",")}" ${claimed ? "disabled" : ""}>
          </div>
        `);
      }
    }
  }
  return html.join("");
}

function claimedCellValue(ctx, cell) {
  for (const entryId of cell.entries) {
    const entry = ctx.activity.entries.find((item) => item.id === entryId);
    const claim = claimFor(ctx, entryId);
    if (!entry || !claim?.answer) continue;
    const index = cellIndexForEntry(entry, cell.row, cell.col);
    const answer = normalizeCompact(claim.answer);
    if (index >= 0 && answer[index]) return answer[index];
  }
  return "";
}

function attachCrossword(ctx) {
  ctx.root.querySelectorAll(".cross-cell input").forEach((input) => {
    input.addEventListener("focus", () => {
      ctx.draftActivity.activeEntry = firstOpenEntry(ctx, input);
      ctx.draftActivity.activeCell = cellKey(input);
    });
    input.addEventListener("input", () => {
      input.value = normalizeCompact(input.value).slice(0, 1);
      ctx.draftActivity.cells ||= {};
      ctx.draftActivity.cells[cellKey(input)] = input.value;
      if (input.value) focusRelative(ctx, input, 1);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value) {
        event.preventDefault();
        focusRelative(ctx, input, -1);
      }
    });
  });

  ctx.root.querySelectorAll("[data-validate-entry]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-entry]");
      if (card.dataset.sending === "true") return;
      const entry = ctx.activity.entries.find((item) => item.id === card.dataset.entry);
      const answer = readEntry(ctx.root, entry);
      const box = card.querySelector(".answer-result");
      const length = entryLength(entry);
      if (answer.length !== length) {
        box.className = "answer-result result-bad";
        box.textContent = `Preencha ${length} letras antes de validar.`;
        return;
      }
      card.dataset.sending = "true";
      button.dataset.originalText = button.textContent;
      button.textContent = "Enviando...";
      button.disabled = true;
      try {
        const data = await api.claim(ctx.code, {
          moduleId: ctx.moduleId,
          activityId: ctx.activity.id,
          itemId: entry.id,
          answer,
          idempotencyKey: newIdempotencyKey("cross"),
          startedAt: Date.now()
        }, ctx.teamToken);
        ctx.updateSession(data.session);
        box.className = data.result === "claimed" ? "answer-result result-good" : "answer-result result-bad";
        box.textContent = data.result === "claimed"
          ? `Resposta conquistada: +${data.points} pontos.`
          : `Já conquistada por ${data.winner}.`;
        if (data.result === "claimed") clearEntryDraft(ctx, entry);
      } catch (error) {
        toast(describeError(error), "error");
        box.className = "answer-result result-bad";
        box.textContent = describeError(error);
        button.disabled = false;
      } finally {
        if (!card.classList.contains("is-claimed")) {
          button.textContent = button.dataset.originalText || "Validar resposta";
        }
        card.dataset.sending = "false";
      }
    });
  });
}

function firstOpenEntry(ctx, input) {
  const entries = String(input.dataset.entries || "").split(",").filter(Boolean);
  return entries.find((entryId) => !claimFor(ctx, entryId)) || entries[0] || "";
}

function focusRelative(ctx, input, delta) {
  const entry = ctx.activity.entries.find((item) => item.id === (ctx.draftActivity.activeEntry || firstOpenEntry(ctx, input)));
  if (!entry) return;
  const cells = entryCells(entry);
  const current = cellKey(input);
  const index = cells.findIndex((key) => key === current);
  const nextKey = cells[index + delta];
  if (!nextKey) return;
  const [r, c] = nextKey.split(":");
  const next = ctx.root.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  if (next && !next.disabled) next.focus();
}

function fillClaimedEntry(ctx, entry, claim, color) {
  const answer = normalizeCompact(claim.answer);
  entryCells(entry).forEach((key, index) => {
    const [r, c] = key.split(":");
    const input = ctx.root.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    if (!input || !answer[index]) return;
    input.value = answer[index];
    input.disabled = true;
    input.closest(".cross-cell")?.classList.add("claimed");
    input.closest(".cross-cell")?.style.setProperty("--claim-color", color);
    input.closest(".cross-cell")?.style.setProperty("--claim-text", contrastColor(color));
    delete ctx.draftActivity.cells?.[key];
  });
}

function clearEntryDraft(ctx, entry) {
  entryCells(entry).forEach((key) => {
    delete ctx.draftActivity.cells?.[key];
  });
}

function readEntry(root, entry) {
  return entryCells(entry).map((key) => {
    const [r, c] = key.split(":");
    return root.querySelector(`[data-r="${r}"][data-c="${c}"]`)?.value || "";
  }).join("");
}

function entryCells(entry) {
  return Array.from({ length: entryLength(entry) }, (_, index) => {
    const row = entry.row + (entry.direction === "down" ? index : 0);
    const col = entry.col + (entry.direction === "across" ? index : 0);
    return `${row}:${col}`;
  });
}

function entryLength(entry) {
  return Number(entry.length || normalizeCompact(entry.answer).length || 0);
}

function cellIndexForEntry(entry, row, col) {
  return entryCells(entry).findIndex((key) => key === `${row}:${col}`);
}

function cellKey(input) {
  return `${input.dataset.r}:${input.dataset.c}`;
}

function cssEscape(value) {
  return String(value).replace(/"/g, '\\"');
}
