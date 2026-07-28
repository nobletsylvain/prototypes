// Les gestes survivent-ils à un VRAI appui ? — La Loupe
//
// Retour de playtest (2026-07-27) : « je cliquais sur récupérer les barrettes mais
// rien ne se passait », puis la descente a pris 440 d'exposé.
//
// Cause : un `click` n'est émis que si le pointeur se RELÈVE sur le MÊME nœud DOM que
// celui où il s'est POSÉ. Tout écran qui se reconstruit en cadence (`innerHTML` depuis
// une boucle de frame) détruit donc ses propres boutons entre l'appui et le
// relâchement. Un doigt met ~100 ms ; un clic synthétique de test, 0 ms — d'où des
// tests au vert sur des écrans morts.
//
// Ce fichier presse pour de vrai (`delay: 120`) chaque geste qui vit sous une cadence,
// et vérifie que l'ÉTAT a bougé. Il ne regarde jamais si le bouton « existe ».
//
//   cd tools && node tap-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-tap");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APPUI = 120;   // durée d'un vrai appui de pouce

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

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// ── BeuherShit : une tournée EN ROUTE fait tourner la boucle ───────────────
// C'est la condition qui déclenchait la cadence : tant qu'un coursier est dehors,
// `renderBeuher` était rappelé toutes les 350 ms. On seed donc UNE tournée active
// (pour la cadence) ET une tournée rentrée (pour avoir un bouton à presser).
await page.evaluateOnNewDocument((ver) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    dirty: 100, reput: 20, sachets: { "2": 20 }, sachetQ: 62,
    runs: [
      { id: "rEnRoute", courierId: "c1", courierNm: "Yaz", col: "#8fd0ff", g: 10, pay: 0,
        fee: 0, net: 80, busted: false, left: 40, total: 60, collected: false, orderIds: [] },
      { id: "rRentre", courierId: "c2", courierNm: "Lou", col: "#9be37d", g: 12, pay: 0,
        fee: 0, net: 150, busted: false, left: 0, total: 60, collected: false, orderIds: [] },
    ],
    shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true },
  }));
}, SAVE_VER);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);
await page.evaluate(() => { const b = document.querySelector('.tab[data-t="beuher"]'); if (b) b.click(); });
await sleep(600);

// la cadence tourne-t-elle vraiment ? sans ça le test ne prouverait rien
const cadence = await page.evaluate(async () => {
  const el = () => document.querySelector("[data-col]");
  const a = el();
  await new Promise((r) => setTimeout(r, 800));
  const b = el();
  return { present: !!a, memeNoeud: !!a && a === b,
    eta: (document.getElementById("bEta_rEnRoute") || {}).textContent || "-" };
});
ok("La tournée en route fait bien vivre l'écran (le compteur tourne)",
   cadence.present && cadence.eta !== "-", `bouton présent ${cadence.present} · ETA ${cadence.eta}`);
ok("Le bouton n'est PAS remplacé pendant qu'une tournée tourne (sinon le doigt tape dans le vide)",
   cadence.memeNoeud, cadence.memeNoeud ? "même nœud après 800 ms" : "NŒUD REMPLACÉ — le tap mourra");

// ── le geste lui-même, pressé comme un pouce ───────────────────────────────
{
  const avant = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return { dirty: s.dirty || 0, collecte: (s.runs || []).find((r) => r.id === "rRentre")?.collected };
  });
  let tapErr = "";
  try { await page.click('[data-col="rRentre"]', { delay: APPUI }); } catch (e) { tapErr = e.message; }
  await sleep(400);
  const apres = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return { dirty: s.dirty || 0, collecte: (s.runs || []).find((r) => r.id === "rRentre")?.collected };
  });
  await page.screenshot({ path: path.join(OUT, "01-beuher-tap.png") });
  ok(`R1 · « Compter le liquide » encaisse vraiment (appui de ${APPUI} ms, tournée en cours)`,
     !tapErr && apres.collecte === true && apres.dirty > avant.dirty,
     tapErr ? `le tap a échoué : ${tapErr}`
            : `liquide ${avant.dirty} → ${apres.dirty} · encaissé ${apres.collecte}`);
}

