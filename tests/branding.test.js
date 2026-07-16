import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { platformConfig } from "../config/platform.js";
import { applyBranding, initialsFrom, pageTitle } from "../assets/js/branding.js";

const root = new URL("../", import.meta.url);

// Arquivos "principais" de identidade que não podem manter texto fixo de marca.
const CORE_FILES = [
  "index.html",
  "instrutor.html",
  "equipe.html",
  "404.html",
  "self-test.html",
  "assets/js/instructor.js",
  "assets/js/team.js",
  "assets/js/router.js",
  "assets/js/state.js",
  "assets/js/utils.js",
  "assets/css/global.css",
  "assets/css/instrutor.css",
  "assets/css/equipe.css"
];

const PAGES = ["index.html", "instrutor.html", "equipe.html", "404.html", "self-test.html"];

const readCore = (name) => readFile(new URL(name, root), "utf8");

// ---------------------------------------------------------------------------
// DOM mínimo para exercitar o comportamento real de applyBranding em Node.
// ---------------------------------------------------------------------------
function camel(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.attributes = {};
    this.dataset = {};
    this.className = "";
    this.textContent = "";
    this.children = [];
    this.parent = null;
    this.listeners = {};
    this.style = { props: {}, setProperty(name, value) { this.props[name] = value; } };
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "class") this.className = String(value);
    if (name.startsWith("data-")) this.dataset[camel(name.slice(5))] = String(value);
  }

  getAttribute(name) {
    if (name === "class") return this.className || null;
    return name in this.attributes ? this.attributes[name] : null;
  }

  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }

  dispatch(type) {
    (this.listeners[type] || []).forEach((fn) => fn());
  }

  appendChild(node) {
    node.parent = this;
    this.children.push(node);
    return node;
  }

  replaceWith(node) {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) {
      node.parent = this.parent;
      this.parent.children[index] = node;
    }
  }

  get classList() {
    const tokens = () => new Set(this.className.split(/\s+/).filter(Boolean));
    return {
      add: (cls) => { const set = tokens(); set.add(cls); this.className = [...set].join(" "); },
      remove: (cls) => { const set = tokens(); set.delete(cls); this.className = [...set].join(" "); },
      contains: (cls) => tokens().has(cls)
    };
  }

  matches(selector) {
    const match = selector.match(/^([a-zA-Z]*)\[([^\]=]+)(?:=['"]?([^'"\]]*)['"]?)?\]$/);
    if (!match) return false;
    const [, tag, attr, value] = match;
    if (tag && this.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    if (!(attr in this.attributes)) return false;
    return value === undefined ? true : this.attributes[attr] === value;
  }
}

