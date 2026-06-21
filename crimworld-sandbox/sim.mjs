/* =======================================================================
   CrimWorld — Sandbox · CŒUR DE SIMULATION v2.1 (Snap : story + DM)

   Boucle : RÉASSORT (darkweb) → LABO (batch) → INVENTAIRE → tu postes ta STORY
   → les CLIENTS te DM au fil de la journée → tu les SERS depuis ton stock.
   La demande = des ÉVÉNEMENTS DM étalés sur la journée (pilotés par réput), pas
   un plafond vidable d'un coup → tue le temps mort. Horloge temps réel. Pas de heat.

   JS pur, sans DOM, déterministe, inspectable console.
   INVARIANTS : aucun Math.random ne pilote l'ÉTAT/une CONSÉQUENCE (l'arrivée des
   clients, les paniers, sont déterministes ; pseudo/avatar = présentation, côté UI) ;
   chaque conséquence porte une `cause` lisible ; réput affichée OPAQUE ; l'équilibre
   vit dans UNE courbe (nb de clients ∝ réput).
   ======================================================================= */

export const C = {
  HOUR_MS: 60000,            // 1 min de jeu = 1 s réelle (1 h = 60 s ; journée ≈ 24 min)
  DAY_HOURS: 24,
  LOYER_JOUR: 40,            // frais de base du block (compteur de fond) — tunable
  PRODUITS: ['hash', 'weed', 'neige'],
  PRIX_GRAMME:  { hash: 10, weed: 8,  neige: 60 },   // € / g au détail
  CLIENTS_BASE: 8,           // nb de clients/jour à réput 100 (si la story est postée)
  PANIER: [10, 5, 15, 5, 10, 20, 5, 10],  // g demandés par client (cyclique, déterministe)
  REPUT_PROPRE: 6,           // une coupe propre fait monter la demande
  REPUT_ARRACHE: -25,        // une coupe à l'arrache la fait fuir
  LAB_RAW: 100,              // labo : g de matière consommés par batch (provisoire, P3)
  LAB_YIELD: { A: 0.8, C: 1.2 },  // rendement propre / arrache (provisoire, P3)
};

export function jaugeOpaque(v, max, sym = '•', plein = '🔥'){
  const n = Math.max(0, Math.min(5, Math.round((v / max) * 5)));
  return plein.repeat(Math.max(1, Math.ceil(n / 2))) + ' ' + sym.repeat(n);
}

