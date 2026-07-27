// Les bulles de BD du corner, vérifiées dans un vrai navigateur.
//
// Idée de Sylvain (2026-07-27) : « on pourrait voir des bulles apparaître dans la
// scène corner, avec des retours haptiques ». La voix des clients EXISTAIT déjà —
// elle partait dans un toast en haut de l'écran, loin de la personne qui parle.
//
// Ce que ce test prouve :
//   1. un client qui arrive parle : une bulle sort de SA silhouette ;
//   2. une seule bulle par personne (sinon la scène devient illisible en file pleine) ;
//   3. la bulle se retire toute seule ;
//   4. « ARAH !! » part de la rue AVANT que l'écran d'évacuation prenne la main —
//      sinon le joueur subit une modale sans voir d'où vient l'alerte.
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
    sachets: { "2": 40 }, sachetQ: 62, dirty: 200, reput: 20,
    shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true,
      pdv: { res: 70, bac: 120, prix: 10, chouffes: 1, tampon: { "2": 20 }, tamponQ: 62,
        queue: q, ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1 } },
  }));
}, SAVE_VER, [mk("momo", "Momo", "🧢", 5, 48), mk("bilal", "Bilal", "🎒", 8, 76)]);

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

// ── 1. le client qui arrive parle, depuis SA silhouette ────────────────────
await sleep(900);   // la bulle d'arrivée est différée de ~340 ms
const arrivee = await page.evaluate(() => {
  const persos = [...document.querySelectorAll(".cperso")];
  return persos.map((p) => ({
    nm: (p.querySelector(".clbl") || {}).textContent || "?",
    bulle: !!p.querySelector(".cbulle"),
    txt: (p.querySelector(".cbulle") || {}).textContent || "",
  }));
});
await page.screenshot({ path: path.join(OUT, "01-arrivee.png") });
ok("Un client qui arrive parle depuis sa propre silhouette",
   arrivee.length > 0 && arrivee.some((a) => a.bulle),
   arrivee.map((a) => `${a.nm}${a.bulle ? " 💬" : " —"}`).join(" · ") || "aucune silhouette");

// ── 2. une seule bulle par personne ────────────────────────────────────────
const multi = await page.evaluate(() =>
  [...document.querySelectorAll(".cperso")].map((p) => p.querySelectorAll(".cbulle").length));
ok("Une seule bulle par personne (la scène reste lisible en file pleine)",
   multi.every((n) => n <= 1), `bulles par silhouette : ${multi.join(", ") || "—"}`);

// ── 3. la bulle se retire toute seule ─────────────────────────────────────
await sleep(3600);
const apres = await page.evaluate(() => document.querySelectorAll(".cperso .cbulle").length);
ok("La bulle se retire toute seule", apres === 0, `${apres} bulle(s) encore là après 4,5 s`);

// ── 4. « ARAH !! » précède l'écran d'évacuation ────────────────────────────
// on pousse la chaleur au seuil : avec 1 chouffe il y a du préavis, donc un cri
// `evaluateOnNewDocument` rejoue à CHAQUE navigation : écrire la chaleur puis
// recharger la faisait écraser par le seed d'origine. On empile un second seed,
// qui s'exécute après le premier et le complète.
await page.evaluateOnNewDocument(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  s.heat = 96;                       // au-delà du seuil : l'ARA part au premier tick
  localStorage.setItem("loupe_save", JSON.stringify(s));
});
await page.reload({ waitUntil: "load" }); await sleep(600);
await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
await sleep(300);
await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
await sleep(700);   // le cri dure ~1,4 s et le sas ~0,9 s : on regarde pendant

const cri = await page.evaluate(() => {
  const b = document.querySelector(".cbulle.cri");  // désormais au niveau de la SCÈNE, pas d'un client
  const ara = document.getElementById("ara");
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { cri: !!b, txt: b ? b.textContent : "", araVisible: !!(ara && !ara.classList.contains("hide")),
    _diag: { heat: s.heat, scene: !!document.getElementById("cPersos"), araExiste: !!ara,
      persos: document.querySelectorAll(".cperso").length } };
});
console.log("  diag:", JSON.stringify(cri._diag));
await page.screenshot({ path: path.join(OUT, "02-cri.png") });
// on cherche le CRI ou, s'il a déjà expiré, l'écran d'évacuation qui a pris la suite
// Le cri appartient à la scène : il doit partir même quand la rue est vide (c'est le
// chouffe qui hurle, pas un client). L'accrocher à P.queue[0] le rendait muet dans le
// cas le plus fréquent — défaut trouvé par ce test, pas par relecture.
ok("« ARAH !! » est crié dans la rue, au niveau de la scène",
   cri.cri && /ARAH/.test(cri.txt), `cri « ${cri.txt} » · écran ARA ${cri.araVisible ? "ouvert" : "fermé"}`);

await sleep(1200);
const araApres = await page.evaluate(() => {
  const ara = document.getElementById("ara");
  return { visible: !!(ara && !ara.classList.contains("hide")), boutons: document.querySelectorAll("#ara .ara-c").length };
});
await page.screenshot({ path: path.join(OUT, "03-ara.png") });
ok("L'écran d'évacuation s'ouvre après le cri, avec ses deux gestes",
   araApres.visible && araApres.boutons === 2, `visible ${araApres.visible} · ${araApres.boutons} bouton(s)`);

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── bulles & ARA · La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
