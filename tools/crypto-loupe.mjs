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
   DW.VENDEURS.length > 0 && DW.VENDEURS.every((v) => v.eurG > 0),
   `${DW.VENDEURS.length} vendeur(s) au marché, payables uniquement en crypto`);

/* ── Le modèle récolté sur `darkweb-market/` ─────────────────────────────
   LA fonction du marché : la note décide de ce qui arrive. Sans elle, choisir un vendeur
   revient à lire un prix — avec elle, ça devient un calcul. Le contrôle vérifie que
   l'écart existe VRAIMENT et qu'il va dans le bon sens, sinon la note serait un décor. */
{
  const bas = DW.VENDEURS.reduce((a, v) => (v.note < a.note ? v : a));
  const haut = DW.VENDEURS.reduce((a, v) => (v.note > a.note ? v : a));
  ok("La note publique décide de ce qui arrive vraiment (R4, aucun dé)",
     DW.qualiteReelle(bas) < bas.annoncee && DW.qualiteReelle(haut) > DW.qualiteReelle(bas),
     `${bas.nm} ${bas.note}★ annonce ${bas.annoncee} livre ${DW.qualiteReelle(bas)} · ` +
     `${haut.nm} ${haut.note}★ annonce ${haut.annoncee} livre ${DW.qualiteReelle(haut)}`);

  ok("Personne ne livre plus que ce qu'il annonce — la note retire, elle n'ajoute jamais",
     DW.VENDEURS.every((v) => DW.qualiteReelle(v) <= v.annoncee),
     `${DW.VENDEURS.length} vendeurs vérifiés`);

  /* Le marché doit être un ÉVENTAIL, pas un palier supérieur. Si le premium était
     meilleur ET moins cher au point de qualité, il n'y aurait plus de décision — juste
     un ordre d'achat. On mesure le coût par point RÉELLEMENT livré. */
  const parPoint = (v) => v.eurG / DW.qualiteReelle(v) * 100;
  const cheap = DW.VENDEURS.filter((v) => v.tier === "cheap");
  const prem = DW.VENDEURS.filter((v) => v.tier === "premium");
  ok("Le marché est un éventail : le pas cher est moins cher AU POINT DE QUALITÉ",
     Math.min(...cheap.map(parPoint)) < Math.min(...prem.map(parPoint)),
     `cheap ${Math.min(...cheap.map(parPoint)).toFixed(1)}/point (livre ${Math.max(...cheap.map(DW.qualiteReelle))}) · ` +
     `premium ${Math.min(...prem.map(parPoint)).toFixed(1)}/point (livre ${Math.max(...prem.map(DW.qualiteReelle))})`);

  ok("Le premium ne brade pas — le plafond de remise est plus serré là où c'est bon (R9)",
     DW.CAP_REMISE.premium < DW.CAP_REMISE.mid && DW.CAP_REMISE.mid < DW.CAP_REMISE.cheap,
     `cheap ${DW.CAP_REMISE.cheap} % · mid ${DW.CAP_REMISE.mid} % · premium ${DW.CAP_REMISE.premium} %`);

  const D = DW.darkwebDefaults(), v0 = DW.VENDEURS[0];
  const grosse = v0.qtys[v0.qtys.length - 1];
  ok("Les grosses quantités exigent un passé chez CE vendeur, pas un niveau global",
     !DW.echelle(D, v0).find((e) => e.g === grosse).ouvert
     && DW.echelle(D, v0)[0].ouvert,
     `${grosse} g fermé au premier passage, ${v0.qtys[0]} g ouvert`);

  for (let i = 0; i < 10; i++) { D.rel = D.rel || {}; D.rel[v0.id] = i + 1; }
  ok("…et le rang s'ouvre en commandant chez lui",
     DW.echelle(D, v0).every((e) => e.ouvert) && DW.fidelite(10).pct > 0,
     `après 10 commandes : tout ouvert · fidélité « ${DW.fidelite(10).lvl} » −${DW.fidelite(10).pct} %`);
}

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
  const APPRO = { g: 250, q: 78, prix: 1700 };            // le meilleur pain de l'Appro
  const APPRO_PT = APPRO.prix / APPRO.g / APPRO.q * 100;  // coût par gramme et par point livré
  const parPoint = (v) => v.eurG / DW.qualiteReelle(v) * 100;

  /* PREMIÈRE VERSION DE CE CONTRÔLE : « à qualité comparable, la chaîne bat l'Appro ».
     Elle était MAL POSÉE, et elle l'a prouvé en tombant — au tier moyen, le marché coûte
     9,23 contre 8,72. La valeur du marché n'est pas d'être moins cher à qualité égale :
     c'est d'offrir ce que l'Appro ne peut pas vendre. Deux promesses, donc deux contrôles,
     et ils casseraient tous les deux si un rééquilibrage aplatissait le roster. */
  ok("Le marché atteint des qualités hors d'atteinte de l'Appro",
     DW.VENDEURS.some((v) => DW.qualiteReelle(v) > APPRO.q),
     `Appro plafonne à q${APPRO.q} · marché monte à q${Math.max(...DW.VENDEURS.map(DW.qualiteReelle))}`);

  ok("…et en bas de gamme il est moins cher AU POINT DE QUALITÉ que l'Appro",
     Math.min(...DW.VENDEURS.map(parPoint)) < APPRO_PT,
     `Appro ${APPRO_PT.toFixed(2)}/point · meilleur du marché ${Math.min(...DW.VENDEURS.map(parPoint)).toFixed(2)}/point`);

  /* Le tier MOYEN est aujourd'hui dominé par l'Appro (9,58-9,62 contre 8,72, à qualité
     équivalente) : c'est du contenu mort, et c'est une question d'équilibrage — donc de
     Sylvain, pas de moi. Le contrôle ne l'interdit pas, il le COMPTE : le jour où les
     nombres bougeront, ce chiffre dira si le trou s'est refermé. */
  const domines = DW.VENDEURS.filter((v) => DW.qualiteReelle(v) <= APPRO.q && parPoint(v) > APPRO_PT);
  ok("[VEILLE] combien de vendeurs sont strictement dominés par l'Appro",
     true,
     domines.length
       ? `${domines.length}/${DW.VENDEURS.length} — ${domines.map((v) => `${v.nm} (q${DW.qualiteReelle(v)}, ${parPoint(v).toFixed(2)}/point)`).join(", ")} · nombres en placeholder`
       : "aucun — chaque vendeur a sa raison d'exister");
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

