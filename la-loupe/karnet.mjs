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
  /* « Pension » tout court a fait poser la question à Sylvain en playtest (2026-07-28) :
     « je vois pension. Du coup il y a eu des frais de nourrice ? » Un poste du bilan doit
     se lire sans être deviné — il porte donc CHEZ QUI l'argent part. */
  { id: "nourrice", nm: "Pension nourrice", signe: -1, aide: "ce qu'elle prélève chaque soir pour garder ton magot" },
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

/* ── LES TÊTES ────────────────────────────────────────────────────────────
   Arbitrage de Sylvain : le carnet de clientèle, avec des TÊTES RÉCURRENTES pour les
   anonymes. Deux populations, deux traitements, et la frontière est le propos :

   — les PERSONAS nommés sont le sel : une relation qui monte, une ardoise possible, une
     exigence de qualité, un graphe social. Ce sont eux qu'on cultive.
   — les VISAGES sont le quartier : on les reconnaît, on se souvient de ce qu'ils
     demandent, mais aucune mécanique ne s'y accroche. Les mélanger reviendrait à rendre
     le déblocage d'un persona sans intérêt.

   Ce que cet écran DOIT porter comme décision (R8) : quel format couper. C'est le seul
   vrai levier de qualité du jeu (R10), et il n'avait jusqu'ici aucune information pour
   l'éclairer — `missed` était incrémenté depuis des semaines et lu NULLE PART. */

/** Ce qu'on t'a demandé, format par format, et ce qui est reparti sans être servi.
    C'est la ligne la plus utile de l'écran : « on t'a demandé 12 fois du 5 g, tu en as
    raté 8 » se traduit directement en « coupe du 5 g ce soir ». */
export function calibres(visages) {
  const par = {};
  for (const v of Object.values(visages || {})) {
    for (const [f, n] of Object.entries(v.g || {})) {
      par[f] = par[f] || { g: +f, demande: 0, rate: 0 };
      par[f].demande += n;
    }
    for (const [f, n] of Object.entries(v.rate || {})) {
      par[f] = par[f] || { g: +f, demande: 0, rate: 0 };
      par[f].rate += n;
    }
  }
  return Object.values(par)
    .map((c) => ({ ...c, servi: Math.max(0, c.demande - c.rate),
                   // le taux d'échec, pour trier : c'est lui qui désigne le format à couper
                   manque: c.demande > 0 ? c.rate / c.demande : 0 }))
    .sort((a, b) => (b.rate - a.rate) || (b.demande - a.demande));
}

/** Le format qu'on rate le plus, s'il vaut la peine d'être nommé. `null` si rien ne
    ressort — on ne fabrique pas un conseil quand la donnée ne le porte pas. */
export function calibreARattraper(visages, minDemandes = 3) {
  const c = calibres(visages).filter((x) => x.demande >= minDemandes && x.rate > 0)[0];
  return c || null;
}

/** Les visages, triés par ce qu'ils pèsent : d'abord ceux qu'on rate, puis les habitués.
    `jour` sert à dire depuis quand on ne les a pas vus. */
export function tetes(visages, noms, jour) {
  return Object.entries(visages || {})
    .map(([vid, v]) => {
      const fmts = Object.entries(v.g || {}).sort((a, b) => b[1] - a[1]);
      const n = (noms || [])[+vid] || {};
      return { vid: +vid, nm: n.nm || "?", av: n.av || "👤",
               vu: v.vu || 0, dernier: v.dernier || 0, bredouille: v.bredouille || 0,
               habitue: fmts.length ? +fmts[0][0] : null,
               absent: jour && v.dernier ? jour - v.dernier : 0 };
    })
    .filter((t) => t.vu > 0)
    .sort((a, b) => (b.bredouille - a.bredouille) || (b.vu - a.vu));
}

/** Les personas nommés, avec ce qu'on ne leur montrait jamais : `missed`, et la distance
    au départ définitif. Aucune donnée inventée — que ce que le jeu compte déjà. */
export function connaissances(clients, personas, quitAfter) {
  return (personas || [])
    .map((p) => {
      const c = (clients || {})[p.id];
      if (!c || !c.unlocked) return null;
      return { id: p.id, nm: p.nm, av: p.av, kind: p.kind, usual: p.usual,
               rel: Math.round(c.rel || 0), missed: c.missed || 0, quit: !!c.quit,
               // combien d'abus avant qu'il ne revienne plus — la seule vraie menace
               avantRupture: c.quit ? 0 : Math.max(0, (quitAfter || 2) - (c.gougeStreak || 0)),
               ardoise: c.ardoise || null };
    })
    .filter(Boolean)
    .sort((a, b) => (a.quit - b.quit) || (b.missed - a.missed) || (b.rel - a.rel));
}

/** Total du manque à gagner — pratique pour l'en-tête du bloc. */
export function manqueTotal(m) {
  return m ? R(m.rupture.eur + m.impat.eur + m.walk.eur + m.descente.eur) : 0;
}
