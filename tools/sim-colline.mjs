// Banc d'essai d'equilibrage de "La Colline Creuse".
//
// Charge le proto en headless avec ?debug (qui expose window.CC), puis joue
// N minutes de simulation avec une strategie scriptee, sans rien afficher.
// Sert a repondre a : est-ce que l'economie tient ? est-ce que le soupcon
// monte trop vite / jamais ? est-ce qu'une strategie domine les autres ?
//
//   cd tools && node sim-colline.mjs                 # les 3 strategies, 15 min
//   cd tools && node sim-colline.mjs prudent 25      # une seule, 25 min
//
// Strategies :
//   naif     - creuse toujours au plus pres de la surface, ne sort jamais
//   prudent  - creuse au plus profond possible, coupe pendant les survols
//   pillard  - reste en surface et vit des operations exterieures
//   equilibre- joue "bien" : puits+serre, ateliers, sorties regulieres, facade

import { fileURLToPath } from "url";
import path from "path";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PAGE = "file://" + path.join(ROOT, "colline-creuse/index.html") + "?debug";

const argStrat = process.argv[2];
const MINUTES = Number(process.argv[3] || process.argv[2]) || 15;
const STRATS = ["naif", "prudent", "pillard", "equilibre"].filter(
  (s) => !argStrat || Number.isFinite(Number(argStrat)) || s === argStrat);
if (!STRATS.length) { console.error("strategie inconnue:", argStrat); process.exit(1); }

