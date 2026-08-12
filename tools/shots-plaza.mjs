// Fumigation + captures de La Plaza.
//
// Sert le dépôt en HTTP (les imports de module ES sont interdits en file://),
// joue une saison en ×3 en bougeant les curseurs, visite les quatre onglets, et
// échoue si la console crache quoi que ce soit ou si un invariant casse.
//
//   cd tools && node shots-plaza.mjs

import { createServer } from "http";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "shots", "la-plaza");
mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/favicon.ico") { res.writeHead(204); return res.end(); }
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = "http://127.0.0.1:" + server.address().port;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("response", (r) => { if (r.status() >= 400) errors.push(r.status() + " sur " + r.url()); });

await page.goto(base + "/la-plaza/", { waitUntil: "networkidle0" });
await sleep(500);
const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n + ".png") }); console.log("  →", n + ".png"); };

await shot("00-intro");
await page.evaluate(() => document.querySelector('#sheet button[data-a="close"]')?.click());
await sleep(300);

async function invariants(ou) {
  const p = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("plaza_save") || "null");
    if (!s) return { err: "pas de sauvegarde" };
    const bad = [];
    const somme = ["frontera", "puerto", "pista"].reduce((a, c) => a + s.allocation[c], 0);
    if (somme !== 100) bad.push("allocation = " + somme);
    if (s.cash < 0) bad.push("cash < 0");
    if (s.chaleur < 0 || s.chaleur > 100) bad.push("chaleur hors bornes");
    for (const e of s.registre) if (!e.cause || !String(e.cause).trim()) bad.push("ligne sans cause");
    return { bad, jour: s.jour, cash: s.cash, chaleur: s.chaleur, alloc: s.allocation };
  });
  if (p.err) { errors.push(ou + " : " + p.err); return; }
  if (p.bad.length) errors.push(ou + " : " + p.bad.join(" | "));
  console.log(`  · ${ou} — J${p.jour.toFixed(0)} caisse ${Math.round(p.cash)} chaleur ${p.chaleur.toFixed(0)} alloc ${JSON.stringify(p.alloc)}`);
}

await page.evaluate(() => document.querySelector('.vb[data-v="3"]').click());

// On joue : on pousse progressivement vers la frontière, puis on se replie.
for (let i = 0; i < 14; i++) {
  await sleep(1200);
  const cle = i < 8 ? "frontera" : "puerto";
  await page.evaluate((c) => {
    document.querySelector(`button[data-a="alloc"][data-k="${c}"][data-d="10"]`)?.click();
  }, cle);
  if (i % 4 === 3) {
    await page.evaluate(() => document.querySelector('.tab[data-t="reseau"]').click());
    await sleep(220);
    await page.evaluate(() => { const b = [...document.querySelectorAll(".view.on button.row")].find((x) => !x.disabled); if (b) b.click(); });
    await sleep(160);
    await page.evaluate(() => document.querySelector('.tab[data-t="plazas"]').click());
    await sleep(260);
  }
}
await invariants("mi-saison");
await shot("01-plazas");

await page.evaluate(() => document.querySelector("#segNet").click());
await sleep(320); await shot("02-pourquoi");
await page.evaluate(() => document.querySelector("#segNet").click());

for (const t of ["rivaux", "registre", "reseau"]) {
  await page.evaluate((tt) => document.querySelector(`.tab[data-t="${tt}"]`).click(), t);
  await sleep(420);
  await shot("03-" + t);
}
await page.evaluate(() => document.querySelector('.tab[data-t="plazas"]').click());
await sleep(300);

// On laisse la saison aller à son terme pour voir l'écran de fin.
for (let i = 0; i < 30; i++) {
  await sleep(1200);
  const fini = await page.evaluate(() => !!JSON.parse(localStorage.getItem("plaza_save")).fini);
  if (fini) break;
}
await invariants("fin de saison");
await sleep(500);
await shot("04-fin");

const fin = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("plaza_save"));
  return { jour: Math.round(s.jour), cash: Math.round(s.cash), fini: s.fini ? s.fini.titre : null,
           peajePaye: Math.round(s.totaux.peajePaye), peajeRecu: Math.round(s.totaux.peajeRecu) };
});
console.log("\nétat final :", JSON.stringify(fin));

await browser.close();
server.close();
if (errors.length) {
  console.log("\n❌ " + errors.length + " problème(s) :");
  for (const e of [...new Set(errors)].slice(0, 15)) console.log("   " + e);
  process.exit(1);
}
console.log("\n✅ aucune erreur console, invariants tenus. Captures dans tools/shots/la-plaza/");
