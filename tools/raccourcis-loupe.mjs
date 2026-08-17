// Les raccourcis : le trajet ne doit pas coûter plus que la décision.
//
// Retour de playtest (Sylvain, 2026-07-28) : « la navigation entre le corner et la
// nourrice puis revenir sur le corner est assez laborieuse, et donc faudrait penser à
// mettre plus en évidence les menus clés. Peut-être même les mettre en favoris dans la
// barre du bas ? »
//
// Mesuré sur le code d'avant, l'aller-retour complet coûtait CINQ appuis :
//
//   ↩ (quitter le corner) · pin nourrice · dépôt · pin corner · « Tenir le corner »
//
// Un seul portait une décision — le dépôt. Les quatre autres étaient du déplacement.
// Et `pdvTick` sort immédiatement quand le corner n'est pas tenu : partir chez elle ne
// coûte ni client, ni vente, ni chaleur. Ce n'était donc pas un arbitrage déguisé en
// trajet, c'était de la corvée sèche — précisément ce que R6 dit de ne pas laisser sur
// la main du joueur.
//
// Deux raccourcis, et ils portent tous les deux leur propre justification :
//   — le FAVORI du dock ramène au corner depuis n'importe où, et affiche le bac ;
//   — la PUCE LIQUIDE du corner affiche ce qu'on a sur soi (avec la marque 🔥 quand ça
//     chauffe) et mène chez la nourrice, fiche ouverte.
//
// Le LIEU reste : c'est chez elle que la pension est annoncée avant d'être prélevée, et
// supprimer la visite supprimerait l'annonce. C'est le chemin qui raccourcit, pas la
// décision qui disparaît.
//
// Ce que ce fichier garde : les deux raccourcis existent, sont tapables AU DOIGT (appui
// réel aux coordonnées, pas un `.click()` synthétique qui traverse les recouvrements),
// et l'aller-retour tient en TROIS appuis dont celui du milieu est le dépôt.
//
//   cd tools && node raccourcis-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const SOFT = +(SRC.match(/DIRTY_HOLD_SOFT\s*=\s*(\d+)/) || [, 180])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-raccourcis");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const errors = [];
const page = await browser.newPage();
const VP = { width: 412, height: 892 };
await page.setViewport({ ...VP, deviceScaleFactor: 2 });
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// un joueur avec du liquide qui chauffe et un bac au corner : les deux raccourcis ont
// quelque chose à dire. `evaluateOnNewDocument` REJOUE à chaque navigation — une seule ici.
const LIQUIDE = SOFT + 400;
await page.evaluateOnNewDocument((ver, dirty) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    day: 5, cash: 0, dirty, reput: 45, heat: 20, karimBuys: 3,
    sachets: { 2: 40 }, sachetQ: 70, pains: [],
    shelter: { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
      corners: { pdv: { res: 90, bac: 340, prix: 10, chouffes: 1, tampon: { 2: 20 }, tamponQ: 70,
        queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1, charbonneur: null } } },
  }));
}, SAVE_VER, LIQUIDE);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);

/** Appui RÉEL au centre de l'élément. Un `.click()` synthétique traverse les
    recouvrements et les débordements : il dirait « tapable » d'un bouton hors écran.
    C'est exactement le piège qui a laissé passer un ARAH incliquable au doigt.

    On demande au NAVIGATEUR ce qu'il y a sous ce point (`elementFromPoint`) au lieu de
    comparer des coordonnées au viewport. Première version de ce helper : elle ne testait
    que « dans les 412×892 » — et elle a répondu « tapable » d'un bouton de dépôt à y=855
    couvert par le dock, dont le sommet est à 812. Le test disait ✓ et rien ne bougeait.
    Un contrôle de tapabilité qui ne consulte pas le recouvrement ne teste rien. */
const taper = async (sel) => {
  const r = await page.evaluate((s) => {
    const e = document.querySelector(s); if (!e) return { raison: "absent" };
    const b = e.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return { raison: "invisible" };
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { raison: "hors écran" };
    const top = document.elementFromPoint(x, y);
    if (!top || !(top === e || e.contains(top) || top.contains(e))) {
      return { raison: "recouvert par " + (top ? top.tagName.toLowerCase() + "." + String(top.className).split(" ")[0] : "rien") };
    }
    return { x, y };
  }, sel);
  if (r.raison) return r.raison;
  await page.mouse.click(r.x, r.y, { delay: 40 });
  await sleep(260);
  return true;
};
const ecran = () => page.evaluate(() => ({
  corner: !!document.getElementById("cScene"),
  carte: !!document.querySelector('[data-pin="nourrice"]'),
  texte: ((document.getElementById("stage") || {}).textContent || "").replace(/\s+/g, " "),
}));
const etat = () => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { dirty: Math.round(s.dirty || 0),
           garde: Math.round(((s.shelter || {}).nourrice || {}).garde || 0) };
});

