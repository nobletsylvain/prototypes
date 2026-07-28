/* Shelter — couche territoire sur La Loupe.
   P0 : carte Quartier Nord · 1 planque · 1 PDV · dette front · hit planque.
   Pas de police / soldats / onion — ça vient après. */

/* La dette Karim est EN SOMMEIL, pas supprimée.
   Pourquoi : `repayDebt` exige du PROPRE (S.cash), et la trieuse liquide→propre est
   coupée (SORTER_ENABLED=false dans index.html). S.cash n'a donc aucune source in-game.
   Une dette armée serait donc IMPAYABLE, et `nightTick` la fait enfler indéfiniment
   (+8 chaleur, −6 standing, ×1,15 tous les 2 jours) : une boucle de punition sans
   sortie, c'est-à-dire R1 violé de la pire façon.
   Ce drapeau bloque l'ARMEMENT et l'ESCALADE sans effacer debtDue/debtDueDay : le jour
   où le propre retrouve une source, on repasse à true et l'état repart où il en était. */
export const FRONT_ENABLED = false;

/** Pins en % de la carte (x,y = centre du pin). Calés sur le fond quartier-nord. */
export const PINS = {
  planque: {
    id: "planque",
    x: 42, y: 46,
    kind: "planque",
    title: "Ta planque",
    blurb: "Cage du R+3 · pains, barrettes, sachets. Plus c'est plein, plus ça chauffe.",
  },
  pdv: {
    id: "pdv",
    x: 48, y: 58,
    kind: "pdv",
    title: "Le corner",
    blurb: "Le spot que Karim t'a filé. Tu vitrines ici — les clients arrivent en DM.",
  },
  /* Chez Karim. Avant que l'Appro s'ouvre, c'est la SEULE source de matière (arbitrage
     Sylvain, 2026-07-28). Il n'est pas un menu déguisé : il vend plus cher que le marché
     — c'est le prix de ne pas avoir encore les contacts — et c'est en le faisant tourner
     qu'on les obtient. */
  karim: {
    id: "karim",
    x: 26, y: 30,
    kind: "karim",
    title: "Chez Karim",
    blurb: "Arrière-boutique, rideau à moitié tiré. C'est lui qui t'a lancé — et pour l'instant, c'est lui qui te fournit.",
  },
  rival: {
    id: "rival",
    x: 64, y: 38,
    kind: "rival",
    title: "Le gros",
    blurb: "Il tient l'autre bout. Pour l'instant il te regarde. Plus tard, il bougera.",
    locked: true,
  },
  rail: {
    id: "rail",
    x: 82, y: 16,
    kind: "info",
    title: "Les voies",
    blurb: "Les grosses livraisons passent par là. Pas encore ton problème.",
    locked: true,
  },
};

export const SUPPLIER = {
  name: "Karim",
  handle: "@karim_bloc",
  /** Front d'ouverture : 100 g, à rembourser. */
  frontG: 100,
  frontQ: 55,
  /** Prix unique du front, en propre. Pas de rabais « cash tôt ». */
  price: 280,
  /** Jours pour rembourser Karim (J1 = jour du front). */
  dueDays: 4,
  /* Ce qu'il vend, en LIQUIDE, avant que l'Appro s'ouvre. Même gabarit que le front :
     100 g à q55. Son prix (`price`) est celui du front — 280 pour 100 g, contre 200 au
     marché : +40 %. Ce n'est pas une punition, c'est ce que coûte de n'avoir qu'un seul
     fournisseur (R9 — la friction se paie au niveau système, pas au geste). */
  buyG: 100,
  buyQ: 55,
  /** Achats chez lui avant qu'il te passe le contact et que l'Appro s'ouvre. [PLACEHOLDER] */
  unlockAfter: 3,
};

/** L'Appro est-elle ouverte ? Avant, tout passe par Karim. */
export function approOuverte(S) {
  return (S.karimBuys || 0) >= SUPPLIER.unlockAfter;
}
/** Ce qu'il reste à lui acheter avant le contact (0 = c'est ouvert). */
export function approReste(S) {
  return Math.max(0, SUPPLIER.unlockAfter - (S.karimBuys || 0));
}

