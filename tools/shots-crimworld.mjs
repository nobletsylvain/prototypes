// Capture d'ecran + walkthrough du prototype "CrimWorld" (coque telephone +
// coupe 3D embarquee). Sert a se relire VISUELLEMENT : polish + debug.
//
// Couvre les DEUX tours : tour 1 (la dette de 200) -> bascule "loyer du point
// de vente" -> tour 2 (dealer sous le loyer) -> bilan diegetique.
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

// --- helpers robustes (poll + fast-forward de la frappe en tapant le body) ---
const tapBody = () => page.evaluate(() => { const b = document.getElementById("body"); if (b) b.click(); });
async function waitConv(nm, t = 9000) {
  const end = Date.now() + t;
  while (Date.now() < end) {
    const ok = await page.evaluate((n) => {
      for (const c of document.querySelectorAll(".conv")) {
        const el = c.querySelector(".nm");
        if (el && el.textContent.trim() === n) { c.click(); return true; }
      }
      return false;
    }, nm);
    if (ok) return true;
    await sleep(250);
  }
  return false;
}
async function waitChoice(sub, t = 9000) {
  const end = Date.now() + t;
  while (Date.now() < end) {
    const ok = await page.evaluate((x) => {
      for (const b of document.querySelectorAll(".choice"))
        if (b.textContent.includes(x)) { b.click(); return true; }
      return false;
    }, sub);
    if (ok) return true;
    await tapBody();              // accelere la frappe en cours
    await sleep(220);
  }
  return false;
}
async function openEtabliCard(t = 9000) {
  const end = Date.now() + t;
  while (Date.now() < end) {
    const ok = await page.evaluate(() => {
      const c = [...document.querySelectorAll(".menu")].find((m) => m.textContent.includes("L'établi"));
      if (c) { c.click(); return true; }
      return false;
    });
    if (ok) return true;
    await tapBody();
    await sleep(220);
  }
  return false;
}
// Charge la VRAIE coupe 3D (pour la vérifier/capturer), puis FINIT de façon
// déterministe via le fallback "mode simple" (grade au choix : "clean"/"dirty").
async function doCut(tag, shotName, grade = "clean") {
  const opened = await openEtabliCard();
  await sleep(3200);
  let frame = page.frames().find((f) => f.url().includes("coupe.html"));
  for (let i = 0; i < 20 && !frame; i++) { await sleep(300); frame = page.frames().find((f) => f.url().includes("coupe.html")); }
  const info = { tag, grade, etabliCard: opened, iframe: !!frame, canvas: false, canvasW: 0 };
  if (frame) {
    for (let i = 0; i < 20; i++) { if (await frame.$("canvas")) break; await sleep(300); }
    info.canvas = !!(await frame.$("canvas"));
    info.canvasW = await frame.evaluate(() => { const c = document.querySelector("canvas"); return c ? Math.round(c.getBoundingClientRect().width) : 0; });
  }
  if (shotName) await shot(shotName);                    // capture le rendu 3D avant de finir
  await page.evaluate((g) => {                            // fin déterministe via le fallback
    document.getElementById("etabli-fallback").classList.add("open");
    const b = document.querySelector(".ebtn." + (g === "dirty" ? "dirty" : "clean"));
    if (b) b.click();
  }, grade);
  await sleep(1800);
  info.etabliClosed = await page.evaluate(() => !document.getElementById("etabli").classList.contains("show"));
  return info;
}
async function postVitrine() {
  await page.evaluate(() => document.getElementById("story-mine").click());
  await sleep(700);
  await page.evaluate(() => document.getElementById("post-btn").click());
  await sleep(1000);
  await page.evaluate(() => document.getElementById("viewer").click());
  await sleep(700);
}

const log = {};

// ============================ TOUR 1 ============================
await sleep(500);
await waitConv("Momo"); await sleep(2500); await shot("01-momo-menace.png");
await page.evaluate(() => document.getElementById("back").click()); await sleep(700);

await waitConv("Le Pote"); await sleep(400); await tapBody(); await sleep(1200); await shot("02-pote-cadeau.png");
await waitChoice("Prendre"); await sleep(800); await shot("03-carte-etabli.png");

