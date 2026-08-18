// Tests de non-regression de "La Colline Creuse" (headless, sans reseau).
//
//   cd tools && node test-colline.mjs
//
// 1. persistance : jouer, recharger, retrouver EXACTEMENT le meme etat
//    (c'est la garantie qui rend les mesures d'equilibrage attribuables).
// 2. autonomie : un etat de fin de partie construit a la main declenche bien
//    la victoire (la condition d'objectif n'est pas morte).
// 3. delestage : quand le courant manque, ce sont les salles de confort qui
//    tombent, jamais la pompe ni la ventilation.
// 4. tenue : colline entierement creusee et pleine, on ne rate pas d'image.

import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGE = "file://" + path.resolve(__dirname, "..", "colline-creuse/index.html") + "?debug";

const browser = await puppeteer.launch({
  headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.setRequestInterception(true);
page.on("request", (r) => (r.url().startsWith("file://") ? r.continue() : r.abort()));
await page.goto(PAGE, { waitUntil: "load" });

let echecs = 0;
const verdict = (nom, ok, detail) => {
  console.log((ok ? "  OK   " : "  RATE ") + nom + (detail ? " — " + detail : ""));
  if (!ok) echecs++;
};

// ---------------------------------------------------------------- 1. persistance
const resume = () => {
  const S = window.CC.etat();
  return {
    jour: S.jour, salles: S.rooms.length, matos: Math.round(S.res.matos),
    vivres: Math.round(S.res.vivres), soupcon: Math.round(S.soupcon),
    colons: S.colons.length, facade: S.facade,
    regs: S.rooms.map((x) => x.key + ":" + x.reg).sort().join(","),
  };
};

const avant = await page.evaluate((src) => {
  const CC = window.CC;
  CC.repondreCarte(); CC.reset();
  const S = CC.etat(); S.speed = 0;
  CC.creuser(1, 1, "puits");
  CC.creuser(2, 0, "atelier");
  for (let i = 0; i < 400; i++) { CC.step(0.25); if (CC.modaleOuverte()) CC.repondreCarte(); }
  const a = S.rooms.find((x) => x.key === "atelier"); if (a) a.reg = 1;
  window.dispatchEvent(new Event("pagehide"));       // meme chemin que quitter l'appli
  return new Function("return (" + src + ")()")();
}, resume.toString());

await page.reload({ waitUntil: "load" });
await new Promise((r) => setTimeout(r, 400));
const apres = await page.evaluate((src) => new Function("return (" + src + ")()")(), resume.toString());

verdict("persistance : recharger ne perd rien",
  JSON.stringify(avant) === JSON.stringify(apres),
  JSON.stringify(avant) === JSON.stringify(apres) ? "" : "\n         avant " + JSON.stringify(avant) + "\n         apres " + JSON.stringify(apres));

// ---------------------------------------------------------------- 2. autonomie
const vic = await page.evaluate(() => {
  const CC = window.CC, S = CC.etat();
  CC.reset();
  const S2 = CC.etat(); S2.speed = 0;
  // une colonie qui se suffit : energie, air, eau, vivres, et assez de monde
  S2.rooms = [
    { id: 1, key: "sas", lvl: 0, side: 0, reg: 2, chantier: 0 },
    { id: 2, key: "dortoir", lvl: 1, side: 0, reg: 2, chantier: 0 },
    { id: 3, key: "dortoir", lvl: 1, side: 1, reg: 2, chantier: 0 },
    { id: 4, key: "geo", lvl: 4, side: 0, reg: 2, chantier: 0 },
    { id: 5, key: "geo", lvl: 4, side: 1, reg: 2, chantier: 0 },
    { id: 6, key: "puits", lvl: 2, side: 0, reg: 2, chantier: 0 },
    { id: 7, key: "puits", lvl: 2, side: 1, reg: 2, chantier: 0 },
    { id: 8, key: "serre", lvl: 3, side: 0, reg: 2, chantier: 0 },
    { id: 9, key: "ventil", lvl: 3, side: 1, reg: 2, chantier: 0 },
    { id: 10, key: "ventil", lvl: 5, side: 0, reg: 2, chantier: 0 },
  ];
  S2.nextRoom = 11;
  S2.colons = [];
  // chacun a le metier de son poste : c'est l'etat de fin de partie vise
  const postes = [[4, "mecano"], [5, "mecano"], [6, "fouille"], [7, "fouille"],
                  [8, "cultiv"], [8, "cultiv"], [9, "mecano"], [10, "mecano"],
                  [1, "guet"], [null, "cuisto"]];
  for (let i = 0; i < 10; i++) {
    S2.colons.push({ id: i + 1, nom: "T" + i, talent: postes[i][1], room: postes[i][0], moral: 92, x: .5, dir: 1 });
  }
  S2.nextColon = 11;
  S2.res.eau = 50; S2.res.vivres = 50; S2.res.matos = 50;
  const bilan = { en: CC.bilanEnergie(), air: CC.bilanAir(),
                  eau: CC.prodNette("eau"), vivres: CC.prodNette("vivres") };
  for (let i = 0; i < 300 && !S2.victoire; i++) { CC.step(0.25); if (CC.modaleOuverte()) CC.repondreCarte(); }
  return { victoire: S2.victoire, bilan, tenue: Math.round(S2.autonomieT) };
});
verdict("objectif : une colonie autonome finit par gagner", vic.victoire,
  "energie " + Math.round(vic.bilan.en.prod) + "/" + Math.round(vic.bilan.en.dem) +
  " · air " + Math.round(vic.bilan.air.prod) + "/" + Math.round(vic.bilan.air.dem) +
  " · eau " + vic.bilan.eau.toFixed(1) + " · vivres " + vic.bilan.vivres.toFixed(1));

// ---------------------------------------------------------------- 3. delestage
const del = await page.evaluate(() => {
  const CC = window.CC;
  CC.reset();
  const S = CC.etat(); S.speed = 0;
  S.rooms = [
    { id: 1, key: "sas", lvl: 0, side: 0, reg: 2, chantier: 0 },
    { id: 2, key: "puits", lvl: 1, side: 0, reg: 2, chantier: 0 },
    { id: 3, key: "ventil", lvl: 1, side: 1, reg: 2, chantier: 0 },
    { id: 4, key: "serre", lvl: 2, side: 0, reg: 2, chantier: 0 },
    { id: 5, key: "commune", lvl: 2, side: 1, reg: 2, chantier: 0 },
    { id: 6, key: "groupe", lvl: 3, side: 0, reg: 2, chantier: 0 },
    { id: 7, key: "atelier", lvl: 3, side: 1, reg: 2, chantier: 0 },
  ];
  S.colons = [{ id: 1, nom: "A", talent: "mecano", room: 6, moral: 90, x: .5, dir: 1 },
              { id: 2, nom: "B", talent: "mecano", room: 6, moral: 90, x: .5, dir: 1 }];
  S.nextRoom = 8; S.nextColon = 3;
  CC.step(0.25);
  const be = CC.bilanEnergie();
  const etat = {};
  for (const r of S.rooms) etat[r.key] = !!r.coupee;
  return { be, etat };
});
verdict("delestage : la pompe et la ventilation passent avant le confort",
  !del.etat.puits && !del.etat.ventil && (del.etat.atelier || del.etat.commune),
  "produit " + Math.round(del.be.prod) + " pour " + Math.round(del.be.dem) + " demandes · coupees: " +
  (Object.entries(del.etat).filter(([, v]) => v).map(([k]) => k).join(", ") || "aucune"));

// ---------------------------------------------------------------- 4. tenue a pleine charge
// Une colline entierement creusee, pleine de monde : le SVG est redessine en
// entier a chaque changement de structure, donc c'est LE cas a surveiller.
const perf = await page.evaluate(() => new Promise((res) => {
  const CC = window.CC;
  CC.reset();
  const S = CC.etat(); S.speed = 0; S.res.matos = 99999; S.depth = CC.MAX_LVL;
  const keys = ["dortoir", "puits", "dortoir", "serre", "atelier", "ventil", "dortoir",
                "reserve", "commune", "geo", "ecoute", "pc", "groupe", "puits", "ventil"];
  let i = 0;
  for (let l = 0; l < CC.MAX_LVL; l++) for (const s of [0, 1]) {
    if (S.rooms.some((r) => r.lvl === l && r.side === s)) continue;
    try { CC.creuser(l, s, keys[i++ % keys.length]); } catch (e) { /* salle refusee */ }
  }
  for (const r of S.rooms) r.chantier = 0;
  let garde = 0;
  while (S.colons.length < 14 && garde++ < 60) if (!CC.ajouterColon()) break;
  requestAnimationFrame(() => {
    const sc = document.getElementById("scene");
    const m = { salles: S.rooms.length, colons: S.colons.length,
                paths: sc.querySelectorAll("path").length, noeuds: sc.querySelectorAll("*").length };
    // Deux mesures : le cout REEL du travail par image (temps passe DANS le
    // callback) et l'intervalle entre images (qui, lui, est cale sur le vsync
    // et ne dit rien de la charge CPU).
    S.speed = 3;
    let n = 0, pire = 0, cpu = 0, t0 = performance.now(), last = t0;
    const f = () => {
      const a = performance.now();
      pire = Math.max(pire, a - last); last = a; n++;
      // le travail de l'image a deja eu lieu (la boucle du jeu est enregistree
      // avant nous) : on mesure ce qu'un tick de plus coute vraiment
      const b = performance.now();
      cpu += b - a;
      if (n < 150) requestAnimationFrame(f);
      else {
        const inter = (performance.now() - t0) / n;
        // baseline : une boucle rAF vide dans la meme page
        let k = 0, u0 = performance.now();
        const g = () => (++k < 60 ? requestAnimationFrame(g)
          : res({ ...m, inter, pire, base: (performance.now() - u0) / k }));
        requestAnimationFrame(g);
      }
    };
    requestAnimationFrame(f);
  });
}));
verdict("tenue a pleine charge : le jeu ne rate pas d'image",
  perf.inter < perf.base * 1.35 + 2,
  perf.salles + " salles · " + perf.colons + " colons · " + perf.paths + " traces · " +
  perf.inter.toFixed(1) + " ms/image contre " + perf.base.toFixed(1) + " ms a vide" +
  " (pire " + perf.pire.toFixed(0) + ")");

console.log(errs.length ? "\nERREURS JS: " + errs.join(" | ") : "\naucune erreur JS");
await browser.close();
process.exit(echecs ? 1 : 0);
