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
    return (s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.queue || []).map((c) => ({ nm: c.nm, mode: c.mode, qFac: c.qFac }));
  });
  // on charge du 8 g : la qualité exposée bouge, donc qFac aussi
  await page.evaluate(() => { const b = document.querySelector('#pSac [data-sac="max"][data-f="8"]'); if (b) b.click(); });
  await sleep(400);
  const apres = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return (s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.queue || []).map((c) => ({ nm: c.nm, mode: c.mode, qFac: c.qFac }));
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

// ── 2b-bis. Ce que la rue raconte suit l'état de la sacoche ───────────────────
// Retour de playtest (capture) : « le message disant que la sacoche est libre est
// erroné » — la scène affichait « Sacoche vide — charge des barrettes (Gérer) » avec
// 25 barrettes · 50 g dans le tiroir. Le texte était écrit UNE FOIS au rendu de la
// scène ; seul son `display` était retouché ensuite, jamais son contenu.
// On rejoue la séquence exacte : sacoche vide → charger → refermer le tiroir → lire.
{
  await page.evaluate(() => { const b = document.getElementById("cFerme") || document.getElementById("cClose"); if (b) b.click(); });
  await sleep(200);
  // 1) tout rentrer : la rue doit dire « vide »
  await page.evaluate(() => { const b = document.getElementById("cManage"); if (b) b.click(); });
  await sleep(350);
  await page.evaluate(() => { const b = document.querySelector('#pSac [data-sac="allout"]'); if (b) b.click(); });
  await sleep(500);
  const vide = await page.evaluate(() => (document.getElementById("cEmpty") || {}).textContent || "");
  // 2) charger, puis relire SANS re-rendre la scène
  await page.evaluate(() => { const b = document.querySelector('#pSac [data-sac="allin"]'); if (b) b.click(); });
  await sleep(600);
  const apres = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const t = s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.tampon || {};
    return { tx: (document.getElementById("cEmpty") || {}).textContent || "",
             n: Object.values(t).reduce((a, v) => a + v, 0) };
  });
  await page.screenshot({ path: path.join(OUT, "07-rue-raconte.png") });
  const coherent = apres.n > 0 && !/[Ss]acoche vide/.test(apres.tx) && /vide/i.test(vide);
  ok("La rue ne dit pas « sacoche vide » quand la sacoche est pleine",
     coherent,
     `vide → « ${vide.slice(0, 42)} » · ${apres.n} barrette(s) → « ${apres.tx.slice(0, 42)} »`);
}

// charger au max, puis vérifier que plusieurs formats sont sortis
await page.evaluate(() => { const b = [...document.querySelectorAll('#pSac [data-sac="allin"]')][0]; if (b) b.click(); });
await sleep(500);
const apresIn = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { tampon: s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.tampon || {}, sachets: s.sachets || {} };
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
  return { tampon: s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.tampon || {}, sachets: s.sachets || {} };
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
    const t = s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.tampon || {};
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
    const t = s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.tampon || {};
    const arah = document.getElementById("arah");
    return { g: Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0),
             ouvert: !!(arah && !arah.classList.contains("hide")) };
  });
  await page.screenshot({ path: path.join(OUT, "06-tap-evacuation.png") });
  ok("R1 · taper « Rentrer les barrettes » rentre vraiment des barrettes (appui de 120 ms)",
     apres.g < avant && !tapErr,
     tapErr ? `le tap a échoué : ${tapErr}` : `exposé ${avant} g → ${apres.g} g${apres.g === avant ? " (RIEN n'a bougé)" : ""}`);
}

