// Le pain sur la planche doit maigrir de ce que l'ÉTAT a réellement consommé.
//
// Bug attrapé le 2026-07-25 : `pressCut` (scene3d) retirait UNE tranche du
// visuel pendant que le hook `onCut` (index.html) en débitait `1 + gabarit`.
// Résultat : « Plus de pain. Appro requis. » s'affichait devant un pain encore
// à moitié plein, et l'écart grandissait à chaque palier de gabarit acheté —
// c'est-à-dire le long de l'axe de progression R2.
//
// Ce que ce test PROUVE (en vrai navigateur, vraie 3D, vrais appuis) :
//   1. le visuel se recharge quand il a vraiment fini une planchée
//      (toast « La suite du pain sur la planche. ») — avant le correctif, le
//      pain de 250 g s'épuisait côté état sans que le visuel ne se recharge
//      une seule fois ;
//   2. « Plus de pain » ne tombe QUE quand les grammes sont à zéro ;
//   3. conservation : les grammes sortis des pains == les grammes entrés en
//      barrettes ;
//   4. un geste débite bien `cutSize × (1 + gabarit)` grammes.
//
// Ce qu'il NE prouve PAS : la longueur exacte de la géométrie (rightNeg/rightPos
// est privé au module). Les captures dans shots/la-loupe-desync/ servent de
// preuve visuelle pour ça.
//
//   cd tools && node desync-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "28"])[1];
const THREE_JS = readFileSync(path.join(__dirname, "vendor", "three.module.js"), "utf8");
const OUT = path.join(__dirname, "shots", "la-loupe-desync");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Le scénario : pain de 250 g, couteau 2 (plafond 8 g), gabarit 4 → 5 barrettes
// de 8 g par geste = 40 g. Le visuel plafonne à 170 g (LOAF_L), donc un pain de
// 250 g DOIT provoquer exactement une recharge de planche.
const PAIN_G = 250, CUT = 8, GABARIT = 4;
const PER_PRESS = CUT * (1 + GABARIT);

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=angle",
    "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t)) return; // seul 404 = favicon
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("three.module.js")) {
    req.respond({ status: 200, contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" }, body: THREE_JS });
  } else if (u.includes("127.0.0.1") || u.startsWith("data:")) req.continue();
  else req.abort();
});

// Seed + mouchard à toasts : `toast()` écrit dans #toast, on observe le noeud.
await page.evaluateOnNewDocument((ver, painG, cut, gab) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    pains: [{ g: painG, q: 78 }], painSel: 0, bars: {}, barQ: 78, cutSize: cut,
    upgrades: { couteau: 2, gabarit: gab, scooter: 0, planque: 2, counter: 0 },
    shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true },
  }));
  window.__toasts = [];
  const hook = () => {
    const el = document.getElementById("toast");
    if (!el) return setTimeout(hook, 50);
    new MutationObserver(() => {
      const t = (el.textContent || "").trim();
      if (t && window.__toasts[window.__toasts.length - 1] !== t) window.__toasts.push(t);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  };
  hook();
}, SAVE_VER, PAIN_G, CUT, GABARIT);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(1200);

// Atelier → découpe 3D
await page.click('.tab[data-t="atelier"]');
await page.waitForSelector("#view3d canvas", { timeout: 30000 });
await sleep(2500);
await page.screenshot({ path: path.join(OUT, "00-pain-250.png") });

const readState = () => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  const painG = (s.pains || []).reduce((a, p) => a + p.g, 0);
  const barG = Object.entries(s.bars || {}).reduce((a, [f, n]) => a + +f * n, 0);
  return { painG, barG, toasts: window.__toasts.slice() };
});

const box = await (await page.$("#view3d")).boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height * 0.45;
// headless tourne à ~8 fps avec dt clampé : un hold de 0.6 s demande ~3 s réelles
async function hold() {
  await page.mouse.move(cx, cy); await page.mouse.down();
  await sleep(3000); await page.mouse.up(); await sleep(500);
}

const steps = [];
let prev = await readState();
const start = prev.painG;
for (let i = 0; i < 12 && prev.painG > 0; i++) {
  await hold();
  const now = await readState();
  steps.push({ i: i + 1, pris: prev.painG - now.painG, reste: now.painG });
  prev = now;
}
await page.screenshot({ path: path.join(OUT, "01-planche-vide.png") });

const fin = prev;
const suite = fin.toasts.filter((t) => /suite du pain/i.test(t)).length;
const fini = fin.toasts.filter((t) => /Plus de pain/i.test(t)).length;
const pleins = steps.filter((s) => s.reste > 0);

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

ok("Le visuel se recharge quand il a fini sa planchée (170 g < 250 g de pain)",
   suite === 1, `${suite} recharge(s) — attendu 1`);
ok("« Plus de pain » ne tombe qu'à zéro gramme",
   fini === 1 && fin.painG === 0, `toast ×${fini}, reste ${fin.painG} g`);
ok("Conservation · grammes sortis des pains == grammes entrés en barrettes",
   start - fin.painG === fin.barG, `${start - fin.painG} g coupés, ${fin.barG} g en barrettes`);
ok(`Un geste débite cutSize × (1+gabarit) = ${PER_PRESS} g`,
   pleins.length > 0 && pleins.every((s) => s.pris === PER_PRESS),
   pleins.map((s) => s.pris).join("/") + " g" + (steps.length > pleins.length ? ` (+ reliquat ${steps[steps.length - 1].pris} g)` : ""));
ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── désync visuel/état · La Loupe ───");
console.log(`  pain ${PAIN_G} g · coupe ${CUT} g · gabarit ${GABARIT} → ${PER_PRESS} g/geste · ${steps.length} gestes`);
console.log("  toasts :", fin.toasts.join(" | ") || "—");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
