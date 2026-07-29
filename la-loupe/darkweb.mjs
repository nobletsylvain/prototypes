/* Le marché du dark web — PUR : aucun DOM, aucun état global. Testable hors navigateur.

   RÉCOLTÉ SUR `darkweb-market/` (« Onion Market »), sur indication de Sylvain. Ma première
   version était un catalogue de trois offres fixes ; celle du proto est un vrai marché.
   Ce qui a été repris, et pourquoi chaque pièce mérite de l'être :

   1. LA NOTE DÉCIDE DE CE QUI ARRIVE. `realQual = annoncée × (0,5 + 0,1 × note)`. La
      qualité affichée n'est PAS celle qu'on reçoit, et l'écart est une fonction
      déterministe d'une note publique. PneuDeSecours (2,1★) annonce 74 et livre 53 ;
      AtlasFinest (4,2★) annonce 85 et livre 78. Le vendeur pas cher n'est donc pas un
      piège, c'est un CALCUL — R4 dans sa meilleure forme : le risque est lisible,
      arithmétique, et il ne surprend jamais celui qui lit.

   2. CE N'EST PAS UNE AMÉLIORATION, C'EST UN ÉVENTAIL. Mesuré, en ramenant tout au point
      de qualité réellement livré :

        cheap (livre 53–62) …… 7,9–8,1     l'Appro de La Loupe (q78) …… 8,7
        mid   (livre 71–78) …… 9,6         premium (livre 86–92) ……… 14–15

      Le pas cher est donc MOINS cher au point de qualité que l'Appro, mais il livre du 53.
      Ma version faisait du marché un simple palier supérieur ; celle-ci en fait un
      arbitrage — et elle branche enfin l'appro sur ce que le corner récompense (les
      personas connaisseurs paient la qualité, les autres non).

   3. LES REMISES SE GAGNENT ET SE PLAFONNENT. Volume, fidélité et rang de réputation
      s'additionnent, mais le plafond est PLUS SERRÉ là où le produit est meilleur
      (32 % en cheap, 14 % en premium). Le premium ne brade pas : c'est ce qui empêche la
      progression d'aplatir le choix (R9 — la tension se règle au niveau système).

   4. LES GROSSES QUANTITÉS EXIGENT UN PASSÉ. On n'arrive pas en achetant 2 kg : le rang
      vient du nombre de commandes chez CE vendeur. Une relation, pas un niveau global.

   CE QUI N'A PAS ÉTÉ REPRIS, ET POURQUOI. Le proto porte aussi une économie de REVENTE
   sur le marché (prix + qualité annoncée par le joueur, demande déterministe, falaise de
   confiance quand la tromperie s'accumule). C'est un second système complet, et La Loupe
   vend au corner — on ne le prend pas tant que ça n'a pas été arbitré. Idem pour les
   familles hors hash (coke, MDMA, speed, cachets) et pour les fournitures (agents de
   coupe, presse, précurseurs) — ces dernières valent d'être regardées de près le jour où
   on touchera au levier de coupe (R10).

   CE QUI A ÉTÉ CHANGÉ POUR LA LOUPE. Le proto livre immédiatement ; ici la livraison prend
   des jours, et plus la commande est grosse plus elle traîne. C'est l'arbitrage « temps et
   capacité comme goulot » : sans délai, la crypto n'achèterait qu'un prix. */

const R = Math.round;

/* Roster : résine et extraction seulement — c'est ce que La Loupe sait manipuler. Prix en
   CRYPTO. Repris du proto sans retoucher les nombres : les deux protos étaient déjà
   calibrés l'un sur l'autre, et y toucher casserait la comparaison ci-dessus.
   [PLACEHOLDER] — en attente de tuning humain. */
