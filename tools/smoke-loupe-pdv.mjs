// Smoke test du PDV (corner) de La Loupe : sert le repo en HTTP (les modules
// .mjs ne chargent pas en file://), seed du stock (sachets) via localStorage,
// puis déroule : carte → pin corner → Tenir le corner → ravitailler → vente
// (le four tourne) → encaisser → déception (annoncer haut, livrer bas).
//   cd tools && node smoke-loupe-pdv.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "shots", "la-loupe-pdv");
mkdirSync(OUT, { recursive: true });
// version de save lue depuis la source → le seed suit les bumps de SAVE_VERSION tout seul
const SAVE_VER = (readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8").match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "26"])[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { ".html":"text/html", ".mjs":"text/javascript", ".js":"text/javascript",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg" };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t)) return; // seul 404 = favicon (auto navigateur)
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// seed : Phase B (indépendant), tampon amorcé + UN client persona en file (négo présentielle)
const mkClient = (cid, nm, av, want, g, offer) => ({ cid, nm, av, kind: "regulier", rel: 10,
  want, g, offer, tx: nm + " passe.", pat: 120, pat0: 120, mode: "offer", negoP: offer, dernier: null });
// menu prix=10 (seed) : inès ouvre à 20 (2 g au menu) → contrer + vendre à 20 = JUSTE + combo
const negoQueue = [mkClient("momo", "Momo", "🧢", 3, 6, 48), mkClient("ines", "Inès", "🎧", 1, 2, 20)];
await page.evaluateOnNewDocument((ver, q) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    sachets: { "2": 20 }, sachetQ: 62,
    shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true,
      pdv: { res: 70, bac: 0, prix: 10, chouffes: 0, tampon: { "2": 20 }, tamponQ: 62,
        queue: q, ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1 } },
  }));
}, SAVE_VER, negoQueue);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(500);
await page.screenshot({ path: path.join(OUT, "01-map.png") });

// tap le pin corner → fiche → Tenir le corner
await page.click('.map-pin[data-pin="pdv"]');
await sleep(200);
await page.click('[data-pin-go="pdv"]');
await sleep(300);
await page.screenshot({ path: path.join(OUT, "02-pdv.png") });

// scène plein écran : décor + silhouettes en file + carte du client actif (slide-up)
const view = await page.evaluate(() => ({
  scene: !!document.querySelector(".cscene"),
  persos: document.querySelectorAll(".cperso").length,
  card: !!document.querySelector('#cActive [data-neg="accept"]'),
  offer: document.querySelector('#cActive .offer')?.textContent || "",
}));
const sceneShown = view.scene && view.persos >= 2, cardShown = view.card;

// accepter l'offre de Momo (48 = prix menu → deal) : liquide ↑ (auto), tampon ↓, relation ↑, file vidée
const before = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save")), p = s.shelter.pdv;
  return { dirty: s.dirty || 0, tampon: Object.values(p.tampon || {}).reduce((a, n) => a + n, 0), rel: s.clients.momo.rel, q: p.queue.length }; });
await page.click('[data-neg="accept"]');
await sleep(300);
const afterDeal = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save")), p = s.shelter.pdv;
  return { dirty: s.dirty || 0, bac: p.bac, tampon: Object.values(p.tampon || {}).reduce((a, n) => a + n, 0), rel: s.clients.momo.rel, q: p.queue.length }; });
// vente présentielle → liquide direct (le bac reste à 0, plus d'« encaisser »)
const negoSold = afterDeal.dirty > before.dirty && afterDeal.bac === 0 && afterDeal.tampon < before.tampon && afterDeal.rel > before.rel && afterDeal.q < before.q;
await page.screenshot({ path: path.join(OUT, "03-nego-deal.png") });

// contre-offre sur Inès : Contrer → steppers de prix → Vendre (à 16 = menu → JUSTE + combo)
await page.click('[data-neg="counter"]'); await sleep(200);
const negoUI = await page.evaluate(() => !!document.getElementById("negoP")); // les steppers s'affichent
await page.click('[data-neg="send"]'); await sleep(300);
const afterCounter = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save")), p = s.shelter.pdv;
  return { dirty: s.dirty || 0, combo: p.combo, q: p.queue.length }; });
const counterSold = negoUI && afterCounter.dirty > afterDeal.dirty && afterCounter.combo > 1; // vente en liquide + combo JUSTE armé

