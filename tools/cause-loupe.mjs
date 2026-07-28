// « Chaque ligne a une cause. L'UI n'invente rien. » — la promesse du Karnet, vérifiée.
//
// Le principe du projet est qu'une conséquence subie par le joueur doit être NOMMÉE :
// il doit pouvoir relier ce qu'il voit à ce qu'il a fait. Une jauge qui bouge sans
// explication, c'est très exactement l'anti-exemple fondateur (The Boss Gangster).
//
// Ce que ce test attrape : le liquide qui dort chauffait le quartier de +20/min
// au-dessus de 180 et +40/min au-dessus de 450, sans cause au Karnet, sans marque au
// HUD, sans seuil affiché nulle part. Sylvain a joué des soirées à « liquide 567 » —
// donc au palier haut — en voyant sa chaleur grimper sans le moindre indice.
//
//   cd tools && node cause-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";
import { CORNER_PERSONAS } from "../la-loupe/corner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const SOFT = +(SRC.match(/DIRTY_HOLD_SOFT\s*=\s*(\d+)/) || [, 180])[1];
const HARD = +(SRC.match(/DIRTY_HOLD_HARD\s*=\s*(\d+)/) || [, 450])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-cause");
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

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// on démarre SOUS le seuil : c'est le franchissement qui doit parler
await page.evaluateOnNewDocument((ver, sous) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    dirty: sous, reput: 20, heat: 0, sachets: { "2": 20 }, sachetQ: 60,
    shelter: { phase: "B", introSeen: true, paidOff: true,
      pdv: { res: 90, bac: 0, prix: 10, chouffes: 0, tampon: { "2": 40 }, tamponQ: 60, queue: [], ledger: [], seq: 0, combo: 1 } },
  }));
}, SAVE_VER, SOFT - 40);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(800);

const sous = await page.evaluate(() => {
  const d = document.getElementById("hudDirty");
  return { txt: d.textContent, classes: d.className };
});
ok("Sous le seuil, la pastille liquide reste neutre",
   !/🔥/.test(sous.txt) && !/warm|hot/.test(sous.classes), `« ${sous.txt} » · ${sous.classes}`);

// on franchit le palier DUR — c'est l'état qu'a joué Sylvain (liquide 567)
// `evaluateOnNewDocument` REJOUE à chaque navigation : écrire le save puis recharger le
// ferait écraser par le seed d'origine. On EMPILE un second seed, qui s'exécute après.
// (Même piège que dans bulles-loupe.mjs — il coûte une demi-heure à chaque fois.)
await page.evaluateOnNewDocument((dur) => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  s.dirty = dur + 120;
  localStorage.setItem("loupe_save", JSON.stringify(s));
}, HARD);
await page.reload({ waitUntil: "load" });
await sleep(1400);   // > 1 tick de dérive (3 s d'accumulation démarrent au chargement)

const dur = await page.evaluate(() => {
  const d = document.getElementById("hudDirty");
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  return { txt: d.textContent, classes: d.className, titre: d.title,
           journal: (s.journal || []).map((j) => j.txt + " · " + j.cause) };
});
await page.screenshot({ path: path.join(OUT, "01-liquide-chaud.png") });

ok("Au-dessus du palier, le HUD marque que ce liquide COÛTE",
   /🔥/.test(dur.txt) && /hot|warm/.test(dur.classes),
   `« ${dur.txt} » · ${dur.classes || "(sans classe)"}`);

ok("Le seuil est expliqué au survol, il ne reste pas un chiffre magique",
   /chauffe/.test(dur.titre || ""), dur.titre || "(aucune explication)");

const ligne = dur.journal.find((j) => /liquide dort/i.test(j));
ok("Le Karnet NOMME la cause (promesse : « chaque ligne a une cause »)",
   !!ligne, ligne || `aucune ligne — journal : ${dur.journal.slice(0, 3).join(" | ") || "vide"}`);

ok("La cause dit quoi FAIRE, pas seulement ce qui se passe",
   !!ligne && /réinvestis/i.test(ligne), ligne ? "elle oriente vers le réinvestissement" : "—");

