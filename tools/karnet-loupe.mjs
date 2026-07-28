// Le socle du Karnet : les chiffres existent, et ils BOUCLENT.
//
// Le Karnet doit devenir un pont entre deux soirées — « voilà pourquoi hier a rapporté
// 310 de moins qu'avant-hier », poste par poste. Un pont dont la somme ne tombe pas juste
// est un mensonge : il donne au joueur l'impression de comprendre, et l'envoie décider sur
// un total faux. C'est pire que le journal actuel, qui n'explique rien mais ne ment pas.
//
// Ce fichier ne teste AUCUN écran. Il teste le socle, qui doit tenir avant qu'un pixel
// soit dessiné :
//   1. chaque euro encaissé au corner est compté quelque part ;
//   2. chaque euro perdu l'est aussi, et pour la BONNE raison (rupture ≠ impatience ≠ walk) ;
//   3. les euros perdus sont RÉELS, jamais reconstitués après coup ;
//   4. les dépenses sont ventilées par poste, pas jetées dans un « divers » ;
//   5. la clôture remet les compteurs à zéro sans emporter la paie du soir.
//
// Pourquoi compter à la source plutôt que relire le journal : `S.journal` est plafonné à
// 50 entrées et une soirée en dépasse. Des totaux tirés de là seraient faux dès que la
// soirée est chargée — et faux SILENCIEUSEMENT, ce qui est le pire cas.
//
//   cd tools && node karnet-loupe.mjs
import { readFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";
import { resolveOffer, cornerTol, cornerBudget, menuAt } from "../la-loupe/corner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8");
const SAVE_VER = (SRC.match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const PAY = +(SRC.match(/PDV_CHOUFFE_PAY\s*=\s*(\d+)/) || [, 60])[1];
const OUT = path.join(__dirname, "shots", "la-loupe-karnet");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

/* ── 1. Le plafond du walk est RÉEL, pas reconstitué ──────────────────────
   Sans `ceil`, expliquer un départ fâché imposerait de resimuler le client APRÈS coup —
   donc d'inventer un contrefactuel, et d'afficher « son plafond était 88 » sans que 88
   ait jamais décidé de quoi que ce soit. On vérifie ici que le nombre rendu est bien
   celui qui a servi au refus, et qu'il est cohérent : au-dessus, il part ; en dessous,
   il accepte. C'est le seul contrôle qui rende le futur écran honnête. */
{
  let cas = 0, incoherent = 0, exemple = "";
  for (const kind of ["regulier", "accro", "lowball", "hesitant", "grossiste"]) {
    for (const rel of [0, 30, 60, 100]) {
      for (const g of [2, 5, 8, 12]) {
        for (const menu of [8, 10, 13, 16]) {
          // un prix franchement au-dessus de sa tolérance → walk
          const cl = { kind, rel, g, qFac: 1 };
          const v = resolveOffer(cl, g, Math.round(g * menu * 4), false, false, 40, menu);
          if (v.outcome !== "walk") continue;
          cas++;
          if (!(v.ceil > 0) || v.asked == null) { incoherent++; continue; }
          // au plafond, il accepte ; un cran au-dessus, il part. Sinon le nombre ment.
          const dedans = resolveOffer(cl, g, v.ceil, false, true, 40, menu);
          const dehors = resolveOffer(cl, g, v.ceil + Math.max(2, Math.round(v.ceil * 0.15)), false, true, 40, menu);
          if (!dedans.accepted || dehors.accepted) {
            incoherent++;
            if (!exemple) exemple = `${kind} rel${rel} ${g} g menu ${menu} → plafond ${v.ceil} (accepté ${dedans.accepted}, au-dessus accepté ${dehors.accepted})`;
          }
        }
      }
    }
  }
  ok("R4 · le plafond rendu par un départ fâché est celui qui a VRAIMENT décidé du refus",
     cas > 0 && incoherent === 0,
     incoherent === 0 ? `${cas} départs balayés · le plafond passe son propre test dans les deux sens`
                      : `${incoherent}/${cas} incohérents — ex. ${exemple}`);

  // contre-épreuve : sans `ceil`, la seule façon d'obtenir ce nombre serait de le refaire
  // à la main hors du module — c'est-à-dire de dupliquer la règle et de la voir diverger.
  const v = resolveOffer({ kind: "regulier", rel: 30, g: 8, qFac: 1 }, 8, 400, false, false, 40, 13);
  const aLaMain = Math.max(1, Math.floor(Math.min(8 * cornerTol("regulier", 30, menuAt(13, 8)) * 1, cornerBudget("regulier", 30))));
  ok("Contre-épreuve · le plafond n'est pas une reconstitution : il tombe sur le calcul interne",
     v.ceil === aLaMain, `rendu ${v.ceil} · recalculé depuis les mêmes primitives ${aLaMain}`);
}

/* ── 2. Le socle en jeu réel : les compteurs bougent, et pour la bonne raison ──
   On joue trois issues distinctes au corner — une vente, une rupture (sacoche incapable
   de composer), un départ fâché — et on vérifie qu'elles atterrissent dans TROIS cases
   différentes. Les confondre reviendrait à dire au joueur « tu as perdu 380 » sans qu'il
   sache s'il doit couper un autre format, ravitailler plus, ou baisser son prix. */
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
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 2 });
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text(), u = (m.location && m.location().url) || "";
  if (/favicon/.test(t) || /favicon/.test(u) || /Failed to load resource/.test(t) || /3D indisponible/.test(t)) return;
  errors.push("console: " + t);
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// un client qui achète au menu, un qui demande un format incomposable, un hors de prix
const cli = (nm, g, offer, extra) => ({ cid: null, nm, av: "🧢", kind: "anon", rel: 0, g, offer,
  tx: nm + " passe.", pat: 600, pat0: 600, mode: "offer", negoP: offer, dernier: null, qFac: 1, ...(extra || {}) });
