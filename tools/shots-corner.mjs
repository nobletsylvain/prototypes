// Captures du proto "le-corner" (DOM pur, pas de WebGL).
// Usage : cd tools && node shots-corner.mjs
// Parcours : home → soirée (warp pour faire tomber les DM) → contre-offre → rapport.

import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.join(ROOT, "le-corner/index.html");
const OUT = path.join(__dirname, "shots", "le-corner");
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("dialog", (d) => d.accept());

// pas de reseau pendant la capture (le proto est autonome)
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = req.url();
  if (u.startsWith("file://") || u.startsWith("data:")) req.continue(); else req.abort();
});

await page.goto(PAGE, { waitUntil: "load" });
await sleep(400);
// save vierge pour des captures reproductibles
await page.evaluate(() => { localStorage.clear(); location.reload(); });
await sleep(700);
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });

await shot("01-home.png");

// Lancer la soiree, puis avancer le temps pour faire tomber plusieurs DM.
await page.click("#go");
await sleep(400);
await page.evaluate(() => window.__corner.warp(40));
await sleep(900);
await shot("02-dms.png");

// Ouvrir la contre-offre sur le premier DM explicite.
const hasCounter = await page.$('[data-a="counter"]');
if (hasCounter) {
  await hasCounter.click();
  await sleep(500);
  await shot("03-contre-offre.png");
  await page.click("#shSend");
  await sleep(900);
  await shot("04-reaction.png");
}

// Fin de soiree → rapport.
await page.evaluate(() => window.__corner.end());
await sleep(600);
await shot("05-rapport.png");

// Soiree 2 : un DM louche doit tomber (LOUCHE_FROM_DAY = 2).
await page.click("#nextDay");
await sleep(400);
await page.evaluate(() => window.__corner.warp(80));
await sleep(1800);   // laisse la file finir de marcher (transitions .6s)
await shot("06-soiree2-louche.png");

console.log("Captures ecrites dans:", OUT);
console.log("Erreurs page:", errors.length ? errors.join(" | ") : "aucune");
await browser.close();
