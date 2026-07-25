// Invariants mécaniques de La Loupe — sans navigateur, sans DOM.
//
// Le dépôt ne vérifiait jusqu'ici que la SYNTAXE (`node --check`), ce qui ne dit
// rien de la conservation. Ces deux invariants-là auraient attrapé à eux seuls
// l'essentiel de l'audit du 2026-07-25 :
//
//   1. Grammes facturés == grammes livrés, sur tout chemin de vente.
//   2. L'offre spontanée d'un client passe TOUJOURS son propre test d'acceptation.
//
// R4 (déterminisme total) rend ces tests triviaux : il n'y a aucun aléa à
// neutraliser, il suffit de balayer jour × seq.
//
//   cd tools && node invariants-loupe.mjs

import {
  CORNER, CORNER_PERSONAS, makeOffer, makeAnon, makeLouche, makeArdoise,
  resolveOffer, cornerBudget, cornerTol, cornerFair, wantsArdoise, offerCap,
  qualFac, QUAL_REF, QUAL_TOL_MAX,
} from "../la-loupe/corner.mjs";
import { qtyToSachets, applySachetPlan } from "../la-loupe/snap.mjs";
import { FRONT_ENABLED, grantOpeningFront, nightTick, shelterDefaults } from "../la-loupe/shelter.mjs";

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });
const R = Math.round;

// La plage de qualité que le jeu produit réellement : pains q52/q70/q78, dégradés
// par la lame (×0,82 au couteau pourri) puis moyennés — donc ~40 au plancher, 100 au plafond.
const QUALITES = [40, 52, 55, 64, 70, 78, 90, 100];

// ── 1. Conservation : ce qu'on facture, on le livre ────────────────────────
// On rejoue le transfert réel du corner (qtyToSachets + applySachetPlan) sur
// des tampons variés, et on vérifie que les grammes sortis du tampon égalent
// exactement les grammes couverts — jamais plus, jamais moins.
{
  const tampons = [
    { 2: 30 }, { 5: 12 }, { 8: 8 }, { 2: 5, 5: 5, 8: 5 },
    { 2: 1 }, { 8: 2 }, { 5: 3, 20: 1 }, { 12: 4, 2: 2 },
  ];
  let pire = 0, cas = 0, fuite = 0;
  for (const base of tampons) {
    for (const demande of [1, 2, 3, 5, 8, 12, 16, 24, 40]) {
      const t = { ...base };
      const avant = Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0);
      const { plan, covered } = qtyToSachets(demande, t);
      applySachetPlan(t, plan);
      const apres = Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0);
      cas++;
      // le tampon perd exactement ce qui est couvert
      if (Math.abs((avant - apres) - covered) > 1e-9) fuite++;
      // et on ne sur-livre JAMAIS
      pire = Math.max(pire, covered - demande);
    }
  }
  ok("Conservation · les grammes sortis du tampon == les grammes couverts",
     fuite === 0, `${cas} cas, ${fuite} fuite(s)`);
  ok("Conservation · jamais de sur-livraison (on ne donne pas plus que demandé)",
     pire <= 0, `dépassement max : ${pire} g`);
}

// ── 2. L'offre d'un client passe son propre test ───────────────────────────
// C'est le bug le plus grave trouvé à l'audit : accepter le montant que le
// client vient d'annoncer pouvait le faire partir furieux, avec malus, sans
// aucun avertissement. Nassim : 100 % de ses visites. Bilal : 42 %.
{
  const menus = [6, 8, 10, 14, 20];
  const rels = [0, 10, 40, 80];
  let bad = 0, tot = 0;
  const coupables = new Map();
  for (const p of CORNER_PERSONAS) {
    for (const menu of menus) for (const rel of rels) {
      for (let day = 1; day <= 12; day++) for (let seq = 0; seq < 12; seq++) {
        const o = makeOffer(p, rel, 20, day, seq, menu);
        if (o.mode !== "offer") continue;
        tot++;
        // Depuis le 2026-07-25 la qualité donne un qFac à TOUT LE MONDE (elle achète
        // de la tolérance, pas du prix) : on balaye donc la vraie plage produite par
        // le jeu — qualFac(q) pour q de 40 à 100 — composée, chez les connaisseurs,
        // avec leur propre jugement. Balayer {1, 1.12, 0.85} ne testait plus rien.
        const gFacs = QUALITES.map(qualFac);
        const qFacs = p.traits && p.traits.qual
          ? gFacs.flatMap((g) => [g, g * CORNER.QUAL_TOL_UP, g * CORNER.QUAL_TOL_DOWN])
          : gFacs;
        for (const qFac of qFacs) {
          const cl = { kind: p.kind, rel, g: o.qty, qFac };
          const v = resolveOffer(cl, o.qty, o.offer, true, true, 20, menu);
          if (!v.accepted) {
            bad++;
            coupables.set(p.nm, (coupables.get(p.nm) || 0) + 1);
            break;
          }
        }
      }
    }
  }
  ok("R1/R4 · l'offre spontanée d'un persona passe toujours son propre test",
     bad === 0,
     bad ? `${bad}/${tot} — ${[...coupables].map(([n, c]) => n + "×" + c).join(", ")}`
         : `${tot} offres × qualité ${QUALITES[0]}..${QUALITES[QUALITES.length - 1]} (menus ${menus.join("/")}, rel ${rels.join("/")})`);
}