/* Les quatre étapes de la chaîne vivent dans des sous-onglets (l'écran unique faisait
   quatre hauteurs de défilement). On ouvre celui qu'on veut lire, et on le ROUVRE après
   chaque nuit : la clôture ramène toujours sur l'écran par défaut. */
const onglet = async (id) => {
  await page.evaluate((i) => { const b = document.querySelector(`[data-cs="${i}"]`); if (b) b.click(); }, id);
  await sleep(400);
};

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
  await onglet("marche");
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
await onglet("crypto");
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

await onglet("marche");
ok("Le marché s'ouvre alors à l'écran",
   await page.evaluate(() => !!document.querySelector("[data-dark]")),
   "les offres deviennent commandables");
await page.screenshot({ path: path.join(OUT, "02-marche-ouvert.png"), fullPage: true });

/* Le HUD porte cinq pastilles depuis que la crypto s'y est ajoutée, et « buzz » sortait
   de l'écran sur 412 px.

   PREMIÈRE VERSION DE CE CONTRÔLE : elle comparait `getBoundingClientRect().right` à la
   largeur de l'écran — et elle passait AUSSI SANS le correctif. La raison : en flex sans
   retour à la ligne, les pastilles ne débordent pas, elles se font ÉCRASER
   (`flex-shrink` vaut 1 par défaut). La boîte reste donc dans l'écran, et c'est le TEXTE
   qui déborde d'elle. Mesurer la boîte, c'était mesurer la seule chose qui allait bien.
   On compare donc `scrollWidth` à `clientWidth` : la largeur qu'il FAUDRAIT contre celle
   qu'on a. Un chiffre coupé est pire qu'absent — on croit le lire. */
