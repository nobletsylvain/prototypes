// La crypto et le marché : une monnaie ne s'ouvre JAMAIS sans son débouché.
//
// Arbitrage Sylvain (2026-07-28) : « oui le propre → crypto → darkweb ».
//
// LA RÈGLE QUE CE FICHIER GARDE AVANT TOUTE AUTRE. Ce dépôt a fait deux fois la même
// erreur : `S.cash` (le propre) était produit sans rien acheter, et il a fallu couper la
// trieuse ET le front de Karim. Une monnaie sans débouché n'est pas une monnaie, c'est un
// compteur. La crypto aurait eu le même sort si elle était arrivée seule — d'où le
// contrôle n°1 : **il existe au moins une chose qui ne s'achète QU'en crypto**. S'il
// disparaît un jour, c'est que le marché a été retiré et que la crypto est redevenue un
// compteur : la troisième fois, on le saura tout de suite.
//
// Le reste :
//   — deux canaux qui ne se concurrencent pas : la borne (billets → crypto, immédiat,
//     plafond bas) est la porte d'entrée ; l'OTC (propre → crypto) est la route d'échelle ;
//   — leurs plafonds sont JOURNALIERS et INDÉPENDANTS — remplir l'un ne ferme pas l'autre ;
//   — le contact du marché se GAGNE en faisant tourner le change (R4), il ne tombe pas ;
//   — la chaîne complète tient au gramme : le marché doit être meilleur que l'Appro une
//     fois TOUS les frais payés, sinon monter les deux étages n'a aucun sens ;
//   — une commande payée arrive, même si la planque déborde (R1 — pas de perte sèche).
//
//   cd tools && node crypto-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";
import * as B from "../la-loupe/blanchiment.mjs";
import * as DW from "../la-loupe/darkweb.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-crypto");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// ── 1 · LE contrôle : la crypto a un débouché ────────────────────────────
ok("La crypto achète quelque chose — elle n'est pas un compteur de plus",
   DW.OFFRES.length > 0 && DW.OFFRES.every((o) => o.prix > 0),
   `${DW.OFFRES.length} offre(s) au marché, payables uniquement en crypto`);

// ── 2..6 · les deux canaux ───────────────────────────────────────────────
{
  const st = B.blanchimentDefaults();
  ok("La borne est immédiate — c'est ce qu'on paie plus cher",
     B.BORNE.delai === 0 && B.BORNE.frais > B.OTC.frais,
     `borne ${Math.round(B.BORNE.frais * 100)} % · direct — OTC ${Math.round(B.OTC.frais * 100)} % · J+${B.OTC.delai}`);

  ok("La borne plafonne à 1000/jour (arbitrage Sylvain)",
     B.BORNE.capJour === 1000, `${B.BORNE.capJour}/jour`);

  ok("L'OTC ne s'ouvre pas plus TÔT, il s'ouvre plus GRAND",
     B.OTC.capJour > B.BORNE.capJour,
     `borne ${B.BORNE.capJour}/jour · OTC ${B.OTC.capJour}/jour`);

  B.acheterCrypto(st, "borne", 5, B.BORNE.capJour);
  ok("Remplir la borne ne ferme pas l'OTC — les plafonds sont indépendants",
     B.resteCanal(st, "borne", 5) === 0 && B.resteCanal(st, "otc", 5) === B.OTC.capJour,
     `borne ${B.resteCanal(st, "borne", 5)} · OTC ${B.resteCanal(st, "otc", 5)}`);

  const st2 = B.blanchimentDefaults();
  ok("Le contact du marché se gagne en faisant tourner le change, il ne tombe pas (R4)",
     !B.marcheOuvert(st2) && B.marcheReste(st2) === B.OTC.contactApres,
     `${B.OTC.contactApres} passage(s) chez le changeur`);

  for (let i = 0; i < B.OTC.contactApres; i++) B.acheterCrypto(st2, "otc", 5 + i, 100);
  ok("…et il s'ouvre exactement au passage annoncé",
     B.marcheOuvert(st2), `après ${B.OTC.contactApres} passages : ${B.marcheOuvert(st2) ? "ouvert" : "toujours fermé"}`);
}

