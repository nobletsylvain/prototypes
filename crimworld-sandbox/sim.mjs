/* =======================================================================
   CrimWorld — Sandbox · CŒUR DE SIMULATION v2 (nouvelle approche)

   Boucle : RÉASSORT (darkweb, semi-grossistes) → LABO (un proto produit un
   BATCH) → INVENTAIRE → VENTE en petites quantités. Horloge temps réel 5× plus
   lente. PAS de heat/concurrence (désactivé). La réput (demande) reste le levier.

   JS pur, sans dépendance, sans DOM. Inspectable console (node/navigateur).
   INVARIANTS : aucun Math.random ne pilote l'ÉTAT ou une CONSÉQUENCE ; chaque
   conséquence porte une `cause` lisible (contrat de données) ; réput affichée
   OPAQUE ; l'équilibre vit dans UNE courbe (demande ∝ réput), réglée plus tard.
   ======================================================================= */

// ---- Constantes nommées (PLACEHOLDERS — non réglées) -------------------
export const C = {
  HOUR_MS: 10000,            // 5× plus lent (1 h de jeu = 10 s ; journée ≈ 4 min)
  DAY_HOURS: 24,
  LOYER_JOUR: 40,            // compteur de fond (on tient le corner) — tunable
  PRODUITS: ['hash', 'weed', 'neige'],
  PRIX_GRAMME:  { hash: 10, weed: 8,  neige: 60 },  // € / g au détail
  DEMANDE_BASE: { hash: 60, weed: 80, neige: 20 },  // g/jour absorbés à réput 100
  REPUT_PROPRE: 6,           // une coupe propre fait monter la demande
  REPUT_ARRACHE: -25,        // une coupe à l'arrache la fait fuir
};

// ---- Affichage OPAQUE (présentation déterministe) ----------------------
export function jaugeOpaque(v, max, sym = '•', plein = '🔥'){
  const n = Math.max(0, Math.min(5, Math.round((v / max) * 5)));
  return plein.repeat(Math.max(1, Math.ceil(n / 2))) + ' ' + sym.repeat(n);
}

// ---- Fabrique de simulation -------------------------------------------
export function createSim(){
  const z = () => ({ hash: 0, weed: 0, neige: 0 });
  const state = {
    jour: 1, heure: 0, cash: 0, loyerDu: 0,
    reput: 50,                     // demande (opaque)
    matiere: z(),                  // g de matière première (réassort darkweb)
    stock: z(),                    // g finis, prêts à vendre
    batches: [],                   // traçabilité des batches produits au labo
    debloques: { hash: true, weed: false, neige: false },  // produits dispo
    metricsJour: newJour(),        // accumulateur du jour courant
    metrics: [],                   // un enregistrement par jour clos (page Metrics)
    dernierMetrics: null,
  };

  function newJour(){ return { achatsEUR: 0, ventesEUR: 0, gProduits: z(), vendu: z(), lignes: [] }; }
  function ligne(o){ state.metricsJour.lignes.push(o); }
  const clamp = v => Math.max(0, Math.min(100, v));

  // demande du jour pour un produit : déterministe, ∝ réput (la courbe UNIQUE)
  function demandeJour(produit){ return Math.round(C.DEMANDE_BASE[produit] * state.reput / 100); }

  const api = {
    state,
    demandeJour,

    debloquer(produit){ state.debloques[produit] = true; return api; },

    // RÉASSORT (darkweb) : matière première achetée chez un semi-grossiste
    acheterMatiere(produit, grammes, prixTotal, cause){
      if (!state.debloques[produit]) return api;
      state.cash -= prixTotal;
      state.matiere[produit] += grammes;
      state.metricsJour.achatsEUR += prixTotal;
      ligne({ ic: '📦', label: `Réassort : +${grammes}g ${produit}`, montant: -prixTotal,
        cause: cause || 'acheté au semi-grossiste (darkweb)' });
      return api;
    },

    // LABO : un proto (iframe) renvoie un BATCH fini. On consomme la matière,
    // on range le batch dans l'inventaire. qualite 'A' (propre) | 'C' (arrache).
    produireBatch({ produit, grammesRaw, grammesFinis, qualite }){
      if (!state.debloques[produit]) return api;
      state.matiere[produit] = Math.max(0, state.matiere[produit] - grammesRaw);
      state.stock[produit] += grammesFinis;
      state.batches.push({ produit, grammes: grammesFinis, qualite, jour: state.jour });
      state.reput = clamp(state.reput + (qualite === 'A' ? C.REPUT_PROPRE : C.REPUT_ARRACHE));
      state.metricsJour.gProduits[produit] += grammesFinis;
      ligne({ ic: '⚗️', label: `Batch ${produit} : ${grammesFinis}g (${qualite === 'A' ? 'propre' : 'arrache'})`,
        cause: qualite === 'A' ? 'sorti propre du labo' : 'coupé à l’arrache au labo' });
      return api;
    },

    // VENTE en petites quantités, plafonnée par la DEMANDE du jour (réput × qualité).
    vendre(produit, grammes){
      const cap = demandeJour(produit) - state.metricsJour.vendu[produit];
      const g = Math.min(grammes | 0, state.stock[produit], Math.max(0, cap));
      if (g <= 0){
        ligne({ ic: '🚫', label: `Vente ${produit} impossible`,
          cause: state.stock[produit] <= 0 ? 'rupture de stock' : 'demande du jour épuisée' });
        return 0;
      }
      state.stock[produit] -= g;
      const montant = g * C.PRIX_GRAMME[produit];
      state.cash += montant;
      state.metricsJour.vendu[produit] += g;
      state.metricsJour.ventesEUR += montant;
      ligne({ ic: '🤝', label: `${g}g ${produit} vendus`, montant,
        cause: 'demande du jour (réput conso)' });
      return montant;
    },

    // HORLOGE temps réel : avance de dtMs ; clôt le jour à 24 h (sans popup).
    tick(dtMs){
      state.heure += dtMs / C.HOUR_MS;
      while (state.heure >= C.DAY_HOURS){ state.heure -= C.DAY_HOURS; cloreJour(); }
      return api;
    },

    metricsDuJour(){ return snapshot(); },   // bilan du jour EN COURS (page Metrics, live)
  };

  // ---- clôture du jour : loyer, snapshot dans metrics, rollover ----------
  function cloreJour(){
    state.loyerDu += C.LOYER_JOUR;
    ligne({ ic: '🏚️', label: 'Loyer du corner', montant: -C.LOYER_JOUR,
      cause: 'tu paies pour exister sur le block' });
    const snap = snapshot();
    state.metrics.push(snap);
    state.dernierMetrics = snap;
    state.jour++;
    state.metricsJour = newJour();
  }

  // ---- snapshot d'un jour (ce que la page Metrics affichera) -------------
  function snapshot(){
    const m = state.metricsJour;
    return {
      jour: state.jour,
      achatsEUR: m.achatsEUR,
      ventesEUR: m.ventesEUR,
      net: m.lignes.reduce((s, l) => s + (l.montant || 0), 0),   // somme réelle des lignes
      gProduits: { ...m.gProduits }, gVendus: { ...m.vendu },
      cash: state.cash, loyerDu: state.loyerDu,
      stock: { ...state.stock }, matiere: { ...state.matiere },
      reputOpaque: jaugeOpaque(state.reput, 100),
      lignes: m.lignes.slice(),
    };
  }

  return api;
}