await page.evaluateOnNewDocument((ver, q) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    day: 4, cash: 0, dirty: 400, reput: 40, heat: 0, sachets: { 2: 40 }, sachetQ: 70,
    /* Une recette SnapShit NON NULLE, sinon « la photo garde le DM » passerait en gardant
       zéro — un contrôle qui ne peut pas échouer ne garde rien. C'est ce chiffre-là que
       `passerSoiree` efface dès sa première instruction. */
    dayTally: { sold: 3, brade: 0, volume: 0, cash: 275, soldG: 12, soldQSum: 840, spend: { pain: 0, upg: 0, chouffes: 0 } },
    shelter: { phase: "B", introSeen: true, paidOff: true, cornerId: "pdv",
      corners: { pdv: { res: 90, bac: 0, prix: 10, chouffes: 2, tampon: { 2: 40 }, tamponQ: 70,
        queue: q, ledger: [], qacc: 0, serveAcc: 0, seq: 5, combo: 1, charbonneur: null } } },
  }));
}, SAVE_VER, [cli("Le client", 2, 20), cli("Le format", 1, 10), cli("Le fâché", 2, 200)]);
await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(700);
await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin]")].find((x) => x.dataset.pin === "pdv"); if (b) b.click(); });
await sleep(300);
await page.evaluate(() => { const b = [...document.querySelectorAll("[data-pin-go]")].find((x) => x.dataset.pinGo === "pdv"); if (b) b.click(); });
await sleep(700);

const lire = () => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
  const P = (s.shelter && s.shelter.corners && s.shelter.corners.pdv) || {};
  return { soir: P.soir, dirty: s.dirty || 0, spend: (s.dayTally || {}).spend,
           journal: (s.journal || []).map((j) => ({ txt: j.txt, cause: j.cause, eur: j.eur, poste: j.poste, day: j.day })) };
});
const DIRTY0 = (await lire()).dirty;   // la soirée ne part pas de zéro : on mesure le DELTA
const LOCK = +(SRC.match(/CARD_LOCK_MS\s*=\s*(\d+)/) || [, 320])[1] + 90;

// (a) une vente qui passe
await page.evaluate(() => { const b = document.querySelector('[data-neg="accept"]'); if (b) b.click(); });
await sleep(LOCK);
const apVente = await lire();
ok("Une vente encaissée est comptée (euros, grammes, client servi)",
   apVente.soir && apVente.soir.eur > 0 && apVente.soir.g > 0 && apVente.soir.servis === 1,
   `eur ${apVente.soir.eur} · g ${apVente.soir.g} · servis ${apVente.soir.servis}`);

