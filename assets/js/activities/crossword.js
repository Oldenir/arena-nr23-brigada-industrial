import { api } from "../api.js";
import { escapeHTML, newIdempotencyKey, toast } from "../utils.js";
import { header } from "./common.js";

export function renderActivity(ctx) {
  const cells = buildCells(ctx.activity);
  const claims = ctx.session.claims || {};
  ctx.root.innerHTML = `
    ${header(ctx)}
    <div class="crossword-wrap">
      <div class="cross-grid" style="--cross-cols:${ctx.activity.cols}" aria-label="Grade de cruzadinha">
        ${renderCells(ctx, cells)}
      </div>
      <div class="clue-list">
        ${ctx.activity.entries.map((entry) => {
          const claim = claims[claimKey(ctx, entry.id)];
          return `
            <article class="question-card" data-entry="${entry.id}">
              <h3>${entry.number}. ${escapeHTML(entry.clue)}</h3>
              <small>${entry.direction === "across" ? "Horizontal" : "Vertical"} - ${entry.length} letras</small>
              ${claim ? `<div class="result-good">Conquistada por ${escapeHTML(claim.teamName)}</div>` : ""}
              <button class="button primary" data-validate-entry type="button" ${claim ? "disabled" : ""}>Validar resposta</button>
              <div class="answer-result"></div>
            </article>
          `;
        }).join("")}
      </div>
    </div>
  `;
  attachCrossword(ctx);
}

function claimKey(ctx, itemId) {
  return `${ctx.moduleId}:${ctx.activity.id}:${itemId}`;
}

function buildCells(activity) {
  const cells = new Map();
  for (const entry of activity.entries) {
    for (let i = 0; i < entry.length; i += 1) {
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
        html.push(`
          <div class="cross-cell">
            ${cell.numbers.length ? `<small>${cell.numbers.join("/")}</small>` : ""}
            <input maxlength="1" inputmode="text" autocomplete="off" data-r="${row}" data-c="${col}" data-entries="${cell.entries.join(",")}">
          </div>
        `);
      }
    }
  }
  return html.join("");
}

function attachCrossword(ctx) {
  ctx.root.querySelectorAll(".cross-cell input").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 1);
      const next = input.closest(".cross-cell")?.nextElementSibling?.querySelector("input");
      if (input.value && next) next.focus();
    });
  });
  ctx.root.querySelectorAll("[data-validate-entry]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-entry]");
      const entry = ctx.activity.entries.find((item) => item.id === card.dataset.entry);
      const answer = readEntry(ctx.root, entry);
      if (answer.length !== entry.length) {
        card.querySelector(".answer-result").className = "result-bad";
        card.querySelector(".answer-result").textContent = `Preencha ${entry.length} letras antes de validar.`;
        return;
      }
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
        const box = card.querySelector(".answer-result");
        box.className = data.result === "claimed" ? "result-good" : "result-bad";
        box.textContent = data.result === "claimed"
          ? `Resposta conquistada: +${data.points} pontos.`
          : `Já conquistada por ${escapeHTML(data.winner)}.`;
      } catch (error) {
        toast(error.message, "error");
      }
    });
  });
}

function readEntry(root, entry) {
  let value = "";
  for (let i = 0; i < entry.length; i += 1) {
    const row = entry.row + (entry.direction === "down" ? i : 0);
    const col = entry.col + (entry.direction === "across" ? i : 0);
    value += root.querySelector(`[data-r="${row}"][data-c="${col}"]`)?.value || "";
  }
  return value;
}
