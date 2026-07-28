// L'impayé : celui à qui on prête ne revient pas toujours.
//
// Arbitrage Sylvain (2026-07-28) : « le NON paiement — que celui à qui on prête ne
// revient jamais rembourser ». Le code disait exactement l'inverse, et le disait au nom
// d'une règle :
//
//     // ardoise (crédit) : … — jamais d'impayé (R4)
//
// C'était une confusion, et elle a coûté la mécanique : **R4 interdit le HASARD, pas la
// perte**. Un impayé qu'on voit venir est parfaitement déterministe. Le design s'était
// privé du crédit risqué en croyant respecter le déterminisme.
//
// Ce qui le rend prévisible (arbitré) : le TYPE du client, dit dans son tell et affiché
// comme trait mécanique sur la carte, avant qu'on accepte. Ce qu'on perd (arbitré) :
// l'argent ET le client — il disparaît de la clientèle.
//
// Ce que ce fichier garde, et pourquoi :
//   1. le profil de payeur ne s'obtient JAMAIS par omission — un persona à qui on ajoute
//      `credit` sans y penser paie. La valeur dangereuse est toujours explicite ;
//   2. le tell de chaque prêteur DIT ce qui va se passer (R4). Sans ça, l'impayé est un
//      dé déguisé en personnage ;
//   3. la carte affiche le risque AVANT le bouton (R8), et pas seulement en prose : une
//      phrase d'ambiance se lit en diagonale ;
//   4. **la nuit tient ce que la carte a promis** — c'est LE contrôle qui compte. Deux
//      décisions parallèles (une pour l'affichage, une pour la clôture) finiraient par
//      diverger, et le joueur se ferait planter par un client annoncé sûr ;
//   5. le sûr paie, le fuyard ne paie pas et DISPARAÎT ;
//   6. le Karnet compte la perte en manque à gagner, pas en dépense — sinon le pont ne
//      boucle plus et « Non expliqué » s'allume ;
//   7. le Karnet distingue les deux façons de partir : celui qu'on a fait fuir, et celui
//      qui s'est tiré avec la came.
//
//   cd tools && node ardoise-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";
import { CORNER_PERSONAS, paieArdoise, CORNER } from "../la-loupe/corner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-ardoise");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

const preteurs = CORNER_PERSONAS.filter((p) => p.traits && p.traits.credit);
const surs = preteurs.filter((p) => paieArdoise(p) === "sur");
const fuyards = preteurs.filter((p) => paieArdoise(p) === "jamais");

// ── 1..3 · les profils, lus dans le module ───────────────────────────────
ok("Plusieurs clients peuvent demander une ardoise",
   preteurs.length >= 2, `${preteurs.length} prêteur(s) : ${preteurs.map((p) => p.nm).join(", ")}`);

ok("Il y a des deux sortes — sinon il n'y a rien à juger",
   surs.length >= 1 && fuyards.length >= 1,
   `sûrs : ${surs.map((p) => p.nm).join(", ") || "aucun"} · fuyards : ${fuyards.map((p) => p.nm).join(", ") || "aucun"}`);

/* Le défaut doit être SÛR. Un persona à qui on ajoute `credit` sans y penser ne doit pas
   devenir voleur par omission : la valeur qui fait mal s'écrit toujours à la main. */
ok("Le profil dangereux ne s'obtient jamais par omission",
   paieArdoise({ traits: { credit: true } }) === "sur" && paieArdoise({}) === "sur",
   `sans \`paie\` → "${paieArdoise({ traits: { credit: true } })}"`);

/* R4 · chaque prêteur ANNONCE ce qu'il fera. C'est le contrôle qui empêche de rendre
   l'impayé « intéressant » en le cachant : si un tell cesse de le dire, ça casse ici. */
{
  const muets = preteurs.filter((p) => {
    const t = (p.tell || "").toLowerCase();
    return paieArdoise(p) === "jamais"
      ? !/(jamais revu|se dilue|revient pas|jamais rendu)/.test(t)
      : !/(règle|rend ce qu|revient payer)/.test(t);
  });
  ok("R4 · le tell de chaque prêteur dit ce qui va se passer",
     muets.length === 0,
     muets.length ? `muets : ${muets.map((p) => p.nm).join(", ")}` : `${preteurs.length} tell(s) explicites`);
}

// ── le serveur et la page ────────────────────────────────────────────────
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

const unSur = surs[0], unFuyard = fuyards[0];
const DUE = 240, JOUR = 5;

/* Deux ardoises ouvertes, échues ce soir : une chez un sûr, une chez un fuyard. On les
   pose dans le save plutôt que de jouer la négociation — ce fichier teste le RÈGLEMENT,
   pas la carte de négo (qui a déjà son fichier). `evaluateOnNewDocument` REJOUE à chaque
   navigation : ce seed-ci est le seul avant le premier `goto`. */
