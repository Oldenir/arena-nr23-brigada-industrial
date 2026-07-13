export const MODULE_IDS = ["nr23", "first-aid"];

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function normalizeCompact(value) {
  return normalizeText(value).replace(/[^A-Z0-9]/g, "");
}

export function sanitizeText(value, max = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function createModuleScore() {
  return {
    points: 0,
    correct: 0,
    wrong: 0,
    completed: 0,
    totalResponseMs: 0,
    lastScoreAt: null,
    firstReachedAt: null
  };
}

export function createTeamScores() {
  return {
    nr23: createModuleScore(),
    "first-aid": createModuleScore()
  };
}

export function ensureTeamScore(team, moduleId) {
  if (!team.scores) team.scores = createTeamScores();
  if (!team.scores[moduleId]) team.scores[moduleId] = createModuleScore();
  return team.scores[moduleId];
}

export function applyScore(team, moduleId, delta) {
  const score = ensureTeamScore(team, moduleId);
  const now = delta.at || new Date().toISOString();
  score.points += delta.points || 0;
  score.correct += delta.correct || 0;
  score.wrong += delta.wrong || 0;
  score.completed += delta.completed || 0;
  score.totalResponseMs += Math.max(0, Number(delta.responseMs || 0));
  if (delta.points !== 0 || delta.correct || delta.wrong || delta.completed) {
    score.lastScoreAt = now;
    if (score.firstReachedAt === null && score.points > 0) score.firstReachedAt = now;
  }
  return score;
}

export function computeRanking(teams = [], moduleId = "nr23") {
  return [...teams]
    .map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      symbol: team.symbol,
      score: ensureTeamScore(team, moduleId)
    }))
    .sort((a, b) => {
      if (b.score.points !== a.score.points) return b.score.points - a.score.points;
      if (b.score.correct !== a.score.correct) return b.score.correct - a.score.correct;
      if (a.score.wrong !== b.score.wrong) return a.score.wrong - b.score.wrong;
      if (a.score.totalResponseMs !== b.score.totalResponseMs) return a.score.totalResponseMs - b.score.totalResponseMs;
      const aTime = a.score.firstReachedAt || "9999-12-31T23:59:59.999Z";
      const bTime = b.score.firstReachedAt || "9999-12-31T23:59:59.999Z";
      return aTime.localeCompare(bTime);
    })
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function getActivityItemCount(activity) {
  if (!activity) return 0;
  if (activity.words) return activity.words.length;
  if (activity.entries) return activity.entries.length;
  if (activity.questions) return activity.questions.length;
  return 0;
}

export function findQuestion(activity, questionId) {
  if (!activity || !Array.isArray(activity.questions)) return null;
  return activity.questions.find((question) => question.id === questionId) || null;
}

export function findClaimItem(activity, itemId) {
  if (!activity) return null;
  if (activity.words) return activity.words.find((word) => word.id === itemId) || null;
  if (activity.entries) return activity.entries.find((entry) => entry.id === itemId) || null;
  return null;
}

export function evaluateAnswer(activity, payload = {}) {
  const question = findQuestion(activity, payload.questionId);
  if (!question) return { ok: false, error: "Questão inválida." };

  if (activity.type === "true-false") {
    const value = payload.answer === true || payload.answer === "true";
    return {
      ok: true,
      correct: value === question.answer,
      expected: question.answer,
      explanation: question.explanation
    };
  }

  if (activity.type === "single-choice") {
    const expected = normalizeText(question.answer);
    const actual = normalizeText(payload.answer);
    return {
      ok: true,
      correct: actual === expected,
      expected: question.answer,
      explanation: question.explanation
    };
  }

  if (activity.type === "fill-blank") {
    const actual = normalizeCompact(payload.answer);
    const accepted = question.answers.map((answer) => normalizeCompact(answer));
    return {
      ok: true,
      correct: accepted.includes(actual),
      expected: question.answers[0],
      explanation: question.explanation
    };
  }

  if (activity.type === "sequence") {
    const actual = Array.isArray(payload.answer) ? payload.answer.map(normalizeCompact) : [];
    const expected = question.items.map(normalizeCompact);
    return {
      ok: true,
      correct: actual.length === expected.length && actual.every((item, index) => item === expected[index]),
      expected: question.items,
      explanation: question.explanation
    };
  }

  if (activity.type === "emergency") {
    const answer = payload.answer && typeof payload.answer === "object" ? payload.answer : {};
    const missed = question.decisions.filter((decision) => normalizeText(answer[decision.key]) !== normalizeText(decision.answer));
    return {
      ok: true,
      correct: missed.length === 0,
      expected: Object.fromEntries(question.decisions.map((decision) => [decision.key, decision.answer])),
      explanation: question.explanation
    };
  }

  return { ok: false, error: "Tipo de atividade sem validação." };
}

export function getQuestionPoints(activity, correct) {
  return correct ? Number(activity.points || 0) : 0;
}

export function makeAttemptKey(moduleId, activityId, questionId) {
  return `${moduleId}:${activityId}:${questionId}`;
}

export function makeClaimKey(moduleId, activityId, itemId) {
  return `${moduleId}:${activityId}:${itemId}`;
}

export function seededHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededShuffle(items, seed) {
  const output = [...items];
  let state = seededHash(seed) || 1;
  for (let index = output.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822519) >>> 0;
    const swapIndex = state % (index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

export function stripAnswersFromActivity(activity, options = {}) {
  const teamSeed = options.teamSeed || "public";
  const base = {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    subtitle: activity.subtitle,
    points: activity.points,
    maxAttempts: activity.maxAttempts,
    firstBonus: activity.firstBonus,
    hint: options.includeHint ? activity.hint : undefined
  };

  if (activity.words) {
    base.words = activity.words.map((word) => ({ id: word.id, term: word.term, clue: word.clue }));
  }

  if (activity.entries) {
    base.rows = activity.rows;
    base.cols = activity.cols;
    base.entries = activity.entries.map((entry) => ({
      id: entry.id,
      number: entry.number,
      row: entry.row,
      col: entry.col,
      direction: entry.direction,
      length: normalizeCompact(entry.answer).length,
      clue: entry.clue
    }));
  }

  if (activity.questions) {
    const questions = activity.type === "true-false"
      ? seededShuffle(activity.questions, `${teamSeed}:${activity.id}`)
      : activity.questions;
    base.questions = questions.map((question) => {
      const clean = {
        id: question.id,
        prompt: question.prompt,
        statement: question.statement,
        explanation: question.explanation
      };
      if (activity.type === "single-choice") {
        clean.options = seededShuffle(question.options || activity.options || [], `${teamSeed}:${question.id}`);
      }
      if (activity.type === "sequence") {
        clean.items = seededShuffle(question.items, `${teamSeed}:${question.id}`);
      }
      if (activity.type === "emergency") {
        clean.decisions = question.decisions.map((decision) => ({
          key: decision.key,
          label: decision.label,
          options: seededShuffle(decision.options, `${teamSeed}:${question.id}:${decision.key}`)
        }));
      }
      return clean;
    });
  }

  return JSON.parse(JSON.stringify(base));
}

export function publicModuleCatalog(module, options = {}) {
  return {
    id: module.id,
    title: module.title,
    shortTitle: module.shortTitle,
    theme: module.theme,
    notice: module.notice,
    activities: module.activities.map((activity) => stripAnswersFromActivity(activity, options))
  };
}
