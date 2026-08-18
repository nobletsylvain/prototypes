// Captures de "La Colline Creuse" (colonie souterraine, rendu SVG stylo bille).
//
// Le proto est 100% vanilla (aucun CDN, aucun canvas) : le script coupe tout le
// reseau, charge la page en file://, et prend des captures de la coupe + des
// panneaux. Utile pour verifier la direction artistique sans telephone.
//
//   cd tools && npm install
//   node shots-colline.mjs            # -> tools/shots/colline-creuse/
//   node shots-colline.mjs --full     # + capture pleine hauteur de la coupe

import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.join(ROOT, "colline-creuse/index.html");
const OUT = path.join(__dirname, "shots", "colline-creuse");
mkdirSync(OUT, { recursive: true });

const full = process.argv.includes("--full");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// aucun reseau : le proto doit etre autonome
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = req.url();
  if (u.startsWith("file://") || u.startsWith("data:")) req.continue();
  else { errors.push("RESEAU INTERDIT: " + u); req.abort(); }
});

await page.goto(PAGE, { waitUntil: "load" });
await sleep(700);

const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
await shot("00-intro.png");

// la carte d'intro couvre l'ecran : on la ferme avant tout le reste
try { await page.click("#card .opt"); await sleep(500); } catch {}
await shot("01-coupe.png");

// la coupe en entier (la feuille peut etre plus haute que l'ecran)
if (full) {
  const h = await page.evaluate(() => {
    const s = document.getElementById("scene");
    return Math.min(4000, Math.ceil(s.getBoundingClientRect().height) + 200);
  });
  await page.setViewport({ width: 390, height: h, deviceScaleFactor: 2 });
  await sleep(500);
  await shot("02-feuille-entiere.png");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await sleep(300);
}

// une salle : postes, regime, rebouchage
try {
  await page.click("#scene .room");
  await sleep(450);
  await shot("03-salle.png");
  await page.click("#sheetclose"); await sleep(400);
} catch (e) { errors.push("salle: " + e.message); }

// la barre de soupcon : la decomposition "pourquoi on nous voit"
try {
  await page.click("#heatbar");
  await sleep(450);
  await shot("04-soupcon.png");
  await page.click("#sheetclose"); await sleep(400);
} catch (e) { errors.push("soupcon: " + e.message); }

// les panneaux du dock
const noms = ["creuser", "colons", "dehors", "silence"];
for (let i = 0; i < noms.length; i++) {
  try {
    const b = await page.$(`#dock button[data-tab="${noms[i]}"]`);
    await b.click();
    await sleep(450);
    await shot(`1${i}-${noms[i]}.png`);
    const close = await page.$("#sheetclose");
    if (close) { await close.click(); await sleep(400); }
  } catch (e) { errors.push(noms[i] + ": " + e.message); }
}

console.log("Captures:", OUT);
console.log("Erreurs page:", errors.length ? errors.join(" | ") : "aucune");
await browser.close();