const browser = await puppeteer.launch({
  headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

for (const strat of STRATS) {
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.setRequestInterception(true);
  page.on("request", (r) => (r.url().startsWith("file://") ? r.continue() : r.abort()));
  await page.goto(PAGE, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 400));

  const out = await page.evaluate(async (strat, minutes) => {
    const CC = window.CC;
    CC.repondreCarte();                      // ferme la carte d'intro
    CC.reset();                              // partie neuve, deterministe
    const S = CC.etat();
    S.speed = 0;                             // la boucle rAF ne doit pas jouer en double

    const PRIO = ["puits", "serre", "dortoir", "atelier", "ventil", "reserve", "commune", "geo", "ecoute", "pc"];

    // Ce qu'un joueur attentif construirait ensuite, dans l'ordre du besoin reel.
    const besoin = () => {
      const be = CC.bilanEnergie(), ba = CC.bilanAir();
      const a = (k) => S.rooms.some((r) => r.key === k && !r.chantier);
      if (be.taux < 0.92) return S.depth >= 4 && S.res.matos > 120 ? "geo" : "groupe";
      if (ba.taux < 1.0) return "ventil";
      if (CC.prodNette("eau") < 0.5) return "puits";
      if (CC.prodNette("vivres") < 0.5) return a("puits") ? "serre" : "puits";
      if (S.depth >= 4 && S.res.matos > 110 && !a("geo")) return "geo";
      if (CC.placesLits() < S.colons.length + 2) return "dortoir";
      if (!a("atelier")) return "atelier";
      const moral = S.colons.reduce((x, c) => x + c.moral, 0) / (S.colons.length || 1);
      if (moral < 62 && !a("commune")) return "commune";
      if (!a("reserve")) return "reserve";
      if (!a("ecoute")) return "ecoute";
      return "dortoir";
    };

    const libre = () => {
      const pris = new Set(S.rooms.map((r) => r.lvl + ":" + r.side));
      const slots = [];
      for (let l = 0; l < CC.MAX_LVL; l++) for (const s of [0, 1]) {
        if (!pris.has(l + ":" + s) && l <= S.depth) slots.push([l, s]);
      }
      return slots;
    };

    const poser = (key, slots) => {
      const d = CC.ROOMS[key];
      if (!d) return false;
      if (d.unique && S.rooms.some((r) => r.key === key)) return false;
      if (d.need && !S.rooms.some((r) => r.key === d.need && !r.chantier)) return false;
      for (const [l, sd] of slots) {
        if (d.minLvl && l < d.minLvl) continue;
        if (S.res.matos >= d.cout + CC.BAL.coutNiveau(l)) { CC.creuser(l, sd, key); return true; }
      }
      return false;
    };

    const construire = () => {
      const slots = libre();
      if (!slots.length) return;
      // "equilibre" vise le niveau 1-2 : assez profond pour etouffer, pas ruineux
      if (strat === "equilibre") slots.sort((a, b) => Math.abs(a[0] - 2) - Math.abs(b[0] - 2));
      else slots.sort((a, b) => (strat === "prudent" ? b[0] - a[0] : a[0] - b[0]));
      if (strat === "equilibre" || strat === "prudent") {
        const k = besoin();
        if (poser(k, slots)) return;
        if (k === "serre" && poser("puits", slots)) return;
        return;   // un joueur attentif MET DE COTE pour son besoin, il ne depense pas ailleurs
      }
      for (const key of PRIO) if (poser(key, slots)) return;
    };

    // Un joueur attentif re-repartit ses gens : on vide et on remplit les postes
    // par ordre d'importance, en mettant chacun dans son metier quand c'est possible.
    const affecterTous = () => {
      const ordre = ["groupe", "geo", "puits", "ventil", "serre", "sas", "atelier", "ecoute", "pc"];
      const postes = [];
      for (const r of S.rooms) {
        const d = CC.ROOMS[r.key];
        if (!d.postes || r.chantier) continue;
        for (let i = 0; i < d.postes; i++) postes.push(r);
      }
      postes.sort((x, y) => ordre.indexOf(x.key) - ordre.indexOf(y.key));
      const libres = S.colons.filter((c) => !c.dehors);
      for (const c of libres) c.room = null;
      for (const r of postes) {
        if (!libres.length) break;
        libres.sort((x, y) => {
          const tx = CC.TALENTS[x.talent].salles.includes(r.key) ? 0 : 1;
          const ty = CC.TALENTS[y.talent].salles.includes(r.key) ? 0 : 1;
          return tx - ty || y.moral - x.moral;
        });
        const c = libres.shift();
        c.room = r.id;
      }
    };

    const log = [];
    const DT = 0.25;
    let tMin = 0;
    for (let t = 0; t < minutes * 60; t += DT) {
      CC.step(DT);
      if (S.gameover) { log.push({ min: +(t / 60).toFixed(1), fin: S.gameover }); break; }

      if (CC.modaleOuverte()) CC.repondreCarte();

      // reflexe survol : le prudent coupe, les autres non
      if (S.alerte && strat === "prudent" && S.silence <= 0) CC.basculerSilence(20);

      if (Math.floor(t) % 2 === 0 && Math.abs(t - Math.floor(t)) < DT / 2) {
        affecterTous();
        // entretien : on rallume et on repare ce qui traine
        for (const r of S.rooms) {
          if (!r.reg) r.reg = 2;
          if (r.panne && S.res.matos >= 20) { S.res.matos -= 14; r.panne = false; }
        }
        if (strat !== "pillard") construire();
        else if (S.res.matos > 90) construire();
        if (strat === "equilibre" && S.alerte && S.silence <= 0) CC.basculerSilence(20);

        // operations
        if (!S.ops.length && S.colons.length > 2) {
          if (strat === "pillard") {
            if (S.res.vivres < 40) CC.lancerOp("vivres");
            else if (S.res.matos < 90) CC.lancerOp("ferraille");
            else if (S.colons.length < CC.placesLits()) CC.lancerOp("recrue");
          } else if (strat === "equilibre") {
            if (S.soupcon > 45) CC.lancerOp("brouiller");
            else if (S.res.matos < 45) CC.lancerOp("ferraille");
            else if (S.res.vivres < 15) CC.lancerOp("vivres");
            else if (S.colons.length < Math.min(11, CC.placesLits())) CC.lancerOp("recrue");
          } else if (strat === "prudent") {
            if (S.soupcon > 55) CC.lancerOp("brouiller");
            else if (S.res.matos < 30) CC.lancerOp("ferraille");
            else if (S.colons.length < Math.min(12, CC.placesLits())) CC.lancerOp("recrue");
          }
        }
        // facade
        if (strat !== "naif") {
          const f = S.facade;
          if (f === "aucune" && S.res.matos > 45) CC.poserFacade("rucher");
          else if (f === "rucher" && S.res.matos > 110) CC.poserFacade("scierie");
          else if (f === "scierie" && S.res.matos > 190) CC.poserFacade("fouilles");
        }
      }

      if (t / 60 >= tMin) {
        const be = CC.bilanEnergie(), ba = CC.bilanAir();
        log.push({
          min: tMin,
          colons: S.colons.length, salles: S.rooms.length, prof: S.depth,
          matos: Math.round(S.res.matos), vivres: Math.round(S.res.vivres),
          eau: Math.round(S.res.eau), cash: Math.round(S.res.cash),
          soupcon: Math.round(S.soupcon), sig: +CC.signature().toFixed(1),
          tol: CC.tolerance(),
          en: Math.round(be.prod) + "/" + Math.round(be.dem),
          air: Math.round(ba.prod) + "/" + Math.round(ba.dem),
          moral: Math.round(S.colons.reduce((a, c) => a + c.moral, 0) / (S.colons.length || 1)),
        });
        tMin++;
      }
    }
    const salles = {};
    for (const r of S.rooms) salles[CC.ROOMS[r.key].nom] = (salles[CC.ROOMS[r.key].nom] || 0) + 1;
    return { log, fin: S.gameover, victoire: S.victoire, jour: S.jour, salles, facade: S.facade,
             autonomieT: Math.round(S.autonomieT) };
  }, strat, MINUTES);

  console.log("\n================ STRATEGIE : " + strat.toUpperCase() + " ================");
  console.log("min | col sal prof | matos vivres eau cash | soupcon sig/tol | energie   air     | moral");
  for (const l of out.log) {
    if (l.fin) { console.log("  >>> FIN DE PARTIE (" + l.fin + ") a la minute " + l.min); continue; }
    console.log(
      String(l.min).padStart(3) + " | " +
      String(l.colons).padStart(3) + " " + String(l.salles).padStart(3) + " " + String(l.prof).padStart(4) + " | " +
      String(l.matos).padStart(5) + " " + String(l.vivres).padStart(6) + " " + String(l.eau).padStart(3) + " " +
      String(l.cash).padStart(4) + " | " +
      String(l.soupcon).padStart(7) + " " + (l.sig + "/" + l.tol).padStart(7) + " | " +
      l.en.padStart(9) + " " + l.air.padStart(7) + " | " + String(l.moral).padStart(5));
  }
  console.log("fin:", out.fin || "—", "· victoire:", out.victoire, "· jour", out.jour,
              "· facade:", out.facade, "· autonomie tenue:", out.autonomieT + "s");
  console.log("salles:", Object.entries(out.salles).map(([k, v]) => k + (v > 1 ? " x" + v : "")).join(", "));
  if (errs.length) console.log("ERREURS JS:", errs.slice(0, 5).join(" | "));
  await page.close();
}

await browser.close();
