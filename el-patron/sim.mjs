// El Patrón — la simulation pure.
//
// Aucun DOM, aucun `Math.random`, aucune `Date`. Tout ce qui est ici est
// rejouable : même état de départ + mêmes décisions = même état final. C'est ce
// qui rend `tools/invariants-patron.mjs` possible sans navigateur.
//
// Trois principes tenus par les invariants :
//
//   1. R4 — DÉTERMINISME. Aucune saisie n'est tirée au sort. Une ruta accumule
//      de la SUSPICION à chaque kilo qu'elle transporte ; à 100 le contrôle
//      tombe. Le joueur voit la jauge monter et décide AVANT. Le hasard des
//      convois de Cartel Tycoon (ton camion saute, tu ne sauras jamais pourquoi)
//      devient une horloge lisible.
//   2. CAUSE OBLIGATOIRE. Aucun champ économique ne bouge sans passer par
//      `tx()`, qui exige une cause non vide. Le registre est la réponse à
//      « pourquoi je perds de l'argent ».
//   3. CONSTANTES NOMMÉES. Aucun nombre d'équilibrage dans la logique. Tout est
//      ici, en haut, réglable sans lire le code.

export const SAVE_VERSION = 3;

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPS
   ═══════════════════════════════════════════════════════════════════════════ */

export const TICK_MS = 200;              // pas de simulation
export const SECONDES_PAR_JOUR = 12;     // 1 jour de jeu = 12 s réelles en ×1
export const VITESSES = [0, 1, 3];       // ⏸ ▶ ⏩
export const JOUR_PAR_MS = 1 / (SECONDES_PAR_JOUR * 1000);
export const DT_MAX_JOURS = 2;           // borne le rattrapage (onglet en arrière-plan)

/* ═══════════════════════════════════════════════════════════════════════════
   CULTURE — les fincas produisent de la pâte
   ═══════════════════════════════════════════════════════════════════════════ */

export const ZONES = {
  sierra: { nom: "Sierra",  rendement: 12, prix:        0, expo: 0.6, desc: "Haute, pauvre, oubliée. Peu de rendement, peu de regards." },
  valle:  { nom: "Valle",   rendement: 20, prix:  150_000, expo: 1.0, desc: "La bonne terre. Tout le monde sait qu'elle est bonne." },
  selva:  { nom: "Selva",   rendement: 34, prix:  460_000, expo: 1.5, desc: "Énorme et loin de tout — mais un avion la voit de très haut." },
};
// L'empire s'agrandit en MONTANT EN GAMME, pas en empilant des icônes : six
// fincas, quatre labos, cinq rutas — et quatre niveaux chacun. Sans ce plafond
// une partie finit avec quarante fincas identiques, illisibles sur un téléphone,
// et chaque achat ne veut plus rien dire.
export const FINCA_MAX = 6;
export const FINCA_NIVEAU_MAX = 4;
export const FINCA_UPGRADE_PRIX = [0, 120_000, 340_000, 820_000];  // propre, index = niveau actuel
export const FINCA_UPGRADE_GAIN = 0.55;      // +55 % de rendement par niveau
export const FINCA_STOCK_MAX = 260;          // kg de pâte stockables sur place
export const PAYSANS_COUT_JOUR = 40;         // € liquide / jour / kg de rendement

/* ═══════════════════════════════════════════════════════════════════════════
   RAFFINAGE — les labos transforment la pâte en poudre
   ═══════════════════════════════════════════════════════════════════════════ */

export const PURETES = {
  basse:    { nom: "Basse",    ratio: 2.5, prix: 0.76, trace: 0.75 },
  standard: { nom: "Standard", ratio: 3.0, prix: 1.00, trace: 1.00 },
  haute:    { nom: "Haute",    ratio: 3.7, prix: 1.38, trace: 1.30 },
};
export const LABO_PRIX = 190_000;            // propre
export const LABO_MAX = 4;
export const LABO_CAPACITE = 30;             // kg de pâte / jour au niveau 1
export const LABO_NIVEAU_MAX = 4;
export const LABO_UPGRADE_PRIX = [0, 160_000, 400_000, 900_000];
export const LABO_UPGRADE_GAIN = 0.6;
export const LABO_STOCK_MAX = 90;            // kg de poudre en attente de ruta
export const PRECURSEURS_PAR_KG = 950;       // € liquide par kg de poudre produit

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSPORT — les rutas sont des ordres permanents, pas des convois à piloter
   ═══════════════════════════════════════════════════════════════════════════ */

export const MODES = {
  mula:      { nom: "Mules",      debit:   8, cout:  320, trace: 0.55, perte: 0.25, prix:        0, transit: 2.5 },
  camion:    { nom: "Camion",     debit:  30, cout:  190, trace: 1.10, perte: 0.45, prix:  110_000, transit: 1.5 },
  avioneta:  { nom: "Avionnette", debit:  22, cout:  740, trace: 0.85, perte: 0.60, prix:  380_000, transit: 0.6 },
  lancha:    { nom: "Go-fast",    debit:  70, cout:  270, trace: 1.65, perte: 0.55, prix:  560_000, transit: 1.0 },
  tunel:     { nom: "Tunnel",     debit:  50, cout:  130, trace: 0.50, perte: 0.15, prix: 1_250_000, transit: 2.0 },
  contenedor:{ nom: "Conteneur",  debit: 150, cout:   95, trace: 1.30, perte: 0.85, prix: 1_900_000, transit: 4.0 },
};
export const RUTA_MAX = 5;
export const SUSPICION_MAX = 100;
// La suspicion se compte en PASSAGES, pas en kilos. Ce qu'on remarque, c'est
// qu'un camion refait la même route, pas ce qu'il y a dedans. Conséquence
// voulue : monter en gabarit (camion → tunnel → conteneur) réduit vraiment la
// trace au kilo. C'est la récompense de l'investissement, et ça évite que le
// gros véhicule soit un piège mathématique.
export const TRACE_BASE = 6;                 // points/jour pour une ruta à plein régime, trace 1.0, au calme
export const SUSPICION_REPOS = 7;            // points/jour récupérés quand la ruta est à l'arrêt
export const SUSPICION_CHALEUR = 0.9;        // la chaleur amplifie la trace : ×(1 + chaleur/100 × ce facteur)
export const ESCORTE_MAX = 3;
export const ESCORTE_COUT_JOUR = 2_400;      // € liquide / jour / sicario
export const ESCORTE_ABATTEMENT = 0.3;       // trace ÷ (1 + n × ce facteur)

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT — les puntos saturent, ce qui interdit la ruta unique optimale
   ═══════════════════════════════════════════════════════════════════════════ */

export const PUNTOS = {
  frontera: { nom: "Frontera Norte", prix: 11_500, capacite:  45, chaleur: 0.05, desc: "Le poste-frontière. Sûr, cher à saturer." },
  puerto:   { nom: "Puerto Viejo",   prix:  8_900, capacite: 170, chaleur: 0.03, desc: "Le port. Prix bas, gueule immense." },
  pista:    { nom: "Pista Chica",    prix: 16_800, capacite:  26, chaleur: 0.11, desc: "La piste. Le meilleur prix, la plus petite bouche." },
};
export const SATURATION_PENALITE = 0.62;     // au plafond, le prix tombe à 38 %
export const SATURATION_DEMI_VIE = 2.2;      // jours pour que la mémoire du punto s'efface de moitié