/** Hit planque : 0–100, déterministe.
    Monte avec grammes stockés et « valeur » (qualité × g). Cap planque saturée = plus chaud. */
export function stashHit(S, planqueCap) {
  const g = stockG(S);
  if (g <= 0) return 0;
  const fill = Math.min(1, g / Math.max(1, planqueCap));
  const q = Math.max(40, Math.round(S.sachetQ || S.barQ || 55));
  const valuePressure = Math.min(1, (g * q) / (planqueCap * 70));
  // fill pèse plus que la valeur — une cage pleine attire, même en bas de gamme
  return Math.round(clamp(fill * 55 + valuePressure * 35 + (fill > 0.85 ? 10 : 0), 0, 100));
}

export function stockG(S) {
  const pains = (S.pains || []).reduce((a, p) => a + (p.g || 0), 0);
  const bars = Object.entries(S.bars || {}).reduce((a, [f, n]) => a + n * +f, 0);
  const sachets = Object.entries(S.sachets || {}).reduce((a, [f, n]) => a + n * +f, 0);
  return pains + bars + sachets;
}

export function shelterDefaults() {
  return {
    // On démarre directement dans la core loop (indépendant) : on coupe notre plaquette,
    // on écoule au corner (négo), on garde la marge, on rachète. Pas de tuto, pas de Phase A.
    // ("phase" conservé pour un éventuel palier futur ; "B" = la boucle de base.)
    phase: "B",
    introSeen: true,
    frontActive: false,
    debtDue: 0,       // montant restant à payer
    debtDueDay: 0,    // jour d'échéance
    debtMode: null,   // 'credit' | null (front initial = crédit)
    paidOff: false,
    selectedPin: null,
    mapTipSeen: false,
    /* Les corners sont PLURIELS depuis le début, même quand il n'y en a qu'un.
       Le jeu n'en connaissait qu'un seul (`shelter.pdv`), ce qui rendait impossible
       tout ce qui suit : une sacoche qui tourne entre deux points, un charbonneur qui
       tient l'un pendant que tu es à l'autre, et le choix « lequel je ravitaille, lequel
       j'encaisse ce soir ». Avec un point de vente unique, une rotation n'est pas une
       rotation, c'est une navette. */
    corners: { pdv: cornerDefaults() },
    cornerId: "pdv",          // celui qu'on regarde
  };
}

/** L'état d'UN corner. `combo` = chaîne de deals JUSTE de la soirée, remis à 1 à la clôture. */
/* Les compteurs de la soirée EN COURS, par corner. Remis à zéro à la clôture.
   Pourquoi ici et pas déduits du journal : le journal est plafonné à 50 entrées, donc
   ses totaux seraient faux dès qu'une soirée dépasse 50 événements — et une soirée en
   dépasse. Un bilan qui ne boucle pas est un mensonge : il vaut mieux compter à la
   source, là où le montant est déjà en main, que reconstituer après coup. */
export function soirDefaults() {
  return { eur: 0, g: 0, tips: 0, servis: 0,
    perdu: { rupture: 0, ruptureEur: 0, impat: 0, impatEur: 0, walk: 0, walkEur: 0 },
    descente: { n: 0, eur: 0 } };
}
export function cornerDefaults(over) {
  return { res: 30, bac: 0, advQ: 0, prix: 10, chouffes: 0,
    tampon: {}, tamponQ: 0, queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1,
    charbonneur: null,        // qui le tient quand tu n'y es pas (null = personne)
    soir: soirDefaults(),     // compteurs de la soirée en cours (cf. soirDefaults)
    ...(over || {}) };
}

