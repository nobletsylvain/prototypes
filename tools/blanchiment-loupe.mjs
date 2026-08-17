// Le blanchiment : temps et capacité comme goulot, pas seulement une taxe.
//
// Arbitrage Sylvain (2026-07-28) : « temps, capacité comme goulot d'étranglement et pas
// seulement une taxe dessus », puis « on loue avant de pouvoir acheter », et le débouché
// du propre = les gros investissements.
//
// LE CONTEXTE, parce qu'il explique la forme. `S.cash` (le propre) était produit par la
// trieuse et ne servait À RIEN — c'est ce qui a fait couper la trieuse ET le front de
// Karim (dette payable en propre, sans source de propre). Une monnaie sans débouché est
// un compteur. Le blanchiment n'a donc de sens qu'ouvert EN MÊME TEMPS qu'un débouché :
// ici le rachat du fonds de commerce, si bien que blanchir paie ce qui permet de
// blanchir plus.
//
// Ce que ce fichier garde :
//   1. l'arithmétique du devis : frais, plafond, délai — et le devis ANNONCE exactement
//      ce que la clôture versera (R8 + R4). C'est la leçon de l'impayé : une seule
//      source, sinon l'écran finit par promettre ce que la nuit ne tient pas ;
//   2. le plafond est JOURNALIER et PAR LIEU — c'est lui le goulot, pas les frais ;
//   3. **aucun euro perdu ni dupliqué** sur toute la chaîne sale → liasses → propre.
//      C'est le contrôle qui compte : une conversion de monnaie qui fuit est le genre de
//      bug qui ne se voit qu'au bout de vingt soirées ;
//   4. compter ne suffit PAS à laver — la trieuse produit du sale déposable, pas du
//      propre. Avant, `bankBundles` faisait la conversion d'un tap et court-circuitait
//      tout le système ;
//   5. le rachat du fonds améliore les trois nombres, et il se paie en propre.
//
//   cd tools && node blanchiment-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";
import * as B from "../la-loupe/blanchiment.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const BUNDLE = +(SRC.match(/BUNDLE_SIZE\s*=\s*(\d+)/) || [, 5])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-blanchiment");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

const L0 = B.LAVERIES[0];

// ── 1..6 · l'arithmétique, hors navigateur ───────────────────────────────
{
  const st = B.blanchimentDefaults();
  const d = B.devis(st, L0, 5, 100);
  ok("Le devis chiffre frais et net avant de valider (R8)",
     d.ok && d.frais === Math.round(100 * L0.loue.frais) && d.net === 100 - d.frais,
     `100 sale → frais ${d.frais} · net ${d.net} · prêt à J${d.jourPret}`);

  ok("Le délai est un nombre de jours fixe, jamais tiré (R4)",
     d.jourPret === 5 + L0.loue.delai,
     `déposé J5 → J${d.jourPret} (délai ${L0.loue.delai})`);

  // le plafond BORNE, il ne refuse pas : déposer plus que le cap dépose le cap
  const gros = B.devis(st, L0, 5, L0.loue.capJour * 3);
  ok("Le plafond borne le dépôt au lieu de le refuser",
     gros.ok && gros.brut === L0.loue.capJour,
     `demandé ${L0.loue.capJour * 3} → déposé ${gros.brut} (plafond ${L0.loue.capJour})`);

  B.deposer(st, L0, 5, L0.loue.capJour);
  const apres = B.devis(st, L0, 5, 100);
  ok("Le plafond est JOURNALIER — c'est le goulot, pas les frais",
     !apres.ok && /plafond/.test(apres.raison),
     `après avoir rempli le plafond : « ${apres.raison} »`);

  const demain = B.devis(st, L0, 6, 100);
  ok("…et il se rouvre le lendemain",
     demain.ok, `J6 : ${demain.ok ? "de nouveau ouvert" : demain.raison}`);

  ok("Rien n'arrive avant l'échéance",
     B.encaisser(st, 5 + L0.loue.delai - 1).length === 0
     && B.encaisser(st, 5 + L0.loue.delai).length === 1,
     `échéance à J${5 + L0.loue.delai}`);
}

