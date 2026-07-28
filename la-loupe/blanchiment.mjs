/* Le blanchiment — PUR : aucun DOM, aucun accès à l'état global. Testable hors navigateur.

   POURQUOI CE MODULE EXISTE, ET POURQUOI IL N'EXISTAIT PAS AVANT.

   `S.cash` (le propre) était produit par la trieuse et ne servait À RIEN : c'est ce qui a
   fait couper la trieuse (`SORTER_ENABLED=false`) ET le front de Karim (dette payable en
   propre, sans source de propre). Une monnaie sans débouché n'est pas une monnaie, c'est
   un compteur. Le blanchiment ne vaut donc que s'il s'ouvre EN MÊME TEMPS qu'un débouché ;
   ici, c'est le rachat du fonds de commerce — la laverie qu'on loue, on finit par
   l'acheter (arbitrage Sylvain, 2026-07-28 : « on loue avant de pouvoir acheter »).
   La boucle se referme donc sur elle-même dès la première brique : blanchir paie ce qui
   permet de blanchir plus.

   TROIS PARAMÈTRES, PAS UN (arbitrage Sylvain) : « temps, capacité comme goulot
   d'étranglement et PAS seulement une taxe dessus ». Une taxe seule se paie et s'oublie —
   elle rend le blanchiment gratuit pour qui gagne beaucoup, exactement le défaut mesuré
   sur la pension fixe de la nourrice. Le PLAFOND JOURNALIER et le DÉLAI, eux, ne se
   rattrapent pas avec de l'argent : ils bornent le débit, donc la vitesse à laquelle
   l'empire peut grandir. C'est le goulot.

   CE QUI EST ENGAGÉ EST SÛR (R1). Une fois déposé, l'argent ne peut plus être saisi : ni
   par une descente, ni par la nourrice. C'est la contrepartie du délai — sans elle, le
   joueur paierait des frais ET porterait un risque, ce qui ferait du blanchiment une
   punition pour avoir bien vendu. Le prix du blanchiment, c'est le temps et le plafond.

   AUCUN ALÉA (R4). Le délai est un nombre de jours fixe, les frais un pourcentage fixe,
   le plafond un montant fixe. Rien n'est tiré. Le joueur peut calculer au billet près ce
   qu'il touchera et quand — et l'écran le lui dit AVANT qu'il valide (R8). */

const R = Math.round;

/* Les laveries. Chacune a DEUX états — loué puis possédé — et c'est le même lieu :
   racheter le fonds ne débloque pas un nouveau bâtiment, ça améliore celui qu'on connaît
   déjà. Le joueur a donc mesuré la friction avant de payer pour la réduire (R2).

   [PLACEHOLDER] — tous les nombres attendent le tuning humain. Ordre de grandeur visé :
   à pleine capacité louée, racheter le fonds demande une dizaine de soirées. */
export const LAVERIES = [
  {
    id: "barber",
    nm: "Chez Sofiane",
    ic: "💈",
    lieu: "Barber shop, deux fauteuils",
    blurb: "Trois coupes par jour et une caisse qui ne ferme jamais. Il ne pose pas de questions — il pose un tarif.",
    // loué : cher, étroit, mais disponible tout de suite
    loue: { frais: 0.22, capJour: 400, delai: 2 },
    // possédé : c'est TA caisse, tu ne paies plus que les charges
    possede: { frais: 0.08, capJour: 900, delai: 2 },
    prixFonds: 3500,           // en PROPRE — le premier vrai débouché du blanchi
    debloqueA: 0,              // disponible d'emblée : sans elle, le propre n'a aucune source
  },
  {
    id: "epicerie",
    nm: "L'Épicerie du bas",
    ic: "🏪",
    lieu: "Alimentation générale, ouvert tard",
    blurb: "Elle fait des chiffres qui ne ressemblent à rien depuis vingt ans. Une ligne de plus ne se verra pas.",
    loue: { frais: 0.18, capJour: 700, delai: 3 },
    possede: { frais: 0.07, capJour: 1500, delai: 3 },
    prixFonds: 9000,
    debloqueA: 1,              // s'ouvre quand on possède déjà un fonds : on ne loue pas deux fois en aveugle
  },
];

export const laverieById = (id) => LAVERIES.find((l) => l.id === id) || null;

/** L'état neuf. `possede` est la seule chose qui se gagne ; `depots` est la file. */
export function blanchimentDefaults() {
  return { laveries: {}, depots: [], seq: 0 };
}

/** Les paramètres EN VIGUEUR pour une laverie, selon qu'on la loue ou qu'on la possède.
    Un seul endroit : l'écran qui annonce et la clôture qui applique lisent la même chose,
    sinon l'annonce finit par mentir — c'est la leçon de l'impayé. */
export function reglesDe(laverie, etat) {
  if (!laverie) return null;
  return (etat && etat.possede) ? laverie.possede : laverie.loue;
}

/** Combien de fonds le joueur possède déjà — c'est ce qui ouvre les laveries suivantes. */
export function fondsPossedes(B) {
  return Object.values((B && B.laveries) || {}).filter((e) => e && e.possede).length;
}

