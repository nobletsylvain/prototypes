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
  PRIX_DEFAUT: {                            // € / sachet par défaut (réglable joueur), PAR QUALITÉ
    C: { 2: 16, 5: 30, 10: 50 },            // savonnette : ~6-8 €/g
    B: { 2: 24, 5: 45, 10: 75 },            // pollen : ~7,5-12 €/g
    A: { 2: 40, 5: 75, 10: 130 },           // népalais : ~13-20 €/g (l'élite paie le prix)
  },
  DEMANDE_FORMAT: [10, 5, 2, 5, 10, 2, 5, 10],     // format voulu (cyclique)
  DEMANDE_QMIN:   ['C', 'C', 'B', 'C', 'A', 'C', 'B', 'C'], // discernement (qualité MINI acceptée)
  CLIENTS_BASE: 12,          // nb de clients/jour à réput 100
  PREMIER_DM_H: 0.4, MARGE_FIN_H: 2,
  CADENCE_JITTER: [0, 0.7, -0.45, 1.0, -0.6, 0.4, -0.3, 0.8],
  REPUT_SERVI: { A: 3, B: 2, C: 1 },   // servir de la qualité fait monter la réput (A > C)
  DROP_REPUT: 4,             // poster un "drop" : coup de buzz social (1×/j, tracé)
  PRIX_MAX_G: { A: 20, B: 12, C: 8 },   // négo : €/g toléré au max, PAR QUALITÉ (l'élite tolère plus cher)
  UPSELL_MAX: 3,             // négo : pas plus de 3× la quantité voulue
  DOWNSELL_TIERS: 1,         // négo : on peut refiler jusqu'à 1 cran SOUS le standard du client
  DECEPTION_REPUT: 5,        // refiler du sous-standard : le client est déçu → réput ↓
  // SENSIBILITÉ AU PRIX — ton positionnement (prix affichés vs marché = PRIX_DEFAUT) pilote la
  // DEMANDE, avec retard. Surcoter = cash tout de suite, mais la clientèle s'effrite (ils vont
  // voir ailleurs) ; casser les prix = moins de marge, mais l'undercut ramène du monde.
  TOLERANCE_PRIX: 0.15,      // ±15 % autour du marché = "au prix du marché" (zone neutre)
  SENS_SURCOTE: 0.8,         // pente de l'érosion de demande au-dessus du marché
  SENS_DECOTE: 0.5,          // pente du gain de demande sous le marché (undercut, rendement < surcote)
  DEMANDE_MOD_MIN: 0.30,     // plancher du multiplicateur de demande (surcote extrême)
  DEMANDE_MOD_MAX: 1.60,     // plafond (l'undercut a un rendement décroissant)
  DEMANDE_INERTIE: 0.5,      // fraction du chemin parcourue/jour vers la cible → "avec retard"
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
  const prixPer = () => C.QUALITES.reduce((o, q) => (o[q] = { ...C.PRIX_DEFAUT[q] }, o), {});  // prix par qualité×format
  const prixZ   = () => ({ hash: prixPer(), weed: prixPer(), neige: prixPer() });

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
    demandeMod: 1,                 // multiplicateur de demande (sensibilité prix), dérive avec retard
    posPrixJour: 0,                // positionnement prix vs marché du menu du jour (écart moyen, ratio)
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
  // ordre de service en NÉGO : d'abord acceptable (>=qMin, du moins cher au plus cher), puis SOUS
  // le standard (downsell, jusqu'à DOWNSELL_TIERS crans en dessous, du plus haut au plus bas).
  function ordreNego(qMin){
    const acc = qualitesAcceptables(qMin);
    const bas = C.QUALITES.filter(q => C.QRANK[q] < C.QRANK[qMin] && C.QRANK[q] >= C.QRANK[qMin] - C.DOWNSELL_TIERS).sort((a, b) => C.QRANK[b] - C.QRANK[a]);
    return [...acc, ...bas];
  }
  // planifie le débit d'un lot {format:count} SANS muter : renvoie le plan {q,f} et la qualité
  // la moins bonne effectivement servie (qLow).
  function planNego(c, lot){
    const ordre = ordreNego(c.qMin);
    const tmp = {}; for (const q of ordre){ tmp[q] = {}; for (const f of C.FORMATS) tmp[q][f] = state.stock[c.produit][q][f]; }
    const plan = []; let qLow = 'A';
    for (const f of C.FORMATS){
      let need = lot[f] || 0;
      for (const q of ordre){ while (need > 0 && tmp[q][f] > 0){ tmp[q][f]--; plan.push({ q, f }); if (C.QRANK[q] < C.QRANK[qLow]) qLow = q; need--; } }
    }
    return { plan, qLow };
  }
  // POSITIONNEMENT PRIX : écart moyen (ratio) de tes prix affichés vs le marché (PRIX_DEFAUT),
  // pondéré par les sachets EN STOCK (= ton offre visible). +0,20 = 20 % au-dessus du marché.
  function positionPrix(){
    let wSum = 0, rSum = 0;
    for (const p of C.PRODUITS){
      if (!state.debloques[p]) continue;
      for (const q of C.QUALITES) for (const f of C.FORMATS){
        const n = state.stock[p][q][f]; if (!n) continue;
        const marche = C.PRIX_DEFAUT[q][f]; if (!marche) continue;
        rSum += ((state.prix[p][q][f] - marche) / marche) * n; wSum += n;
      }
    }
    return wSum ? rSum / wSum : 0;
  }
  // cible du multiplicateur de demande selon l'écart `e` (au-delà de la zone neutre).
  // `eff` est SIGNÉ : >0 = surcote (au-dessus du marché) ⇒ demande < 1 ; <0 = décote (sous le
  // marché) ⇒ demande > 1 (le terme `-SENS_DECOTE*eff` ajoute, car eff est négatif).
  function cibleDemande(e){
    const band = C.TOLERANCE_PRIX;
    let eff = 0;
    if (e > band) eff = e - band; else if (e < -band) eff = e + band;   // part au-delà de la tolérance
    const cible = eff > 0 ? 1 - C.SENS_SURCOTE * eff      // surcote → demande < 1
                : eff < 0 ? 1 - C.SENS_DECOTE * eff       // décote → demande > 1
                : 1;
    return { eff, cible: Math.max(C.DEMANDE_MOD_MIN, Math.min(C.DEMANDE_MOD_MAX, cible)) };
  }
  // fait dériver demandeMod vers la cible du jour AVEC RETARD (inertie) ; renvoie de quoi tracer.
  function majDemande(){
    const e = state.posPrixJour;
    const { eff, cible } = cibleDemande(e);
    state.demandeMod += C.DEMANDE_INERTIE * (cible - state.demandeMod);
    state.demandeMod = Math.max(C.DEMANDE_MOD_MIN, Math.min(C.DEMANDE_MOD_MAX, state.demandeMod));  // borne (sûreté)
    return { e, eff };
  }

  // programme les DM du jour (déterministe) : chaque client veut un FORMAT + a un DISCERNEMENT.
  // La DEMANDE = réput (qualité/standing) × demandeMod (positionnement prix). Capture le menu du jour.
  function programmerJour(debut){
    state.posPrixJour = positionPrix();
    const n = Math.max(0, Math.round(C.CLIENTS_BASE * state.reput / 100 * state.demandeMod));
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

    // POSITIONNEMENT PRIX (UI) : écart moyen vs marché (ratio) de ton offre en stock, + l'effet
    // de demande visé (cible) et l'effet en cours (demandeMod). Demande affichée OPAQUE côté UI.
    positionPrix(){ const e = positionPrix(); return { ecart: e, cible: cibleDemande(e).cible, demandeMod: state.demandeMod }; },

    setPrix(produit, qualite, format, px){
      const t = state.prix[produit] && state.prix[produit][qualite];
      if (!t || !(format in t)) return api;
      t[format] = Math.max(0, Math.round(px));
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
      const montant = state.prix[c.produit][q][c.format];   // prix de la QUALITÉ servie
      state.cash += montant; c.servi = true;
      state.reput = clamp(state.reput + C.REPUT_SERVI[q]);
      state.metricsJour.sachetsVendus += 1;
      state.metricsJour.ventesEUR += montant;
      state.metricsJour.clientsServis++;
      ligne({ ic: '🤝', label: `1× ${c.format}g ${C.QUALITE_NOM[q]} (${q}) → ${DISCERNEMENT[c.qMin]}`, montant, cause: 'client servi via Snap' });
      return montant;
    },

    // pool des qualités négociables (acceptable + downsell), et aperçu (qLow/downsell) — pour l'UI
    negPool(qMin){ return ordreNego(qMin); },
    apercuNego(id, offre){
      const c = state.clientsJour.find(x => x.id === id && x.arrive && !x.servi);
      if (!c) return null;
      const lot = {}; for (const f of C.FORMATS) lot[f] = Math.max(0, Math.round((offre || {})[f] || 0));
      const { qLow } = planNego(c, lot);
      return { qLow, downsell: C.QRANK[qLow] < C.QRANK[c.qMin] };
    },

    // NÉGOCIER : lot `offre` ({2,5,10} counts) à `prix`. Sert la moins bonne qualité ACCEPTABLE
    // d'abord, puis (si tu étires l'offre) DESCEND sous le standard = downsell (réput ↓, plafond
    // €/g de la qualité réellement servie). Accepte si ~ce qu'il voulait (½..UPSELL_MAX×).
    negocier(id, offre, prix){
      const c = state.clientsJour.find(x => x.id === id && x.arrive && !x.servi);
      if (!c) return { ok: false, raison: 'parti' };
      offre = offre || {};
      const pool = ordreNego(c.qMin);
      const lot = {}; let gDonne = 0, nS = 0;
      for (const f of C.FORMATS){
        const k = Math.max(0, Math.round(offre[f] || 0));
        const dispo = pool.reduce((s, q) => s + state.stock[c.produit][q][f], 0);   // acceptable + downsell
        if (k > dispo) return { ok: false, raison: 'pas assez de stock' };
        lot[f] = k; gDonne += k * f; nS += k;
      }
      if (nS <= 0) return { ok: false, raison: 'offre vide' };
      prix = Math.max(0, Math.round(prix));
      const want = c.format;
      if (gDonne < Math.ceil(want * 0.5)) return { ok: false, raison: `pas assez (il voulait ~${want}g)` };
      if (gDonne > want * C.UPSELL_MAX)    return { ok: false, raison: 'il en veut pas autant' };
      const { plan, qLow } = planNego(c, lot);
      if (prix > gDonne * C.PRIX_MAX_G[qLow]) return { ok: false, raison: 'trop cher pour lui' };
      for (const pl of plan) state.stock[c.produit][pl.q][pl.f]--;   // applique le plan
      state.cash += prix; c.servi = true;
      const downsell = C.QRANK[qLow] < C.QRANK[c.qMin];
      state.reput = clamp(state.reput + (downsell ? -C.DECEPTION_REPUT : C.REPUT_SERVI[qLow]));
      state.metricsJour.sachetsVendus += nS;
      state.metricsJour.ventesEUR += prix;
      state.metricsJour.clientsServis++;
      const detail = C.FORMATS.filter(f => lot[f] > 0).map(f => `${lot[f]}×${f}g`).join('+');
      ligne({ ic: downsell ? '🥴' : '🤝', label: `${downsell ? 'Refilé (sous standard)' : 'Négocié'} : ${detail} (${C.QUALITE_NOM[qLow]}) → ${DISCERNEMENT[c.qMin]}`,
        montant: prix, cause: downsell ? 'tu lui as refilé du moins bon — déçu (réput ↓)' : 'deal négocié via Snap' });
      return { ok: true, gDonne, prix, downsell };
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
    // SENSIBILITÉ AU PRIX : le positionnement du menu d'aujourd'hui fait dériver la demande de demain.
    const { e, eff } = majDemande();
    if (eff > 0)
      ligne({ ic: '📉', label: `Tes prix ~${Math.round(e * 100)}% au-dessus du marché`,
        cause: 'des clients sont allés voir un autre plug — la demande s’érode (avec retard)' });
    else if (eff < 0)
      ligne({ ic: '📈', label: `Tu casses les prix (~${Math.round(e * 100)}% sous le marché)`,
        cause: 'le bouche-à-oreille ramène du monde — la demande monte (avec retard)' });
    else if (Math.abs(state.demandeMod - 1) > 0.05)   // au marché, mais l'effet d'anciens prix s'estompe encore
      ligne({ ic: '↩️', label: 'La demande se renormalise',
        cause: state.demandeMod < 1 ? 'tu es revenu au prix du marché — la clientèle perdue revient peu à peu'
                                    : 'tu es revenu au prix du marché — l’afflux d’undercut retombe peu à peu' });
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
      demandeMod: state.demandeMod, posPrix: state.posPrixJour,
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
  console.log(`  — demande ×${s.demandeMod.toFixed(2)} · positionnement prix ${s.posPrix >= 0 ? '+' : ''}${Math.round(s.posPrix * 100)}% vs marché`);
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

  // SENSIBILITÉ AU PRIX — on double les prix C : la demande doit s'éroder AVEC RETARD.
  console.log('\n### Test sensibilité : on SURCOTE (×2 sur le C) — la demande doit s’effriter sur plusieurs jours ###');
  for (const f of C.FORMATS) sim.setPrix('hash', 'C', f, C.PRIX_DEFAUT.C[f] * 2);
  for (let d = 0; d < 4; d++){
    sim.acheterMatiere('hash', 'C', 100, 180).produireBatch({ produit: 'hash', qualite: 'C', grammesRaw: 100, formats: { 2: 8, 5: 6, 10: 3 } });
    jouerJournee();
    const m = sim.state.dernierMetrics;
    console.log(`  J${m.jour - 1} : demande ×${m.demandeMod.toFixed(2)} · servis ${m.clientsServis} · pos ${m.posPrix >= 0 ? '+' : ''}${Math.round(m.posPrix * 100)}%`);
  }

  // ...puis on CASSE les prix (−40 % sur le C) : la demande doit remonter, AVEC RETARD.
  console.log('\n### Test sensibilité : on CASSE les prix (−40 % sur le C) — la demande doit remonter ###');
  for (const f of C.FORMATS) sim.setPrix('hash', 'C', f, Math.round(C.PRIX_DEFAUT.C[f] * 0.6));
  for (let d = 0; d < 4; d++){
    sim.acheterMatiere('hash', 'C', 100, 180).produireBatch({ produit: 'hash', qualite: 'C', grammesRaw: 100, formats: { 2: 8, 5: 6, 10: 3 } });
    jouerJournee();
    const m = sim.state.dernierMetrics;
    console.log(`  J${m.jour - 1} : demande ×${m.demandeMod.toFixed(2)} · servis ${m.clientsServis} · pos ${m.posPrix >= 0 ? '+' : ''}${Math.round(m.posPrix * 100)}%`);
  }
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('sim.mjs')){
  demo();
}
