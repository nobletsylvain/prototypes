// La Plaza — la simulation pure.
//
// Ce proto teste UNE hypothèse, et rien d'autre :
//
//     « Est-ce qu'un punto disputé rend le choix de destination vivant ? »
//
// El Patrón (le proto précédent) a une chaîne complète mais personne en face :
// ses puntos saturent tout seuls. Ici on enlève la chaîne — production
// abstraite, une seule monnaie, pas de blanchiment — pour ne garder que la
// question. Si le conflit sur une destination ne suffit pas à créer une
// décision, le PvP économique n'a pas de fondations, et on l'aura su sans avoir
// écrit un serveur.
//
// Trois principes tenus par les invariants :
//
//   1. R4 — DÉTERMINISME, y compris pour les rivaux. Leur politique est une
//      fonction de l'état, écrite en toutes lettres à l'écran. Aucun tirage,
//      aucune « IA » opaque : le joueur doit pouvoir prédire leur prochain coup.
//   2. ON SE BAT POUR UN DÉBIT, PAS POUR UN BUTIN. Tenir une plaza ne prend
//      rien à personne : ça prélève un PÉAGE sur ce que les autres y font
//      passer. Le perdant continue de jouer et de produire — il te paie.
//   3. LE CONFLIT CHAUFFE LES DEUX CAMPS. Une plaza disputée monte en tension,
//      la tension nourrit la chaleur de ceux qui y passent, et le troisième
//      cartel — celui qui est ailleurs — encaisse la mise.

export const SAVE_VERSION = 1;

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPS
   ═══════════════════════════════════════════════════════════════════════════ */

export const TICK_MS = 200;
export const SECONDES_PAR_JOUR = 10;         // 1 jour de jeu = 10 s réelles en ×1
export const JOUR_PAR_MS = 1 / (SECONDES_PAR_JOUR * 1000);
export const VITESSES = [0, 1, 3];
export const DT_MAX_JOURS = 2;
export const SAISON_JOURS = 120;             // la saison se termine, on compare les caisses

/* ═══════════════════════════════════════════════════════════════════════════
   LES TROIS CARTELS
   Le joueur et deux rivaux. Les politiques rivales sont DÉTERMINISTES et
   affichées : c'est ce qui les distingue d'une IA, et ce qui permet au joueur
   de jouer contre elles plutôt que de les subir.
   ═══════════════════════════════════════════════════════════════════════════ */

export const FACTIONS = {
  joueur:   { nom: "Toi",         court: "TOI", couleur: "#E8A33D" },
  aguilas:  { nom: "Los Águilas", court: "ÁGU", couleur: "#C8442F",
              devise: "Prend toujours la plaza la plus rentable, quitte à payer le péage." },
  familia:  { nom: "La Familia",  court: "FAM", couleur: "#3E7CC2",
              devise: "Évite le conflit : va toujours vers la plaza la moins tendue." },
};
export const RIVAUX = ["aguilas", "familia"];
export const TOUS = ["joueur", ...RIVAUX];

/* ═══════════════════════════════════════════════════════════════════════════
   LES PLAZAS
   ═══════════════════════════════════════════════════════════════════════════ */

export const PUNTOS = {
  frontera: { nom: "Paso del Norte", prix: 14_000, capacite:  60, emo: "🛂",
              desc: "Le poste-frontière. Le meilleur prix, donc celui que tout le monde veut." },
  puerto:   { nom: "Puerto Viejo",   prix:  9_000, capacite: 150, emo: "⚓",
              desc: "Le port. Prix modeste, gueule immense : on y tient à trois sans se marcher dessus." },
  pista:    { nom: "Pista Chica",    prix: 19_000, capacite:  28, emo: "✈️",
              desc: "La piste. Le prix le plus haut, la plus petite bouche : elle sature et elle brûle." },
};
export const CLES_PUNTO = Object.keys(PUNTOS);

