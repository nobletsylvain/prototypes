// Smoke-test + captures pour le proto "le-spot".
//
// Il ne se contente pas de regarder si ça s'affiche : il DÉROULE une partie
// headless et vérifie les invariants qu'on s'est imposés (R4, bornes, causes).
//
//   cd tools && node smoke-spot.mjs
//
// Sortie : PNG dans tools/shots/le-spot/, et un verdict PASS/FAIL par invariant.
// Code de sortie 1 si un invariant casse ou si la console crache une erreur.

import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "shots", "le-spot");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); };

// ── 0. invariant statique : zéro Math.random dans le fichier (R4) ──────────
const SRC = readFileSync(path.join(ROOT, "le-spot", "index.html"), "utf8");
{
  // un APPEL, pas une mention : le fichier parle de Math.random dans ses commentaires
  const hits = [...SRC.matchAll(/Math\.random\s*\(|crypto\.getRandomValues\s*\(/g)];
  ok("R4 · aucun appel à Math.random dans la source", hits.length === 0, `${hits.length} appel(s)`);
}
{
  // toute constante d'équilibrage doit être nommée : on repère les nombres
  // magiques les plus grossiers dans la sim (hors CSS/HTML).
  const js = SRC.split("<script type=\"module\">")[1] || "";
  const constes = (js.match(/^const [A-Z][A-Z0-9_]* *=/gm) || []).length;
  ok("Constantes nommées groupées", constes >= 25, `${constes} constantes majuscules`);
}

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const URL_ = `http://127.0.0.1:${PORT}/le-spot/index.html`;
await page.goto(URL_, { waitUntil: "load" });
await sleep(500);

const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
const tap = async (sel) => {
  const el = await page.$(sel);
  if (!el) return false;
  const b = await el.boundingBox();
  if (!b) return false;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(120);
  return true;
};
const st = () => page.evaluate(() => window.__spot.S());

await shot("01-intro.png");
ok("Intro affichée", await page.$eval("#ovIntro", (e) => !e.classList.contains("hide")));

await tap("#introOk");
await sleep(400);
await shot("02-spot-matin.png");

// ── 1. la sim : la formule du calibre est bien le levier annoncé ───────────
{
  const t = await page.evaluate(() => {
    const w = window.__spot;
    return w.FORMATS.map((f) => {
      // pour 100 g de demande servie, combien de transactions (donc de visibilité)
      const tx = (100 * f.servi) / f.g;
      const ca = 100 * f.servi * 10 * f.eurFac;   // grade B
      return { g: f.g, tx: +tx.toFixed(1), ca: +ca.toFixed(0), parVis: +(ca / tx).toFixed(1) };
    });
  });
  console.log("\n  calibre → transactions / CA / € par point de visibilité :");
  t.forEach((r) => console.log(`    ${r.g} g : ${r.tx} tx · ${r.ca} € · ${r.parVis} €/tx`));
  const croissant = t[0].parVis < t[1].parVis && t[1].parVis < t[2].parVis;
  const caDecroissant = t[0].ca > t[1].ca && t[1].ca > t[2].ca;
  ok("R8 · le calibre est un VRAI dilemme (petit = plus de CA, gros = plus discret)",
     croissant && caDecroissant,
     `€/tx ${t.map((x) => x.parVis).join(" < ")} · CA ${t.map((x) => x.ca).join(" > ")}`);
}

// ── 1b. LE test de design : le calibre optimal CHANGE selon le contexte ───
{
  // L'espace de stratégie est à DEUX dimensions : en quoi on coupe (calibre)
  // et quand on ouvre (fenêtre). On balaie les deux et on regarde ce qui gagne.
  const sim = await page.evaluate(() => {
    const w = window.__spot;
    const plans = [];
    const fenetres = [[0, 24], [16, 2], [18, 2], [19, 1], [20, 0]];
    for (const f of w.FORMATS) for (const [d, fin] of fenetres) {
      const r = w.simJour(f.g, 85, "B", d, fin);
      plans.push({ g: f.g, d, fin, ...r });
    }
    return {
      j1: w.FORMATS.map((f) => ({ g: f.g, ...w.simJour(f.g, 40, "C", 0, 24) })),
      plans, seuil: w.K.SEUIL_PILONNAGE,
    };
  });
  console.log("\n  J1 (réservoir 40, grade C, ouvert en continu) :");
  sim.j1.forEach((r) => console.log(`    ${r.g} g : ${r.net} € net · vis ${r.visNette > 0 ? "+" : ""}${r.visNette}/j`));

  const meilleurJ1 = sim.j1.reduce((a, b) => (b.net > a.net ? b : a));
  const tenables = sim.plans.filter((p) => p.visNette <= 0 && p.net > 0);
  const meilleurTenable = tenables.length
    ? tenables.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  console.log("  régime de croisière (réservoir 85) — meilleurs plans TENABLES (vis. qui ne monte pas) :");
  tenables.sort((a, b) => b.net - a.net).slice(0, 4).forEach((p) =>
    console.log(`    ${p.g} g, ouvert ${p.d}h→${p.fin}h (${p.ouvertes}h) : ${p.net} €/j · vis ${p.visNette}/j`));

  ok("Dilemme · à J1, le plus rentable est le plus visible (il faut choisir)",
     meilleurJ1.g === 2 && meilleurJ1.visNette > 0,
     `${meilleurJ1.g} g gagne (vis +${meilleurJ1.visNette}/j)`);
  ok("Dilemme · un plan TENABLE existe en régime de croisière (la jauge n'est pas un plafond)",
     meilleurTenable !== null,
     meilleurTenable ? `${meilleurTenable.g} g sur ${meilleurTenable.ouvertes} h → ${meilleurTenable.net} €/j`
                     : "aucun plan ne tient");
  ok("Dilemme · pousser et tenir ne sont pas le même plan",
     meilleurTenable !== null &&
       (meilleurTenable.g !== meilleurJ1.g || meilleurTenable.ouvertes < 24),
     meilleurTenable ? `pousser = ${meilleurJ1.g} g / 24 h · tenir = ${meilleurTenable.g} g / ${meilleurTenable.ouvertes} h` : "—");
  ok("Dilemme · le rideau est un vrai levier (fermer bat ouvrir en continu, sous chaleur)",
     meilleurTenable !== null && meilleurTenable.ouvertes < 24,
     meilleurTenable ? `${meilleurTenable.ouvertes} h d'ouverture optimales` : "—");

  // le loyer fixe est ce qui rend la lenteur coûteuse : sans lui, la discrétion
  // serait gratuite et le calibre 8 g dominerait toujours
  const plein = sim.plans.find((p) => p.g === 2 && p.ouvertes === 24);
  ok("Le loyer fixe rend le temps cher (sinon la discrétion est gratuite)",
     plein && plein.ca - plein.net >= 220, plein ? `${plein.ca - plein.net} € de charges/jour` : "—");
}

// ── 2. parcours : planque → acheter → couper → poche → spot ───────────────
await tap("#bGo");                                   // vers la planque
await sleep(350);
await shot("03-planque.png");

// au départ (260 €) seul le lot de dépannage est abordable : c'est la marche d'entrée
const achat = await tap('[data-p="depan"]');
ok("Appro · achat du lot d'amorçage", achat && (await st()).pain !== null);
await sleep(250);
await shot("04-pain-sur-la-planche.png");

// calibre 8 g puis maintien pour couper le pain entier en un geste
await tap('[data-f="8"]');
{
  const el = await page.$("#planche");
  const b = await el.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await sleep(2600);                                  // 100 g / 8 g = 12 sachets ≈ 1,2 s
  await page.mouse.up();
}
await sleep(300);
await shot("05-coupe-en-8g.png");
{
  const s = await st();
  const g = Object.entries(s.sachets).reduce((a, [k, n]) => a + +k * n, 0);
  ok("Découpe · un maintien coupe le pain entier", g >= 96, `${g} g en sachets`);
  ok("R1 · rien n'est perdu à la coupe (miettes < calibre)", s.pain === null || s.pain.g < 8);
}

await tap("#bFill");
await sleep(200);
{
  const s = await st();
  ok("Poids · la poche borne la navette", s.poche > 0 && s.poche <= 60, `${Math.round(s.poche)} g en poche`);
}
await shot("06-poche-remplie.png");

await tap("#bGo");                                   // retour au spot : on EXPOSE
await sleep(400);
{
  const s = await st();
  ok("Navette · poser la marchandise = exposer le tampon", s.tampon > 0 && s.poche === 0,
     `tampon ${Math.round(s.tampon)} g`);
}
await shot("07-tampon-expose.png");

// ── 3. laisser tourner : des clients arrivent, on en sert un à la main ─────
await page.evaluate(() => { const s = window.__spot.S(); s.clock = 20; s.res = 85; });
await sleep(3500);
await shot("08-file-de-clients.png");
{
  const n = await page.$$eval("#queue .cli", (e) => e.length);
  ok("Demande · la file se remplit à l'heure de pointe", n > 0, `${n} client(s)`);
  if (n > 0) { await tap("#queue .cli"); await sleep(200); }
  const s = await st();
  ok("Vente · la caisse se remplit et la visibilité monte", s.txDay > 0 && s.vis > 0,
     `${s.txDay} tx · vis ${s.vis.toFixed(1)}`);
}
await shot("09-apres-ventes.png");

// ── 3b. R1 rendu MÉCANIQUE : présent + tampon plein ⇒ personne ne part ────
// L'audit du dépôt a trouvé R1 cité en commentaire et violé dans les constantes
// juste en dessous (corner.mjs annonce « jamais de malus sec » et ponctionne
// relation/réput/réservoir sur un walk). Ici on le VÉRIFIE au lieu de l'écrire.
{
  const r = await page.evaluate(async () => {
    const w = window.__spot, s = w.S();
    s.lieu = "spot"; s.fermeUntil = -99; s.tampon = 400; s.tamponQ = 60;
    s.res = 60; s.clock = 20;
    const resAvant = s.res, rupturesAvant = s.rupturesDay;
    for (let i = 0; i < 5; i++) w.spawnClient();
    await new Promise((res) => setTimeout(res, 7500));   // > PATIENCE_S : sans service auto ils partiraient
    return { resAvant, resApres: s.res, ruptures: s.rupturesDay - rupturesAvant, restants: w.queue().length };
  });
  ok("R1 · présent avec du stock, AUCUN client ne part (la lenteur de la main ne punit jamais)",
     r.ruptures === 0 && r.resApres >= r.resAvant,
     `${r.ruptures} rupture(s) · réservoir ${r.resAvant.toFixed(1)} → ${r.resApres.toFixed(1)}`);
}

// ── 4. la descente : annoncée, et l'évacuation ne peut que sauver ─────────
await page.evaluate(() => {
  const s = window.__spot.S();
  s.chouf = 1; s.tampon = 60; s.tamponQ = 60; s.caisse = 400;
});
await sleep(200);
const avantRaid = await st();
await page.evaluate(() => { const s = window.__spot.S(); s.vis = 95; });
await sleep(700);
await shot("10-ara.png");
{
  const visible = await page.$eval("#ara", (e) => !e.classList.contains("hide"));
  ok("Police · le chouf déclenche un préavis (ARA), pas une surprise", visible);
  if (visible) {
    await tap('[data-i="cash"]');
    await tap('[data-i="0"]');
    await sleep(450);
    await tap('[data-i="1"]');
    const s = await st();
    ok("R1 · l'évacuation ne fait que RÉDUIRE une perte annoncée",
       s.cash >= avantRaid.cash && s.tampon <= avantRaid.tampon,
       `cash ${Math.round(avantRaid.cash)} → ${Math.round(s.cash)}, tampon ${Math.round(avantRaid.tampon)} → ${Math.round(s.tampon)} g`);
    await shot("11-ara-evacuation.png");
  }
}
await sleep(14000);                                   // laisser le préavis expirer
await shot("12-apres-pilonnage.png");
{
  const s = await st();
  ok("Saisie · elle ne frappe QUE l'exposé (le stock rangé est intact)",
     s.tampon === 0 && s.caisse === 0 && s.dos > 0,
     `dossier ${s.dos.toFixed(0)}`);
}

// ── 5. invariants de bornes + déterminisme ────────────────────────────────
{
  const s = await st();
  ok("Bornes · jauges dans 0..100",
     s.vis >= 0 && s.vis <= 100 && s.dos >= 0 && s.dos <= 100 && s.res >= 0 && s.res <= 100,
     `vis ${s.vis.toFixed(1)} · dos ${s.dos.toFixed(1)} · res ${s.res.toFixed(1)}`);
  ok("Trace · chaque conséquence porte une cause non vide",
     s.ledger.every((l) => typeof l.tx === "string" && l.tx.length > 0),
     `${s.ledger.length} entrée(s)`);
}
{
  // R4 : même entrée → même sortie, sur 400 tirages du hash
  const det = await page.evaluate(() => {
    const h = window.__spot.hh;
    const a = [], b = [];
    for (let i = 0; i < 400; i++) { a.push(h(i, i * 3)); }
    for (let i = 0; i < 400; i++) { b.push(h(i, i * 3)); }
    const borne = a.every((v) => v >= 0 && v < 1);
    return { egal: a.every((v, i) => v === b[i]), borne, uniq: new Set(a).size };
  });
  ok("R4 · le hash est déterministe et borné [0,1[", det.egal && det.borne,
     `${det.uniq} valeurs distinctes / 400`);
}

// ── 6. clôture de journée ─────────────────────────────────────────────────
await page.evaluate(() => { const s = window.__spot.S(); s.clock = 31.9; });
await sleep(900);
await shot("13-rapport-du-soir.png");
{
  const vu = await page.$eval("#ovRapport", (e) => !e.classList.contains("hide"));
  ok("Rapport du soir · le bilan nomme ses causes", vu);
}

ok("Console propre", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
server.close();

console.log("\n─── invariants ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} invariants OK · captures dans tools/shots/le-spot/`);
if (errors.length) console.log("\nErreurs console :\n  " + errors.join("\n  "));
process.exit(bad ? 1 : 0);
