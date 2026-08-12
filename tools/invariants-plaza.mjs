// Invariants mécaniques de La Plaza — sans navigateur.
//
// Ce que ces tests protègent, dans l'ordre de ce qui a réellement cassé
// pendant la construction :
//
//   1. L'ERREUR DIMENSIONNELLE. La saturation comparait un STOCK (le volume
//      mémorisé, ~8,7 jours cumulés) à un DÉBIT (la capacité en kg/jour). Le
//      plafond à 100 % cachait l'erreur ; en l'enlevant, la saturation partait
//      à ×20 et l'économie mourait. Le test 4 fixe la grandeur.
//   2. L'ALLOCATION QUI FUIT. Les trois curseurs doivent faire exactement 100,
//      toujours, quel que soit l'ordre des déplacements.
//   3. LE DÉTERMINISME, y compris pour les rivaux : leur politique est une
//      fonction pure de l'état, sans quoi le joueur ne peut pas jouer contre.
//   4. LE PÉAGE dans les deux sens : on le paie quand un autre tient, on
//      l'encaisse quand on tient.
//
//   cd tools && node invariants-plaza.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import * as G from "../la-plaza/sim.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIM = path.resolve(__dirname, "..", "la-plaza", "sim.mjs");
const DT = G.TICK_MS * G.JOUR_PAR_MS;
const res = [];
const ok = (nom, pass, detail = "") => res.push({ nom, pass, detail });

function bornes(S) {
  const bad = [];
  if (!(S.cash >= 0)) bad.push("cash " + S.cash);
  if (!(S.chaleur >= 0 && S.chaleur <= 100)) bad.push("chaleur " + S.chaleur);
  const somme = G.CLES_PUNTO.reduce((a, c) => a + S.allocation[c], 0);
  if (somme !== 100) bad.push("allocation = " + somme);
  for (const c of G.CLES_PUNTO) {
    const p = S.puntos[c];
    if (!(p.tension >= 0 && p.tension <= 100)) bad.push("tension " + p.tension);
    for (const f of G.TOUS) {
      if (!(p.volume[f] >= -1e-9)) bad.push("volume négatif " + f);
      const v = G.part(p, f);
      if (!(v >= 0 && v <= 1.0000001)) bad.push("part hors 0..1 : " + v);
    }
  }
  for (const k of ["cash", "chaleur", "jour"]) if (!Number.isFinite(S[k])) bad.push(k + " non fini");
  return bad;
}

/** Une saison jouée par un pilote donné. */
function saison(pilote, jours = G.SAISON_JOURS) {
  const S = G.nouvelEtat();
  const viol = new Set();
  let dernier = -1;
  // +40 ticks de marge : la fin de saison se déclenche à `jour >= SAISON_JOURS`
  // et l'accumulation flottante peut atterrir à 119,999 pile sur la borne.
  for (let i = 0; i < Math.round(jours / DT) + 40 && !S.fini; i++) {
    G.tick(S, DT);
    const j = Math.floor(S.jour);
    if (j !== dernier) { dernier = j; if (pilote) pilote(S); }
    if (i % 11 === 0) for (const b of bornes(S)) viol.add(b);
  }
  for (const b of bornes(S)) viol.add(b);
  return { S, viol: [...viol] };
}

