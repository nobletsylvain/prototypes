// L'ARAH doit COÛTER un choix. Sinon ce n'est pas une alerte, c'est une formalité.
//
// Retour de playtest (Sylvain, 2026-07-28) : « j'avais 2 chouffes qui ont bien sonné le
// ARAH et le feeling était vraiment bon de pouvoir remballer le matos et éviter de se
// faire capturer. En revanche, le temps donné pour remballer les barrettes était trop
// long. Pas assez de tension. »
//
// Mesuré sur les constantes d'AVANT — préavis [0,6,12,18], lot de 8, cadence 520 ms.
// Vider un tampon plein (60 barrettes) demande 8 gestes, plus 1 pour la caisse :
//
//     n=1 →  6 s = 12 gestes possibles pour 9 nécessaires →  3 de MARGE
//     n=2 → 12 s = 24 gestes possibles pour 9 nécessaires → 15 de marge   ← son cas
//     n=3 → 18 s = 35 gestes possibles pour 9 nécessaires → 26 de marge
//
// Il n'y avait donc aucun arbitrage à AUCUN niveau de chouffe : on sauvait tout, deux
// fois plutôt qu'une. Le ressenti de Sylvain était même optimiste — il croyait le
// problème lié à ses 2 chouffes, alors qu'un seul suffisait déjà à tout rentrer.
//
// Ce que ce fichier garde, et pourquoi chaque contrôle échoue sur le code d'avant :
//   1. au PREMIER palier de chouffe, un tampon plein n'est PAS entièrement sauvable —
//      c'est la définition même de « il y a une tension » ;
//   2. au DERNIER palier, il l'est — c'est ce que 180/soir achète, et sans ce contrôle
//      rien n'empêcherait de « corriger » la tension jusqu'à rendre le chouffe inutile ;
//   3. une sacoche LÉGÈRE est entièrement sauvable dès le premier palier (R9 : la tension
//      vient de ce qu'on a choisi d'exposer, pas d'un geste qui se durcit — ce serait R5
//      à l'envers) ;
//   4. le préavis ANNONCE ce qu'il permet de rentrer avant de demander le geste (R8) ;
//   5. et sur la vraie page : à un chouffe, il RESTE des barrettes dehors quand le
//      préavis expire. C'est la seule preuve qui ne se déduit pas des constantes.
//
//   cd tools && node arah-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];

// Les constantes sont LUES dans la source, jamais recopiées : un test qui porte sa
// propre copie des nombres cesse de parler du jeu au premier réglage.
const num = (re, def) => +(SRC.match(re) || [, def])[1];
const PRE = JSON.parse((SRC.match(/PDV_PREAVIS_S=(\[[^\]]*\])/) || [, "[0,6,12,18]"])[1]);
const LOT = num(/ARAH_LOT\s*=\s*(\d+)/, 8);
const COOL = num(/ARAH_COOL_MS\s*=\s*(\d+)/, 520) / 1000;
const TAMPON_MAX = num(/PDV_TAMPON_MAX\s*=\s*(\d+)/, 60);
const SAC_LOT = num(/SAC_LOT\s*=\s*(\d+)/, 25);

const OUT = path.join(__dirname, "shots", "la-loupe-arah");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

/** Gestes possibles pendant `pre` secondes. Le PREMIER est gratuit — le cooldown ne
    démarre qu'après lui — d'où le +1. Même formule que `arahCapacite` dans le jeu. */
const gestes = (pre) => Math.floor(pre / COOL) + 1;
/** Gestes nécessaires pour tout sauver : les barrettes, plus un pour la caisse. */
const necessaires = (barrettes) => Math.ceil(barrettes / LOT) + 1;

// ── 1..3 · l'arithmétique de la tension, lue dans la source ───────────────
{
  const p1 = PRE[1], pN = PRE[PRE.length - 1];
  const g1 = gestes(p1), gN = gestes(pN);
  const bes = necessaires(TAMPON_MAX);

  ok("Au premier palier de chouffe, un tampon plein n'est PAS entièrement sauvable",
     g1 < bes,
     `${p1} s = ${g1} gestes pour ${bes} nécessaires (${TAMPON_MAX} barrettes + la caisse)` +
     ` → ${Math.min(TAMPON_MAX, (g1 - 1) * LOT)}/${TAMPON_MAX} sauvées`);

  ok("Au dernier palier, il l'est — c'est ce que la paie maximale achète",
     gN >= bes,
     `${pN} s = ${gN} gestes pour ${bes} nécessaires`);

  ok("Le préavis s'améliore à chaque chouffe embauché",
     PRE.every((v, i) => i === 0 || v > PRE[i - 1]),
     `[${PRE}]`);

  const gSac = gestes(p1), besSac = necessaires(SAC_LOT);
  ok("R9 — une sacoche légère est entièrement sauvable dès le premier chouffe",
     gSac >= besSac,
     `sacoche ${SAC_LOT} barrettes : ${gSac} gestes pour ${besSac} nécessaires` +
     ` — la tension vient de ce qu'on expose, pas d'un geste qui se durcit`);
}

// ── le serveur et la page ─────────────────────────────────────────────────
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const errors = [];
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