// tiroir « Gérer » : plus de bouton « Encaisser » (bac=0) → note « ventes → liquide » à la place
// + marché du jour : la référence affichée (tiroir + chip ⚖) = marketPrice(reput, day) recalculé dans la page
await page.click("#cManage"); await sleep(250);
const drawerUI = await page.evaluate(async () => {
  const s = JSON.parse(localStorage.getItem("loupe_save"));
  const M = await import("/la-loupe/corner.mjs?v=3");
  const m = M.marketPrice(s.reput ?? 20, s.day ?? 1);
  const txt = document.getElementById("cDrawer")?.textContent || "";
  return { enc: !!document.getElementById("enc"), pBac: !!document.getElementById("pBac"),
    drawerShown: document.getElementById("cDrawer")?.classList.contains("on") || false,
    m, marche: txt.includes("marché " + m + "/g"),
    mChip: (document.getElementById("cMarChip")?.textContent || "").includes(String(m)) };
});
await page.click("#cDrawerBk"); await sleep(250); // referme le tiroir
const encOK = afterCounter.dirty > before.dirty && !drawerUI.enc && !drawerUI.pBac && drawerUI.drawerShown; // liquide auto, aucun encaisser à taper
const marcheOK = drawerUI.marche && drawerUI.mChip; // référence marché affichée et juste (tiroir + chip)

const state = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem("loupe_save")).shelter.pdv; } catch (e) { return null; } });
await page.close(); // le localStorage est partagé par origine : fermer avant les pages Phase A/C (sinon leur save() se marchent dessus)

// petit utilitaire : nouvelle page seedée + capture d'erreurs partagée
const seedPage = async (save) => {
  const pg = await browser.newPage();
  await pg.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
  pg.on("console", (m) => { if (m.type() !== "error") return; const t = m.text(), u = (m.location && m.location().url) || "";
    if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t)) return; errors.push("console: " + t); });
  pg.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await pg.evaluateOnNewDocument((s, ver) => { localStorage.setItem("loupe_ver", ver); localStorage.setItem("loupe_save", s); }, JSON.stringify(save), SAVE_VER);
  await pg.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
  await sleep(400);
  return pg;
};
const pdvSeed = { res: 80, bac: 0, advQ: 0, prix: 10, chouffes: 0, tampon: {}, tamponQ: 0, queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0 };

// ===== Défaut : core loop directe (pas de Phase A, pas d'intro) =====
// Boot SANS loupe_save (seul loupe_ver) → defaultState : 1 plaquette, phase B, intro déjà vue.
const pageD = await browser.newPage();
await pageD.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
pageD.on("console", (m) => { if (m.type() !== "error") return; const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t)) return; errors.push("console: " + t); });
pageD.on("pageerror", (e) => errors.push("pageerror: " + e.message));
// localStorage est partagé par origine : on efface tout save laissé par les pages précédentes → vrai defaultState
await pageD.evaluateOnNewDocument((ver) => { localStorage.removeItem("loupe_save"); localStorage.setItem("loupe_ver", ver); }, SAVE_VER);
await pageD.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(400);
// au boot : aucune carte d'intro, aucun bouton « charbonner pour Karim »
const introGone = await pageD.evaluate(() => !document.querySelector(".intro-card") && !document.getElementById("takeFront"));
// tap le pin corner déclenche un save() → on peut lire l'état de départ
await pageD.click('.map-pin[data-pin="pdv"]'); await sleep(200);
const boot = await pageD.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save"));
  return { pains: (s.pains || []).length, painG: (s.pains || []).reduce((a, p) => a + (p.g || 0), 0),
    phase: s.shelter.phase, introSeen: s.shelter.introSeen }; });
const startOK = introGone && boot.pains === 1 && boot.painG === 100 && boot.phase === "B" && boot.introSeen === true;
// le corner s'ouvre direct en scène négo (pas de bannière charbonneur / CTA plaquette / chip salaire)
await pageD.click('[data-pin-go="pdv"]'); await sleep(300);
const cornerD = await pageD.evaluate(() => ({ scene: !!document.querySelector(".cscene"),
  buyPlaq: !!document.getElementById("buyPlaq") || !!document.getElementById("buyPlaq2"),
  wageChip: /\/service/.test(document.querySelector(".ctop")?.textContent || "") }));
const cornerOK = cornerD.scene && !cornerD.buyPlaq && !cornerD.wageChip;
await pageD.screenshot({ path: path.join(OUT, "05-default-start.png") });
await pageD.close();

