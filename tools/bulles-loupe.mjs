// Les bulles de BD du corner, vérifiées dans un vrai navigateur.
//
// Idée de Sylvain (2026-07-27) : « on pourrait voir des bulles apparaître dans la
// scène corner, avec des retours haptiques ». La voix des clients EXISTAIT déjà —
// elle partait dans un toast en haut de l'écran, loin de la personne qui parle.
//
// Ce que ce test prouve :
//   1. les clients ne portent AUCUNE bulle — on voit bien qu'ils sont là ;
//   2. « ARAH !! » part de la rue AVANT que l'écran d'évacuation prenne la main —
//      sinon le joueur subit une modale sans voir d'où vient l'alerte ;
//   3. l'évacuation s'ouvre ensuite, avec ses deux gestes.
//
//   cd tools && node bulles-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-bulles");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// seed : le corner tenu, deux clients en file, du stock — on veut la scène peuplée
const mk = (cid, nm, av, g, offer) => ({ cid, nm, av, kind: "regulier", rel: 10,
  want: g, g, offer, tx: nm + " arrive et parle.", pat: 200, pat0: 200, mode: "offer", negoP: offer, dernier: null });
await page.evaluateOnNewDocument((ver, q) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    // planque MIXTE : c'est tout l'enjeu de la sacoche. Avec un seul format,
    // n'importe quelle stratégie de ravitaillement donne le même résultat.
    sachets: { "2": 40, "5": 14, "8": 8 }, sachetQ: 62, dirty: 200, reput: 20,
    shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true,
      // tamponQ VOLONTAIREMENT différent de sachetQ : avec deux qualités égales,
      // n'importe quelle formule de moyenne passe le test, y compris pas de formule.
      pdv: { res: 70, bac: 120, prix: 10, chouffes: 1, tampon: { "2": 20 }, tamponQ: 40,
        queue: q, ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1 } },
  }));
}, SAVE_VER, [{ ...mk("momo", "Momo", "🧢", 5, 48), qFac: 1.0 },   // qFac SEEDÉ : sans valeur de départ,
                                                                   // « undefined → 1.08 » passerait le test sans rien prouver
              { ...mk("bilal", "Bilal", "🎒", 8, 76), mode: "dernier", dernier: 76, qFac: 1.11 }]);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// aller au corner
await page.click('.tab[data-t="shelter"]'); await sleep(400);
await page.click(".map-pin.pdv").catch(() => {});
await sleep(500);
if (!(await page.$("#cPersos"))) {
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
  await sleep(400);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
  await sleep(600);
}

// ── 1. les clients ne portent PAS de bulle ────────────────────────────────
// Retour de playtest (2026-07-27) : « pas besoin de la bulle pour indiquer que le
// client parle, on voit bien qu'il est là ». La bulle d'arrivée disait la présence,
// que la silhouette dit déjà — c'était du bruit. Seul le CRI reste, parce que lui
// annonce un événement qu'on ne peut pas voir venir autrement.
await sleep(1200);
const persos = await page.evaluate(() => {
  const p = [...document.querySelectorAll(".cperso")];
  return { n: p.length, bulles: p.reduce((a, e) => a + e.querySelectorAll(".cbulle").length, 0) };
});
await page.screenshot({ path: path.join(OUT, "01-rue.png") });
ok("La rue est peuplée, et aucune silhouette ne porte de bulle",
   persos.n > 0 && persos.bulles === 0, `${persos.n} silhouette(s), ${persos.bulles} bulle(s)`);

// ── 2. La sacoche : composer format par format, et pouvoir tout rentrer ────
// Retour de playtest : le ravitaillement automatique prenait « les plus petites
// d'abord » et vidait chaque taille avant la suivante — 25 barrettes de 2 g depuis
// une planque qui contenait aussi du 5 g, donc les demandes de 5 g mouraient.
// on reste sur la scène déjà ouverte ; l'ARAH vient APRÈS, sinon la modale
// recouvre la sacoche sur la capture (et le joueur ne verrait rien non plus).
// ouvrir le tiroir « Gérer »
await page.evaluate(() => { const b = document.getElementById("cManage"); if (b) b.click(); });
await sleep(500);

const sac0 = await page.evaluate(() => ({
  lignes: document.querySelectorAll("#pSac [data-sac][data-f]").length,
  boutons: [...document.querySelectorAll("#pSac [data-sac]")].map((b) => b.dataset.sac + (b.dataset.f ? ":" + b.dataset.f : "")),
}));
await page.screenshot({ path: path.join(OUT, "04-sacoche.png") });
ok("La sacoche propose un réglage par FORMAT (plus de +10/+25/Max aveugle)",
   sac0.lignes >= 2, `${sac0.lignes} bouton(s) de format · ${sac0.boutons.join(" ")}`);

