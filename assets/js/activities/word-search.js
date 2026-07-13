import { api } from "../api.js";
import { escapeHTML, newIdempotencyKey, normalizeCompact, toast } from "../utils.js";
import { header } from "./common.js";

const SIZE = 16;
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
  const claims = ctx.session.claims || {};
  ctx.root.innerHTML = `
    ${header(ctx)}
    <div class="word-game">
      <div class="word-grid" style="--grid-size:${SIZE}" aria-label="Grade de caça-palavras">
        ${grid.flatMap((row, r) => row.map((letter, c) => {
          const found = isCellInClaimedWord(ctx, r, c, grid);
          return `<button class="letter-cell ${found ? "found" : ""}" data-r="${r}" data-c="${c}" type="button">${letter}</button>`;
        })).join("")}
      </div>
      <div class="word-list">
        ${ctx.activity.words.map((word) => {
          const claim = claims[claimKey(ctx, word.id)];
          return `
            <div class="word-chip ${claim ? "claimed" : ""}">
              <strong>${escapeHTML(word.term)}</strong>
              <small>${claim ? `Conquistada por ${escapeHTML(claim.teamName)}` : escapeHTML(word.clue)}</small>
            </div>
          `;
        }).join("")}
      </div>
      <div id="wordFeedback" class="answer-result"></div>
    </div>
  `;
  attachSelection(ctx, grid);
}

function claimKey(ctx, itemId) {
  return `${ctx.moduleId}:${ctx.activity.id}:${itemId}`;
}

export function buildGrid(words) {
  const grid = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => ""));
  const remaining = [];
  for (const word of words) {
    const term = normalizeCompact(word.term);
    if (PRESET[term]) placeAt(grid, term, PRESET[term]);
    else remaining.push(term);
  }
  remaining.sort((a, b) => b.length - a.length).forEach((term, index) => placeWord(grid, term, index));
  const fill = "SEGURANCAINDUSTRIALBRIGADAEXTINTORALARMEROTA";
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
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
    const r = (seed * 5 + attempt * 3) % SIZE;
    const c = (seed * 11 + attempt * 7) % SIZE;
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
  if (endR < 0 || endR >= SIZE || endC < 0 || endC >= SIZE) return false;
  for (let i = 0; i < word.length; i += 1) {
    const current = grid[r + dir[0] * i][c + dir[1] * i];
    if (current && current !== word[i]) return false;
  }
  return true;
}

function attachSelection(ctx, grid) {
  const board = ctx.root.querySelector(".word-grid");
  const feedback = ctx.root.querySelector("#wordFeedback");
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
  };

  board.addEventListener("pointerdown", (event) => {
    selecting = true;
    board.setPointerCapture(event.pointerId);
    clear();
    addCell(event.target.closest(".letter-cell"));
  });

  board.addEventListener("pointermove", (event) => {
    if (!selecting) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".letter-cell");
    if (target && board.contains(target)) addCell(target);
  });

  board.addEventListener("pointerup", async () => {
    if (!selecting) return;
    selecting = false;
    const selection = normalizeSelection(cells);
    const word = findSelectedWord(ctx.activity.words, selection.text, selection.valid);
    if (!word) {
      feedback.className = "result-bad";
      feedback.textContent = "Seleção inválida. Use linha reta horizontal, vertical ou diagonal.";
      window.setTimeout(clear, 600);
      return;
    }
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
      feedback.className = data.result === "claimed" ? "result-good" : "result-bad";
      feedback.textContent = data.result === "claimed"
        ? `${word.term} conquistada para sua equipe.`
        : `${word.term} já foi conquistada por ${data.winner}.`;
    } catch (error) {
      toast(error.message, "error");
    } finally {
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

function isCellInClaimedWord() {
  return false;
}
