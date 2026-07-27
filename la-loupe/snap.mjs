/* SnapShit — moteur de demande (story → DM → commandes).
   Conséquences déterministes. Math.random = présentation uniquement. */
// MÊME suffixe de version que index.html : sans lui, `./corner.mjs` et
// `./corner.mjs?v=33` sont deux URL distinctes, donc DEUX instances du module.
import { menuAt, personaById, rueCalibre, RUE_MIN } from "./corner.mjs?v=33";
export const SC = {
  EXPO_INIT: 10, EXPO_PAR_DROP: 30, EXPO_PAR_VITRINE: 12, EXPO_DECAY: 0.72, EXPO_CAP: 100,
  EXPO_SEUIL_MAUVAIS_PUBLIC: 60, EXPO_DELAI_MAUVAIS_PUBLIC: 2,
  FLAKE_BASE: 0.10, FLAKE_PAR_SUREXPO: 0.12, FLAKE_DECAY: 0.85,
  DROP_QUAL_PROMISE: { premium: 88, normal: 66 },
  DROP_SPIKE: 22, CRY_WOLF_SEUIL_ECART: 18, CRY_WOLF_DELAI: 2, CRY_WOLF_AMPLEUR: 16,
  CREDIBILITE_DECAY: 0.55, CREDIBILITE_REGAIN: 0.12,
  REPUT_PENTE_HAUSSE: 0.14, REPUT_PENTE_BAISSE: 0.30, REPUT_MAX: 100,
  PRIX_FAIR: 10, LOWBALL_FACTOR: 0.55,
  // Formats = sachets atelier uniquement (2/5/8). Jamais 3/4/etc. (incombinables exacts).
  DOSE_FORMATS: [2, 5, 8],
  QTY_GENUINE: [2, 5, 8],
  QTY_LOWBALL: [8, 16, 24], // multiples des formats (qtyToSachets exact)
  FLAKE_PAR_BRADAGE: 0.07, BRADE_DELAI: 2,
  GROSSISTE_SEUIL_EXPO: 45, GROSSISTE_FACTOR: 0.7,
  GROSSISTE_QTY_BASE: 24, GROSSISTE_QTY_STEP: 24, GROSSISTE_QTY_CAP: 72, GROSSISTE_EXPO_COST: 14,
};