export function createSim(){
  const z = () => ({ hash: 0, weed: 0, neige: 0 });
  const state = {
    jour: 1, heure: 0, cash: 0, loyerDu: 0,
    reput: 50,                     // demande (opaque)
    matiere: z(),                  // g de matière première (réassort)
    stock: z(),                    // g finis, prêts à vendre
    batches: [],
    debloques: { hash: true, weed: false, neige: false },
    storyPostee: false,            // story postée aujourd'hui ?
    clientsJour: [],               // clients programmés pour la journée (déterministe)
    clientSeq: 0,
    metricsJour: newJour(),
    metrics: [],
    dernierMetrics: null,
  };

  function newJour(){ return { achatsEUR: 0, ventesEUR: 0, gProduits: z(), vendu: z(), clientsServis: 0, lignes: [] }; }
  function ligne(o){ state.metricsJour.lignes.push(o); }
  const clamp = v => Math.max(0, Math.min(100, v));

  const api = {
    state,
    debloquer(produit){ state.debloques[produit] = true; return api; },

    // RÉASSORT (darkweb) : matière première au semi-grossiste
    acheterMatiere(produit, grammes, prixTotal, cause){
      if (!state.debloques[produit]) return api;
      state.cash -= prixTotal;
      state.matiere[produit] += grammes;
      state.metricsJour.achatsEUR += prixTotal;
      ligne({ ic: '📦', label: `Réassort : +${grammes}g ${produit}`, montant: -prixTotal,
        cause: cause || 'acheté au semi-grossiste (darkweb)' });
      return api;
    },

    // LABO : un proto (iframe, P3) renvoie un BATCH. Ici : consomme la matière,
    // range le batch en stock. qualite 'A' (propre) | 'C' (arrache).
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

    // SNAP : poster la story expose ta vitrine → programme les DM clients du jour.
    // nb de clients ∝ réput (la courbe unique) ; arrivées étalées sur la journée.
    posterStory(){
      if (state.storyPostee) return api;
      state.storyPostee = true;
      const n = Math.round(C.CLIENTS_BASE * state.reput / 100);
      const debut = state.heure;
      for (let i = 0; i < n; i++){
        state.clientsJour.push({
          id: ++state.clientSeq,
          produit: 'hash',                               // produit actif (généralisé plus tard)
          grammes: C.PANIER[i % C.PANIER.length],
          heureArrivee: debut + (C.DAY_HOURS - debut) * (i + 1) / (n + 1),
          arrive: false, servi: false,
        });
      }
      ligne({ ic: '📸', label: 'Story postée', cause: 'ta vitrine est en ligne — les clients vont DM' });
      if (n === 0) ligne({ ic: '🦗', label: 'Personne ne DM', cause: 'réput trop basse — ta came n’attire pas' });
      return api;
    },

    // les DM en attente (clients arrivés, pas encore servis) — pour l'UI
    dmEnAttente(){ return state.clientsJour.filter(c => c.arrive && !c.servi); },

    // SERVIR un client (répondre à son DM) : vend depuis le stock.
    servir(id){
      const c = state.clientsJour.find(x => x.id === id && x.arrive && !x.servi);
      if (!c) return 0;
      const g = Math.min(c.grammes, state.stock[c.produit]);
      if (g <= 0) return 0;                              // rupture : l'UI gère le retour ; raté tracé à minuit
      state.stock[c.produit] -= g;
      const montant = g * C.PRIX_GRAMME[c.produit];
      state.cash += montant;
      c.servi = true;
      state.metricsJour.vendu[c.produit] += g;
      state.metricsJour.ventesEUR += montant;
      state.metricsJour.clientsServis++;
      ligne({ ic: '🤝', label: `${g}g ${c.produit} vendus`, montant, cause: 'client servi via Snap' });
      return montant;
    },

    // HORLOGE temps réel : avance dtMs ; fait arriver les DM ; clôt le jour à 24 h.
    tick(dtMs){
      state.heure += dtMs / C.HOUR_MS;
      for (const c of state.clientsJour){
        if (!c.arrive && c.heureArrivee <= state.heure) c.arrive = true;
      }
      while (state.heure >= C.DAY_HOURS){ state.heure -= C.DAY_HOURS; cloreJour(); }
      return api;
    },

    metricsDuJour(){ return snapshot(); },
  };

  function cloreJour(){
    // clients non servis = ventes ratées. On distingue DM IGNORÉ (stock dispo, tu
    // n'as pas répondu) de RUPTURE (plus assez de came) — chaque cause tracée.
    const rates = state.clientsJour.filter(c => !c.servi);
    const ignores  = rates.filter(c => state.stock[c.produit] >= c.grammes);
    const ruptures = rates.filter(c => state.stock[c.produit] <  c.grammes);
    if (ignores.length){
      const g = ignores.reduce((s, c) => s + c.grammes, 0);
      ligne({ ic: '📭', label: `${ignores.length} DM ignorés (${g}g ratés)`,
        cause: 'tu n’as pas répondu — le client est parti' });
    }
    if (ruptures.length){
      const g = ruptures.reduce((s, c) => s + c.grammes, 0);
      ligne({ ic: '📉', label: `${ruptures.length} clients non servis (${g}g ratés)`,
        cause: 'rupture de stock — pas assez de came prête' });
    }
    state.cash   -= C.LOYER_JOUR;          // frais prélevés sur la caisse
    state.loyerDu += C.LOYER_JOUR;         // cumul des frais (info)
    ligne({ ic: '💸', label: 'Frais du block', montant: -C.LOYER_JOUR,
      cause: 'faut graisser pour bosser sur le block' });
    const snap = snapshot();
    state.metrics.push(snap);
    state.dernierMetrics = snap;
    state.jour++;
    state.metricsJour = newJour();
    state.clientsJour = []; state.storyPostee = false;
  }

  function snapshot(){
    const m = state.metricsJour;
    return {
      jour: state.jour,
      achatsEUR: m.achatsEUR, ventesEUR: m.ventesEUR,
      net: m.lignes.reduce((s, l) => s + (l.montant || 0), 0),
      gProduits: { ...m.gProduits }, gVendus: { ...m.vendu },
      clientsServis: m.clientsServis,
      cash: state.cash, loyerDu: state.loyerDu,
      stock: { ...state.stock }, matiere: { ...state.matiere },
      reputOpaque: jaugeOpaque(state.reput, 100),
      lignes: m.lignes.slice(),
    };
  }

  return api;
}

/* =======================================================================
   DÉMO CONSOLE — la boucle Snap (story + DM) sur 3 jours déterministes.
   Lancer : node crimworld-sandbox/sim.mjs
   ======================================================================= */
function printJour(s){
  console.log(`\n=== METRICS — JOUR ${s.jour} ===`);
  for (const l of s.lignes){
    const m = l.montant ? (l.montant > 0 ? ` +${l.montant}€` : ` ${l.montant}€`) : '';
    console.log(`  ${l.ic} ${l.label}${m}\n       ↳ ${l.cause}`);
  }
  console.log(`  — net ${s.net >= 0 ? '+' : ''}${s.net}€ · caisse ${s.cash}€ · clients servis ${s.clientsServis}`);
  console.log(`  — stock hash ${s.stock.hash}g · réput ${s.reputOpaque}`);
}

export function demo(){
  const sim = createSim();
  const H = C.HOUR_MS;
  const jouerJournee = () => { for (let h = 0; h < C.DAY_HOURS; h++){ sim.tick(H); for (const c of sim.dmEnAttente()) sim.servir(c.id); } };
  console.log('CrimWorld Sandbox v2.1 — démo Snap (story + DM)');

  // JOUR 1 — tu postes la story SANS stock → les clients DM mais tu rates tout.
  sim.acheterMatiere('hash', 100, 250);
  sim.posterStory();
  jouerJournee();
  printJour(sim.state.dernierMetrics);

  // JOUR 2 — labo propre + story → les clients arrivent et tu les sers.
  sim.produireBatch({ produit: 'hash', grammesRaw: 100, grammesFinis: 80, qualite: 'A' });
  sim.posterStory();
  jouerJournee();
  printJour(sim.state.dernierMetrics);

  // JOUR 3 — labo à l'arrache → réput chute → MOINS de clients le DM.
  sim.produireBatch({ produit: 'hash', grammesRaw: 100, grammesFinis: 120, qualite: 'C' });
  sim.posterStory();
  jouerJournee();
  printJour(sim.state.dernierMetrics);
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('sim.mjs')){
  demo();
}