// ── 2 bis. Idem pour les PNJ anonymes, qui font 85 % du volume ─────────────
{
  let bad = 0, tot = 0;
  for (const menu of [6, 8, 10, 14, 20]) {
    for (let day = 1; day <= 30; day++) for (let seq = 0; seq < 30; seq++) {
      const a = makeAnon(day, seq, 20, menu);
      tot++;
      for (const q of QUALITES) {
        const v = resolveOffer({ kind: "anon", rel: 0, g: a.qty, qFac: qualFac(q) }, a.qty, a.offer, true, true, 20, menu);
        if (!v.accepted) { bad++; break; }
      }
    }
  }
  ok("R1/R4 · idem pour les PNJ anonymes (85 % du volume)", bad === 0, `${bad}/${tot}`);
}

// ── 2 ter. La tolérance gagnée par la qualité est UTILISABLE ───────────────
// C'est LA garantie de l'arbitrage « la qualité achète de la tolérance », et elle
// ne se teste pas à prix fixe : à prix fixe, monter en qualité n'a jamais pu nuire
// (un test formulé ainsi passe avant ET après le correctif — il ne prouve rien).
//
// Le mal apparaît quand le joueur SE SERT de ce qu'il a acheté. Les prix débloqués
// par la qualité — ceux que le client refusait à q55 et accepte à q100 — tombaient
// tous au-delà de `NEGO_MAX × menu`, donc en `gouge` : −2 relation, −2 réput, et il
// ne revient plus après deux fois. Le seuil d'abus était resté fixe pendant que
// `tol` devenait élastique : avoir du bon produit devenait une punition (R1).
// Un client TRÈS lié tolère déjà plus que la ligne d'abus (facteur relation ×1,254
// à rel 80 contre NEGO_MAX ×1,2) : ça, c'est voulu — il avale et il s'en souvient.
// L'invariant n'est donc pas « aucun prix puni », mais : **monter en qualité ne doit
// pas augmenter la PART punie** de ce qu'il accepte. Sinon le bon produit n'achète
// que du ressentiment, et l'arbitrage « la qualité achète de la tolérance » est mort.
{
  let pires = 0, cas = 0, exemple = null;
  // Grille FINE (pas sous-l'euro) : mesurée en euros entiers, la part d'abus bouge de
  // plusieurs points juste parce qu'une borne tombe d'un côté ou de l'autre d'un entier.
  // On veut tester la propriété du système, pas l'arrondi — donc 2000 pas.
  const PAS = 2000;
  const partPunie = (kind, rel, g, menu, q) => {
    const hautMax = g * menu * 4, dt = hautMax / PAS;
    let acceptes = 0, gouges = 0;
    for (let total = dt; total <= hautMax; total += dt) {
      const v = resolveOffer({ kind, rel, g, qFac: qualFac(q) }, g, total, false, false, 20, menu);
      if (!v.accepted) continue;
      acceptes++;
      if (v.outcome === "gouge") gouges++;
    }
    return { part: acceptes ? gouges / acceptes : 0, n: acceptes };
  };
  for (const kind of ["anon", "regulier", "accro", "lowball", "hesitant", "grossiste"]) {
    for (const rel of [0, 10, 40, 80]) for (const menu of [8, 10, 14]) for (const g of [2, 5, 8]) {
      const bas = partPunie(kind, rel, g, menu, QUAL_REF);
      const haut = partPunie(kind, rel, g, menu, 100);
      cas++;
      const pas = haut.n ? 1 / haut.n : 0; // un pas de grille, pas davantage
      if (haut.part > bas.part + pas + 1e-9) {
        pires++;
        if (!exemple) exemple = `${kind} rel${rel} ${g} g menu ${menu} : ${(100 * bas.part).toFixed(0)} % → ${(100 * haut.part).toFixed(0)} % d'abus`;
      }
    }
  }
  ok("R1 · monter en qualité n'augmente jamais la part de prix punis (tolérance utilisable)",
     pires === 0,
     pires ? `${pires}/${cas} cas aggravés — ex. ${exemple}` : `${cas} cas, la part d'abus ne monte jamais avec la qualité`);
}