// ===== Phase B — modes 2b : louche (flair), hésitant (perso), ambigu (bien lu) =====
const modeQueue = [
  { cid: null, nm: "Louche", av: "🕶️", kind: "louche", rel: 0, want: 6, g: 12, offer: 120, tx: "Peu importe le prix.", pat: 300, pat0: 300, mode: "louche", negoP: 120, dernier: null },
  { cid: "sofia", nm: "Sofia", av: "💅", kind: "hesitant", rel: 10, want: 3, g: 5, usual: 5, offer: 0, tx: "Je sais pas trop…", pat: 300, pat0: 300, mode: "hesit", negoP: 0, dernier: null },
  { cid: "momo", nm: "Momo", av: "🧢", kind: "regulier", rel: 10, want: 1, g: 0, expect: 4, composeB: 0, offer: 0, tx: "On est deux ce soir", pat: 300, pat0: 300, mode: "ambig", negoP: 0, dernier: null },
];
const pageM = await seedPage({ shelter: { phase: "B", introSeen: true, pdv: { ...pdvSeed, tampon: { "2": 20 }, tamponQ: 62, queue: modeQueue } } });
await pageM.click('.map-pin[data-pin="pdv"]'); await sleep(200);
await pageM.click('[data-pin-go="pdv"]'); await sleep(400);
// louche : refuser → discrétion (dirty += FLAIR_BONUS)
await pageM.click('[data-neg="loucheNo"]'); await sleep(250);
const mFlair = await pageM.evaluate(() => JSON.parse(localStorage.getItem("loupe_save")).dirty || 0);
// hésitant (Sofia) : son habituel → vente + relation
const hBefore = await pageM.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save")); return { dirty: s.dirty || 0, rel: s.clients.sofia.rel }; });
await pageM.click('[data-neg="hesitPerso"]'); await sleep(250);
const hAfter = await pageM.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save")); return { dirty: s.dirty || 0, rel: s.clients.sofia.rel }; });
// ambigu (Momo) : composer 2 barrettes (4 g = attendu) → bien lu → vente + combo
await pageM.click('[data-comp="1"]'); await sleep(120);
await pageM.click('[data-comp="1"]'); await sleep(120);
await pageM.click('[data-neg="compSell"]'); await sleep(250);
const mAmbig = await pageM.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save")), p = s.shelter.pdv; return { dirty: s.dirty || 0, combo: p.combo, q: p.queue.length }; });
await pageM.screenshot({ path: path.join(OUT, "07-modes.png") });
await pageM.close();
const loucheOK = mFlair >= 25;                                              // discrétion versée
const hesitOK = hAfter.dirty > hBefore.dirty && hAfter.rel > hBefore.rel;   // converti (liquide) + relation
const ambigOK = mAmbig.dirty > hAfter.dirty && mAmbig.combo > 1 && mAmbig.q === 0; // bien lu → vente (liquide) + combo

// ===== Étape 3-4 — traits (qualité / heat / déblocage) + ardoise (crédit Nassim) =====
// unit-asserts node sur la logique pure (le chemin cornerSpawn/makeArdoise que la file seedée court-circuite)
const cornerM = await import("../la-loupe/corner.mjs");
const pN = cornerM.personaById("nassim"), pI = cornerM.personaById("ines");
const uArd = cornerM.makeArdoise(pN, 30, 0, 1, 1, 10); // menu 10 · plafond poche accro rel 30 = R(65×1.25) = 81
const unitOK = uArd.due === 81 && uArd.payday === 1 + cornerM.CORNER.ARDOISE_DAYS
  && cornerM.makeArdoise(pN, 30, 0, 1, 1, 30).due === 81            // menu ×3 → même due (plafond poche)
  && cornerM.wantsArdoise(pN, 10, 3, 1) === false                   // rel < ARDOISE_REL_MIN
  && cornerM.inHours(cornerM.personaById("diego"), 23) === false && cornerM.inHours(pN, 23) === true
  && cornerM.inHours(cornerM.personaById("lina"), 5) === false && cornerM.inHours(cornerM.personaById("lina"), 22) === true
  && cornerM.qualCheck(pI, 78).fac === cornerM.CORNER.QUAL_TOL_UP && cornerM.qualCheck(pI, 50).fac === cornerM.CORNER.QUAL_TOL_DOWN;