// ── 2c. Composer sa sacoche ne fait pas fuir un client engagé ──────────────
// `cornerReniffle` recalculait `qFac` pour TOUTE la file. Un client en « dernier
// prix » avait annoncé son prix avec l'ancien `qFac` ; le changer sous ses pieds
// faisait que `resolveOffer` réévaluait sa propre offre et renvoyait `walk` —
// perte sèche déclenchée par une action neutre (R1). Deux clients, deux verdicts
// attendus : l'attentiste renifle, l'engagé non.
{
  const avant = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return (s.shelter?.pdv?.queue || []).map((c) => ({ nm: c.nm, mode: c.mode, qFac: c.qFac }));
  });
  // on charge du 8 g : la qualité exposée bouge, donc qFac aussi
  await page.evaluate(() => { const b = document.querySelector('#pSac [data-sac="max"][data-f="8"]'); if (b) b.click(); });
  await sleep(400);
  const apres = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return (s.shelter?.pdv?.queue || []).map((c) => ({ nm: c.nm, mode: c.mode, qFac: c.qFac }));
  });
  const gele = apres.find((c) => c.mode === "dernier");
  const geleAvant = avant.find((c) => c.mode === "dernier");
  const libre = apres.find((c) => c.mode !== "dernier");
  const libreAvant = avant.find((c) => c.mode !== "dernier");
  const engageIntact = gele && geleAvant && gele.qFac === geleAvant.qFac;
  const libreSuit = libre && libreAvant && libre.qFac !== libreAvant.qFac;
  ok("R1 · composer sa sacoche ne change pas les règles sous un client déjà engagé",
     engageIntact && libreSuit && apres.length === avant.length,
     `engagé ${geleAvant?.qFac} → ${gele?.qFac} (figé) · attentiste ${libreAvant?.qFac?.toFixed?.(3)} → ${libre?.qFac?.toFixed?.(3)} (suit)`);
}

// charger au max, puis vérifier que plusieurs formats sont sortis
await page.evaluate(() => { const b = [...document.querySelectorAll('#pSac [data-sac="allin"]')][0]; if (b) b.click(); });
await sleep(500);
const apresIn = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { tampon: s.shelter?.pdv?.tampon || {}, sachets: s.sachets || {} };
});
const formats = Object.keys(apresIn.tampon).filter((f) => apresIn.tampon[f] > 0);
ok("« Charger au max » sort PLUSIEURS formats (le 5 g ne meurt plus)",
   formats.length >= 2, `sacoche : ${formats.map((f) => apresIn.tampon[f] + "×" + f + "g").join(" · ") || "vide"}`);

// tout rentrer : la marchandise revient en planque, rien ne se perd
const avantG = Object.entries(apresIn.tampon).reduce((a, [f, n]) => a + +f * n, 0)
             + Object.entries(apresIn.sachets).reduce((a, [f, n]) => a + +f * n, 0);
await page.evaluate(() => { const b = [...document.querySelectorAll('#pSac [data-sac="allout"]')][0]; if (b) b.click(); });
await sleep(500);
const apresOut = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { tampon: s.shelter?.pdv?.tampon || {}, sachets: s.sachets || {} };
});
const apresG = Object.entries(apresOut.tampon).reduce((a, [f, n]) => a + +f * n, 0)
             + Object.entries(apresOut.sachets).reduce((a, [f, n]) => a + +f * n, 0);
await page.screenshot({ path: path.join(OUT, "05-rentre.png") });
ok("« Tout rentrer » vide la sacoche sans perdre un gramme (quand la chaleur monte)",
   Object.values(apresOut.tampon).every((n) => !n) && apresG === avantG,
   `exposé ${Object.values(apresOut.tampon).reduce((a, n) => a + n, 0)} barrette(s) · total ${avantG} g → ${apresG} g`);


// ── 2b. La qualité ne se crée pas dans l'aller-retour ─────────────────────
// Les grammes étaient conservés, la qualité non : rentrer en planque ne diluait
// jamais `S.sachetQ`. 214 g à q62 + 40 g à q40 rendaient q62 au lieu de q58,5 —
// +3,5 points fabriqués par aller-retour, cumulables à volonté (R4).
{
  const attendu = (214 * 62 + 40 * 40) / 254;   // tout le produit, moyenné une fois
  const q = apresOut.sachets && (await page.evaluate(() =>
    JSON.parse(localStorage.getItem("loupe_save") || "{}").sachetQ));
  ok("R4 · un aller-retour planque ⇄ sacoche ne fabrique pas de qualité",
     Math.abs(q - attendu) < 0.5,
     `planque à q${(+q).toFixed(1)} · moyenne réelle de tout le produit q${attendu.toFixed(1)} (sans dilution : q62)`);
}

// ── 2d. La sacoche dit ce qu'elle SERT, et ce que la rue demande ───────────
// C'est le correctif qui répond littéralement à « je ne pouvais pas vendre 5 g » :
// l'information existait (composables) mais n'apparaissait que dans la carte de
// négo, c'est-à-dire une fois le client devant soi, trop tard pour composer.
{
  const txt = await page.evaluate(() => document.getElementById("pSac")?.innerText || "");
  ok("La sacoche affiche ce qu'elle sert et ce que la rue demande",
     /Sert\s*:/.test(txt) && /La rue demande/.test(txt),
     txt.split("\n").filter((l) => /Sert|La rue demande/.test(l)).join(" ⋅ ").slice(0, 150));
}