// ── 7..8 · le rachat du fonds ────────────────────────────────────────────
{
  const st = B.blanchimentDefaults();
  const pauvre = B.devisRachat(st, L0, L0.prixFonds - 1);
  ok("Le rachat refuse en DISANT ce qui manque, jamais en silence (R1)",
     !pauvre.ok && pauvre.manque === 1,
     `« ${pauvre.raison} »`);

  B.racheter(st, L0);
  const r = B.reglesDe(L0, st.laveries[L0.id]);
  ok("Posséder le fonds améliore les trois nombres à la fois",
     r.frais < L0.loue.frais && r.capJour > L0.loue.capJour && r.delai <= L0.loue.delai,
     `frais ${Math.round(L0.loue.frais * 100)} → ${Math.round(r.frais * 100)} % · ` +
     `plafond ${L0.loue.capJour} → ${r.capJour} · délai ${L0.loue.delai} → ${r.delai} j`);

  ok("Posséder un fonds ouvre le lieu suivant — on ne loue pas deux fois en aveugle",
     B.laveriesOuvertes(st).length > B.laveriesOuvertes(B.blanchimentDefaults()).length,
     `${B.laveriesOuvertes(B.blanchimentDefaults()).length} lieu(x) au départ → ${B.laveriesOuvertes(st).length} après un rachat`);
}

// ── la page ──────────────────────────────────────────────────────────────
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg" };
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

// des liasses déjà comptées : ce fichier teste le LAVAGE, pas le tri (qui a son feel à lui)
const LIASSES = { 100: 4, 50: 2 };                    // 4×500 + 2×250 = 2500
const POCHE = 60;
const AVOIR = 100 * BUNDLE * 4 + 50 * BUNDLE * 2 + POCHE;
await page.evaluateOnNewDocument((ver, bundles, poche) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    day: 5, cash: 0, dirty: 0, reput: 45, heat: 10, karimBuys: 3,
    sachets: { 2: 20 }, sachetQ: 70, pains: [], bills: [],
    bundles, looseChange: poche, counted: 0,
    shelter: { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
      corners: { pdv: { res: 90, bac: 0, prix: 10, chouffes: 0, tampon: { 2: 10 }, tamponQ: 70,
        queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1, charbonneur: null } } },
  }));
}, SAVE_VER, LIASSES, POCHE);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);

const lire = () => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  const b = s.blanchiment || {};
  const bundleVal = Object.entries(s.bundles || {}).reduce((a, [d, n]) => a + (+d) * 5 * n, 0);
  return { cash: Math.round(s.cash || 0), dirty: Math.round(s.dirty || 0),
           avoir: Math.round(bundleVal + (s.looseChange || 0)),
           depots: (b.depots || []).map((d) => ({ brut: d.brut, frais: d.frais, net: d.net, jourPret: d.jourPret })),
           laveries: b.laveries || {}, day: s.day,
           journal: (s.journal || []).map((j) => ({ txt: j.txt, cause: j.cause, poste: j.poste })) };
});

// ── 10 · l'app Liquide est de retour, et la chaîne se lit dans la barre ──
await page.evaluate(() => { const b = document.querySelector('[data-t="cash"]'); if (b) b.click(); });
await sleep(600);
/* Les quatre étapes vivent dans des sous-onglets depuis que l'écran unique faisait
   quatre hauteurs de défilement. On ouvre donc l'onglet avant de le lire. */
const onglet = async (id) => {
  await page.evaluate((i) => { const b = document.querySelector(`[data-cs="${i}"]`); if (b) b.click(); }, id);
  await sleep(400);
  return page.evaluate(() => ((document.getElementById("stage") || {}).textContent || "").replace(/\s+/g, " "));
};
const barre = await page.evaluate(() =>
  [...document.querySelectorAll("[data-cs]")].map((b) => b.dataset.cs));
ok("La chaîne se lit dans la barre : trier, deposer, changer, commander",
   barre.join(",") === "trieuse,laverie,crypto,marche",
   barre.join(" - ") || "aucun sous-onglet");

const ecran = await onglet("laverie");
ok("La laverie a son ecran, et le lieu y est",
   new RegExp(L0.nm).test(ecran), new RegExp(L0.nm).test(ecran) ? `« ${L0.nm} » visible` : "onglet non ouvert");

