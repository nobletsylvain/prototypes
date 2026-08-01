// Invariants mécaniques d'El Patrón — sans navigateur, sans DOM.
//
// La sim est un module pur (`el-patron/sim.mjs`), donc elle se teste comme du
// code normal. Ce que ces tests protègent, dans l'ordre de ce qui a réellement
// cassé pendant la construction :
//
//   1. LA SPIRALE DE LA MORT. Blanchir jusqu'au dernier billet vidait le fonds
//      de roulement, les précurseurs devenaient impayables, l'usine s'arrêtait
//      et la partie ne redémarrait JAMAIS. La réserve d'exploitation existe
//      pour ça ; ce test vérifie qu'elle tient sur une longue partie.
//   2. LE DÉTERMINISME (R4). Aucune saisie n'est tirée au sort. Deux parties
//      identiques doivent finir identiques, au bit près.
//   3. LA CAUSE OBLIGATOIRE. Aucune ligne de registre sans cause.
//   4. LES BORNES. chaleur, pression, suspicion, soupçon ∈ [0,100] ; les caisses
//      ne passent jamais sous zéro.
//   5. LES ÉVÉNEMENTS. Chaque type s'ouvre sur son seuil, et CHACUNE de ses
//      options se résout sans laisser l'état incohérent.
//
//   cd tools && node invariants-patron.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import * as G from "../el-patron/sim.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIM = path.resolve(__dirname, "..", "el-patron", "sim.mjs");

const res = [];
const ok = (nom, pass, detail = "") => res.push({ nom, pass, detail });
const DT = G.TICK_MS * G.JOUR_PAR_MS;

/** Vérifie toutes les bornes sur un état. Retourne la liste des violations. */
function bornes(S) {
  const bad = [];
  if (!(S.liquide >= 0)) bad.push("liquide " + S.liquide);
  if (!(S.propre >= 0)) bad.push("propre " + S.propre);
  if (!(S.chaleur >= 0 && S.chaleur <= 100)) bad.push("chaleur " + S.chaleur);
  if (!(S.pression >= 0 && S.pression <= 100)) bad.push("pression " + S.pression);
  for (const r of S.rutas) if (!(r.suspicion >= 0 && r.suspicion <= 100)) bad.push("suspicion " + r.suspicion);
  for (const f of S.fronts) if (!(f.soupcon >= 0 && f.soupcon <= 100)) bad.push("soupçon " + f.soupcon);
  for (const f of S.fincas) if (!(f.pate >= -1e-6 && f.pate <= G.FINCA_STOCK_MAX + 1e-6)) bad.push("pâte " + f.pate);
  for (const l of S.labos) if (!(l.poudre >= -1e-6 && l.poudre <= G.LABO_STOCK_MAX + 1e-6)) bad.push("poudre " + l.poudre);
  for (const k of ["liquide", "propre", "chaleur", "jour", "pression", "rythmePoudre"])
    if (!Number.isFinite(S[k])) bad.push(k + " non fini");
  return bad;
}

/** Politique de résolution : `pref` choisit l'option, sinon la première payable. */
function resoudreTout(S, pref) {
  let n = 0;
  while (S.evenements.length && n++ < 50) {
    const e = S.evenements[0];
    const voulu = pref && pref(e);
    const opt = e.options.find((o) => o.cle === voulu && (!o.cout || G.peutPayer(S, o.devise, o.cout)))
      || e.options.find((o) => !o.cout || G.peutPayer(S, o.devise, o.cout))
      || e.options[e.options.length - 1];
    if (G.resoudre(S, 0, opt.cle) === null) S.evenements.shift();
  }
}

/** Un joueur déterministe qui suit le goulot. Sert de partie de référence. */
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