const debord = await page.evaluate(() => {
  const bad = [];
  for (const r of document.querySelectorAll("#top .row")) {
    for (const p of r.children) {
      const b = p.getBoundingClientRect();
      if (b.width <= 0) continue;
      const rogne = p.scrollWidth > p.clientWidth + 1;
      const dehors = b.right > innerWidth + 1 || b.left < -1;
      if (rogne || dehors) {
        bad.push(`${(p.textContent || "").trim()} (${p.scrollWidth}px dans ${p.clientWidth}px)`);
      }
    }
  }
  return { bad, largeur: innerWidth };
});
ok("Aucune pastille du HUD ne sort de l'écran",
   debord.bad.length === 0,
   debord.bad.length ? debord.bad.join(" · ") : `tout tient dans ${debord.largeur}px`);


// ── 13 · la nuit verse la crypto de l'OTC ────────────────────────────────
const passerNuit = async (revenirSur) => {
  await page.evaluate(() => { const b = document.getElementById("dbgBtn"); if (b) b.click(); });
  await sleep(200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[data-dbg]")].find((x) => /Passer la nuit/.test(x.dataset.dbg));
    if (b) b.click();
  });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('[data-t="cash"]'); if (b) b.click(); });
  await sleep(400);
  if (revenirSur) await onglet(revenirSur);
};
const attenduCrypto = Math.round(500 * (1 - B.OTC.frais)) * B.OTC.contactApres;
await passerNuit("marche");
const apNuit = await lire();
ok("À l'échéance, la crypto arrive — exactement le net annoncé",
   apNuit.crypto === attenduCrypto && apNuit.enRoute === 0,
   `annoncé ${attenduCrypto} → reçu ${apNuit.crypto} · file ${apNuit.enRoute}`);

// ── 14..16 · commander, et recevoir ──────────────────────────────────────
/* On prend le premier bouton de commande RÉELLEMENT actif à l'écran, et on lui demande
   quel vendeur et quelle quantité il porte. Choisir l'offre depuis le module puis espérer
   que le bouton correspondant soit ouvert, c'est parier sur le rang et le solde — deux
   choses que ce scénario fait bouger. */
const cible = await page.evaluate(() => {
  const b = [...document.querySelectorAll("[data-dark]")].find((x) => !x.disabled);
  return b ? { id: b.dataset.dark, g: +b.dataset.g } : null;
});
ok("Au moins une commande est à portée après le premier change",
   !!cible, cible ? `${cible.id} · ${cible.g} g` : "aucun bouton actif");

const vend = DW.vendeurById(cible.id);
const devis = DW.devisCommande({ rel: {} }, vend, cible.g, Infinity);
await page.evaluate((id, g) => {
  const b = [...document.querySelectorAll("[data-dark]")].find((x) => x.dataset.dark === id && +x.dataset.g === g);
  if (b && !b.disabled) b.click();
}, cible.id, cible.g);
await sleep(500);
const apCmd = await lire();
ok("Commander débite la crypto et met la marchandise en mer",
   apCmd.commandes === 1 && apCmd.crypto === apNuit.crypto - devis.prix,
   `crypto ${apNuit.crypto} → ${apCmd.crypto} (−${devis.prix}) · ${apCmd.commandes} commande(s) en transit`);

ok("Rien n'arrive avant le délai annoncé (R4)",
   apCmd.pains.length === 0, `planque : ${apCmd.pains.join(", ") || "vide"}`);

for (let i = 0; i < devis.delai; i++) await passerNuit("marche");
const fin = await lire();
/* La qualité livrée est la RÉELLE, pas l'annoncée. C'est le contrôle qui relie le modèle
   à l'écran : si un jour la livraison reprenait `annoncee`, la note redeviendrait un
   décor et le marché un catalogue. */
ok("À la livraison, les pains portent la qualité RÉELLE, pas celle annoncée",
   fin.pains.length > 0 && fin.pains.every((p) => p.endsWith(`q${devis.qReel}`))
   && devis.qReel < vend.annoncee,
   `${fin.pains.join(", ") || "rien"} — ${vend.nm} annonçait q${vend.annoncee}, a livré q${devis.qReel}`);

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