/* ═══════════════════════════════════════════════════════════════════════════
   LIQUIDE — l'argent sale est un VOLUME, pas un nombre
   ═══════════════════════════════════════════════════════════════════════════ */

export const M3_PAR_EURO = 0.5 / 1_000_000;  // 1 M€ en coupures ≈ 0,5 m³
export const CACHE_BASE = 1.0;               // m³ de la première planque — soit 2 M€ en coupures
export const CACHE_PRIX = [0, 300_000, 700_000, 1_500_000, 3_200_000];
export const CACHE_GAIN = 1.8;               // m³ ajoutés par palier
export const CACHE_NIVEAU_MAX = 4;

/* ═══════════════════════════════════════════════════════════════════════════
   BLANCHIMENT — le seul robinet vers l'argent propre
   ═══════════════════════════════════════════════════════════════════════════ */

// Le blanchiment coûte structurellement PLUS CHER que la production : à euro
// propre investi, une finca rapporte environ le double de ce qu'un front sait
// absorber. C'est délibéré — c'est ce qui fait que le liquide s'entasse, que la
// planque se remplit et que le volume devient un vrai problème. Rendre les deux
// côtés symétriques suffisait à désamorcer toute la seconde moitié du jeu.
export const FRONTS = {
  lavadero:  { nom: "Lavadero",      debit:  30_000, commission: 0.22, credibilite:  34_000, prix:  110_000, soupcon: 1.0 },
  restaurant:{ nom: "Restaurante",   debit:  52_000, commission: 0.18, credibilite:  60_000, prix:  340_000, soupcon: 1.0 },
  cambio:    { nom: "Casa de Cambio",debit: 130_000, commission: 0.12, credibilite: 115_000, prix:  900_000, soupcon: 1.6 },
  obra:      { nom: "Constructora",  debit: 240_000, commission: 0.28, credibilite: 270_000, prix: 1_700_000, soupcon: 0.9 },
  futbol:    { nom: "Club de Fútbol",debit: 520_000, commission: 0.35, credibilite: 580_000, prix: 4_200_000, soupcon: 0.8 },
  cripto:    { nom: "Mesa Cripto",   debit: 400_000, commission: 0.30, credibilite: 130_000, prix: 3_000_000, soupcon: 2.2 },
};
// Chaque front est UNIQUE : il n'y a qu'un club de foot à acheter dans ce pays.
// C'est la décision structurante du jeu. La production, elle, n'a pas de
// plafond — donc passé un certain volume le liquide DOIT s'entasser, et le
// joueur n'a plus que trois issues : agrandir la planque, pousser les fronts
// au-dessus de leur crédibilité (et affronter le fisc), ou ralentir l'usine.
// Sans cette rareté, le blanchiment suivait la production indéfiniment et deux
// systèmes entiers — le volume et le contrôle fiscal — ne se déclenchaient jamais.
export const CAPACITE_BLANCHIMENT_MAX = Object.values(FRONTS).reduce((a, f) => a + f.debit, 0);
export const INTENSITE_MAX = 1.6;            // on peut pousser un front à 160 % de son débit
// Le liquide n'est pas qu'un trophée : c'est le fonds de roulement. Précurseurs,
// paysans, fret et mordidas se paient EN SALE. Blanchir jusqu'au dernier billet
// arrête l'usine et la partie ne redémarre jamais. Le joueur règle donc combien
// de jours de charges les fronts n'ont pas le droit de toucher.
export const RESERVE_JOURS_DEFAUT = 3;
export const RESERVE_JOURS_MAX = 12;
export const SOUPCON_MAX = 100;
export const SOUPCON_REPOS = 9;              // points/jour quand le front tourne sous sa crédibilité
export const SOUPCON_PAR_EURO = 100 / 900_000; // 900 k€ blanchis au-dessus du plausible = audit

/* ═══════════════════════════════════════════════════════════════════════════
   CHALEUR & PRESSION — la tension transversale
   ═══════════════════════════════════════════════════════════════════════════ */

// La chaleur ne s'accumule pas linéairement : elle TEND vers une cible qui
// dépend de ce que l'empire est en train de faire. C'est ce qui la garde
// lisible de 4 kg/jour à 1 000 kg/jour — une chaleur additive serait nulle au
// début puis collée à 100 pour toujours, et le joueur n'aurait plus de volant.
export const CHALEUR_MAX = 100;
export const CHALEUR_K = 45;                 // kg de poudre/jour donnant une cible de 50
export const CHALEUR_INERTIE = 0.34;         // part de l'écart à la cible rattrapée par jour
export const CHALEUR_EXPOSE = 11;            // points de cible par m³ de liquide à ciel ouvert
export const CHALEUR_ESCORTE = 2.0;          // points de cible par sicario en service
export const RYTHME_LISSAGE = 2.5;           // jours de lissage du rythme de production
export const POLITICIEN_PRIX = 260_000;      // € liquide pour le premier
export const POLITICIEN_INFLATION = 0.8;     // chacun coûte (1 + n × ça) fois le premier
export const POLITICIEN_ENTRETIEN = 9_000;   // € liquide / jour / politicien
export const POLITICIEN_ABATTEMENT = 7;      // points de cible retirés par politicien acheté
export const POLITICIEN_MAX = 5;
export function politicienPrix(S) {
  return Math.round(POLITICIEN_PRIX * (1 + S.politiciens * POLITICIEN_INFLATION));
}

// LA PRIME DE CHALEUR. Un corridor surveillé est un corridor où la marchandise
// se raréfie : elle se paie donc PLUS CHER. Sans ça, tout dans ce jeu tirait
// vers le bas — produire chauffe, stocker chauffe, grossir chauffe — et la
// posture optimale devenait « faire le moins possible », ce qui est le
// contraire d'un jeu de cartel. Ici la chaleur est une gourmandise : le
// meilleur prix est juste avant la falaise, et la falaise est à 92.
export const PALIERS = [
  { seuil:  0, cle: "calme",      nom: "Calme",       suspicion: 1.00, prix: 1.00, desc: "Personne ne regarde. Le prix est le prix." },
  { seuil: 25, cle: "reperage",   nom: "Repérage",    suspicion: 1.30, prix: 1.10, desc: "On photographie tes camions — et la marchandise se raréfie : +10 % au kilo." },
  { seuil: 50, cle: "operacion",  nom: "Opération",   suspicion: 1.55, prix: 1.22, desc: "Une unité est montée, les descentes commencent — mais le corridor paie +22 %." },
  { seuil: 75, cle: "taskforce",  nom: "Task Force",  suspicion: 1.90, prix: 1.38, desc: "Presque plus rien ne passe. Ce qui passe fixe son prix : +38 %. C'est ici qu'on gagne, et c'est ici qu'on tombe." },
  { seuil: 92, cle: "extradition",nom: "Extradition", suspicion: 2.30, prix: 0.70, desc: "Le dossier part au nord, les acheteurs te lâchent : −30 %. Le compte à rebours court." },
];
export const PRESSION_MAX = 100;
export const PRESSION_SEUIL = 45;            // la pression ne monte qu'au-dessus de ce niveau de chaleur
export const PRESSION_PAR_JOUR = 34;         // points/jour à chaleur 100
export const EXTRADITION_JOURS = 8;          // jours passés au-dessus de 92 avant la fin

