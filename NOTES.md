# NOTES — journal du projet (prototypes)

Journal chronologique des décisions, idées, écarts constatés et questions
ouvertes. On y écrit ce qui s'est passé et **pourquoi**. Les *règles* stables,
elles, vivent dans `CLAUDE.md` (section « Notes & règles vivantes »).

Format d'une entrée : `## AAAA-MM-JJ — titre court`, puis des puces.
Les entrées les plus récentes en haut.

---

## 2026-06-27 — Ecstasy : conformité aux règles mini-jeux (rythme = ressenti pur)

Relecture du proto à l'aune des règles (R1/R2 d'abord, confirmé ensuite par
R3→R10). Trois écarts corrigés :

- **R1 (pas un test d'adresse)** : la presse donnait un *bonus de rendement*
  indexé sur la précision → ça en faisait une épreuve d'adresse. Supprimé.
  **Qualité ET volume ne dépendent que de la coupe** (charge + taux de liant) ;
  le rythme est **100 % ressenti** (combo/feedback), zéro effet éco — ni bonus,
  ni malus. Manuelle et auto produisent le **même** lot : l'auto = *moins
  d'effort*, pas *plus de rendement*.
  *Nota R4* : le skill *pourrait* moduler la récompense (vers le haut, jamais
  punir) ; j'ai choisi le ressenti pur pour ce proto — un skill-reward non
  punitif reste réintroductible si on le souhaite.
- **R2 / R9 (les paliers allègent, la tension vit au niveau système)** : mes
  paliers manuels *durcissaient* le geste (fenêtre + étroite, curseur + rapide).
  Inversé : moins de frappes + fenêtre **plus large** à chaque palier
  (T1 8/0,22 → T2 5/0,32 → T3 3/0,44), puis T4 automatise, T5 externalise. C'est
  exactement R9 : ce n'est pas le geste qui se re-corse.
- **R1 ergonomie / R10** : bouton **« vider la cuve »** — le sur-versage de liant
  n'est plus verrouillé ; la coupe reste un **levier de décision réversible**.

`SAVE_VERSION` 1 → 2. Vérifs : `node --check` OK, capture headless + smoke test
(pour → presse → tri → rapport) sans erreur.

---

## 2026-06-27 — set de règles mini-jeux (R3→R10) + définition

Acté en session, formalisé dans `CLAUDE.md`. **Définition** posée en tête des
règles : un *mini-jeu* = toute action demandant l'**intervention manuelle** du
joueur, à commencer par un effet de **manipulation du produit** — avec trois
critères : **enjeu explicite**, **interaction simple**, **conséquence immédiate**
(impact **micro**, pas macro). Idées-forces :

- **Le tactile EST le plaisir** (R3) — leçon *Schedule I* : un crafting qui
  « ne suce pas ». La corvée de prod doit régaler par le **geste**.
- **Déterminisme** (R4) — *skill oui, hasard non*. Anti-exemple fondateur : la
  vente de *The Boss Gangster* (vol aléatoire, prix au jeu d'adresse,
  comportements imprévisibles) = frustration. Le résultat se relie au geste ;
  le skill module la récompense, il ne punit pas.
- **Cycle satisfaction → délégation** (R5/R6/R8) — le plaisir décroît avec la
  maîtrise ; quand il tombe à zéro, le joueur *choisit* de déléguer (jamais
  imposé). On délègue la **répétition sans plaisir**, jamais la décision : le
  cœur de jeu est la case « satisfaction haute + déterministe ».
- **Règle d'or** (R7) — automatise la satisfaction épuisée, jamais la décision
  vivante ; bannis le hasard.

Aller-retour assumé (proposées → annulées → **réécrites et réintroduites**) :

- « Paliers = re-corser » devient **R9** : l'équilibrage est **systémique**, pas
  local. Ce n'est pas l'activité qui se re-corse (ça contredirait R5), c'est le
  **jeu entier** qui tient sa tension — une friction réduite par un outil est
  compensée ailleurs (nouveau critère ou croissance des existants).
- « Qualité/pureté = levier de coupe » devient **R10** : la coupe n'est pas
  forcément un mini-jeu, mais reste un **facteur à la décision** (levier
  qualité/pureté ; manipulation manuelle possible, pas obligatoire). Cohérent
  avec le levier unique décrit en contexte dans l'entrée Ecstasy du 24/06.

Cohérence avec l'existant :

- R4 (skill oui) **ne contredit pas** R1 (« pas un test d'adresse *punitif* ») :
  le skill module la **récompense**, jamais un malus. R1 reste valable, non abrogée.

---

## 2026-06-24 — nouveau proto « Ecstasy — Presse Cadencée »

Core loop ecsta ajouté (`ecstasy-press/`), variation V1 d'un brief à 3 options
(presse cadencée / maître de cuve / chaîne & tri). Chaîne : cuve (coupe au
liant) → presse au rythme → tri/comptage au doigt → vente → rapport traçable.

Arbitrage de design important (réconciliation des règles) :

- La **coupe au liant** est l'arbitrage économique (cupidité vs prudence) et le
  **levier unique de qualité** (ADN CrimWorld : qualité → sell-through **et**
  chaleur de rue, deux co-effets **parallèles**, jamais une chaîne).
- Mais **R1 (proto)** interdit qu'un mini-jeu raté inflige un malus. Donc le
  **rythme de presse ne touche PAS la qualité** : il ne donne qu'un **bonus de
  rendement** (bien tapé = quelques pilules de plus ; rater = base, zéro malus).
  Les malformées (déterministes, issues de la coupe) sont **revendues aux
  schlags** → reward réduit, pas une perte sèche (comme les déchets Hash Slicer).
- **R2 (proto)** : les 5 niveaux d'outils allègent puis **automatisent**
  (semi-auto) et **externalisent** (embauche) le pressage manuel.
- Aucun `Math.random` sur l'état/les conséquences. La **saisie** (seuil de
  chaleur) est une conséquence **différée et traçable** des coupes passées — la
  « bascule » : on coupe sous la ligne de qualité, on encaisse quelques bons
  lots, puis ça s'effondre. Équilibre laissé en **constantes nommées**
  (placeholders), à régler humainement.

---

## 2026-06-22 — direction des mini-jeux : ressenti d'abord, jamais de punition

Réflexion de design (devenue **R1** et **R2** dans `CLAUDE.md`) :

- Le mini-jeu n'est **pas** une épreuve d'adresse pénalisée en cas d'échec
  (sauf cas unique où l'adresse est explicitement requise). Son but : faire
  **sentir** l'action au joueur en la faisant manuellement.
- **Rater n'apporte jamais de malus** — seulement une frustration *très
  légère*. La tâche manuelle doit être ludique, plaisante, et faire sentir la
  récompense une fois finie.
- Cette frustration doit s'**adoucir** au fil du développement : la progression
  débloque des outils qui facilitent les tâches manuelles, pour finalement les
  **automatiser et/ou externaliser** et laisser le joueur se concentrer sur la
  big picture.

Question ouverte / à surveiller :

- Hash Slicer envoie aujourd'hui les ratés de coupe au **bac DÉCHETS**
  (revendable). À garder compatible avec R1 : c'est une récompense *réduite*
  (frustration douce), pas un malus sec — vérifier que ça le reste aux
  rééquilibrages, et que les outils boutique réduisent bien la part déchets.

Périmètre : principe propre aux protos « à tâches manuelles » (famille Hash
Slicer). **Non répercuté dans CrimWorld**, dont l'invariant pose que la qualité
tactile de la boucle n'est *pas* le critère de succès.

---

## 2026-06-22 — mise en place du suivi notes & règles

- Rôle défini : une session dédiée tient les **prises de notes** et les
  **règles** du projet au fil de l'eau.
- Décision : les **règles** vont dans `CLAUDE.md` (recueil stable, relu à
  chaque session) ; les **notes** restent ici, dans `NOTES.md` (journal daté).
- Aucune règle nouvelle pour l'instant : les conventions existantes du
  `CLAUDE.md` font foi.