/** Rejoue une partie complète. `pref` rend la politique d'événement explicite. */
function partie(jours, pref) {
  const S = G.nouvelEtat(20260801);
  const violations = new Set();
  const ticks = Math.round(jours / DT);
  for (let i = 0; i < ticks; i++) {
    G.tick(S, DT);
    resoudreTout(S, pref);
    joueur(S);
    if (i % 7 === 0) for (const b of bornes(S)) violations.add(b);
  }
  for (const b of bornes(S)) violations.add(b);
  return { S, violations: [...violations] };
}

/* ── 1. Aucun aléa dans la sim ─────────────────────────────────────────── */
{
  const src = readFileSync(SIM, "utf8");
  // On scanne le CODE, pas les commentaires : le fichier a le droit d'écrire
  // « aucun Math.random ici » en tête sans se faire recaler par son propre test.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // `rngPresentation` est le générateur seedé RÉSERVÉ à la présentation (noms,
  // positions). Ce qu'on interdit, c'est Math.random / Date : de l'aléa ou du
  // temps réel qui entrerait dans l'état économique.
  const interdits = [/Math\.random/g, /\bnew Date\b/g, /Date\.now/g, /performance\.now/g];
  const trouves = interdits.flatMap((re) => code.match(re) || []);
  ok("R4 · aucun Math.random / Date dans la sim", trouves.length === 0, trouves.join(", "));

  const nom = (src.match(/export function (\w+)/g) || []).length;
  ok("La sim expose une API utilisable sans DOM", nom > 20, nom + " fonctions exportées");
  ok("La sim n'importe rien du navigateur", !/\bdocument\b|\bwindow\b|localStorage/.test(src));
}

/* ── 2. Déterminisme : deux parties identiques finissent identiques ────── */
{
  const a = partie(90, () => "mordida");
  const b = partie(90, () => "mordida");
  const cle = (x) => JSON.stringify({
    j: x.jour.toFixed(6), l: x.liquide.toFixed(6), p: x.propre.toFixed(6),
    c: x.chaleur.toFixed(6), pr: x.pression.toFixed(6),
    f: x.fincas.length, la: x.labos.length, r: x.rutas.length, fr: x.fronts.length,
    t: x.totaux,
  });
  ok("R4 · même départ + mêmes décisions = même état final", cle(a.S) === cle(b.S),
     cle(a.S) === cle(b.S) ? "" : "A " + cle(a.S) + "\nB " + cle(b.S));

  // Une politique DIFFÉRENTE doit produire un résultat différent : sinon les
  // choix du joueur ne pèsent sur rien et l'événement n'est qu'un pop-up.
  const c = partie(90, () => "forcer");
  ok("Les décisions changent l'issue (payer ≠ forcer)",
     Math.abs(a.S.totaux.saisiKg - c.S.totaux.saisiKg) > 1,
     `saisi mordida ${a.S.totaux.saisiKg.toFixed(1)} kg vs forcer ${c.S.totaux.saisiKg.toFixed(1)} kg`);
}

/* ── 3. Longue partie : bornes, causes, et surtout pas de spirale ──────── */
{
  const { S, violations } = partie(220, () => "mordida");
  ok("Bornes tenues sur 220 jours", violations.length === 0, violations.join(" | "));

  const sansCause = S.registre.filter((e) => !e.cause || !String(e.cause).trim());
  ok("Cause obligatoire · toute ligne de registre en porte une", sansCause.length === 0,
     sansCause.length + " ligne(s) muette(s)");

  ok("Pas de spirale de la mort · l'usine tourne encore au bout de 220 jours",
     S.rythmePoudre > 1, `rythme final ${S.rythmePoudre.toFixed(1)} kg/j`);
  ok("L'économie a réellement décollé", S.totaux.propreCumule > 5e6,
     "propre cumulé " + G.fmtEuro(S.totaux.propreCumule));

  // Le registre est agrégé par jour : sans ça il déborderait de son plafond en
  // quelques secondes et « pourquoi je perds de l'argent » deviendrait illisible.
  const parJour = new Map();
  for (const e of S.registre) {
    const k = Math.floor(e.jour) + "|" + e.champ + "|" + e.cause;
    parJour.set(k, (parJour.get(k) || 0) + 1);
  }
  const doublons = [...parJour.values()].filter((n) => n > 1).length;
  ok("Registre agrégé · une ligne par jour, champ et cause", doublons === 0, doublons + " doublon(s)");
}

