// Tests de non-regression de "La Colline Creuse v2" (bac a sable).
//
//   cd tools && node test-colline2.mjs
//
// 1. graine : la meme graine redonne EXACTEMENT la meme colline
// 2. persistance : jouer, recharger, retrouver le meme etat (colline comprise)
// 3. creuser : accroche obligatoire, cout au volume, deblais produits
// 4. deblais : evacuer fait baisser le tas et la signature
// 5. tenue : une colline largement creusee ne fait pas ramer

import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGE = "file://" + path.resolve(__dirname, "..", "colline-creuse-v2/index.html") + "?debug";

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
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

// ------------------------------------------------------------- 1. graine
const g = await page.evaluate(() => {
  const CC = window.CC;
  const empreinte = () => {
    const T = CC.TERRE(), S2 = CC.SOL();
    let h = 0;
    for (let i = 0; i < T.length; i += 7) h = (h * 31 + T[i]) | 0;
    for (let i = 0; i < S2.length; i++) h = (h * 31 + S2[i]) | 0;
    let a = 0; for (const [k, v] of CC.ACC()) a = (a + k * (v.length + 1)) | 0;
    return h + ":" + a;
  };
  CC.repondreCarte(); CC.reset(4242); const e1 = empreinte();
  const v1 = CC.etat().village.nom;
  CC.reset(777); const e2 = empreinte();
  CC.reset(4242); const e3 = empreinte();
  const v3 = CC.etat().village.nom;
  return { e1, e2, e3, v1, v3 };
});
verdict("graine : même graine, même colline", g.e1 === g.e3 && g.e1 !== g.e2 && g.v1 === g.v3,
  g.v1 + " reproduit à l'identique, différent de la graine 777");

// ------------------------------------------------------------- 2. persistance
const resume = () => {
  const S = window.CC.etat();
  return { graine: S.graine, jour: S.jour, exc: S.exc.length, tas: Math.round(S.tas),
           matos: Math.round(S.res.matos), soupcon: Math.round(S.soupcon),
           village: S.village.nom, colons: S.colons.length,
           cells: S.exc.map((e) => e.c + "," + e.r + "," + e.w + "x" + e.h).sort().join("|") };
};
const avant = await page.evaluate((src) => {
  const CC = window.CC;
  CC.reset(9001);
  const S = CC.etat(); S.speed = 0;
  const e = S.exc[1];
  CC.creuser(e.c, e.r + e.h, 3, 2);
  for (let i = 0; i < 300; i++) { CC.step(0.25); if (CC.modaleOuverte()) CC.repondreCarte(); }
  return new Function("return (" + src + ")()")();
}, resume.toString());
await page.reload({ waitUntil: "load" });
await new Promise((r) => setTimeout(r, 400));
const apres = await page.evaluate((src) => new Function("return (" + src + ")()")(), resume.toString());
verdict("persistance : la colline et les salles reviennent à l'identique",
  JSON.stringify(avant) === JSON.stringify(apres),
  JSON.stringify(avant) === JSON.stringify(apres) ? "" :
    "\n         avant " + JSON.stringify(avant) + "\n         apres " + JSON.stringify(apres));

// ------------------------------------------------------------- 3. creuser
const dig = await page.evaluate(() => {
  const CC = window.CC;
  CC.reset(5150);
  const S = CC.etat(); S.speed = 0;
  const base = S.exc[1];
  const loin = CC.apercuCreuse(1, base.r + 20, 2, 2);          // pas accroché
  const bon = CC.apercuCreuse(base.c, base.r + base.h, 3, 2);  // sous la salle
  const large = CC.apercuCreuse(base.c, base.r + base.h, 8, 1); // trop large
  const ciel = CC.apercuCreuse(base.c, 1, 2, 2);               // dans le ciel
  const m0 = S.res.matos, t0 = S.tas;
  CC.creuser(base.c, base.r + base.h, 3, 2);
  return { loin: loin.raison, bon: bon.ok, matos: bon.matos, sec: bon.sec, deb: bon.deblais,
           large: large.raison, ciel: ciel.raison,
           paye: Math.round(m0 - S.res.matos), tas: Math.round(S.tas - t0), exc: S.exc.length };
});
verdict("creuser : règles d'accroche, de portée et de ciel",
  !!dig.loin && !!dig.large && !!dig.ciel && dig.bon && dig.paye > 0 && dig.tas > 0,
  "6 cellules = " + dig.matos + " matos, " + dig.sec + " s, " + dig.deb + " m³ · refus : « " +
  dig.loin + " » / « " + dig.large + " »");