// ── 2d. Le tiroir « Gérer » ne garde pas des compteurs d'avant les ventes ─
// L'audit a trouvé quatre affichages du tiroir figés à la derniere construction de
// l'écran, parce que `openDr` l'ouvre en PUR CSS. Le pire : les compteurs par format
// contredisaient le total « Exposé » affiché trois lignes plus bas — deux vérités dans
// le même panneau, au moment précis où on décide quoi recharger.
//
// On VEND POUR DE VRAI plutôt que de bricoler le localStorage : écrire le save puis
// recharger le fait écraser par `evaluateOnNewDocument`, qui rejoue à chaque navigation.
// (Piège documenté deux fois déjà dans ce dépôt — et retombé dedans une troisième.)
{
  /* État PROPRE avant de commencer. La section ARAH juste au-dessus laisse la chaleur à
     96 et une alerte en cours : la descente tombait au milieu de ce contrôle et vidait le
     tampon, si bien que le tiroir rouvert disait « 0 » — et le contrôle accusait le
     tiroir de mentir alors qu'il disait la vérité.

     Ça ne s'est vu que le jour où le préavis est passé de 12 s à 3 s (playtest du
     2026-07-28) : avant, la descente arrivait juste après la fin du bloc. Le contrôle ne
     tenait donc pas sur un état, il tenait sur un DÉLAI — et un délai qui dépend d'une
     constante d'équilibrage d'un autre système n'est pas une garantie, c'est un sursis. */
  await page.evaluateOnNewDocument(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    s.heat = 0;
    if (!s.shelter) s.shelter = {};
    if (!s.shelter.corners) { s.shelter.corners = {}; s.shelter.cornerId = "pdv"; }
    const c = (s.shelter.corners[s.shelter.cornerId || "pdv"] ||= {});
    c.tampon = { "2": 15 }; c.tamponQ = 61;
    c.queue = [{ cid: "momo", nm: "Momo", av: "🧢", kind: "regulier", rel: 30,
                 want: 2, g: 2, offer: 20, tx: "Momo arrive et parle.",
                 pat: 400, pat0: 400, mode: "offer", negoP: 20, dernier: null }];
    localStorage.setItem("loupe_save", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "load" }); await sleep(700);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
  await sleep(600);
  await page.evaluate(() => { const b = document.getElementById("cClose"); if (b) b.click(); });
  await sleep(300);
  const avant = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return String((s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.tampon || {})["2"] || 0);
  });
  // servir le client au premier plan : ça débite le tampon par le vrai chemin du jeu
  let vendu = false;
  for (let i = 0; i < 6 && !vendu; i++) {
    vendu = await page.evaluate(() => {
      const b = document.querySelector('#cActive [data-neg="accept"], #cActive [data-neg="hesitGen"], #cActive [data-neg="compSell"]');
      if (!b || b.disabled) return false; b.click(); return true;
    });
    if (!vendu) await sleep(700);
  }
  await sleep(500);
  const milieu = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return String((s.shelter?.corners?.[s.shelter?.cornerId||'pdv']?.tampon || {})["2"] || 0);
  });
  await page.evaluate(() => { const b = document.getElementById("cManage"); if (b) b.click(); });
  await sleep(500);
  const apres = await page.evaluate(() => {
    const row = document.querySelector('#pSac [data-sac="-1"][data-f="2"]');
    return { compteur: row ? row.parentElement.querySelector("b").textContent : "?",
             tot: (document.getElementById("pTamp") || {}).textContent || "" };
  });
  await page.screenshot({ path: path.join(OUT, "08-tiroir-frais.png") });
  const aBouge = milieu !== avant;
  ok("Le tiroir rouvert affiche l'état RÉEL, pas celui d'avant les ventes",
     aBouge && apres.compteur === milieu,
     aBouge ? `2 g : ${avant} → ${milieu} après vente · le tiroir rouvert dit « ${apres.compteur} » · ${apres.tot.slice(0, 30)}`
            : `AUCUNE VENTE n'a eu lieu (${avant} → ${milieu}) — le contrôle ne prouverait rien`);
}