/* ── 4. La réserve d'exploitation fait ce qu'elle promet ───────────────── */
{
  const S = G.nouvelEtat(20260801);
  G.acheterFront(S, "restaurant");
  S.reserveJours = 5;
  for (let i = 0; i < 900; i++) { G.tick(S, DT); resoudreTout(S); }
  const reserve = G.reserveOperationnelle(S);
  ok("Les fronts ne descendent jamais sous la réserve",
     S.liquide >= reserve - 1 || S.liquide === 0,
     `liquide ${G.fmtEuro(S.liquide)} vs réserve ${G.fmtEuro(reserve)}`);

  // À réserve nulle, la lessive a le droit de tout prendre — et c'est bien ce
  // réglage-là qui rend la partie mortelle. Le joueur doit pouvoir se pendre.
  // Il faut une lessive PLUS RAPIDE que les rentrées pour que la réserve soit
  // la contrainte qui mord : sinon le liquide s'entasse quel que soit le réglage
  // et le test ne mesure plus rien (c'est ce qu'il faisait avant).
  const nid = (jours) => {
    const T = G.nouvelEtat(20260801);
    T.propre = 1e8;
    for (const t of Object.keys(G.FRONTS)) G.acheterFront(T, t);   // lessive à fond
    T.reserveJours = jours;
    for (let i = 0; i < 900; i++) { G.tick(T, DT); resoudreTout(T); }
    return T;
  };
  const large = nid(8), sec = nid(0);
  ok("Réserve à 8 j · le fonds de roulement est protégé",
     large.liquide >= G.reserveOperationnelle(large) - 1,
     `liquide ${G.fmtEuro(large.liquide)} ≥ réserve ${G.fmtEuro(G.reserveOperationnelle(large))}`);
  ok("Réserve à 0 · la lessive assèche bien le fonds de roulement",
     sec.liquide < large.liquide,
     `${G.fmtEuro(sec.liquide)} contre ${G.fmtEuro(large.liquide)} à 8 jours`);
}