export const VENDEURS = [
  { id: "pneu", nm: "PneuDeSecours", ic: "🛞", tier: "cheap", note: 2.1, ventes: 418,
    prod: "Hash marocain", eurG: 4.2, annoncee: 74, qtys: [50, 100, 250, 500],
    desc: "Gros volumes, prix planché. Beaucoup d'avis tièdes : « pas ce qui est sur la photo »." },
  { id: "bazar", nm: "BazarDuBled", ic: "🐫", tier: "cheap", note: 3.0, ventes: 1102,
    prod: "Hash pollen", eurG: 5.0, annoncee: 78, qtys: [50, 100, 250, 500],
    desc: "Le volume du marché. Correct sans plus, livre à peu près ce qu'il annonce." },
  { id: "atlas", nm: "AtlasFinest", ic: "⛰️", tier: "mid", note: 4.2, ventes: 734,
    prod: "Hash Ketama", eurG: 7.5, annoncee: 85, qtys: [25, 50, 100, 250],
    desc: "Bonne réput, peu de litiges. Un cran au-dessus en propreté." },
  { id: "camo", nm: "CaramelBeldia", ic: "🍯", tier: "mid", note: 3.7, ventes: 289,
    prod: "Beldia artisanal", eurG: 6.8, annoncee: 82, qtys: [25, 50, 100, 250],
    desc: "Petit producteur, lots irréguliers mais honnêtes. Parfois en-dessous de l'annonce." },
  { id: "frost", nm: "FrostbiteLab", ic: "❄️", tier: "premium", note: 4.8, ventes: 512,
    prod: "Ice-o-lator 1ère coulée", eurG: 14.0, annoncee: 94, qtys: [25, 50, 100, 250],
    desc: "Top du marché. PGP signé, escrow, lab-tested. Ce que tu commandes EST ce qui arrive." },
  { id: "verde", nm: "VerdeReserva", ic: "🫒", tier: "premium", note: 4.5, ventes: 201,
    prod: "Dry-sift 120µ", eurG: 12.0, annoncee: 90, qtys: [25, 50, 100, 250],
    desc: "Réserve haut de gamme, stock limité. Min. de commande bas, idéal pour tester." },
];

export const vendeurById = (id) => VENDEURS.find((v) => v.id === id) || null;

/* ── Les fonctions déterministes (cœur du design, reprises telles quelles) ── */

/** Fiabilité 0..1 depuis la note. Une note de 5 livre 100 % de l'annonce, une note de 0
    en livre la moitié : personne ne ment TOTALEMENT, et personne n'est parfait par défaut. */
export const fiabilite = (note) => Math.min(1, 0.5 + 0.1 * note);
/** LA fonction. Ce qu'on reçoit vraiment — affiché à l'écran avant de commander (R8),
    parce qu'un écart caché serait un dé déguisé en vendeur. */
export const qualiteReelle = (v) => R(v.annoncee * fiabilite(v.note));

/** Plafond de remise par tier. Plus serré là où le produit est meilleur : le premium ne
    brade pas, donc la progression n'aplatit jamais le choix (R9). */
export const CAP_REMISE = { cheap: 32, mid: 24, premium: 14 };
/** Remise « gros volume ». C'est en bas de gamme qu'on fait les affaires de volume. */
const BULK = {
  cheap:   [[500, 16], [250, 11], [100, 7], [50, 3]],
  mid:     [[250, 12], [100, 9], [50, 6], [25, 3]],
  premium: [[250, 7], [100, 5], [50, 2]],
};
export function remiseVolume(v, g) {
  for (const [seuil, pct] of BULK[v.tier]) if (g >= seuil) return pct;
  return 0;
}
/** Palier de fidélité, depuis le nombre de commandes passées CHEZ CE VENDEUR. Une
    relation, pas un niveau global : c'est ce qui rend le choix d'un fournisseur durable. */
export function fidelite(n) {
  if (n >= 10) return { lvl: "régulier", pct: 8 };
  if (n >= 5)  return { lvl: "habitué",  pct: 5 };
  if (n >= 2)  return { lvl: "connu",    pct: 2 };
  return { lvl: "nouveau", pct: 0 };
}
/** Rang chez ce vendeur — c'est lui qui ouvre les grosses quantités. */
export const rang = (n) => (n >= 10 ? 3 : n >= 5 ? 2 : n >= 2 ? 1 : 0);
/** Rang requis par une quantité. On n'arrive pas en commandant 500 g. */
export const rangRequis = (g) => (g >= 500 ? 3 : g >= 250 ? 2 : g >= 100 ? 1 : 0);

export function commandesChez(D, id) { return ((D && D.rel) || {})[id] || 0; }