// ── Le HUD ne ment pas sur la chaleur pendant qu'on tient le corner ───────
// `hud()` n'est appelée que sur événement discret (navigation, vente, fin de journée).
// Au corner, la chaleur monte en CONTINU, sans événement : mesuré, le HUD affichait
// « chaleur 0 » pendant que la chip du corner disait « 🔥 31 ». Deux nombres
// contradictoires à l'écran, sur la jauge qui décide de la descente — et celui du haut
// est le seul visible depuis les autres écrans.
//
// Note de méthode : deux sceptiques de l'audit avaient RÉFUTÉ cette trouvaille en
// raisonnant sur les appelants de hud(). La mesure leur a donné tort. D'où ce test :
// on compare ce que le joueur LIT, pas ce que le code a l'air de faire.
{
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
  await sleep(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
  await sleep(900);
  const t0 = await page.evaluate(() => Math.round(JSON.parse(localStorage.getItem("loupe_save") || "{}").heat || 0));
  await sleep(4000);   // la chaleur grimpe pendant qu'on ne touche à rien
  const lu = await page.evaluate(() => {
    const g = (id) => ((document.getElementById(id) || {}).textContent || "");
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const n = (t) => { const m = t.match(/(\d+)/); return m ? +m[1] : NaN; };
    return { hud: n(g("hudHeat")), chip: n(g("cHeatChip")), reel: Math.round(s.heat || 0), brut: g("hudHeat") };
  });
  await page.screenshot({ path: path.join(OUT, "02-hud-chaleur.png") });
  const aMonte = lu.reel > t0 + 1;
  ok("Le HUD suit la chaleur pendant qu'on tient le corner (deux nombres, une vérité)",
     aMonte && Math.abs(lu.hud - lu.chip) <= 2,
     aMonte ? `HUD ${lu.hud} · chip ${lu.chip} · réel ${lu.reel} (partie de ${t0})`
            : `la chaleur n'a pas monté (${t0} → ${lu.reel}) — le contrôle ne prouverait rien`);
}

// ── La barre du jour progresse, sur n'importe quel écran ──────────────────
// Même racine que la chaleur : `hud()` n'est appelée que sur événement discret, alors
// que la journée avance toujours. Mesuré : la barre restait à 0 % pendant que la
// journée était à 9 %. Une barre de progression qui ne progresse pas.
// Ce contrôle tourne sur le QUARTIER, pas au corner : la correction doit être globale,
// pas propre à l'écran de vente.
{
  await page.evaluate(() => { const b = document.querySelector('.tab[data-t="shelter"]'); if (b) b.click(); });
  await sleep(400);
  const t0 = await page.evaluate(() => {
    const dp = document.getElementById("daypill");
    return +(((dp || {}).style || {}).background || "").match(/(\d+)%/)?.[1] || 0;
  });
  await sleep(6000);
  const fin = await page.evaluate(() => {
    const dp = document.getElementById("daypill");
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return { barre: +((((dp || {}).style || {}).background || "").match(/(\d+)%/)?.[1] || 0),
             reel: Math.round((s.dayAcc || 0) / 180 * 100) };
  });
  ok("La barre du jour avance sans qu'on navigue (elle est une horloge, pas une photo)",
     fin.barre > t0 && Math.abs(fin.barre - fin.reel) <= 3,
     `barre ${t0}% → ${fin.barre}% · avancement réel ${fin.reel}%`);
}

// ── « aucun malus » veut dire aucun malus ────────────────────────────────
// Refuser un profil louche qui s'avère être un vrai client affiche : « C'était un vrai
// client… vente perdue (aucun malus). » Le même geste remettait le combo à 1 — la chaîne
// de prix justes de la soirée, multiplicateur de pourboire jusqu'à ×3, affichée en
// permanence dans la chip ⚡×N. Mesuré avant correctif, dans la MÊME frame :
//
//   avant le geste : chip ⚡×3     après : chip ⚡×1     message : « (aucun malus) »
//
// Contre-épreuve faite en repassant ce contrôle sur l'index.html d'avant correctif : il
// échoue (⚡×3 → ⚡×1). Elle ne peut pas vivre dans le fichier — `cornerFlair` est une
// fonction de module, on ne peut pas lui réinjecter son ancienne version depuis la page.
//
// Le contrôle est volontairement GÉNÉRAL : il ne teste pas « le combo », il teste que
// rien de ce que le joueur voit ne se dégrade pendant qu'on lui promet le contraire.
// Trois indices convergents disaient que le reset était un lapsus : le cas frère (recaler
// un client normal) porte le même libellé et ne touche à rien ; la branche d'à côté
// (flairer un vrai flic) préserve le combo ; le commentaire annonce « juste une vente perdue ».
{
  const pigeon = { kind: "louche", mode: "louche", nm: "L'envoyé de Momo", av: "👤",
    tx: "Il te salue par ton blaze.", tell: "Poli et surpaie, MAIS cite un contact que tu connais.",
    cop: false, g: 20, offer: 260, pat: 400, pat0: 400 };
  // rappel : `evaluateOnNewDocument` REJOUE à chaque navigation — on EMPILE, on n'écrase pas.
  await page.evaluateOnNewDocument((pig) => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    s.day = 3; s.dirty = 40; s.reput = 40; s.heat = 10;
    // le premier seed écrit la forme d'AVANT les corners pluriels (`shelter.pdv`) : la
    // migration la réapplique PAR-DESSUS `corners.pdv` et écraserait ce seed-ci en silence.
    delete s.shelter.pdv;
    s.shelter.corners = { pdv: { res: 90, bac: 0, prix: 10, chouffes: 0, tampon: { 2: 40, 5: 20 },
      tamponQ: 70, queue: [pig], ledger: [], qacc: 0, serveAcc: 0, seq: 5, combo: 3, charbonneur: null } };
    s.shelter.cornerId = "pdv";
    localStorage.setItem("loupe_save", JSON.stringify(s));
  }, pigeon);
  await page.reload({ waitUntil: "load" });
  await sleep(700);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
  await sleep(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
  await sleep(800);

  const lire = () => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const P = (s.shelter && s.shelter.corners && s.shelter.corners.pdv) || {};
    return { chip: ((document.getElementById("cComboChip") || {}).textContent || "").trim(),
             combo: P.combo, reput: s.reput, res: P.res, carte: !!document.querySelector('[data-neg="loucheNo"]') };
  });
  const avant = await lire();
  ok("Le pigeon est bien là, combo plein — sinon le contrôle ne prouverait rien",
     avant.carte && avant.combo === 3, `chip ${avant.chip} · carte ${avant.carte}`);

  await page.evaluate(() => { const b = document.querySelector('[data-neg="loucheNo"]'); if (b) b.click(); });
  await sleep(500);
  const apres = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const P = (s.shelter && s.shelter.corners && s.shelter.corners.pdv) || {};
    return { chip: ((document.getElementById("cComboChip") || {}).textContent || "").trim(),
             combo: P.combo, reput: s.reput, res: P.res,
             toast: [...document.querySelectorAll(".toast, #toast, .tw")].map((t) => t.textContent).join(" ") };
  });
  await page.screenshot({ path: path.join(OUT, "03-aucun-malus.png") });

  const promet = /aucun malus/i.test(apres.toast);
  const degrade = [];
  if (apres.combo < avant.combo) degrade.push(`combo ${avant.chip} → ${apres.chip}`);
  if (apres.reput < avant.reput) degrade.push(`standing ${avant.reput} → ${apres.reput}`);
  if (apres.res < avant.res) degrade.push(`réservoir ${avant.res} → ${apres.res}`);

  ok("R1 · quand l'écran promet « aucun malus », rien ne se dégrade en coulisse",
     promet && degrade.length === 0,
     promet ? (degrade.length ? `PROMESSE TENUE ? non : ${degrade.join(" · ")}` : `chip ${apres.chip} conservée · « ${apres.toast.trim()} »`)
            : `le message attendu n'est pas apparu : « ${apres.toast.trim()} »`);
}