function makeElement(tag, attrs = {}) {
  const el = new FakeElement(tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function makeDocument({ page } = {}) {
  const registry = [];
  const html = new FakeElement("html");
  if (page) html.setAttribute("data-page", page);
  const head = new FakeElement("head");
  const doc = {
    documentElement: html,
    head,
    _title: "",
    get title() { return this._title; },
    set title(value) { this._title = value; },
    createElement: (tag) => new FakeElement(tag),
    register(el) { registry.push(el); return el; },
    querySelectorAll: (selector) => registry.filter((el) => el.matches(selector)),
    querySelector: (selector) => registry.find((el) => el.matches(selector)) || null
  };
  return doc;
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
test("platformConfig carrega com a estrutura esperada", () => {
  assert.equal(typeof platformConfig, "object");
  for (const key of ["name", "shortName", "subtitle", "logo", "favicon"]) {
    assert.equal(typeof platformConfig.company[key], "string");
  }
  for (const key of ["name", "role", "photo"]) {
    assert.equal(typeof platformConfig.instructor[key], "string");
  }
  for (const key of ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor"]) {
    assert.match(platformConfig.theme[key], /^#/);
  }
  assert.equal(typeof platformConfig.footer.text, "string");
  assert.equal(typeof platformConfig.locale, "string");
  assert.equal(typeof platformConfig.modules.nr23, "boolean");
  assert.equal(typeof platformConfig.modules.firstAid, "boolean");
});

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------
test("initialsFrom deriva iniciais e trata fallback", () => {
  assert.equal(initialsFrom("OLDENIR"), "OL");
  assert.equal(initialsFrom("Ana Paula Souza"), "AS");
  assert.equal(initialsFrom("  "), "?");
  assert.equal(initialsFrom(""), "?");
});

test("pageTitle gera títulos dinâmicos por página", () => {
  const config = { company: { name: "MARCA X" } };
  assert.equal(pageTitle("home", config), "MARCA X");
  assert.equal(pageTitle("instructor", config), "Central do Instrutor - MARCA X");
  assert.equal(pageTitle("team", config), "Equipe - MARCA X");
  assert.equal(pageTitle("self-test", config), "Autoteste - MARCA X");
  assert.equal(pageTitle("not-found", config), "Página não encontrada - MARCA X");
});

// ---------------------------------------------------------------------------
// applyBranding (comportamento real via DOM simulado)
// ---------------------------------------------------------------------------
test("applyBranding aplica textos, título e variáveis CSS", () => {
  const doc = makeDocument({ page: "instructor" });
  const name = doc.register(makeElement("strong", { "data-brand-company-name": "" }));
  const subtitle = doc.register(makeElement("small", { "data-brand-company-subtitle": "" }));
  const short = doc.register(makeElement("strong", { "data-brand-company-short": "" }));
  const instructorName = doc.register(makeElement("strong", { "data-brand-instructor-name": "" }));
  const role = doc.register(makeElement("small", { "data-brand-instructor-role": "" }));
  const footer = doc.register(makeElement("span", { "data-brand-footer": "" }));

  applyBranding(platformConfig, doc);

  assert.equal(name.textContent, platformConfig.company.name);
  assert.equal(subtitle.textContent, platformConfig.company.subtitle);
  assert.equal(short.textContent, platformConfig.company.shortName);
  assert.equal(instructorName.textContent, platformConfig.instructor.name);
  assert.equal(role.textContent, platformConfig.instructor.role);
  assert.equal(footer.textContent, platformConfig.footer.text);

  assert.equal(doc.title, `Central do Instrutor - ${platformConfig.company.name}`);
  assert.equal(doc.documentElement.style.props["--brand-primary"], platformConfig.theme.primaryColor);
  assert.equal(doc.documentElement.style.props["--brand-secondary"], platformConfig.theme.secondaryColor);
  assert.equal(doc.documentElement.style.props["--brand-accent"], platformConfig.theme.accentColor);
  assert.equal(doc.documentElement.style.props["--brand-background"], platformConfig.theme.backgroundColor);
  assert.equal(doc.documentElement.style.props["--brand-text"], platformConfig.theme.textColor);
});

test("applyBranding aplica logo, foto e favicon", () => {
  const doc = makeDocument({ page: "home" });
  const logo = doc.register(makeElement("img", { "data-brand-logo": "", width: "54", height: "54" }));
  const photo = doc.register(makeElement("img", { "data-brand-instructor-photo": "", width: "44", height: "44" }));

  applyBranding(platformConfig, doc);

  assert.equal(logo.getAttribute("src"), platformConfig.company.logo);
  assert.equal(logo.getAttribute("alt"), platformConfig.company.name);
  assert.equal(photo.getAttribute("src"), platformConfig.instructor.photo);
  assert.match(photo.getAttribute("alt"), new RegExp(platformConfig.instructor.name));

  const favicon = doc.head.children.find((el) => el.getAttribute("rel") === "icon");
  assert.ok(favicon, "link rel=icon criado");
  assert.equal(favicon.getAttribute("href"), platformConfig.company.favicon);
});

test("fallback do avatar mostra iniciais quando a imagem falha", () => {
  const doc = makeDocument({ page: "home" });
  const container = new FakeElement("div");
  const photo = makeElement("img", { "data-brand-instructor-photo": "", width: "44", height: "44" });
  container.appendChild(photo);
  doc.register(photo);

  applyBranding({ ...platformConfig, instructor: { name: "OLDENIR", role: "Instrutor", photo: "/x.jpg" } }, doc);
  photo.dispatch("error");

  const fallback = container.children[0];
  assert.notEqual(fallback, photo);
  assert.equal(fallback.textContent, "OL");
  assert.equal(fallback.classList.contains("brand-fallback"), true);
  assert.equal(fallback.getAttribute("role"), "img");
});

test("fallback é aplicado imediatamente quando não há foto configurada", () => {
  const doc = makeDocument({ page: "home" });
  const container = new FakeElement("div");
  const photo = makeElement("img", { "data-brand-instructor-photo": "", width: "44", height: "44" });
  container.appendChild(photo);
  doc.register(photo);

  applyBranding({ ...platformConfig, instructor: { name: "Ana Paula", role: "Instrutora", photo: "" } }, doc);

  assert.equal(container.children[0].textContent, "AP");
});

test("módulo desabilitado é ocultado e o habilitado permanece visível", () => {
  const doc = makeDocument({ page: "home" });
  const nr23 = doc.register(makeElement("article", { "data-brand-module": "nr23" }));
  const firstAid = doc.register(makeElement("article", { "data-brand-module": "first-aid" }));

  applyBranding({ ...platformConfig, modules: { nr23: true, firstAid: false } }, doc);

  assert.equal(firstAid.classList.contains("hidden"), true);
  assert.equal(nr23.classList.contains("hidden"), false);
});

// ---------------------------------------------------------------------------
// Estrutura das páginas
// ---------------------------------------------------------------------------
test("todas as páginas carregam o helper de branding e definem a página", async () => {
  const expectedPage = {
    "index.html": "home",
    "instrutor.html": "instructor",
    "equipe.html": "team",
    "404.html": "not-found",
    "self-test.html": "self-test"
  };
  for (const page of PAGES) {
    const html = await readCore(page);
    assert.match(html, /<script type="module" src="\/assets\/js\/branding\.js"><\/script>/, `${page} sem branding.js`);
    assert.match(html, new RegExp(`data-page="${expectedPage[page]}"`), `${page} sem data-page`);
    assert.match(html, /<link rel="icon" href="\/assets\/images\/favicon\.ico">/, `${page} sem favicon`);
  }
});

test("placeholders declarativos de marca existem nas páginas certas", async () => {
  const index = await readCore("index.html");
  assert.match(index, /data-brand-company-name/);
  assert.match(index, /data-brand-company-subtitle/);
  assert.match(index, /data-brand-instructor-name/);
  assert.match(index, /data-brand-instructor-role/);
  assert.match(index, /data-brand-instructor-photo/);
  assert.match(index, /data-brand-module="nr23"/);
  assert.match(index, /data-brand-module="first-aid"/);

  const instrutor = await readCore("instrutor.html");
  assert.match(instrutor, /data-brand-instructor-photo/);
  assert.match(instrutor, /data-brand-module="nr23"/);
  assert.match(instrutor, /data-brand-module="first-aid"/);

  const equipe = await readCore("equipe.html");
  assert.match(equipe, /data-brand-company-short/);
});

test("arquivos principais não mantêm o nome da marca fixo (só config e docs)", async () => {
  for (const name of CORE_FILES) {
    const content = await readCore(name);
    assert.equal(/ARENA SL/.test(content), false, `${name} ainda contém "ARENA SL" fixo`);
  }
});

// ---------------------------------------------------------------------------
// Fonte do helper e assets padrão
// ---------------------------------------------------------------------------
test("branding.js aplica variáveis CSS, favicon, fallback e módulos", async () => {
  const source = await readCore("assets/js/branding.js");
  assert.match(source, /from "\.\.\/\.\.\/config\/platform\.js"/);
  assert.match(source, /--brand-primary/);
  assert.match(source, /setProperty/);
  assert.match(source, /rel='icon'|rel="icon"/);
  assert.match(source, /addEventListener\("error"/);
  assert.match(source, /enabled === false/);
});

test("assets padrão existem localmente (sem CDN)", async () => {
  await access(new URL("assets/images/instructor-default.jpg", root), constants.R_OK);
  await access(new URL("assets/images/favicon.ico", root), constants.R_OK);
});