/** Boot d'ouverture : Karim te file 100 g à crédit. Une seule fois. */
export function grantOpeningFront(S) {
  if (!FRONT_ENABLED) return { ok: false, reason: "front en sommeil (pas de circuit de remboursement)" };
  if (S.shelter?.frontActive || S.shelter?.paidOff || (S.pains && S.pains.length)) {
    return { ok: false, reason: "déjà lancé" };
  }
  if (!S.shelter) S.shelter = shelterDefaults();
  S.pains = [{ g: SUPPLIER.frontG, q: SUPPLIER.frontQ }];
  S.painSel = 0;
  S.shelter.frontActive = true;
  S.shelter.debtDue = SUPPLIER.price;
  S.shelter.debtDueDay = (S.day || 1) + SUPPLIER.dueDays - 1;
  S.shelter.debtMode = "credit";
  S.shelter.introSeen = true;
  return {
    ok: true,
    msg: `${SUPPLIER.name} · +${SUPPLIER.frontG} g · rembourse ${SUPPLIER.price} propre avant J${S.shelter.debtDueDay}.`,
  };
}

/** Solde la dette en propre uniquement (Karim refuse le liquide non trié).
    Prix unique (280) ; pas de rabais avant l'échéance. */
export function repayDebt(S) {
  if (!S.shelter?.frontActive || S.shelter.debtDue <= 0) {
    return { ok: false, reason: "Rien à rembourser." };
  }
  const price = S.shelter.debtDue;
  if (S.cash < price) {
    return { ok: false, reason: `Il te faut ${price} propre. Trie tes liasses.` };
  }
  S.cash -= price;
  S.shelter.frontActive = false;
  S.shelter.debtDue = 0;
  S.shelter.paidOff = true;
  S.shelter.debtMode = null;
  return { ok: true, paid: price };
}

/** Tick de fin de soirée : rappel dette + hit planque → chaleur douce. */
export function nightTick(S, planqueCap) {
  const cons = [];
  const hit = stashHit(S, planqueCap);
  // hit planque → chaleur rue (co-effet parallèle, pas une chaîne ventes→heat)
  if (hit >= 70) {
    const add = hit >= 90 ? 4 : 2;
    S.heat = clamp((S.heat || 0) + add, 0, 100);
    cons.push({ t: `Planque chaude (${hit})`, c: `+${add} chaleur ↩ stock ${Math.round(stockG(S))} g` });
  }
  // FRONT_ENABLED : coupe aussi l'escalade sur les saves déjà porteurs d'une dette
  // armée par une version antérieure (la migration `{...shelterDefaults(), ...S.shelter}`
  // la fait survivre). L'état est conservé, il cesse simplement d'enfler.
  if (FRONT_ENABLED && S.shelter?.frontActive) {
    const left = S.shelter.debtDueDay - (S.day || 1);
    if (left === 1) {
      cons.push({ t: `${SUPPLIER.name} te rappelle`, c: `Échéance demain · ${S.shelter.debtDue} propre` });
    } else if (left <= 0) {
      // pénalité soft : +chaleur + standing −, dette gonfle un cran
      S.heat = clamp((S.heat || 0) + 8, 0, 100);
      S.reput = clamp((S.reput || 0) - 6, 0, 100);
      S.shelter.debtDue = Math.round(S.shelter.debtDue * 1.15);
      S.shelter.debtDueDay = (S.day || 1) + 2;
      cons.push({ t: `${SUPPLIER.name} est pas content`, c: `Retard · dette → ${S.shelter.debtDue} · +chaleur · standing −` });
    }
  }
  return { hit, cons };
}

export function hitLabel(h) {
  if (h < 20) return { txt: "calme", cls: "ok" };
  if (h < 45) return { txt: "visible", cls: "mid" };
  if (h < 70) return { txt: "chaud", cls: "mid" };
  if (h < 90) return { txt: "brûlant", cls: "hot" };
  return { txt: "grille", cls: "hot" };
}

export function debtStrip(S) {
  // en sommeil : on n'affiche pas une dette que le joueur n'a aucun moyen de solder
  if (!FRONT_ENABLED || !S.shelter?.frontActive) return null;
  const left = S.shelter.debtDueDay - (S.day || 1);
  return {
    name: SUPPLIER.name,
    due: S.shelter.debtDue,
    day: S.shelter.debtDueDay,
    left,
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