/** L'échelle de quantités d'un vendeur, avec ce qui est encore fermé et pourquoi. */
export function echelle(D, v) {
  const n = commandesChez(D, v.id), r = rang(n);
  return v.qtys.map((g) => ({ g, besoin: rangRequis(g), ouvert: r >= rangRequis(g) }));
}

/** Remise totale, plafonnée. Volume + fidélité, jamais au-delà du plafond du tier. */
export function remise(D, v, g) {
  const f = fidelite(commandesChez(D, v.id)).pct;
  return Math.min(CAP_REMISE[v.tier], f + remiseVolume(v, g));
}

/* Le délai : plus la commande est grosse, plus elle traîne. Sans ça, la crypto
   n'achèterait qu'un prix — or l'arbitrage était « temps ET capacité comme goulot ». */
export const delaiDe = (g) => (g >= 500 ? 5 : g >= 250 ? 4 : g >= 100 ? 3 : 2);

export function darkwebDefaults() {
  return { commandes: [], rel: {}, seq: 0, recues: 0 };
}

/** Le devis, AVANT de valider (R8). Porte toujours la raison d'un refus — jamais muet. */
export function devisCommande(D, v, g, crypto) {
  if (!v) return { ok: false, raison: "vendeur inconnu" };
  const n = commandesChez(D, v.id);
  if (rang(n) < rangRequis(g)) {
    const manque = [2, 5, 10][rangRequis(g) - 1] - n;
    return { ok: false, raison: `${manque} commande${manque > 1 ? "s" : ""} de plus chez lui`,
             g, pct: 0, prix: 0 };
  }
  const pct = remise(D, v, g);
  const prix = R(v.eurG * g * (1 - pct / 100));
  const qr = qualiteReelle(v);
  if ((crypto || 0) < prix) {
    return { ok: false, raison: `il te manque ${R(prix - (crypto || 0))} en crypto`,
             g, pct, prix, qReel: qr, manque: R(prix - (crypto || 0)), delai: delaiDe(g) };
  }
  return { ok: true, g, pct, prix, qReel: qr, delai: delaiDe(g),
           prixGramme: +(prix / g).toFixed(2),
           // le vrai coût : par point de qualité RÉELLEMENT livré. C'est la comparaison
           // que le joueur ne peut pas faire de tête, et la seule qui départage les tiers.
           parPoint: +(prix / g / qr * 100).toFixed(1) };
}

/** Passe la commande. L'appelant débite la crypto — ce module ignore l'état global. */
export function commander(D, v, g, jour, crypto) {
  const d = devisCommande(D, v, g, crypto);
  if (!d.ok) return null;
  D.seq = (D.seq || 0) + 1;
  if (!D.rel) D.rel = {};
  D.rel[v.id] = (D.rel[v.id] || 0) + 1;
  const cmd = { id: D.seq, vendeurId: v.id, g, q: d.qReel, prix: d.prix, pct: d.pct,
                jour, jourLivraison: jour + d.delai, split: 250 };
  if (!Array.isArray(D.commandes)) D.commandes = [];
  D.commandes.push(cmd);
  return cmd;
}

export function enTransit(D, jour) {
  return ((D && D.commandes) || []).filter((c) => c.jourLivraison > jour)
    .sort((a, b) => a.jourLivraison - b.jourLivraison || a.id - b.id);
}
export function grammesEnTransit(D, jour) {
  return R(enTransit(D, jour).reduce((a, c) => a + c.g, 0));
}
export function livrer(D, jour) {
  const prets = ((D && D.commandes) || []).filter((c) => c.jourLivraison <= jour);
  if (!prets.length) return [];
  D.commandes = D.commandes.filter((c) => c.jourLivraison > jour);
  D.recues = (D.recues || 0) + prets.length;
  return prets;
}

/** Les pains d'une commande. Chacun garde SA qualité — celle qui a été RÉELLEMENT livrée,
    pas celle qui était annoncée. Même découpage que l'Appro : le reste du jeu ne sait
    manipuler que des pains. */
export function painsDe(cmd) {
  const out = [], chunk = cmd.split || cmd.g;
  for (let left = cmd.g; left > 0; left -= chunk) out.push({ g: Math.min(chunk, left), q: cmd.q });
  return out;
}
