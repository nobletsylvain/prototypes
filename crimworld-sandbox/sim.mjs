/* =======================================================================
   CrimWorld — Sandbox · CŒUR DE SIMULATION v2.3 (qualité sourcée au darkweb)

   Boucle : DARKWEB (tiers de QUALITÉ gatés par ta réput) → LABO (le mini-jeu du
   style produit des SACHETS qui gardent la qualité) → INVENTAIRE (sachets par
   QUALITÉ × FORMAT) → VITRINE (prix par format) → les CLIENTS te DM pour un
   format, avec un DISCERNEMENT (schlag / habitué / connaisseur). On sert
   AUTOMATIQUEMENT la moins bonne qualité acceptable → le bon produit reste pour
   les connaisseurs, le "pneu" part aux schlags.

   JS pur, sans DOM, déterministe, inspectable console.
   INVARIANTS : aucun Math.random ne pilote l'ÉTAT/une CONSÉQUENCE (arrivées,
   format/discernement demandés = déterministes ; pseudo/avatar = présentation UI) ;
   chaque conséquence porte une `cause` lisible ; réput affichée OPAQUE ; la demande
   vit sur UNE courbe (nb de clients ∝ réput) ; le PRIX et la QUALITÉ SOURCÉE sont
   les leviers joueur. La réput monte en servant de la qualité (servir du A > du C).
   ======================================================================= */

export const C = {
  HOUR_MS: 6000,             // rythme playtest : 1 h de jeu = 6 s réelles (journée ≈ 2,4 min)
  DAY_HOURS: 24,
  LOYER_JOUR: 40,            // frais de base du block — tunable
  PRODUITS: ['hash', 'weed', 'neige'],
  FORMATS: [2, 5, 10],       // tailles de sachet (g)
  QUALITES: ['A', 'B', 'C'], // A haut · B milieu · C bas
  QRANK: { A: 3, B: 2, C: 1 },
  QUALITE_NOM: { A: 'népalais', B: 'pollen', C: 'savonnette' },   // lexique/style (hash)
  // tiers du darkweb : matière par qualité, GATÉE par la réput (standing réseau).
  REASSORT_TIERS: [
    { q: 'C', nom: 'Savonnette marocaine (coupée)', g: 100, px: 180, gate: 0,  ds: '« pneu » · bas de gamme' },
    { q: 'B', nom: 'Pollen jaune',                   g: 100, px: 340, gate: 55, ds: 'milieu de gamme' },
    { q: 'A', nom: 'Népalais (carambar)',            g: 50,  px: 520, gate: 75, ds: 'haut de gamme · connaisseurs' },
  ],
  PRIX_DEFAUT: { 2: 16, 5: 30, 10: 50 },   // € / sachet par défaut (réglable joueur)
  DEMANDE_FORMAT: [10, 5, 2, 5, 10, 2, 5, 10],     // format voulu (cyclique)
  DEMANDE_QMIN:   ['C', 'C', 'B', 'C', 'A', 'C', 'B', 'C'], // discernement (qualité MINI acceptée)
  CLIENTS_BASE: 12,          // nb de clients/jour à réput 100
  PREMIER_DM_H: 0.4, MARGE_FIN_H: 2,
  CADENCE_JITTER: [0, 0.7, -0.45, 1.0, -0.6, 0.4, -0.3, 0.8],
  REPUT_SERVI: { A: 3, B: 2, C: 1 },   // servir de la qualité fait monter la réput (A > C)
  DROP_REPUT: 4,             // poster un "drop" : coup de buzz social (1×/j, tracé)
  PRIX_MAX_G: 8,             // négo : €/g toléré au max
  UPSELL_MAX: 3,             // négo : pas plus de 3× la quantité voulue
};

export const DISCERNEMENT = { C: 'schlag', B: 'habitué', A: 'connaisseur' };   // libellé (présentation)

export function jaugeOpaque(v, max, sym = '•', plein = '🔥'){
  const n = Math.max(0, Math.min(5, Math.round((v / max) * 5)));
  return plein.repeat(Math.max(1, Math.ceil(n / 2))) + ' ' + sym.repeat(n);
}

