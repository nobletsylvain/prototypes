// Captures + fumigation d'El Patrón.
//
// Pourquoi un script à part : `screenshots.mjs` sert la page en `file://`, ce
// qui interdit les imports de module ES (CORS). El Patrón sépare la sim
// (`sim.mjs`) de l'UI, donc il lui faut un vrai serveur HTTP.
//
// Le script ne fait pas que photographier : il JOUE. Il passe en ×3, laisse
// tourner, résout les événements qui tombent, visite les quatre onglets, et
// échoue si la console crache quoi que ce soit ou si un invariant casse en
// cours de route.
//
//   cd tools && node shots-patron.mjs

import { createServer } from "http";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "shots", "el-patron");
mkdirSync(OUT, { recursive: true });

const MIME = { ".html":"text/html", ".mjs":"text/javascript", ".js":"text/javascript",
               ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg" };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  // Chromium réclame un favicon de lui-même : on répond 204 pour ne pas polluer la console.
  if (p === "/favicon.ico") { res.writeHead(204); return res.end(); }
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); return res.end("nope"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = "http://127.0.0.1:" + server.address().port;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("requestfailed", (r) => errors.push("requête échouée: " + r.url()));
page.on("response", (r) => {
  // le favicon n'est pas une ressource du proto : Chromium le réclame tout seul
  if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) errors.push(r.status() + " sur " + r.url());
});

await page.goto(base + "/el-patron/", { waitUntil: "networkidle0" });
await sleep(400);

const shot = async (nom) => { await page.screenshot({ path: path.join(OUT, nom + ".png") }); console.log("  →", nom + ".png"); };
const tap = async (sel) => { const el = await page.$(sel); if (el) { await el.click(); await sleep(180); return true; } return false; };

// Écran d'intro
await shot("00-intro");
await tap('#sheet button[data-a="close"]');

// Résout tout événement en attente en prenant la première option possible.
async function resoudreEvenements() {
  for (let i = 0; i < 6; i++) {
    const ouvert = await page.$eval("#sheet", (s) => s.classList.contains("on")).catch(() => false);
    if (!ouvert) return;
    const titre = await page.$eval("#sheet .st", (e) => e.textContent).catch(() => "");
    const pris = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#sheet button[data-a="opt"]')].find((x) => !x.disabled);
      if (b) { b.click(); return b.querySelector("b").textContent; }
      return null;
    });
    if (!pris) return;
    console.log(`  ⚠ ${titre} → ${pris}`);
    await sleep(220);
  }
}

// Vérifie les invariants DANS le navigateur, sur l'état vivant.
async function invariants(ou) {
  const p = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("patron_save") || "null");
    if (!s) return { err: "pas de sauvegarde" };
    const bad = [];
    if (s.liquide < 0) bad.push("liquide < 0 : " + s.liquide);
    if (s.propre < 0) bad.push("propre < 0 : " + s.propre);
    if (s.chaleur < 0 || s.chaleur > 100) bad.push("chaleur hors bornes : " + s.chaleur);
    if (s.pression < 0 || s.pression > 100) bad.push("pression hors bornes : " + s.pression);
    for (const r of s.rutas) if (r.suspicion < 0 || r.suspicion > 100) bad.push("suspicion hors bornes : " + r.suspicion);
    for (const f of s.fronts) if (f.soupcon < 0 || f.soupcon > 100) bad.push("soupçon hors bornes : " + f.soupcon);
    for (const e of s.registre) if (!e.cause || !String(e.cause).trim()) bad.push("transaction sans cause");
    for (const k of ["liquide", "propre", "chaleur", "jour"]) if (!Number.isFinite(s[k])) bad.push(k + " non fini");
    return { bad, jour: s.jour, propre: s.propre, liquide: s.liquide, chaleur: s.chaleur };
  });
  if (p.err) { errors.push(ou + " : " + p.err); return; }
  if (p.bad.length) errors.push(ou + " : " + p.bad.join(" | "));
  console.log(`  · ${ou} — J${p.jour.toFixed(0)} propre ${Math.round(p.propre)} liquide ${Math.round(p.liquide)} chaleur ${p.chaleur.toFixed(0)}`);
}

/**
 * Un joueur de fond : il ouvre Réseau/Lessive et clique le premier achat
 * abordable, puis revient à la carte. Sans lui l'empire reste à une finca et
 * on ne teste que l'écran de départ — ni chaleur haute, ni contrôle, ni audit.
 */
async function jouer(tours) {
  for (let i = 0; i < tours; i++) {
    await sleep(1500);
    await resoudreEvenements();
    const t = i % 2 ? "reseau" : "lessive";
    await page.evaluate((tt) => document.querySelector(`.tab[data-t="${tt}"]`).click(), t);
    await sleep(260);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".view.on button.row")].find((x) => !x.disabled);
      if (b) b.click();
    });
    await sleep(160);
    await page.evaluate(() => document.querySelector('.tab[data-t="carte"]').click());
    await sleep(240);   // laisser le fondu des vues finir, sinon les captures se chevauchent
  }
}

// ×3 et on laisse vivre
await page.evaluate(() => document.querySelector('.vb[data-v="3"]').click());
await jouer(20);
await invariants("après la montée en puissance");
await shot("01-carte");

// Sélection d'un nœud : la fiche de contexte doit se remplir
await page.evaluate(() => document.querySelector('#hits button[data-n="labo"]')?.click());
await sleep(300); await shot("02-carte-labo");
await page.evaluate(() => document.querySelector('#hits button[data-n="planque"]')?.click());
await sleep(300); await shot("03-carte-planque");

// Le panneau « pourquoi »
await page.evaluate(() => document.querySelector("#segNet").click());
await sleep(300); await shot("04-pourquoi");

for (const t of ["lessive", "registre", "reseau"]) {
  await page.evaluate((tt) => document.querySelector(`.tab[data-t="${tt}"]`).click(), t);
  await sleep(400);
  await shot("05-" + t);
}

// La fiche d'une ruta
await page.evaluate(() => document.querySelector('.tab[data-t="carte"]').click());
await sleep(300);
await page.evaluate(() => document.querySelector('#strip button[data-a="ruta"]')?.click());
await sleep(400); await shot("06-ruta");
await page.evaluate(() => document.querySelector('#sheet button[data-a="close"]')?.click());

// Une longue traite pour attraper les paliers hauts, les contrôles et les descentes
await sleep(300);
await jouer(38);
await invariants("en fin de partie");
await shot("07-tard");

const fin = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("patron_save"));
  return { jour: s.jour, propre: s.totaux.propreCumule, exporte: s.totaux.exporteKg,
           chaleur: s.chaleur, mordidas: s.totaux.mordidas, fincas: s.fincas.length,
           fronts: s.fronts.length, evts: s.evenements.length };
});
console.log("\nétat final :", JSON.stringify(fin));

await browser.close();
server.close();

if (errors.length) {
  console.log("\n❌ " + errors.length + " problème(s) :");
  for (const e of [...new Set(errors)].slice(0, 20)) console.log("   " + e);
  process.exit(1);
}
console.log("\n✅ aucune erreur console, invariants tenus. Captures dans tools/shots/el-patron/");