const cl0 = { rel: 10, unlocked: true, missed: 0, gougeStreak: 0, quit: false };
const traitQueue = [
  // Nassim à sec : ardoise 8 g → 100 à J2 (stock part, zéro liquide maintenant)
  { cid: "nassim", nm: "Nassim", av: "🎲", kind: "accro", rel: 30, want: 4, g: 8, due: 100, payday: 2,
    offer: 0, tx: "À sec ce soir…", tell: "", pat: 300, pat0: 300, mode: "ardoise", negoP: 0, dernier: null },
  // Inès connaisseuse : tampon Q78 ≥ exig 70 → pourboire TIP_QUAL sur le deal
  { cid: "ines", nm: "Inès", av: "🎧", kind: "regulier", rel: 10, want: 1, g: 2, offer: 20, tx: "Du propre ?",
    tell: "", qc: { ok: true, miss: false, exig: 70, q: 78, fac: 1.12 }, qFac: 1.12,
    pat: 300, pat0: 300, mode: "offer", negoP: 20, dernier: null },
  // Inès « il rogne » (qFac 0.85) : ppu 11 ≤ tol de base 12.17 mais > tol×0.85 = 10.34 → SEUL le qFac fait refuser
  { cid: "ines", nm: "Inès", av: "🎧", kind: "regulier", rel: 10, want: 1, g: 2, offer: 22, tx: "Allez, 22.",
    tell: "", qc: { ok: false, miss: true, exig: 70, q: 50, fac: 0.85 }, qFac: 0.85,
    pat: 300, pat0: 300, mode: "offer", negoP: 22, dernier: null },
  // Diego : le servir chauffe le coin (+6)
  { cid: "diego", nm: "Diego", av: "🏗️", kind: "grossiste", rel: 10, want: 8, g: 16, offer: 112, tx: "Seize d'un coup.",
    tell: "", heatAdd: 6, pat: 300, pat0: 300, mode: "offer", negoP: 112, dernier: null },
  // Momo rel 39 : le deal (+2) passe la barre des 40 → débloque Diego (graphe social)
  { cid: "momo", nm: "Momo", av: "🧢", kind: "regulier", rel: 39, want: 3, g: 5, offer: 48, tx: "Comme d'hab.",
    tell: "", pat: 300, pat0: 300, mode: "offer", negoP: 48, dernier: null },
];
const pageT = await seedPage({ heat: 0, day: 1,
  clients: { momo: { ...cl0, rel: 39 }, nassim: { ...cl0, rel: 30 }, ines: { ...cl0 }, diego: { ...cl0, unlocked: false },
    riton: { ...cl0, ardoise: { due: 50, day: 3 } } }, // ardoise PAS encore échue : ne doit PAS s'encaisser à J2
  shelter: { phase: "B", introSeen: true, pdv: { ...pdvSeed, tampon: { "2": 30 }, tamponQ: 78, queue: traitQueue } } });
await pageT.click('.map-pin[data-pin="pdv"]'); await sleep(200);
await pageT.click('[data-pin-go="pdv"]'); await sleep(400);
await pageT.screenshot({ path: path.join(OUT, "08-ardoise.png") }); // carte ardoise de Nassim
// ardoise : stock débité, AUCUN liquide maintenant, dette posée sur le client
await pageT.click('[data-neg="ardoiseOk"]'); await sleep(250);
const tArd = await pageT.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save")), p = s.shelter.pdv;
  return { dirty: s.dirty || 0, tampon: Object.values(p.tampon || {}).reduce((a, n) => a + n, 0), ard: s.clients.nassim.ardoise || null }; });
// qualité : chip affichée + deal à 20 → pourboire 12 % (dirty +22, pas +20) + rel 10+2+1
const qualChip = await pageT.evaluate(() => /exige Q70/.test(document.getElementById("cActive")?.textContent || ""));
await pageT.click('[data-neg="accept"]'); await sleep(250);
const tQual = await pageT.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save"));
  return { dirty: s.dirty || 0, rel: s.clients.ines.rel }; });
// qualité ratée : accepter ses 22 → la tolérance ×0.85 fait REFUSER (walk, rel −2, zéro vente)
await pageT.click('[data-neg="accept"]'); await sleep(250);
const tMiss = await pageT.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save"));
  return { dirty: s.dirty || 0, rel: s.clients.ines.rel }; });
// heat : servir Diego chauffe le coin (delta autour du clic, pas la valeur absolue — dérive passive du tick)
const hBefore2 = await pageT.evaluate(() => JSON.parse(localStorage.getItem("loupe_save")).heat || 0);
await pageT.click('[data-neg="accept"]'); await sleep(250);
const tHeat = await pageT.evaluate(() => JSON.parse(localStorage.getItem("loupe_save")).heat || 0);
// déblocage : le deal avec Momo (39 → 41 ≥ 40) débloque Diego
await pageT.click('[data-neg="accept"]'); await sleep(250);
const tUnlock = await pageT.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save"));
  return { relMomo: s.clients.momo.rel, diego: s.clients.diego.unlocked }; });
