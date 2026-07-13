import { api } from "../api.js";
import { describeError, escapeHTML, newIdempotencyKey, normalizeCompact, toast } from "../utils.js";
import { header } from "./common.js";

export const WORD_SEARCH_SIZE = 16;
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [-1, 1]
];

const PRESET = {
  RESFRIAMENTO: [0, 0, 0, 1],
  COMBUSTIVEL: [2, 0, 0, 1],
  COMBURENTE: [4, 0, 0, 1],
  ISOLAMENTO: [6, 0, 0, 1],
  ABAFAMENTO: [8, 0, 0, 1],
  PREVENCAO: [10, 0, 0, 1],
  MANGUEIRA: [12, 0, 0, 1],
  EVACUACAO: [14, 0, 0, 1],
  ABANDONO: [0, 15, 1, 0],
  EXTINTOR: [0, 13, 1, 0],
  HIDRANTE: [2, 11, 1, 0],
  BRIGADA: [9, 9, 1, 1],
  ALARME: [9, 14, 1, -1],
  CALOR: [0, 12, 1, 0]
};

export function renderActivity(ctx) {
  const grid = buildGrid(ctx.activity.words);
  ctx.root.innerHTML = `
    ${header(ctx)}
    <div class="word-game">
      <div class="word-grid" style="--grid-size:${WORD_SEARCH_SIZE}" aria-label="Grade de caça-palavras">
        ${grid.flatMap((row, r) => row.map((letter, c) => `
          <button class="letter-cell" data-r="${r}" data-c="${c}" type="button">${letter}</button>
        `)).join("")}
      </div>
      <div class="word-list">
        ${ctx.activity.words.map((word) => `
          <div class="word-chip" data-word-id="${escapeHTML(word.id)}">
            <strong>${escapeHTML(word.term)}</strong>
            <small>${escapeHTML(word.clue)}</small>
          </div>
        `).join("")}
      </div>
      <div id="wordFeedback" class="answer-result"></div>
    </div>
  `;
  updateActivity(ctx);
  attachSelection(ctx, grid);
}

export function updateActivity(ctx) {
  const grid = buildGrid(ctx.activity.words);
  const teamById = new Map((ctx.session.teams || []).map((team) => [team.id, team]));

  ctx.root.querySelectorAll(".letter-cell").forEach((cell) => {
    cell.classList.remove("found");
    cell.style.removeProperty("--claim-color");
    cell.style.removeProperty("--claim-text");
    cell.removeAttribute("title");
  });

  ctx.activity.words.forEach((word) => {
    const claim = claimFor(ctx, word.id);
    const chip = ctx.root.querySelector(`[data-word-id="${cssEscape(word.id)}"]`);
    if (!chip) return;
    chip.classList.toggle("claimed", Boolean(claim));
    if (!claim) {
      chip.style.removeProperty("--claim-color");
      chip.style.removeProperty("--claim-text");
      chip.querySelector("small").textContent = word.clue;
      return;
    }

    const team = teamById.get(claim.teamId) || {};
    const color = team.color || "#68e493";
    const textColor = contrastColor(color);
    chip.style.setProperty("--claim-color", color);
    chip.style.setProperty("--claim-text", textColor);
    chip.querySelector("small").textContent = `Conquistada por ${claim.teamName}`;

    const path = findWordPath(grid, claim.answer || word.term);
    path.forEach(([r, c]) => {
      const cell = ctx.root.querySelector(`[data-r="${r}"][data-c="${c}"]`);
      if (!cell) return;
      cell.classList.add("found");
      cell.style.setProperty("--claim-color", color);
      cell.style.setProperty("--claim-text", textColor);
      cell.title = `${word.term} - ${claim.teamName}`;
    });
  });
}

function claimKey(ctx, itemId) {
  return `${ctx.moduleId}:${ctx.activity.id}:${itemId}`;
}

function claimFor(ctx, itemId) {
  return ctx.session.claims?.[claimKey(ctx, itemId)] || null;
}

export function buildGrid(words) {
  const grid = Array.from({ length: WORD_SEARCH_SIZE }, () => Array.from({ length: WORD_SEARCH_SIZE }, () => ""));
  const remaining = [];
  for (const word of words) {
    const term = normalizeCompact(word.term);
    if (PRESET[term]) placeAt(grid, term, PRESET[term]);
    else remaining.push(term);
  }
  remaining.sort((a, b) => b.length - a.length).forEach((term, index) => placeWord(grid, term, index));
  const fill = "SEGURANCAINDUSTRIALBRIGADAEXTINTORALARMEROTA";
  for (let r = 0; r < WORD_SEARCH_SIZE; r += 1) {
    for (let c = 0; c < WORD_SEARCH_SIZE; c += 1) {
      if (!grid[r][c]) grid[r][c] = fill[(r * 7 + c * 11) % fill.length];
    }
  }
  return grid;
}

function placeAt(grid, word, placement) {
  const [r, c, dr, dc] = placement;
  if (!fits(grid, word, r, c, [dr, dc])) return false;
  for (let i = 0; i < word.length; i += 1) {
    grid[r + dr * i][c + dc * i] = word[i];
  }
  return true;
}