// (b) le format que la sacoche ne compose pas → rupture, avec l'euro réellement accepté
await page.evaluate(() => { const b = document.querySelector('[data-neg="accept"]'); if (b) b.click(); });
await sleep(LOCK);
const apRupture = await lire();
ok("Une rupture est comptée à part, avec l'euro qui avait été ACCEPTÉ",
   apRupture.soir.perdu.rupture === 1 && apRupture.soir.perdu.ruptureEur > 0 && apRupture.soir.servis === 1,
   `ruptures ${apRupture.soir.perdu.rupture} · ${apRupture.soir.perdu.ruptureEur} non encaissés · servis toujours ${apRupture.soir.servis}`);

/* (c) un départ fâché. On accepte une offre au-dessus de sa poche : `isClientOffer` court-
   circuite la branche « dernier prix » et tombe direct sur le walk (corner.mjs). C'est le
   chemin le plus court vers cette issue ; une contre-offre trop haute passe d'abord par un
   `counter` et demanderait deux tours — ce que le premier jet de ce test ignorait. */
await page.evaluate(() => { const b = document.querySelector('[data-neg="accept"]'); if (b) b.click(); });
await sleep(500);
const apWalk = await lire();
await page.screenshot({ path: path.join(OUT, "01-socle.png") });

ok("Un départ fâché est compté à part, avec le plafond réel du client",
   apWalk.soir.perdu.walk === 1 && apWalk.soir.perdu.walkEur > 0,
   `walks ${apWalk.soir.perdu.walk} · plafond ${apWalk.soir.perdu.walkEur}`);

ok("Les trois pertes ne se confondent pas (le joueur doit savoir QUOI corriger)",
   apWalk.soir.perdu.rupture === 1 && apWalk.soir.perdu.walk === 1 && apWalk.soir.perdu.impat === 0,
   `rupture ${apWalk.soir.perdu.rupture} · walk ${apWalk.soir.perdu.walk} · impatience ${apWalk.soir.perdu.impat}`);

ok("Chaque perte laisse une cause NOMMÉE et chiffrée au Karnet",
   apWalk.journal.some((j) => /fâché/i.test(j.txt) && j.poste === "walk" && j.eur < 0),
   (apWalk.journal.find((j) => j.poste === "walk") || {}).cause || "aucune ligne walk");

ok("Le journal date ses lignes (sans le jour, impossible de séparer deux soirées)",
   apWalk.journal.length > 0 && apWalk.journal.every((j) => j.day === 4),
   `${apWalk.journal.length} lignes · jours ${[...new Set(apWalk.journal.map((j) => j.day))].join(",")}`);

/* ── 3. Le pont boucle : encaissé = compté ────────────────────────────────
   L'invariant central. Le liquide gagné pendant la soirée doit égaler ce que les
   compteurs disent avoir encaissé. S'ils divergent, le bilan affichera un total que le
   joueur ne pourra retrouver nulle part — et c'est très exactement la promesse du
   Karnet qui casse : « chaque ligne a une cause ». */
ok("Le pont boucle : le liquide encaissé == ce que les compteurs disent (euros + pourboires)",
   Math.abs((apWalk.dirty - DIRTY0) - (apWalk.soir.eur + apWalk.soir.tips)) <= 1,
   `liquide +${apWalk.dirty - DIRTY0} · compteurs ${apWalk.soir.eur} + ${apWalk.soir.tips} pourboire`);

/* ── 4. Les dépenses sont ventilées, et la clôture ne les emporte pas ─────
   La paie des chouffes tombe DANS `advanceDay`, après le règlement des ardoises. Si les
   compteurs étaient remis à zéro avant elle, la dépense la plus régulière du jeu
   disparaîtrait du bilan chaque soir — sans que rien ne le signale. */
{
  await page.evaluate(() => { const b = document.getElementById("dbgBtn"); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[data-dbg]")].find((x) => /Passer la nuit/.test(x.dataset.dbg));
    if (b) b.click();
  });
  await sleep(700);
  const ap = await lire();
  await page.screenshot({ path: path.join(OUT, "02-cloture.png") });

  ok(`La paie des chouffes est ventilée dans son poste (2 × ${PAY})`,
     ap.spend && ap.spend.chouffes === 2 * PAY,
     `spend.chouffes ${ap.spend && ap.spend.chouffes} · attendu ${2 * PAY}`);

  ok("La clôture remet les compteurs de soirée à zéro",
     ap.soir.eur === 0 && ap.soir.servis === 0 && ap.soir.perdu.walk === 0,
     `eur ${ap.soir.eur} · servis ${ap.soir.servis} · walks ${ap.soir.perdu.walk}`);

  ok("…mais la paie du soir reste attribuée à la soirée qui vient de se clore",
     ap.journal.some((j) => j.poste === "chouffes" && j.day === 4),
     (ap.journal.find((j) => j.poste === "chouffes") || {}).cause || "aucune ligne chouffes");
}

