// L'escalier d'outils de La Loupe, vérifié dans un vrai navigateur.
//
// Contexte (2026-07-25) : `couteau` avait ses 5 paliers codés et branchés PARTOUT
// (CUT_CAPS, clamps, chips 🔒, lame 3D) — mais aucun point d'achat. Il n'existait
// que dans le menu debug. L'escalier n'avait donc pas de premier barreau, et les
// calibres 5 g / 8 g restaient verrouillés à vie pour un joueur normal.
//
// Depuis, le couteau porte AUSSI le levier qualité de R10 : une lame pourrie hache
// (×0,82 sur la qualité du pain), une bonne lame préserve (×1,00). Et la qualité
// achète de la TOLÉRANCE client (`corner.qualFac`), pas du prix.
//
// Ce que ce test prouve, en jouant :
//   1. le couteau est présent dans la boutique et réellement achetable ;
//   2. l'achat débite le liquide et débloque le calibre supérieur (chip 5 g) ;
//   3. à pain identique, une meilleure lame livre une meilleure qualité ;
//   4. cette qualité arrive jusqu'au client sous forme de tolérance (qFac > 1).
//
//   cd tools && node escalier-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "29"])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-escalier");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t)) return;
  // Ce harnais ne sert PAS Three.js (pas besoin de WebGL ici) : le jeu bascule sur
  // son secours 2D et le signale. C'est le comportement nominal, pas une erreur.
  if (/3D indisponible/.test(t)) return;
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// seed : phase B (pas d'intro), un pain 250 (q78) à couper, du liquide pour la boutique
const seed = (couteau) => ({
  pains: [{ g: 250, q: 78 }], painSel: 0, bars: {}, sachets: {}, cutSize: 2, dirty: 3000, reput: 20,
  upgrades: { couteau, gabarit: 0, scooter: 0, planque: 3, counter: 0 },
  shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true },
});
const boot = async (couteau) => {
  await page.evaluateOnNewDocument((ver, s) => {
    localStorage.setItem("loupe_ver", ver);
    localStorage.setItem("loupe_save", JSON.stringify(s));
  }, SAVE_VER, seed(couteau));
  await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
  await sleep(700);
};

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });
const lire = () => page.evaluate(() => JSON.parse(localStorage.getItem("loupe_save") || "{}"));

// ── 1-2. Le couteau est dans la boutique, et l'acheter débloque le calibre ──
await boot(0);
await page.click('.tab[data-t="shelter"]');
await sleep(500);
const boutique = await page.evaluate(() =>
  [...document.querySelectorAll("[data-up]")].map((b) => ({ up: b.dataset.up, txt: b.textContent.trim(), off: b.disabled })));
await page.screenshot({ path: path.join(OUT, "01-boutique.png") });
const ligneCouteau = boutique.find((b) => b.up === "couteau");
ok("Le couteau est dans la boutique (il n'y était pas : debug seulement)",
   !!ligneCouteau && !ligneCouteau.off, ligneCouteau ? `bouton « ${ligneCouteau.txt} »` : `absent — vu : ${boutique.map((b) => b.up).join(", ")}`);

const avant = await lire();
await page.click('[data-up="couteau"]');
await sleep(500);
const apres = await lire();
ok("L'achat débite le liquide et monte le palier",
   apres.upgrades.couteau === 1 && apres.dirty === avant.dirty - 250,
   `couteau ${avant.upgrades.couteau}→${apres.upgrades.couteau} · liquide ${avant.dirty}→${apres.dirty}`);

// le calibre 5 g doit cesser d'être verrouillé (CUT_CAPS[1] = 5)
await page.click('.tab[data-t="atelier"]');
await sleep(900);
const chips = await page.evaluate(() =>
  [...document.querySelectorAll("#fmtBar [data-set]")].map((b) => ({ g: b.dataset.set, txt: b.textContent.trim(), off: b.disabled })));
const chip5 = chips.find((c) => c.g === "5");
ok("Le calibre 5 g se débloque (chip plus verrouillée)",
   !!chip5 && !/🔒/.test(chip5.txt) && !chip5.off, chips.map((c) => c.g + "g" + (/🔒/.test(c.txt) ? "🔒" : "")).join(" · "));

// ── 3. À pain identique, une meilleure lame livre une meilleure qualité ────
// On coupe 20 barrettes via le débit 2D (déterministe, sans la 3D) à chaque niveau.
const qualitePour = async (couteau) => {
  await boot(couteau);
  await page.click('.tab[data-t="atelier"]');
  await sleep(600);
  // On coupe par le débit 2D (#c5 = ✂ ×5) : même `applyCut` que la lame 3D, mais
  // sans WebGL ni appui long — déterministe et rapide. Le chemin 3D est couvert
  // par desync-loupe.mjs.
  await page.waitForSelector("#c5", { timeout: 10000 });
  for (let i = 0; i < 4; i++) { await page.click("#c5"); await sleep(150); }
  const s = await lire();
  return { q: s.barQ, bars: Object.values(s.bars || {}).reduce((a, n) => a + n, 0) };
};
const q0 = await qualitePour(0);
const q4 = await qualitePour(4);
ok("À pain identique (q78), une meilleure lame livre une meilleure qualité (R10)",
   q0.bars > 0 && q4.bars > 0 && q4.q > q0.q,
   `couteau 0 → q${Math.round(q0.q)} (${q0.bars} barrettes) · couteau 4 → q${Math.round(q4.q)} (${q4.bars} barrettes)`);

// ── 4. Cette qualité arrive au client, en TOLÉRANCE ───────────────────────
const tol = await page.evaluate(async () => {
  const m = await import("./corner.mjs");
  return { bas: m.qualFac(78 * 0.82), haut: m.qualFac(78 * 1.0), ref: m.QUAL_REF };
}).catch(() => null);
ok("La qualité se transforme en tolérance client (qFac), pas en prix",
   !!tol && tol.haut > tol.bas && tol.bas >= 1,
   tol ? `lame pourrie ×${tol.bas.toFixed(2)} → lame nette ×${tol.haut.toFixed(2)} (plancher q${tol.ref})` : "module illisible");

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── escalier d'outils · La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
