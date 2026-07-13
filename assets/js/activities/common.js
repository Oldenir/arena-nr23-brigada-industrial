import { api } from "../api.js";
import { buttonLoading, describeError, escapeHTML, newIdempotencyKey, toast } from "../utils.js";

function attemptFor(ctx, questionId) {
  return ctx.session.myAttempts?.[`${ctx.moduleId}:${ctx.activity.id}:${questionId}`] || null;
}

function questionDraft(ctx, questionId) {
  ctx.draftActivity[questionId] ||= {};
  return ctx.draftActivity[questionId];
}

async function sendAnswer(ctx, payload, resultBox, options = {}) {
  const startedAt = Number(payload.startedAt || Date.now());
  const trigger = options.trigger || null;
  const card = resultBox?.closest("[data-question]");
  if (card?.dataset.sending === "true") return null;
  if (card) card.dataset.sending = "true";
  if (trigger) buttonLoading(trigger, true, "Enviando...");
  setCardControls(card, true);

  try {
    const data = await api.answer(ctx.code, {
      ...payload,
      moduleId: ctx.moduleId,
      activityId: ctx.activity.id,
      startedAt,
      idempotencyKey: newIdempotencyKey("answer")
    }, ctx.teamToken);
    ctx.updateSession(data.session);
    toast(data.correct ? `Correto: +${data.points} pontos` : "Resposta registrada.");
    if (resultBox) {
      resultBox.className = data.correct ? "answer-result result-good" : "answer-result result-bad";
      resultBox.textContent = resultText(data);
    }
    if (trigger) buttonLoading(trigger, false);
    if (data.final) {
      ctx.clearQuestionDraft?.(payload.questionId);
      setCardControls(card, true);
      card?.classList.add("is-final");
    } else {
      setCardControls(card, false);
    }
    return data;
  } catch (error) {
    toast(describeError(error), "error");
    if (resultBox) {
      resultBox.className = "answer-result result-bad";
      resultBox.textContent = describeError(error);
    }
    setCardControls(card, false);
    return null;
  } finally {
    if (trigger && !card?.classList.contains("is-final")) buttonLoading(trigger, false);
    if (card) card.dataset.sending = "false";
  }
}

function resultText(data) {
  if (data.explanation && data.expected && data.final && !data.correct) {
    return `${data.explanation} Resposta: ${formatExpected(data.expected)}.`;
  }
  return data.explanation || (data.correct ? "Resposta correta." : "Resposta incorreta.");
}

function setCardControls(card, disabled) {
  if (!card) return;
  card.querySelectorAll("button, input, select, textarea").forEach((control) => {
    control.disabled = disabled;
  });
}

function resultMarkup(attempt) {
  if (!attempt) return "";
  const cls = attempt.correct ? "result-good" : "result-bad";
  const text = attempt.correct ? "Questão concluída com acerto." : `Tentativa registrada (${attempt.attempts}).`;
  const expected = attempt.final && attempt.expected
    ? ` Resposta: ${escapeHTML(formatExpected(attempt.expected))}.`
    : "";
  return `<div class="${cls}">${text}${attempt.explanation ? ` ${escapeHTML(attempt.explanation)}` : ""}${expected}</div>`;
}

function formatExpected(expected) {
  if (Array.isArray(expected)) return expected.join(" > ");
  if (expected && typeof expected === "object") return Object.values(expected).join(" | ");
  return String(expected ?? "");
}

export function updateCommonActivity(ctx) {
  ctx.root.querySelectorAll("[data-question]").forEach((card) => {
    const attempt = attemptFor(ctx, card.dataset.question);
    const result = card.querySelector(".attempt-result");
    if (result) result.innerHTML = resultMarkup(attempt);
    if (attempt?.final) {
      setCardControls(card, true);
      card.classList.add("is-final");
    }
  });
}