/* ── 1. Aucun aléa ─────────────────────────────────────────────────────── */
{
  const src = readFileSync(SIM, "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const trouves = [/Math\.random/g, /\bnew Date\b/g, /Date\.now/g, /performance\.now/g]
    .flatMap((re) => code.match(re) || []);
  ok("R4 · aucun aléa ni horloge réelle dans la sim", trouves.length === 0, trouves.join(", "));
  ok("La sim n'importe rien du navigateur", !/\bdocument\b|\bwindow\b|localStorage/.test(code));
}

/* ── 2. Déterminisme, et les décisions comptent ────────────────────────── */
{
  const pilote = (S) => G.allouer(S, "frontera", 10);
  const cle = (S) => JSON.stringify({ c: S.cash.toFixed(6), h: S.chaleur.toFixed(6), a: S.allocation,
                                      r: G.RIVAUX.map((f) => S.rivaux[f].cash.toFixed(6)) });
  ok("R4 · mêmes décisions = même saison", cle(saison(pilote).S) === cle(saison(pilote).S));

  const a = saison((S) => G.allouer(S, "pista", 100)).S;
  const b = saison((S) => G.allouer(S, "puerto", 100)).S;
  ok("Le choix de destination change vraiment l'issue",
     Math.abs(a.cash - b.cash) > 1e6, `${G.fmtEuro(a.cash)} contre ${G.fmtEuro(b.cash)}`);

  // La politique d'un rival est une fonction PURE de l'état : deux appels de
  // suite donnent la même réponse, sinon le joueur ne peut rien prévoir.
  const S = saison(null, 30).S;
  let stable = true;
  for (const f of G.RIVAUX) if (G.cibleRivale(S, f) !== G.cibleRivale(S, f)) stable = false;
  ok("Les politiques rivales sont des fonctions pures (prévisibles)", stable);
}

/* ── 3. L'allocation fait toujours 100 ─────────────────────────────────── */
{
  const S = G.nouvelEtat();
  const suite = [["frontera", 30], ["pista", 40], ["puerto", -60], ["frontera", 100],
                 ["pista", -10], ["puerto", 25], ["frontera", -100], ["pista", 70]];
  let bad = 0;
  for (const [c, d] of suite) {
    G.allouer(S, c, d);
    const somme = G.CLES_PUNTO.reduce((a, k) => a + S.allocation[k], 0);
    if (somme !== 100) bad++;
    if (G.CLES_PUNTO.some((k) => S.allocation[k] < 0 || S.allocation[k] > 100)) bad++;
  }
  ok("Les trois curseurs font toujours exactement 100", bad === 0, bad + " écart(s)");
}

/* ── 4. La saturation est un DÉBIT sur un DÉBIT ────────────────────────── */
{
  // On injecte un débit connu et on vérifie que la mémoire le restitue.
  const S = G.nouvelEtat();
  for (const c of G.CLES_PUNTO) for (const f of G.TOUS) S.puntos[c].volume[f] = 0;
  const DEBIT = 24;                       // kg/jour envoyés dans puerto
  S.allocation = { frontera: 0, puerto: 100, pista: 0 };
  S.palierProduction = 1;
  const attendu = G.PRODUCTION_BASE;      // 100 % de la production part à puerto
  for (let i = 0; i < Math.round(60 / DT); i++) { G.tick(S, DT); S.cash = 1e9; }
  const mesure = G.debit(S, "puerto");
  // Les rivaux passent parfois par puerto : on vérifie au moins que le débit
  // mesuré est du bon ORDRE DE GRANDEUR que la production, pas ×8 (le bug).
  ok("Le débit d'une plaza est bien un kg/jour, pas un stock",
     mesure >= attendu * 0.8 && mesure < attendu * 4,
     `mesuré ${mesure.toFixed(1)} kg/j pour ${attendu} produits (le bug donnait ~×8,7)`);
  void DEBIT;
}

/* ── 5. Contrôle et péage, dans les deux sens ──────────────────────────── */
{
  const S = G.nouvelEtat();
  const p = S.puntos.frontera;
  for (const f of G.TOUS) p.volume[f] = 0;
  p.volume.joueur = 80; p.volume.aguilas = 20;
  ok("Au-dessus du seuil, la plaza est tenue", G.tenant(p) === "joueur", "tenant : " + G.tenant(p));
  ok("Celui qui tient encaisse le plein prix",
     Math.abs(G.prixNet(S, "frontera", "joueur") - G.puntoPrix(S, "frontera")) < 1e-6);
  ok("Les autres paient le péage",
     Math.abs(G.prixNet(S, "frontera", "aguilas") - G.puntoPrix(S, "frontera") * (1 - G.PEAJE_PART)) < 1e-6);

  p.volume.joueur = 34; p.volume.aguilas = 33; p.volume.familia = 33;
  ok("Sous le seuil, personne ne tient et personne ne prélève", G.tenant(p) === null);
  ok("Une plaza libre paie le plein prix à tout le monde",
     Math.abs(G.prixNet(S, "frontera", "aguilas") - G.puntoPrix(S, "frontera")) < 1e-6);

  // Le péage encaissé doit rentrer en caisse QUAND un rival passe quand même.
  // On force la situation : le joueur tient Puerto Viejo (grande capacité, donc
  // encore rentable malgré la taxe) pendant que les deux autres plazas sont
  // gorgées — les rivaux n'ont alors nulle part de meilleur où aller.
  const T = G.nouvelEtat();
  T.allocation = { frontera: 0, puerto: 100, pista: 0 };
  for (const c of G.CLES_PUNTO) for (const f of G.TOUS) T.puntos[c].volume[f] = 0;
  T.puntos.puerto.volume.joueur = 900;
  T.puntos.frontera.volume.familia = 3000;        // frontera saturée : prix au plancher
  T.puntos.pista.volume.familia = 3000;           // pista aussi
  for (let i = 0; i < 300; i++) G.tick(T, DT);
  ok("Tenir une plaza rapporte du péage quand un rival y passe",
     T.totaux.peajeRecu > 0, G.fmtEuro(T.totaux.peajeRecu) + " encaissés");

  // ET LE REVERS, qui est le vrai enseignement du proto : quand les sorties
  // sont des substituts parfaits, un rival RATIONNEL contourne la plaza taxée.
  // Tenir devient un refus de terrain, pas une rente. Ce test fige le constat.
  const U = G.nouvelEtat();
  for (const c of G.CLES_PUNTO) for (const f of G.TOUS) U.puntos[c].volume[f] = 0;
  U.puntos.frontera.volume.joueur = 500;          // le joueur tient la plus chère
  const evite = G.cibleRivale(U, "aguilas") !== "frontera";
  ok("Un rival rationnel contourne la plaza qu'on taxe (constat, pas défaut)",
     evite, "Los Águilas visent " + G.PUNTOS[G.cibleRivale(U, "aguilas")].nom);
}

/* ── 6. La dominance coûte de la chaleur (l'anti-snowball) ─────────────── */
{
  const S = G.nouvelEtat();
  for (const c of G.CLES_PUNTO) for (const f of G.TOUS) S.puntos[c].volume[f] = 0;
  S.puntos.puerto.volume.joueur = 100; S.puntos.puerto.volume.aguilas = 100;
  const partagee = G.chaleurCible(S);
  S.puntos.puerto.volume.aguilas = 0;
  const monopole = G.chaleurCible(S);
  ok("Dominer le corridor coûte plus de chaleur que le partager",
     monopole > partagee, `${partagee.toFixed(1)} → ${monopole.toFixed(1)}`);
}

/* ── 7. Une longue saison : bornes, causes, registre agrégé ────────────── */
{
  const { S, viol } = saison((S) => { G.ameliorerProduction(S); if (S.chaleur > 55) G.acheterAvocat(S); });
  ok("Bornes tenues sur une saison entière", viol.length === 0, viol.join(" | "));
  ok("Cause obligatoire · toute ligne de registre en porte une",
     S.registre.every((e) => e.cause && String(e.cause).trim()));
  const vus = new Map();
  for (const e of S.registre) {
    const k = Math.floor(e.jour) + "|" + e.cause;
    vus.set(k, (vus.get(k) || 0) + 1);
  }
  ok("Registre agrégé · une ligne par jour et par cause",
     [...vus.values()].every((n) => n === 1), [...vus.values()].filter((n) => n > 1).length + " doublon(s)");
  ok("La saison se termine", !!S.fini, S.fini ? S.fini.titre : "jamais");
}

/* ── 8. La défaite existe, et elle est évitable ────────────────────────── */
{
  // L'étau doit être ATTEIGNABLE : on vérifie le mécanisme, pas un réglage.
  const E = G.nouvelEtat();
  E.chaleur = 95; E.chaleurCible = 95;
  for (let i = 0; i < Math.round((G.CERCO_JOURS + 3) / DT) && !E.fini; i++) {
    G.tick(E, DT);
    E.chaleur = Math.max(E.chaleur, 95);   // on maintient la pression
  }
  ok("L'étau se referme si la chaleur reste au plafond",
     !!(E.fini && E.fini.cle === "cerco"), E.fini ? E.fini.cle : "jamais");

  // NOTE : « est-ce que la gourmandise coûte ? » est une question d'ÉQUILIBRAGE,
  // pas un invariant — elle dépend de constantes que Sylvain doit régler. Elle
  // est mesurée par `balance-plaza.mjs`, qui balaie les stratégies et publie le
  // verdict. La mettre ici produisait un test rouge sur un réglage, ce qui est
  // le meilleur moyen de finir par le désactiver.
}

/* ── 9. Garde-fous d'API ───────────────────────────────────────────────── */
{
  const S = G.nouvelEtat();
  let leve = false;
  try { G.tx(S, -10, ""); } catch (e) { leve = true; }
  ok("Un mouvement sans cause est refusé", leve);
  S.cash = 100;
  G.tx(S, -999999, "écrêtage");
  ok("On ne dépense pas ce qu'on n'a pas", S.cash === 0);
  ok("Le montant écrêté est celui qui est journalisé", S.registre[S.registre.length - 1].montant === -100);

  const T = G.nouvelEtat();
  T.cash = 1e9;
  for (let i = 0; i < 20; i++) G.ameliorerProduction(T);
  ok("Le plafond de production tient", T.palierProduction === G.PRODUCTION_MAX);
  for (let i = 0; i < 20; i++) G.acheterAvocat(T);
  ok("Le plafond d'avocats tient", T.avocats === G.AVOCAT_MAX);
}

console.log("\n─── invariants La Plaza ───");
let echecs = 0;
for (const r of res) {
  if (!r.pass) echecs++;
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
}
console.log(`\n${res.length - echecs}/${res.length} invariant(s) OK.`);
process.exit(echecs ? 1 : 0);