ok("R8 · la file « en route » s'affiche AVANT les boutons qui l'allongent",
   ecran.indexOf("En route") >= 0 && ecran.indexOf("En route") < ecran.indexOf(L0.nm),
   `file à ${ecran.indexOf("En route")}, premier lieu à ${ecran.indexOf(L0.nm)}`);

await page.screenshot({ path: path.join(OUT, "01-laverie.png"), fullPage: true });

// ── 11..13 · le dépôt : aucun euro perdu ni dupliqué ─────────────────────
const av = await lire();
await page.evaluate((id) => {
  const b = document.querySelector(`[data-lav-dep="${id}"]`);   // le premier pas : +100
  if (b) b.click();
}, L0.id);
await sleep(500);
const ap = await lire();

ok("Déposer sort l'argent des liasses, à l'euro près",
   ap.depots.length === 1 && av.avoir - ap.avoir === ap.depots[0].brut,
   `avoir ${av.avoir} → ${ap.avoir} (−${av.avoir - ap.avoir}) · déposé ${ap.depots[0] && ap.depots[0].brut}`);

ok("Le propre n'arrive PAS tout de suite — c'est ce que le délai veut dire",
   ap.cash === 0 && ap.depots[0].jourPret === av.day + L0.loue.delai,
   `propre ${ap.cash} · versement prévu J${ap.depots[0].jourPret} (on est à J${av.day})`);

ok("Le dépôt laisse une cause chiffrée au Karnet",
   ap.journal.some((j) => /Déposé/.test(j.txt) && /frais/.test(j.cause || "")),
   (ap.journal.find((j) => /Déposé/.test(j.txt)) || {}).cause || "(rien au journal)");

// ── 14..15 · la nuit verse EXACTEMENT ce que le devis avait annoncé ──────
const attendu = ap.depots[0].net;
for (let i = 0; i < L0.loue.delai; i++) {
  await page.evaluate(() => { const b = document.getElementById("dbgBtn"); if (b) b.click(); });
  await sleep(200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[data-dbg]")].find((x) => /Passer la nuit/.test(x.dataset.dbg));
    if (b) b.click();
  });
  await sleep(900);
}
const fin = await lire();

ok("À l'échéance, la nuit verse EXACTEMENT ce que le devis avait annoncé",
   fin.cash === attendu && fin.depots.length === 0,
   `annoncé ${attendu} → versé ${fin.cash} · file ${fin.depots.length}`);

/* Le contrôle central : rien ne se perd, rien ne se duplique. Ce qui a quitté les liasses
   se retrouve intégralement en propre PLUS les frais. Une fuite de conversion ne se
   verrait qu'au bout de vingt soirées, et jamais comme un bug — seulement comme un
   équilibrage qui « ne tombe pas juste ». */
const sorti = av.avoir - fin.avoir;
ok("Aucun euro perdu ni dupliqué sur toute la chaîne",
   sorti === fin.cash + ap.depots[0].frais,
   `sorti des liasses ${sorti} = propre ${fin.cash} + frais ${ap.depots[0].frais}`);

ok("Le versement laisse une cause qui remonte au dépôt d'origine",
   fin.journal.some((j) => /Blanchi/.test(j.txt) && /déposé J/.test(j.cause || "")),
   (fin.journal.find((j) => /Blanchi/.test(j.txt)) || {}).cause || "(rien au journal)");

await page.screenshot({ path: path.join(OUT, "02-apres-versement.png"), fullPage: true });

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

// ── rapport ─────────────────────────────────────────────────────────────
await browser.close();
server.close();

console.log("\n─── Le blanchiment · temps et capacité comme goulot ───");
console.log(`   ${B.LAVERIES.length} lieu(x) · ${L0.nm} loué : ${Math.round(L0.loue.frais * 100)} % · ${L0.loue.capJour}/jour · J+${L0.loue.delai}\n`);
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? `  (${r.detail})` : ""}`);
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} OK.`);
console.log(`captures → ${path.relative(ROOT, OUT)}`);
if (passed < results.length) process.exit(1);