/* ═══════════════════════════════════════════════════════════════════════════
   ÉVÉNEMENTS — le prix des choix, jamais un tirage
   ═══════════════════════════════════════════════════════════════════════════ */

// L'officier ne facture pas un forfait : il facture ce que tu as à perdre. Du
// coup le choix « payer ou forcer » est une vraie comparaison, et elle change
// selon le mode : sur des mules (25 % de perte) on force, sur un conteneur
// (85 %) on paie toujours. C'est le mode de transport qui décide, pas l'humeur.
export const MORDIDA_PART = 0.28;            // part de la valeur engagée réclamée
export const MORDIDA_MIN = 25_000;
export const MORDIDA_CHALEUR = 2.2;
export const FORCER_CHALEUR = 7.0;
export const AUDIT_AMENDE = 0.55;            // part du débit annuel du front réclamée
export const DESCENTE_PERTE = 0.7;           // part du stock saisi si on évacue trop tard
export const DESCENTE_PART = 0.9;            // le commandant facture ~ ce que vaut ce qu'il trouverait
export const DESCENTE_MORDIDA_MIN = 180_000;

export const JALONS = [
  { propre:    1_000_000, titre: "Premier million propre",  texte: "De l'argent que tu peux montrer." },
  { propre:   10_000_000, titre: "Dix millions propres",    texte: "Tu n'es plus un trafiquant, tu es une entreprise." },
  { propre:   60_000_000, titre: "Soixante millions",       texte: "Le pays te connaît. Le nord aussi." },
  { propre:  250_000_000, titre: "Un quart de milliard",    texte: "Tu as gagné. Reste à ne pas mourir riche." },
];

/* ═══════════════════════════════════════════════════════════════════════════
   ALÉA DE PRÉSENTATION UNIQUEMENT
   Seedé, et il ne touche JAMAIS l'état économique : uniquement des noms et des
   positions sur la carte. L'invariant le vérifie.
   ═══════════════════════════════════════════════════════════════════════════ */

