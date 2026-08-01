// Captures d'El Patrón sur états PRÉPARÉS.
//
// `shots-patron.mjs` joue la partie en temps réel : c'est le test de fumée, mais
// il faut plusieurs minutes pour arriver à un empire développé, et on ne choisit
// pas l'état qu'on photographie. Ici on construit l'état voulu en `node` (la sim
// est pure, donc on peut la faire tourner sans navigateur), on l'injecte dans
// `localStorage`, et on capture immédiatement l'écran exact qu'on voulait.
//
//   cd tools && node scene-patron.mjs

import { createServer } from "http";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";
import * as G from "../el-patron/sim.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "shots", "el-patron-scenes");
mkdirSync(OUT, { recursive: true });

const MIME = { ".html":"text/html", ".mjs":"text/javascript", ".js":"text/javascript", ".css":"text/css" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/favicon.ico") { res.writeHead(204); return res.end(); }
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = "http://127.0.0.1:" + server.address().port;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DT = G.TICK_MS * G.JOUR_PAR_MS;

/* ── Le joueur de référence, le même que dans les invariants ────────────── */
function joueur(S) {
  const pate = S.fincas.reduce((a, f) => a + G.fincaRendement(f), 0);
  const labo = S.labos.reduce((a, l) => a + G.laboCapacite(l), 0);
  const poudre = Math.min(pate, labo) / G.PURETES.standard.ratio;
  const ruta = S.rutas.reduce((a, r) => a + (r.active && !r.bloquee ? G.MODES[r.mode].debit : 0), 0);
  if (S.chaleur > 42 && G.acheterPoliticien(S)) return;
  if (G.volumeExpose(S) > 0.05 && G.acheterCache(S)) return;
  if (ruta < poudre * 1.25) {
    const p = ["pista", "frontera", "puerto"][S.rutas.length % 3];
    for (const m of ["camion", "lancha", "tunel", "contenedor"]) if (G.acheterRuta(S, m, p)) return;
  }
  if (G.capaciteBlanchiment(S) < poudre * 9000) {
    for (const t of ["lavadero", "restaurant", "cambio", "obra", "cripto", "futbol"]) if (G.acheterFront(S, t)) return;
  }
  if (labo < pate) { if (G.acheterLabo(S)) return; for (const l of S.labos) if (G.ameliorerLabo(S, l.id)) return; }
  if (G.acheterFinca(S, "selva") || G.acheterFinca(S, "valle")) return;
  for (const l of S.labos) if (G.ameliorerLabo(S, l.id)) return;
  for (const f of S.fincas) if (G.ameliorerFinca(S, f.id)) return;
}

function resoudre(S, pref) {
  let n = 0;
  while (S.evenements.length && n++ < 40) {
    const e = S.evenements[0];
    const opt = e.options.find((o) => o.cle === pref(e) && (!o.cout || G.peutPayer(S, o.devise, o.cout)))
      || e.options.find((o) => !o.cout);
    if (G.resoudre(S, 0, opt.cle) === null) S.evenements.shift();
  }
}

/** Joue jusqu'à `jours`, en s'arrêtant net si `stop(S)` devient vrai. */
function partie(jours, { stop, pref = () => "mordida", jouer = true } = {}) {
  const S = G.nouvelEtat(20260801);
  for (let i = 0; i < Math.round(jours / DT); i++) {
    G.tick(S, DT);
    if (stop && stop(S)) return S;
    resoudre(S, pref);
    if (jouer) joueur(S);
  }
  return S;
}

/* ── Les scènes qu'on veut montrer ─────────────────────────────────────── */
const SCENES = [
  { nom: "01-empire", onglet: "carte", legende: "L'empire en régime : 6 fincas, 4 labos, 5 rutas",
    etat: () => partie(200) },
  { nom: "02-pourquoi", onglet: "carte", why: true, legende: "« Pourquoi je perds de l'argent »",
    etat: () => partie(200) },
  { nom: "03-controle", onglet: "carte", legende: "Le contrôle : payer, forcer, ou fermer la ruta",
    // On s'arrête PILE quand le barrage tombe, pour photographier la décision.
    etat: () => partie(200, { stop: (S) => S.evenements.some((e) => e.type === "controle") }) },
  { nom: "04-lessive", onglet: "lessive", legende: "La lessive : plafond absolu, réserve d'exploitation",
    etat: () => partie(200) },
  { nom: "05-registre", onglet: "registre", legende: "Le registre : une ligne par cause, par jour",
    etat: () => partie(200) },
  { nom: "06-reseau", onglet: "reseau", legende: "Le réseau : juges, fincas, labos, rutas",
    etat: () => partie(200) },
  { nom: "07-chaud", onglet: "carte", legende: "Task Force : le corridor paie +38 %, l'extradition est à 92",
    etat: () => {
      const S = partie(200);
      // On pousse la chaleur au palier qui rapporte le plus — juste avant la falaise.
      S.politiciens = 0; S.chaleur = 84; S.chaleurCible = 84; S.pression = 62;
      for (let i = 0; i < 40; i++) G.tick(S, DT);
      return S;
    } },
  { nom: "08-deborde", onglet: "carte", legende: "La planque déborde : le liquide dort dehors et chauffe",
    etat: () => {
      const S = partie(200);
      S.liquide = (G.cacheCapacite(S) + 1.4) / G.M3_PAR_EURO;   // 1,4 m³ à ciel ouvert
      S.reserveJours = G.RESERVE_JOURS_MAX;
      for (let i = 0; i < 30; i++) G.tick(S, DT);
      return S;
    } },
];

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const errs = [];
for (const sc of SCENES) {
  const S = sc.etat();
  const page = await browser.newPage();
  page.on("pageerror", (e) => errs.push(sc.nom + " : " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(sc.nom + " : " + m.text()); });
  await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });

  // On injecte l'état AVANT que la page ne s'exécute.
  const brut = JSON.stringify(S, (k, v) => (k === "_flux" ? undefined : v));
  await page.evaluateOnNewDocument((save, ver) => {
    localStorage.setItem("patron_save", save);
    localStorage.setItem("patron_ver", ver);
    localStorage.setItem("patron_vu", "1");
  }, brut, String(G.SAVE_VERSION));

  await page.goto(base + "/el-patron/", { waitUntil: "networkidle0" });
  await sleep(500);
  await page.evaluate(() => document.querySelector('.vb[data-v="0"]').click());   // pause : image nette
  if (sc.onglet !== "carte") await page.evaluate((t) => document.querySelector(`.tab[data-t="${t}"]`).click(), sc.onglet);
  if (sc.why) await page.evaluate(() => document.querySelector("#segNet").click());
  await sleep(700);

  await page.screenshot({ path: path.join(OUT, sc.nom + ".png") });
  console.log(`  → ${sc.nom}.png — ${sc.legende}`);
  console.log(`     J${S.jour.toFixed(0)} · propre ${G.fmtEuro(S.totaux.propreCumule)} · chaleur ${S.chaleur.toFixed(0)} (${G.palier(S.chaleur).nom})` +
              ` · ${S.fincas.length}F/${S.labos.length}L/${S.rutas.length}R/${S.fronts.length}Fr`);
  await page.close();
}
await browser.close();
server.close();

if (errs.length) { console.log("\n❌ " + [...new Set(errs)].join("\n   ")); process.exit(1); }
console.log("\n✅ scènes dans tools/shots/el-patron-scenes/");
