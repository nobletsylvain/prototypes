// Capture spécifique à "neige" : pilote les vrais gestes (verser coke + diluant,
// mélanger sur la dalle, ouvrir la boutique crédit/atelier). Localise chaque
// station en lisant la position écran de son étiquette (#labels .blabel), ce qui
// reste robuste quel que soit le cadrage caméra.
//   cd tools && node shots-neige.mjs
import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const THREE_JS = readFileSync(path.join(__dirname, "vendor", "three.module.js"), "utf8");
const PAGE = "file://" + path.join(ROOT, "neige/index.html");
const OUT = path.join(__dirname, "shots", "neige");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=angle",
    "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("three.module.js")) {
    req.respond({ status: 200, contentType: "application/javascript",
      headers: { "Access-Control-Allow-Origin": "*" }, body: THREE_JS });
  } else if (u.startsWith("file://") || u.startsWith("data:")) { req.continue(); }
  else { req.abort(); }
});

await page.goto(PAGE, { waitUntil: "load" });
// Donne du cash pour montrer la boutique crédit/atelier débloquée.
await page.evaluate(() => { try { localStorage.setItem("neige_cash", "60000"); } catch (e) {} });
await page.reload({ waitUntil: "load" });
await sleep(2200);
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });

// Position écran d'une étiquette dont le texte commence par `prefix`.
async function labelPos(prefix) {
  return await page.evaluate((p) => {
    const el = [...document.querySelectorAll("#labels .blabel")]
      .find((d) => d.style.display !== "none" && d.textContent.trim().startsWith(p));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, prefix);
}
async function hold(pos, ms) {
  if (!pos) return;
  await page.mouse.move(pos.x, pos.y); await page.mouse.down();
  await sleep(ms); await page.mouse.up();
}

await shot("01-base.png");

// 1) VERSER de la coke puis du diluant sur la dalle.
await hold(await labelPos("🧱"), 1400);              // ~36 g de coke
await sleep(250);
await hold(await labelPos("🧪"), 1100);              // ~28 g de lactose
await sleep(250);
await shot("02-dalle-versee.png");                    // cuve : coke + coupe, non mélangées

// 2) MÉLANGER : tourner le doigt sur la dalle (drag circulaire).
const slab = await labelPos("🪟");
if (slab) {
  await page.mouse.move(slab.x, slab.y); await page.mouse.down();
  for (let i = 0; i < 40; i++) {
    const a = i * 0.5, r = 26;
    await page.mouse.move(slab.x + Math.cos(a) * r, slab.y + Math.sin(a) * r);
    await sleep(35);
  }
  await page.mouse.up();
}
await sleep(400);
await shot("03-melange.png");                          // produit coupé + toast volume×pureté

// 3) ENSACHER : tap sur le bac PRODUIT.
const prod = await labelPos("📦");
if (prod) for (let i = 0; i < 5; i++) { await page.mouse.click(prod.x, prod.y); await sleep(220); }
await shot("04-ensache.png");

// 4) BOUTIQUE : paliers d'atelier + achat à crédit.
try { await page.click("#shopbtn"); await sleep(500); await shot("05-boutique-credit-atelier.png"); } catch {}

console.log("Captures:", OUT);
console.log("Erreurs page:", errors.length ? errors.join(" | ") : "aucune");
await browser.close();
