// Test du creusement au doigt (v2) : on simule des drags reels a la souris,
// exactement comme un pouce sur l'ecran, et on verifie que ca creuse.
import { mkdirSync } from "fs";
import path from "path"; import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.join(ROOT, "colline-creuse-v2/index.html") + "?debug";
const OUT = path.join(__dirname, "shots", "colline-creuse-v2");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.setRequestInterception(true);
p.on("request", (r) => (r.url().startsWith("file://") ? r.continue() : r.abort()));
await p.goto(PAGE, { waitUntil: "load" });
await sleep(500);
// partie neuve et deterministe, sans passer par le rechargement (le handler
// pagehide re-sauvegarde sinon l'etat qu'on vient d'effacer)
await p.evaluate(() => { window.CC.repondreCarte(); window.CC.reset(1234); });
await sleep(400);
if (errs.length) console.log("ERREURS AU DEMARRAGE:", errs.join(" | "));

// passe en mode creusement
await p.click('#dock button[data-tab="creuser"]');
await sleep(350);
await p.screenshot({ path: path.join(OUT, "20-mode-creuser.png") });

// cellule -> coordonnees ecran
const pos = async (c, r) => p.evaluate((c, r) => {
  const s = document.getElementById("scene");
  const b = s.getBoundingClientRect();
  const k = b.width / 390;
  return { x: b.left + (c + .5) * 13 * k, y: b.top + (r + .5) * 13 * k };
}, c, r);

// on part de la salle de depart et on trace vers le bas
const dep = await p.evaluate(() => { const e = window.CC.etat().exc[1]; return { c: e.c, r: e.r + e.h }; });
const drags = [
  [dep.c, dep.r, dep.c + 3, dep.r + 1],
  [dep.c, dep.r + 2, dep.c + 2, dep.r + 4],
  [dep.c + 3, dep.r + 2, dep.c + 4, dep.r + 5],
];
for (let i = 0; i < drags.length; i++) {
  const [c0, r0, c1, r1] = drags[i];
  const a = await pos(c0, r0), z = await pos(c1, r1);
  await p.mouse.move(a.x, a.y);
  await p.mouse.down();
  await p.mouse.move((a.x + z.x) / 2, (a.y + z.y) / 2, { steps: 4 });
  await p.mouse.move(z.x, z.y, { steps: 4 });
  if (i === 0) await p.screenshot({ path: path.join(OUT, "21-apercu-drag.png") });
  await p.mouse.up();
  await sleep(400);
}
await p.screenshot({ path: path.join(OUT, "22-apres-creusement.png") });

const etat = await p.evaluate(() => {
  const S = window.CC.etat();
  return { exc: S.exc.length, tas: Math.round(S.tas), matos: Math.round(S.res.matos),
           chantiers: S.exc.filter((e) => e.t > 0).length };
});
console.log("apres 3 traces :", JSON.stringify(etat));

// on laisse les chantiers finir, puis on amenage
await p.evaluate(() => { const CC = window.CC; for (let i = 0; i < 400; i++) { CC.step(0.25); if (CC.modaleOuverte()) CC.repondreCarte(); } });
await p.click('#dock button[data-tab="creuser"]');   // sortir du mode
await sleep(300);
await p.evaluate(() => { window.CC.etat().speed = 0; });
await p.screenshot({ path: path.join(OUT, "23-creuse.png") });

// ouvrir une salle creusee -> panneau d'amenagement
const cible = await p.evaluate(() => {
  const S = window.CC.etat();
  const e = S.exc.find((x) => x.key === "galerie" && !x.t && x.w * x.h >= 4) || S.exc[2];
  return e ? { c: e.c + e.w / 2 - .5, r: e.r + e.h / 2 - .5 } : null;
});
if (cible) {
  const q = await pos(cible.c, cible.r);
  await p.mouse.click(q.x, q.y);
  await sleep(450);
  await p.screenshot({ path: path.join(OUT, "24-amenager.png") });
}
console.log("erreurs JS:", errs.length ? errs.join(" | ") : "aucune");
await b.close();
