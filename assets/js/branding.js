/**
 * Helper de branding.
 *
 * Lê `platformConfig` (config/platform.js) e aplica a identidade da
 * plataforma em qualquer página que carregue este módulo. As páginas usam
 * placeholders declarativos `data-brand-*`; este helper os preenche, evitando
 * duplicar lógica em cada arquivo.
 *
 * Placeholders suportados:
 *   data-brand-company-name      -> company.name (textContent)
 *   data-brand-company-short     -> company.shortName (textContent)
 *   data-brand-company-subtitle  -> company.subtitle (textContent)
 *   data-brand-logo              -> <img> company.logo (src + alt), com fallback
 *   data-brand-instructor-name   -> instructor.name (textContent)
 *   data-brand-instructor-role   -> instructor.role (textContent)
 *   data-brand-instructor-photo  -> <img> instructor.photo (src + alt), com fallback
 *   data-brand-footer            -> footer.text (textContent)
 *   data-brand-module="<id>"     -> oculta o elemento se modules[id] === false
 *
 * O título da aba é gerado a partir de `document.documentElement.dataset.page`.
 * As cores do tema viram variáveis CSS `--brand-*` no elemento raiz.
 */
import { platformConfig } from "../../config/platform.js";

export { platformConfig };

/** Templates de título por página (chave em <html data-page="...">). */
export const TITLE_TEMPLATES = {
  home: (name) => name,
  instructor: (name) => `Central do Instrutor - ${name}`,
  team: (name) => `Equipe - ${name}`,
  "self-test": (name) => `Autoteste - ${name}`,
  "not-found": (name) => `Página não encontrada - ${name}`
};

/**
 * Deriva as iniciais de um nome para o avatar de fallback.
 * @param {string} value
 * @returns {string}
 */
export function initialsFrom(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Monta o título da aba para uma página, usando o nome da empresa.
 * @param {string} pageKey
 * @param {typeof platformConfig} [config]
 * @returns {string}
 */
export function pageTitle(pageKey, config = platformConfig) {
  const name = config.company?.name || "";
  const build = TITLE_TEMPLATES[pageKey];
  return build ? build(name) : name;
}

/** Mapa cor do tema -> variável CSS aplicada em :root. */
const THEME_VARS = {
  primaryColor: "--brand-primary",
  secondaryColor: "--brand-secondary",
  accentColor: "--brand-accent",
  backgroundColor: "--brand-background",
  textColor: "--brand-text"
};

function applyTheme(config, doc) {
  const theme = config.theme || {};
  const root = doc.documentElement;
  if (!root?.style?.setProperty) return;
  for (const [key, cssVar] of Object.entries(THEME_VARS)) {
    if (theme[key]) root.style.setProperty(cssVar, theme[key]);
  }
}

function setText(doc, selector, value) {
  doc.querySelectorAll(selector).forEach((el) => {
    el.textContent = value ?? "";
  });
}

/**
 * Substitui um <img> quebrado/ausente por um avatar de fallback com iniciais.
 * Não quebra o layout: o span de fallback herda o tamanho do elemento.
 */
function installImageFallback(doc, img, { fallbackText, extraClass }) {
  const swap = () => {
    if (img.dataset && img.dataset.brandFallbackDone === "true") return;
    const span = doc.createElement("span");
    span.className = `${img.className || ""} brand-fallback ${extraClass || ""}`.trim();
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", img.getAttribute("alt") || fallbackText);
    span.textContent = initialsFrom(fallbackText);
    // Preserva o tamanho reservado pela imagem para não quebrar o layout.
    const width = img.getAttribute("width");
    const height = img.getAttribute("height");
    if (width && span.style) span.style.width = `${width}px`;
    if (height && span.style) span.style.height = `${height}px`;
    if (img.dataset) span.dataset.brandFallbackDone = "true";
    img.replaceWith(span);
  };
  img.addEventListener("error", swap);
  return swap;
}

function applyImage(doc, selector, src, alt, fallbackText, extraClass) {
  doc.querySelectorAll(selector).forEach((img) => {
    const swap = installImageFallback(doc, img, { fallbackText, extraClass });
    if (!src) {
      swap();
      return;
    }
    if (alt !== undefined) img.setAttribute("alt", alt);
    img.setAttribute("src", src);
  });
}

function applyFavicon(config, doc) {
  const href = config.company?.favicon;
  if (!href || !doc.head) return;
  let link = doc.querySelector("link[rel='icon']");
  if (!link) {
    link = doc.createElement("link");
    link.setAttribute("rel", "icon");
    doc.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function moduleKey(id) {
  return String(id || "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function applyModules(config, doc) {
  const modules = config.modules || {};
  doc.querySelectorAll("[data-brand-module]").forEach((el) => {
    const id = el.dataset ? el.dataset.brandModule : el.getAttribute("data-brand-module");
    // Aceita tanto o id da UI ("first-aid") quanto a chave do config ("firstAid").
    const enabled = modules[id] !== undefined ? modules[id] : modules[moduleKey(id)];
    if (enabled === false) el.classList.add("hidden");
    else el.classList.remove("hidden");
  });
}

function applyTitle(config, doc) {
  const pageKey = doc.documentElement?.dataset?.page;
  if (!pageKey) return;
  doc.title = pageTitle(pageKey, config);
}

/**
 * Aplica toda a identidade da plataforma no documento fornecido.
 * @param {typeof platformConfig} [config]
 * @param {Document} [doc]
 */
export function applyBranding(config = platformConfig, doc = globalThis.document) {
  if (!doc) return;
  const company = config.company || {};
  const instructor = config.instructor || {};

  applyTheme(config, doc);

  setText(doc, "[data-brand-company-name]", company.name);
  setText(doc, "[data-brand-company-short]", company.shortName);
  setText(doc, "[data-brand-company-subtitle]", company.subtitle);
  setText(doc, "[data-brand-instructor-name]", instructor.name);
  setText(doc, "[data-brand-instructor-role]", instructor.role);
  setText(doc, "[data-brand-footer]", config.footer?.text);

  applyImage(doc, "[data-brand-logo]", company.logo, company.name, company.shortName || company.name, "brand-logo-fallback");
  applyImage(doc, "[data-brand-instructor-photo]", instructor.photo, `Foto de ${instructor.name}`, instructor.name, "instructor-photo-fallback");

  applyFavicon(config, doc);
  applyModules(config, doc);
  applyTitle(config, doc);
}

// Aplica automaticamente quando executado no navegador. Em Node (testes),
// `document` é indefinido e nada acontece na importação.
if (typeof document !== "undefined") {
  applyBranding();
}
