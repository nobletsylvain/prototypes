// Outil de capture d'ecran du prototype (rendu WebGL/Three.js).
//
// Pourquoi : le jeu est en WebGL et charge Three.js depuis un CDN. Dans les
// sessions distantes, les CDN (unpkg/jsdelivr) sont souvent bloques. Ce script
// lance un Chromium headless, INTERCEPTE la requete de Three.js et la sert
// depuis la copie vendoree (tools/vendor/three.module.js), puis prend des
// captures de plusieurs ecrans du jeu.
//
// Usage :
//   cd tools && npm install                 # installe puppeteer (telecharge Chromium)
//   node screenshots.mjs                     # cible barrettes-shit/ par defaut
//   node screenshots.mjs <chemin/index.html> # cible un autre core loop
//
// Les images sont ecrites dans tools/shots/<proto>/ (ignore par git).
// NB : les interactions (coupe, boutique, dosage) sont propres a "barrettes-shit".

import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const THREE_JS = readFileSync(path.join(__dirname, "vendor", "three.module.js"), "utf8");

const target = process.argv[2] || "barrettes-shit/index.html";   // relatif a la racine du repo
const PAGE = "file://" + path.join(ROOT, target);
const protoName = path.basename(path.dirname(target)) || "root";
const OUT = path.join(__dirname, "shots", protoName);
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox", "--disable-setuid-sandbox",
    "--use-gl=angle", "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 }); // ~iPhone

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// Three.js (CDN souvent bloque) -> servi depuis la copie vendoree, avec CORS.
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("three.module.js")) {
    req.respond({ status: 200, contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" }, body: THREE_JS });
  } else if (u.startsWith("file://") || u.startsWith("data:")) {
    req.continue();
  } else {
    req.abort(); // pas d'autre reseau pendant la capture
  }
});

await page.goto(PAGE, { waitUntil: "load" });
await sleep(2500); // laisse le rendu WebGL s'etablir

const cv = await page.$("canvas");
if (!cv) { console.error("ERREUR: pas de <canvas> (Three.js n'a pas charge?)", errors); await browser.close(); process.exit(1); }
const box = await cv.boundingBox();
const cx = box.x + box.width / 2;
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });

await shot("01-base.png");

// Couper quelques barrettes (un tap au centre = une coupe).
try { for (let i = 0; i < 8; i++) { await page.mouse.click(cx, box.y + box.height * 0.40); await sleep(420); } } catch {}
await sleep(700);
await shot("02-coupe.png");

// Boutique.
try { await page.click("#shopbtn"); await sleep(500); await shot("03-boutique.png"); await page.click("#shopclose"); await sleep(300); } catch {}

// Dosage : on cherche l'emplacement ecran du bac STOCK, puis on tape.
async function openDose() {
  for (const [fx, fy] of [[0.33, 0.52], [0.30, 0.50], [0.36, 0.55], [0.28, 0.54], [0.40, 0.52]]) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await sleep(400);
    if (await page.evaluate(() => document.getElementById("doseui").classList.contains("show"))) return true;
  }
  return false;
}
try {
  if (await openDose()) {
    for (let i = 0; i < 4; i++) { await page.mouse.click(cx, box.y + box.height * 0.30); await sleep(130); }
    await shot("04-dosage-hachoir.png");
    await page.click("#doseclose"); await sleep(300);
  }
  await page.click('.methbtn[data-meth="balance"]'); await sleep(200);
  if (await openDose()) {
    for (let i = 0; i < 7; i++) { await page.mouse.click(cx, box.y + box.height * 0.30); await sleep(120); }
    await shot("05-dosage-balance.png");
  }
} catch {}

console.log("Captures ecrites dans:", OUT);
console.log("Erreurs page:", errors.length ? errors.join(" | ") : "aucune");
await browser.close();