// ── 3. « ARAH !! » précède l'écran d'évacuation ────────────────────────────
// on pousse la chaleur au seuil : avec 1 chouffe il y a du préavis, donc un cri
// `evaluateOnNewDocument` rejoue à CHAQUE navigation : écrire la chaleur puis
// recharger la faisait écraser par le seed d'origine. On empile un second seed,
// qui s'exécute après le premier et le complète.
await page.evaluateOnNewDocument(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  s.heat = 96;                       // au-delà du seuil : l'ARAH part au premier tick
  localStorage.setItem("loupe_save", JSON.stringify(s));
});
await page.reload({ waitUntil: "load" }); await sleep(600);
await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
await sleep(300);
await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
await sleep(700);   // le cri dure ~1,4 s et le sas ~0,9 s : on regarde pendant

const cri = await page.evaluate(() => {
  const b = document.querySelector(".cbulle.cri");  // désormais au niveau de la SCÈNE, pas d'un client
  const arah = document.getElementById("arah");
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { cri: !!b, txt: b ? b.textContent : "", arahVisible: !!(arah && !arah.classList.contains("hide")),
    _diag: { heat: s.heat, scene: !!document.getElementById("cPersos"), arahExiste: !!arah,
      persos: document.querySelectorAll(".cperso").length } };
});
console.log("  diag:", JSON.stringify(cri._diag));
await page.screenshot({ path: path.join(OUT, "02-cri.png") });
// on cherche le CRI ou, s'il a déjà expiré, l'écran d'évacuation qui a pris la suite
// Le cri appartient à la scène : il doit partir même quand la rue est vide (c'est le
// chouffe qui hurle, pas un client). L'accrocher à P.queue[0] le rendait muet dans le
// cas le plus fréquent — défaut trouvé par ce test, pas par relecture.
ok("« ARAH !! » est crié dans la rue, au niveau de la scène",
   cri.cri && /ARAH/.test(cri.txt), `cri « ${cri.txt} » · écran ARAH ${cri.arahVisible ? "ouvert" : "fermé"}`);

await sleep(1200);
const arahApres = await page.evaluate(() => {
  const arah = document.getElementById("arah");
  return { visible: !!(arah && !arah.classList.contains("hide")), boutons: document.querySelectorAll("#arah .arah-c").length };
});
await page.screenshot({ path: path.join(OUT, "03-arah.png") });
ok("L'écran d'évacuation s'ouvre après le cri, avec ses deux gestes",
   arahApres.visible && arahApres.boutons === 2, `visible ${arahApres.visible} · ${arahApres.boutons} bouton(s)`);

// ── 3b. Le geste d'évacuation marche VRAIMENT au doigt ────────────────────
// Retour de playtest (2026-07-27) : « je cliquais sur récupérer les barrettes mais
// rien ne se passait » — puis la descente a tout pris (−440).
//
// Le check précédent ne prouvait QUE la présence des deux boutons. Il ne les tapait
// pas. Or un `click` n'est émis que si le pointeur se lève sur le MÊME nœud DOM que
// celui où il s'est posé ; l'écran d'évacuation se re-rendait en `innerHTML` à chaque
// frame, donc le bouton pressé n'existait déjà plus au relâchement. Un clic
// synthétique instantané passe ; un doigt, jamais.
//
// D'où le `delay` : on presse ~120 ms, comme une vraie main.
{
  const avant = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const t = s.shelter?.pdv?.tampon || {};
    return Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0);
  });
  const etatAvant = await page.evaluate(() => {
    const t = document.getElementById("arahT"), arah = document.getElementById("arah");
    const r = t && t.getBoundingClientRect();
    return { bouton: !!t, classes: t ? t.className : "-",
      pe: t ? getComputedStyle(t).pointerEvents : "-",
      rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      ouvert: !!(arah && !arah.classList.contains("hide")),
      dessus: r ? (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) || {}).id || "(sans id)" : "-" };
  });
  console.log("  diag tap:", JSON.stringify(etatAvant));
  let tapErr = "";
  try { await page.click("#arahT", { delay: 120 }); } catch (e) { tapErr = e.message; }
  await sleep(350);
  const apres = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const t = s.shelter?.pdv?.tampon || {};
    const arah = document.getElementById("arah");
    return { g: Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0),
             ouvert: !!(arah && !arah.classList.contains("hide")) };
  });
  await page.screenshot({ path: path.join(OUT, "06-tap-evacuation.png") });
  ok("R1 · taper « Rentrer les barrettes » rentre vraiment des barrettes (appui de 120 ms)",
     apres.g < avant && !tapErr,
     tapErr ? `le tap a échoué : ${tapErr}` : `exposé ${avant} g → ${apres.g} g${apres.g === avant ? " (RIEN n'a bougé)" : ""}`);
}

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── bulles & ARAH · La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
