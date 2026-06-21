// Capture d'ecran + walkthrough du prototype "CrimWorld" (coque telephone +
// coupe 3D embarquee). Sert a se relire VISUELLEMENT : polish + debug.
//
// Comme la coque charge la scene de coupe (coupe.html) qui importe Three.js
// depuis un CDN (souvent bloque en session distante), on INTERCEPTE la requete
// et on la sert depuis tools/vendor/three.module.js (comme screenshots.mjs).
//
// Usage : cd tools && node shots-crimworld.mjs
// Sorties : tools/shots/crimworld/*.png  (ignore par git)

import { mkdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const THREE_JS = readFileSync(path.join(__dirname, "vendor", "three.module.js"), "utf8");
const PAGE = "file://" + path.join(ROOT, "crimworld/index.html");
const OUT = path.join(__dirname, "shots", "crimworld");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=angle",
         "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("three.module.js"))
    req.respond({ status: 200, contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" }, body: THREE_JS });
  else if (u.startsWith("file://") || u.startsWith("data:") || u === "about:blank") req.continue();
  else req.abort();
});

await page.goto(PAGE, { waitUntil: "load" });
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
const clickConv = (nm) => page.evaluate((n) => {
  for (const c of document.querySelectorAll(".conv"))
    if (c.querySelector(".nm").textContent.trim() === n) { c.click(); return true; }
  return false;
}, nm);
const clickChoice = (s) => page.evaluate((x) => {
  for (const b of document.querySelectorAll(".choice"))
    if (b.textContent.includes(x)) { b.click(); return true; }
  return false;
}, s);

// 1) Menace de Momo (capturee avant l'auto-retour a l'accueil)
await sleep(500);
await clickConv("Momo"); await sleep(2700); await shot("01-momo-menace.png");   // la menace reste lisible
await page.evaluate(() => document.getElementById("back").click());             // retour accueil (‹)
await sleep(900);

// 2) Le pote + cadeau + choix
await clickConv("Le Pote"); await sleep(4800); await shot("02-pote-cadeau.png");
await clickChoice("Prendre"); await sleep(2800); await shot("03-carte-etabli.png");

// 3) Etabli : la VRAIE coupe 3D (coupe.html embarquee)
await page.evaluate(() => {
  const c = [...document.querySelectorAll(".menu")].find((m) => m.textContent.includes("L'établi"));
  if (c) c.click();
});
await sleep(4000);
const frame = page.frames().find((f) => f.url().includes("coupe.html"));
const diag = { iframe: !!frame, canvas: false, prologue: false };
if (frame) {
  diag.canvas = !!(await frame.$("canvas"));
  diag.prologue = await frame.evaluate(() =>
    !!document.getElementById("prologue-done") &&
    getComputedStyle(document.getElementById("shopbtn")).display === "none");
  diag.canvasW = await frame.evaluate(() => { const c = document.querySelector("canvas"); return c ? Math.round(c.getBoundingClientRect().width) : 0; });
}
diag.phoneW = await page.evaluate(() => Math.round(document.querySelector(".phone").getBoundingClientRect().width));
diag.frameW = await page.evaluate(() => Math.round(document.getElementById("etabli-frame").getBoundingClientRect().width));
await shot("04-etabli-3d.png");

// 4) Quelques coupes reelles + fin -> handshake
if (frame && diag.canvas) {
  const cv = await frame.$("canvas");
  for (let i = 0; i < 6; i++) { try { await cv.click(); } catch {} await sleep(420); }
  await shot("05-coupe-en-cours.png");
  const done = await frame.$("#prologue-done");
  if (done) await done.click();
}
await sleep(2400); await shot("06-apres-coupe.png");
const etabliClosed = await page.evaluate(() => !document.getElementById("etabli").classList.contains("show"));

// 5) Poster la vitrine (composer -> viewer)
await page.evaluate(() => document.getElementById("story-mine").click());
await sleep(800); await shot("07-story-composer.png");
await page.evaluate(() => document.getElementById("post-btn").click());
await sleep(1100); await shot("08-story-viewer.png");
await page.evaluate(() => document.getElementById("viewer").click());
await sleep(800);

// 6) Client : negociation (accepter / negocier / refuser)
await clickConv("Kévin"); await sleep(3600); await shot("09-client-kevin.png");
await clickChoice("Négocier"); await sleep(2600); await shot("10-negociation.png");
await clickChoice("Accepter"); await sleep(1800);

// 7) On boucle vite les autres clients pour atteindre le bilan
await clickConv("Sami"); await sleep(3400); await clickChoice("Accepter"); await sleep(1800);
await clickConv("La Comtesse"); await sleep(3400); await clickChoice("Accepter"); await sleep(1800);
await clickConv("Momo"); await sleep(2600); await clickChoice("Payer"); await sleep(2600);
await shot("11-bilan.png");
const bilanW = await page.evaluate(() => {
  const e = document.getElementById("endscreen"), v = e.querySelector(".verdict");
  return { endscreen: Math.round(e.getBoundingClientRect().width), verdict: v ? Math.round(v.getBoundingClientRect().width) : null };
});

console.log("== CrimWorld walkthrough ==");
console.log("diag:", JSON.stringify(diag), "| etabli ferme apres coupe:", etabliClosed);
console.log("bilan widths:", JSON.stringify(bilanW), "(doit etre ~", diag.phoneW, ")");
console.log("captures:", OUT);
console.log("erreurs page:", errs.length ? errs.join(" | ") : "aucune");
await browser.close();
