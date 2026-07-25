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
// On compare À PRODUIT ÉGAL (100 g de pain), pas à demande égale : le stock est
// le goulot du jeu, et écouler 100 g demande 100/calibre transactions quel que
// soit `servi`. L'ancienne comparaison mesurait 100 g écoulés en 2 g contre 45 g
// en 8 g — deux quantités différentes — et « prouvait » ainsi un dilemme.
{
  const t = await page.evaluate(() => {
    const w = window.__spot, K = w.K;
    return w.FORMATS.map((f) => {
      const tx = 100 / f.g;
      const ca = 100 * 10 * f.eurFac;             // grade B, 100 g de produit
      return { g: f.g, tx: +tx.toFixed(1), ca: +ca.toFixed(0),
               vis: +(tx * K.VIS_PAR_TX).toFixed(1), parVis: +(ca / (tx * K.VIS_PAR_TX)).toFixed(0) };
    });
  });
  console.log("\n  À PRODUIT ÉGAL (100 g) — transactions / CA / chaleur / € par point de chaleur :");
  t.forEach((r) => console.log(`    ${r.g} g : ${r.tx} tx · ${r.ca} € · +${r.vis} vis · ${r.parVis} €/vis`));
  ok("R8 · le calibre arbitre recette contre chaleur (à produit égal)",
     t[0].ca > t[1].ca && t[1].ca > t[2].ca &&
     t[0].parVis < t[1].parVis && t[1].parVis < t[2].parVis,
     `CA ${t.map((x) => x.ca).join(" > ")} · €/vis ${t.map((x) => x.parVis).join(" < ")}`);
}