/* ── 5. Les trois événements s'ouvrent et toutes leurs options se résolvent ── */
{
  const types = { controle: 0, audit: 0, descente: 0 };
  const { S } = partie(220, () => "mordida");
  // On rejoue en comptant les types rencontrés
  const T = G.nouvelEtat(20260801);
  for (let i = 0; i < Math.round(220 / DT); i++) {
    G.tick(T, DT);
    for (const e of T.evenements) if (types[e.type] !== undefined) types[e.type]++;
    resoudreTout(T, () => "mordida");
    joueur(T);
  }
  ok("Un contrôle de ruta finit par tomber", types.controle > 0, types.controle + " rencontré(s)");
  ok("Une descente finit par tomber", types.descente > 0, types.descente + " rencontrée(s)");

  // Chaque option de chaque type doit se résoudre proprement.
  const casses = [];
  for (const cle of ["mordida", "forcer", "fermer"]) {
    const U = G.nouvelEtat(20260801);
    U.liquide = 5e6;
    const r = U.rutas[0];
    r.suspicion = G.SUSPICION_MAX - 0.001;
    r.transit.push({ kg: 12, reste: 1 });
    for (let i = 0; i < 400 && !U.evenements.length; i++) G.tick(U, DT);
    if (!U.evenements.length) { casses.push("contrôle jamais déclenché pour " + cle); continue; }
    const avant = U.evenements.length;
    G.resoudre(U, 0, cle);
    if (U.evenements.length !== avant - 1) casses.push("contrôle/" + cle + " non consommé");
    const b = bornes(U);
    if (b.length) casses.push("contrôle/" + cle + " → " + b.join(","));
  }
  for (const cle of ["payer", "brancher", "bruler"]) {
    const U = G.nouvelEtat(20260801);
    U.liquide = 5e6;
    U.fronts[0].soupcon = G.SOUPCON_MAX - 0.001;
    U.fronts[0].intensite = G.INTENSITE_MAX;
    for (let i = 0; i < 4000 && !U.evenements.some((e) => e.type === "audit"); i++) G.tick(U, DT);
    const idx = U.evenements.findIndex((e) => e.type === "audit");
    if (idx < 0) { casses.push("audit jamais déclenché pour " + cle); continue; }
    G.resoudre(U, idx, cle);
    const b = bornes(U);
    if (b.length) casses.push("audit/" + cle + " → " + b.join(","));
  }
  for (const cle of ["payer", "evacuer", "resister"]) {
    const U = G.nouvelEtat(20260801);
    U.liquide = 5e6;
    U.chaleur = 95; U.pression = G.PRESSION_MAX - 0.001;
    U.labos[0].poudre = 40;
    for (let i = 0; i < 400 && !U.evenements.some((e) => e.type === "descente"); i++) G.tick(U, DT);
    const idx = U.evenements.findIndex((e) => e.type === "descente");
    if (idx < 0) { casses.push("descente jamais déclenchée pour " + cle); continue; }
    G.resoudre(U, idx, cle);
    const b = bornes(U);
    if (b.length) casses.push("descente/" + cle + " → " + b.join(","));
  }
  ok("Toutes les options des 3 événements se résolvent proprement", casses.length === 0, casses.join(" | "));

  // ANTI-BLOCAGE. `tick()` ne fait rien tant qu'un événement est en attente, et
  // `resoudre()` refuse une option qu'on ne peut pas payer. Si un événement
  // n'offrait QUE des options payantes, un joueur fauché resterait coincé
  // dessus pour toujours, la partie gelée sans écran de fin. Chaque événement
  // doit donc porter au moins une issue gratuite.
  const sansIssue = [];
  const W = G.nouvelEtat(20260801);
  for (let i = 0; i < Math.round(220 / DT); i++) {
    G.tick(W, DT);
    for (const e of W.evenements) {
      if (!e.options.some((o) => !o.cout)) sansIssue.push(e.type);
    }
    resoudreTout(W, () => "mordida");
    joueur(W);
  }
  ok("Aucun événement ne peut bloquer un joueur fauché (une issue gratuite au moins)",
     sansIssue.length === 0, [...new Set(sansIssue)].join(", "));

  // Et la preuve par l'absurde : à zéro liquide, tout se résout quand même.
  const X = G.nouvelEtat(20260801);
  X.rutas[0].suspicion = G.SUSPICION_MAX - 0.001;
  X.rutas[0].transit.push({ kg: 9, reste: 1 });
  for (let i = 0; i < 400 && !X.evenements.length; i++) G.tick(X, DT);
  X.liquide = 0;
  const avantX = X.evenements.length;
  resoudreTout(X);
  ok("À zéro liquide, l'événement se résout quand même",
     avantX > 0 && X.evenements.length === 0, `${avantX} en attente → ${X.evenements.length}`);
}

