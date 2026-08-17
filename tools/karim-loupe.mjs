// L'appro passe par Karim avant que le marché s'ouvre.
//
// Arbitrage de Sylvain (2026-07-28) : l'app Appro ne doit pas être disponible d'emblée.
// Avant, on se fournit chez Karim — celui qui t'a lancé — et c'est en le faisant tourner
// qu'on obtient le contact. Le déblocage est narratif et MÉRITÉ, pas un compte à rebours.
//
// Ce que ce fichier garde, dans cet ordre :
//   1. une partie NEUVE n'a pas l'Appro, et la tuile verrouillée mène CHEZ LUI ;
//   2. acheter chez lui livre vraiment le pain, débite le liquide, et fait avancer le
//      compteur affiché ;
//   3. au dernier achat, l'Appro s'ouvre — et la cause est nommée au Karnet ;
//   4. une partie DÉJÀ EN COURS garde l'Appro : on ne retire pas un outil acquis (R2).
//
// Le point 4 est le plus important des quatre. Sylvain a une partie en cours ; verrouiller
// son Appro l'aurait renvoyé à un tutoriel qu'il a fini il y a des jours. Le même piège
// que la migration des corners pluriels — et là aussi, c'est le test qui doit le tenir.
//
//   cd tools && node karim-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SH = readFileSync(path.join(ROOT, "la-loupe/shelter.mjs"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const N = +(SH.match(/unlockAfter:\s*(\d+)/) || [, 3])[1];
const PRIX = +(SH.match(/price:\s*(\d+)/) || [, 280])[1];
const GRAM = +(SH.match(/buyG:\s*(\d+)/) || [, 100])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-karim");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function ouvrir(save) {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text(), u = (m.location && m.location().url) || "";
    if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
    errors.push("console: " + t);
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.evaluateOnNewDocument((ver, s) => {
    localStorage.setItem("loupe_ver", ver);
    localStorage.setItem("loupe_save", JSON.stringify(s));
  }, SAVE_VER, save);
  await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
  await sleep(700);
  return page;
}
const etat = (page) => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  const tuile = document.querySelector('.app.appro');
  return {
    karimBuys: s.karimBuys, dirty: s.dirty || 0,
    painsG: (s.pains || []).reduce((a, p) => a + p.g, 0),
    tuileVerrouillee: !!(tuile && tuile.classList.contains("locked")),
    tuileMene: tuile ? tuile.dataset.go : "(absente)",
    pinKarim: !!document.querySelector('[data-pin="karim"]'),
    fiche: (document.querySelector("#stage .card h3") || {}).textContent || "",
    boutonKarim: !!document.querySelector("[data-karim]"),
    journal: (s.journal || []).map((j) => j.txt + " · " + j.cause),
    toast: ((document.getElementById("toast") || {}).textContent || "").trim(),
  };
});

// ── partie NEUVE : le marché est fermé, Karim est la seule porte ──────────
const neuve = {
  day: 1, cash: 0, dirty: PRIX * N + 100, reput: 20, heat: 0, pains: [], sachets: {}, sachetQ: 55,
  // planque agrandie une fois : 370 g, de quoi enchaîner les trois achats sans recharger
  // la page. Le rechargement REJOUERAIT le seed d'origine (`evaluateOnNewDocument`) et
  // remettrait le compteur à zéro — le piège que ce dépôt s'est déjà pris cinq fois.
  upgrades: { couteau: 0, gabarit: 0, scooter: 0, planque: 1, counter: 0 },
  shelter: { phase: "B", introSeen: true, paidOff: true },
};
{
  const page = await ouvrir(neuve);
  const a = await etat(page);
  ok("Partie neuve : l'Appro n'est pas encore acquise",
     a.karimBuys === 0 && a.tuileVerrouillee, `karimBuys ${a.karimBuys} · tuile verrouillée ${a.tuileVerrouillee}`);
  ok("La tuile verrouillée mène à CELUI qui l'ouvre, pas à un mur muet",
     a.tuileMene === "karim", `elle route vers « ${a.tuileMene} »`);
  ok("Karim est sur la carte", a.pinKarim, a.pinKarim ? "pin présent" : "aucun pin karim");

  // on va le voir et on lui prend ses pains, un par un
  await page.evaluate(() => { const b = document.querySelector('[data-pin="karim"]'); if (b) b.click(); });
  await sleep(400);
  const fiche = await etat(page);
  await page.screenshot({ path: path.join(OUT, "01-chez-karim.png") });
  ok("Sa fiche s'ouvre avec un bouton d'achat",
     /Karim/.test(fiche.fiche) && fiche.boutonKarim, `« ${fiche.fiche} » · bouton ${fiche.boutonKarim}`);

  const etapes = [];
  for (let i = 1; i <= N; i++) {
    const av = await etat(page);
    await page.evaluate(() => { const b = document.querySelector("[data-karim]"); if (b) b.click(); });
    await sleep(400);
    const ap = await etat(page);
    etapes.push({ i, dg: ap.painsG - av.painsG, dl: av.dirty - ap.dirty, n: ap.karimBuys, toast: ap.toast });
  }
  await page.screenshot({ path: path.join(OUT, "02-contact-donne.png") });

  ok(`Chaque achat livre ${GRAM} g et coûte ${PRIX} en liquide`,
     etapes.every((e) => e.dg === GRAM && e.dl === PRIX),
     etapes.map((e) => `#${e.i} +${e.dg} g / −${e.dl}`).join(" · "));

  ok("Le compteur avance à chaque achat (R4 : le déblocage se relie au geste)",
     etapes.every((e, i) => e.n === i + 1),
     etapes.map((e) => e.n).join(" → "));

  ok("Avant le dernier achat, l'écran dit combien il en reste",
     /Encore \d+/.test(etapes[0].toast), `après le 1er : « ${etapes[0].toast} »`);

  const fin = await etat(page);
  ok(`Au ${N}e achat, l'Appro s'ouvre`,
     !fin.tuileVerrouillee && fin.tuileMene === "buy",
     `tuile verrouillée ${fin.tuileVerrouillee} · route « ${fin.tuileMene} »`);

  ok("Le déblocage est une cause NOMMÉE au Karnet, pas une surprise",
     fin.journal.some((j) => /passe le contact/i.test(j)),
     fin.journal.find((j) => /passe le contact/i.test(j)) || `journal : ${fin.journal.slice(0, 3).join(" | ")}`);

  ok("L'achat chez Karim laisse lui aussi sa cause",
     fin.journal.some((j) => /Pain chez Karim/i.test(j)),
     fin.journal.find((j) => /Pain chez Karim/i.test(j)) || "aucune");
  await page.close();
}