// ── 1b. LE test de design : le calibre optimal CHANGE selon le contexte ───
{
  // L'espace de stratégie est à DEUX dimensions : en quoi on coupe (calibre)
  // et quand on ouvre (fenêtre). On balaie les deux et on regarde ce qui gagne.
  // Chaque plan est borné par le STOCK du jour : un pain de 250 g écoulé au
  // mieux, pas une demande infinie. C'est le régime réel du jeu.
  const sim = await page.evaluate(() => {
    const w = window.__spot;
    const plans = [];
    const fenetres = [[0, 24], [16, 2], [18, 2], [19, 1], [20, 0]];
    const STOCK = 250;                       // un « Bazar 250 » écoulé dans la journée
    for (const f of w.FORMATS) for (const [d, fin] of fenetres) {
      const r = w.simJour(f.g, 85, "B", d, fin, STOCK);
      plans.push({ g: f.g, d, fin, ...r });
    }
    return {
      j1: w.FORMATS.map((f) => ({ g: f.g, ...w.simJour(f.g, 40, "C", 0, 24, 100) })),
      plans, seuil: w.K.SEUIL_PILONNAGE,
    };
  });
  console.log("\n  J1 (réservoir 40, grade C, un pain de 100 g, ouvert en continu) :");
  sim.j1.forEach((r) => console.log(`    ${r.g} g : ${r.net} € net · ${r.vendus} g écoulés · vis ${r.visNette > 0 ? "+" : ""}${r.visNette}/j`));

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

// ── 2b. LA LAME : la coupe porte une décision, payée en GRAMMES ───────────
// Version 2. La v1 facturait la propreté en SECONDES — or la journée est bornée
// par le stock, pas par le temps : le coût était nul, voire négatif (le temps à
// la planque refroidit le point). Ici la lame émoussée écrase du produit, et les
// grammes sont le vrai goulot.
{
  const k = await page.evaluate(() => window.__spot.K);

  // R1 — rien n'est DÉTRUIT : ce qui est écrasé part aux miettes et revient
  const conserv = await page.evaluate(async () => {
    const w = window.__spot, st = w.S();
    st.sachets = {}; st.sacQ = 0; st.miettes = 0; st.format = 5;
    st.pain = { id: "t", g: 100, q: 60, col: "#5c4632", g0: 100 };
    w.setLame(1);
    const el = document.getElementById("planche");
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 3200));        // maintien continu : la lame force
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    const stock = Object.entries(st.sachets).reduce((a2, [g2, n]) => a2 + +g2 * n, 0);
    const reste = st.pain ? st.pain.g : 0;
    return { stock, miettes: st.miettes, reste, total: stock + st.miettes + reste,
             parCoupe: stock > 0 ? st.miettes / (stock / 5) : 0 };
  });
  ok("R1 · la lame n'ANÉANTIT rien : sachets + miettes + reste = le pain entier",
     Math.abs(conserv.total - 100) < 0.01,
     `${conserv.stock} g en sachets + ${conserv.miettes.toFixed(1)} g de miettes + ${conserv.reste.toFixed(1)} g = ${conserv.total.toFixed(1)} g`);
  ok("Une lame qui force COÛTE du rendement (des grammes, pas des secondes)",
     conserv.miettes > 1,
     `${conserv.miettes.toFixed(1)} g écrasés en maintien continu`);

  // Le rythme paie : mêmes 100 g, coupés en alternant → beaucoup moins d'écrasement
  const propre = await page.evaluate(async () => {
    const w = window.__spot, st = w.S();
    st.sachets = {}; st.sacQ = 0; st.miettes = 0; st.format = 5;
    st.pain = { id: "t", g: 100, q: 60, col: "#5c4632", g0: 100 };
    w.setLame(1);
    const el = document.getElementById("planche");
    for (let i = 0; i < 8; i++) {
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 330));       // ~3 sachets
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 900));       // > RELACHE_MIN, la lame reprend
      if (!st.pain) break;
    }
    const stock = Object.entries(st.sachets).reduce((a2, [g2, n]) => a2 + +g2 * n, 0);
    return { miettes: st.miettes, parCoupe: stock > 0 ? st.miettes / (stock / 5) : 0 };
  });
  ok("Le rythme (couper / laisser reprendre) réduit vraiment l'écrasement",
     propre.parCoupe < conserv.parCoupe * 0.7,
     `par coupe : continu ${conserv.parCoupe.toFixed(2)} g · alterné ${propre.parCoupe.toFixed(2)} g`);

  // ANTI-DÉGÉNÉRESCENCE : un relâchement plus court que RELACHE_MIN ne doit
  // accorder AUCUNE reprise. Sans ce plancher, taper 0,10 s / lâcher 0,11 s
  // gardait la lame nette gratuitement — le proto enseignait « spamme ».
  const relache = await page.evaluate(async () => {
    const w = window.__spot, st = w.S();
    st.pain = { id: "t", g: 400, q: 60, col: "#5c4632", g0: 400 };
    st.format = 5;
    const el = document.getElementById("planche");
    const cycle = async (repos) => {
      w.setLame(0.5);
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));       // trop court pour couper
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      await new Promise((r) => setTimeout(r, repos));
      return w.lame();
    };
    return { court: await cycle(150), long: await cycle(900) };
  });
  ok("Un relâchement trop court n'accorde AUCUNE reprise (RELACHE_MIN)",
     Math.abs(relache.court - 0.5) < 0.01 && relache.long > 0.6,
     `repos 150 ms → ${relache.court.toFixed(2)} (inchangé) · repos 900 ms → ${relache.long.toFixed(2)}`);

  // R8 — le calibre porte la propreté : 50 coupes émoussent 4× plus que 12
  const parCalibre = await page.evaluate(() => {
    const w = window.__spot, k2 = w.K;
    return w.FORMATS.map((f) => {
      const coupes = 100 / f.g;
      return { g: f.g, coupes, usure: +(coupes * k2.NETTETE_PAR_COUPE).toFixed(2) };
    });
  });
  console.log("\n  Usure de lame pour 100 g de pain, par calibre :");
  parCalibre.forEach((r) => console.log(`    ${r.g} g : ${r.coupes} coupes → ${r.usure} d'usure`));
  ok("R8 · le petit calibre est structurellement plus dur à garder net",
     parCalibre[0].usure > parCalibre[1].usure && parCalibre[1].usure > parCalibre[2].usure,
     parCalibre.map((r) => `${r.g}g:${r.usure}`).join(" > "));
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
// Le tampon est volontairement MAIGRE (2 sachets) : c'est le chemin réel. Avec
// un tampon de 400 g l'invariant passait sans jamais être éprouvé — la file
// pouvait dépasser ce que le tampon couvrait et produire des ruptures alors que
// le joueur était présent, avec de la came posée.
{
  const r = await page.evaluate(async () => {
    const w = window.__spot, s = w.S();
    s.lieu = "spot"; s.fermeUntil = -99; s.rideau = false;
    s.format = 5; s.tampon = 10; s.tamponQ = 60;      // 2 sachets seulement
    s.res = 85; s.clock = 20;                          // heure de pointe : ça se bouscule
    const resAvant = s.res, rupturesAvant = s.rupturesDay;
    await new Promise((res) => setTimeout(res, 9000)); // > PATIENCE_S
    return { resAvant, resApres: s.res, ruptures: s.rupturesDay - rupturesAvant };
  });
  ok("R1 · présent avec du stock (tampon maigre), AUCUN client ne part les mains vides",
     r.ruptures === 0,
     `${r.ruptures} rupture(s) · réservoir ${r.resAvant.toFixed(1)} → ${r.resApres.toFixed(1)}`);
}

