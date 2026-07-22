/* Shelter — couche territoire sur La Loupe.
   P0 : carte Quartier Nord · 1 planque · 1 PDV · dette front · hit planque.
   Pas de police / soldats / onion — ça vient après. */

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
  /** Prix cash si tu solde avant l'échéance. */
  cashPrice: 200,
  /** Prix crédit / si tu attends l'échéance. */
  creditPrice: 280,
  /** Jours pour rembourser (J1 = jour du front). */
  dueDays: 4,
};

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
    introSeen: false,
    frontActive: false,
    debtDue: 0,       // montant restant à payer
    debtDueDay: 0,    // jour d'échéance
    debtMode: null,   // 'credit' | null (front initial = crédit)
    paidOff: false,
    selectedPin: null,
    mapTipSeen: false,
    // PDV (corner) — point de vente à 3 curseurs, vente par client (file + ledger)
    pdv: { res: 30, bac: 0, advQ: 0, prix: 10, chouffes: 0,
      tampon: {}, tamponQ: 0, queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0 },
  };
}

/** Boot d'ouverture : Karim te file 100 g à crédit. Une seule fois. */
export function grantOpeningFront(S) {
  if (S.shelter?.frontActive || S.shelter?.paidOff || (S.pains && S.pains.length)) {
    return { ok: false, reason: "déjà lancé" };
  }
  if (!S.shelter) S.shelter = shelterDefaults();
  S.pains = [{ g: SUPPLIER.frontG, q: SUPPLIER.frontQ }];
  S.painSel = 0;
  S.shelter.frontActive = true;
  S.shelter.debtDue = SUPPLIER.creditPrice;
  S.shelter.debtDueDay = (S.day || 1) + SUPPLIER.dueDays - 1;
  S.shelter.debtMode = "credit";
  S.shelter.introSeen = true;
  return {
    ok: true,
    msg: `${SUPPLIER.name} · +${SUPPLIER.frontG} g · rembourse ${SUPPLIER.creditPrice} avant J${S.shelter.debtDueDay} (cash tôt = ${SUPPLIER.cashPrice}).`,
  };
}

/** Solde la dette en propre uniquement (Karim refuse le liquide non trié).
    early = avant échéance → tarif cash ; sinon tarif crédit. */
export function repayDebt(S) {
  if (!S.shelter?.frontActive || S.shelter.debtDue <= 0) {
    return { ok: false, reason: "Rien à rembourser." };
  }
  const early = (S.day || 1) < S.shelter.debtDueDay;
  const price = early ? SUPPLIER.cashPrice : S.shelter.debtDue;
  if (S.cash < price) {
    return {
      ok: false,
      reason: early
        ? `Il te faut ${price} propre (tarif cash). Trie tes liasses.`
        : `Il te faut ${price} propre.`,
    };
  }
  S.cash -= price;
  S.shelter.frontActive = false;
  S.shelter.debtDue = 0;
  S.shelter.paidOff = true;
  S.shelter.debtMode = null;
  return { ok: true, paid: price, early };
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
  if (S.shelter?.frontActive) {
    const left = S.shelter.debtDueDay - (S.day || 1);
    if (left === 1) {
      cons.push({ t: `${SUPPLIER.name} te rappelle`, c: `Échéance demain · ${S.shelter.debtDue} (cash tôt encore dispo aujourd'hui)` });
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
  if (!S.shelter?.frontActive) return null;
  const left = S.shelter.debtDueDay - (S.day || 1);
  return {
    name: SUPPLIER.name,
    due: S.shelter.debtDue,
    cashEarly: SUPPLIER.cashPrice,
    day: S.shelter.debtDueDay,
    left,
    canEarly: left > 0,
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
