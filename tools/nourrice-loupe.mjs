// La vanne du liquide : Tata Yamina garde, et se paie.
//
// Constat de Sylvain en jouant : « aucune option de retirer l'argent du corner, ou de le
// cacher chez une nourrice ». Le code lui donnait raison — tous les puits du jeu étaient
// des STOCKS. Les upgrades sont plafonnés (7 900 réellement achetables), le pain déplace
// la pression vers la planque au lieu de la supprimer, la paie des chouffes plafonne à
// 180/soir, et la trieuse est coupée. Une fois les upgrades au max, le liquide ne pouvait
// plus que monter — et au-dessus de 450 il chauffe à +40/min pour un seuil de descente à 95.
//
// La vanne a un seul nombre : la pension, un POURCENTAGE de ce qu'elle garde, prélevé à
// chaque clôture. Pourquoi un pourcentage et pas une somme fixe — mesuré, pas supposé :
//
//   à 100/soirée fixe, un joueur qui fait  400/soirée finit par cacher  9 000 (pension = 25 % de sa soirée)
//   à 100/soirée fixe, un joueur qui fait 3000/soirée finit par cacher 87 000 (pension =  3 % de sa soirée)
//
// Le fixe fait donc mal quand on n'a pas les moyens et ne fait plus rien quand le liquide
// devient un vrai problème : c'est le défaut des upgrades plafonnés, un stock que le jeu
// dépasse. Le pourcentage, lui, coûte toujours une soirée de travail à l'équilibre.
//
// Ce que ce fichier garde :
//   1. déposer refroidit vraiment (le liquide sur soi baisse d'autant) ;
//   2. reprendre est immédiat et complet — pas de retenue déguisée ;
//   3. la pension tombe à la clôture, et si la poche est courte elle mange le MAGOT,
//      jamais ne crée de dette (R1 : c'est ce qui avait forcé FRONT_ENABLED = false) ;
//   4. le montant est annoncé AVANT le geste (R8) ;
//   5. le Karnet continue de BOUCLER avec ce nouveau poste — un puits ajouté au jeu mais
//      oublié dans le bilan ferait apparaître « Non expliqué ».
//
//   cd tools && node nourrice-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";
import { NOURRICE_PENSION } from "../la-loupe/shelter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const HARD = +(SRC.match(/DIRTY_HOLD_HARD\s*=\s*(\d+)/) || [, 450])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-nourrice");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// un joueur en zone DURE : c'est l'état que Sylvain a joué (liquide 405, chaleur 49)
await page.evaluateOnNewDocument((ver, dirty) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    day: 5, cash: 0, dirty, reput: 45, heat: 20, karimBuys: 3,
    sachets: { 2: 40 }, sachetQ: 70, pains: [],
    shelter: { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
      corners: { pdv: { res: 90, bac: 0, prix: 10, chouffes: 1, tampon: { 2: 40 }, tamponQ: 70,
        queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1, charbonneur: null } } },
  }));
}, SAVE_VER, HARD + 200);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);

const lire = () => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  const n = (s.shelter && s.shelter.nourrice) || {};
  return { dirty: Math.round(s.dirty || 0), garde: Math.round(n.garde || 0), day: s.day,
           spend: (s.dayTally || {}).spend,
           fiche: ((document.getElementById("stage") || {}).textContent || "").replace(/\s+/g, " "),
           journal: (s.journal || []).map((j) => ({ txt: j.txt, cause: j.cause, poste: j.poste, eur: j.eur })) };
});

// ── elle est sur la carte, et sa fiche annonce le prix AVANT le geste ─────
await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "nourrice"); if (b) b.click(); });
await sleep(450);
const av = await lire();
await page.screenshot({ path: path.join(OUT, "01-chez-elle.png") });

ok("Tata Yamina est sur la carte et sa fiche s'ouvre",
   /Tata Yamina/.test(av.fiche), av.fiche.slice(0, 90) || "fiche introuvable");

ok("R8 · la fiche annonce la pension AVANT le moindre dépôt",
   /pension/i.test(av.fiche) && new RegExp(`${Math.round(NOURRICE_PENSION * 100)}\\s*%`).test(av.fiche),
   `taux ${Math.round(NOURRICE_PENSION * 100)} % lisible sur la fiche : ${new RegExp(`${Math.round(NOURRICE_PENSION * 100)}\\s*%`).test(av.fiche)}`);

// ── déposer refroidit vraiment ───────────────────────────────────────────
await page.evaluate(() => { const b = document.querySelector('[data-nour-dep="500"]'); if (b) b.click(); });
await sleep(400);
const dep = await lire();
ok("Déposer sort l'argent de ta poche, à l'unité près",
   dep.dirty === av.dirty - 500 && dep.garde === av.garde + 500,
   `poche ${av.dirty} → ${dep.dirty} · chez elle ${av.garde} → ${dep.garde}`);

ok("Le dépôt laisse une cause nommée au Karnet",
   dep.journal.some((j) => /Confié/.test(j.txt) && j.poste === "nourrice"),
   (dep.journal.find((j) => j.poste === "nourrice") || {}).cause || "aucune");