await page.evaluateOnNewDocument((ver, jour, sur, fuyard, due) => {
  localStorage.setItem("loupe_ver", ver);
  const clients = {};
  for (const id of [sur, fuyard]) {
    clients[id] = { rel: 60, unlocked: true, missed: 0, gougeStreak: 0, quit: false,
                    ardoise: { due, day: jour } };
  }
  localStorage.setItem("loupe_save", JSON.stringify({
    day: jour, cash: 0, dirty: 500, reput: 45, heat: 10, karimBuys: 3,
    sachets: { 2: 40 }, sachetQ: 70, pains: [], clients,
    shelter: { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
      corners: { pdv: { res: 90, bac: 0, prix: 10, chouffes: 0, tampon: { 2: 10 }, tamponQ: 70,
        queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1, charbonneur: null } } },
  }));
}, SAVE_VER, JOUR, unSur.id, unFuyard.id, DUE);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);

// ── 5 · la carte annonce le risque AVANT le bouton (R8) ──────────────────
/* On force une carte d'ardoise dans la file, pour chaque profil, et on lit ce que
   l'écran affiche au-dessus des boutons. C'est la promesse ; la clôture est la tenue. */
/* Écrire la file dans `localStorage` puis naviguer ne suffit PAS : l'état vivant du jeu
   est en mémoire, la navigation ne le relit pas, et l'autosave de 2 s écrase l'écriture.
   Il faut donc empiler un seed `evaluateOnNewDocument` (qui tourne AVANT le chargement,
   lit ce qui est là et le modifie) puis recharger — le motif déjà éprouvé ailleurs dans
   ce dossier. Corollaire à ne jamais oublier : ces seeds REJOUENT à chaque navigation,
   donc chacun doit être écrit pour s'appliquer sur l'état laissé par les précédents. */
const carte = async (cid, nm, av) => {
  await page.evaluateOnNewDocument((cid, nm, av) => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    if (!s.shelter || !s.shelter.corners) return;
    const c = s.shelter.corners[s.shelter.cornerId || "pdv"];
    if (!c) return;
    c.queue = [{ cid, nm, av, kind: "accro", rel: 60, want: 2, g: 2, offer: 20,
                 tx: "Ce soir je suis à sec.", pat: 400, pat0: 400,
                 mode: "ardoise", due: 40, payday: 7, negoP: 20, dernier: null }];
    localStorage.setItem("loupe_save", JSON.stringify(s));
  }, cid, nm, av);
  await page.reload({ waitUntil: "load" });
  await sleep(700);
  await page.evaluate(() => { const b = document.querySelector('[data-fav="pdv"]'); if (b) b.click(); });
  await sleep(700);
  return page.evaluate(() => {
    const h = document.getElementById("cActive");
    return h ? h.textContent.replace(/\s+/g, " ").trim() : "";
  });
};

const txtSur = await carte(unSur.id, unSur.nm, unSur.av);
ok(`La carte d'un payeur sûr (${unSur.nm}) dit qu'il revient payer`,
   /revient toujours payer/.test(txtSur), txtSur.slice(0, 150) || "(carte absente)");
await page.screenshot({ path: path.join(OUT, "01-carte-sur.png") });

const txtFuyard = await carte(unFuyard.id, unFuyard.nm, unFuyard.av);
ok(`R8 · la carte d'un fuyard (${unFuyard.nm}) avertit AVANT le bouton`,
   /ne revient pas/.test(txtFuyard), txtFuyard.slice(0, 170) || "(carte absente)");
ok("…et l'avertissement précède bien le bouton d'acceptation dans la carte",
   txtFuyard.indexOf("ne revient pas") >= 0
   && txtFuyard.indexOf("ne revient pas") < txtFuyard.indexOf("Sur l'ardoise"),
   `avertissement à ${txtFuyard.indexOf("ne revient pas")}, bouton à ${txtFuyard.indexOf("Sur l'ardoise")}`);
await page.screenshot({ path: path.join(OUT, "02-carte-fuyard.png") });

// ── 6..8 · la nuit tient ce que la carte a promis ────────────────────────
const avant = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { dirty: Math.round(s.dirty || 0), clients: s.clients };
});

await page.evaluate(() => { const b = document.getElementById("dbgBtn"); if (b) b.click(); });
await sleep(250);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("[data-dbg]")].find((x) => /Passer la nuit/.test(x.dataset.dbg));
  if (b) b.click();
});
await sleep(1200);