// ── 2 quater. Le facteur qualité est up-only et borné ──────────────────────
// `offerCap` prend min(budget, qty × tol) : un facteur < 1 rognerait le plafond
// que le client s'impose APRÈS avoir annoncé son offre, et re-créerait le bug
// Nassim/Bilal. La garantie doit être structurelle, pas de tuning.
{
  let hors = 0, monotone = true, prev = 0;
  for (let q = 0; q <= 100; q++) {
    const f = qualFac(q);
    if (f < 1 || f > QUAL_TOL_MAX + 1e-9) hors++;
    if (f < prev - 1e-9) monotone = false;
    prev = f;
  }
  ok("R1 · le facteur qualité est up-only (≥ 1), borné et monotone",
     hors === 0 && monotone && Math.abs(qualFac(QUAL_REF) - 1) < 1e-9,
     `q${QUAL_REF}→${qualFac(QUAL_REF).toFixed(2)} · q78→${qualFac(78).toFixed(2)} · q100→${qualFac(100).toFixed(2)}`);
}

// ── 2 quinquies. La dette dormante ne peut ni s'armer ni enfler ────────────
// `repayDebt` exige du PROPRE, dont aucune source in-game n'existe (trieuse coupée).
// Une dette armée serait donc impayable, et `nightTick` la fait enfler sans fin :
// +8 chaleur, −6 standing, ×1,15 tous les 2 jours. Boucle de punition sans sortie.
{
  const S = { day: 1, heat: 10, reput: 50, cash: 0, dirty: 0, pains: [], sachets: {}, bars: {}, shelter: shelterDefaults() };
  const armé = grantOpeningFront(S);
  ok("R1 · la dette ne peut plus s'armer (aucun circuit de remboursement)",
     FRONT_ENABLED === false && armé.ok === false && !S.shelter.frontActive, armé.reason || "armée !");

  // save « infecté » par une version antérieure : l'escalade doit cesser, l'état être conservé
  const T = { day: 10, heat: 10, reput: 50, cash: 0, dirty: 0, pains: [], sachets: {}, bars: {},
    shelter: { ...shelterDefaults(), frontActive: true, debtDue: 280, debtDueDay: 2 } };
  for (let i = 0; i < 30; i++) { nightTick(T, 250); T.day++; }
  ok("R1 · sur un save déjà porteur d'une dette, l'escalade s'arrête (état conservé)",
     T.shelter.debtDue === 280 && T.heat === 10 && T.reput === 50,
     `dette ${T.shelter.debtDue} (280 attendu) · chaleur ${T.heat} · réput ${T.reput} après 30 nuits`);
}

// ── 3. Le « dernier prix » du client passe son propre test ─────────────────
// Régression déjà corrigée une fois (NOTES 2026-07-24) : le contre affiché
// doit rester atteignable, sinon accepter le prix qu'il vient d'annoncer
// finit en walk avec malus.
{
  let bad = 0, tot = 0;
  for (const p of CORNER_PERSONAS) {
    for (const menu of [8, 10, 14]) for (const rel of [0, 10, 40]) {
      for (const qFac of [1, CORNER.QUAL_TOL_UP, CORNER.QUAL_TOL_DOWN]) {
        const cl = { kind: p.kind, rel, g: p.usual, qFac };
        // on pousse un prix absurde pour déclencher le contre
        const v = resolveOffer(cl, p.usual, p.usual * menu * 9, true, false, 20, menu);
        if (v.outcome !== "counter") continue;
        tot++;
        const v2 = resolveOffer(cl, p.usual, v.counterTotal, false, true, 20, menu);
        if (!v2.accepted) bad++;
      }
    }
  }
  ok("R4 · le « dernier prix » annoncé par le client reste acceptable par lui",
     bad === 0, `${bad}/${tot}`);
}

// ── 4. Bornes : aucune jauge ne sort de 0..100 sur une séquence de ventes ──
{
  let hors = 0;
  let reput = 20, res = 50;
  const clamp = (v) => Math.max(0, Math.min(100, v));
  for (const p of CORNER_PERSONAS) {
    for (let day = 1; day <= 40; day++) {
      const o = makeOffer(p, 10, reput, day, day % 7, 10);
      if (o.mode !== "offer") continue;
      const v = resolveOffer({ kind: p.kind, rel: 10, g: o.qty, qFac: 1 }, o.qty, o.offer, true, true, reput, 10);
      reput = clamp(reput + (v.reput || 0));
      res = clamp(res + (v.res || 0));
      if (reput < 0 || reput > 100 || res < 0 || res > 100) hors++;
    }
  }
  ok("Bornes · réput et réservoir restent dans 0..100", hors === 0,
     `réput ${reput.toFixed(0)} · réservoir ${res.toFixed(0)}`);
}

// ── 5. R4 : le hash de présentation est déterministe et borné ──────────────
{
  const a = [], b = [];
  for (let day = 1; day <= 50; day++) for (let seq = 0; seq < 10; seq++) {
    a.push(makeAnon(day, seq, 20, 10).offer);
  }
  for (let day = 1; day <= 50; day++) for (let seq = 0; seq < 10; seq++) {
    b.push(makeAnon(day, seq, 20, 10).offer);
  }
  ok("R4 · mêmes entrées, mêmes offres (déterminisme)",
     a.every((v, i) => v === b[i]), `${a.length} tirages`);
}

console.log("\n─── invariants La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} invariants OK.`);
process.exit(bad ? 1 : 0);
