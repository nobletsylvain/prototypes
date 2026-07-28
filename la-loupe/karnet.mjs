/* Karnet — les agrégats du bilan de soirée. PURS : aucun DOM, aucun accès à l'état global.
   Testable hors navigateur, comme corner.mjs.

   Ce que ce module produit, et pourquoi c'est écrit comme ça :

   LE PONT. Le Karnet doit répondre à « pourquoi hier a rapporté 310 de moins qu'avant-
   hier », poste par poste. Un pont dont la somme ne tombe pas juste est un MENSONGE : il
   donne au joueur l'impression de comprendre et l'envoie décider sur un total faux — pire
   que l'ancien journal, qui n'expliquait rien mais ne mentait pas.
   La somme est donc juste PAR CONSTRUCTION : chaque poste du pont est la différence du
   même poste entre les deux soirées, et la marge est la somme de ces postes. L'égalité
   n'est pas vérifiée après coup, elle est structurelle. `ecartExplique === ecartReel` est
   quand même contrôlé par les tests : une construction qui se croit correcte, ça existe.

   CE QUI N'ENTRE PAS DANS LA MARGE. Les ruptures, les départs fâchés et la descente sont
   du MANQUE À GAGNER, pas des dépenses. Les mélanger au pont casserait la somme et
   ferait passer une vente jamais conclue pour de l'argent sorti de la poche. Ils vivent
   donc dans un bloc séparé, nommé comme tel.

   TROIS PERTES, TROIS CASES. « Tu as perdu 380 » n'aide personne : le joueur ne sait pas
   s'il doit couper un autre format, ravitailler plus, ou baisser son prix. Chaque perte
   garde sa raison ET son nombre réel — jamais reconstitué après coup. */

/** Les postes de la marge, dans l'ordre d'affichage. `signe` = ce qu'un montant positif
    veut dire pour la marge. Un seul endroit : le pont et son total lisent la même liste,
    donc ils ne peuvent pas diverger. */
export const POSTES = [
  { id: "corner", nm: "Corner", signe: +1, aide: "ventes au comptoir, pourboires compris" },
  { id: "dm", nm: "SnapShit", signe: +1, aide: "les commandes livrées en DM" },
  { id: "ardoise", nm: "Ardoises", signe: +1, aide: "le crédit qui rentre au jour dit" },
  { id: "pain", nm: "Pain", signe: -1, aide: "matière achetée dans la soirée" },
  { id: "chouffes", nm: "Chouffes", signe: -1, aide: "leur paie, prélevée à la clôture" },
  { id: "upg", nm: "Réinvest", signe: -1, aide: "outils et agrandissements" },
  { id: "nourrice", nm: "Pension", signe: -1, aide: "ce que la nourrice prélève pour garder ton magot" },
];

const R = Math.round;

/** Les montants bruts d'une soirée, par poste. Tous positifs ; c'est `POSTES.signe` qui
    porte le sens. Les corners sont sommés : le bilan est celui de la SOIRÉE, pas d'un point. */
export function postesDe(soiree) {
  if (!soiree) return null;
  const cs = Object.values(soiree.corners || {});
  const sp = soiree.spend || {};
  return {
    corner: R(cs.reduce((a, c) => a + ((c.soir && c.soir.eur) || 0) + ((c.soir && c.soir.tips) || 0), 0)),
    dm: R(soiree.dm || 0),
    ardoise: R(soiree.ardoise || 0),
    pain: R(sp.pain || 0),
    chouffes: R(sp.chouffes || 0),
    upg: R(sp.upg || 0),
    nourrice: R(sp.nourrice || 0),
  };
}

/** La marge d'une soirée : ce qui rentre moins ce qui sort. Calculée depuis POSTES, donc
    ajouter un poste à la liste l'ajoute automatiquement au total — pas de somme parallèle
    qui prendrait du retard sur la liste. */
export function margeDe(soiree) {
  const p = postesDe(soiree);
  if (!p) return 0;
  return POSTES.reduce((a, def) => a + def.signe * (p[def.id] || 0), 0);
}

/** Ce que la soirée n'a PAS encaissé. Hors marge, volontairement : c'est du manque à
    gagner, pas de l'argent sorti. Chaque ligne garde le nombre RÉEL qui l'a produite. */