/* ── Le refus doit se LIRE ────────────────────────────────────────────────
   La planque de départ tient 250 g et son pain fait 100 g : on ne peut pas en empiler
   trois. Le déblocage impose donc de jouer la boucle — acheter, couper, vendre, revenir.
   C'est voulu, et c'est même ce qui rend le contact mérité plutôt qu'acheté.
   Mais un bouton qui refuse SANS DIRE POURQUOI, ça, ce serait un bug : le joueur croirait
   l'écran cassé. On vérifie donc les deux refus possibles, chacun dans son état, et on
   exige que le bouton nomme la raison ET le chiffre qui la fonde. */
for (const cas of [
  { nom: "planque pleine", motif: /Planque/, attendu: /\d+\/\d+ g/,
    save: { day: 1, dirty: PRIX * 2, pains: [{ g: 200, q: 55 }], sachets: {}, sachetQ: 55,
            upgrades: { couteau: 0, gabarit: 0, scooter: 0, planque: 0, counter: 0 },
            shelter: { phase: "B", introSeen: true, paidOff: true } } },
  { nom: "liquide insuffisant", motif: /Liquide/, attendu: /\d/,
    save: { day: 1, dirty: PRIX - 1, pains: [], sachets: {}, sachetQ: 55,
            shelter: { phase: "B", introSeen: true, paidOff: true } } },
]) {
  const page = await ouvrir(cas.save);
  await page.evaluate(() => { const b = document.querySelector('[data-pin="karim"]'); if (b) b.click(); });
  await sleep(400);
  const b = await page.evaluate(() => {
    const el = document.querySelector("[data-karim]");
    return { texte: el ? el.textContent.trim() : "(absent)", inactif: el ? el.disabled : null };
  });
  ok(`Refus « ${cas.nom} » : le bouton nomme la raison et son chiffre`,
     b.inactif === true && cas.motif.test(b.texte) && cas.attendu.test(b.texte),
     `« ${b.texte} » · inactif ${b.inactif}`);
  await page.close();
}

// ── partie DÉJÀ EN COURS : on ne lui retire pas ce qu'elle a ─────────────
{
  const enCours = {
    day: 6, cash: 0, dirty: 900, reput: 55, heat: 10, pains: [{ g: 60, q: 70 }],
    sachets: { 2: 20 }, sachetQ: 70, journal: [{ t: 1, txt: "Vente corner", cause: "Momo · deal +48" }],
    shelter: { phase: "B", introSeen: true, paidOff: true },
  };
  const page = await ouvrir(enCours);
  const a = await etat(page);
  await page.screenshot({ path: path.join(OUT, "03-partie-en-cours.png") });
  ok("R2 · une partie déjà en cours GARDE son Appro (on ne retire pas un outil acquis)",
     !a.tuileVerrouillee && a.tuileMene === "buy" && a.karimBuys === N,
     `jour 6, stock et journal présents → karimBuys ${a.karimBuys}, tuile verrouillée ${a.tuileVerrouillee}`);
  await page.close();
}

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── l'appro passe par Karim · La Loupe ───");
console.log(`  (lu dans la source : ${N} achats · ${GRAM} g à ${PRIX} le pain)`);
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
