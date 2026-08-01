// Banc d'équilibrage de La Plaza — la seule question qui compte.
//
//   « Existe-t-il une allocation qui gagne partout ? »
//
// Si oui, le proto est une fausse décision : le joueur règle ses trois curseurs
// une fois au début et regarde. Si non, la plaza disputée est un vrai sujet et
// le PvP économique a des fondations chiffrées.
//
// On balaie toutes les allocations fixes par pas de 10 %, plus quelques
// stratégies ADAPTATIVES (qui réagissent au contrôle et à la tension), et on
// regarde le classement final contre les deux rivaux.
//
//   cd tools && node balance-plaza.mjs

import * as G from "../la-plaza/sim.mjs";

const DT = G.TICK_MS * G.JOUR_PAR_MS;
const fmt = G.fmtEuro;

/**
 * Joue une saison complète. `pilote(S)` est appelé chaque jour de jeu.
 * `seuilAvocat` est BALAYÉ, pas fixé : la première version imposait la même
 * politique d'avocats à toutes les lignes, ce qui faussait la comparaison et
 * faisait croire qu'une allocation mixte gagnait alors qu'elle payait juste des
 * avocats comme tout le monde.
 */
function saison(pilote, { seuilAvocat = 55 } = {}) {
  const S = G.nouvelEtat();
  let dernierJour = -1;
  for (let i = 0; i < Math.round(G.SAISON_JOURS / DT) + 40 && !S.fini; i++) {
    G.tick(S, DT);
    const j = Math.floor(S.jour);
    if (j !== dernierJour) {
      dernierJour = j;
      pilote(S);
      if (seuilAvocat !== null && S.chaleur > seuilAvocat) G.acheterAvocat(S);
      G.ameliorerProduction(S);
    }
  }
  const cl = G.classementFinal(S);
  return { S, cash: S.cash, rang: cl.findIndex((x) => x.f === "joueur") + 1, fini: S.fini };
}

/** Le meilleur résultat d'une allocation, toutes politiques d'avocats confondues. */
function meilleureDe(pilote) {
  let best = null;
  for (const seuil of [null, 40, 55, 70]) {
    const r = saison(pilote, { seuilAvocat: seuil });
    if (!best || r.cash > best.cash) best = { ...r, seuil };
  }
  return best;
}

/** Force une allocation fixe (en points, somme 100). */
function fixe(a) {
  return (S) => {
    for (const cle of G.CLES_PUNTO) {
      const delta = a[cle] - S.allocation[cle];
      if (delta > 0) G.allouer(S, cle, delta);
    }
  };
}

/* ── 1. Balayage de toutes les allocations fixes, par pas de 10 ─────────── */
const resultats = [];
for (let f = 0; f <= 100; f += 10) {
  for (let p = 0; p + f <= 100; p += 10) {
    const pi = 100 - f - p;
    const a = { frontera: f, puerto: p, pista: pi };
    const r = meilleureDe(fixe(a));
    resultats.push({ nom: `F${f}/P${p}/Pi${pi}`, ...r, a });
  }
}
resultats.sort((x, y) => y.cash - x.cash);

console.log("─── allocations fixes : top 8 ───");
for (const r of resultats.slice(0, 8))
  console.log(`  ${r.nom.padEnd(16)} ${fmt(r.cash).padStart(9)}  rang ${r.rang}  ${r.fini ? r.fini.cle : "—"}`);
console.log("─── pire 4 ───");
for (const r of resultats.slice(-4))
  console.log(`  ${r.nom.padEnd(16)} ${fmt(r.cash).padStart(9)}  rang ${r.rang}  ${r.fini ? r.fini.cle : "—"}`);

const meilleur = resultats[0], pire = resultats[resultats.length - 1];
const ecart = meilleur.cash / Math.max(pire.cash, 1);
console.log(`\nécart meilleur/pire : ×${ecart.toFixed(1)}  (${fmt(meilleur.cash)} contre ${fmt(pire.cash)})`);

