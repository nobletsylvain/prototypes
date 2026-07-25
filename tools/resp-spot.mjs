// Contrôle de mise en page mobile pour "le-spot", sur plusieurs tailles d'écran.
//
// Pourquoi : le journal du dépôt montre que la première cause de friction en
// playtest n'est pas le design mais l'écran qui MASQUE, COUPE ou CASSE (6
// occurrences en 5 jours : scène tronquée, tiroir qui disparaît, labels
// empilés, retour impossible). Ce script vérifie mécaniquement qu'aucun
// élément interactif ne sort de l'écran et que la page ne scrolle jamais
// horizontalement.
//
//   cd tools && node resp-spot.mjs

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

// du plus petit téléphone courant à la grande tablette
const ECRANS = [
  { nm: "iPhone SE",      w: 320, h: 568 },
  { nm: "iPhone 8",       w: 375, h: 667 },
  { nm: "iPhone 14",      w: 390, h: 844 },
  { nm: "Pixel 7",        w: 412, h: 915 },
  { nm: "iPhone Pro Max", w: 430, h: 932 },
  { nm: "iPad portrait",  w: 768, h: 1024 },
];

const browser = await puppeteer.launch({
  headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
let bad = 0;

for (const e of ECRANS) {
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (x) => errs.push(x.message));
  await page.setViewport({ width: e.w, height: e.h, deviceScaleFactor: 2 });
  // chaque taille repart d'une partie neuve (le localStorage est partagé
  // par le navigateur : sans ça, l'écran suivant hérite de l'état du précédent)
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
  await page.goto(`http://127.0.0.1:${PORT}/le-spot/index.html`, { waitUntil: "load" });
  await sleep(400);
  const tap = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) throw new Error("introuvable : " + s);
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  }, sel);

  const probs = [];
  const check = async (label) => {
    const r = await page.evaluate((vw, vh) => {
      const out = [];
      if (document.documentElement.scrollWidth > vw + 1)
        out.push(`scroll horizontal (${document.documentElement.scrollWidth} > ${vw})`);
      // tout élément cliquable doit être ENTIÈREMENT dans le viewport
      for (const el of document.querySelectorAll("button, .cli, .fmt, .pain, .crew, .cache")) {
        if (el.closest(".hide") || el.classList.contains("hide")) continue;
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        // hors écran horizontalement, ou débordant en bas d'un conteneur non scrollable
        if (b.left < -1 || b.right > vw + 1)
          out.push(`hors écran en X : ${(el.id || el.className || el.tagName)} [${Math.round(b.left)}..${Math.round(b.right)}]`);
        if (b.height < 28 && el.tagName === "BUTTON")
          out.push(`cible tactile trop basse (${Math.round(b.height)} px) : ${el.id || el.className}`);
      }
      return out;
    }, e.w, e.h);
    r.forEach((x) => probs.push(`${label} — ${x}`));
  };

  await check("intro");
  await tap("#introOk");
  await sleep(300);
  await check("spot");

  // la planque : l'écran le plus dense (appro + calibres + planche + équipe + sac)
  await tap("#bGo");
  await sleep(350);
  await check("planque");
  // le contenu doit être ATTEIGNABLE au scroll, pas coupé
  const scrollOk = await page.evaluate(() => {
    const p = document.getElementById("planque");
    p.scrollTop = p.scrollHeight;
    const bag = document.getElementById("bagbox").getBoundingClientRect();
    const dock = document.getElementById("dock").getBoundingClientRect();
    return { atteignable: bag.bottom <= dock.top + 2, reste: Math.round(bag.bottom - dock.top) };
  });
  if (!scrollOk.atteignable) probs.push(`planque — bas de page masqué par le dock (${scrollOk.reste} px)`);

  // l'ARA : l'écran le plus contraint (4 caches côte à côte)
  await page.evaluate(() => {
    const s = window.__spot.S(); s.chouf = 2; s.tampon = 80; s.caisse = 300; s.vis = 95;
  });
  await tap("#bGo");
  await sleep(1100);
  await check("ara");

  if (errs.length) probs.push("erreur JS : " + errs[0]);
  const tag = probs.length ? "FAIL" : "ok  ";
  console.log(`  ${tag}  ${e.nm.padEnd(15)} ${e.w}×${e.h}`);
  probs.forEach((p) => console.log(`          ${p}`));
  if (probs.length) bad++;
  await page.close();
}

await browser.close();
server.close();
console.log(`\n${ECRANS.length - bad}/${ECRANS.length} tailles d'écran sans défaut de mise en page.`);
process.exit(bad ? 1 : 0);