// ── 1 · le favori existe et ramène au corner depuis un autre onglet ───────
await page.evaluate(() => document.querySelector('[data-t="atelier"]').click());
await sleep(400);
const favVu = await page.evaluate(() => {
  const b = document.querySelector('[data-fav="pdv"]');
  return b ? b.textContent.replace(/\s+/g, " ").trim() : "";
});
ok("Le dock porte un favori vers le corner", !!favVu, favVu || "(absent)");
ok("Le favori affiche le bac — la raison d'y retourner est lisible depuis la barre",
   /€\s*3?40/.test(favVu.replace(/\s/g, "")) || /€340/.test(favVu.replace(/\s/g, "")),
   favVu);

const tapFav = await taper('[data-fav="pdv"]');
const e1 = await ecran();
ok("Un appui sur le favori ouvre le corner depuis n'importe quel écran",
   tapFav === true && e1.corner,
   tapFav === true ? (e1.corner ? "Atelier → corner" : "l'écran n'a pas changé")
                   : "hors de portée du doigt : " + tapFav);

await page.screenshot({ path: path.join(OUT, "01-corner-avec-puce.png") });

// ── 2 · la barre du corner ne déborde pas ────────────────────────────────
const debord = await page.evaluate(() => {
  const t = document.querySelector(".ctop"); if (!t) return null;
  const chips = [...t.children].map((c) => { const r = c.getBoundingClientRect(); return r.right; });
  return { max: Math.max(...chips), largeur: window.innerWidth, n: t.children.length };
});
ok("Aucune puce de la barre du corner ne sort de l'écran",
   debord && debord.max <= debord.largeur + 1,
   debord ? `${debord.n} éléments, bord droit max ${Math.round(debord.max)}px / ${debord.largeur}px` : "(barre absente)");

// ── 3 · la puce liquide dit ce qu'on a sur soi, et que ça chauffe ────────
const puce = await page.evaluate(() => {
  const e = document.getElementById("cLiqChip");
  return e ? e.textContent.replace(/\s+/g, " ").trim() : "";
});
ok("Le corner affiche le liquide qu'on a sur soi", new RegExp(String(LIQUIDE)).test(puce), puce || "(absente)");
ok("Elle marque 🔥 au-dessus du seuil où le liquide chauffe le quartier",
   /🔥/.test(puce), `${puce} · seuil ${SOFT}`);

// ── 4 · l'aller-retour tient en TROIS appuis, dont un seul est la décision ─
const av = await etat();
const appuis = [];
appuis.push(["puce liquide", await taper("#cLiqChip")]);
const e2 = await ecran();
ok("La puce liquide mène chez la nourrice, fiche ouverte",
   e2.carte && /Tata Yamina/.test(e2.texte),
   e2.carte ? (/Tata Yamina/.test(e2.texte) ? "carte + fiche ouverte" : "carte, mais fiche fermée") : "pas la carte");

await page.screenshot({ path: path.join(OUT, "02-fiche-nourrice.png") });

appuis.push(["dépôt", await taper('[data-nour-dep="tout"]')]);
appuis.push(["favori corner", await taper('[data-fav="pdv"]')]);
const e3 = await ecran();
const ap = await etat();

ok("Aller-retour corner → nourrice → corner : trois appuis, aucun défilement",
   appuis.every(([, fait]) => fait === true) && e3.corner,
   appuis.map(([nm, f]) => (f === true ? "✓ " + nm : "✗ " + nm + " (" + f + ")")).join(" · ")
   + (e3.corner ? " → de retour au corner" : " → pas revenu"));
ok("Et l'appui du milieu est bien la décision : le liquide est passé chez elle",
   ap.garde > 0 && ap.dirty < av.dirty,
   `sur toi ${av.dirty} → ${ap.dirty} · chez elle ${av.garde} → ${ap.garde}`);

// ── 5 · le magot se voit sur la carte, sans ouvrir la fiche ──────────────
await page.evaluate(() => document.querySelector('[data-t="shelter"]').click());
await sleep(400);
const badge = await page.evaluate(() => {
  const b = document.getElementById("pinGarde");
  if (!b) return { vu: false };
  const st = getComputedStyle(b);
  return { vu: st.display !== "none" && st.visibility !== "hidden", txt: b.textContent.trim() };
});
ok("Le magot est visible sur la carte sans ouvrir la fiche de la nourrice",
   badge.vu && /\d/.test(badge.txt || ""),
   badge.vu ? badge.txt : "(pas de badge sur le pin)");

await page.screenshot({ path: path.join(OUT, "03-carte-magot.png") });

// ── rapport ─────────────────────────────────────────────────────────────
await browser.close();
server.close();

console.log("\n─── Raccourcis · le trajet ne doit pas coûter plus que la décision ───\n");
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? `  (${r.detail})` : ""}`);
}
for (const e of errors) console.log(`  FAIL  ${e}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} OK${errors.length ? ` · ${errors.length} erreur(s) page` : ""}.`);
console.log(`captures → ${path.relative(ROOT, OUT)}`);
if (passed < results.length || errors.length) process.exit(1);
