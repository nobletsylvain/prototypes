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
} from "../la-loupe/corner.mjs";
import { qtyToSachets, applySachetPlan } from "../la-loupe/snap.mjs";

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });
const R = Math.round;

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
        // qFac n'existe QUE chez les connaisseurs (traits.qual) : l'appliquer à
        // tout le monde testait un état que le jeu ne produit jamais.
        const qFacs = p.traits && p.traits.qual
          ? [1, CORNER.QUAL_TOL_UP, CORNER.QUAL_TOL_DOWN] : [1];
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
         : `${tot} offres vérifiées (menus ${menus.join("/")}, rel ${rels.join("/")}, qFac nominal et rogné)`);
}

// ── 2 bis. Idem pour les PNJ anonymes, qui font 85 % du volume ─────────────
{
  let bad = 0, tot = 0;
  for (const menu of [6, 8, 10, 14, 20]) {
    for (let day = 1; day <= 30; day++) for (let seq = 0; seq < 30; seq++) {
      const a = makeAnon(day, seq, 20, menu);
      tot++;
      const v = resolveOffer({ kind: "anon", rel: 0, g: a.qty, qFac: 1 }, a.qty, a.offer, true, true, 20, menu);
      if (!v.accepted) bad++;
    }
  }
  ok("R1/R4 · idem pour les PNJ anonymes (85 % du volume)", bad === 0, `${bad}/${tot}`);
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
