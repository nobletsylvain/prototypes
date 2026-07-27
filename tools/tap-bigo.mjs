// Les gestes survivent-ils à un VRAI appui ? — Le Bigo
//
// Même règle que `tap-loupe.mjs`, appliquée à l'OS diégétique. Un `click` n'est émis
// que si le pointeur se RELÈVE sur le MÊME nœud DOM que celui où il s'est POSÉ. Tout
// écran reconstruit en cadence détruit donc ses propres boutons entre l'appui et le
// relâchement — et un doigt met ~100 à 200 ms, là où un clic synthétique met 0 ms.
//
// Ici la cible est la NAVIGATION : `renderHome()` vidait `#apps` et recréait chaque
// tuile (avec son `addEventListener`) à chaque `tick`, c'est-à-dire une fois par
// seconde, sur l'écran par défaut du téléphone.
//
// POURQUOI DEUX CONTRÔLES, et pas seulement le tap — mesuré, pas supposé : en
// rétablissant l'ancien comportement, le contrôle STRUCTUREL (« le nœud est-il
// remplacé ? ») échoue 3 fois sur 3, tandis que le TAP passe quand même 3 fois sur 3.
// À 1 Hz, un appui de 150 ms ne chevauche une reconstruction que ~15 % du temps : le
// tap seul est un détecteur trop faible à cette cadence, il faudrait des dizaines
// d'essais pour qu'il tombe dessus. Le structurel est donc le GARDE ; le tap prouve
// que la conséquence est réelle. Garder l'un sans l'autre, c'est se raconter une
// histoire. (Sur La Loupe, à 350 ms, le tap échoue ~1 fois sur 3 — assez pour être
// vu, pas assez pour être fiable.)
//
//   cd tools && node tap-bigo.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "le-bigo/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*(\d+)/) || [, "3"])[1];
const OUT = path.join(__dirname, "shots", "le-bigo-tap");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APPUI = 150;   // un pouce sur une icône d'app

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
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// on débloque Karnet : une app NATIVE (pas d'iframe à charger, donc pas de bruit)
await page.evaluateOnNewDocument((ver) => {
  localStorage.setItem("bigo_ver", String(ver));
  localStorage.setItem("bigo_state", JSON.stringify({
    ver: Number(ver), phase: "jeu", step: 9, cash: 500, debt: 0, clock: 1080, day: 1,
    heat: 0, heatLog: {}, descentes: 0, brut: [], fini: { g: 0, qsum: 0 },
    seeds: {}, branches: [], miettes: 0, lotSeq: 1, journal: [],
    unlocked: { karnet: true, planque: true, youss: true },
  }));
}, SAVE_VER);

await page.goto(`http://127.0.0.1:${PORT}/le-bigo/index.html`, { waitUntil: "load" });
await sleep(900);

// L'horloge du proto tourne à 1 Hz : c'est la cadence qui tuait le tap.
const cadence = await page.evaluate(async () => {
  const el = () => document.querySelector('[data-app="karnet"]') || document.querySelector(".appic");
  const a = el();
  await new Promise((r) => setTimeout(r, 2600));   // > 2 ticks
  const b = el();
  return { present: !!a, memeNoeud: !!a && a === b, tuiles: document.querySelectorAll(".appic").length };
});
ok("L'accueil est peuplé d'apps", cadence.present && cadence.tuiles > 0, `${cadence.tuiles} tuile(s)`);
ok("Les icônes ne sont PAS recréées par l'horloge (sinon le doigt tape dans le vide)",
   cadence.memeNoeud,
   cadence.memeNoeud ? "même nœud après 2,6 s (soit 2 ticks)" : "NŒUD REMPLACÉ à chaque tick — le tap mourra");

// le geste : ouvrir une app en pressant comme un pouce
{
  let tapErr = "";
  const cible = '[data-app="karnet"]';
  const existe = await page.$(cible);
  if (!existe) { ok("La tuile Karnet est présente", false, "introuvable"); }
  else {
    try { await page.click(cible, { delay: APPUI }); } catch (e) { tapErr = e.message; }
    await sleep(400);
    const ouvert = await page.evaluate(() => {
      const s = document.getElementById("scr-karnet");
      return { visible: !!(s && s.classList.contains("show")),
               accueil: !!(document.getElementById("scr-home") || {}).classList?.contains("show") };
    });
    await page.screenshot({ path: path.join(OUT, "01-bigo-tap.png") });
    ok(`R1 · taper une icône ouvre vraiment l'app (appui de ${APPUI} ms)`,
       !tapErr && ouvert.visible && !ouvert.accueil,
       tapErr ? `le tap a échoué : ${tapErr}`
              : `Karnet ouvert ${ouvert.visible} · encore sur l'accueil ${ouvert.accueil}`);
  }
}

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── les gestes survivent à un appui · Le Bigo ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
