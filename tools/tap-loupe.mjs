// Les gestes survivent-ils à un VRAI appui ? — La Loupe
//
// Retour de playtest (2026-07-27) : « je cliquais sur récupérer les barrettes mais
// rien ne se passait », puis la descente a pris 440 d'exposé.
//
// Cause : un `click` n'est émis que si le pointeur se RELÈVE sur le MÊME nœud DOM que
// celui où il s'est POSÉ. Tout écran qui se reconstruit en cadence (`innerHTML` depuis
// une boucle de frame) détruit donc ses propres boutons entre l'appui et le
// relâchement. Un doigt met ~100 ms ; un clic synthétique de test, 0 ms — d'où des
// tests au vert sur des écrans morts.
//
// Ce fichier presse pour de vrai (`delay: 120`) chaque geste qui vit sous une cadence,
// et vérifie que l'ÉTAT a bougé. Il ne regarde jamais si le bouton « existe ».
//
//   cd tools && node tap-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-tap");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APPUI = 120;   // durée d'un vrai appui de pouce

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
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// ── BeuherShit : une tournée EN ROUTE fait tourner la boucle ───────────────
// C'est la condition qui déclenchait la cadence : tant qu'un coursier est dehors,
// `renderBeuher` était rappelé toutes les 350 ms. On seed donc UNE tournée active
// (pour la cadence) ET une tournée rentrée (pour avoir un bouton à presser).
await page.evaluateOnNewDocument((ver) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    dirty: 100, reput: 20, sachets: { "2": 20 }, sachetQ: 62,
    runs: [
      { id: "rEnRoute", courierId: "c1", courierNm: "Yaz", col: "#8fd0ff", g: 10, pay: 0,
        fee: 0, net: 80, busted: false, left: 40, total: 60, collected: false, orderIds: [] },
      { id: "rRentre", courierId: "c2", courierNm: "Lou", col: "#9be37d", g: 12, pay: 0,
        fee: 0, net: 150, busted: false, left: 0, total: 60, collected: false, orderIds: [] },
    ],
    shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true },
  }));
}, SAVE_VER);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);
await page.evaluate(() => { const b = document.querySelector('.tab[data-t="beuher"]'); if (b) b.click(); });
await sleep(600);

// la cadence tourne-t-elle vraiment ? sans ça le test ne prouverait rien
const cadence = await page.evaluate(async () => {
  const el = () => document.querySelector("[data-col]");
  const a = el();
  await new Promise((r) => setTimeout(r, 800));
  const b = el();
  return { present: !!a, memeNoeud: !!a && a === b,
    eta: (document.getElementById("bEta_rEnRoute") || {}).textContent || "-" };
});
ok("La tournée en route fait bien vivre l'écran (le compteur tourne)",
   cadence.present && cadence.eta !== "-", `bouton présent ${cadence.present} · ETA ${cadence.eta}`);
ok("Le bouton n'est PAS remplacé pendant qu'une tournée tourne (sinon le doigt tape dans le vide)",
   cadence.memeNoeud, cadence.memeNoeud ? "même nœud après 800 ms" : "NŒUD REMPLACÉ — le tap mourra");

// ── le geste lui-même, pressé comme un pouce ───────────────────────────────
{
  const avant = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return { dirty: s.dirty || 0, collecte: (s.runs || []).find((r) => r.id === "rRentre")?.collected };
  });
  let tapErr = "";
  try { await page.click('[data-col="rRentre"]', { delay: APPUI }); } catch (e) { tapErr = e.message; }
  await sleep(400);
  const apres = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return { dirty: s.dirty || 0, collecte: (s.runs || []).find((r) => r.id === "rRentre")?.collected };
  });
  await page.screenshot({ path: path.join(OUT, "01-beuher-tap.png") });
  ok(`R1 · « Compter le liquide » encaisse vraiment (appui de ${APPUI} ms, tournée en cours)`,
     !tapErr && apres.collecte === true && apres.dirty > avant.dirty,
     tapErr ? `le tap a échoué : ${tapErr}`
            : `liquide ${avant.dirty} → ${apres.dirty} · encaissé ${apres.collecte}`);
}

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── les gestes survivent à un appui · La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