// ── 4. « Annuler » annule vraiment la contre-proposition ──────────────────
// Trouvé par la chasse de nuit, reproduit par trois sceptiques indépendants (0/3 la
// réfutent). `cancel` remettait `cl.mode="offer"` en laissant `cl.propG` posé : la carte
// réaffichait l'offre d'origine pendant que la résolution exécutait sur propG. Taper
// « OK 46 » sortait 8 g pour le prix de 5.
//
// On TAPE la séquence dans le navigateur — on ne recopie pas la logique dans le test,
// sinon on ne teste que sa propre copie. On compare ce qui est ÉCRIT sur le bouton
// d'acceptation aux grammes réellement débités.
{
  // état propre : la section ARAH a poussé la chaleur à 96 et la descente a vidé la file.
  // On empile un 3e seed (il s'exécute après les deux autres) et on recharge.
  await page.evaluateOnNewDocument(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    s.heat = 0;
    /* Le seed tourne AVANT le chargement de la page : il lit ce que la session
       précédente a écrit, et rien ne garantit la forme. Sans ces gardes il jetait
       « Cannot read properties of undefined (reading 'pdv') » — une erreur de page
       causée par le TEST, qu'un contrôle « aucune erreur page » a fini par attraper. */
    if (!s.shelter) s.shelter = {};
    if (!s.shelter.corners) { s.shelter.corners = {}; s.shelter.cornerId = "pdv"; }
    const id = s.shelter.cornerId || "pdv";
    const c = (s.shelter.corners[id] = s.shelter.corners[id] || {});
    c.queue = [{ cid: "momo", nm: "Momo", av: "🧢", kind: "regulier", rel: 30,
                 want: 5, g: 5, offer: 46, tx: "Momo arrive et parle.",
                 pat: 400, pat0: 400, mode: "offer", negoP: 46, dernier: null }];
    localStorage.setItem("loupe_save", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "load" }); await sleep(800);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
  await sleep(700);
  const av = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const t = s.shelter.corners[s.shelter.cornerId || "pdv"].tampon || {};
    return Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0);
  });
  // contrer → bouger la quantité → annuler → accepter
  const seq = await page.evaluate(async () => {
    const tap = (sel) => { const b = document.querySelector(sel); if (!b || b.disabled) return false; b.click(); return true; };
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    if (!tap('#cActive [data-neg="counter"]')) return { ko: "pas de bouton contrer" };
    await w(250);
    if (!tap('#cActive [data-negq="1"]') && !tap('#cActive [data-negq="-1"]')) return { ko: "pas de stepper" };
    await w(250);
    if (!tap('#cActive [data-neg="cancel"]')) return { ko: "pas de bouton annuler" };
    await w(250);
    const btn = document.querySelector('#cActive [data-neg="accept"]');
    if (!btn) return { ko: "pas de bouton accepter après annulation" };
    // ce que la CARTE annonce : « [5 g → 46 · … ] ». C'est la promesse faite au joueur,
    // et c'est à ELLE qu'on compare le débit — pas au ledger, qui sort du même chemin de
    // code que le débit et passerait donc même si les deux étaient faux ensemble.
    const carte = (document.querySelector("#cActive .offer") || {}).textContent || "";
    const mg = carte.match(/(\d+)\s*g/);
    btn.click();
    return { label: btn.textContent, annonceCarte: mg ? +mg[1] : null, carte };
  });
  await sleep(500);
  const ap = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const c = s.shelter.corners[s.shelter.cornerId || "pdv"];
    const t = c.tampon || {};
    return { g: Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0), tampon: t,
             dernier: (c.ledger || [])[0] || null };
  });
  await page.screenshot({ path: path.join(OUT, "09-annuler.png") });
  const debite = av - ap.g;
  /* L'invariante juste est « jamais PLUS que ce que la carte annonce », pas « exactement ».
     Une vente partielle au prorata (tampon qui ne compose pas la quantité demandée) débite
     MOINS et facture moins — c'est prévu, la carte le dit (« ton tampon ne compose que
     N g »), et le joueur n'y perd rien. Le bug, lui, débitait PLUS : 8 g annoncés 5.
     Ma première version comparait à l'égalité et échouait sur le cas partiel légitime. */
  ok("R1 · après « Annuler », on ne débite jamais PLUS que ce que la carte annonce",
     !seq.ko && seq.annonceCarte != null && debite <= seq.annonceCarte,
     seq.ko ? seq.ko
            : `carte « ${seq.carte.trim()} » → annonce ${seq.annonceCarte} g · bouton « ${String(seq.label).trim()} » · RÉELLEMENT débité ${debite} g`);
}

// ── 5. Le menu annonce ce qui sera VRAIMENT encaissé ──────────────────────
// Il affichait `g × prix` brut, alors que toute vente passe par le rabais au volume.
// Mesuré à 10/g : 8 g annoncé 80, encaissé 68 — 15 % d'écart, jusqu'à 25 % à 20 g. Or
// c'est cette ligne que le joueur lit pour régler son tarif.
{
  const lu = await page.evaluate(() => {
    const el = document.getElementById("pMenuF");
    const chip = document.getElementById("pPrixG");
    return { menu: (el || {}).textContent || "", prix: (chip || {}).textContent || "" };
  });
  const p = +(lu.prix.match(/(\d+)/) || [, 0])[1];
  const paires = [...lu.menu.matchAll(/(\d+)g\s+(\d+)/g)].map((m) => [+m[1], +m[2]]);
  const brut = paires.filter(([g, v]) => v === g * p);
  ok("Le menu du tiroir annonce le tarif RÉELLEMENT encaissé (rabais volume compris)",
     p > 0 && paires.length >= 3 && brut.length < paires.length,
     `menu « ${lu.menu} » à ${p}/g — ${brut.length}/${paires.length} ligne(s) au tarif brut (8 g brut vaudrait ${8 * p})`);
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