export function renderTrueFalse(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    return `
      <article class="question-card ${attempt?.final ? "is-final" : ""}" data-question="${question.id}">
        <h3>${escapeHTML(question.statement)}</h3>
        <div class="attempt-result">${resultMarkup(attempt)}</div>
        <div class="option-grid">
          <button data-value="true" ${attempt?.final ? "disabled" : ""}>Verdadeiro</button>
          <button data-value="false" ${attempt?.final ? "disabled" : ""}>Falso</button>
        </div>
        <div class="answer-result"></div>
      </article>
    `;
  }).join("");
  ctx.root.querySelectorAll("[data-question] button").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-question]");
      sendAnswer(ctx, {
        questionId: card.dataset.question,
        answer: button.dataset.value === "true",
        startedAt: Date.now()
      }, card.querySelector(".answer-result"), { trigger: button });
    });
  });
}

export function renderSingleChoice(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    return `
      <article class="question-card ${attempt?.final ? "is-final" : ""}" data-question="${question.id}">
        <h3>${escapeHTML(question.prompt)}</h3>
        <div class="attempt-result">${resultMarkup(attempt)}</div>
        <div class="option-grid">
          ${(question.options || []).map((option) => `
            <button data-value="${escapeHTML(option)}" ${attempt?.final ? "disabled" : ""}>${escapeHTML(option)}</button>
          `).join("")}
        </div>
        <div class="answer-result"></div>
      </article>
    `;
  }).join("");
  ctx.root.querySelectorAll("[data-question] button").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-question]");
      sendAnswer(ctx, {
        questionId: card.dataset.question,
        answer: button.dataset.value,
        startedAt: Date.now()
      }, card.querySelector(".answer-result"), { trigger: button });
    });
  });
}

export function renderFillBlank(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    const draft = questionDraft(ctx, question.id);
    return `
      <article class="question-card ${attempt?.final ? "is-final" : ""}" data-question="${question.id}">
        <h3>${escapeHTML(question.prompt)}</h3>
        <div class="attempt-result">${resultMarkup(attempt)}</div>
        <form class="fill-form">
          <label>
            Resposta
            <input name="answer" autocomplete="off" value="${escapeHTML(draft.answer || "")}" ${attempt?.final ? "disabled" : ""}>
          </label>
          <button class="button primary" type="submit" ${attempt?.final ? "disabled" : ""}>Validar lacuna</button>
        </form>
        <div class="answer-result"></div>
      </article>
    `;
  }).join("");
  ctx.root.querySelectorAll(".fill-form").forEach((form) => {
    const card = form.closest("[data-question]");
    const input = form.elements.answer;
    input?.addEventListener("input", () => {
      const draft = questionDraft(ctx, card.dataset.question);
      draft.answer = input.value;
      draft.selectionStart = input.selectionStart;
      draft.selectionEnd = input.selectionEnd;
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendAnswer(ctx, {
        questionId: card.dataset.question,
        answer: new FormData(form).get("answer"),
        startedAt: Date.now()
      }, card.querySelector(".answer-result"), { trigger: form.querySelector("button") });
    });
  });
}

export function renderSequence(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    const draft = questionDraft(ctx, question.id);
    const items = Array.isArray(draft.order) ? orderItems(question.items, draft.order) : question.items;
    return `
      <article class="question-card ${attempt?.final ? "is-final" : ""}" data-question="${question.id}">
        <h3>${escapeHTML(question.prompt)}</h3>
        <div class="attempt-result">${resultMarkup(attempt)}</div>
        <div class="sequence-list">
          ${items.map((item, index) => sequenceItem(item, index, attempt?.final)).join("")}
        </div>
        <button class="button primary" data-check-sequence type="button" ${attempt?.final ? "disabled" : ""}>Validar sequência</button>
        <div class="answer-result"></div>
      </article>
    `;
  }).join("");
  ctx.root.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => {
      moveItem(button);
      saveSequenceDraft(ctx, button.closest("[data-question]"));
    });
  });
  ctx.root.querySelectorAll("[data-check-sequence]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-question]");
      const answer = [...card.querySelectorAll(".sequence-item")].map((item) => item.dataset.value);
      sendAnswer(ctx, {
        questionId: card.dataset.question,
        answer,
        startedAt: Date.now()
      }, card.querySelector(".answer-result"), { trigger: button });
    });
  });
}