// ── Le revers du tap mort : le tap qui atterrit SUR QUELQU'UN D'AUTRE ─────
// Même racine que le reste du fichier — une carte reconstruite en place — mais la panne
// est inverse. Ici le nœud n'est pas détruit sous le doigt : il est REMPLACÉ entre deux
// appuis, par la carte du client suivant, aux mêmes pixels et avec les mêmes libellés.
// Le joueur a lu une carte, décidé, et son appui s'exécute sur une autre personne.
//
// Mesuré avant correctif — deux appuis au MÊME point (81,748), 230 ms d'écart, file de
// deux anonymes issus de `makeAnon` (offres en bande, état non fabriqué) :
//
//   1er appui : « ✅ OK 20 » (Le premier)   → vente 2 g / 20 €
//   2e appui  : même pixel, carte devenue « ✅ OK 47 » (Le suivant, jamais lu)
//   résultat  : DEUX ventes, ledger [Le suivant 4 g/38 €, Le premier 2 g/20 €]
//
// Correctif : `CARD_LOCK_MS` — la carte d'un client qu'on découvre n'accepte aucun appui
// tant qu'elle glisse (`cslide`, 260 ms), et un liseré la marque comme neuve.
//
// Les DEUX contrôles suivants comptent autant l'un que l'autre : le premier prouve que
// l'appui volé est bloqué, le second qu'on n'a pas simplement rendu la carte sourde —
// sinon on aurait remplacé ce bug par celui que tout ce fichier traque.
{
  const LOCK = +(SRC.match(/CARD_LOCK_MS\s*=\s*(\d+)/) || [, 320])[1];
  const cli = (nm, g, offer) => ({ cid: null, nm, av: "🧢", kind: "anon", rel: 0, g, offer,
    tx: nm + " passe.", pat: 400, pat0: 400, mode: "offer", negoP: offer, dernier: null, qFac: 1 });
  await page.evaluateOnNewDocument((q) => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    s.dirty = 0; s.reput = 40; s.day = 3; s.sachets = { 2: 60 }; s.sachetQ = 70;
    s.shelter = { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
      corners: { pdv: { res: 90, bac: 0, prix: 10, chouffes: 0, tampon: { 2: 60 }, tamponQ: 70,
        queue: q, ledger: [], qacc: 0, serveAcc: 0, seq: 5, combo: 1, charbonneur: null } } };
    localStorage.setItem("loupe_save", JSON.stringify(s));
  }, [cli("Le premier", 2, 20), cli("Le suivant", 5, 47), cli("Le troisième", 2, 20)]);
  await page.reload({ waitUntil: "load" });
  await sleep(700);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
  await sleep(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
  await sleep(700);

  const carte = () => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const P = (s.shelter && s.shelter.corners && s.shelter.corners.pdv) || {};
    const nm = document.querySelector(".nego-nm"), b = document.querySelector('[data-neg="accept"]');
    const r = b ? b.getBoundingClientRect() : null;
    return { qui: nm ? nm.textContent : "(personne)", bouton: b ? b.textContent.trim() : "(absent)",
             x: r ? Math.round(r.x + r.width / 2) : 0, y: r ? Math.round(r.y + r.height / 2) : 0,
             file: (P.queue || []).length, ventes: (P.ledger || []).length };
  });

  const t0 = await carte();
  await page.mouse.click(t0.x, t0.y, { delay: 90 });      // 1er appui : décidé, légitime
  await sleep(140);                                        // moins que CARD_LOCK_MS
  const t1 = await carte();
  await page.mouse.click(t0.x, t0.y, { delay: 90 });      // 2e appui : au même pixel
  await sleep(400);
  const t2 = await carte();
  await page.screenshot({ path: path.join(OUT, "02-carte-neuve.png") });

  ok("La carte change bien de client au même endroit — sinon le contrôle ne prouve rien",
     t1.qui !== t0.qui && t1.ventes === 1,
     `« ${t0.qui} / ${t0.bouton} » → « ${t1.qui} / ${t1.bouton} » au même pixel (${t0.x},${t0.y})`);

  ok(`R4 · un appui décidé sur une carte ne s'exécute pas sur le client suivant (verrou ${LOCK} ms)`,
     t2.ventes === 1 && t2.file === t1.file,
     t2.ventes === 1 ? `1 vente, « ${t1.qui} » toujours en file` : `${t2.ventes} ventes — le 2e appui a servi « ${t1.qui} »`);

  // …et le verrou se relâche : sans ça on aurait juste fabriqué un tap mort
  await sleep(LOCK);
  const avant = await carte();
  let tapErr = "";
  try { await page.click('[data-neg="accept"]', { delay: APPUI }); } catch (e) { tapErr = e.message; }
  await sleep(400);
  const apres = await carte();
  ok(`R1 · passé le verrou, l'appui sur la carte neuve marche normalement (appui de ${APPUI} ms)`,
     !tapErr && apres.ventes > avant.ventes,
     tapErr ? `le tap a échoué : ${tapErr}` : `« ${avant.qui} » servi · ventes ${avant.ventes} → ${apres.ventes}`);
}

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── les gestes survivent à un appui · La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
