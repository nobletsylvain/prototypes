// Pilote de test du core loop "plantation/" : joue la boucle complète en
// headless (mode ?fast = pousse 12 s) et capture chaque étape dans
// tools/shots/plantation/. Utilise l'état debug window.__pl exposé par la page
// (positions écran des stations + phase/humidité/feuilles/têtes).
//
// Usage : cd tools && npm install && node drive-plantation.mjs
// NB : headless SwiftShader tourne à ~3-5 fps, le script boucle donc sur
// l'état plutôt que sur des durées.
import { readFileSync, mkdirSync } from "fs";
import path from "path";
import puppeteer from "puppeteer";
const TOOLS = "/home/user/prototypes/tools";
const THREE_JS = readFileSync(path.join(TOOLS, "vendor", "three.module.js"), "utf8");
const OUT = path.join(TOOLS, "shots", "plantation");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: "new",
  args: ["--no-sandbox","--disable-setuid-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("three.module.js")) req.respond({ status: 200, contentType: "application/javascript", headers: { "Access-Control-Allow-Origin": "*" }, body: THREE_JS });
  else if (u.startsWith("file://") || u.startsWith("data:")) req.continue();
  else req.abort();
});
await page.goto("file:///home/user/prototypes/plantation/index.html?fast", { waitUntil: "load" });
await sleep(2200);
const st = () => page.evaluate(() => window.__pl);
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
async function hold(x, y, ms) { await page.mouse.move(x, y); await page.mouse.down(); await sleep(ms); await page.mouse.up(); }
async function swipe(x0, y0, x1, y1, ms, steps) {
  await page.mouse.move(x0, y0); await page.mouse.down();
  const n = steps || 8;
  for (let i = 1; i <= n; i++) { await page.mouse.move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); await sleep(ms / n); }
  await page.mouse.up();
}
let s = await st();

// 1) Terreau (headless lent : on boucle jusqu'au changement de phase)
for (let i = 0; i < 30 && s.phase === "empty"; i++) { await hold(s.sack.x, s.sack.y, 1200); s = await st(); }
console.log("après terreau:", s.phase, "(soil", s.soil.toFixed(2) + ")");

// 2) Graine : drag lent caisse -> pot
for (let i = 0; i < 5 && s.phase === "soil"; i++) { await swipe(s.seed.x, s.seed.y, s.pot.x, s.pot.y, 900, 14); s = await st(); }
console.log("après semis:", s.phase, "humidité", s.moisture.toFixed(2));
await shot("04-semis.png");

// 3) Pousse : arroser sous 0.45, tailler les feuilles (swipe vif), jusqu'à maturité
let shot5 = false;
for (let i = 0; i < 300 && s.phase === "growing"; i++) {
  if (s.moisture < 0.45) await hold(s.can.x, s.can.y, 1200);
  if (s.leafPos && s.leafPos.length) { const L = s.leafPos[0]; await swipe(L.x - 60, L.y - 25, L.x + 60, L.y + 25, 60, 4); }
  if (!shot5 && s.growth > 0.5) { shot5 = true; await shot("05-pousse.png"); }
  await sleep(300);
  s = await st();
}
console.log("mature ?", s.phase, "growth", s.growth.toFixed(2), "humidité", s.moisture.toFixed(2));
await shot("06-mature.png");

// 4) Couper la tige : UN swipe VIF au pied du plant -> tige entière au séchoir
for (let i = 0; i < 10 && s.phase === "mature"; i++) {
  const p = s.plantBase;
  await swipe(p.x - 80, p.y - 10, p.x + 80, p.y + 10, 60, 4);
  await sleep(400);
  s = await st();
}
console.log("après coupe:", s.phase, "tiges au fil:", s.branches.filter(Boolean).length);

// 5) Changement de scène : Culture -> Séchoir (stepper), puis attendre le séchage
await page.click("#sc-sechoir");
await sleep(2500);                       // travelling caméra
s = await st();
console.log("scène:", s.scene);
await shot("07-fil.png");
for (let i = 0; i < 400; i++) {
  const br = s.branches.filter(Boolean);
  if (br.length && br.every((b) => b.dry >= 0.99)) break;
  await sleep(500);
  s = await st();
}
console.log("séchage:", s.branches.filter(Boolean).map((b) => b.dry).join(", "));
await shot("08-sec.png");

// 6) Récolte au fil : frotter LENTEMENT chaque tête des branches sèches
for (let i = 0; i < 40 && s.branchBuds.length; i++) {
  const b = s.branchBuds[0];
  await swipe(b.x - 25, b.y - 10, b.x + 25, b.y + 10, 500, 10);
  await sleep(120);
  s = await st();
}
console.log("après récolte:", "stock", s.stockG.toFixed(1), "g · trim", s.trimG.toFixed(1), "g");
await shot("09-recolte.png");

// 7) Vente : maintenir le bac STOCK
for (let i = 0; i < 20 && s.stockG > 0.05; i++) { await hold(s.stock.x, s.stock.y, 1500); s = await st(); }
console.log("cash:", await page.evaluate(() => document.getElementById("cash").textContent));
await shot("10-vente.png");
console.log("Erreurs page:", errors.length ? errors.join(" | ") : "aucune");
await browser.close();
