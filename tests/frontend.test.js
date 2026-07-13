import test from "node:test";
import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { teamUrl } from "../assets/js/utils.js";
import { buildCells } from "../assets/js/activities/crossword.js";
import { buildGrid, findWordPath } from "../assets/js/activities/word-search.js";
import { getActivity } from "../data/game-content.js";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const ignoredDirs = new Set([".git", ".netlify", "dist", "node_modules", "tmp"]);
const disallowedRemoteQrSources = [
  /cdn\.jsdelivr\.net/i,
  /unpkg\.com/i,
  /chart\.googleapis\.com/i,
  /googleapis\.com\/chart/i
];

async function listFiles(dir, extensions) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      files.push(...await listFiles(fullPath, extensions));
    } else if (extensions.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

test("cria URL da equipe com codigo da sessao e modulo", () => {
  globalThis.window = {
    location: { origin: "https://arena-nr23-brigada-industrial.netlify.app" }
  };

  const url = teamUrl("BRG-7900", { module: "nr23" });
  assert.equal(url, "https://arena-nr23-brigada-industrial.netlify.app/equipe.html?session=BRG-7900&module=nr23");

  const parsed = new URL(url);
  assert.equal(parsed.pathname, "/equipe.html");
  assert.equal(parsed.searchParams.get("session"), "BRG-7900");
  assert.equal(parsed.searchParams.get("module"), "nr23");
});

test("HTML e JavaScript nao usam CDN para QR Code", async () => {
  const files = await listFiles(projectRoot, new Set([".html", ".js"]));
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const pattern of disallowedRemoteQrSources) {
      assert.equal(pattern.test(content), false, `${file} referencia ${pattern}`);
    }
  }
});

test("instrutor carrega biblioteca local de QR Code", async () => {
  const html = await readFile(new URL("../instrutor.html", import.meta.url), "utf8");
  assert.match(html, /<script src="\/assets\/vendor\/qrcode\.min\.js" defer><\/script>/);
  assert.doesNotMatch(html, /https?:\/\/[^"']*qrcode/i);

  const vendorUrl = new URL("../assets/vendor/qrcode.min.js", import.meta.url);
  await access(vendorUrl, constants.R_OK);
  const vendor = await readFile(vendorUrl, "utf8");
  assert.match(vendor, /QRCode/);
});

test("polling da equipe usa chave de atividade e atualização incremental", async () => {
  const teamJs = await readFile(new URL("../assets/js/team.js", import.meta.url), "utf8");
  assert.match(teamJs, /function activityRenderKey/);
  assert.match(teamJs, /stage\.dataset\.activityRenderKey !== key/);
  assert.match(teamJs, /renderer\.updateActivity\?\.\(ctx\)/);
  assert.match(teamJs, /function renderActivityShell/);
  assert.match(teamJs, /function updateActivityStatus/);
  assert.match(teamJs, /function updateRankingPanel/);
  assert.match(teamJs, /function updateClaims/);
  assert.match(teamJs, /function updateProgress/);
  assert.match(teamJs, /function updateFeedback/);
  assert.match(teamJs, /function captureTransientState/);
  assert.match(teamJs, /function restoreTransientState/);

  const renderKeyBody = teamJs.slice(teamJs.indexOf("function activityRenderKey"), teamJs.indexOf("function getActivityDraft"));
  assert.doesNotMatch(renderKeyBody, /updatedAt/);
  assert.doesNotMatch(renderKeyBody, /serverTime|ranking|history|scores|claims|questions|words|entries|hint/);
  assert.match(renderKeyBody, /currentSession\.code/);
  assert.match(renderKeyBody, /currentSession\.activeModule/);
  assert.match(renderKeyBody, /currentSession\.activeActivityId/);
  assert.match(renderKeyBody, /currentSession\.activityStatus/);
});

test("atividades mantem rascunhos e envios por identidade estavel", async () => {
  const commonJs = await readFile(new URL("../assets/js/activities/common.js", import.meta.url), "utf8");
  const crosswordJs = await readFile(new URL("../assets/js/activities/crossword.js", import.meta.url), "utf8");
  const wordSearchJs = await readFile(new URL("../assets/js/activities/word-search.js", import.meta.url), "utf8");
  const apiJs = await readFile(new URL("../assets/js/api.js", import.meta.url), "utf8");

  assert.match(commonJs, /data-draft-key="question:/);
  assert.match(commonJs, /data-sequence-list=/);
  assert.match(commonJs, /data-item-id=/);
  assert.match(commonJs, /dataset\.itemId/);
  assert.match(commonJs, /dataset\.sending === "true"/);
  assert.match(commonJs, /already_answered/);
  assert.match(commonJs, /refreshSession/);
  assert.match(crosswordJs, /data-draft-key="cell:/);
  assert.match(apiJs, /payload\.ok !== true/);

  const wordUpdate = wordSearchJs.slice(wordSearchJs.indexOf("export function updateActivity"), wordSearchJs.indexOf("function claimKey"));
  assert.doesNotMatch(wordUpdate, /innerHTML|replaceChildren/);
});

test("servidor nao mantem logs temporarios com payload sensivel", async () => {
  const apiFunction = await readFile(new URL("../netlify/functions/api.js", import.meta.url), "utf8");
  assert.doesNotMatch(apiFunction, /POST \/api\/sessions payload/);
});

test("painel do instrutor possui monitor dinâmico e cartões de atividade", async () => {
  const html = await readFile(new URL("../instrutor.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../assets/css/instrutor.css", import.meta.url), "utf8");
  const js = await readFile(new URL("../assets/js/instructor.js", import.meta.url), "utf8");

  assert.match(html, /id="activityMonitor"/);
  assert.match(css, /\.activity-card/);
  assert.match(css, /\.monitor-word-grid/);
  assert.match(css, /\.monitor-cross-grid/);
  assert.match(js, /Caça-palavras ao vivo/);
  assert.match(js, /Cruzadinha ao vivo/);
});

test("helpers das grades localizam itens competitivos ao vivo", () => {
  const wordSearch = getActivity("nr23", "word-search");
  const grid = buildGrid(wordSearch.words);
  assert.equal(findWordPath(grid, "EXTINTOR").length, "EXTINTOR".length);

  const crossword = getActivity("nr23", "crossword");
  const cells = buildCells(crossword);
  const calor = crossword.entries.find((entry) => entry.id === "calor");
  assert.ok(cells.has(`${calor.row}:${calor.col}`));
});