// ── 7 · la chaîne tient AU GRAMME, tous frais payés ──────────────────────
/* Sans ce contrôle, rien ne garantit que monter les deux étages serve à quelque chose.
   On compare le meilleur de l'Appro au marché, en ramenant TOUT en sale : c'est la seule
   comparaison qui compte pour le joueur, et c'est celle qu'aucun écran ne fait pour lui. */
{
  const appro = { g: 250, q: 78, prix: 1700 };          // le meilleur pain de l'Appro
  const fondsPossede = B.LAVERIES[0].possede.frais;      // 8 % une fois le fonds racheté
  const o = DW.OFFRES[0];                                // 250 g, même gabarit
  // sale → propre (laverie) → crypto (OTC) : chaque étage prend sa part
  const saleRequis = o.prix / (1 - B.OTC.frais) / (1 - fondsPossede);
  ok("Tous frais payés, le marché bat l'Appro — sinon la chaîne ne sert à rien",
     saleRequis < appro.prix && o.q > appro.q,
     `Appro ${appro.g} g q${appro.q} = ${appro.prix} sale (${(appro.prix / appro.g).toFixed(2)}/g) · ` +
     `marché ${o.g} g q${o.q} = ${Math.round(saleRequis)} sale (${(saleRequis / o.g).toFixed(2)}/g)`);
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

const PROPRE = 6000;
await page.evaluateOnNewDocument((ver, propre) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    day: 5, cash: propre, dirty: 0, reput: 45, heat: 10, karimBuys: 3,
    sachets: {}, sachetQ: 70, pains: [], bills: [],
    bundles: { 100: 4 }, looseChange: 0, counted: 0,
    shelter: { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
      corners: { pdv: { res: 90, bac: 0, prix: 10, chouffes: 0, tampon: {}, tamponQ: 70,
        queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1, charbonneur: null } } },
  }));
}, SAVE_VER, PROPRE);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);
await page.evaluate(() => { const b = document.querySelector('[data-t="cash"]'); if (b) b.click(); });
await sleep(600);

const lire = () => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { cash: Math.round(s.cash || 0), crypto: Math.round(s.crypto || 0), day: s.day,
           passages: (s.blanchiment || {}).otcPassages || 0,
           enRoute: ((s.blanchiment || {}).crypto || []).length,
           commandes: ((s.darkweb || {}).commandes || []).length,
           pains: (s.pains || []).map((p) => `${p.g}g q${p.q}`),
           journal: (s.journal || []).map((j) => ({ txt: j.txt, cause: j.cause })) };
});
const ecran = () => page.evaluate(() => ((document.getElementById("stage") || {}).textContent || "").replace(/\s+/g, " "));

// ── 8..9 · le marché est fermé, et il DIT comment l'ouvrir ───────────────
{
  const t = await ecran();
  ok("Le marché fermé dit COMMENT l'ouvrir, il ne montre pas un cadenas",
     /Le marché/.test(t) && /passage/.test(t),
     /passage/.test(t) ? "il renvoie vers le changeur" : "aucune indication");
  ok("Et aucune offre n'est commandable tant que le contact n'est pas donné",
     !(await page.evaluate(() => !!document.querySelector("[data-dark]"))),
     "aucun bouton de commande");
}
await page.screenshot({ path: path.join(OUT, "01-marche-ferme.png"), fullPage: true });

// ── 10..12 · l'OTC, jusqu'à l'introduction ───────────────────────────────
const av = await lire();
for (let i = 0; i < B.OTC.contactApres; i++) {
  await page.evaluate(() => {
    const bs = [...document.querySelectorAll('[data-cry="otc"]')];
    const b = bs.find((x) => x.dataset.m === "500") || bs[0];
    if (b && !b.disabled) b.click();
  });
  await sleep(400);
}
const apOtc = await lire();
ok("Changer chez le changeur débite le propre et met la crypto en route",
   apOtc.cash < av.cash && apOtc.enRoute === B.OTC.contactApres,
   `propre ${av.cash} → ${apOtc.cash} · ${apOtc.enRoute} opération(s) en route · crypto ${apOtc.crypto} (pas encore versée)`);