const apres = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  /* On lit la soirée SCELLÉE, pas les compteurs vivants : `soir` est remis à zéro à la
     fin de la clôture, donc y chercher la perte donnerait toujours zéro — et un contrôle
     qui passe sur des zéros ne garde rien. La photo est ce que le Karnet lira demain. */
  const sc = (s.soirees || [])[0] || {};
  const c = Object.values(sc.corners || {})[0] || {};
  return { dirty: Math.round(s.dirty || 0), clients: s.clients,
           soir: c.soir || {},
           journal: (s.journal || []).map((j) => ({ txt: j.txt, cause: j.cause, poste: j.poste, eur: j.eur })) };
});

const cSur = apres.clients[unSur.id] || {}, cFuy = apres.clients[unFuyard.id] || {};
ok(`Le payeur sûr (${unSur.nm}) a réglé et il est toujours là`,
   !cSur.ardoise && !cSur.quit && apres.dirty >= avant.dirty + DUE,
   `liquide ${avant.dirty} → ${apres.dirty} · ardoise ${cSur.ardoise ? "encore ouverte" : "soldée"} · ${cSur.quit ? "PARTI" : "toujours client"}`);

ok(`Le fuyard (${unFuyard.nm}) n'a rien rendu — et il est parti`,
   !cFuy.ardoise && cFuy.quit === true && cFuy.quitCause === "impaye",
   `ardoise ${cFuy.ardoise ? "encore ouverte" : "effacée"} · quit ${cFuy.quit} · cause « ${cFuy.quitCause} » · jamais rendu ${cFuy.impaye}`);

ok("Le liquide n'a bougé QUE du montant réglé — l'impayé n'est pas un débit",
   apres.dirty - avant.dirty === DUE,
   `écart ${apres.dirty - avant.dirty} · attendu ${DUE} (une seule ardoise honorée sur deux)`);

ok("La perte est comptée dans la soirée, avec son montant",
   (apres.soir.impaye || {}).n === 1 && (apres.soir.impaye || {}).eur === DUE,
   `impaye ${JSON.stringify(apres.soir.impaye)}`);

ok("Et elle laisse une cause nommée au journal",
   apres.journal.some((j) => /jamais réglée/i.test(j.txt) && /disparu/.test(j.cause || "")),
   (apres.journal.find((j) => /jamais réglée/i.test(j.txt)) || {}).cause || "(rien au journal)");

// ── 9..11 · le Karnet ────────────────────────────────────────────────────
/* La tuile Karnet vit sur le QUARTIER, pas sur la scène du corner — où l'on se trouve
   encore après la clôture. Sans ce retour, le clic ne trouve rien, l'écran ne change pas,
   et les contrôles suivants accusent le Karnet de ne pas afficher ce qu'on ne lui a
   jamais demandé de montrer. */
await page.evaluate(() => { const b = document.querySelector('[data-t="shelter"]'); if (b) b.click(); });
await sleep(400);
await page.evaluate(() => { const b = [...document.querySelectorAll("[data-go]")].find((x) => x.dataset.go === "karnet"); if (b) b.click(); });
await sleep(700);
const karnet = await page.evaluate(() => ((document.getElementById("stage") || {}).textContent || "").replace(/\s+/g, " "));
await page.screenshot({ path: path.join(OUT, "03-karnet-impaye.png"), fullPage: true });

ok("Le Karnet range l'ardoise envolée en manque à gagner, pas en dépense",
   /Ardoises envolées/.test(karnet) && new RegExp("Ardoises envolées[^]*?" + DUE).test(karnet),
   /Ardoises envolées/.test(karnet) ? "ligne présente, hors marge" : "la perte n'apparaît nulle part");

ok("Le pont boucle toujours — aucun « non expliqué » malgré la perte",
   !/Non expliqu/i.test(karnet),
   /Non expliqu/i.test(karnet) ? "UN RÉSIDU EST AFFICHÉ — la perte a été comptée comme un débit" : "aucun résidu");

ok("Il distingue celui qui s'est tiré avec la came de celui qu'on a fait fuir",
   /parti avec ta came/.test(karnet),
   /parti avec ta came/.test(karnet) ? "les deux départs sont nommés" : "« parti » pour deux histoires opposées");

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

// ── rapport ─────────────────────────────────────────────────────────────
await browser.close();
server.close();

console.log("\n─── L'ardoise · celui à qui on prête ne revient pas toujours ───");
console.log(`   ${preteurs.length} prêteurs · intérêt ${Math.round(CORNER.ARDOISE_RATE * 100)} % · échéance J+${CORNER.ARDOISE_DAYS} · relation min ${CORNER.ARDOISE_REL_MIN}\n`);
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? `  (${r.detail})` : ""}`);
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} OK.`);
console.log(`captures → ${path.relative(ROOT, OUT)}`);
if (passed < results.length) process.exit(1);