log.cut1 = await doCut("t1", "04-etabli-t1.png");
await shot("05-apres-coupe-t1.png");
await postVitrine(); await shot("06-vitrine-t1.png");

// Clients T1 : Kévin (négo -> accept), L'accro (REFUSER = prudent, pas de heat), Sami, La Comtesse
await waitConv("Kévin"); await sleep(300); await tapBody(); await sleep(900); await shot("07-kevin.png");
await waitChoice("Négocier"); await sleep(600); await shot("08-negociation.png");
await waitChoice("Accepter"); await sleep(1000);
await waitConv("L'accro"); await sleep(300); await tapBody(); await sleep(900); await shot("09-accro.png");
await waitChoice("Refuser"); await sleep(1000);
await waitConv("Sami"); await sleep(300); await tapBody(); await sleep(700);
await waitChoice("Accepter"); await sleep(1000);
await waitConv("La Comtesse"); await sleep(300); await tapBody(); await sleep(700);
await waitChoice("Accepter"); await sleep(1000);

// Payer Momo 200 -> LA BASCULE
await waitConv("Momo"); await sleep(300); await tapBody(); await sleep(700);
log.paidMomo1 = await waitChoice("Payer Momo");
await sleep(800); await tapBody(); await sleep(1500); await shot("10-bascule-loyer.png");
log.basculeChoice = await waitChoice("pas le choix");
await sleep(800);

// ============================ TOUR 2 ============================
await waitConv("Le Pote"); await sleep(300); await tapBody(); await sleep(1200); await shot("11-reup-pote.png");
await waitChoice("Prendre la sav"); await sleep(800);

log.cut2 = await doCut("t2", "12-etabli-t2.png");
await postVitrine(); await shot("13-vitrine-t2.png");

// Clients T2 : Kévin revient, Le Parano (FUIT car heat), Nadia, Le Comptoir, La Comtesse
await waitConv("Kévin"); await sleep(300); await tapBody(); await sleep(900); await shot("14-kevin-revient.png");
await waitChoice("Accepter"); await sleep(900);
await waitConv("Le Parano"); await sleep(300); await tapBody(); await sleep(900); await shot("15-parano.png");
log.paranoServed = await waitChoice("Servir", 4000);    // s'il a fui (heat), pas de choix -> false
await sleep(700);
await waitConv("Nadia"); await sleep(300); await tapBody(); await sleep(900); await shot("16-nadia.png");
await waitChoice("Accepter"); await sleep(900);
await waitConv("Le Comptoir"); await sleep(300); await tapBody(); await sleep(900); await shot("17-comptoir.png");
await waitChoice("Accepter"); await sleep(900);
await waitChoice("Accepter", 3000);                     // 2e accept si arrache (test -80), sinon ignore
await waitConv("La Comtesse"); await sleep(300); await tapBody(); await sleep(900); await shot("18-comtesse-t2.png");
await waitChoice("Accepter"); await sleep(900);

// Payer le loyer -> BILAN
await waitConv("Momo"); await sleep(300); await tapBody(); await sleep(900);
log.paidLoyer = await waitChoice("Payer le loyer");
await sleep(1000); await tapBody(); await sleep(1500); await shot("19-bilan.png");

log.endShown = await page.evaluate(() => document.getElementById("endscreen").classList.contains("show"));
log.endTitle = await page.evaluate(() => { const h = document.querySelector("#endscreen h2"); return h ? h.textContent : null; });
log.bilanW = await page.evaluate(() => {
  const e = document.getElementById("endscreen");
  return e.classList.contains("show") ? Math.round(e.getBoundingClientRect().width) : null;
});
log.phoneW = await page.evaluate(() => Math.round(document.querySelector(".phone").getBoundingClientRect().width));

console.log("== CrimWorld walkthrough (2 tours) ==");
console.log(JSON.stringify(log, null, 2));
console.log("captures:", OUT);
console.log("erreurs page:", errs.length ? errs.join(" | ") : "aucune");
await browser.close();