export function manqueDe(soiree) {
  if (!soiree) return null;
  const cs = Object.values(soiree.corners || {});
  const a = (f) => cs.reduce((s, c) => s + (f((c.soir && c.soir.perdu) || {}) || 0), 0);
  const desc = cs.reduce((s, c) => s + (((c.soir && c.soir.descente) || {}).eur || 0), 0);
  const descN = cs.reduce((s, c) => s + (((c.soir && c.soir.descente) || {}).n || 0), 0);
  return {
    rupture: { n: a((p) => p.rupture), eur: R(a((p) => p.ruptureEur)) },
    // l'impatience n'est chiffrée que quand la carte affichait un montant tapable :
    // `n` peut donc dépasser ce que `eur` couvre, et c'est normal, pas une fuite
    impat: { n: a((p) => p.impat), eur: R(a((p) => p.impatEur)) },
    walk: { n: a((p) => p.walk), eur: R(a((p) => p.walkEur)) },
    descente: { n: descN, eur: R(desc) },
  };
}

/** Le pont entre deux soirées. `av` = la plus ancienne, `ap` = la plus récente.
    Chaque ligne est la DIFFÉRENCE d'un poste ; leur somme vaut donc exactement l'écart de
    marge. Sans soirée précédente, on rend le détail de la seule soirée connue (`pont:false`) :
    un pont à un seul pilier n'en est pas un, et prétendre le contraire serait le mensonge
    qu'on cherche justement à éviter. */
export function pont(av, ap) {
  if (!ap) return null;
  const pAp = postesDe(ap), mAp = margeDe(ap);
  if (!av) {
    return { pont: false, jour: ap.jour, marge: mAp,
             lignes: POSTES.map((d) => ({ id: d.id, nm: d.nm, aide: d.aide, signe: d.signe,
                                          montant: d.signe * (pAp[d.id] || 0) }))
                           .filter((l) => l.montant !== 0) };
  }
  const pAv = postesDe(av), mAv = margeDe(av);
  const lignes = POSTES.map((d) => {
    const delta = d.signe * ((pAp[d.id] || 0) - (pAv[d.id] || 0));
    return { id: d.id, nm: d.nm, aide: d.aide, signe: d.signe, montant: delta,
             brut: { av: pAv[d.id] || 0, ap: pAp[d.id] || 0 } };
  }).filter((l) => l.montant !== 0);
  const ecartExplique = lignes.reduce((a, l) => a + l.montant, 0);
  return { pont: true, jour: ap.jour, jourAv: av.jour, margeAv: mAv, marge: mAp,
           ecart: mAp - mAv, ecartExplique,
           // non nul = un poste manque à POSTES. On l'AFFICHE plutôt que de le lisser :
           // un résidu visible est un bug qu'on corrige, un résidu caché est un mensonge
           nonExplique: (mAp - mAv) - ecartExplique,
           lignes: lignes.sort((a, b) => Math.abs(b.montant) - Math.abs(a.montant)) };
}

/** Le poste qui pèse le plus, en valeur absolue — gain compris. Ne dire que les pertes
    ferait du Karnet un instrument de reproche (R1) : une bonne soirée doit s'expliquer
    aussi bien qu'une mauvaise. */
export function verdict(p, manque) {
  if (!p) return "";
  if (!p.pont) return `Première soirée close. Reviens demain : le Karnet compare.`;
  const pire = p.lignes[0];
  if (!pire || p.ecart === 0) return "Soirée identique à la veille, au centime près.";
  const m = manque || {};
  const gros = [["ruptures", m.rupture], ["départs fâchés", m.walk], ["descente", m.descente]]
    .filter(([, v]) => v && v.eur > 0).sort((a, b) => b[1].eur - a[1].eur)[0];
  const tete = p.ecart > 0
    ? `Le poste, c'est ${pire.nm.toLowerCase()} : ${pire.montant > 0 ? "+" : ""}${pire.montant} sur la veille.`
    : `Le poste, c'est ${pire.nm.toLowerCase()} : ${pire.montant} sur la veille.`;
  return gros ? `${tete} Et ${gros[0]} t'ont coûté ${gros[1].eur} que la marge ne montre pas.` : tete;
}

/** Total du manque à gagner — pratique pour l'en-tête du bloc. */
export function manqueTotal(m) {
  return m ? R(m.rupture.eur + m.impat.eur + m.walk.eur + m.descente.eur) : 0;
}