// ── Négocier tranquillement ne coûte pas le multiplicateur ───────────────
// Même faute que ci-dessus, l'autre moitié. Le gel de patience (`waiting`) ne protège que
// le client de TÊTE ; le fond de file continue de fondre à QUEUE_MELT pendant qu'on
// négocie. Une expiration N'IMPORTE OÙ dans la file remettait le combo à 1 — sous le
// commentaire qui condamne précisément ça (« punir la LENTEUR DE LA MAIN, exactement ce
// que R1 interdit »), et dont l'audit précédent n'avait retiré que la ponction de `res`.
//
// Mesuré avant correctif — file de 4, tête en « nego », on ne touche à rien 5 s :
//   combo 2,5 → 1, pendant que le client EN FACE garde pat 22 (il n'a rien raté),
//   et sans un mot à l'écran.
//
// Contre-épreuve faite en repassant ce contrôle sur l'index.html d'avant correctif : il
// échoue (⚡×2.5 → ⚡×1).
{
  const tete = { cid: null, nm: "Un gars", av: "🧢", kind: "anon", rel: 0, g: 5, offer: 55,
    tx: "Il te fait signe.", pat: 22, pat0: 22, mode: "nego", negoP: 55, dernier: null, qFac: 1 };
  const fond = (i) => ({ cid: null, nm: "Passant " + i, av: "🧍", kind: "anon", rel: 0, g: 2, offer: 20,
    tx: "Il attend.", pat: 2, pat0: 22, mode: "offer", negoP: 20, dernier: null, qFac: 1 });
  await page.evaluateOnNewDocument((q) => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    delete s.shelter.pdv;   // cf. plus haut : la migration réappliquerait l'ancienne forme
    s.shelter.corners = { pdv: { res: 90, bac: 0, prix: 10, chouffes: 0, tampon: { 2: 40, 5: 20 },
      tamponQ: 70, queue: q, ledger: [], qacc: 0, serveAcc: 0, seq: 5, combo: 2.5, charbonneur: null } };
    s.shelter.cornerId = "pdv";
    localStorage.setItem("loupe_save", JSON.stringify(s));
  }, [tete, fond(1), fond(2), fond(3)]);
  await page.reload({ waitUntil: "load" });
  await sleep(700);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
  await sleep(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
  await sleep(600);

  const etat = () => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    const P = (s.shelter && s.shelter.corners && s.shelter.corners.pdv) || {};
    const act = (P.queue || [])[0] || {};
    return { chip: ((document.getElementById("cComboChip") || {}).textContent || "").trim(),
             combo: P.combo, file: (P.queue || []).length, mode: act.mode, pat: Math.round(act.pat || 0) };
  });
  const t0 = await etat();
  await sleep(5000);            // on NÉGOCIE : on ne touche à rien, la file s'impatiente
  const t1 = await etat();
  await page.screenshot({ path: path.join(OUT, "04-file-combo.png") });

  ok("La file se vide bien pendant la négo — sinon le contrôle ne prouverait rien",
     t0.file > t1.file && t0.combo === 2.5,
     `file ${t0.file} → ${t1.file} · chip de départ ${t0.chip}`);

  ok("R1 · le client en face reste gelé pendant qu'on négocie avec lui",
     t1.mode === "nego" && t1.pat === t0.pat,
     `« ${t1.mode} » · patience ${t0.pat} → ${t1.pat}`);

  ok("R1 · prendre le temps de négocier ne coûte pas le multiplicateur",
     t1.combo === t0.combo,
     t1.combo === t0.combo ? `chip ${t1.chip} conservée alors que ${t0.file - t1.file} client(s) se sont lassés`
                           : `chip ${t0.chip} → ${t1.chip} — la lenteur de la main est amendée`);
}