// clôture de soirée (debug « Passer la nuit ») : SEULE l'ardoise échue (Nassim, J2) se règle — pas celle de Riton (J3)
await pageT.click("#dbgBtn"); await sleep(150);
await pageT.click('[data-dbg="⏭ Passer la nuit (clôture soirée)"]'); await sleep(350);
const tSettle = await pageT.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save"));
  return { day: s.day, dirty: s.dirty || 0, ard: s.clients.nassim.ardoise || null, rel: s.clients.nassim.rel,
    ard2: s.clients.riton.ardoise || null }; });
await pageT.screenshot({ path: path.join(OUT, "09-traits.png") });
await pageT.close();
const ardOK = tArd.dirty === 0 && tArd.tampon === 26 && tArd.ard && tArd.ard.due === 100 && tArd.ard.day === 2; // stock parti, zéro cash, dette posée
const qualOK = qualChip && tQual.dirty === 22 && tQual.rel === 13;  // 20 + pourboire qualité 2 · rel 10+2(deal)+1(connaisseur)
const qMissOK = tMiss.dirty === tQual.dirty && tMiss.rel === 11;    // refus PAR le qFac (sinon 11 ≤ 12.17 aurait vendu) · rel 13−2
const heatOK = tHeat - hBefore2 >= 5;                               // +6 à la vente (delta ; la dérive seule < 1 sur ~0.5 s)
const unlockOK = tUnlock.relMomo >= 40 && tUnlock.diego === true;   // graphe social branché
const settleOK = tSettle.day === 2 && !tSettle.ard && tSettle.rel === 34 && tSettle.dirty === 282
  && tSettle.ard2 && tSettle.ard2.due === 50;                       // 182 de ventes + 100 Nassim · Riton (J3) intact

await browser.close();
server.close();

console.log("B · scène     :", JSON.stringify(view), sceneShown ? "scène+file ✓" : "⚠ scène", cardShown ? "· carte ✓" : "· ⚠ carte");
console.log("B · deal      :", JSON.stringify({ before, afterDeal }), negoSold ? "(accepte → vente négo ✓)" : "(⚠ pas de vente négo)");
console.log("B · contre    :", JSON.stringify(afterCounter), counterSold ? "(contrer → JUSTE + combo ✓)" : "(⚠ contre-offre KO)");
console.log("B · liquide   :", JSON.stringify({ dirtyStart: before.dirty, dirtyEnd: afterCounter.dirty, ...drawerUI }), encOK ? "(ventes → liquide auto, plus d'encaisser ✓)" : "(⚠ auto-liquide KO)", marcheOK ? "· marché affiché ✓" : "· ⚠ marché");
console.log("Départ direct :", JSON.stringify({ introGone, boot, cornerD }),
  startOK ? "(1 plaquette · phase B · pas d'intro ✓)" : "(⚠ départ KO)", cornerOK ? "· corner négo direct ✓" : "· ⚠ corner");
console.log("B · modes 2b  :", JSON.stringify({ mFlair, hBefore, hAfter, mAmbig }),
  loucheOK ? "louche/flair ✓" : "⚠ louche", hesitOK ? "· hésitant ✓" : "· ⚠ hésitant", ambigOK ? "· ambigu ✓" : "· ⚠ ambigu");
console.log("B · traits 3-4:", JSON.stringify({ unitOK, tArd, qualChip, tQual, tMiss, hBefore2, tHeat, tUnlock, tSettle }),
  unitOK ? "unités corner ✓" : "⚠ unités", ardOK ? "· ardoise ✓" : "· ⚠ ardoise", qualOK ? "· qualité ✓" : "· ⚠ qualité",
  qMissOK ? "· qualité ratée ✓" : "· ⚠ qualité ratée", heatOK ? "· heat ✓" : "· ⚠ heat",
  unlockOK ? "· déblocage ✓" : "· ⚠ déblocage", settleOK ? "· règlement à échéance ✓" : "· ⚠ règlement");
console.log("erreurs       :", errors.length ? errors : "AUCUNE");
const ok = !errors.length && sceneShown && cardShown && negoSold && counterSold && encOK && marcheOK
  && startOK && cornerOK && loucheOK && hesitOK && ambigOK
  && unitOK && ardOK && qualOK && qMissOK && heatOK && unlockOK && settleOK;
process.exit(ok ? 0 : 1);