function placeWord(grid, word, seed) {
  for (let attempt = 0; attempt < 800; attempt += 1) {
    const dir = DIRECTIONS[(attempt + seed) % DIRECTIONS.length];
    const r = (seed * 5 + attempt * 3) % WORD_SEARCH_SIZE;
    const c = (seed * 11 + attempt * 7) % WORD_SEARCH_SIZE;
    if (fits(grid, word, r, c, dir)) {
      for (let i = 0; i < word.length; i += 1) {
        grid[r + dir[0] * i][c + dir[1] * i] = word[i];
      }
      return;
    }
  }
}

function fits(grid, word, r, c, dir) {
  const endR = r + dir[0] * (word.length - 1);
  const endC = c + dir[1] * (word.length - 1);
  if (endR < 0 || endR >= WORD_SEARCH_SIZE || endC < 0 || endC >= WORD_SEARCH_SIZE) return false;
  for (let i = 0; i < word.length; i += 1) {
    const current = grid[r + dir[0] * i][c + dir[1] * i];
    if (current && current !== word[i]) return false;
  }
  return true;
}

function attachSelection(ctx, grid) {
  const board = ctx.root.querySelector(".word-grid");
  const feedback = ctx.root.querySelector("#wordFeedback");
  const submitting = new Set();
  let selecting = false;
  let cells = [];

  const addCell = (cell) => {
    if (!cell || !cell.classList.contains("letter-cell")) return;
    if (cells.includes(cell)) return;
    cells.push(cell);
    cell.classList.add("selected");
  };

  const clear = () => {
    cells.forEach((cell) => cell.classList.remove("selected"));
    cells = [];
    ctx.draftActivity.selection = [];
  };

  board.addEventListener("pointerdown", (event) => {
    selecting = true;
    board.setPointerCapture?.(event.pointerId);
    clear();
    addCell(event.target.closest(".letter-cell"));
  });

  board.addEventListener("pointermove", (event) => {
    if (!selecting) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".letter-cell");
    if (target && board.contains(target)) {
      addCell(target);
      ctx.draftActivity.selection = cells.map((cell) => [Number(cell.dataset.r), Number(cell.dataset.c)]);
    }
  });

  board.addEventListener("pointerup", async () => {
    if (!selecting) return;
    selecting = false;
    const selection = normalizeSelection(cells);
    const word = findSelectedWord(ctx.activity.words, selection.text, selection.valid);
    if (!word) {
      feedback.className = "answer-result result-bad";
      feedback.textContent = "Seleção inválida. Use linha reta horizontal, vertical ou diagonal.";
      window.setTimeout(clear, 600);
      return;
    }
    if (submitting.has(word.id)) return;
    if (ctx.root.querySelector(`[data-word-id="${cssEscape(word.id)}"]`)?.classList.contains("claimed")) {
      feedback.className = "answer-result result-bad";
      feedback.textContent = `${word.term} já foi conquistada.`;
      window.setTimeout(clear, 600);
      return;
    }
    submitting.add(word.id);
    feedback.className = "answer-result";
    feedback.textContent = "Enviando...";
    try {
      const data = await api.claim(ctx.code, {
        moduleId: ctx.moduleId,
        activityId: ctx.activity.id,
        itemId: word.id,
        answer: word.term,
        idempotencyKey: newIdempotencyKey("claim"),
        startedAt: Date.now()
      }, ctx.teamToken);
      ctx.updateSession(data.session);
      feedback.className = data.result === "claimed" ? "answer-result result-good" : "answer-result result-bad";
      feedback.textContent = data.result === "claimed"
        ? `${word.term} conquistada para sua equipe.`
        : `${word.term} já foi conquistada por ${data.winner}.`;
    } catch (error) {
      toast(describeError(error), "error");
      feedback.className = "answer-result result-bad";
      feedback.textContent = describeError(error);
    } finally {
      submitting.delete(word.id);
      window.setTimeout(clear, 600);
    }
  });
}

function normalizeSelection(cells) {
  if (!cells.length) return { valid: false, text: "" };
  const points = cells.map((cell) => [Number(cell.dataset.r), Number(cell.dataset.c)]);
  if (points.length === 1) return { valid: true, text: cells[0].textContent };
  const dr = Math.sign(points[1][0] - points[0][0]);
  const dc = Math.sign(points[1][1] - points[0][1]);
  if (dr === 0 && dc === 0) return { valid: false, text: "" };
  const valid = points.every(([r, c], index) => r === points[0][0] + dr * index && c === points[0][1] + dc * index);
  return { valid, text: cells.map((cell) => cell.textContent).join("") };
}

function findSelectedWord(words, text, valid) {
  if (!valid) return null;
  const selected = normalizeCompact(text);
  const reversed = normalizeCompact([...text].reverse().join(""));
  return words.find((word) => normalizeCompact(word.term) === selected || normalizeCompact(word.term) === reversed) || null;
}

export function findWordPath(grid, value) {
  const term = normalizeCompact(value);
  if (!term) return [];
  for (let r = 0; r < WORD_SEARCH_SIZE; r += 1) {
    for (let c = 0; c < WORD_SEARCH_SIZE; c += 1) {
      for (const [dr, dc] of DIRECTIONS) {
        const path = [];
        for (let i = 0; i < term.length; i += 1) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= WORD_SEARCH_SIZE || cc < 0 || cc >= WORD_SEARCH_SIZE || grid[rr][cc] !== term[i]) {
            path.length = 0;
            break;
          }
          path.push([rr, cc]);
        }
        if (path.length === term.length) return path;
      }
    }
  }
  return [];
}

export function contrastColor(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111318" : "#ffffff";
}

function cssEscape(value) {
  return String(value).replace(/"/g, '\\"');
}
