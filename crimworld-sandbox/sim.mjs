/* =======================================================================
   CrimWorld — Sandbox · CŒUR DE SIMULATION v2.2 (stock = sachets par format)

   Boucle : RÉASSORT (darkweb) → LABO (sachets conditionnés par format) →
   INVENTAIRE (nb de sachets 2g/5g/10g) → VITRINE (tu fixes un PRIX par format,
   persistante) → les CLIENTS te DM pour UN format précis → tu vends 1 sachet à
   ton prix. À sec sur un format → rupture (ça t'apprend à produire le bon mix).

   JS pur, sans DOM, déterministe, inspectable console.
   INVARIANTS : aucun Math.random ne pilote l'ÉTAT/une CONSÉQUENCE (arrivées,
   format demandé = déterministes ; pseudo/avatar = présentation, côté UI) ;
   chaque conséquence porte une `cause` lisible ; réput affichée OPAQUE ;
   l'équilibre vit dans UNE courbe (nb de clients ∝ réput). Le PRIX est un levier
   joueur (sa marge ; sensibilité au prix = couche suivante).
   ======================================================================= */

export const C = {
  HOUR_MS: 6000,             // rythme playtest : 1 h de jeu = 6 s réelles (journée ≈ 2,4 min)
  DAY_HOURS: 24,
  LOYER_JOUR: 40,            // frais de base du block (compteur de fond) — tunable
  PRODUITS: ['hash', 'weed', 'neige'],
  FORMATS: [2, 5, 10],       // tailles de sachet (g) — alignées sur les bacs du labo
  PRIX_DEFAUT: { 2: 16, 5: 30, 10: 50 },   // € / sachet par défaut (ajustable par le joueur)
  DEMANDE_FORMAT: [10, 5, 2, 5, 10, 2, 5, 10],  // format demandé par client (cyclique, déterministe)
  CLIENTS_BASE: 12,          // nb de clients/jour à réput 100 (si la vitrine est ouverte)
  PREMIER_DM_H: 0.4,         // 1er DM ~0,4 h après ouverture (≈ 2,4 s) — feedback quasi immédiat
  MARGE_FIN_H: 2,            // dernier DM ~2 h avant minuit → le temps de le servir
  CADENCE_JITTER: [0, 0.7, -0.45, 1.0, -0.6, 0.4, -0.3, 0.8],  // décalage déterministe (h) → cadence irrégulière
  REPUT_PROPRE: 6,           // une coupe propre fait monter la demande
  REPUT_ARRACHE: -25,        // une coupe à l'arrache la fait fuir
};

export function jaugeOpaque(v, max, sym = '•', plein = '🔥'){
  const n = Math.max(0, Math.min(5, Math.round((v / max) * 5)));
  return plein.repeat(Math.max(1, Math.ceil(n / 2))) + ' ' + sym.repeat(n);
}