export function createSim(){
  const parFmt  = () => C.FORMATS.reduce((o, f) => (o[f] = 0, o), {});
  const parQual = () => C.QUALITES.reduce((o, q) => (o[q] = parFmt(), o), {});     // sachets : qualité→format
  const gQual   = () => C.QUALITES.reduce((o, q) => (o[q] = 0, o), {});            // matière (g) par qualité
  const matZ    = () => ({ hash: gQual(), weed: gQual(), neige: gQual() });
  const stockZ  = () => ({ hash: parQual(), weed: parQual(), neige: parQual() });
  const prixZ   = () => ({ hash: { ...C.PRIX_DEFAUT }, weed: { ...C.PRIX_DEFAUT }, neige: { ...C.PRIX_DEFAUT } });

  const state = {
    jour: 1, heure: 0, cash: 0, loyerDu: 0,
    reput: 50,                     // demande + standing réseau (opaque)
    matiere: matZ(),               // g de matière première, PAR QUALITÉ (réassort)
    stock: stockZ(),               // sachets prêts à vendre, PAR QUALITÉ × FORMAT
    prix: prixZ(),                 // € par sachet et par format (levier joueur)
    batches: [],
    debloques: { hash: true, weed: false, neige: false },
    vitrine: false,
    dropAujourdhui: false,
    clientsJour: [],
    clientSeq: 0,
    metricsJour: newJour(),
    metrics: [],
    dernierMetrics: null,
  };

  function newJour(){ return { achatsEUR: 0, ventesEUR: 0, sachetsVendus: 0, clientsServis: 0, lignes: [] }; }
  function ligne(o){ state.metricsJour.lignes.push(o); }
  const clamp = v => Math.max(0, Math.min(100, v));
  const gateDe = q => (C.REASSORT_TIERS.find(t => t.q === q) || { gate: 0 }).gate;

  // qualités acceptables par un client de discernement qMin, du MOINS bon (rang bas) au meilleur.
  const qualitesAcceptables = qMin => C.QUALITES.filter(q => C.QRANK[q] >= C.QRANK[qMin]).sort((a, b) => C.QRANK[a] - C.QRANK[b]);
  // qualité à servir : la moins bonne acceptable dont on a un sachet de ce format (préserve le bon).
  function qServie(produit, format, qMin){
    for (const q of qualitesAcceptables(qMin)) if (state.stock[produit][q][format] > 0) return q;
    return null;
  }
  // programme les DM du jour (déterministe) : chaque client veut un FORMAT + a un DISCERNEMENT.
  function programmerJour(debut){
    const n = Math.round(C.CLIENTS_BASE * state.reput / 100);
    const first = debut + C.PREMIER_DM_H;
    const last  = Math.max(first, C.DAY_HOURS - C.MARGE_FIN_H);
    for (let i = 0; i < n; i++){
      const base = n > 1 ? first + (last - first) * i / (n - 1) : first;
      const j = C.CADENCE_JITTER[i % C.CADENCE_JITTER.length];
      state.clientsJour.push({
        id: ++state.clientSeq,
        produit: 'hash',
        format: C.DEMANDE_FORMAT[i % C.DEMANDE_FORMAT.length],
        qMin:   C.DEMANDE_QMIN[i % C.DEMANDE_QMIN.length],
        heureArrivee: Math.max(first, Math.min(last, base + j)),
        arrive: false, servi: false,
      });
    }
    return n;
  }

  const api = {
    state,
    debloquer(produit){ state.debloques[produit] = true; return api; },
    tiersReassort(){ return C.REASSORT_TIERS.map(t => ({ ...t, dispo: state.reput >= t.gate })); },

    setPrix(produit, format, px){
      if (!state.prix[produit] || !(format in state.prix[produit])) return api;
      state.prix[produit][format] = Math.max(0, Math.round(px));
      return api;
    },

    // RÉASSORT (darkweb) : matière première d'une QUALITÉ donnée. Gatée par la réput.
    acheterMatiere(produit, qualite, grammes, prixTotal, cause){
      if (!state.debloques[produit] || !C.QUALITES.includes(qualite)) return api;
      if (state.reput < gateDe(qualite)) return api;          // tier verrouillé
      state.cash -= prixTotal;
      state.matiere[produit][qualite] += grammes;
      state.metricsJour.achatsEUR += prixTotal;
      ligne({ ic: '📦', label: `Réassort : +${grammes}g ${C.QUALITE_NOM[qualite]} (${qualite})`, montant: -prixTotal,
        cause: cause || 'acheté au semi-grossiste (darkweb)' });
      return api;
    },

    // LABO : le proto renvoie des SACHETS par format, pour une QUALITÉ (= la matière traitée).
    produireBatch({ produit, qualite, grammesRaw, formats }){
      if (!state.debloques[produit] || !C.QUALITES.includes(qualite)) return api;
      formats = formats || {};
      const nSachets = C.FORMATS.reduce((s, f) => s + (formats[f] || 0), 0);
      if (grammesRaw <= 0 || nSachets <= 0 || state.matiere[produit][qualite] < grammesRaw) return api;  // anti free-mint
      state.matiere[produit][qualite] -= grammesRaw;
      for (const f of C.FORMATS) state.stock[produit][qualite][f] += (formats[f] || 0);
      state.batches.push({ produit, qualite, formats: { ...formats }, jour: state.jour });
      const detail = C.FORMATS.filter(f => formats[f] > 0).map(f => `${formats[f]}×${f}g`).join(' · ');
      ligne({ ic: '⚗️', label: `Batch ${C.QUALITE_NOM[qualite]} (${qualite}) : ${detail}`,
        cause: 'conditionné au labo' });
      return api;
    },

    ouvrirVitrine(){
      if (state.vitrine) return api;
      state.vitrine = true;
      const n = programmerJour(state.heure);
      ligne({ ic: '🟢', label: 'Vitrine en vente', cause: 'tes sachets sont en ligne — les clients DM jusqu’à épuisement' });
      if (n === 0) ligne({ ic: '🦗', label: 'Personne ne DM', cause: 'réput trop basse — ta came n’attire pas' });
      return api;
    },

    posterDrop(){
      if (state.dropAujourdhui) return api;
      state.dropAujourdhui = true;
      state.reput = clamp(state.reput + C.DROP_REPUT);
      ligne({ ic: '🔥', label: 'Drop posté', cause: 'ton arrivage a buzzé sur le feed — la demande monte' });
      return api;
    },

    dmEnAttente(){ return state.clientsJour.filter(c => c.arrive && !c.servi); },

    // pour l'UI : quelle qualité serait servie à ce client (ou null si rupture sur son standard)
    qualiteServie(c){ return qServie(c.produit, c.format, c.qMin); },

    // SERVIR : vend 1 sachet du format demandé, à la MOINS bonne qualité acceptable. Réput ∝ qualité.
    servir(id){
      const c = state.clientsJour.find(x => x.id === id && x.arrive && !x.servi);
      if (!c) return 0;
      const q = qServie(c.produit, c.format, c.qMin);
      if (!q) return 0;                                  // rupture sur son standard (rien d'acceptable dans ce format)
      state.stock[c.produit][q][c.format] -= 1;
      const montant = state.prix[c.produit][c.format];
      state.cash += montant; c.servi = true;
      state.reput = clamp(state.reput + C.REPUT_SERVI[q]);
      state.metricsJour.sachetsVendus += 1;
      state.metricsJour.ventesEUR += montant;
      state.metricsJour.clientsServis++;
      ligne({ ic: '🤝', label: `1× ${c.format}g ${C.QUALITE_NOM[q]} (${q}) → ${DISCERNEMENT[c.qMin]}`, montant, cause: 'client servi via Snap' });
      return montant;
    },

    // NÉGOCIER : lot `offre` ({2,5,10} counts) à `prix`. Sert la moins bonne qualité acceptable
    // par format (déterministe). Accepte si ~ce qu'il voulait (½..UPSELL_MAX×) à ≤ PRIX_MAX_G €/g.
    negocier(id, offre, prix){
      const c = state.clientsJour.find(x => x.id === id && x.arrive && !x.servi);
      if (!c) return { ok: false, raison: 'parti' };
      offre = offre || {};
      const acc = qualitesAcceptables(c.qMin);
      const lot = {}; let gDonne = 0, nS = 0;
      for (const f of C.FORMATS){
        const k = Math.max(0, Math.round(offre[f] || 0));
        const dispo = acc.reduce((s, q) => s + state.stock[c.produit][q][f], 0);   // toutes qualités acceptables
        if (k > dispo) return { ok: false, raison: 'pas assez de stock (qualité acceptable)' };
        lot[f] = k; gDonne += k * f; nS += k;
      }
      if (nS <= 0) return { ok: false, raison: 'offre vide' };
      prix = Math.max(0, Math.round(prix));
      const want = c.format;
      if (gDonne < Math.ceil(want * 0.5)) return { ok: false, raison: `pas assez (il voulait ~${want}g)` };
      if (gDonne > want * C.UPSELL_MAX)    return { ok: false, raison: 'il en veut pas autant' };
      if (prix > gDonne * C.PRIX_MAX_G)    return { ok: false, raison: 'trop cher pour lui' };
      // débit : pour chaque format, on pioche la moins bonne qualité acceptable d'abord.
      let qLow = 'A';
      for (const f of C.FORMATS){
        let need = lot[f];
        for (const q of acc){ while (need > 0 && state.stock[c.produit][q][f] > 0){ state.stock[c.produit][q][f]--; need--; if (C.QRANK[q] < C.QRANK[qLow]) qLow = q; } }
      }
      state.cash += prix; c.servi = true;
      state.reput = clamp(state.reput + C.REPUT_SERVI[qLow]);
      state.metricsJour.sachetsVendus += nS;
      state.metricsJour.ventesEUR += prix;
      state.metricsJour.clientsServis++;
      const detail = C.FORMATS.filter(f => lot[f] > 0).map(f => `${lot[f]}×${f}g`).join('+');
      ligne({ ic: '🤝', label: `Négocié : ${detail} (${C.QUALITE_NOM[qLow]}) → ${DISCERNEMENT[c.qMin]}`, montant: prix, cause: 'deal négocié via Snap' });
      return { ok: true, gDonne, prix };
    },

    tick(dtMs){
      state.heure += dtMs / C.HOUR_MS;
      for (const c of state.clientsJour) if (!c.arrive && c.heureArrivee <= state.heure) c.arrive = true;
      while (state.heure >= C.DAY_HOURS){ state.heure -= C.DAY_HOURS; cloreJour(); }
      return api;
    },

    metricsDuJour(){ return snapshot(); },
  };

  function cloreJour(){
    // clients non servis : RUPTURE (rien d'acceptable dans leur format) vs IGNORÉ (dispo, pas répondu).
    const rates    = state.clientsJour.filter(c => !c.servi);
    const ruptures = rates.filter(c => qServie(c.produit, c.format, c.qMin) == null);
    const ignores  = rates.filter(c => qServie(c.produit, c.format, c.qMin) != null);
    if (ignores.length)
      ligne({ ic: '📭', label: `${ignores.length} DM ignorés`, cause: 'tu avais de quoi les servir — pas répondu' });
    if (ruptures.length)
      ligne({ ic: '📉', label: `${ruptures.length} clients non servis`, cause: 'rupture — rien d’assez bien dans le format demandé' });
    state.cash    -= C.LOYER_JOUR;
    state.loyerDu += C.LOYER_JOUR;
    ligne({ ic: '💸', label: 'Frais du block', montant: -C.LOYER_JOUR, cause: 'faut graisser pour bosser sur le block' });
    const snap = snapshot();
    state.metrics.push(snap);
    state.dernierMetrics = snap;
    state.jour++;
    state.metricsJour = newJour();
    state.clientsJour = [];
    state.dropAujourdhui = false;
    if (state.vitrine) programmerJour(0);
  }

  function snapshot(){
    const m = state.metricsJour;
    const stockCopy = {}, matCopy = {};
    for (const p of C.PRODUITS){
      stockCopy[p] = {}; for (const q of C.QUALITES) stockCopy[p][q] = { ...state.stock[p][q] };
      matCopy[p] = { ...state.matiere[p] };
    }
    return {
      jour: state.jour,
      achatsEUR: m.achatsEUR, ventesEUR: m.ventesEUR,
      net: m.lignes.reduce((s, l) => s + (l.montant || 0), 0),
      sachetsVendus: m.sachetsVendus, clientsServis: m.clientsServis,
      cash: state.cash, loyerDu: state.loyerDu,
      stock: stockCopy, matiere: matCopy,
      reputOpaque: jaugeOpaque(state.reput, 100),
      lignes: m.lignes.slice(),
    };
  }

  return api;
}

