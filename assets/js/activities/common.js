import { api } from "../api.js";
import { escapeHTML, newIdempotencyKey, toast } from "../utils.js";

function attemptFor(ctx, questionId) {
  return ctx.session.myAttempts?.[`${ctx.moduleId}:${ctx.activity.id}:${questionId}`] || null;
}

async function sendAnswer(ctx, payload, resultBox) {
  const startedAt = Number(payload.startedAt || Date.now());
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
      resultBox.className = data.correct ? "result-good" : "result-bad";
      resultBox.textContent = data.explanation || (data.correct ? "Resposta correta." : "Resposta incorreta.");
    }
  } catch (error) {
    toast(error.message, "error");
  }
}

function resultMarkup(attempt) {
  if (!attempt) return "";
  const cls = attempt.correct ? "result-good" : "result-bad";
  const text = attempt.correct ? "Questão concluída com acerto." : `Tentativa registrada (${attempt.attempts}).`;
  const expected = attempt.final && attempt.expected
    ? ` Resposta: ${escapeHTML(Array.isArray(attempt.expected) ? attempt.expected.join(" > ") : JSON.stringify(attempt.expected).replace(/^"|"$/g, ""))}.`
    : "";
  return `<div class="${cls}">${text}${attempt.explanation ? ` ${escapeHTML(attempt.explanation)}` : ""}${expected}</div>`;
}

export function renderTrueFalse(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    return `
      <article class="question-card" data-question="${question.id}">
        <h3>${escapeHTML(question.statement)}</h3>
        ${resultMarkup(attempt)}
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
      }, card.querySelector(".answer-result"));
    });
  });
}

export function renderSingleChoice(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    return `
      <article class="question-card" data-question="${question.id}">
        <h3>${escapeHTML(question.prompt)}</h3>
        ${resultMarkup(attempt)}
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
      }, card.querySelector(".answer-result"));
    });
  });
}

export function renderFillBlank(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    return `
      <article class="question-card" data-question="${question.id}">
        <h3>${escapeHTML(question.prompt)}</h3>
        ${resultMarkup(attempt)}
        <form class="fill-form">
          <label>
            Resposta
            <input name="answer" autocomplete="off" ${attempt?.final ? "disabled" : ""}>
          </label>
          <button class="button primary" type="submit" ${attempt?.final ? "disabled" : ""}>Validar lacuna</button>
        </form>
        <div class="answer-result"></div>
      </article>
    `;
  }).join("");
  ctx.root.querySelectorAll(".fill-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const card = form.closest("[data-question]");
      sendAnswer(ctx, {
        questionId: card.dataset.question,
        answer: new FormData(form).get("answer"),
        startedAt: Date.now()
      }, card.querySelector(".answer-result"));
    });
  });
}

export function renderSequence(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    return `
      <article class="question-card" data-question="${question.id}">
        <h3>${escapeHTML(question.prompt)}</h3>
        ${resultMarkup(attempt)}
        <div class="sequence-list">
          ${question.items.map((item, index) => sequenceItem(item, index, attempt?.final)).join("")}
        </div>
        <button class="button primary" data-check-sequence type="button" ${attempt?.final ? "disabled" : ""}>Validar sequência</button>
        <div class="answer-result"></div>
      </article>
    `;
  }).join("");
  ctx.root.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => moveItem(button));
  });
  ctx.root.querySelectorAll("[data-check-sequence]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-question]");
      const answer = [...card.querySelectorAll(".sequence-item")].map((item) => item.dataset.value);
      sendAnswer(ctx, {
        questionId: card.dataset.question,
        answer,
        startedAt: Date.now()
      }, card.querySelector(".answer-result"));
    });
  });
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

export function renderEmergency(ctx) {
  ctx.root.innerHTML = header(ctx) + ctx.activity.questions.map((question) => {
    const attempt = attemptFor(ctx, question.id);
    return `
      <article class="question-card" data-question="${question.id}">
        <h3>${escapeHTML(question.prompt)}</h3>
        ${resultMarkup(attempt)}
        <form class="emergency-grid">
          ${question.decisions.map((decision) => `
            <label>
              ${escapeHTML(decision.label)}
              <select name="${escapeHTML(decision.key)}" ${attempt?.final ? "disabled" : ""}>
                <option value="">Selecionar</option>
                ${decision.options.map((option) => `<option value="${escapeHTML(option)}">${escapeHTML(option)}</option>`).join("")}
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
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const card = form.closest("[data-question]");
      sendAnswer(ctx, {
        questionId: card.dataset.question,
        answer: Object.fromEntries(new FormData(form).entries()),
        startedAt: Date.now()
      }, card.querySelector(".answer-result"));
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
