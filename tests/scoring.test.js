import test from "node:test";
import assert from "node:assert/strict";
import {
  applyScore,
  computeRanking,
  createTeamScores,
  evaluateAnswer,
  normalizeCompact,
  normalizeText
} from "../assets/js/scoring.js";
import { getActivity } from "../data/game-content.js";

function team(id, name) {
  return { id, name, color: "#fff", symbol: id, scores: createTeamScores() };
}

test("normaliza respostas com acentos, caixa e espaços", () => {
  assert.equal(normalizeText("  Resfriamento  "), "RESFRIAMENTO");
  assert.equal(normalizeCompact("prevenção de incêndios"), "PREVENCAODEINCENDIOS");
  assert.equal(normalizeCompact("  rota-de fuga!!! "), "ROTADEFUGA");
  assert.equal(normalizeText("maçã, ação e número 23"), "MACA ACAO E NUMERO 23");
});

test("ranking desempata por pontos, acertos, erros, tempo e chegada", () => {
  const a = team("a", "Alfa");
  const b = team("b", "Bravo");
  applyScore(a, "nr23", { points: 30, correct: 3, wrong: 1, responseMs: 5000, at: "2026-01-01T10:00:00.000Z" });
  applyScore(b, "nr23", { points: 30, correct: 3, wrong: 0, responseMs: 7000, at: "2026-01-01T10:01:00.000Z" });
  assert.equal(computeRanking([a, b], "nr23")[0].name, "Bravo");
});

test("avalia lacuna aceitando ausência de acento", () => {
  const activity = getActivity("nr23", "fill-blank");
  const result = evaluateAnswer(activity, { questionId: "fill-05", answer: "conducao" });
  assert.equal(result.correct, true);
});