// ── reprendre rend TOUT : pas de retenue déguisée ────────────────────────
await page.evaluate(() => { const b = document.querySelector('[data-nour-ret="100"]'); if (b) b.click(); });
await sleep(400);
const ret = await lire();
ok("Reprendre rend l'intégralité — le coût est la pension, pas une retenue cachée",
   ret.dirty === dep.dirty + 100 && ret.garde === dep.garde - 100,
   `poche ${dep.dirty} → ${ret.dirty} · chez elle ${dep.garde} → ${ret.garde}`);

// ── la pension tombe à la clôture, sur la poche ──────────────────────────
{
  const attendue = Math.max(1, Math.round(ret.garde * NOURRICE_PENSION));
  await page.evaluate(() => { const b = document.getElementById("dbgBtn"); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[data-dbg]")].find((x) => /Passer la nuit/.test(x.dataset.dbg));
    if (b) b.click();
  });
  await sleep(700);
  const ap = await lire();
  ok(`La pension tombe à la clôture (${Math.round(NOURRICE_PENSION * 100)} % de ${ret.garde} = ${attendue})`,
     ap.spend && ap.spend.nourrice === attendue,
     `spend.nourrice ${ap.spend && ap.spend.nourrice} · attendu ${attendue}`);

  ok("Elle se sert d'abord sur la POCHE, pas sur le magot",
     ap.garde === ret.garde && ap.dirty < ret.dirty,
     `chez elle ${ret.garde} → ${ap.garde} (inchangé) · poche ${ret.dirty} → ${ap.dirty}`);

  ok("La pension laisse une cause nommée et chiffrée",
     ap.journal.some((j) => /Pension/.test(j.txt) && j.poste === "nourrice" && j.eur < 0),
     (ap.journal.find((j) => /Pension/.test(j.txt)) || {}).cause || "aucune");
}

/* ── R1 · poche vide : le magot fond, la dette n'existe pas ───────────────
   C'est le point qui décide si la vanne est jouable. Une charge qui ne peut pas être
   payée et qui s'accumule, c'est exactement la boucle sans sortie que `FRONT_ENABLED =
   false` a dû fermer. Ici, elle se sert dans le magot : ça fait mal, ça ne piège pas. */
{
  await page.evaluateOnNewDocument(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    s.dirty = 0; s.cash = 0;
    s.shelter.nourrice = { garde: 1000, vue: true };
    localStorage.setItem("loupe_save", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "load" });
  await sleep(700);
  const avant = await lire();
  await page.evaluate(() => { const b = document.getElementById("dbgBtn"); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[data-dbg]")].find((x) => /Passer la nuit/.test(x.dataset.dbg));
    if (b) b.click();
  });
  await sleep(700);
  const apres = await lire();
  await page.screenshot({ path: path.join(OUT, "02-poche-vide.png") });

  ok("Le contrôle part bien d'une poche vide et d'un magot plein",
     avant.dirty === 0 && avant.garde === 1000, `poche ${avant.dirty} · magot ${avant.garde}`);

  ok("R1 · poche vide : elle se sert DANS LE MAGOT, elle ne crée jamais de dette",
     apres.garde < avant.garde && apres.dirty === 0 && apres.garde > 0,
     `magot ${avant.garde} → ${apres.garde} · poche reste à ${apres.dirty}`);

  ok("…et elle le dit, au lieu de le prendre en silence",
     apres.journal.some((j) => /Pension/.test(j.txt) && /magot/i.test(j.cause || "")),
     (apres.journal.find((j) => /Pension/.test(j.txt)) || {}).cause || "aucune mention du magot");
}

// ── le Karnet boucle toujours avec ce nouveau poste ──────────────────────
// Un puits ajouté au jeu mais oublié dans POSTES ferait apparaître « Non expliqué » —
// c'est précisément à ça que sert cette ligne, et c'est le moment de vérifier qu'elle dort.
{
  await page.evaluate(() => { const b = document.getElementById("dbgBtn"); if (b) b.click(); });
  await sleep(200);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-go]")].find((x) => x.dataset.go === "karnet"); if (b) b.click(); });
  await sleep(600);
  const txt = await page.evaluate(() => ((document.getElementById("stage") || {}).textContent || "").replace(/\s+/g, " "));
  await page.screenshot({ path: path.join(OUT, "03-karnet-pension.png"), fullPage: true });

  ok("Le Karnet nomme la pension comme un poste du bilan",
     /Pension/.test(txt), /Pension/.test(txt) ? "poste présent" : "le poste manque au bilan");

  ok("Le pont boucle toujours — aucun « non expliqué » malgré le nouveau puits",
     !/Non expliqu/i.test(txt),
     /Non expliqu/i.test(txt) ? "UN RÉSIDU EST AFFICHÉ — le poste manque à POSTES" : "aucun résidu");
}

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── la vanne du liquide · La Loupe ───");
console.log(`  (pension lue dans la source : ${Math.round(NOURRICE_PENSION * 100)} % de la garde, par soirée)`);
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
