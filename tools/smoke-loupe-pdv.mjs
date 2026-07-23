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

// seed : stock de sachets + PDV réservoir amorcé, intro passée
await page.evaluateOnNewDocument(() => {
  localStorage.setItem("loupe_ver", "21");
  localStorage.setItem("loupe_save", JSON.stringify({
    sachets: { "2": 40, "5": 60 }, sachetQ: 62,
    shelter: { introSeen: true, frontActive: false, paidOff: true,
      pdv: { res: 70, bac: 0, advQ: 0, prix: 10, chouffes: 0,
        tampon: {}, tamponQ: 0, queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0 } },
  }));
});

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
}));
await page.screenshot({ path: path.join(OUT, "03-selling.png") });

// --- vente autonome : on QUITTE l'écran corner, le charbonneur continue de vendre ---
await page.click("#back"); // retour carte Quartier (shelterSub="map")
await sleep(200);
const bgStart = await page.evaluate(() => ({
  bac: JSON.parse(localStorage.getItem("loupe_save")).shelter.pdv.bac,
  badge: document.getElementById("pinBac")?.textContent,
  badgeVisible: !document.getElementById("pinBac")?.classList.contains("off"),
}));
await sleep(2200); // temps qui passe SANS regarder l'écran corner
const bgEnd = await page.evaluate(() => ({
  bac: JSON.parse(localStorage.getItem("loupe_save")).shelter.pdv.bac,
  badge: document.getElementById("pinBac")?.textContent,
}));
await page.screenshot({ path: path.join(OUT, "03b-map-badge.png") });
const bgSold = bgEnd.bac > bgStart.bac; // le bac a grossi hors de l'écran corner
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
await browser.close();
server.close();

console.log("après vente   :", JSON.stringify(afterSell));
console.log("vente autonome:", JSON.stringify({ bgStart, bgEnd, bgSold }), bgSold ? "(corner vend hors écran ✓)" : "(⚠ RIEN vendu hors écran)");
console.log("après encaisse:", JSON.stringify(afterEnc), "(bills>0 = tri OK)");
console.log("après décep.  :", JSON.stringify(afterDecep));
console.log("pdv sauvegardé:", JSON.stringify(state));
console.log("erreurs       :", errors.length ? errors : "AUCUNE");
process.exit(errors.length || !bgSold ? 1 : 0);