export function createSim(){
  const z       = () => ({ hash: 0, weed: 0, neige: 0 });              // grammes par produit (matière)
  const parFmt  = () => C.FORMATS.reduce((o, f) => (o[f] = 0, o), {});  // sachets par format
  const stockZ  = () => ({ hash: parFmt(), weed: parFmt(), neige: parFmt() });
  const prixZ   = () => ({ hash: { ...C.PRIX_DEFAUT }, weed: { ...C.PRIX_DEFAUT }, neige: { ...C.PRIX_DEFAUT } });

  const state = {
    jour: 1, heure: 0, cash: 0, loyerDu: 0,
    reput: 50,                     // demande (opaque)
    matiere: z(),                  // g de matière première (réassort)
    stock: stockZ(),               // sachets prêts à vendre, PAR FORMAT
    prix: prixZ(),                 // € par sachet et par format (levier joueur)
    batches: [],
    debloques: { hash: true, weed: false, neige: false },
    vitrine: false,                // vitrine EN VENTE — persiste jour après jour
    clientsJour: [],               // clients programmés pour la journée (déterministe)
    clientSeq: 0,
    metricsJour: newJour(),
    metrics: [],
    dernierMetrics: null,
  };

  function newJour(){ return { achatsEUR: 0, ventesEUR: 0, sachetsVendus: 0, clientsServis: 0, lignes: [] }; }
  function ligne(o){ state.metricsJour.lignes.push(o); }
  const clamp = v => Math.max(0, Math.min(100, v));
  const stockTotalG = p => C.FORMATS.reduce((s, f) => s + f * state.stock[p][f], 0);  // info (g équivalents)

  // programme les DM clients d'une journée (déterministe) à partir de l'heure `debut`.
  // nb ∝ réput (la courbe unique) ; chaque client veut UN format (cyclique).
  function programmerJour(debut){
    const n = Math.round(C.CLIENTS_BASE * state.reput / 100);
    const first = debut + C.PREMIER_DM_H;
    const last  = Math.max(first, C.DAY_HOURS - C.MARGE_FIN_H);
    for (let i = 0; i < n; i++){
      const base = n > 1 ? first + (last - first) * i / (n - 1) : first;  // étalement uniforme
      const j = C.CADENCE_JITTER[i % C.CADENCE_JITTER.length];            // décalage déterministe
      state.clientsJour.push({
        id: ++state.clientSeq,
        produit: 'hash',                                 // produit actif (généralisé plus tard)
        format: C.DEMANDE_FORMAT[i % C.DEMANDE_FORMAT.length],
        heureArrivee: Math.max(first, Math.min(last, base + j)),          // cadence irrégulière
        arrive: false, servi: false,
      });
    }
    return n;
  }

  const api = {
    state,
    debloquer(produit){ state.debloques[produit] = true; return api; },

    // VITRINE : fixer le prix d'un format (€ / sachet). C'est TA marge.
    setPrix(produit, format, px){
      if (!state.prix[produit] || !(format in state.prix[produit])) return api;
      state.prix[produit][format] = Math.max(0, Math.round(px));
      return api;
    },

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

    // LABO : un proto (iframe) renvoie un BATCH conditionné = des SACHETS par format.
    // formats = { 2: n, 5: n, 10: n } ; grammesRaw = matière réellement coupée (anti free-mint).
    produireBatch({ produit, grammesRaw, qualite, formats }){
      if (!state.debloques[produit]) return api;
      formats = formats || {};
      const nSachets = C.FORMATS.reduce((s, f) => s + (formats[f] || 0), 0);
      // anti free-mint : pas de batch sans matière coupée, ni sans sachets
      if (grammesRaw <= 0 || nSachets <= 0 || state.matiere[produit] < grammesRaw) return api;
      state.matiere[produit] -= grammesRaw;
      for (const f of C.FORMATS) state.stock[produit][f] += (formats[f] || 0);
      state.batches.push({ produit, formats: { ...formats }, qualite, jour: state.jour });
      state.reput = clamp(state.reput + (qualite === 'A' ? C.REPUT_PROPRE : C.REPUT_ARRACHE));
      const detail = C.FORMATS.filter(f => formats[f] > 0).map(f => `${formats[f]}×${f}g`).join(' · ');
      ligne({ ic: '⚗️', label: `Batch ${produit} : ${detail} (${qualite === 'A' ? 'propre' : 'arrache'})`,
        cause: qualite === 'A' ? 'sorti propre du labo' : 'coupé à l’arrache au labo' });
      return api;
    },

    // SNAP : ouvrir la vitrine. Persiste jour après jour (plus de story quotidienne) —
    // ton stock reste en vente jusqu'à épuisement ; reprogrammée auto à minuit.
    ouvrirVitrine(){
      if (state.vitrine) return api;
      state.vitrine = true;
      const n = programmerJour(state.heure);
      ligne({ ic: '🟢', label: 'Vitrine en vente', cause: 'tes sachets sont en ligne — les clients DM jusqu’à épuisement' });
      if (n === 0) ligne({ ic: '🦗', label: 'Personne ne DM', cause: 'réput trop basse — ta came n’attire pas' });
      return api;
    },

    // les DM en attente (clients arrivés, pas encore servis) — pour l'UI
    dmEnAttente(){ return state.clientsJour.filter(c => c.arrive && !c.servi); },

    // SERVIR un client : vend 1 SACHET du format qu'il demande, à ton prix.
    servir(id){
      const c = state.clientsJour.find(x => x.id === id && x.arrive && !x.servi);
      if (!c) return 0;
      if (state.stock[c.produit][c.format] <= 0) return 0;   // rupture sur CE format
      state.stock[c.produit][c.format] -= 1;
      const montant = state.prix[c.produit][c.format];
      state.cash += montant;
      c.servi = true;
      state.metricsJour.sachetsVendus += 1;
      state.metricsJour.ventesEUR += montant;
      state.metricsJour.clientsServis++;
      ligne({ ic: '🤝', label: `1× ${c.format}g ${c.produit} vendu`, montant, cause: 'client servi via Snap' });
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
    // clients non servis = ventes ratées. RUPTURE (plus de sachet de leur format)
    // vs IGNORÉ (le format était dispo, tu n'as pas répondu) — chaque cause tracée.
    const rates    = state.clientsJour.filter(c => !c.servi);
    const ruptures = rates.filter(c => state.stock[c.produit][c.format] <= 0);
    const ignores  = rates.filter(c => state.stock[c.produit][c.format] >  0);
    if (ignores.length)
      ligne({ ic: '📭', label: `${ignores.length} DM ignorés`, cause: 'le format était en stock — tu n’as pas répondu' });
    if (ruptures.length)
      ligne({ ic: '📉', label: `${ruptures.length} clients non servis`, cause: 'rupture — plus de sachet du format demandé' });
    state.cash    -= C.LOYER_JOUR;         // frais prélevés sur la caisse
    state.loyerDu += C.LOYER_JOUR;         // cumul des frais (info)
    ligne({ ic: '💸', label: 'Frais du block', montant: -C.LOYER_JOUR,
      cause: 'faut graisser pour bosser sur le block' });
    const snap = snapshot();
    state.metrics.push(snap);
    state.dernierMetrics = snap;
    state.jour++;
    state.metricsJour = newJour();
    state.clientsJour = [];
    if (state.vitrine) programmerJour(0);   // vitrine persistante : on reprogramme le jour suivant
  }

  function snapshot(){
    const m = state.metricsJour;
    const stockCopy = {};
    for (const p of C.PRODUITS) stockCopy[p] = { ...state.stock[p] };
    return {
      jour: state.jour,
      achatsEUR: m.achatsEUR, ventesEUR: m.ventesEUR,
      net: m.lignes.reduce((s, l) => s + (l.montant || 0), 0),
      sachetsVendus: m.sachetsVendus, clientsServis: m.clientsServis,
      cash: state.cash, loyerDu: state.loyerDu,
      stock: stockCopy, stockGhash: stockTotalG('hash'), matiere: { ...state.matiere },
      reputOpaque: jaugeOpaque(state.reput, 100),
      lignes: m.lignes.slice(),
    };
  }

  return api;
}

/* =======================================================================
   DÉMO CONSOLE — stock par sachets + prix par format, sur 3 jours.
   Lancer : node crimworld-sandbox/sim.mjs
   ======================================================================= */
function printJour(s){
  console.log(`\n=== METRICS — JOUR ${s.jour} ===`);
  for (const l of s.lignes){
    const m = l.montant ? (l.montant > 0 ? ` +${l.montant}€` : ` ${l.montant}€`) : '';
    console.log(`  ${l.ic} ${l.label}${m}\n       ↳ ${l.cause}`);
  }
  console.log(`  — net ${s.net >= 0 ? '+' : ''}${s.net}€ · caisse ${s.cash}€ · sachets vendus ${s.sachetsVendus} · clients servis ${s.clientsServis}`);
  console.log(`  — stock hash 2g·${s.stock.hash[2]} 5g·${s.stock.hash[5]} 10g·${s.stock.hash[10]} · réput ${s.reputOpaque}`);
}

export function demo(){
  const sim = createSim();
  const H = C.HOUR_MS;
  const jouerJournee = () => { for (let h = 0; h < C.DAY_HOURS; h++){ sim.tick(H); for (const c of sim.dmEnAttente()) sim.servir(c.id); } };
  console.log('CrimWorld Sandbox v2.2 — démo stock par sachets + prix par format');

  // JOUR 1 — vitrine ouverte SANS stock → les clients DM mais tu rates tout.
  sim.acheterMatiere('hash', 100, 250);
  sim.ouvrirVitrine();                     // une seule fois : reste en vente
  jouerJournee();
  printJour(sim.state.dernierMetrics);

  // JOUR 2 — labo propre : un mix de sachets → les clients (auto) arrivent et tu sers.
  sim.produireBatch({ produit: 'hash', grammesRaw: 100, qualite: 'A', formats: { 2: 8, 5: 6, 10: 3 } });
  jouerJournee();
  printJour(sim.state.dernierMetrics);

  // JOUR 3 — labo à l'arrache → réput chute → MOINS de clients (toujours pas de re-post).
  sim.acheterMatiere('hash', 100, 250);
  sim.produireBatch({ produit: 'hash', grammesRaw: 100, qualite: 'C', formats: { 2: 4, 5: 4, 10: 6 } });
  jouerJournee();
  printJour(sim.state.dernierMetrics);
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('sim.mjs')){
  demo();
}
