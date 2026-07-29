/* Le marché du dark web — PUR : aucun DOM, aucun état global. Testable hors navigateur.

   POURQUOI IL ARRIVE EN MÊME TEMPS QUE LA CRYPTO, ET PAS APRÈS.

   Ce dépôt a déjà fait deux fois l'erreur : `S.cash` (le propre) était produit sans rien
   acheter, et il a fallu couper la trieuse ET le front de Karim. Une monnaie sans
   débouché n'est pas une monnaie, c'est un compteur. La crypto aurait exactement le même
   sort si elle arrivait seule — d'où la règle appliquée ici : **une monnaie et son
   débouché s'ouvrent dans la même passe**, jamais l'un avant l'autre.

   CE QU'IL APPORTE, ET POURQUOI ÇA VAUT LA CHAÎNE. L'Appro plafonne à q78 (250 g,
   1700 liquide = 6,80/g). Le marché descend plus bas au gramme ET monte plus haut en
   qualité — mais il ne se paie qu'en crypto, donc il oblige à monter les deux étages
   (sale → propre → crypto). Compté bout à bout, avec un fonds possédé (8 %) puis l'OTC
   (6 %), 250 g q88 revient à ~1620 de sale : moins cher que l'Appro, et dix points de
   qualité de plus. La chaîne ne se justifie donc pas par un discours, elle se justifie
   au gramme.

   LE CONTACT SE GAGNE (R4). On n'arrive pas sur le marché en tapant une adresse : c'est
   le changeur qui présente, après qu'on lui a fait gagner sa vie. Même gabarit que Karim
   et l'Appro — le déblocage se relie à un geste, jamais au hasard ni au calendrier.

   AUCUN ALÉA (R4), ET RIEN NE SE PERD (R1). Le délai de livraison est un nombre de jours
   fixe, annoncé avant la commande (R8). Une commande passée arrive : pas de saisie en
   transit, pas d'arnaque au vendeur. Le risque du dark web, dans ce jeu, c'est ce qu'il
   FAUT MONTER pour y accéder — pas un dé au moment de payer. */

const R = Math.round;

/* Le catalogue. [PLACEHOLDER] — en attente de tuning humain.
   Repère de lecture : l'Appro vend 100 g q52 à 2,00/g et 250 g q78 à 6,80/g. */
export const OFFRES = [
  { id: "d250", g: 250, q: 88, prix: 1400, delai: 2,
    nm: "250 g · q88", note: "Coupe propre, odeur franche. Le genre qui fait revenir." },
  { id: "d500", g: 500, q: 86, prix: 2500, delai: 3, split: 250,
    nm: "500 g · q86", note: "Deux pains scellés. Le transporteur ne sait pas ce qu'il porte." },
  { id: "d1000", g: 1000, q: 84, prix: 4400, delai: 4, split: 250, reputGate: 35,
    nm: "1 kg · q84", note: "Ils ne servent ce volume qu'à ceux dont on parle." },
];

export const offreById = (id) => OFFRES.find((o) => o.id === id) || null;

export function darkwebDefaults() {
  return { commandes: [], seq: 0, recues: 0 };
}

/** Ce que le joueur peut voir. Une offre hors standing reste AFFICHÉE mais barrée : ici,
    contrairement aux laveries, savoir qu'il existe plus gros EST l'information utile —
    c'est ce qui donne une direction au standing. */
export function offresVisibles() { return OFFRES; }

/** Le devis d'une commande, AVANT de valider (R8). Porte toujours la raison d'un refus. */
export function devisCommande(offre, crypto, reput) {
  if (!offre) return { ok: false, raison: "offre inconnue" };
  if (offre.reputGate && (reput || 0) < offre.reputGate) {
    return { ok: false, raison: `standing ${Math.round(reput || 0)}/${offre.reputGate}`,
             prix: offre.prix, delai: offre.delai };
  }
  if ((crypto || 0) < offre.prix) {
    return { ok: false, raison: `il te manque ${R(offre.prix - (crypto || 0))} en crypto`,
             prix: offre.prix, delai: offre.delai, manque: R(offre.prix - (crypto || 0)) };
  }
  return { ok: true, prix: offre.prix, delai: offre.delai, g: offre.g, q: offre.q,
           prixGramme: +(offre.prix / offre.g).toFixed(2) };
}

/** Passe la commande. L'appelant débite la crypto — ce module ignore l'état global. */
export function commander(D, offre, jour, crypto, reput) {
  const d = devisCommande(offre, crypto, reput);
  if (!d.ok) return null;
  D.seq = (D.seq || 0) + 1;
  const cmd = { id: D.seq, offreId: offre.id, g: offre.g, q: offre.q, prix: offre.prix,
                split: offre.split || offre.g, jour, jourLivraison: jour + offre.delai };
  if (!Array.isArray(D.commandes)) D.commandes = [];
  D.commandes.push(cmd);
  return cmd;
}

/** Ce qui est encore en mer. L'écran doit le montrer AVANT les boutons qui l'allongent :
    sans ça on recommande à l'aveugle et la planque déborde à l'arrivée. */
export function enTransit(D, jour) {
  return ((D && D.commandes) || []).filter((c) => c.jourLivraison > jour)
    .sort((a, b) => a.jourLivraison - b.jourLivraison || a.id - b.id);
}
export function grammesEnTransit(D, jour) {
  return R(enTransit(D, jour).reduce((a, c) => a + c.g, 0));
}

/** Les commandes livrées. Retirées de la file et rendues, pour que la clôture pousse les
    pains et écrive une cause par ligne. */
export function livrer(D, jour) {
  const prets = ((D && D.commandes) || []).filter((c) => c.jourLivraison <= jour);
  if (!prets.length) return [];
  D.commandes = D.commandes.filter((c) => c.jourLivraison > jour);
  D.recues = (D.recues || 0) + prets.length;
  return prets;
}

/** Les pains d'une commande — un lot livre plusieurs plaquettes, chacune gardant SA
    qualité. Même découpage que l'Appro : le reste du jeu ne sait manipuler que des pains. */
export function painsDe(cmd) {
  const out = [], chunk = cmd.split || cmd.g;
  for (let left = cmd.g; left > 0; left -= chunk) out.push({ g: Math.min(chunk, left), q: cmd.q });
  return out;
}
