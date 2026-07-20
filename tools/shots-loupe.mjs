// Capture spécifique à "la-loupe" : sert le repo en HTTP local (les modules
// .mjs de la-loupe ne chargent pas en file:// — CORS origin null), vendorise
// Three.js, puis déroule le parcours atelier : appro (pain 100) → découpe
// (défaut 2 g, hold ~3 s : headless tourne à ~8 fps avec dt clampé 0.05) →
// chip 5 g → swipe ▸ conditionnement → drag barrette → zip.
//   cd tools && node shots-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const THREE_JS = readFileSync(path.join(__dirname, "vendor", "three.module.js"), "utf8");
const OUT = path.join(__dirname, "shots", "la-loupe");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

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
  } else if (u.includes("127.0.0.1") || u.startsWith("data:")) { req.continue(); }
  else { req.abort(); }
});

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(1200);
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
await shot("01-home.png");

// Appro : acheter Pain 100 (visionneuse 3D lazy)
await page.click('[data-go="buy"]');
await page.waitForSelector("#view3d canvas", { timeout: 20000 });
await sleep(2200);
await page.click('#buyOverlay [data-buy="100"]');
await sleep(500);
await shot("02-appro.png");

// Atelier → défaut = découpe (sélecteur de taille visible)
await page.click('.tab[data-t="atelier"]');
await sleep(1500);
await shot("03-decoupe-default.png");

const v = await (await page.$("#view3d")).boundingBox();
const cx = v.x + v.width / 2, cy = v.y + v.height * 0.45;
async function holdCut() {
  await page.mouse.move(cx, cy); await page.mouse.down();
  await sleep(3000); await page.mouse.up(); await sleep(600);
}
await holdCut(); await holdCut(); await holdCut();
await page.click('#fmtBar [data-set="5"]'); await sleep(200);
await holdCut();
await shot("04-coupe-2g-et-5g.png");

// Swipe vers la droite → conditionnement
await page.mouse.move(cx - 80, cy);
await page.mouse.down();
for (let i = 1; i <= 6; i++) { await page.mouse.move(cx - 80 + i * 30, cy + i); await sleep(30); }
await page.mouse.up();
await sleep(600);
await shot("05-swipe-conditionnement.png");

// Drag une barrette du bac STOCK vers le zip
const bar = await page.$(".bag-bar");
const zip = await page.$(".bag-zip");
if (bar && zip) {
  const b = await bar.boundingBox(), z = await zip.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(b.x + (z.x - b.x) * i / 8 + b.width / 2, b.y + (z.y - b.y) * i / 8 + z.height / 2);
    await sleep(25);
  }
  await page.mouse.up();
  await sleep(700);
}
await shot("06-zip-drag.png");

const st = await page.evaluate(() => JSON.parse(localStorage.getItem("loupe_save") || "{}"));
console.log("bars:", JSON.stringify(st.bars), "sachets:", JSON.stringify(st.sachets),
  "painG:", st.painG, "cutSize:", st.cutSize);
console.log("Captures:", OUT);
console.log("Erreurs page:", errors.length ? errors.join(" | ") : "aucune");
await browser.close();
server.close();