/** Les laveries que le joueur peut voir. On n'affiche pas ce qui est hors d'atteinte :
    une liste de lieux verrouillés est un catalogue, pas une décision. */
export function laveriesOuvertes(B) {
  const n = fondsPossedes(B);
  return LAVERIES.filter((l) => n >= l.debloqueA);
}

/** Ce qui a déjà été déposé dans cette laverie AUJOURD'HUI. Le plafond est journalier et
    par lieu : c'est ce qui pousse à en ouvrir plusieurs plutôt qu'à en gaver une seule. */
export function deposeAujourdhui(B, laverieId, jour) {
  return R(((B && B.depots) || [])
    .filter((d) => d.laverieId === laverieId && d.jourDepot === jour)
    .reduce((a, d) => a + d.brut, 0));
}

/** Ce qu'on peut encore déposer ici aujourd'hui. */
export function resteAujourdhui(B, laverie, jour) {
  const etat = ((B && B.laveries) || {})[laverie.id] || {};
  const r = reglesDe(laverie, etat);
  return Math.max(0, r.capJour - deposeAujourdhui(B, laverie.id, jour));
}

/** Le devis d'un dépôt, AVANT de le valider (R8). Rend toujours un objet lisible : quand
    ça ne passe pas, il porte la RAISON — jamais un refus muet (R1). */
export function devis(B, laverie, jour, brut) {
  const etat = ((B && B.laveries) || {})[laverie.id] || {};
  const r = reglesDe(laverie, etat);
  const reste = resteAujourdhui(B, laverie, jour);
  const montant = Math.min(R(brut || 0), reste);
  if (!(montant > 0)) {
    return { ok: false, raison: reste <= 0 ? "plafond du jour atteint" : "rien à déposer",
             brut: 0, frais: 0, net: 0, reste, delai: r.delai, tauxFrais: r.frais };
  }
  const frais = R(montant * r.frais);
  return { ok: true, brut: montant, frais, net: montant - frais, reste,
           delai: r.delai, tauxFrais: r.frais, jourPret: jour + r.delai };
}

/** Pose un dépôt dans la file. Rend le dépôt créé (ou null) — l'appelant débite lui-même :
    ce module ne connaît pas l'état global, et c'est ce qui le garde testable. */
export function deposer(B, laverie, jour, brut) {
  const d = devis(B, laverie, jour, brut);
  if (!d.ok) return null;
  B.seq = (B.seq || 0) + 1;
  const depot = { id: B.seq, laverieId: laverie.id, brut: d.brut, frais: d.frais,
                  net: d.net, jourDepot: jour, jourPret: d.jourPret };
  B.depots.push(depot);
  return depot;
}

/** Ce qui est encore en route, et pour combien de temps. Sert à l'écran : le joueur doit
    voir sa file AVANT d'y ajouter (R8), sinon il empile à l'aveugle. */
export function enRoute(B, jour) {
  return ((B && B.depots) || [])
    .filter((d) => d.jourPret > jour)
    .sort((a, b) => a.jourPret - b.jourPret || a.id - b.id);
}

/** Total engagé — l'argent qui ne peut plus être saisi, et qui n'est pas encore là. */
export function totalEnRoute(B, jour) {
  return R(enRoute(B, jour).reduce((a, d) => a + d.net, 0));
}

/** Les dépôts arrivés à échéance. Les RETIRE de la file et les rend, pour que la clôture
    crédite et écrive une cause par ligne — un virement sans cause serait exactement ce que
    le Karnet reproche au reste du monde. */
export function encaisser(B, jour) {
  const prets = ((B && B.depots) || []).filter((d) => d.jourPret <= jour);
  if (!prets.length) return [];
  B.depots = B.depots.filter((d) => d.jourPret > jour);
  return prets;
}

/** Le rachat du fonds. Rend un devis lisible plutôt qu'un booléen : l'écran doit pouvoir
    dire POURQUOI ça ne passe pas. */
export function devisRachat(B, laverie, propre) {
  const etat = ((B && B.laveries) || {})[laverie.id] || {};
  if (etat.possede) return { ok: false, raison: "déjà à toi", prix: 0 };
  const prix = laverie.prixFonds;
  if ((propre || 0) < prix) {
    return { ok: false, raison: `il te manque ${R(prix - propre)} en propre`, prix,
             manque: R(prix - (propre || 0)) };
  }
  return { ok: true, prix, avant: laverie.loue, apres: laverie.possede };
}

/** Marque le fonds comme acquis. L'appelant débite le propre. */
export function racheter(B, laverie) {
  if (!B.laveries) B.laveries = {};
  const e = (B.laveries[laverie.id] = B.laveries[laverie.id] || {});
  if (e.possede) return false;
  e.possede = true;
  return true;
}

/** Capacité journalière totale, tous lieux ouverts confondus. C'est LE nombre qui dit à
    quelle vitesse l'empire peut grandir — donc celui que l'écran doit afficher en grand. */
export function capaciteJour(B) {
  return laveriesOuvertes(B).reduce((a, l) => {
    const e = ((B && B.laveries) || {})[l.id] || {};
    return a + reglesDe(l, e).capJour;
  }, 0);
}
