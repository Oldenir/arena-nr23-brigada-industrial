import test from "node:test";
import assert from "node:assert/strict";
import { modules } from "../data/game-content.js";
import { buildGrid } from "../assets/js/activities/word-search.js";

test("conteúdo NR23 cobre as atividades obrigatórias", () => {
  const nr23 = modules.nr23;
  const ids = nr23.activities.map((activity) => activity.id);
  assert.deepEqual(ids, [
    "word-search",
    "crossword",
    "true-false",
    "fire-class",
    "extinguisher",
    "fill-blank",
    "safe-sequence",
    "inspection",
    "industrial-emergency"
  ]);
  assert.equal(nr23.activities.find((activity) => activity.id === "word-search").words.length >= 14, true);
  assert.equal(nr23.activities.find((activity) => activity.id === "crossword").entries.length >= 10, true);
  assert.equal(nr23.activities.find((activity) => activity.id === "true-false").questions.length >= 15, true);
  assert.equal(nr23.activities.find((activity) => activity.id === "industrial-emergency").questions.length >= 6, true);
});

test("primeiros socorros tem pelo menos 30 desafios separados", () => {
  const aid = modules["first-aid"];
  const total = aid.activities.reduce((sum, activity) => sum + activity.questions.length, 0);
  assert.equal(aid.activities.length, 8);
  assert.equal(total >= 30, true);
  assert.match(aid.notice, /não substitui avaliação prática/i);
});

test("caça-palavras posiciona todas as palavras na grade", () => {
  const activity = modules.nr23.activities.find((item) => item.id === "word-search");
  const grid = buildGrid(activity.words);
  for (const word of activity.words) {
    assert.equal(hasWord(grid, word.term), true, `palavra não encontrada: ${word.term}`);
  }
});

function hasWord(grid, term) {
  const word = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let i = 0; i < word.length; i += 1) {
          if (grid[r + dr * i]?.[c + dc * i] !== word[i]) {
            ok = false;
            break;
          }
        }
        if (ok) return true;
      }
    }
  }
  return false;
}
