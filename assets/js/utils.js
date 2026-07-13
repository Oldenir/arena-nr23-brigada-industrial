export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function newIdempotencyKey(prefix = "req") {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const random = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${Date.now()}-${random}`;
}

export function toast(message, type = "info") {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
  el.classList.add("show");
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => el.classList.remove("show"), 3400);
}

export function setStatus(el, status, label) {
  if (!el) return;
  el.textContent = label || status;
  el.classList.remove("online", "offline", "error");
  if (status) el.classList.add(status);
}

export function currentBaseUrl() {
  return `${window.location.origin}`;
}

export function teamUrl(code, params = {}) {
  const url = new URL("/equipe.html", window.location.origin);
  url.searchParams.set("session", code);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function normalizeCompact(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

export function buttonLoading(button, loading, label) {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = label || "Aguarde...";
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

export function describeError(error) {
  return error?.message || "Não foi possível concluir a operação.";
}
