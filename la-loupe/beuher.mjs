/* BeuherShit — dispatch / risque / fees (feel beuhereats, marque Loupe). */

export const SEUIL_DISCRET_G = 500; // référence heat / rétrocompat (risque = charge / capG)
export const SEUIL_BUST = 0.45;
export const HEAT_CAP = 100;
export const HEAT_BUST = 15;
export const HEAT_EXPO_K = 6.5;
export const SURGE_K = 0.25; // chaleur gonfle un peu la fee, pas ×1.5
export const PONCTION_SEUIL = 0.72;

export const COURIERS = [
  // capG hard (RT-2). Fees = forfait léger + % du brut (plus de base 18 sur une course à 36).
  // cut = part coursier · feeCap = plafond fraction du pay · base/km = petites primes
  { id: "velib", nm: "Vélib", emoji: "🚲", fiab: 0.88, expo: 0.28, eta: 34,
    base: 1, km: 0.25, cut: 0.08, feeCap: 0.20, feeMin: 1,
    col: "#0aa84f", capG: 500, tip: "500 g · fee ~8%." },
  { id: "tmax", nm: "T-Max", emoji: "🛵", fiab: 0.82, expo: 0.40, eta: 19,
    base: 2, km: 0.3, cut: 0.10, feeCap: 0.22, feeMin: 2,
    col: "#e8902a", capG: 5000, tip: "5 kg · fee ~10%." },
  { id: "gofast", nm: "Go fast", emoji: "🚗", fiab: 0.66, expo: 0.62, eta: 11,
    base: 3, km: 0.35, cut: 0.12, feeCap: 0.25, feeMin: 2,
    col: "#e23b3b", capG: 200000, tip: "200 kg · fee ~12%." },
];

/** Affichage charge / cap (g ou kg). */
export function fmtG(g) {
  if (g == null) return "—";
  if (g >= 1000) {
    const kg = g / 1000;
    return (Number.isInteger(kg) ? String(kg) : kg.toFixed(1)) + " kg";
  }
  return Math.round(g) + " g";
}

export const DEALPOINTS = [
  { id: "ruelle", nm: "Ruelle 12", emoji: "🛣", dist: 4, premium: 1.0 },
  { id: "chantier", nm: "Chantier Nord", emoji: "🚧", dist: 7, premium: 1.05 },
  { id: "campus", nm: "Campus 24/7", emoji: "🎓", dist: 8, premium: 1.10 },
  { id: "marina", nm: "Marina VIP", emoji: "⛵", dist: 12, premium: 1.35 },
];

export const courierById = (id) => COURIERS.find((c) => c.id === id);
export const dealById = (id) => DEALPOINTS.find((d) => d.id === id) || DEALPOINTS[0];

export const surge = (h) => 1 + SURGE_K * (h / HEAT_CAP);
/** Risque = profil × remplissage du véhicule (pas une échelle fixe en g). */
export const runRisk = (c, totalG) => {
  const denom = c.capG != null ? c.capG : SEUIL_DISCRET_G;
  return c.expo * (1 - c.fiab) * (totalG / Math.max(1, denom));
};
export const runBusted = (c, totalG) => {
  if (totalG <= 0) return false;
  if (c.capG != null && totalG > c.capG) return true; // hard cap RT-2
  return runRisk(c, totalG) >= SEUIL_BUST;
};
export const seuilSaisie = (c) => {
  // Au-delà du cap = saisie. Soft (profil) rarement plus bas que le cap avec ces fiab.
  if (c.capG != null) return c.capG;
  const k = c.expo * (1 - c.fiab);
  return k > 0 ? Math.round(SEUIL_BUST * SEUIL_DISCRET_G / k) : Infinity;
};
export const heatExpo = (c, totalG) => {
  const denom = c.capG != null ? c.capG : SEUIL_DISCRET_G;
  return Math.round(c.expo * (totalG / Math.max(1, denom)) * HEAT_EXPO_K * 4);
};
export const ponctionPct = (c) => (c.fiab < PONCTION_SEUIL ? Math.round((PONCTION_SEUIL - c.fiab) * 100) : 0);

export function riskChip(c, totalG) {
  if (!c || totalG === 0) return null;
  if (c.capG != null && totalG > c.capG) return { cls: "hot", txt: "CHAUD — cap" };
  const r = runRisk(c, totalG);
  if (r >= SEUIL_BUST) return { cls: "hot", txt: "CHAUD — saisie" };
  if (r >= SEUIL_BUST * 0.6 || (c.capG != null && totalG > c.capG * 0.75)) {
    return { cls: "mid", txt: "tendu" };
  }
  return { cls: "ok", txt: "discret" };
}

export function feeFor(c, orders, heat) {
  const pay = orders.reduce((a, o) => a + (o.price || 0), 0);
  const stops = Math.max(1, orders.length);
  const dist = orders.reduce((a, o) => a + (dealById(o.deal).dist || 5), 0);
  // Forfait (stops + √distance) + cut% du brut, puis plafond vs pay.
  const flat = c.base * stops + c.km * Math.sqrt(dist);
  const cut = pay * (c.cut ?? 0.1);
  let fee = Math.round((flat + cut) * surge(heat));
  const cap = Math.floor(pay * (c.feeCap ?? 0.25));
  fee = Math.min(fee, Math.max(0, cap));
  return Math.max(c.feeMin ?? 1, fee);
}

export function etaFor(c, orders) {
  const dist = orders.reduce((a, o) => a + (dealById(o.deal).dist || 5), 0) / Math.max(1, orders.length);
  return Math.max(6, Math.round(c.eta * (0.45 + dist / 14)));
}

/** Groupe les commandes assignées par coursier, calcule bust/fee/net. */
export function resolveRuns(assign, orders, heat) {
  const byC = {};
  for (const o of orders) {
    const cid = assign[o.id];
    if (!cid || o.status !== "ready") continue;
    if (!byC[cid]) byC[cid] = [];
    byC[cid].push(o);
  }
  const blocks = [];
  for (const cid of Object.keys(byC)) {
    const c = courierById(cid);
    const list = byC[cid];
    const totalG = list.reduce((a, o) => a + o.g, 0);
    const pay = list.reduce((a, o) => a + o.price, 0);
    const fee = feeFor(c, list, heat);
    const busted = runBusted(c, totalG);
    const hx = heatExpo(c, totalG) + (busted ? HEAT_BUST : 0);
    const pct = ponctionPct(c);
    const afterPonction = busted ? 0 : Math.round(pay * (1 - pct / 100));
    // RT-7 : fee ne peut pas dépasser le brut du run
    const feeClamped = busted ? 0 : Math.min(fee, afterPonction);
    const net = busted ? 0 : Math.max(0, afterPonction - feeClamped);
    const feeExceeds = !busted && fee > afterPonction;
    blocks.push({
      courier: c,
      orders: list,
      totalG,
      pay,
      fee: feeClamped,
      feeRaw: fee,
      feeExceeds,
      busted,
      hx,
      net,
      eta: etaFor(c, list),
      risk: riskChip(c, totalG),
    });
  }
  return blocks;
}