/* ── 2. Stratégies adaptatives : est-ce que réagir bat un réglage figé ? ── */
const ADAPTATIFS = {
  "suit le prix net": (S) => {
    let best = G.CLES_PUNTO[0], bv = -Infinity;
    for (const c of G.CLES_PUNTO) { const v = G.prixNet(S, c, "joueur"); if (v > bv) { bv = v; best = c; } }
    G.allouer(S, best, 100);
  },
  "fuit la tension": (S) => {
    let best = G.CLES_PUNTO[0], bt = Infinity;
    for (const c of G.CLES_PUNTO) { const t = S.puntos[c].tension; if (t < bt) { bt = t; best = c; } }
    G.allouer(S, best, 100);
  },
  "défend ce qu'il tient": (S) => {
    // Consolide une plaza qu'il tient déjà ; sinon vise celle où il est le plus proche du seuil.
    let best = null, bp = -Infinity;
    for (const c of G.CLES_PUNTO) {
      const p = G.part(S.puntos[c], "joueur");
      const bonus = G.tenant(S.puntos[c]) === "joueur" ? 0.3 : 0;
      if (p + bonus > bp) { bp = p + bonus; best = c; }
    }
    G.allouer(S, best, 100);
  },
  // Le vrai test de « décision vivante » : un joueur qui déplace 12 points par
  // jour vers la plaza dont la valeur MARGINALE est la meilleure — prix net
  // après péage, amorti par ce que sa propre présence y sature déjà.
  "rééquilibre au marginal": (S) => {
    let best = G.CLES_PUNTO[0], bv = -Infinity;
    for (const c of G.CLES_PUNTO) {
      const marge = G.prixNet(S, c, "joueur") / (1 + 0.5 * G.saturation(S, c));
      if (marge > bv) { bv = marge; best = c; }
    }
    G.allouer(S, best, 12);
  },
  "prend le calme, garde un pied": (S) => {
    let best = G.CLES_PUNTO[0], bt = Infinity;
    for (const c of G.CLES_PUNTO) { const t = S.puntos[c].tension; if (t < bt) { bt = t; best = c; } }
    G.allouer(S, best, 70);
  },
};
console.log("\n─── stratégies adaptatives ───");
const adapt = [];
for (const [nom, f] of Object.entries(ADAPTATIFS)) {
  const r = meilleureDe(f);
  adapt.push({ nom, ...r });
  console.log(`  ${nom.padEnd(26)} ${fmt(r.cash).padStart(9)}  rang ${r.rang}  ${r.fini ? r.fini.cle : "—"}`);
}

/* ── 3. Le verdict ─────────────────────────────────────────────────────── */
const tout = [...resultats.map((r) => ({ nom: r.nom, cash: r.cash })), ...adapt.map((r) => ({ nom: r.nom, cash: r.cash }))]
  .sort((a, b) => b.cash - a.cash);
const top = tout[0], second = tout[1];
const marge = (top.cash / Math.max(second.cash, 1) - 1) * 100;

console.log("\n═══ VERDICT ═══");
console.log(`meilleure stratégie : ${top.nom} — ${fmt(top.cash)}`);
console.log(`seconde            : ${second.nom} — ${fmt(second.cash)}  (${marge.toFixed(1)} % derrière)`);
const gagnants = resultats.filter((r) => r.rang === 1).length;
console.log(`allocations fixes qui finissent 1res : ${gagnants}/${resultats.length}`);
const perdues = resultats.filter((r) => r.fini && r.fini.cle === "cerco").length;
console.log(`allocations fixes qui tombent (étau) : ${perdues}/${resultats.length}`);

// Un verdict n'est valable que si le jeu est JOUABLE — la première version de
// ce test criait victoire sur une économie morte (tout le monde à zéro, donc
// personne ne « dominait »).
const vivant = top.cash > 3_000_000;
const survivable = perdues < resultats.length * 0.6;
const dispute = gagnants > 2 && gagnants < resultats.length - 2;

// Et surtout : comparer le 1er au 2e ne prouve RIEN quand les deux sont la même
// stratégie à 10 points près (F100 et F90 sont la même idée). Ce qui compte,
// c'est la DIVERSITÉ du haut de tableau : si les huit meilleures allocations
// misent toutes sur la même plaza, il n'y a qu'une ligne de jeu.
const familleDe = (a) => G.CLES_PUNTO.reduce((m, c) => (a[c] > a[m] ? c : m), G.CLES_PUNTO[0]);
const familles = new Set(resultats.slice(0, 8).map((r) => familleDe(r.a)));
const diversifie = familles.size >= 2;
// Le meilleur adaptatif doit au moins tenir la comparaison avec le meilleur figé,
// sinon « lire le plateau » ne sert à rien et le jeu se règle une fois pour toutes.
const meilleurAdapt = adapt.slice().sort((a, b) => b.cash - a.cash)[0];
const reagirPaie = meilleurAdapt.cash >= meilleur.cash * 0.95;

console.log("\n═══ DIAGNOSTIC ═══");
console.log(`  économie vivante        ${vivant ? "✅" : "❌"}  (meilleure : ${fmt(top.cash)})`);
console.log(`  défaite atteignable     ${perdues > 0 ? "✅" : "❌"}  (${perdues}/${resultats.length} tombent)`);
console.log(`  course disputée         ${dispute ? "✅" : "❌"}  (${gagnants}/${resultats.length} finissent 1res)`);
console.log(`  haut de tableau varié   ${diversifie ? "✅" : "❌"}  (familles gagnantes : ${[...familles].join(", ")})`);
console.log(`  réagir vaut le coup     ${reagirPaie ? "✅" : "❌"}  (meilleur adaptatif ${fmt(meilleurAdapt.cash)} contre ${fmt(meilleur.cash)} figé)`);

if (vivant && survivable && dispute && diversifie && reagirPaie) {
  console.log("\n✅ La destination est une vraie décision, et la saison se joue.");
} else {
  console.log("\n⚠️  THÈSE NON VALIDÉE en l'état : voir les ❌.");
  if (!diversifie) console.log("   Une seule plaza rafle le haut du tableau — la destination se choisit une fois.");
  if (!reagirPaie) console.log("   Lire le plateau ne bat pas un réglage figé : le jeu n'a pas de décision vivante.");
}