/* =======================================================================
   DÉMO CONSOLE — la nouvelle boucle sur 3 jours déterministes.
   Lancer : node crimworld-sandbox/sim.mjs
   ======================================================================= */
function printJour(s){
  console.log(`\n=== METRICS — JOUR ${s.jour} ===`);
  for (const l of s.lignes){
    const m = l.montant ? (l.montant > 0 ? ` +${l.montant}€` : ` ${l.montant}€`) : '';
    console.log(`  ${l.ic} ${l.label}${m}`);
    console.log(`       ↳ ${l.cause}`);
  }
  console.log(`  — net ${s.net >= 0 ? '+' : ''}${s.net}€ · caisse ${s.cash}€ · loyer dû ${s.loyerDu}€`);
  console.log(`  — stock g : hash ${s.stock.hash} · weed ${s.stock.weed} · neige ${s.stock.neige} · réput ${s.reputOpaque}`);
}

export function demo(){
  const sim = createSim();
  const JOUR = C.HOUR_MS * C.DAY_HOURS;
  console.log('CrimWorld Sandbox v2 — démo cœur de sim');
  console.log('Boucle : réassort → labo → inventaire → vente. Horloge 5× plus lente. Pas de heat.');
  console.log('Demande hash à réput 50 :', sim.demandeJour('hash'), 'g/jour');

  // JOUR 1 — réassort, labo PROPRE, on écoule (plafonné par la demande).
  sim.acheterMatiere('hash', 100, 250);                                   // 100g de savonnette, 250€
  sim.produireBatch({ produit: 'hash', grammesRaw: 100, grammesFinis: 80, qualite: 'A' });
  sim.vendre('hash', 100);                                                // tente 100g → limité par la demande
  sim.tick(JOUR);
  printJour(sim.state.dernierMetrics);

  // JOUR 2 — labo À L'ARRACHE : la réput chute → la demande se tarit, stock invendu.
  sim.acheterMatiere('hash', 100, 250);
  sim.produireBatch({ produit: 'hash', grammesRaw: 100, grammesFinis: 90, qualite: 'C' });
  sim.vendre('hash', 100);
  sim.tick(JOUR);
  printJour(sim.state.dernierMetrics);

  // JOUR 3 — on revend du stock : la demande basse (héritée de l'arrache) plafonne.
  sim.vendre('hash', 100);
  sim.tick(JOUR);
  printJour(sim.state.dernierMetrics);
  console.log(`\nStock hash final : ${sim.state.stock.hash}g invendus · réput ${jaugeOpaque(sim.state.reput,100)} · demande hash ${sim.demandeJour('hash')}g/j`);
}

// auto-run sous node (sans casser l'import navigateur)
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('sim.mjs')){
  demo();
}
