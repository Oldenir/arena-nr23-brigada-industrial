import test from "node:test";
import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { teamUrl } from "../assets/js/utils.js";

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