export function rngPresentation(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMS_FINCA = ["El Reposo", "La Esperanza", "San Ignacio", "Las Ánimas", "El Cañón", "Santa Rita", "La Cumbre", "El Trébol", "Los Cedros", "La Herradura"];
const NOMS_LABO = ["Cocina Uno", "El Sótano", "La Bodega", "Nido", "Casa Blanca", "El Horno", "La Nevera", "Taller Sur"];
const NOMS_RUTA = ["Camino Viejo", "La Vereda", "Paso del Norte", "Ruta 9", "El Atajo", "La Curva", "Cañada", "El Desvío", "La Grieta", "Paso Alto"];

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRE — rien ne bouge sans cause
   ═══════════════════════════════════════════════════════════════════════════ */

export const REGISTRE_MAX = 240;

/**
 * Applique le mouvement et retourne ce qui est RÉELLEMENT passé.
 * On ne peut pas dépenser ce qu'on n'a pas : la dépense est écrêtée, et c'est
 * le montant écrêté qui est journalisé. C'est l'invariant `liquide >= 0`.
 */
function appliquer(S, champ, montant) {
  if (!Number.isFinite(montant)) throw new Error("montant non fini sur " + champ);
  let reel = montant;
  if (montant < 0) reel = -Math.min(-montant, S[champ]);
  S[champ] = Math.max(0, S[champ] + reel);
  if (reel > 0 && champ === "propre") S.totaux.propreCumule += reel;
  return reel;
}

function exigerCause(cause, champ) {
  if (typeof cause !== "string" || cause.trim() === "") {
    throw new Error("transaction sans cause sur " + champ);
  }
}

/**
 * Mouvement PONCTUEL (un achat, une mordida, une amende) : il entre au registre
 * tout de suite, parce que c'est une décision et qu'elle mérite sa ligne.
 */
export function tx(S, champ, montant, cause) {
  exigerCause(cause, champ);
  if (montant === 0) return 0;
  const reel = appliquer(S, champ, montant);
  if (reel !== 0) poser(S, champ, reel, cause);
  return reel;
}

/**
 * Mouvement CONTINU (fret, salaires, précurseurs, ventes, blanchiment) : il
 * s'applique immédiatement mais s'AGRÈGE, et ne produit qu'une ligne par jour
 * de jeu et par cause. Sans ça le registre serait un flot de 5 lignes par tick
 * — illisible, et la réponse à « pourquoi je perds de l'argent » se noierait
 * dans son propre bruit.
 */
export function flux(S, champ, montant, cause) {
  exigerCause(cause, champ);
  if (montant === 0) return 0;
  const reel = appliquer(S, champ, montant);
  if (reel === 0) return 0;
  const cle = champ + "|" + cause;
  S._flux[cle] = (S._flux[cle] || 0) + reel;
  return reel;
}

function poser(S, champ, montant, cause) {
  S.registre.push({ jour: S.jour, champ, montant, cause });
  if (S.registre.length > REGISTRE_MAX) S.registre.shift();
}

/** Vide les compteurs de flux du jour écoulé dans le registre. */
function viderFlux(S) {
  for (const cle of Object.keys(S._flux)) {
    const montant = S._flux[cle];
    if (Math.abs(montant) < 0.5) continue;
    const i = cle.indexOf("|");
    poser(S, cle.slice(0, i), montant, cle.slice(i + 1));
  }
  S._flux = Object.create(null);
}

/** Peut-on payer ? (les dépenses écrêtées ne doivent jamais servir d'achat gratuit) */
export function peutPayer(S, champ, montant) {
  return S[champ] >= montant - 1e-6;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ÉTAT
   ═══════════════════════════════════════════════════════════════════════════ */

export function nouvelEtat(seed = 20260801) {
  const rnd = rngPresentation(seed);
  const S = {
    version: SAVE_VERSION,
    seed,
    jour: 0,
    vitesse: 1,
    fini: null,                 // { cle, titre, texte } quand la partie est terminée

    liquide: 260_000,           // de quoi payer les paysans et les premiers précurseurs
    propre: 0,
    chaleur: 4,
    chaleurCible: 4,
    pression: 0,
    joursExtradition: 0,
    rythmePoudre: 0,            // kg/jour lissés — c'est ce que la police « voit »

    fincas: [],
    labos: [],
    rutas: [],
    puntos: {},
    fronts: [],
    cacheNiveau: 0,
    politiciens: 0,
    reserveJours: RESERVE_JOURS_DEFAUT,

    evenements: [],             // décisions en attente : le jeu se met en pause dessus
    registre: [],
    jalons: {},
    notifs: [],

    totaux: { pateKg: 0, poudreKg: 0, exporteKg: 0, saisiKg: 0, propreCumule: 0, mordidas: 0 },
    _seq: 1,
    _rndSeed: seed,
    _flux: Object.create(null),
    _jourLog: 0,
  };

  for (const cle of Object.keys(PUNTOS)) S.puntos[cle] = { cle, memoire: 0 };

  // Le patrimoine de départ : une finca en Sierra, une cocina, une ruta à mules
  // vers la frontière. De quoi voir la chaîne entière tourner dès la 1re minute.
  ajouterFinca(S, "sierra", rnd, "Héritage");
  ajouterLabo(S, rnd, "Héritage");
  ajouterRuta(S, "mula", "frontera", rnd, "Héritage");
  ajouterFront(S, "lavadero", "Héritage");
  return S;
}

function nomAt(liste, i) { return liste[i % liste.length]; }

export function ajouterFinca(S, zone, rnd, cause) {
  const i = S.fincas.length;
  S.fincas.push({
    id: S._seq++, zone, nom: nomAt(NOMS_FINCA, i), niveau: 1, pate: 0,
    x: 0.12 + 0.24 * (rnd ? rnd() : 0.5), y: 0.14 + 0.2 * (rnd ? rnd() : 0.5),
  });
  S.notifs.push({ jour: S.jour, texte: `Finca ${nomAt(NOMS_FINCA, i)} (${ZONES[zone].nom}) — ${cause}` });
  return S.fincas[S.fincas.length - 1];
}

export function ajouterLabo(S, rnd, cause) {
  const i = S.labos.length;
  S.labos.push({
    id: S._seq++, nom: nomAt(NOMS_LABO, i), niveau: 1, purete: "standard", pate: 0, poudre: 0,
    x: 0.42 + 0.16 * (rnd ? rnd() : 0.5), y: 0.4 + 0.16 * (rnd ? rnd() : 0.5),
  });
  S.notifs.push({ jour: S.jour, texte: `Labo ${nomAt(NOMS_LABO, i)} ouvert — ${cause}` });
  return S.labos[S.labos.length - 1];
}

export function ajouterRuta(S, mode, punto, rnd, cause) {
  const i = S.rutas.length;
  S.rutas.push({
    id: S._seq++, nom: nomAt(NOMS_RUTA, i), mode, punto, active: true,
    suspicion: 0, escorte: 0, transit: [], bloquee: false,
    kgJour: 0,
    y: 0.24 + 0.11 * (rnd ? rnd() : 0.5),
  });
  S.notifs.push({ jour: S.jour, texte: `Ruta ${nomAt(NOMS_RUTA, i)} (${MODES[mode].nom} → ${PUNTOS[punto].nom}) — ${cause}` });
  return S.rutas[S.rutas.length - 1];
}

export function ajouterFront(S, type, cause) {
  S.fronts.push({ id: S._seq++, type, intensite: 1, soupcon: 0, gele: false, blanchiJour: 0 });
  S.notifs.push({ jour: S.jour, texte: `Front ${FRONTS[type].nom} ouvert — ${cause}` });
  return S.fronts[S.fronts.length - 1];
}

/* ═══════════════════════════════════════════════════════════════════════════
   LECTURES DÉRIVÉES — l'UI ne recalcule jamais l'économie elle-même
   ═══════════════════════════════════════════════════════════════════════════ */

export function palier(chaleur) {
  let p = PALIERS[0];
  for (const q of PALIERS) if (chaleur >= q.seuil) p = q;
  return p;
}

export function cacheCapacite(S) { return CACHE_BASE + S.cacheNiveau * CACHE_GAIN; }
export function volumeLiquide(S) { return S.liquide * M3_PAR_EURO; }
export function volumeExpose(S) { return Math.max(0, volumeLiquide(S) - cacheCapacite(S)); }

export function fincaRendement(f) {
  return ZONES[f.zone].rendement * Math.pow(1 + FINCA_UPGRADE_GAIN, f.niveau - 1);
}
export function laboCapacite(l) {
  return LABO_CAPACITE * Math.pow(1 + LABO_UPGRADE_GAIN, l.niveau - 1);
}
/** Points de suspicion par jour quand la ruta roule à plein régime. */
export function rutaTrace(S, r) {
  const p = palier(S.chaleur);
  const brut = TRACE_BASE * MODES[r.mode].trace * p.suspicion * (1 + (S.chaleur / CHALEUR_MAX) * SUSPICION_CHALEUR);
  return brut / (1 + r.escorte * ESCORTE_ABATTEMENT);
}
/**
 * Jours restants avant le contrôle, au régime actuel. C'est LE chiffre que l'UI
 * met en avant : le joueur doit voir le barrage arriver, pas le subir.
 */
export function rutaJoursAvantControle(S, r) {
  if (!r.active || r.bloquee) return Infinity;
  const charge = Math.min(1, r.kgJour / MODES[r.mode].debit);
  const parJour = charge > 0 ? charge * rutaTrace(S, r) : -SUSPICION_REPOS;
  if (parJour <= 0) return Infinity;
  return (SUSPICION_MAX - r.suspicion) / parJour;
}
export function puntoPrix(S, cle) {
  const def = PUNTOS[cle];
  const mem = S.puntos[cle].memoire;
  const sat = Math.min(1, mem / def.capacite);
  return def.prix * (1 - SATURATION_PENALITE * sat) * palier(S.chaleur).prix;
}
export function puntoSaturation(S, cle) {
  return Math.min(1, S.puntos[cle].memoire / PUNTOS[cle].capacite);
}
export function poudreDisponible(S) {
  return S.labos.reduce((a, l) => a + l.poudre, 0);
}
export function frontDebit(f) { return FRONTS[f.type].debit * f.intensite; }
export function capaciteBlanchiment(S) {
  return S.fronts.filter((f) => !f.gele).reduce((a, f) => a + frontDebit(f), 0);
}

/** Ce que l'empire brûle en liquide par jour, poste par poste. L'UI l'affiche tel quel. */
export function charges(S) {
  const paysans = S.fincas.reduce((a, f) => a + fincaRendement(f), 0) * PAYSANS_COUT_JOUR;
  const precurseurs = S.rythmePoudre * PRECURSEURS_PAR_KG;
  let fret = 0, escortes = 0;
  for (const r of S.rutas) {
    if (!r.active || r.bloquee) continue;
    fret += r.kgJour * MODES[r.mode].cout;
    escortes += r.escorte * ESCORTE_COUT_JOUR;
  }
  const politique = S.politiciens * POLITICIEN_ENTRETIEN;
  return { paysans, precurseurs, fret, escortes, politique,
           total: paysans + precurseurs + fret + escortes + politique };
}

/** Le liquide auquel les fronts n'ont pas le droit de toucher. */
export function reserveOperationnelle(S) {
  return charges(S).total * S.reserveJours;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE TICK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Avance la simulation de `dt` jours. Ne fait rien tant qu'une décision est en
 * attente : un événement met le monde en pause, il n'est jamais résolu tout seul.
 */
export function tick(S, dt) {
  if (S.fini || S.evenements.length > 0) return S;
  dt = Math.min(Math.max(dt, 0), DT_MAX_JOURS);
  if (dt <= 0) return S;

  S.jour += dt;

  etapeCulture(S, dt);
  const poudreProduite = etapeRaffinage(S, dt);
  etapeTransport(S, dt);
  etapeLiquide(S, dt);
  etapeBlanchiment(S, dt);
  etapeEntretien(S, dt);
  etapeChaleur(S, dt, poudreProduite);
  etapePression(S, dt);
  etapeJalons(S);

  // Une ligne de registre par jour de jeu et par cause, pas une par tick.
  if (Math.floor(S.jour) > S._jourLog) { viderFlux(S); S._jourLog = Math.floor(S.jour); }
  return S;
}

function borne(v, min, max) { return v < min ? min : v > max ? max : v; }

/**
 * La cible de chaleur : ce que la police finirait par savoir si rien ne
 * changeait. Saturante en volume (100·kg/(kg+K)) pour rester lisible sur deux
 * ordres de grandeur de production, additive sur ce qui est VISIBLE (le liquide
 * qui dort dehors, les hommes armés), et rabotée par les politiciens achetés.
 */
export function chaleurCible(S) {
  const kg = S.rythmePoudre;
  let c = CHALEUR_MAX * kg / (kg + CHALEUR_K) * traceMoyenne(S);
  c += volumeExpose(S) * CHALEUR_EXPOSE;
  c += S.rutas.reduce((a, r) => a + (r.active && !r.bloquee ? r.escorte : 0), 0) * CHALEUR_ESCORTE;
  c -= S.politiciens * POLITICIEN_ABATTEMENT;
  return borne(c, 0, CHALEUR_MAX);
}

/** La pureté moyenne pondérée par ce que chaque labo sort réellement. */
export function traceMoyenne(S) {
  let poids = 0, somme = 0;
  for (const l of S.labos) {
    const p = laboCapacite(l);
    poids += p; somme += p * PURETES[l.purete].trace;
  }
  return poids > 0 ? somme / poids : 1;
}

function etapeChaleur(S, dt, poudreProduite) {
  const inst = poudreProduite / dt;
  const k = Math.min(1, dt / RYTHME_LISSAGE);
  S.rythmePoudre += (inst - S.rythmePoudre) * k;

  S.chaleurCible = chaleurCible(S);
  // Les pics d'événements sont posés directement sur `chaleur` ; comme la cible
  // est en dessous, ils redescendent d'eux-mêmes. Pas de compteur séparé.
  S.chaleur = borne(S.chaleur + (S.chaleurCible - S.chaleur) * CHALEUR_INERTIE * dt, 0, CHALEUR_MAX);
}

/* ── 1. Culture ─────────────────────────────────────────────────────────── */
function etapeCulture(S, dt) {
  let salaires = 0;
  for (const f of S.fincas) {
    const rendement = fincaRendement(f);
    salaires += rendement * PAYSANS_COUT_JOUR * dt;
    const place = FINCA_STOCK_MAX - f.pate;
    const produit = Math.min(rendement * dt, place);
    f.pate += produit;
    S.totaux.pateKg += produit;
  }
  if (salaires > 0) flux(S, "liquide", -salaires, "Paysans et cueilleurs");
}

/* ── 2. Raffinage ───────────────────────────────────────────────────────── */
/** Retourne les kg de poudre produits sur ce pas — c'est ce que la police voit. */
function etapeRaffinage(S, dt) {
  let total = 0;
  for (const l of S.labos) {
    const pu = PURETES[l.purete];
    const place = Math.max(0, LABO_STOCK_MAX - l.poudre);

    // Ce que ce labo peut RÉELLEMENT transformer sur ce pas : sa capacité, bornée
    // par la place qui reste en sortie. On ne tire des fincas que ça — sinon la
    // pâte se vidait des champs vers un tampon de labo sans plafond : les jauges
    // de finca ne se remplissaient jamais et « la finca est pleine » ne pouvait
    // pas se déclencher.
    const convertible = Math.min(laboCapacite(l) * dt, place * pu.ratio);
    let besoin = Math.max(0, convertible - l.pate);
    for (const f of S.fincas) {
      if (besoin <= 0) break;
      const pris = Math.min(f.pate, besoin);
      f.pate -= pris; l.pate += pris; besoin -= pris;
    }

    let poudre = Math.min(convertible, l.pate) / pu.ratio;
    if (poudre <= 0) continue;

    // Les précurseurs se paient en liquide : impossible de faire tourner
    // l'usine sur de l'argent propre. C'est ce qui rend le sale nécessaire.
    const cout = poudre * PRECURSEURS_PAR_KG;
    if (!peutPayer(S, "liquide", cout)) {
      poudre = S.liquide / PRECURSEURS_PAR_KG;
      if (poudre <= 1e-9) { l.rupture = true; continue; }
    }
    l.rupture = false;
    flux(S, "liquide", -poudre * PRECURSEURS_PAR_KG, `Précurseurs · ${l.nom}`);
    l.pate -= poudre * pu.ratio;
    l.poudre += poudre;
    S.totaux.poudreKg += poudre;
    total += poudre;
  }
  return total;
}

/* ── 3. Transport ───────────────────────────────────────────────────────── */
function etapeTransport(S, dt) {
  // Les cargaisons en route arrivent, et se vendent au punto.
  for (const r of S.rutas) {
    for (const c of r.transit) c.reste -= dt;
    const arrivees = r.transit.filter((c) => c.reste <= 0);
    r.transit = r.transit.filter((c) => c.reste > 0);
    for (const c of arrivees) vendre(S, r, c.kg);
  }

  for (const r of S.rutas) {
    const m = MODES[r.mode];
    if (!r.active || r.bloquee) {
      r.suspicion = Math.max(0, r.suspicion - SUSPICION_REPOS * dt);
      r.kgJour = 0;
      continue;
    }
    // On charge ce que les labos ont sorti, dans la limite du débit du mode.
    let charge = m.debit * dt;
    let pris = 0;
    for (const l of S.labos) {
      if (charge <= 0) break;
      const q = Math.min(l.poudre, charge);
      l.poudre -= q; charge -= q; pris += q;
    }
    r.kgJour = pris / dt;

    if (pris <= 0) {
      r.suspicion = Math.max(0, r.suspicion - SUSPICION_REPOS * dt);
      continue;
    }

    const fret = pris * m.cout;
    flux(S, "liquide", -fret, `Fret · ${r.nom} (${m.nom})`);
    if (r.escorte > 0) {
      flux(S, "liquide", -r.escorte * ESCORTE_COUT_JOUR * dt, `Escorte · ${r.nom}`);
    }
    r.transit.push({ kg: pris, reste: m.transit });

    // LA jauge lisible : elle monte à chaque passage, elle ne tire rien au sort.
    r.suspicion += (pris / m.debit) * rutaTrace(S, r);
    if (r.suspicion >= SUSPICION_MAX) {
      r.suspicion = SUSPICION_MAX;
      r.bloquee = true;
      ouvrirControle(S, r);
    }
  }
}

function vendre(S, r, kg) {
  if (kg <= 0) return;
  const prix = puntoPrix(S, r.punto);
  const brut = kg * prix;
  S.puntos[r.punto].memoire += kg;
  S.totaux.exporteKg += kg;
  flux(S, "liquide", brut, `Export · ${PUNTOS[r.punto].nom}`);
}

/* ── 4. Les puntos respirent ────────────────────────────────────────────── */
function etapeLiquide(S, dt) {
  // La mémoire d'un punto s'efface : saturé aujourd'hui, il redevient payant si
  // on le laisse respirer. C'est ce qui interdit la ruta unique optimale.
  const k = Math.pow(0.5, dt / SATURATION_DEMI_VIE);
  for (const cle of Object.keys(S.puntos)) S.puntos[cle].memoire *= k;
}

/* ── 5. Blanchiment ─────────────────────────────────────────────────────── */
function etapeBlanchiment(S, dt) {
  // Ce qui dépasse la réserve d'exploitation, et rien d'autre.
  let blanchissable = Math.max(0, S.liquide - reserveOperationnelle(S));
  for (const f of S.fronts) {
    const def = FRONTS[f.type];
    if (f.gele) { f.blanchiJour = 0; continue; }

    const vise = frontDebit(f) * dt;
    const dispo = Math.min(vise, blanchissable);
    blanchissable -= dispo;
    f.blanchiJour = dispo / Math.max(dt, 1e-9);

    if (dispo > 1e-6) {
      const net = dispo * (1 - def.commission);
      flux(S, "liquide", -dispo, `Blanchiment · ${def.nom}`);
      flux(S, "propre", net, `Blanchi · ${def.nom} (−${Math.round(def.commission * 100)} % de commission)`);
    }

    // Au-dessus de ce que le commerce peut justifier, le fisc s'intéresse.
    const exces = f.blanchiJour - def.credibilite;
    if (exces > 0) {
      // `exces` est un débit €/jour ; × dt = les euros réellement passés en trop.
      f.soupcon += exces * dt * SOUPCON_PAR_EURO * def.soupcon;
      if (f.soupcon >= SOUPCON_MAX) { f.soupcon = SOUPCON_MAX; f.gele = true; ouvrirAudit(S, f); }
    } else {
      f.soupcon = Math.max(0, f.soupcon - SOUPCON_REPOS * dt);
    }
  }
}

/* ── 6. Entretien ───────────────────────────────────────────────────────── */
function etapeEntretien(S, dt) {
  if (S.politiciens > 0) {
    flux(S, "liquide", -S.politiciens * POLITICIEN_ENTRETIEN * dt, `Entretien · ${S.politiciens} politicien(s)`);
  }
}

/* ── 7. Pression et fin de partie ───────────────────────────────────────── */
function etapePression(S, dt) {
  if (S.chaleur > PRESSION_SEUIL) {
    const part = (S.chaleur - PRESSION_SEUIL) / (CHALEUR_MAX - PRESSION_SEUIL);
    S.pression += part * PRESSION_PAR_JOUR * dt;
  } else {
    S.pression = Math.max(0, S.pression - PRESSION_PAR_JOUR * 0.5 * dt);
  }
  if (S.pression >= PRESSION_MAX) { S.pression = 0; ouvrirDescente(S); }

  const p = palier(S.chaleur);
  if (p.cle === "extradition") {
    S.joursExtradition += dt;
    if (S.joursExtradition >= EXTRADITION_JOURS) {
      S.fini = {
        cle: "extradition",
        titre: "Extradition",
        texte: `Tu es resté ${EXTRADITION_JOURS} jours au-dessus de ${PALIERS[4].seuil} de chaleur. ` +
               `Le dossier est parti au nord. ${fmtEuro(S.totaux.propreCumule)} propres — c'est tout ce qui reste.`,
      };
    }
  } else {
    S.joursExtradition = Math.max(0, S.joursExtradition - dt);
  }
}

function etapeJalons(S) {
  for (const j of JALONS) {
    if (!S.jalons[j.propre] && S.totaux.propreCumule >= j.propre) {
      S.jalons[j.propre] = true;
      S.notifs.push({ jour: S.jour, texte: `🏆 ${j.titre} — ${j.texte}` });
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ÉVÉNEMENTS — trois formes, toutes déclenchées par un seuil visible
   ═══════════════════════════════════════════════════════════════════════════ */

function ouvrirControle(S, r) {
  const m = MODES[r.mode];
  const enRoute = r.transit.reduce((a, c) => a + c.kg, 0);
  const valeur = enRoute * puntoPrix(S, r.punto);
  const mordida = Math.round(Math.max(MORDIDA_MIN, valeur * MORDIDA_PART));
  const perdu = enRoute * m.perte;
  S.evenements.push({
    type: "controle", rutaId: r.id,
    titre: "Contrôle sur " + r.nom,
    texte: `Un barrage avant ${PUNTOS[r.punto].nom}. ${fmtKg(enRoute)} sont engagés sur la route, ` +
           `soit ${fmtEuro(valeur)}. Tu savais que ça venait : la jauge était pleine.`,
    options: [
      { cle: "mordida", label: "Payer la mordida",
        detail: `${fmtEuro(mordida)} liquide · la cargaison passe · suspicion à zéro · +${MORDIDA_CHALEUR} chaleur`,
        cout: mordida, devise: "liquide" },
      { cle: "forcer", label: "Forcer le passage",
        detail: `${fmtKg(perdu)} perdus (${Math.round(m.perte * 100)} % — ${fmtEuro(perdu * puntoPrix(S, r.punto))}) · suspicion à zéro · +${FORCER_CHALEUR} chaleur` },
      { cle: "fermer", label: "Fermer la ruta",
        detail: "Rien ne passe plus · la suspicion redescend seule · la cargaison rentre" },
    ],
  });
}

function ouvrirAudit(S, f) {
  const def = FRONTS[f.type];
  const amende = Math.round(def.debit * AUDIT_AMENDE * 10);
  S.evenements.push({
    type: "audit", frontId: f.id,
    titre: "Contrôle fiscal — " + def.nom,
    texte: `Tu as fait passer plus que ce que ${def.nom} peut justifier. Le compte est gelé.`,
    options: [
      { cle: "payer", label: "Arroser l'inspecteur",
        detail: `${fmtEuro(amende)} liquide · le front repart · soupçon à zéro`, cout: amende, devise: "liquide" },
      { cle: "brancher", label: "Mettre le front en sommeil",
        detail: "Gelé 0 € · le soupçon retombe tout seul · tu perds le débit en attendant" },
      { cle: "bruler", label: "Brûler le front",
        detail: "Le front disparaît · aucun soupçon ne subsiste" },
    ],
  });
}

function ouvrirDescente(S) {
  // Déterministe : c'est le nœud le plus exposé qui saute, jamais un tirage.
  const cible = cibleDescente(S);
  const mordida = Math.round(Math.max(DESCENTE_MORDIDA_MIN, cible.valeur * DESCENTE_PART));
  S.evenements.push({
    type: "descente", cibleType: cible.type, cibleId: cible.id,
    titre: "Descente sur " + cible.nom,
    texte: `${cible.detail} La pression était pleine — c'est le point le plus visible de l'empire qui prend.`,
    options: [
      { cle: "payer", label: "Acheter le commandant",
        detail: `${fmtEuro(mordida)} liquide · rien n'est saisi · +${MORDIDA_CHALEUR} chaleur`,
        cout: mordida, devise: "liquide" },
      { cle: "evacuer", label: "Évacuer dans l'urgence",
        detail: `${Math.round(DESCENTE_PERTE * 100)} % du stock perdu · rien à payer` },
      { cle: "resister", label: "Résister",
        detail: `Le stock est sauvé · +${FORCER_CHALEUR} chaleur · la pression repart de plus haut` },
    ],
  });
}

/** Le nœud le plus exposé = celui qui porte le plus de valeur visible. */
export function cibleDescente(S) {
  const prixRef = Math.max(...Object.keys(PUNTOS).map((c) => puntoPrix(S, c)));
  let best = null, score = -1;
  for (const l of S.labos) {
    const s = l.poudre * 3 + l.pate;      // la poudre pèse plus lourd que la pâte
    if (s > score) {
      score = s;
      best = { type: "labo", id: l.id, nom: l.nom, detail: `${fmtKg(l.poudre)} de poudre y dorment.`,
               valeur: l.poudre * prixRef + (l.pate / PURETES.standard.ratio) * prixRef * 0.5 };
    }
  }
  for (const f of S.fincas) {
    const s = f.pate * ZONES[f.zone].expo;
    if (s > score) {
      score = s;
      best = { type: "finca", id: f.id, nom: f.nom, detail: `${fmtKg(f.pate)} de pâte y attendent.`,
               valeur: (f.pate / PURETES.standard.ratio) * prixRef * 0.5 };
    }
  }
  return best || { type: "aucun", id: 0, nom: "un entrepôt vide", detail: "Ils n'ont rien trouvé.", valeur: 0 };
}

/** Applique le choix du joueur. Retourne le libellé de ce qui s'est passé. */
export function resoudre(S, index, cleOption) {
  const e = S.evenements[index];
  if (!e) return null;
  const opt = e.options.find((o) => o.cle === cleOption);
  if (!opt) return null;
  if (opt.cout && !peutPayer(S, opt.devise, opt.cout)) return null;

  let resultat = "";
  if (e.type === "controle") {
    const r = S.rutas.find((x) => x.id === e.rutaId);
    if (r) {
      if (cleOption === "mordida") {
        tx(S, "liquide", -opt.cout, `Mordida · barrage sur ${r.nom}`);
        S.totaux.mordidas++;
        S.chaleur = borne(S.chaleur + MORDIDA_CHALEUR, 0, CHALEUR_MAX);
        r.suspicion = 0; r.bloquee = false;
        resultat = `Le capitaine a pris l'argent. ${r.nom} rouvre.`;
      } else if (cleOption === "forcer") {
        const perte = MODES[r.mode].perte;
        let perdu = 0;
        for (const c of r.transit) { const p = c.kg * perte; c.kg -= p; perdu += p; }
        S.totaux.saisiKg += perdu;
        S.chaleur = borne(S.chaleur + FORCER_CHALEUR, 0, CHALEUR_MAX);
        r.suspicion = 0; r.bloquee = false;
        resultat = `${perdu.toFixed(1)} kg laissés sur le bitume. ${r.nom} rouvre.`;
      } else {
        r.active = false; r.bloquee = false; r.suspicion = SUSPICION_MAX * 0.6;
        resultat = `${r.nom} est fermée. La suspicion va retomber toute seule.`;
      }
    }
  } else if (e.type === "audit") {
    const f = S.fronts.find((x) => x.id === e.frontId);
    if (f) {
      const def = FRONTS[f.type];
      if (cleOption === "payer") {
        tx(S, "liquide", -opt.cout, `Amende maquillée · ${def.nom}`);
        f.soupcon = 0; f.gele = false;
        resultat = `${def.nom} rouvre ses portes.`;
      } else if (cleOption === "brancher") {
        f.gele = true; f.intensite = Math.min(f.intensite, 1);
        resultat = `${def.nom} dort. Réveille-le quand le soupçon sera retombé.`;
      } else {
        S.fronts = S.fronts.filter((x) => x.id !== f.id);
        resultat = `${def.nom} n'a jamais existé.`;
      }
    }
  } else if (e.type === "descente") {
    const noeud = e.cibleType === "labo"
      ? S.labos.find((x) => x.id === e.cibleId)
      : S.fincas.find((x) => x.id === e.cibleId);
    if (cleOption === "payer") {
      tx(S, "liquide", -opt.cout, "Mordida · descente");
      S.totaux.mordidas++;
      S.chaleur = borne(S.chaleur + MORDIDA_CHALEUR, 0, CHALEUR_MAX);
      resultat = "Le commandant a trouvé une adresse vide.";
    } else if (cleOption === "evacuer" && noeud) {
      const perduP = (noeud.poudre || 0) * DESCENTE_PERTE;
      const perduPate = (noeud.pate || 0) * DESCENTE_PERTE;
      if (noeud.poudre !== undefined) noeud.poudre -= perduP;
      noeud.pate -= perduPate;
      S.totaux.saisiKg += perduP + perduPate / PURETES.standard.ratio;
      resultat = `${(perduP + perduPate).toFixed(0)} kg saisis pendant l'évacuation.`;
    } else {
      S.chaleur = borne(S.chaleur + FORCER_CHALEUR, 0, CHALEUR_MAX);
      S.pression = PRESSION_MAX * 0.35;
      resultat = "Ils sont repartis. Ils reviendront plus vite.";
    }
  }

  S.evenements.splice(index, 1);
  if (resultat) S.notifs.push({ jour: S.jour, texte: resultat });
  return resultat;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DÉCISIONS DU JOUEUR — chacune vérifie la caisse et journalise sa cause
   ═══════════════════════════════════════════════════════════════════════════ */

export function acheterFinca(S, zone) {
  const z = ZONES[zone];
  if (!z || S.fincas.length >= FINCA_MAX || !peutPayer(S, "propre", z.prix)) return false;
  tx(S, "propre", -z.prix, `Achat finca · ${z.nom}`);
  ajouterFinca(S, zone, rngPresentation(S._rndSeed + S.fincas.length * 7919), "Achat");
  return true;
}
export function ameliorerFinca(S, id) {
  const f = S.fincas.find((x) => x.id === id);
  if (!f || f.niveau >= FINCA_NIVEAU_MAX) return false;
  const prix = FINCA_UPGRADE_PRIX[f.niveau];
  if (!peutPayer(S, "propre", prix)) return false;
  tx(S, "propre", -prix, `Agrandissement · ${f.nom} niv.${f.niveau + 1}`);
  f.niveau++;
  return true;
}
export function acheterLabo(S) {
  if (S.labos.length >= LABO_MAX || !peutPayer(S, "propre", LABO_PRIX)) return false;
  tx(S, "propre", -LABO_PRIX, "Nouveau labo");
  ajouterLabo(S, rngPresentation(S._rndSeed + S.labos.length * 6271), "Achat");
  return true;
}
export function ameliorerLabo(S, id) {
  const l = S.labos.find((x) => x.id === id);
  if (!l || l.niveau >= LABO_NIVEAU_MAX) return false;
  const prix = LABO_UPGRADE_PRIX[l.niveau];
  if (!peutPayer(S, "propre", prix)) return false;
  tx(S, "propre", -prix, `Agrandissement · ${l.nom} niv.${l.niveau + 1}`);
  l.niveau++;
  return true;
}
export function reglerPurete(S, id, purete) {
  const l = S.labos.find((x) => x.id === id);
  if (!l || !PURETES[purete]) return false;
  l.purete = purete;
  return true;
}
export function acheterRuta(S, mode, punto) {
  const m = MODES[mode];
  if (!m || !PUNTOS[punto] || S.rutas.length >= RUTA_MAX) return false;
  if (!peutPayer(S, "propre", m.prix)) return false;
  if (m.prix > 0) tx(S, "propre", -m.prix, `Ouverture ruta · ${m.nom}`);
  ajouterRuta(S, mode, punto, rngPresentation(S._rndSeed + S.rutas.length * 5417), "Achat");
  return true;
}
export function basculerRuta(S, id) {
  const r = S.rutas.find((x) => x.id === id);
  if (!r || r.bloquee) return false;
  r.active = !r.active;
  return true;
}
export function reglerEscorte(S, id, n) {
  const r = S.rutas.find((x) => x.id === id);
  if (!r) return false;
  r.escorte = borne(Math.round(n), 0, ESCORTE_MAX);
  return true;
}
export function reglerPunto(S, id, punto) {
  const r = S.rutas.find((x) => x.id === id);
  if (!r || !PUNTOS[punto]) return false;
  r.punto = punto;
  return true;
}
export function acheterCache(S) {
  if (S.cacheNiveau >= CACHE_NIVEAU_MAX) return false;
  const prix = CACHE_PRIX[S.cacheNiveau + 1];
  if (!peutPayer(S, "propre", prix)) return false;
  tx(S, "propre", -prix, `Planque niv.${S.cacheNiveau + 1} · +${CACHE_GAIN} m³`);
  S.cacheNiveau++;
  return true;
}
export function acheterFront(S, type) {
  const def = FRONTS[type];
  if (!def || S.fronts.some((f) => f.type === type)) return false;   // un seul de chaque
  if (!peutPayer(S, "propre", def.prix)) return false;
  tx(S, "propre", -def.prix, `Achat front · ${def.nom}`);
  ajouterFront(S, type, "Achat");
  return true;
}
export function reglerIntensite(S, id, v) {
  const f = S.fronts.find((x) => x.id === id);
  if (!f) return false;
  f.intensite = borne(v, 0, INTENSITE_MAX);
  return true;
}
export function reveillerFront(S, id) {
  const f = S.fronts.find((x) => x.id === id);
  if (!f || !f.gele || f.soupcon > 0) return false;
  f.gele = false;
  return true;
}
export function reglerReserve(S, jours) {
  S.reserveJours = borne(jours, 0, RESERVE_JOURS_MAX);
  return true;
}
export function acheterPoliticien(S) {
  const prix = politicienPrix(S);
  if (S.politiciens >= POLITICIEN_MAX || !peutPayer(S, "liquide", prix)) return false;
  tx(S, "liquide", -prix, "Un juge de plus dans la poche");
  S.politiciens++;
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AGRÉGATION DU REGISTRE — « pourquoi je perds de l'argent », sur N jours
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Regroupe le registre par cause de premier niveau (avant le « · ») sur les
 * `jours` derniers jours. L'onglet Registre affiche le détail jour par jour ;
 * ceci sert aux vues de synthèse et aux tests.
 */
export function bilan(S, jours = 3) {
  const lignes = new Map();
  const depuis = S.jour - jours;
  for (const e of S.registre) {
    if (e.jour < depuis) continue;
    const cle = String(e.cause).split(" · ")[0];
    const l = lignes.get(cle) || { cause: cle, liquide: 0, propre: 0 };
    if (e.champ === "liquide" || e.champ === "propre") l[e.champ] += e.montant;
    lignes.set(cle, l);
  }
  return [...lignes.values()]
    .filter((l) => Math.abs(l.liquide) + Math.abs(l.propre) > 1)
    .sort((a, b) => (a.liquide + a.propre) - (b.liquide + b.propre));
}

/** Les débits instantanés, en €/jour. C'est ce que le bandeau affiche. */
export function rythmes(S) {
  const exportJour = S.rutas.reduce(
    (a, r) => a + (r.active && !r.bloquee ? r.kgJour * puntoPrix(S, r.punto) : 0), 0);
  const ch = charges(S);
  const blanchiJour = S.fronts.reduce((a, f) => a + (f.gele ? 0 : f.blanchiJour), 0);
  const propreJour = S.fronts.reduce(
    (a, f) => a + (f.gele ? 0 : f.blanchiJour * (1 - FRONTS[f.type].commission)), 0);
  return {
    exportJour, charges: ch, blanchiJour, propreJour,
    netLiquide: exportJour - ch.total - blanchiJour,
    entreeSale: exportJour - ch.total,
  };
}

/**
 * « Pourquoi je perds de l'argent ? » — la réponse, en trois lignes au plus,
 * chacune désignant un objet NOMMÉ du jeu et pas une catégorie abstraite.
 * C'est la sim qui la produit : l'UI n'a pas le droit d'inventer du texte d'état.
 */
export function diagnostics(S) {
  const d = [];
  const r = rythmes(S);

  for (const ruta of S.rutas) {
    if (ruta.bloquee) d.push({ ton: "mal", texte: `${ruta.nom} est bloquée par un contrôle`, detail: "Rien ne passe tant que tu n'as pas tranché." });
    else if (!ruta.active) d.push({ ton: "tiede", texte: `${ruta.nom} est à l'arrêt`, detail: "Sa suspicion redescend, mais elle ne rapporte rien." });
  }
  for (const l of S.labos) {
    if (l.rupture) d.push({ ton: "mal", texte: `${l.nom} est à sec de précurseurs`, detail: "Plus de liquide pour acheter les précurseurs : l'usine s'arrête." });
    else if (l.poudre >= LABO_STOCK_MAX - 0.01) d.push({ ton: "tiede", texte: `${l.nom} déborde de poudre`, detail: "Les rutas n'enlèvent pas assez vite — la production est perdue." });
  }
  for (const f of S.fincas) {
    if (f.pate >= FINCA_STOCK_MAX - 0.01) d.push({ ton: "tiede", texte: `${f.nom} est pleine`, detail: "Les labos ne suivent pas : la pâte s'entasse et les paysans sont payés pour rien." });
  }
  for (const f of S.fronts) {
    if (f.gele) d.push({ ton: "mal", texte: `${FRONTS[f.type].nom} est gelé par le fisc`, detail: "Il n'absorbe plus rien." });
  }

  const expose = volumeExpose(S);
  if (expose > 0.01) {
    d.push({ ton: "mal", texte: `${expose.toFixed(2)} m³ de liquide dorment dehors`,
             detail: `La planque est pleine : +${(expose * CHALEUR_EXPOSE).toFixed(0)} points de chaleur visée.` });
  }
  const surplus = r.entreeSale - capaciteBlanchiment(S);
  if (surplus > 0 && capaciteBlanchiment(S) > 0) {
    d.push({ ton: "tiede", texte: `Tu encaisses ${fmtEuro(surplus)}/j de plus que tu ne sais blanchir`,
             detail: `Entrée sale ${fmtEuro(r.entreeSale)}/j · lessive ${fmtEuro(capaciteBlanchiment(S))}/j.` });
  }
  if (S.liquide <= reserveOperationnelle(S) + 1 && S.fronts.length) {
    d.push({ ton: "tiede", texte: "Le liquide est au niveau de la réserve",
             detail: `Les fronts ne touchent plus à rien : ${S.reserveJours} j de charges sont sanctuarisés.` });
  }
  const p = palier(S.chaleur);
  if (p.prix < 1) {
    d.push({ ton: "mal", texte: `${p.nom} : les acheteurs paient ${Math.round((1 - p.prix) * 100)} % de moins`, detail: p.desc });
  } else if (p.prix > 1) {
    d.push({ ton: "bien", texte: `${p.nom} : le corridor paie ${Math.round((p.prix - 1) * 100)} % de plus`, detail: p.desc });
  }
  if (p.cle === "extradition") {
    d.push({ ton: "mal", texte: `Extradition dans ${(EXTRADITION_JOURS - S.joursExtradition).toFixed(1)} j`,
             detail: "Redescends sous 92 de chaleur, ou la partie s'arrête." });
  }
  return d;
}

export function fmtEuro(n) {
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(".", ",") + " Md€";
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2).replace(".", ",") + " M€";
  if (a >= 1_000) return Math.round(n / 1000) + " k€";
  return Math.round(n) + " €";
}
export function fmtKg(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + " t";
  return n.toFixed(n < 10 ? 1 : 0) + " kg";
}