// ── Un bouton ne promet jamais un grammage que la sacoche ne compose pas ──
// Les deux boutons de l'hésitant servaient des grammages FIXES (son habituel, ou 2 g),
// jamais confrontés à la sacoche. Mesuré avant correctif — sacoche de 24 g en barrettes
// de 8, Sofia demande son 5 g habituel :
//
//   bouton offert : « 💬 Son 5 g habituel »
//   tap           → « Rupture — charge ta sacoche (Gérer). » · réservoir 90 → 88,8
//
// Perte sèche sur un bouton offert par le jeu, stock plein en main — et un message faux :
// la sacoche EST chargée, c'est le format qui ne compose pas 5 g. Contre-épreuve faite en
// repassant ces contrôles sur l'index.html d'avant correctif : les deux premiers échouent
// (0 g servi, réservoir ponctionné, libellé « Son 5 g habituel »). Le troisième passait
// déjà — mais seulement parce que RIEN n'était vendu : il ne prouve rien tout seul, c'est
// le premier qui le rend significatif.
//
// Le second cas (sacoche qui compose PILE son habituel) est là pour que le correctif ne
// se contente pas d'arrondir tout le monde : quand on peut lui donner son grammage, le
// bouton doit le dire et la réplique « C'est EXACTEMENT ça » doit rester méritée.
{
  const sofia = (usual) => ({ cid: "sofia", nm: "Sofia", av: "💅", kind: "hesitant", rel: 20,
    tx: "Elle hésite sur le pas de la porte.", g: usual, usual, offer: 0, negoP: 0,
    pat: 400, pat0: 400, mode: "hesit", dernier: null, qFac: 1 });

  const scene = async (tampon, cl) => {
    await page.evaluateOnNewDocument((t, c) => {
      const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
      delete s.shelter.pdv;
      s.shelter.corners = { pdv: { res: 90, bac: 0, prix: 10, chouffes: 0, tampon: t, tamponQ: 70,
        queue: [c], ledger: [], qacc: 0, serveAcc: 0, seq: 5, combo: 2, charbonneur: null } };
      s.shelter.cornerId = "pdv";
      localStorage.setItem("loupe_save", JSON.stringify(s));
    }, tampon, cl);
    await page.reload({ waitUntil: "load" });
    await sleep(700);
    await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
    await sleep(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
    await sleep(700);
    const av = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
      const P = (s.shelter && s.shelter.corners && s.shelter.corners.pdv) || {};
      const b = document.querySelector('[data-neg="hesitPerso"]');
      return { res: P.res, dirty: s.dirty, gTampon: Object.entries(P.tampon || {}).reduce((a, [f, n]) => a + +f * n, 0),
               libelle: b ? b.textContent.trim() : "(bouton absent)" };
    });
    await page.evaluate(() => { const b = document.querySelector('[data-neg="hesitPerso"]'); if (b) b.click(); });
    await sleep(500);
    const ap = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
      const P = (s.shelter && s.shelter.corners && s.shelter.corners.pdv) || {};
      return { res: P.res, dirty: s.dirty, gTampon: Object.entries(P.tampon || {}).reduce((a, [f, n]) => a + +f * n, 0),
               toast: [...document.querySelectorAll(".toast, #toast, .tw")].map((t) => t.textContent).join(" ").trim() };
    });
    return { av, ap, servis: av.gTampon - ap.gTampon };
  };

  // (a) le format ne compose PAS son habituel — 24 g en barrettes de 8, elle veut 5
  const biais = await scene({ 8: 3 }, sofia(5));
  await page.screenshot({ path: path.join(OUT, "05-hesit-format.png") });
  ok("R1 · avec du stock en main, le bouton de l'hésitant ne part jamais en rupture",
     biais.servis > 0 && biais.ap.res >= biais.av.res && biais.ap.dirty > biais.av.dirty,
     `« ${biais.av.libelle} » → ${biais.servis} g servis · réservoir ${biais.av.res} → ${biais.ap.res} · « ${biais.ap.toast} »`);
  ok("Le bouton ANNONCE le grammage que la sacoche compose vraiment",
     new RegExp(`\\b${biais.servis} g\\b`).test(biais.av.libelle) && !/\b5 g\b/.test(biais.av.libelle),
     `libellé « ${biais.av.libelle} » pour ${biais.servis} g réellement servis`);
  ok("Servir à côté de son habituel ne se fait pas passer pour une lecture parfaite",
     !/EXACTEMENT/i.test(biais.ap.toast),
     `réplique : « ${biais.ap.toast} »`);

  // (b) le format compose PILE son habituel — le correctif ne doit rien arrondir ici
  const pile = await scene({ 5: 4 }, sofia(5));
  ok("Quand la sacoche compose son habituel, c'est son habituel qu'on lui sert",
     pile.servis === 5 && /Son 5 g habituel/.test(pile.av.libelle),
     `« ${pile.av.libelle} » → ${pile.servis} g servis`);
  ok("…et la réplique « C'est EXACTEMENT ça » reste méritée",
     /EXACTEMENT/i.test(pile.ap.toast),
     `réplique : « ${pile.ap.toast} »`);
}