ok("Le contact tombe exactement au passage annoncé — et il est dit",
   apOtc.passages === B.OTC.contactApres
   && apOtc.journal.some((j) => /Contact donné/.test(j.txt)),
   (apOtc.journal.find((j) => /Contact donné/.test(j.txt)) || {}).cause || "aucune trace du contact");

ok("Le marché s'ouvre alors à l'écran",
   await page.evaluate(() => !!document.querySelector("[data-dark]")),
   "les offres deviennent commandables");
await page.screenshot({ path: path.join(OUT, "02-marche-ouvert.png"), fullPage: true });

// ── 13 · la nuit verse la crypto de l'OTC ────────────────────────────────
const passerNuit = async () => {
  await page.evaluate(() => { const b = document.getElementById("dbgBtn"); if (b) b.click(); });
  await sleep(200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[data-dbg]")].find((x) => /Passer la nuit/.test(x.dataset.dbg));
    if (b) b.click();
  });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('[data-t="cash"]'); if (b) b.click(); });
  await sleep(400);
};
const attenduCrypto = Math.round(500 * (1 - B.OTC.frais)) * B.OTC.contactApres;
await passerNuit();
const apNuit = await lire();
ok("À l'échéance, la crypto arrive — exactement le net annoncé",
   apNuit.crypto === attenduCrypto && apNuit.enRoute === 0,
   `annoncé ${attenduCrypto} → reçu ${apNuit.crypto} · file ${apNuit.enRoute}`);

// ── 14..16 · commander, et recevoir ──────────────────────────────────────
const offre = DW.OFFRES.find((o) => o.prix <= apNuit.crypto) || DW.OFFRES[0];
await page.evaluate((id) => { const b = document.querySelector(`[data-dark="${id}"]`); if (b && !b.disabled) b.click(); }, offre.id);
await sleep(500);
const apCmd = await lire();
ok("Commander débite la crypto et met la marchandise en mer",
   apCmd.commandes === 1 && apCmd.crypto === apNuit.crypto - offre.prix,
   `crypto ${apNuit.crypto} → ${apCmd.crypto} (−${offre.prix}) · ${apCmd.commandes} commande(s) en transit`);

ok("Rien n'arrive avant le délai annoncé (R4)",
   apCmd.pains.length === 0, `planque : ${apCmd.pains.join(", ") || "vide"}`);

for (let i = 0; i < offre.delai; i++) await passerNuit();
const fin = await lire();
const attenduPains = DW.painsDe({ g: offre.g, q: offre.q, split: offre.split || offre.g }).length;
ok("À la livraison, les pains entrent à la planque avec LEUR qualité",
   fin.pains.length === attenduPains && fin.pains.every((p) => p.endsWith(`q${offre.q}`)),
   `${fin.pains.join(", ") || "rien"} (attendu ${attenduPains} pain(s) q${offre.q})`);

ok("La livraison laisse une cause qui remonte à la commande",
   fin.journal.some((j) => /Livraison/.test(j.txt) && /commandé J/.test(j.cause || "")),
   (fin.journal.find((j) => /Livraison/.test(j.txt)) || {}).cause || "(rien au journal)");

await page.screenshot({ path: path.join(OUT, "03-livre.png"), fullPage: true });
ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

// ── rapport ─────────────────────────────────────────────────────────────
await browser.close();
server.close();

console.log("\n─── La crypto et le marché · une monnaie ne s'ouvre pas sans son débouché ───");
console.log(`   borne ${Math.round(B.BORNE.frais * 100)} % · ${B.BORNE.capJour}/j · direct   —   OTC ${Math.round(B.OTC.frais * 100)} % · ${B.OTC.capJour}/j · J+${B.OTC.delai}\n`);
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? `  (${r.detail})` : ""}`);
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} OK.`);
console.log(`captures → ${path.relative(ROOT, OUT)}`);
if (passed < results.length) process.exit(1);