// Le prix s'effondre en 1/(1+pente·saturation) : jamais négatif, et surtout la
// saturation N'EST PAS PLAFONNÉE. Déverser 60 kg/jour dans une bouche qui en
// avale 28 doit être franchement mauvais — avec un plafond à 100 %, gaver la
// plaza la plus chère restait la meilleure ligne de jeu quoi qu'il arrive.
export const SATURATION_PENTE = 0.8;
export const MEMOIRE_DEMI_VIE = 6;           // jours de mémoire du volume, pour le contrôle et la saturation
// La mémoire est un accumulateur qui décroît : à régime stable elle vaut
// (débit × DEMI_VIE / ln2). Diviser par cette fenêtre redonne un DÉBIT en
// kg/jour, seule grandeur comparable à la capacité d'une plaza. Sans ça on
// comparait ~8,7 jours de stock à une capacité journalière, et la saturation
// partait à ×20 — le plafond à 100 % cachait l'erreur au lieu de la corriger.
export const FENETRE_MEMOIRE = MEMOIRE_DEMI_VIE / Math.LN2;

/* ── Le contrôle et le péage ────────────────────────────────────────────── */
// Tenir une plaza ne retire rien à personne : ça PRÉLÈVE. C'est toute la
// différence avec un vol de ressources — le rival taxé continue d'exister, de
// produire, et d'être une source de revenu.
export const SEUIL_CONTROLE = 0.45;          // part de volume nécessaire pour tenir la plaza
export const PEAJE_PART = 0.25;              // ce que le tenant prélève sur les autres

/* ── La tension : le prix du conflit, payé par les deux ─────────────────── */
export const TENSION_MAX = 100;
export const TENSION_INERTIE = 0.5;          // part de l'écart à la cible rattrapée par jour
export const TENSION_CHALEUR = 0.55;         // points de chaleur visée par point de tension subi

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTION — volontairement abstraite : ce n'est pas le sujet du test
   ═══════════════════════════════════════════════════════════════════════════ */

export const PRODUCTION_BASE = 12;           // kg/jour au palier 1
export const PRODUCTION_PALIERS = [0, 260_000, 640_000, 1_450_000, 3_100_000];
export const PRODUCTION_GAIN = 0.75;         // +75 % de rendement par palier
export const PRODUCTION_MAX = 4;
export const COUT_PAR_KG = 1_900;            // ce que coûte un kilo produit et acheminé

/* ═══════════════════════════════════════════════════════════════════════════
   CHALEUR — même modèle qu'El Patrón : une CIBLE saturante, pas une addition.
   Une chaleur additive est nulle au début puis collée à 100 pour toujours.
   ═══════════════════════════════════════════════════════════════════════════ */

export const CHALEUR_MAX = 100;
export const CHALEUR_K = 40;                 // kg/jour donnant une cible de 50
export const CHALEUR_INERTIE = 0.4;
// L'ÉTAT FRAPPE LE PLUS BRUYANT. Ta part du volume TOTAL du corridor — tous
// cartels confondus — te coûte de la chaleur. Sans ce terme, le monopole était
// récompensé deux fois (aucun péage à verser, et une plaza non disputée reste
// froide) : gaver la plaza la plus chère écrasait toutes les autres lignes.
// C'est aussi l'anti-snowball : réussir attire l'État, sans rubber-banding.
export const CHALEUR_DOMINANCE = 46;
export const AVOCAT_PRIX = 340_000;
export const AVOCAT_ENTRETIEN = 6_000;
export const AVOCAT_ABATTEMENT = 9;
export const AVOCAT_MAX = 4;