/* Un joueur à UN chouffe, tampon plein, chaleur juste sous le seuil : l'ARAH tombe dans
   la seconde qui suit. `evaluateOnNewDocument` REJOUE à chaque navigation — on ne
   navigue donc qu'une fois dans ce fichier (piège rencontré six fois dans ce dépôt). */
await page.evaluateOnNewDocument((ver, plein) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    day: 5, cash: 0, dirty: 300, reput: 45, heat: 94, karimBuys: 3,
    sachets: { 2: 60 }, sachetQ: 70, pains: [],
    shelter: { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
      corners: { pdv: { res: 90, bac: 220, prix: 10, chouffes: 1, tampon: { 2: plein }, tamponQ: 70,
        queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1, charbonneur: null } } },
  }));
}, SAVE_VER, TAMPON_MAX);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(600);

/* Tenir le corner : la seule façon de faire monter la chaleur (`pdvTick` sort sinon).
   On passe par la CARTE, pas par le raccourci du dock : ce fichier parle de l'ARAH, et
   emprunter un chemin ajouté par un autre correctif le ferait planter au lieu d'échouer
   quand on le rejoue sur le code d'avant — un test qui explose ne prouve rien. */
await page.evaluate(() => document.querySelector('[data-pin="pdv"]').click());
await sleep(200);
await page.evaluate(() => document.querySelector('[data-pin-go="pdv"]').click());
/* On ATTEND que l'écran s'ouvre au lieu de parier sur un délai. Le seuil dépend de la
   vitesse de chauffe du moment, et le cri est un sas de 0,9 s pendant lequel la modale
   reste masquée : une attente fixe lit tantôt l'écran, tantôt le vide — et un contrôle
   qui dépend de la charge machine ne garde rien. */
await page.waitForFunction(
  () => { const e = document.getElementById("arahS"); return e && e.offsetParent !== null; },
  { timeout: 15000, polling: 60 },
).catch(() => {});

const dehorsAvant = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  const t = ((s.shelter || {}).corners || {}).pdv || {};
  return Object.values(t.tampon || {}).reduce((a, n) => a + n, 0);
});

// ── 5 · le brief annonce l'arbitrage AVANT de le demander ─────────────────
const brief = await page.evaluate(() => {
  const el = document.getElementById("arahS");
  return el && el.offsetParent !== null ? el.textContent.replace(/\s+/g, " ").trim() : "";
});
ok("L'écran d'évacuation est ouvert et annonce le préavis",
   /\d+ s/.test(brief), brief || "(écran absent)");
ok("R8 — il chiffre ce que le préavis permet de rentrer, avant le geste",
   /~\d+ barrettes/.test(brief),
   brief || "(pas de capacité annoncée)");

await page.screenshot({ path: path.join(OUT, "01-arah-brief.png") });

/* ── 6 · la preuve qui ne se déduit pas des constantes ────────────────────
   On tape « rentrer » aussi vite que le jeu l'autorise, pendant tout le préavis. Si le
   tampon finit vide, il n'y a pas de tension — quel que soit ce que dit l'arithmétique
   plus haut. On tape en RAFALE (plus vite que le cooldown) : le jeu ignore les gestes
   trop rapprochés, donc on mesure bien le plafond du jeu et pas notre cadence de test. */
const t0 = Date.now();
const preavis = PRE[1];
while (Date.now() - t0 < preavis * 1000 + 400) {
  await page.evaluate(() => { const b = document.getElementById("arahT"); if (b) b.click(); });
  await sleep(90);
}
await sleep(600);   // laisse la descente se résoudre

const apres = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return {
    sachets: Object.values(s.sachets || {}).reduce((a, n) => a + n, 0),
    saisie: (s.journal || []).find((j) => /Descente/.test(j.txt || "")) || null,
  };
});

// tout ce qui n'est pas rentré a été saisi : la descente s'écrit dans le journal
const rentrees = apres.sachets - 60;   // la planque en avait 60 au départ
ok("À un seul chouffe, on ne rentre PAS tout un tampon plein",
   rentrees < dehorsAvant && rentrees > 0,
   `${rentrees}/${dehorsAvant} barrettes rentrées en ${preavis} s — le reste est saisi`);
ok("Ce qui reste dehors est bien saisi (la descente tombe, l'alerte n'annule rien)",
   !!apres.saisie,
   apres.saisie ? apres.saisie.txt + " · " + apres.saisie.cause : "(aucune descente au journal)");

await page.screenshot({ path: path.join(OUT, "02-apres-descente.png") });

// ── rapport ──────────────────────────────────────────────────────────────
await browser.close();
server.close();

console.log("\n─── ARAH · la tension du remballage ───");
console.log(`   préavis [${PRE}] · lot ${LOT} · cadence ${COOL}s · tampon max ${TAMPON_MAX}\n`);
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? `  (${r.detail})` : ""}`);
}
for (const e of errors) console.log(`  FAIL  ${e}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} OK${errors.length ? ` · ${errors.length} erreur(s) page` : ""}.`);
console.log(`captures → ${path.relative(ROOT, OUT)}`);
if (passed < results.length || errors.length) process.exit(1);