/* ── 5. La photo de soirée capture les DEUX bouts ─────────────────────────
   Le Karnet ne montrera que les soirées closes (arbitrage Sylvain) : il faut donc figer
   chaque soirée au moment où elle se ferme. Les chiffres ne sont pas tous disponibles au
   même instant — la recette SnapShit meurt dès la PREMIÈRE instruction de la clôture
   (`passerSoiree` remet `dayTally` à zéro), tandis que la paie des chouffes tombe vers la
   FIN. Une capture unique, où qu'on la place, en perdrait forcément un.
   D'où deux temps, et ce contrôle : la photo doit porter les deux. */
{
  const av = await lire();
  const photo = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return (s.soirees || [])[0] || null;
  });
  ok("Une soirée close laisse une photo",
     !!photo, photo ? `jour ${photo.jour}` : "aucune photo dans S.soirees");

  ok("La photo garde la recette SnapShit (effacée dès la 1re instruction de la clôture)",
     photo && photo.dm === 275 && photo.dmVentes === 3,
     photo ? `dm ${photo.dm} (seedé 275) · ${photo.dmVentes} vente(s) DM (seedé 3)` : "—");
  const efface = await page.evaluate(() => ((JSON.parse(localStorage.getItem("loupe_save") || "{}").dayTally) || {}).cash);
  ok("Contre-épreuve · le jeu a bien EFFACÉ cette recette à la clôture (donc la photo l'a sauvée)",
     efface === 0, `dayTally.cash après clôture : ${efface} · dans la photo : ${photo && photo.dm}`);

  ok("…ET la paie des chouffes (prélevée vers la FIN de la clôture)",
     photo && photo.spend && photo.spend.chouffes === 2 * PAY,
     photo && photo.spend ? `spend.chouffes ${photo.spend.chouffes} · attendu ${2 * PAY}` : "—");

  ok("La photo fige les compteurs du corner AVANT leur remise à zéro",
     photo && photo.corners && photo.corners.pdv && photo.corners.pdv.soir
       && photo.corners.pdv.soir.perdu.walk === 1 && photo.corners.pdv.soir.eur > 0,
     photo && photo.corners && photo.corners.pdv
       ? `eur ${photo.corners.pdv.soir.eur} · walks ${photo.corners.pdv.soir.perdu.walk}`
       : "—");

  ok("Elle est datée du jour qui S'EST CLOS, pas du lendemain",
     photo && photo.jour === 4, `photo jour ${photo && photo.jour} · jour courant ${av.journal.length ? 5 : "?"}`);

  /* « passages » est un DELTA. Le seed part d'un compteur cumulé de 5 : si la photo
     rendait le cumul au lieu du delta, elle afficherait 5 passages pour une soirée qui
     n'en a vu aucun arriver. C'est exactement l'erreur qu'on veut interdire. */
  const seqFin = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("loupe_save") || "{}");
    return ((s.shelter && s.shelter.corners && s.shelter.corners.pdv) || {}).seq;
  });
  ok("« passages » est un DELTA, pas le compteur cumulé de la partie",
     photo && photo.corners.pdv.seq0 === 5 && photo.corners.pdv.passages === seqFin - 5,
     photo ? `seq ${photo.corners.pdv.seq0} → ${seqFin} · passages ${photo.corners.pdv.passages} (le cumul dirait ${seqFin})` : "—");
}

ok("Aucune erreur page", errors.length === 0, errors.join(" | ") || "aucune");

console.log("\n─── socle du Karnet · La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.  Captures : ${OUT}`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