// ── Le quartier reconnaît les têtes qu'il a déjà vues ────────────────────
// Arbitrage de Sylvain : les anonymes ont des têtes récurrentes. Les invariants
// (`invariants-loupe.mjs`) prouvent que la réserve tourne, reste déterministe et ne
// reconnaît personne avant la 2e rencontre. Ici on vérifie l'autre moitié : ce que le
// joueur LIT sur la carte — parce que dans ce dépôt, une trouvaille sur l'affichage se
// MESURE, elle ne se raisonne pas.
//
// On pose le client en file au lieu d'attendre qu'il arrive : le tirage du spawn n'est pas
// le sujet, et l'attendre rendait le contrôle dépendant de qui passe (il est tombé deux
// fois pour cette raison). Ce qu'on veut savoir tient en une question — la carte affiche-
// t-elle ce que la fiche du visage contient, et rien de plus ?
{
  const passant = (vid) => ({ cid: null, vid, nm: "Naïma", av: "🕶️", kind: "anon", rel: 0,
    g: 2, offer: 20, tx: "Elle te fait signe.", tell: "", pat: 600, pat0: 600,
    mode: "offer", negoP: 20, dernier: null, qFac: 1 });

  const carte = async (fiches, cl) => {
    await page.evaluateOnNewDocument((f, c) => {
      const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
      delete s.shelter.pdv;
      s.visages = f; s.day = 6; s.reput = 40; s.sachets = { 2: 60 }; s.sachetQ = 70;
      s.shelter.corners = { pdv: { res: 100, bac: 0, prix: 10, chouffes: 0, tampon: { 2: 60 },
        tamponQ: 70, queue: [c], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1, charbonneur: null } };
      s.shelter.cornerId = "pdv";
      localStorage.setItem("loupe_save", JSON.stringify(s));
    }, fiches, cl);
    await page.reload({ waitUntil: "load" });
    await sleep(700);
    await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
    await sleep(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
    await sleep(700);
    return page.evaluate(() => {
      const h = document.getElementById("cActive");
      return { nm: ((document.querySelector(".nego-nm") || {}).textContent || ""),
               txt: ((h && h.textContent) || "").replace(/\s+/g, " ") };
    });
  };

  // (a) une tête inconnue : le jeu ne doit PAS feindre de s'en souvenir
  const inconnu = await carte({}, passant(13));
  ok("Une tête jamais croisée n'affiche AUCUNE reconnaissance",
     inconnu.nm === "Naïma" && !/Déjà vu/.test(inconnu.txt),
     `« ${inconnu.nm} » · ligne « Déjà vu » absente ${!/Déjà vu/.test(inconnu.txt)}`);

  // (b) la MÊME tête, avec un passé : reconnue, avec son habitude et ses mains vides
  const connu = await carte({ 13: { vu: 4, dernier: 5, g: { 8: 3, 2: 1 }, bredouille: 2 } }, passant(13));
  await page.screenshot({ path: path.join(OUT, "06-visage-connu.png") });
  ok("La même tête, déjà croisée, est RECONNUE sur sa carte",
     /Déjà vu 4/.test(connu.txt),
     /Déjà vu/.test(connu.txt) ? (connu.txt.match(/Déjà vu[^A-Z]{0,60}/) || [""])[0] : "aucune reconnaissance");

  ok("…et elle dit son habitude et ses retours bredouilles, pas juste un compteur",
     /8 g d'habitude/.test(connu.txt) && /bredouille 2/.test(connu.txt),
     `habitude ${/8 g d'habitude/.test(connu.txt)} · bredouille ${/bredouille 2/.test(connu.txt)}`);
}

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── causes nommées · La Loupe ───");
console.log(`  (seuils lus dans le code : doux ${SOFT} · dur ${HARD})`);
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