// ------------------------------------------------------------- 4. déblais
const deb = await page.evaluate(async () => {
  const CC = window.CC;
  CC.reset(31337);
  const S = CC.etat(); S.speed = 0;
  S.tas = 60;
  const sigAvant = CC.signature();
  S.facade = "rucher";
  CC.lancerEvac("remblai");
  const enCours = !!S.evac;
  for (let i = 0; i < 200 && S.evac; i++) CC.step(0.25);
  return { enCours, tas: Math.round(S.tas), sigAvant: +sigAvant.toFixed(1),
           sigApres: +CC.signature().toFixed(1), cash: Math.round(S.res.cash) };
});
verdict("déblais : évacuer fait baisser le tas et la signature",
  deb.enCours && deb.tas < 60 && deb.sigApres < deb.sigAvant,
  "60 → " + deb.tas + " m³ · signature " + deb.sigAvant + " → " + deb.sigApres + " · " + deb.cash + " €");

// ------------------------------------------------------------- 5. tenue
const perf = await page.evaluate(() => new Promise((res) => {
  const CC = window.CC;
  CC.reset(2024);
  const S = CC.etat(); S.speed = 0; S.res.matos = 99999;
  // on creuse un vrai réseau : une descente et des salles de part et d'autre
  // un vrai reseau : une descente centrale, et des salles greffees dessus
  const base = S.exc[1];
  const cc = Math.max(0, Math.min(CC.GW - 3, base.c + 1));
  let r = base.r + base.h, poses = 0;
  for (let i = 0; i < 16; i++) {
    if (CC.creuser(cc, r, 2, 2)) poses++;
    const g = cc - 4, d = cc + 2;
    if (i % 2 === 0 && g >= 0 && CC.creuser(g, r, 4, 2)) poses++;
    if (i % 2 === 1 && d + 4 <= CC.GW && CC.creuser(d, r, 4, 2)) poses++;
    for (const e of S.exc) e.t = 0;
    r += 2;
  }
  for (const e of S.exc) e.t = 0;
  requestAnimationFrame(() => {
    const sc = document.getElementById("scene");
    const m = { exc: S.exc.length, poses, paths: sc.querySelectorAll("path").length,
                noeuds: sc.querySelectorAll("*").length };
    S.speed = 3;
    let n = 0, pire = 0, t0 = performance.now(), last = t0;
    const f = () => {
      const t = performance.now(); pire = Math.max(pire, t - last); last = t; n++;
      if (n < 140) requestAnimationFrame(f);
      else {
        const inter = (performance.now() - t0) / n;
        let k = 0, u0 = performance.now();
        const gg = () => (++k < 60 ? requestAnimationFrame(gg)
          : res({ ...m, inter, pire, base: (performance.now() - u0) / k }));
        requestAnimationFrame(gg);
      }
    };
    requestAnimationFrame(f);
  });
}));
verdict("tenue : une colline largement creusée ne rate pas d'image",
  perf.inter < perf.base * 1.4 + 2,
  perf.exc + " espaces (" + perf.poses + " creusés) · " + perf.paths + " tracés · " + perf.inter.toFixed(1) +
  " ms/image contre " + perf.base.toFixed(1) + " à vide (pire " + perf.pire.toFixed(0) + ")");

console.log(errs.length ? "\nERREURS JS: " + errs.join(" | ") : "\naucune erreur JS");
await browser.close();
process.exit(echecs ? 1 : 0);