export const PALIERS = [
  { seuil:  0, cle: "calme",     nom: "Calme",      prix: 1.00, desc: "Personne ne regarde." },
  { seuil: 30, cle: "reperage",  nom: "Repérage",   prix: 1.12, desc: "On te photographie — et la marchandise se raréfie : +12 %." },
  { seuil: 58, cle: "operacion", nom: "Opération",  prix: 1.28, desc: "Une unité est montée. Le corridor paie +28 %." },
  { seuil: 82, cle: "cerco",     nom: "Cerco",      prix: 0.65, desc: "L'étau. Les acheteurs te lâchent : −35 %, et le compte à rebours court." },
];
export const CERCO_JOURS = 10;               // jours passés dans l'étau avant la chute

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRE — rien ne bouge sans cause (même principe qu'El Patrón)
   ═══════════════════════════════════════════════════════════════════════════ */

export const REGISTRE_MAX = 200;

function appliquer(S, montant) {
  if (!Number.isFinite(montant)) throw new Error("montant non fini");
  const reel = montant < 0 ? -Math.min(-montant, S.cash) : montant;
  S.cash = Math.max(0, S.cash + reel);
  if (reel > 0) S.totaux.gagne += reel;
  return reel;
}
function exigerCause(cause) {
  if (typeof cause !== "string" || cause.trim() === "") throw new Error("mouvement sans cause");
}
function poser(S, montant, cause) {
  S.registre.push({ jour: S.jour, montant, cause });
  if (S.registre.length > REGISTRE_MAX) S.registre.shift();
}

/** Mouvement PONCTUEL : une décision, donc sa propre ligne tout de suite. */
export function tx(S, montant, cause) {
  exigerCause(cause);
  if (montant === 0) return 0;
  const reel = appliquer(S, montant);
  if (reel !== 0) poser(S, reel, cause);
  return reel;
}
/** Mouvement CONTINU : appliqué tout de suite, agrégé en une ligne par jour et par cause. */
export function flux(S, montant, cause) {
  exigerCause(cause);
  if (montant === 0) return 0;
  const reel = appliquer(S, montant);
  if (reel === 0) return 0;
  S._flux[cause] = (S._flux[cause] || 0) + reel;
  return reel;
}
function viderFlux(S) {
  for (const cause of Object.keys(S._flux)) {
    if (Math.abs(S._flux[cause]) >= 0.5) poser(S, S._flux[cause], cause);
  }
  S._flux = Object.create(null);
}
export function peutPayer(S, montant) { return S.cash >= montant - 1e-6; }

/* ═══════════════════════════════════════════════════════════════════════════
   ÉTAT
   ═══════════════════════════════════════════════════════════════════════════ */

export function nouvelEtat() {
  const S = {
    version: SAVE_VERSION,
    jour: 0,
    vitesse: 1,
    fini: null,

    cash: 400_000,
    chaleur: 5,
    chaleurCible: 5,
    joursCerco: 0,
    palierProduction: 1,
    avocats: 0,

    // L'allocation : le SEUL vrai levier du joueur. Trois parts qui font 100 %.
    allocation: { frontera: 0, puerto: 100, pista: 0 },

    puntos: {},
    rivaux: {},
    registre: [],
    notifs: [],
    totaux: { gagne: 0, exporteKg: 0, peajePaye: 0, peajeRecu: 0 },
    _flux: Object.create(null),
    _jourLog: 0,
  };

  for (const cle of CLES_PUNTO) {
    S.puntos[cle] = {
      cle,
      volume: { joueur: 0, aguilas: 0, familia: 0 },   // mémoire glissante, en kg
      tension: 0, tensionCible: 0,
    };
  }
  // Les rivaux démarrent installés : sans ça la première minute n'a pas d'adversaire.
  for (const f of RIVAUX) S.rivaux[f] = { cash: 400_000, production: PRODUCTION_BASE, palier: 1, cible: "puerto" };
  S.puntos.puerto.volume.familia = 40;
  S.puntos.frontera.volume.aguilas = 40;
  return S;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LECTURES DÉRIVÉES — l'UI ne recalcule jamais l'économie
   ═══════════════════════════════════════════════════════════════════════════ */

export function palier(chaleur) {
  let p = PALIERS[0];
  for (const q of PALIERS) if (chaleur >= q.seuil) p = q;
  return p;
}
export function production(S) {
  return PRODUCTION_BASE * Math.pow(1 + PRODUCTION_GAIN, S.palierProduction - 1);
}
export function volumeTotal(p) { return p.volume.joueur + p.volume.aguilas + p.volume.familia; }

/** Part de volume d'une faction sur une plaza, 0..1. */
export function part(p, f) {
  const t = volumeTotal(p);
  return t > 1e-9 ? p.volume[f] / t : 0;
}
/** Qui tient la plaza — ou `null` si elle est disputée. */
export function tenant(p) {
  let best = null, bestPart = SEUIL_CONTROLE;
  for (const f of TOUS) {
    const v = part(p, f);
    if (v > bestPart) { bestPart = v; best = f; }
  }
  return best;
}
/** Le débit réel qui passe par la plaza, en kg/jour. */
export function debit(S, cle) {
  return volumeTotal(S.puntos[cle]) / FENETRE_MEMOIRE;
}
/** Non plafonnée : au-delà de 1, la plaza déborde et le prix continue de tomber. */
export function saturation(S, cle) {
  return debit(S, cle) / PUNTOS[cle].capacite;
}
/** Prix affiché avant péage. */
export function puntoPrix(S, cle) {
  return PUNTOS[cle].prix / (1 + SATURATION_PENTE * saturation(S, cle)) * palier(S.chaleur).prix;
}
/** Part du joueur dans le volume TOTAL du corridor — ce que l'État regarde. */
export function dominance(S, f = "joueur") {
  let mien = 0, tout = 0;
  for (const cle of CLES_PUNTO) {
    const p = S.puntos[cle];
    mien += p.volume[f];
    tout += volumeTotal(p);
  }
  return tout > 1e-9 ? mien / tout : 0;
}
/** Prix réellement encaissé par une faction, péage déduit. */
export function prixNet(S, cle, f) {
  const t = tenant(S.puntos[cle]);
  const brut = puntoPrix(S, cle);
  return t && t !== f ? brut * (1 - PEAJE_PART) : brut;
}
/**
 * Une plaza est chaude quand PLUSIEURS cartels y passent en même temps.
 * `1 - partMax` vaut 0 sur un monopole et grimpe dès que le trafic se partage.
 */
export function contestation(p) {
  const t = volumeTotal(p);
  if (t < 1e-9) return 0;
  const max = Math.max(...TOUS.map((f) => part(p, f)));
  return 1 - max;
}
export function charges(S) {
  return production(S) * COUT_PAR_KG + S.avocats * AVOCAT_ENTRETIEN;
}
export function avocatPrix(S) { return Math.round(AVOCAT_PRIX * (1 + S.avocats * 0.7)); }

/* ═══════════════════════════════════════════════════════════════════════════
   LES RIVAUX — des politiques, pas une IA
   ═══════════════════════════════════════════════════════════════════════════ */

/** Où ce rival enverra sa production. Fonction pure de l'état : prédictible. */
export function cibleRivale(S, f) {
  if (f === "aguilas") {
    // Le plus rentable, péage compris. Il accepte le conflit.
    let best = CLES_PUNTO[0], bestV = -Infinity;
    for (const cle of CLES_PUNTO) {
      const v = prixNet(S, cle, f);
      if (v > bestV) { bestV = v; best = cle; }
    }
    return best;
  }
  // La Familia : la plaza la moins tendue. À égalité, la mieux payée.
  let best = CLES_PUNTO[0], bestT = Infinity, bestP = -Infinity;
  for (const cle of CLES_PUNTO) {
    const t = S.puntos[cle].tension;
    const p = prixNet(S, cle, f);
    if (t < bestT - 1e-6 || (Math.abs(t - bestT) <= 1e-6 && p > bestP)) { bestT = t; bestP = p; best = cle; }
  }
  return best;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE TICK
   ═══════════════════════════════════════════════════════════════════════════ */

export function tick(S, dt) {
  if (S.fini) return S;
  dt = Math.min(Math.max(dt, 0), DT_MAX_JOURS);
  if (dt <= 0) return S;
  S.jour += dt;

  etapeExpedition(S, dt);
  etapeMemoire(S, dt);
  etapeTension(S, dt);
  etapeChaleur(S, dt);
  etapeEntretien(S, dt);
  etapeFin(S, dt);

  if (Math.floor(S.jour) > S._jourLog) { viderFlux(S); S._jourLog = Math.floor(S.jour); }
  return S;
}

function borne(v, a, b) { return v < a ? a : v > b ? b : v; }

/* ── 1. On expédie : joueur selon son allocation, rivaux selon leur politique ── */
function etapeExpedition(S, dt) {
  const kgJoueur = production(S) * dt;
  let brut = 0, peajePaye = 0, peajeRecu = 0;

  // Le joueur répartit sa production selon les trois curseurs.
  for (const cle of CLES_PUNTO) {
    const partAlloc = (S.allocation[cle] || 0) / 100;
    const kg = kgJoueur * partAlloc;
    if (kg <= 0) continue;
    const p = S.puntos[cle];
    const t = tenant(p);
    const prixBrut = puntoPrix(S, cle);
    const recette = kg * prixBrut;
    if (t && t !== "joueur") peajePaye += recette * PEAJE_PART;
    brut += recette;
    p.volume.joueur += kg;
    S.totaux.exporteKg += kg;
  }

  // Les rivaux produisent, expédient, paient le péage — et RÉINVESTISSENT.
  // Sans croissance ils se faisaient distancer dès le deuxième palier et toutes
  // les allocations finissaient premières : il n'y avait pas de course, donc
  // pas de jeu.
  for (const f of RIVAUX) {
    const r = S.rivaux[f];
    r.cible = cibleRivale(S, f);
    const kg = r.production * dt;
    const p = S.puntos[r.cible];
    const t = tenant(p);
    const recette = kg * puntoPrix(S, r.cible);
    r.cash += recette * (t && t !== f ? 1 - PEAJE_PART : 1) - kg * COUT_PAR_KG;
    if (t === "joueur") peajeRecu += recette * PEAJE_PART;
    p.volume[f] += kg;

    if (r.palier < PRODUCTION_MAX && r.cash >= PRODUCTION_PALIERS[r.palier]) {
      r.cash -= PRODUCTION_PALIERS[r.palier];
      r.palier++;
      r.production = PRODUCTION_BASE * Math.pow(1 + PRODUCTION_GAIN, r.palier - 1);
    }
  }

  // Export brut et péage sont journalisés SÉPARÉMENT : sans ça le joueur voit
  // une recette molle sans savoir qu'un quart part chez le voisin.
  if (brut > 0) flux(S, brut, "Export");
  if (peajePaye > 0) { S.totaux.peajePaye += peajePaye; flux(S, -peajePaye, "Péage versé aux rivaux"); }
  if (peajeRecu > 0) { S.totaux.peajeRecu += peajeRecu; flux(S, peajeRecu, "Péage encaissé"); }
  flux(S, -production(S) * COUT_PAR_KG * dt, "Production et acheminement");
}

/* ── 2. La mémoire des plazas s'efface ─────────────────────────────────── */
function etapeMemoire(S, dt) {
  const k = Math.pow(0.5, dt / MEMOIRE_DEMI_VIE);
  for (const cle of CLES_PUNTO) {
    const p = S.puntos[cle];
    for (const f of TOUS) p.volume[f] *= k;
  }
}

/* ── 3. La tension monte là où plusieurs cartels se croisent ────────────── */
function etapeTension(S, dt) {
  for (const cle of CLES_PUNTO) {
    const p = S.puntos[cle];
    p.tensionCible = borne(contestation(p) * saturation(S, cle) * 1.6 * TENSION_MAX, 0, TENSION_MAX);
    p.tension = borne(p.tension + (p.tensionCible - p.tension) * TENSION_INERTIE * dt, 0, TENSION_MAX);
  }
}

/* ── 4. La chaleur : ton volume + la tension des plazas que TU utilises ── */
export function chaleurCible(S) {
  const kg = production(S);
  let c = CHALEUR_MAX * kg / (kg + CHALEUR_K);
  for (const cle of CLES_PUNTO) {
    const partAlloc = (S.allocation[cle] || 0) / 100;
    c += S.puntos[cle].tension * partAlloc * TENSION_CHALEUR;
  }
  c += dominance(S) * CHALEUR_DOMINANCE;      // l'État frappe le plus bruyant
  c -= S.avocats * AVOCAT_ABATTEMENT;
  return borne(c, 0, CHALEUR_MAX);
}
function etapeChaleur(S, dt) {
  S.chaleurCible = chaleurCible(S);
  S.chaleur = borne(S.chaleur + (S.chaleurCible - S.chaleur) * CHALEUR_INERTIE * dt, 0, CHALEUR_MAX);
}

function etapeEntretien(S, dt) {
  if (S.avocats > 0) flux(S, -S.avocats * AVOCAT_ENTRETIEN * dt, "Avocats et juges");
}

/* ── 5. Fin de saison, ou l'étau ───────────────────────────────────────── */
function etapeFin(S, dt) {
  if (palier(S.chaleur).cle === "cerco") {
    S.joursCerco += dt;
    if (S.joursCerco >= CERCO_JOURS) {
      S.fini = { cle: "cerco", titre: "L'étau s'est refermé",
        texte: `${CERCO_JOURS} jours au-dessus de ${PALIERS[3].seuil} de chaleur. ` +
               `Tu finis la saison avec ${fmtEuro(S.cash)} — et une cellule.` };
      return;
    }
  } else {
    S.joursCerco = Math.max(0, S.joursCerco - dt);
  }
  if (S.jour >= SAISON_JOURS) {
    const classement = classementFinal(S);
    const rang = classement.findIndex((x) => x.f === "joueur") + 1;
    S.fini = {
      cle: rang === 1 ? "victoire" : "saison",
      titre: rang === 1 ? "Tu tiens le corridor" : `Fin de saison — ${rang}ᵉ sur 3`,
      texte: classement.map((x) => `${FACTIONS[x.f].nom} : ${fmtEuro(x.cash)}`).join(" · "),
    };
  }
}

export function classementFinal(S) {
  return [{ f: "joueur", cash: S.cash }, ...RIVAUX.map((f) => ({ f, cash: S.rivaux[f].cash }))]
    .sort((a, b) => b.cash - a.cash);
}

/* ═══════════════════════════════════════════════════════════════════════════
   DÉCISIONS DU JOUEUR
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Déplace `delta` points d'allocation vers `cle`, pris sur les autres au prorata.
 * L'allocation fait TOUJOURS 100 % : on ne choisit pas combien on produit, on
 * choisit où ça part. C'est ce qui force l'arbitrage au lieu de le diluer.
 */
export function allouer(S, cle, delta) {
  if (!PUNTOS[cle]) return false;
  const avant = S.allocation[cle];
  const vise = borne(Math.round(avant + delta), 0, 100);
  const bouge = vise - avant;
  if (bouge === 0) return false;

  const autres = CLES_PUNTO.filter((c) => c !== cle);
  const dispo = autres.reduce((a, c) => a + S.allocation[c], 0);
  if (bouge > 0 && dispo < bouge) return false;

  S.allocation[cle] = vise;
  let reste = bouge;
  if (bouge > 0) {
    for (const c of autres) {
      const pris = Math.min(S.allocation[c], Math.round(bouge * (S.allocation[c] / Math.max(dispo, 1))));
      S.allocation[c] -= pris; reste -= pris;
    }
    for (const c of autres) { if (reste <= 0) break; const pris = Math.min(S.allocation[c], reste); S.allocation[c] -= pris; reste -= pris; }
  } else {
    S.allocation[autres[0]] += -bouge;
  }
  // Garde-fou : la somme fait exactement 100 quoi qu'il arrive.
  const somme = CLES_PUNTO.reduce((a, c) => a + S.allocation[c], 0);
  if (somme !== 100) S.allocation[autres[0]] += 100 - somme;
  return true;
}

export function ameliorerProduction(S) {
  if (S.palierProduction >= PRODUCTION_MAX) return false;
  const prix = PRODUCTION_PALIERS[S.palierProduction];
  if (!peutPayer(S, prix)) return false;
  tx(S, -prix, `Production palier ${S.palierProduction + 1}`);
  S.palierProduction++;
  return true;
}
export function acheterAvocat(S) {
  const prix = avocatPrix(S);
  if (S.avocats >= AVOCAT_MAX || !peutPayer(S, prix)) return false;
  tx(S, -prix, "Un avocat de plus");
  S.avocats++;
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIAGNOSTICS — la sim produit le texte, l'UI n'invente rien
   ═══════════════════════════════════════════════════════════════════════════ */

export function diagnostics(S) {
  const d = [];
  for (const cle of CLES_PUNTO) {
    const p = S.puntos[cle], t = tenant(p), moi = part(p, "joueur");
    const alloc = S.allocation[cle] || 0;
    if (alloc <= 0) continue;
    if (t && t !== "joueur") {
      d.push({ ton: "mal", texte: `${FACTIONS[t].nom} tient ${PUNTOS[cle].nom}`,
               detail: `Tu lui verses ${Math.round(PEAJE_PART * 100)} % de ce que tu y fais passer. Il te manque ${Math.round((SEUIL_CONTROLE - moi) * 100)} points de part pour la reprendre.` });
    } else if (!t && moi > 0.2) {
      d.push({ ton: "tiede", texte: `${PUNTOS[cle].nom} est disputée`,
               detail: `Personne ne la tient : personne ne prélève, mais la tension y est à ${Math.round(p.tension)}.` });
    } else if (t === "joueur") {
      d.push({ ton: "bien", texte: `Tu tiens ${PUNTOS[cle].nom}`,
               detail: `Les autres te versent ${Math.round(PEAJE_PART * 100)} % de ce qu'ils y font passer.` });
    }
    if (p.tension > 55) {
      d.push({ ton: "mal", texte: `${PUNTOS[cle].nom} est brûlante (${Math.round(p.tension)})`,
               detail: `Elle te coûte ${Math.round(p.tension * (alloc / 100) * TENSION_CHALEUR)} points de chaleur visée.` });
    }
    if (saturation(S, cle) > 0.8) {
      d.push({ ton: "tiede", texte: `${PUNTOS[cle].nom} est gorgée`,
               detail: `Le prix y est tombé à ${Math.round((1 - SATURATION_PENALITE * saturation(S, cle)) * 100)} % de sa base.` });
    }
  }
  const p = palier(S.chaleur);
  if (p.prix > 1) d.push({ ton: "bien", texte: `${p.nom} : le corridor paie ${Math.round((p.prix - 1) * 100)} % de plus`, detail: p.desc });
  else if (p.prix < 1) d.push({ ton: "mal", texte: `${p.nom} : ${Math.round((1 - p.prix) * 100)} % de moins au kilo`, detail: p.desc });
  if (p.cle === "cerco") d.push({ ton: "mal", texte: `Chute dans ${(CERCO_JOURS - S.joursCerco).toFixed(1)} j`, detail: "Redescends sous 82 de chaleur." });
  return d;
}

/** Les débits instantanés, en €/jour. */
export function rythmes(S) {
  let brut = 0, peaje = 0, recu = 0;
  const kg = production(S);
  for (const cle of CLES_PUNTO) {
    const a = (S.allocation[cle] || 0) / 100;
    if (a <= 0) continue;
    const p = S.puntos[cle], t = tenant(p);
    const r = kg * a * puntoPrix(S, cle);
    brut += r;
    if (t && t !== "joueur") peaje += r * PEAJE_PART;
  }
  for (const f of RIVAUX) {
    const r = S.rivaux[f];
    if (tenant(S.puntos[r.cible]) === "joueur") recu += r.production * puntoPrix(S, r.cible) * PEAJE_PART;
  }
  const ch = charges(S);
  return { brut, peaje, recu, charges: ch, net: brut - peaje + recu - ch };
}

export function fmtEuro(n) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2).replace(".", ",") + " M€";
  if (a >= 1_000) return Math.round(n / 1000) + " k€";
  return Math.round(n) + " €";
}
export function fmtKg(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",") + " t" : n.toFixed(n < 10 ? 1 : 0) + " kg";
}