const NAMES = [
  "Karim", "Inès", "Momo", "Sofia", "Yaz", "Lina", "Paul", "Nora",
  "Riton", "Zoé", "Sami", "Chloé", "Diego", "Aya", "Lou", "Nassim",
];
const VIBES = {
  genuine: [
    "J'ai vu ta story. Tu as encore du stock ?",
    "Le drop m'intéresse. Dis-moi ce que tu as.",
    "Propre, silencieux, rapide. Je prends.",
    "Toujours le même créneau. Toujours pressé.",
  ],
  lowball: [
    "Gros volume. Tu casses le prix ou je passe ailleurs.",
    "À ce tarif je prends le triple. Sinon non.",
    "Tout le monde brade en ce moment. Aligne-toi.",
  ],
  grossiste: [
    "On parle volume. Remise, et je reviens.",
    "Je vide ton stock si le prix suit.",
  ],
  accro: [
    "J'ai besoin maintenant. Pas demain. Maintenant.",
    "Tu réponds ou je perds la nuit.",
  ],
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pick(arr, i) { return arr[((i % arr.length) + arr.length) % arr.length]; }
function rnd(arr) { return arr[(Math.random() * arr.length) | 0]; } // présentation

export function snapDefaults() {
  return {
    expo: SC.EXPO_INIT,
    credibilite: 1,
    flake: SC.FLAKE_BASE,
    promesse: null,
    posteAujourdhui: false,
    dms: [],
    pendingCryWolf: [],
    pendingBadPublic: [],
    comtesseState: "idle",
    storyFlash: [],
    dayTally: { sold: 0, brade: 0, volume: 0, cash: 0, soldG: 0, soldQSum: 0 },
  };
}

/** Qualité réellement écoulée ce jour (RT-6). Fallback stock si rien vendu. */
export function deliveredQuality(S, fallbackQ) {
  const g = S.dayTally?.soldG || 0;
  if (g <= 0) return fallbackQ;
  return (S.dayTally.soldQSum || 0) / g;
}

export function toneFromReput(r) {
  if (r >= 72) return "chaleureux";
  if (r >= 45) return "neutre";
  if (r >= 25) return "mefi";
  return "hostile";
}

export function posterVitrine(S, kind) {
  S.posteAujourdhui = true;
  if (kind === "vitrine") S.expo = clamp(S.expo + SC.EXPO_PAR_VITRINE, 0, SC.EXPO_CAP);
  else {
    S.promesse = { jour: S.day, niveau: kind, qualPromise: SC.DROP_QUAL_PROMISE[kind] };
    S.expo = clamp(S.expo + SC.EXPO_PAR_DROP, 0, SC.EXPO_CAP);
  }
  const flash = [];
  const n = kind === "vitrine" ? 2 : 4;
  for (let i = 0; i < n; i++) {
    flash.push({
      nm: pick(NAMES, S.day * 7 + i + S.expo),
      txt: kind === "vitrine"
        ? rnd(["Il est en ligne.", "Vu.", "Le feed tourne.", "Discret, ça marche."])
        : rnd(["Il a drop.", "Je fonce.", "Story chaude.", "Le quartier a vu."]),
    });
  }
  S.storyFlash = flash;
  return flash;
}

function pushDM(list, id, kind, qty, ppu, msg, tag, nm) {
  list.push({ id, kind, qty, ppu, msg, tag, nm, status: "pending" });
}

export function buildDMs(S, good, bad, peakExpo) {
  const list = [];
  const ppuG = Math.max(4, Math.round(SC.PRIX_FAIR * (0.6 + S.reput / 120)));
  const ppuL = Math.max(3, Math.round(ppuG * SC.LOWBALL_FACTOR));
  let seq = S.orderSeq || 1;

  // Accro toujours là
  // Le prix du DM suit le MÊME barème volume que le corner (une seule échelle dans
  // tout le jeu) : la grosse portion est moins chère au gramme. Sans ça les deux
  // canaux annonceraient des tarifs contradictoires sur la même marchandise.
  const qAccro = pick(SC.QTY_GENUINE, S.day);
  pushDM(list, "dm" + (seq++), "accro", qAccro, Math.max(3, Math.round(menuAt(ppuG, qAccro))),
    pick(VIBES.accro, S.day), "ACCRO", "L'Accro");

  for (let i = 0; i < good; i++) {
    const nm = pick(NAMES, S.day * 3 + i);
    const qG = pick(SC.QTY_GENUINE, S.day + i);
    pushDM(list, "dm" + (seq++), "genuine", qG, Math.max(3, Math.round(menuAt(ppuG, qG))),
      pick(VIBES.genuine, S.day + i), "CLIENT", nm);
  }
  for (let i = 0; i < bad; i++) {
    const nm = pick(NAMES, S.day * 5 + i + 11);
    pushDM(list, "dm" + (seq++), "lowball", pick(SC.QTY_LOWBALL, S.day + i), ppuL,
      pick(VIBES.lowball, S.day + i), "LOWBALL", nm);
  }
  /* Le gros passe par ICI et nulle part ailleurs (arbitrage Sylvain, 2026-07-26) :
     il n'entre plus dans la file du corner, il écrit. Deux verrous distincts, deux
     gestes différents — le CALIBRE que tu coupes puis annonces ouvre la porte
     (checkUnlocks / rueGate), le BUZZ que tu postes fait sonner le téléphone. */
  const diego = personaById("diego");
  const ouvert = S.clients && S.clients.diego && S.clients.diego.unlocked;
  if (ouvert && peakExpo >= SC.GROSSISTE_SEUIL_EXPO) {
    // La quantité suit le calibre annoncé : composable PAR CONSTRUCTION depuis tes
    // sachets (c'est ce que tu coupes), et le volume du gros devient la conséquence
    // du geste qui a ouvert la porte. L'ancienne échelle saturait à 72 g dès
    // l'apparition — QTY_BASE/STEP ne produisaient aucune variation — et 72 g était
    // parfois inservable (un stock tout en 5 g ne compose pas 72).
    const cal = rueCalibre(S.rueMax || RUE_MIN);
    const n = Math.max(2, Math.min(SC.GROSSISTE_QTY_CAP / cal, 2 + Math.floor(peakExpo / 25)));
    const vol = Math.max(cal, Math.round(n) * cal);
    // une seule échelle de prix dans tout le jeu : menuAt, comme accro et genuine
    const ppuV = Math.max(4, Math.round(menuAt(ppuG, vol)));
    const tx = (diego && diego.bank && diego.bank.arrive)
      ? pick(diego.bank.arrive, S.day) : pick(VIBES.grossiste, S.day);
    pushDM(list, "dm" + (seq++), "grossiste", vol, ppuV, tx, "GROSSISTE",
      diego ? diego.nm : "Le Grossiste");
  }
  // Comtesse si standing haut
  if (S.reput >= 70 || S.comtesseState === "fan") {
    pushDM(list, "dm" + (seq++), "genuine", 5, Math.round(ppuG * 1.25),
      "Du premium. Je paie le prix. Ne me déçois pas.", "COMTESSE", "La Comtesse");
  }

  S.orderSeq = seq;
  return list;
}

/* LA table d'accessibilité : quels montants (0..cap) se composent EXACTEMENT
   depuis un stock de barrettes, et par quelle taille les atteindre.

   L'ancienne version mémorisait UNE seule représentation par montant (un `break`
   après la première taille faisable) : c'était un glouton déguisé en DP. Contre-
   exemple exécuté — depuis {3,4,5,7,7,8}, elle déclarait 21 g impossible alors que
   3+4+7+7 = 21. Un faux négatif coûte une vente que le stock pouvait servir, donc
   une perte sèche (R1), et la sacoche composée à la main rend les stocks hétérogènes
   la norme : le défaut passe de théorique à quotidien.

   Ici : knapsack borné EXACT, une passe par taille, en retenant pour chaque montant
   le NOMBRE MINIMAL d'unités de la taille courante nécessaires pour l'atteindre.
   C'est la formulation classique, et elle est complète — plus de faux négatif. */
function atteignables(sachets, cap) {
  const sizes = Object.keys(sachets).map(Number)
    .filter((f) => f > 0 && (sachets[f] || 0) > 0).sort((a, b) => b - a);
  const reach = new Array(cap + 1).fill(false);
  const from = new Array(cap + 1).fill(0);   // taille par laquelle on atteint ce montant
  reach[0] = true;
  for (const f of sizes) {
    const dispo = sachets[f];
    const used = new Array(cap + 1).fill(-1);
    for (let a = 0; a <= cap; a++) {
      if (reach[a]) { used[a] = 0; continue; }              // déjà atteint sans cette taille
      if (a >= f && used[a - f] >= 0 && used[a - f] < dispo) { used[a] = used[a - f] + 1; from[a] = f; }
    }
    for (let a = 0; a <= cap; a++) if (used[a] >= 0) reach[a] = true;
  }
  return { sizes, reach, from };
}

/* Remonte le chemin d'un montant atteignable vers son plan {taille: nombre}. */
function planDe(montant, sizes, from) {
  const plan = Object.fromEntries(sizes.map((f) => [f, 0]));
  let a = montant;
  while (a > 0 && from[a] > 0) { plan[from[a]] = (plan[from[a]] || 0) + 1; a -= from[a]; }
  return plan;
}

/** Map qty grammes → sachets en stock (tailles libres, fixées à la coupe).
    Exact match only (jamais sur-livrer). Repose sur `atteignables` : une
    combinaison exacte est trouvée dès qu'elle existe. */
export function qtyToSachets(qty, sachets) {
  const cap = Math.max(0, Math.floor(qty || 0));
  const { sizes, reach, from } = atteignables(sachets, cap);
  let best = cap;
  while (best > 0 && !reach[best]) best--;
  return { plan: planDe(best, sizes, from), covered: best, short: cap - best, exact: best === cap };
}

/* Toutes les quantités EXACTEMENT composables depuis un tampon, jusqu'à `max`.
   La DP de `qtyToSachets` calcule déjà cet ensemble (`dp[a] !== null`) et le jette.
   L'exposer permet au stepper de négo de ne proposer que du servable : le joueur
   voit physiquement le bord de son stock, et la « rupture partielle » devient
   inatteignable sur la route négociée au lieu d'être un échec silencieux. */
export function composables(sachets, max) {
  const cap = Math.max(0, Math.floor(max || 0));
  const { reach } = atteignables(sachets, cap);
  const out = [];
  for (let a = 1; a <= cap; a++) if (reach[a]) out.push(a);
  return out;
}

/* LE mouvement de barrettes, dans les deux sens : planque ⇄ sacoche exposée.
   Une seule fonction pour exposer et pour rentrer, parce que c'est la même opération
   et que la dupliquer, c'est dupliquer le risque de perdre un gramme. Conservation
   garantie par construction : on décrémente la source et on incrémente la
   destination du MÊME compteur, jamais de conversion en grammes au milieu.
   Retourne ce qui a réellement bougé — la source peut être plus courte que demandé. */
export function deplacerBarrettes(src, dst, format, n) {
  const f = Math.round(format);
  const veut = Math.max(0, Math.round(n || 0));
  let k = 0;
  while (k < veut && (src[f] || 0) > 0) {
    src[f]--;
    if (src[f] <= 0) delete src[f];
    dst[f] = (dst[f] || 0) + 1;
    k++;
  }
  return { n: k, g: k * f };
}

/* Rentrer un lot de barrettes du tampon exposé vers la planque (évacuation ARAH).
   Vit ICI, dans un module, et pas dans index.html : c'est le geste où une erreur de
   conservation coûterait le plus cher, et un test qui recopierait la boucle ne
   prouverait rien. Le jeu l'appelle, les invariants l'importent — une seule source.

   Barrettes ENTIÈRES. Retirer des grammes puis n'en réinjecter qu'une partie ferait
   de l'évacuation un geste qui CRÉE la perte qu'il prétend éviter — R1 à l'envers.

   Les GROSSES d'abord : le lot est borné (8 barrettes/tap), donc l'ordre décide de ce
   qu'on abandonne aux stups. « Les petites d'abord » sauvait le plus grand NOMBRE de
   barrettes et laissait dehors les plus chères — un joueur qui tape sans réfléchir
   perdait exactement ce qu'il avait de plus précieux. On sauve la VALEUR.

   Une seule boucle de mouvement dans tout le jeu : `deplacerBarrettes`. Deux boucles
   qui font le même geste, c'est deux fois le risque de perdre un gramme. */
export function evacuerLot(tampon, sachets, lot) {
  const tailles = Object.keys(tampon).map(Number)
    .filter((f) => f > 0 && tampon[f] > 0).sort((a, b) => b - a);
  let n = 0, g = 0;
  for (const f of tailles) {
    if (n >= lot) break;
    const r = deplacerBarrettes(tampon, sachets, f, lot - n);
    n += r.n; g += r.g;
  }
  return { n, g };
}

export function applySachetPlan(sachets, plan) {
  for (const f of Object.keys(plan)) {
    sachets[f] -= plan[f] || 0;
    if (!(sachets[f] > 0)) delete sachets[f];
  }
}

/**
 * Accepter un DM → ordre ready pour BeuherShit (PAS de cash immédiat).
 * Retourne { ok, order?, reason?, heatExtra? }
 */
export function acceptDM(S, dmId, mode /* sell|brade|volume */) {
  const d = S.dms.find((x) => x.id === dmId && x.status === "pending");
  if (!d) return { ok: false, reason: "Message déjà traité." };

  let qty = d.qty;
  let ppu = d.ppu;
  if (mode === "brade") ppu = Math.max(3, Math.round(ppu * 0.75));
  if (mode === "volume" && d.kind !== "grossiste") {
    // garder une qty emballable en 2/5/8
    qty = Math.min(40, qty * 2);
    if (qty % 2 !== 0) qty -= 1;
    ppu = Math.max(3, Math.round(ppu * 0.8));
  }

  const { plan, covered, short, exact } = qtyToSachets(qty, S.sachets);
  if (!exact || covered !== qty) {
    return {
      ok: false,
      reason: short > 0
        ? `Stock exact requis : ${qty} g (il manque ${short} g).`
        : "Formats incompatibles — dose le bon poids.",
    };
  }

  // Side-effects UNIQUEMENT après validation stock (RT-5)
  if (mode === "brade") S.dayTally.brade++;
  if (d.kind === "grossiste" || mode === "volume") {
    S.expo = clamp(S.expo + SC.GROSSISTE_EXPO_COST, 0, SC.EXPO_CAP);
    S.dayTally.volume += qty;
  }

  applySachetPlan(S.sachets, plan);
  const used = Object.keys(plan).map(Number).filter((f) => plan[f] > 0).sort((a, b) => b - a);
  const g = used.reduce((a, f) => a + plan[f] * f, 0);
  const price = Math.round(qty * ppu); // jamais facturer plus que la demande
  d.status = "sold";
  S.dayTally.sold++;
  S.dayTally.cash += price;
  S.dayTally.soldG = (S.dayTally.soldG || 0) + g;
  S.dayTally.soldQSum = (S.dayTally.soldQSum || 0) + g * (S.sachetQ || 60);

  const order = {
    id: "o" + S.orderSeq++,
    client: d.nm,
    vibe: d.msg,
    format: used[0] || 2,
    qty: used.reduce((a, f) => a + plan[f], 0),
    plan,
    g,
    price,
    q: S.sachetQ || 60,
    status: "ready",
    from: "snap",
    kind: d.kind,
    deal: pick(["ruelle", "chantier", "campus", "marina"], S.day + S.orderSeq),
  };

  let heatExtra = 0;
  if (d.kind === "grossiste") heatExtra = 2;

  return { ok: true, order, short: 0, heatExtra };
}

export function refuseDM(S, dmId) {
  const d = S.dms.find((x) => x.id === dmId && x.status === "pending");
  if (!d) return;
  d.status = "refused";
  if (d.kind === "genuine" || d.kind === "accro") S.reput = clamp(S.reput - 1, 0, SC.REPUT_MAX);
}

/** Clôture soirée Snap : cry-wolf, mauvais public, nouvelle demande. */
export function passerSoiree(S, qualLivree) {
  const cons = [];
  // cry-wolf due
  S.pendingCryWolf = (S.pendingCryWolf || []).filter((ev) => {
    if (ev.due !== S.day) return true;
    S.reput = clamp(S.reput - ev.ampleur, 0, SC.REPUT_MAX);
    cons.push({ k: "bad", t: "Cry-wolf", c: `Tu avais hypé « ${ev.niveau} ». La confiance descend.` });
    if (ev.niveau === "premium") S.comtesseState = "partie";
    return false;
  });
  S.pendingBadPublic = (S.pendingBadPublic || []).filter((ev) => {
    if (ev.due !== S.day) return true;
    S.flake = clamp(S.flake + ev.ampleur, 0, 0.9);
    cons.push({ k: "warn", t: "Mauvais public", c: "Le buzz d'hier ramène les mauvais clients." });
    return false;
  });

  if (S.promesse) {
    const ecart = S.promesse.qualPromise - qualLivree;
    if (ecart > SC.CRY_WOLF_SEUIL_ECART) {
      S.pendingCryWolf.push({
        due: S.day + SC.CRY_WOLF_DELAI, ampleur: SC.CRY_WOLF_AMPLEUR,
        niveau: S.promesse.niveau, jourPromesse: S.promesse.jour,
      });
      S.credibilite = clamp(S.credibilite * SC.CREDIBILITE_DECAY, 0.05, 1);
      cons.push({ k: "warn", t: "Promesse trahie", c: `Bombe à retardement J${S.day + SC.CRY_WOLF_DELAI}.` });
    } else {
      S.credibilite = clamp(S.credibilite + SC.CREDIBILITE_REGAIN, 0.05, 1);
      if (S.promesse.niveau === "premium") S.comtesseState = "fan";
      cons.push({ k: "good", t: "Promesse tenue", c: "Le spike se convertit." });
    }
    S.promesse = null;
  }

  if (S.expo > SC.EXPO_SEUIL_MAUVAIS_PUBLIC) {
    S.pendingBadPublic.push({ due: S.day + SC.EXPO_DELAI_MAUVAIS_PUBLIC, ampleur: SC.FLAKE_PAR_SUREXPO });
    cons.push({ k: "warn", t: "Au-dessus du radar", c: "Payoff maintenant, flakes plus tard." });
  }

  const expoAvant = S.expo;
  S.expo = clamp(S.expo * SC.EXPO_DECAY, 0, SC.EXPO_CAP);
  S.flake = clamp(SC.FLAKE_BASE + (S.flake - SC.FLAKE_BASE) * SC.FLAKE_DECAY, SC.FLAKE_BASE, 0.9);

  const er = qualLivree - S.reput;
  S.reput = clamp(S.reput + (er >= 0 ? SC.REPUT_PENTE_HAUSSE : SC.REPUT_PENTE_BAISSE) * er, 0, SC.REPUT_MAX);

  if (S.dayTally.brade > 0) {
    S.pendingBadPublic.push({
      due: S.day + SC.BRADE_DELAI,
      ampleur: clamp(SC.FLAKE_PAR_BRADAGE * S.dayTally.brade, 0, 0.4),
    });
  }

  const spike = S.posteAujourdhui ? Math.round(SC.DROP_SPIKE * S.credibilite) : 0;
  const dmGood = Math.max(0, Math.round(S.reput / 14 + expoAvant / 22 + spike / 8));
  const dmBad = Math.round(dmGood * S.flake);
  S.dms = buildDMs(S, dmGood, dmBad, expoAvant);
  S.posteAujourdhui = false;
  S.dayTally = { sold: 0, brade: 0, volume: 0, cash: 0, soldG: 0, soldQSum: 0 };
  S.storyFlash = [];

  cons.push({
    k: dmGood > 0 ? "good" : "warn",
    t: "Demande demain",
    c: `${dmGood} acheteurs (${dmBad} flakes).${spike ? ` Spike +${spike}.` : ""}`,
  });
  return cons;
}
