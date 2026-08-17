// Le système de chaleur de La Loupe : la descente doit rester ATTEIGNABLE.
//
// Le chouffe achète du PRÉAVIS, pas l'immunité — c'est l'arbitrage de Sylvain du
// 2026-07-26, et le commentaire du code le dit. Il ne le faisait pas : l'amortissement
// `1/(1+n×0,18)` continuait d'écraser la génération de chaleur bien au-delà du dernier
// palier de préavis, jusqu'à passer SOUS le refroidissement.
//
// Mesuré sur les constantes de la source, à activité 1 :
//
//     n=0  → 1,300/s, descente en   73 s        n=6  → 0,262/s, descente en  363 s
//     n=3  → 0,599/s, descente en  159 s        n=10 → 0,014/s, descente en 6650 s
//                                               n=11 → NÉGATIF, la chaleur ne monte plus
//
// Et mesuré sur la vraie page, corner tenu, 6 s sans rien toucher, AVANT correctif :
//
//     n= 0 : 0,0 → 12,8      n=11 : 0,0 → 1,9      n=24 : 0,0 → 0,0  « le coin ne chauffe plus »
//
// À 24 chouffes l'ARAH, la descente et l'écran d'évacuation devenaient inatteignables :
// ce n'était pas un plafond de sécurité, c'était un interrupteur. (Le seuil exact dépend
// de l'activité — n=11 à activité pleine, plus haut quand la rue est calme — mais le fait
// structurel est le même : au-delà d'un certain nombre, la jauge ne bouge plus du tout.)
//
// Le correctif fait SATURER l'amortissement là où le préavis cesse de s'améliorer.
// Ce fichier vérifie les deux moitiés : la chaleur monte toujours, ET l'écran dit qu'un
// chouffe de plus n'achète rien — parce que Sylvain a écarté le plafond dur, donc
// l'autolimitation passe par l'information, pas par un mur.
//
//   cd tools && node chaleur-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const PAY = +(SRC.match(/PDV_CHOUFFE_PAY\s*=\s*(\d+)/) || [, 60])[1];
// le dernier palier de préavis : c'est LÀ que l'amortissement doit saturer
const PRE = JSON.parse((SRC.match(/PDV_PREAVIS_S=(\[[^\]]*\])/) || [, "[0,6,12,18]"])[1]);
const PALIER = PRE.length - 1;
const OUT = path.join(__dirname, "shots", "la-loupe-chaleur");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FENETRE = 5000;   // on laisse la jauge courir sans rien toucher

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg" };
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
const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// Une soirée identique à chaque fois, seul le nombre de chouffes change : c'est la seule
// façon de comparer les montées entre elles. Réservoir et tampon au max pour que
// l'activité ne dépende pas du hasard de la file.
async function soiree(chouffes) {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text(), u = (m.location && m.location().url) || "";
    if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
    errors.push("console: " + t);
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.evaluateOnNewDocument((ver, ch) => {
    localStorage.setItem("loupe_ver", ver);
    localStorage.setItem("loupe_save", JSON.stringify({
      day: 3, cash: 9000, dirty: 0, reput: 60, heat: 0, sachets: { 2: 200 }, sachetQ: 70,
      shelter: { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
        corners: { pdv: { res: 100, bac: 0, prix: 10, chouffes: ch, tampon: { 2: 200 }, tamponQ: 70,
          queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 5, combo: 1, charbonneur: null } } },
    }));
  }, SAVE_VER, chouffes);
  await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
  await sleep(600);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
  await sleep(600);
  const h0 = await page.evaluate(() => JSON.parse(localStorage.getItem("loupe_save") || "{}").heat || 0);
  await sleep(FENETRE);
  const h1 = await page.evaluate(() => JSON.parse(localStorage.getItem("loupe_save") || "{}").heat || 0);
  // le texte du gain vit dans le tiroir « Gérer »
  await page.evaluate(() => { const b = document.getElementById("cManage"); if (b) b.click(); });
  await sleep(350);
  const txt = await page.evaluate(() => ((document.getElementById("pChGain") || {}).textContent || "(absent)").trim());
  if (chouffes === PALIER) await page.screenshot({ path: path.join(OUT, "01-palier.png") });
  if (chouffes > PALIER * 8) await page.screenshot({ path: path.join(OUT, "02-satures.png") });
  await page.close();
  return { n: chouffes, montee: h1 - h0, txt };
}

const nul = await soiree(0);
const palier = await soiree(PALIER);
const masse = await soiree(PALIER * 8);   // très au-delà : là où la jauge se figeait

// ── 1. le contrôle prouve quelque chose : sans chouffe, ça chauffe ────────
ok("Sans chouffe, le corner chauffe — sinon rien de ce qui suit ne prouve rien",
   nul.montee > 1,
   `+${nul.montee.toFixed(1)} de chaleur en ${FENETRE / 1000} s`);

// ── 2. le chouffe RALENTIT, il n'éteint pas ──────────────────────────────
ok("Le chouffe ralentit la montée (c'est bien lui qui agit)",
   palier.montee > 0.5 && palier.montee < nul.montee,
   `${PALIER} chouffes : +${palier.montee.toFixed(1)} contre +${nul.montee.toFixed(1)} à sec`);

// ── 3. LE cœur : l'amortissement sature, la descente reste atteignable ───
ok(`R9 · au-delà du dernier palier de préavis, la chaleur monte ENCORE (${PALIER * 8} chouffes)`,
   masse.montee > 0.5,
   masse.montee > 0.5 ? `+${masse.montee.toFixed(1)} en ${FENETRE / 1000} s — la descente reste atteignable`
                      : `+${masse.montee.toFixed(1)} — LA JAUGE EST GELÉE, l'ARAH et la descente sont hors d'atteinte`);

ok("…et elle monte au MÊME rythme qu'au dernier palier (l'amortissement sature vraiment)",
   Math.abs(masse.montee - palier.montee) <= Math.max(0.4, palier.montee * 0.12),
   `${PALIER} chouffes +${palier.montee.toFixed(1)} · ${masse.n} chouffes +${masse.montee.toFixed(1)}`);

// ── 4. l'autolimitation passe par l'information, pas par un mur ──────────
// Sylvain a écarté le plafond dur : embaucher reste possible, mais l'écran doit dire
// que ça n'achète plus rien — et rappeler que le salaire, lui, continue de courir.
ok("L'écran dit qu'un chouffe de plus n'achète rien, au lieu de le laisser croire",
   /n'achète rien/i.test(masse.txt),
   `« ${masse.txt} »`);

ok("…et il rappelle le salaire, pour que le coût du geste inutile soit lisible",
   masse.txt.includes(String(PAY)),
   `${PAY}/soir cité : ${masse.txt.includes(String(PAY))}`);

ok("Sous le palier, l'écran chiffre encore ce que le chouffe achète (R2)",
   /préavis/.test(nul.txt) && /ouverture/.test(nul.txt) && !/n'achète rien/i.test(nul.txt),
   `« ${nul.txt} »`);

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── chaleur & chouffes · La Loupe ───");
console.log(`  (paliers de préavis lus dans le code : ${JSON.stringify(PRE)} · salaire ${PAY}/soir)`);
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
