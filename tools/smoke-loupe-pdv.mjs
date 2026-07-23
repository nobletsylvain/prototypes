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
const SAVE_VER = (readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8").match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "23"])[1];
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

// seed : Phase B (indépendant), stock de sachets, corner amorcé, intro passée
await page.evaluateOnNewDocument((ver) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    sachets: { "2": 60 }, sachetQ: 62,
    shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true,
      pdv: { res: 70, bac: 0, advQ: 0, prix: 10, chouffes: 0,
        tampon: {}, tamponQ: 0, queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0 } },
  }));
}, SAVE_VER);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(500);
await page.screenshot({ path: path.join(OUT, "01-map.png") });

// tap le pin corner → fiche → Tenir le corner
await page.click('.map-pin[data-pin="pdv"]');
await sleep(200);
await page.click('[data-pin-go="pdv"]');
await sleep(300);
await page.screenshot({ path: path.join(OUT, "02-pdv.png") });

// ravitailler (Max barrettes → tampon), puis laisser la file se vendre
await page.click('[data-rav="0"]');
await sleep(3000);
const afterSell = await page.evaluate(() => ({
  bac: document.getElementById("pBac")?.textContent,
  tampon: document.getElementById("pTamp")?.textContent,
  res: document.getElementById("pResT")?.textContent,
  file: document.getElementById("pQ")?.textContent,
  dem: document.getElementById("pDem")?.textContent,
  ledger: document.querySelectorAll("#pLed .stat").length,
  menu: [...document.querySelectorAll(".stat span")].some(e => e.textContent.includes("Menu du corner")),
}));
const menuShown = afterSell.menu; // étape 2 : menu (barème présentiel) affiché sur le corner Phase B
await page.screenshot({ path: path.join(OUT, "03-selling.png") });

// --- présence requise : on QUITTE l'écran corner → le corner est FERMÉ, plus de vente ---
const soldOnScreen = await page.evaluate(() => JSON.parse(localStorage.getItem("loupe_save")).shelter.pdv.bac);
await page.click("#back"); // retour carte Quartier (shelterSub="map")
await sleep(2200);         // laisse le save (toutes les 2 s) flusher l'état
const bgStart = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("loupe_save")).shelter.pdv;
  return { bac: p.bac, seq: p.seq || 0,
    badge: document.getElementById("pinBac")?.textContent,
    badgeVisible: !document.getElementById("pinBac")?.classList.contains("off") }; });
await sleep(2200);         // du temps passe SANS être sur le corner
const bgEnd = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("loupe_save")).shelter.pdv;
  return { bac: p.bac, seq: p.seq || 0 }; });
await page.screenshot({ path: path.join(OUT, "03b-map-badge.png") });
// fermé hors présence : ni vente (bac stable) ni client servi (seq stable)
const closedAway = bgEnd.bac <= bgStart.bac && bgEnd.seq === bgStart.seq;
// revenir au corner pour encaisser / déception
await page.click('.map-pin[data-pin="pdv"]');
await sleep(150);
await page.click('[data-pin-go="pdv"]');
await sleep(300);

// encaisser le bac → doit créer des billets triables
await page.click("#enc");
await sleep(200);
const afterEnc = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save")); return { dirty: s.dirty, bills: (s.bills || []).length }; });

// déception : annoncer Top (Q78) alors qu'on livre Q62 → réservoir doit fuir
await page.click('[data-adv="78"]');
await sleep(2500);
const afterDecep = await page.evaluate(() => ({
  res: document.getElementById("pResT")?.textContent,
  decepShown: !!document.querySelector('.card [style*="var(--heat)"]'),
}));
await page.screenshot({ path: path.join(OUT, "04-deception.png") });

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

// ===== Phase A (charbonneur) : Karim approvisionne, on vend POUR LUI, fin de service = salaire =====
const pageA = await seedPage({ dirty: 0, shelter: { phase: "A", introSeen: true, pdv: { ...pdvSeed } } });
await pageA.click('.map-pin[data-pin="pdv"]'); await sleep(200);
await pageA.click('[data-pin-go="pdv"]'); await sleep(1600); // Karim auto-stocke, on écoule → recette (à Karim)
const aSell = await pageA.evaluate(() => { const p = JSON.parse(localStorage.getItem("loupe_save")).shelter.pdv;
  return { bac: p.bac, tampon: Object.values(p.tampon || {}).reduce((a, n) => a + n, 0), seq: p.seq || 0 }; });
const aStocked = aSell.bac > 0 && (aSell.tampon > 0 || aSell.seq > 0); // Karim a fourni, on a vendu
// fin de service via « Passer la nuit » (onglet SnapShit) → salaire versé en liquide
await pageA.click('.tab[data-t="snap"]'); await sleep(300);
const aDirtyBefore = await pageA.evaluate(() => JSON.parse(localStorage.getItem("loupe_save")).dirty || 0);
await pageA.click('#night'); await sleep(300);
const aWage = await pageA.evaluate(() => JSON.parse(localStorage.getItem("loupe_save")).dirty || 0);
const wagePaid = aWage >= aDirtyBefore + 79; // CHARB_WAGE = 80 (liquide)
await pageA.screenshot({ path: path.join(OUT, "05-charbonneur.png") });
await pageA.close();

// ===== Phase A → B : t'offrir la 1ère plaquette (liquide) → indépendant =====
const pageC = await seedPage({ dirty: 250, shelter: { phase: "A", introSeen: true, pdv: { ...pdvSeed } } });
await pageC.click('.map-pin[data-pin="pdv"]'); await sleep(200);
await pageC.click('[data-pin-go="pdv"]'); await sleep(300);
await pageC.click('#buyPlaq'); await sleep(300);
const cBuy = await pageC.evaluate(() => { const s = JSON.parse(localStorage.getItem("loupe_save"));
  return { phase: s.shelter.phase, pains: (s.pains || []).length, dirty: s.dirty }; });
const becameIndep = cBuy.phase === "B" && cBuy.pains > 0 && cBuy.dirty <= 50; // 250 − 200 = 50
await pageC.screenshot({ path: path.join(OUT, "06-plaquette.png") });
await pageC.close();

await browser.close();
server.close();

console.log("B · vente     :", JSON.stringify(afterSell), soldOnScreen > 0 ? "(vend en présence ✓)" : "(⚠ rien vendu en présence)", menuShown ? "· menu ✓" : "· ⚠ pas de menu");
console.log("B · présence  :", JSON.stringify({ bgStart, bgEnd }), closedAway ? "(corner fermé hors présence ✓)" : "(⚠ vend hors présence)");
console.log("B · encaisse  :", JSON.stringify(afterEnc), "(bills>0 = tri OK)");
console.log("B · déception :", JSON.stringify(afterDecep));
console.log("A · charbonn. :", JSON.stringify({ aSell, aWage }), aStocked ? "(Karim fournit+on vend ✓)" : "(⚠ pas d'appro Karim)", wagePaid ? "· salaire versé ✓" : "· ⚠ pas de salaire");
console.log("A→B plaquette :", JSON.stringify(cBuy), becameIndep ? "(bascule indépendant ✓)" : "(⚠ pas de bascule)");
console.log("erreurs       :", errors.length ? errors : "AUCUNE");
const ok = !errors.length && soldOnScreen > 0 && closedAway && aStocked && wagePaid && becameIndep && menuShown;
process.exit(ok ? 0 : 1);
