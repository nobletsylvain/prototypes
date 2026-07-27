// « Chaque ligne a une cause. L'UI n'invente rien. » — la promesse du Karnet, vérifiée.
//
// Le principe du projet est qu'une conséquence subie par le joueur doit être NOMMÉE :
// il doit pouvoir relier ce qu'il voit à ce qu'il a fait. Une jauge qui bouge sans
// explication, c'est très exactement l'anti-exemple fondateur (The Boss Gangster).
//
// Ce que ce test attrape : le liquide qui dort chauffait le quartier de +20/min
// au-dessus de 180 et +40/min au-dessus de 450, sans cause au Karnet, sans marque au
// HUD, sans seuil affiché nulle part. Sylvain a joué des soirées à « liquide 567 » —
// donc au palier haut — en voyant sa chaleur grimper sans le moindre indice.
//
//   cd tools && node cause-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const SOFT = +(SRC.match(/DIRTY_HOLD_SOFT\s*=\s*(\d+)/) || [, 180])[1];
const HARD = +(SRC.match(/DIRTY_HOLD_HARD\s*=\s*(\d+)/) || [, 450])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-cause");
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
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// on démarre SOUS le seuil : c'est le franchissement qui doit parler
await page.evaluateOnNewDocument((ver, sous) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    dirty: sous, reput: 20, heat: 0, sachets: { "2": 20 }, sachetQ: 60,
    shelter: { phase: "B", introSeen: true, paidOff: true,
      pdv: { res: 40, bac: 0, prix: 10, chouffes: 0, tampon: {}, tamponQ: 0, queue: [], ledger: [], seq: 0, combo: 1 } },
  }));
}, SAVE_VER, SOFT - 40);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(800);

const sous = await page.evaluate(() => {
  const d = document.getElementById("hudDirty");
  return { txt: d.textContent, classes: d.className };
});
ok("Sous le seuil, la pastille liquide reste neutre",
   !/🔥/.test(sous.txt) && !/warm|hot/.test(sous.classes), `« ${sous.txt} » · ${sous.classes}`);

// on franchit le palier DUR — c'est l'état qu'a joué Sylvain (liquide 567)
// `evaluateOnNewDocument` REJOUE à chaque navigation : écrire le save puis recharger le
// ferait écraser par le seed d'origine. On EMPILE un second seed, qui s'exécute après.
// (Même piège que dans bulles-loupe.mjs — il coûte une demi-heure à chaque fois.)
await page.evaluateOnNewDocument((dur) => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  s.dirty = dur + 120;
  localStorage.setItem("loupe_save", JSON.stringify(s));
}, HARD);
await page.reload({ waitUntil: "load" });
await sleep(1400);   // > 1 tick de dérive (3 s d'accumulation démarrent au chargement)

const dur = await page.evaluate(() => {
  const d = document.getElementById("hudDirty");
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { txt: d.textContent, classes: d.className, titre: d.title,
           journal: (s.journal || []).map((j) => j.txt + " · " + j.cause) };
});
await page.screenshot({ path: path.join(OUT, "01-liquide-chaud.png") });

ok("Au-dessus du palier, le HUD marque que ce liquide COÛTE",
   /🔥/.test(dur.txt) && /hot|warm/.test(dur.classes),
   `« ${dur.txt} » · ${dur.classes || "(sans classe)"}`);

ok("Le seuil est expliqué au survol, il ne reste pas un chiffre magique",
   /chauffe/.test(dur.titre || ""), dur.titre || "(aucune explication)");

const ligne = dur.journal.find((j) => /liquide dort/i.test(j));
ok("Le Karnet NOMME la cause (promesse : « chaque ligne a une cause »)",
   !!ligne, ligne || `aucune ligne — journal : ${dur.journal.slice(0, 3).join(" | ") || "vide"}`);

ok("La cause dit quoi FAIRE, pas seulement ce qui se passe",
   !!ligne && /réinvestis/i.test(ligne), ligne ? "elle oriente vers le réinvestissement" : "—");

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── causes nommées · La Loupe ───");
console.log(`  (seuils lus dans le code : doux ${SOFT} · dur ${HARD})`);
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