/* =======================================================================
   DÉMO CONSOLE — qualité sourcée + clients à discernement.
   Lancer : node crimworld-sandbox/sim.mjs
   ======================================================================= */
function totFmt(s, p, f){ return C.QUALITES.reduce((a, q) => a + s.stock[p][q][f], 0); }
function printJour(s){
  console.log(`\n=== METRICS — JOUR ${s.jour} ===`);
  for (const l of s.lignes){
    const m = l.montant ? (l.montant > 0 ? ` +${l.montant}€` : ` ${l.montant}€`) : '';
    console.log(`  ${l.ic} ${l.label}${m}\n       ↳ ${l.cause}`);
  }
  const st = q => C.FORMATS.map(f => `${f}g·${s.stock.hash[q][f]}`).join(' ');
  console.log(`  — net ${s.net >= 0 ? '+' : ''}${s.net}€ · caisse ${s.cash}€ · sachets ${s.sachetsVendus} · réput ${s.reputOpaque}`);
  console.log(`  — stock A[${st('A')}] B[${st('B')}] C[${st('C')}]`);
}

export function demo(){
  const sim = createSim();
  const H = C.HOUR_MS;
  const jouerJournee = () => { for (let h = 0; h < C.DAY_HOURS; h++){ sim.tick(H); for (const c of sim.dmEnAttente()) sim.servir(c.id); } };
  console.log('CrimWorld Sandbox v2.3 — démo qualité (darkweb tiers + discernement)');
  console.log('tiers dispo à réput 50 :', sim.tiersReassort().filter(t => t.dispo).map(t => t.q).join(',') || 'aucun');

  // JOUR 1 — que de la savonnette (C) : tu sers les schlags, mais les habitués/connaisseurs ruptent.
  sim.acheterMatiere('hash', 'C', 100, 180);
  sim.produireBatch({ produit: 'hash', qualite: 'C', grammesRaw: 100, formats: { 2: 8, 5: 6, 10: 3 } });
  sim.ouvrirVitrine();
  for (let d = 0; d < 3; d++){ if (d) sim.acheterMatiere('hash', 'C', 100, 180).produireBatch({ produit: 'hash', qualite: 'C', grammesRaw: 100, formats: { 2: 8, 5: 6, 10: 3 } });
    sim.posterDrop(); jouerJournee(); }
  printJour(sim.state.dernierMetrics);
  console.log('réput après 3 j de C + drops → tiers dispo :', sim.tiersReassort().filter(t => t.dispo).map(t => t.q).join(','));

  // débloque B (pollen) si la réput a assez monté, sert les habitués.
  if (sim.tiersReassort().find(t => t.q === 'B').dispo){
    sim.acheterMatiere('hash', 'B', 100, 340);
    sim.produireBatch({ produit: 'hash', qualite: 'B', grammesRaw: 100, formats: { 2: 6, 5: 6, 10: 4 } });
    sim.posterDrop(); jouerJournee();
    printJour(sim.state.dernierMetrics);
  }
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('sim.mjs')){
  demo();
}
