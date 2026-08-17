// Capture/diagnostic pour crack/ — pilote les vrais boutons (zéro dépendance,
// pas de Three.js à intercepter). Vérifie surtout l'absence d'erreurs runtime.
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.join(ROOT, "crack/index.html");
const OUT = path.join(__dirname, "shots", "crack");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=angle",
         "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.goto(PAGE, { waitUntil: "load" });
await sleep(400);
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
const box = await (await page.$("canvas")).boundingBox();
const cx = box.x + box.width / 2;

await shot("01-idle.png");

// Charger
await page.click("#bAct"); await sleep(300);

// Cuisson : pulser 🔥 pour garder la temp dans le vert (timing doux),
// verser 🥄 une fois au début. On boucle jusqu'à sortir de la phase COOK.
const phaseTxt = () => page.evaluate(() => document.getElementById("bAct").textContent);
const press = async (sel, down) => {
  const b = await (await page.$(sel)).boundingBox();
  await page.mouse.move(b.x + b.width/2, b.y + b.height/2);
  await page.mouse[down ? "down" : "up"]();
};
await press("#bPour", true); await sleep(900); await press("#bPour", false); // verser la coupe
// asservissement température : on tient la chauffe ~73 (milieu zone verte)
let heatOn = false, shotDone = false;
for (let i = 0; i < 240; i++) {
  const t = await phaseTxt();
  if (!t.includes("Cuisson")) break;
  const temp = await page.evaluate(() => window.__temp());
  const want = temp < 73;
  if (want !== heatOn) { await press("#bHeat", want); heatOn = want; }
  if (i === 10 && !shotDone) { await shot("02-cuisson.png"); shotDone = true; }
  await sleep(50);
}
await press("#bHeat", false);
if (!shotDone) await shot("02-cuisson.png");

// DRY : sortir quand le curseur passe au centre (vert)
for (let i = 0; i < 40; i++) {
  const t = await phaseTxt();
  if (t.includes("Sortir")) {
    const pos = await page.evaluate(() => window.__dry ? window.__dry() : 0.5);
    if (Math.abs(pos - 0.5) < 0.12) { await page.click("#bAct"); break; }
  } else if (!t.includes("Cuisson")) break;
  await sleep(60);
}
await sleep(300); await shot("03-dalle.png");

// Briser : swipe en travers de la dalle
for (let i = 0; i < 8; i++) {
  await page.mouse.move(box.x + box.width*0.2, cx*0 + box.y + box.height*0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width*0.8, box.y + box.height*0.55, { steps: 8 });
  await page.mouse.up(); await sleep(120);
}
await sleep(300); await shot("04-cailloux.png");

// Boutique
await page.click("#bShop"); await sleep(300); await shot("05-boutique.png");

console.log("Captures:", OUT);
console.log("Erreurs page:", errors.length ? errors.join(" | ") : "aucune");
await browser.close();