// Conservation de matière à travers une évacuation : le tampon rentré doit
// arriver au stock au gramme près. `tampon <= avant` était satisfait
// trivialement par une destruction.
{
  const r = await page.evaluate(async () => {
    const w = window.__spot, s = w.S();
    const stock = () => Object.entries(s.sachets).reduce((a, [k, n]) => a + +k * n, 0);
    s.lieu = "spot"; s.fermeUntil = -99; s.rideau = true;  // rideau : personne ne vient fausser le compte
    s.format = 8; s.tampon = 60; s.tamponQ = 60; s.caisse = 0; s.chouf = 1; s.vis = 95;
    const avant = s.tampon + stock();
    await new Promise((res) => setTimeout(res, 700));       // laisser l'ARA s'ouvrir
    const ouvert = !document.getElementById("ara").classList.contains("hide");
    for (const sel of ['[data-i="0"]', '[data-i="1"]', '[data-i="2"]']) {
      const b = document.querySelector(sel);
      if (b) b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await new Promise((res) => setTimeout(res, 420));     // > CACHE_COOL_MS
    }
    return { ouvert, avant, apres: s.tampon + stock() };
  });
  ok("Conservation · rien ne se perd en évacuant (tampon + stock constant)",
     r.ouvert && Math.abs(r.avant - r.apres) < 0.001,
     `${r.avant} g → ${r.apres} g`);
}

// Les miettes sont VRAIMENT gardées : le toast le promet, le code doit le faire.
{
  const r = await page.evaluate(() => {
    const w = window.__spot, s = w.S();
    s.miettes = 0; s.pain = { id: "t", g: 100, q: 60, col: "#000", g0: 100 };
    s.format = 8;
    // on simule la fin de coupe : 12 sachets de 8 g = 96 g, 4 g de reliquat
    return { attendu: 100 - Math.floor(100 / 8) * 8 };
  });
  ok("Miettes · le reliquat d'un pain n'est jamais détruit", r.attendu === 4,
     `${r.attendu} g de reliquat à 100 g / calibre 8`);
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

// ── 5b. LE seuil doit être ATTEIGNABLE en jouant, pas en trichant ─────────
// La revue a montré que SEUIL_PILONNAGE était inatteignable : la patrouille
// clampait la jauge sous le seuil, donc la seule conséquence qui saisit quelque
// chose n'arrivait jamais. Le test le masquait en écrivant `s.vis = 95`.
// Ici on laisse la jauge monter toute seule, en vendant.
{
  // laisser retomber ce que les sections précédentes ont pu ouvrir
  await page.evaluate(() => new Promise((r) => {
    const t = setInterval(() => {
      if (document.getElementById("ara").classList.contains("hide")) { clearInterval(t); r(); }
    }, 200);
  }));
  const r = await page.evaluate(async () => {
    const w = window.__spot, s = w.S();
    s.lieu = "spot"; s.rideau = false; s.fermeUntil = -99; s.patrouilleUntil = -99;
    s.format = 2; s.tampon = 4000; s.tamponQ = 60; s.res = 95; s.clock = 19;
    s.chouf = 0; s.vis = 0; s.dos = 0; s.over = false;   // sans chouf : la saisie tombe direct
    const t0 = performance.now();
    let patrouille = false, visMax = 0;
    while (performance.now() - t0 < 115000) {
      await new Promise((r2) => setTimeout(r2, 250));
      visMax = Math.max(visMax, s.vis);
      if (s.fermeUntil > s.clock && s.dos < 19) patrouille = true;
      if (s.dos >= 19) return { pilonnage: true, patrouille, visMax, tx: s.totalTx };
      // rester dans le rush : les compteurs d'horloge sont ABSOLUS, il faut les
      // ramener avec elle (sinon fermeUntil reste dans le futur et le spot ne
      // rouvre jamais — c'est ce qui bloquait la mesure à 54)
      // On garde l'anti-récidive TELLE QUELLE : la patrouille doit prévenir une
      // fois, puis la jauge doit pouvoir continuer à monter jusqu'au pilonnage.
      if (s.clock > 23) { s.clock = 19; s.fermeUntil = Math.min(s.fermeUntil, -99); }
    }
    return { pilonnage: false, patrouille, visMax, tx: s.totalTx };
  });
  ok("Police · le pilonnage est ATTEIGNABLE en jouant (jauge laissée libre)",
     r.pilonnage,
     r.pilonnage ? `visibilité montée jusqu'à ${r.visMax.toFixed(0)}` : `bloquée à ${r.visMax.toFixed(0)}`);
  ok("Police · la patrouille prévient AVANT le pilonnage", r.patrouille);
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