/* ── 6. Les deux fonctions qui PORTENT la promesse de déterminisme ─────── */
{
  // La descente frappe le nœud le plus exposé, jamais un nœud tiré au sort.
  const S = G.nouvelEtat(20260801);
  S.propre = 5e6;
  G.acheterFinca(S, "valle"); G.acheterLabo(S);
  S.labos[0].poudre = 5; S.labos[1].poudre = 60;
  ok("La descente vise bien le nœud le plus chargé",
     G.cibleDescente(S).id === S.labos[1].id, "visé : " + G.cibleDescente(S).nom);
  S.labos[1].poudre = 0; S.fincas[1].pate = 200;
  ok("Le nœud visé suit la valeur, il ne se fige pas",
     G.cibleDescente(S).id === S.fincas[1].id, "visé : " + G.cibleDescente(S).nom);

  // La trace : l'escorte la fait baisser, la chaleur la fait monter. Ce sont
  // les deux seuls leviers du joueur sur la date du contrôle — s'ils ne
  // mordent pas, la jauge n'est plus pilotable et le contrôle redevient subi.
  const T = G.nouvelEtat(20260801);
  const r = T.rutas[0];
  const nu = G.rutaTrace(T, r);
  G.reglerEscorte(T, r.id, 3);
  const escorte = G.rutaTrace(T, r);
  ok("L'escorte fait baisser la trace", escorte < nu, `${nu.toFixed(2)} → ${escorte.toFixed(2)}`);
  G.reglerEscorte(T, r.id, 0);
  T.chaleur = 90;
  ok("La chaleur fait monter la trace", G.rutaTrace(T, r) > nu,
     `${nu.toFixed(2)} → ${G.rutaTrace(T, r).toFixed(2)} à chaleur 90`);

  // Le bilan agrège bien par cause de premier niveau.
  const U = G.nouvelEtat(1);
  for (let i = 0; i < Math.round(6 / DT); i++) { G.tick(U, DT); resoudreTout(U); }
  const b = G.bilan(U, 5);
  ok("Le bilan regroupe le registre par cause", b.length > 0 && b.every((l) => l.cause && !l.cause.includes(" · ")),
     b.map((l) => l.cause).join(", "));
}

/* ── 7. Garde-fous de l'API ────────────────────────────────────────────── */
{
  const S = G.nouvelEtat(1);
  let leve = false;
  try { G.tx(S, "liquide", -10, ""); } catch (e) { leve = true; }
  ok("Une transaction sans cause est refusée", leve);

  const T = G.nouvelEtat(1);
  T.liquide = 100;
  G.tx(T, "liquide", -999999, "test d'écrêtage");
  ok("On ne peut pas dépenser ce qu'on n'a pas", T.liquide === 0, "liquide " + T.liquide);
  ok("Le montant écrêté est celui qui est journalisé",
     T.registre[T.registre.length - 1].montant === -100,
     "journalisé " + T.registre[T.registre.length - 1].montant);

  const U = G.nouvelEtat(1);
  U.propre = 1e9;
  for (let i = 0; i < 40; i++) G.acheterFinca(U, "valle");
  ok("Le plafond de fincas tient", U.fincas.length === G.FINCA_MAX, U.fincas.length + " fincas");
  for (let i = 0; i < 40; i++) G.acheterLabo(U);
  ok("Le plafond de labos tient", U.labos.length === G.LABO_MAX, U.labos.length + " labos");
  for (let i = 0; i < 40; i++) G.acheterRuta(U, "camion", "puerto");
  ok("Le plafond de rutas tient", U.rutas.length === G.RUTA_MAX, U.rutas.length + " rutas");
  for (let i = 0; i < 6; i++) G.acheterFront(U, "lavadero");
  ok("Un front n'existe qu'en un exemplaire",
     U.fronts.filter((f) => f.type === "lavadero").length === 1);

  // L'extradition est la seule fin : elle doit être atteignable.
  const V = G.nouvelEtat(1);
  V.chaleur = 100; V.politiciens = 0;
  V.rythmePoudre = 5000;                 // un empire énorme : la cible reste à 100
  for (let i = 0; i < Math.round((G.EXTRADITION_JOURS + 2) / DT) && !V.fini; i++) {
    G.tick(V, DT);
    V.rythmePoudre = 5000;
    resoudreTout(V);
  }
  ok("La partie peut se perdre (extradition)", V.fini && V.fini.cle === "extradition",
     V.fini ? V.fini.titre : "jamais atteinte");
}

/* ── sortie ────────────────────────────────────────────────────────────── */
console.log("\n─── invariants El Patrón ───");
let echecs = 0;
for (const r of res) {
  if (!r.pass) echecs++;
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
}
console.log(`\n${res.length - echecs}/${res.length} invariant(s) OK.`);
process.exit(echecs ? 1 : 0);