function orderItems(items, order) {
  const byValue = new Map(items.map((item) => [item, item]));
  const ordered = order.filter((item) => byValue.has(item));
  return [...ordered, ...items.filter((item) => !ordered.includes(item))];
}

function sequenceItem(item, index, disabled) {
  return `
    <div class="sequence-item" data-value="${escapeHTML(item)}">
      <span>${index + 1}. ${escapeHTML(item)}</span>
      <button class="move-button" data-move="up" type="button" ${disabled ? "disabled" : ""}>↑</button>
      <button class="move-button" data-move="down" type="button" ${disabled ? "disabled" : ""}>↓</button>
    </div>
  `;
}

function moveItem(button) {
  const item = button.closest(".sequence-item");
  const list = item.parentElement;
  if (button.dataset.move === "up" && item.previousElementSibling) {
    list.insertBefore(item, item.previousElementSibling);
  }
  if (button.dataset.move === "down" && item.nextElementSibling) {
    list.insertBefore(item.nextElementSibling, item);
  }
  [...list.children].forEach((child, index) => {
    child.querySelector("span").textContent = `${index + 1}. ${child.dataset.value}`;
  });
}

function saveSequenceDraft(ctx, card) {
  const draft = questionDraft(ctx, card.dataset.question);
  draft.order = [...card.querySelectorAll(".sequence-item")].map((item) => item.dataset.value);
}

export function renderEmergency(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    const draft = questionDraft(ctx, question.id);
    return `
      <article class="question-card ${attempt?.final ? "is-final" : ""}" data-question="${question.id}">
        <h3>${escapeHTML(question.prompt)}</h3>
        <div class="attempt-result">${resultMarkup(attempt)}</div>
        <form class="emergency-grid">
          ${question.decisions.map((decision) => `
            <label>
              ${escapeHTML(decision.label)}
              <select name="${escapeHTML(decision.key)}" ${attempt?.final ? "disabled" : ""}>
                <option value="">Selecionar</option>
                ${decision.options.map((option) => `<option value="${escapeHTML(option)}" ${draft[decision.key] === option ? "selected" : ""}>${escapeHTML(option)}</option>`).join("")}
              </select>
            </label>
          `).join("")}
          <button class="button primary" type="submit" ${attempt?.final ? "disabled" : ""}>Validar cenário</button>
        </form>
        <div class="answer-result"></div>
      </article>
    `;
  }).join("");
  ctx.root.querySelectorAll(".emergency-grid").forEach((form) => {
    const card = form.closest("[data-question]");
    const updateButton = () => {
      const complete = [...form.querySelectorAll("select")].every((select) => select.value);
      form.querySelector("button").disabled = card.classList.contains("is-final") || !complete;
    };
    form.querySelectorAll("select").forEach((select) => {
      select.addEventListener("change", () => {
        const draft = questionDraft(ctx, card.dataset.question);
        draft[select.name] = select.value;
        updateButton();
      });
    });
    updateButton();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendAnswer(ctx, {
        questionId: card.dataset.question,
        answer: Object.fromEntries(new FormData(form).entries()),
        startedAt: Date.now()
      }, card.querySelector(".answer-result"), { trigger: form.querySelector("button") });
    });
  });
}

export function header(ctx) {
  return `
    <div class="activity-meta">
      <span>${escapeHTML(ctx.activity.title)}</span>
      <span>${escapeHTML(ctx.activity.subtitle || "")}</span>
      <span>${Number(ctx.activity.points || 0)} pontos</span>
      ${ctx.activity.hint ? `<span>Dica: ${escapeHTML(ctx.activity.hint)}</span>` : ""}
    </div>
  `;
}
