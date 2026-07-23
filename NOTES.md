# NOTES — journal du projet (prototypes)

Journal chronologique des décisions, idées, écarts constatés et questions
ouvertes. On y écrit ce qui s'est passé et **pourquoi**. Les *règles* stables,
elles, vivent dans `CLAUDE.md` (section « Notes & règles vivantes »).

Format d'une entrée : `## AAAA-MM-JJ — titre court`, puis des puces.
Les entrées les plus récentes en haut.

---

## 2026-07-23 — Le Corner : banc d'essai de la vente au DM (pré-intégration La Loupe)

Constat de Sylvain : dans le jeu de deal, la vente est automatique → zéro juice.
Analyse concurrentielle menée en session (jeux de deal / shopkeepers / jeux de
service, rapports détaillés en conversation) puis prototype **séparé**
(`le-corner/`) pour fine-tuner AVANT d'intégrer à La Loupe. Mécaniques testées,
chacune volée à un jeu précis :

- **Contre-offre** (Schedule I) : DM = qty + prix offert ; Accepter / Contre
  (compose les sachets + steppers de prix, « prix fair » affiché) / Refuser.
  Budget et tolérance €/g cachés par archétype × relation.
- **« Je te dis »** (TCG Card Shop Sim « Let Me Think ») : différer sans
  refuser — gel de patience 8 s puis fonte ×1.6.
- **Réactions emoji à paliers + « 2 abus d'affilée → il part »** (Moonlighter) :
  😍 marge laissée / 🤝 JUSTE / 😒 il paie mais relation− / 🤬 parti.
- **Prix JUSTE** (Recettear pin/just combo) : fair ±10 % accepté du premier
  coup → pourboire × combo ⚡ (reset si raté/expiré). Récompense la justesse,
  pas le max — R4-compatible (bonus, jamais malus).
- **Demandes ambiguës** (Good Pizza) : « de quoi tenir le week-end » → composer
  les grammes, prix auto au fair ; bien lu = pourboire, mal lu = vendu quand
  même (R1 : récompense réduite, pas de punition).
- **Hésitant** (Moonlighter « Indecisive ») : convertit toujours si on s'en
  occupe ; la réponse personnalisée (son grammage habituel) paie plus.
- **Louche** (Papers, Please) : indices déterministes (voussoiement, gros
  volume d'entrée, demande ton spot, surpaie ×1.3 sans discuter). Refuser =
  bonus discrétion ; vendre = chaleur +20 (décrue −8/soirée).
- **Clients persistants + graphe social** (Schedule I) : relation → budget ;
  relation ≥ 40 → « te présente un pote » (Diego/Lina/Nassim verrouillés).

Choix techniques : DOM pur (pas de Three.js — c'est une UI de messagerie),
`corner_*` + `SAVE_VERSION`, zéro Math.random sur l'état (hash jour/index),
temps réel non clampé (leçon La Loupe), tout le tuning dans un objet `CFG`
commenté en tête de module. Captures : `tools/shots-corner.mjs` (home → DMs →
contre-offre → réaction → rapport → soirée 2 avec louche).

Bug attrapé en capture : les louches spawnaient à qty 0 → accepter payait 0
(division NaN). Corrigé : qty par template + offre ×1.3 fair.

## 2026-07-20 — La Loupe : pains discrets, réserve sélectionnable, fin du « couper dans le vide »

Retours de test tel (screenshot) sur l'écran de coupe : pas de restant visible
sur le pain, pas d'état du stock/barrettes, coupe « dans le vide » quand le
pain dépasse ce que la planche affiche, et demande d'afficher les savonnettes
en réserve, sélectionnables. Quatre réponses :

- **painG (pool de grammes) → S.pains (liste discrète {g, q})** : chaque pain
  garde SA qualité (elle part dans les barrettes à la coupe — avant, tout se
  moyennait dans painQ). **Migration douce** sans reset : painG>0 devient un
  pain unique, painG remis à 0 (garde anti double-migration). Pas de bump.
- **UI de coupe** : la barre du haut affiche « Pain : X g · réserve N pains
  (Y g) » + « Barrettes : … », mise à jour à chaque coupe.
- **Fin du « couper dans le vide »** : le visuel plafonne à LOAF_L (170 g) ;
  quand la planche est visuellement vide mais qu'il reste des grammes, elle se
  **recharge** (toast « La suite du pain / Pain suivant »). Vérifié : pain
  190 g, 9×20 g débités = conservation exacte.
- **Réserve au fond de l'établi** : un bloc par pain (taille ∝ grammes), le
  sélectionné surligné + surélevé ; **tap = le mettre sur la planche**
  (raycast ; garde : le relâcher d'un maintien-coupe ne compte pas comme tap).
  Équivalent chips dans la découpe 2D de secours.
- **Fix transversal déniché au passage** : le temps de presse était compté en
  dt simulé **clampé** (0.05/frame) → à bas fps (téléphone qui chauffe,
  headless à 4 fps), le maintien de 0.6 s réclamait 3 s+ de vrai temps. Le
  geste se mesure désormais en **temps réel** (la physique des tranches garde
  le dt clampé).
- **Réalisme (remarque de Sylvain)** : une savonnette = **250 g max**. Le
  « Lot 500 » livre donc **2×250 g** (champ `split` sur le produit), pas une
  plaque de 500 g — deux blocs dans la réserve, même prix, même total.

## 2026-07-20 — La Loupe : les labels 3D s'empilaient en haut (CSS max() invalide)

Screenshot de Sylvain : dans la coupe 3D, « Maintiens pour couper », l'indice
swipe et le sélecteur de taille se superposaient en haut, illisible. Cause :
`bottom:max(72px,env(safe-area-inset-bottom)+58px)` — en CSS, `+`/`-` dans
`max()`/`calc()` exigent des ESPACES autour, sinon la déclaration entière est
invalide → `bottom:auto` → les éléments retombaient à leur position statique,
en haut du HUD. Bug présent depuis l'origine du proto (5 occurrences : hint,
labels press/wrap, jauges, bouton sceller, overlay d'appro), révélé par le
texte d'indice rallongé en v17.

- Espaces ajoutés → tout est réellement ancré en bas, au-dessus du dock.
- Dédup : le hint de coupe ne répète plus « Maintiens » (déjà dit par le
  label de presse) — il ne dit que « Swipe ▸ conditionnement ».
- Vérifié en headless : sélecteur seul en haut, labels lisibles en bas.
- Leçon générique : `env()` dans un calcul sans espaces passe silencieusement
  à la trappe — à vérifier dans les autres protos si le symptôme réapparaît.

## 2026-07-20 — La Loupe : « Planque pleine » doit dire les chiffres

Retour de test tel : « je n'ai pas pu acheter, ça disait planque pleine alors
que je n'avais aucun pain ». Pas un bug : la planque compte TOUT le produit
(pain + barrettes + sachets, `finiG()+painG`), cap de base 250 g — donc un
Pain 250 exige une planque quasi vide tant qu'on n'a pas pris l'upgrade
Planque (+120 g/niveau, Réinvest). C'est la deuxième porte de scale voulue
(SCOPE §2), mais l'UI ne l'expliquait pas :

- le toast donne maintenant les chiffres : « Planque 130/250 g — pas la place
  pour +250 g. Vends, ou agrandis (Réinvest, Home) » ;
- l'overlay d'appro 3D et l'appro 2D affichent le remplissage et ce qui compte
  dedans (pain + barrettes + sachets).

Équilibrage inchangé (cap 250, gates standing 40/65) — question ouverte si la
friction se confirme en test : cap de base plus haut, ou sortir les sachets
du compte planque.

## 2026-07-20 — La Loupe : secours 2D pour la coupe et l'appro (retour de test tel)

Retour de Sylvain sur tel après la v17 : « broken — plus la possibilité de
tester avec Onion Market [l'appro] ou la coupe ». Diagnostic : les deux écrans
sont les vues 3D, et sur mobile unpkg (qui sert Three.js) peut être bloqué ou
traîner — problème déjà documenté (« Sur mobile, unpkg bloqué cassait TOUT le
proto », d'où le lazy-load v7). En faisant de la coupe 3D la scène PAR DÉFAUT
de l'atelier, la v17 a remis ce mur en entrée : import qui pend = écran noir
sans issue (le « Chargement 3D… » était rendu DERRIÈRE la vue 3D).

- **Timeout 8 s** sur le chargement 3D (Promise.race) → échec ou délai =
  bascule 2D, réessayable (`no3d` en mémoire session, pas persisté).
- **Indicateur visible + sortie de secours** : « Chargement 3D… » + bouton
  « Continuer en 2D ▸ » DANS la vue 3D — plus jamais d'écran noir muet.
- **Découpe 2D** (`renderCut2D`) : mêmes règles que la lame — taille décidée
  ici (− / + / chips), une coupe = une barrette (`applyCut` partagé avec le
  hook 3D). La boucle reste testable sans WebGL.
- **Appro 2D** (`renderBuy2D`) : la liste d'achat en pleine page ; et l'overlay
  d'achat s'affiche désormais IMMÉDIATEMENT en mode 3D (il est DOM-only),
  achetable même pendant que la visionneuse charge.
- Pas de bump de save (aucun changement d'état persisté).
- Vérifs headless : three coupé net → cut2d/buy2d + achat + 5 coupes + zip OK ;
  three qui pend → indicateur + skip OK, timeout 8 s → bascule auto ;
  chemin nominal 3D revalidé.

## 2026-07-20 — La Loupe : la taille se décide à la lame (anti-triche) + rail atelier

Retours de Sylvain sur la dernière build La Loupe — cinq changements, save
v16 → v17 :

- **Anti-triche conditionnement** : la taille de la barrette est fixée AU
  MOMENT DE LA COUPE. Le stock devient discret par taille (`S.bars{taille:n}`),
  plus un pool de grammes — impossible de couper large puis de « décider »
  des 8 g au zip.
- **Taille de coupe libre** : sélecteur au-dessus de la lame (− / +, chips
  2/5/8), défaut **2 g**. Le dernier morceau du pain peut sortir plus petit
  que la taille choisie — assumé (c'est un « morceau »).
- **Conditionnement** : le bac STOCK montre les TYPES de barrettes (une par
  taille, badge ×n) ; drag & drop vers le zip central → sachet de LA taille
  draguée. L'express suit le même modèle (par taille). `qtyToSachets` passe
  en DP exacte (le glouton ratait 10 = 5+5 quand un 8 traînait en stock).
- **Rail atelier** : la découpe est la scène par défaut de l'Atelier ;
  swipe ▸ dans la 3D → conditionnement ; swipe ◂ sur l'établi zip → découpe.
- **BeuherShit** : l'arrivée d'une tournée re-render immédiatement l'onglet —
  le retour de liquide apparaît sans quitter l'écran (avant, le throttle
  0.35 s pouvait sauter le dernier render et l'écran restait figé).
- **Fix réel déniché en test headless** : le `setPointerCapture` de la scène
  3D reciblait les clicks des contrôles HUD (#fmtBar/#buyOverlay/#seal) →
  boutons morts. Garde ajoutée dans `onPointerDown`.
- Outillage : `tools/shots-loupe.mjs` (serveur HTTP local — les modules .mjs
  de la-loupe ne chargent pas en file:// ; parcours complet appro → coupe →
  swipe → zip, état vérifié via `loupe_save`).

## 2026-07-04 — Plantation : l'arrachage (tap & hold + tirer vers le haut)

Le geste de récolte du plant change encore, sur retour de test : le swipe
au pied devient un ARRACHAGE — tap & hold sur le pied, puis TIRER vers le
haut. Objectif : une sensation de FORCE.

- La résistance se lit dans le mapping : levée = a² × PULL_LIFT — le plant
  bouge à peine au début puis cède ; tremblement et terre qui s'effrite
  proportionnels à l'effort ; grincement qui monte (WebAudio) ; micro-
  secousse caméra continue pendant la traction.
- À PULL_DIST (150 px vers le haut) : ça cède d'un coup — craquement grave
  + thump, gerbe de terre et de feuilles, grosse secousse, la tige vole au
  crochet. Lâcher trop tôt = le plant retombe en ressort, aucun malus (R1).
- Séchoir plein = la prise est refusée d'entrée (pas d'effort gaspillé).
- Désambiguïsation : le geste démarre SUR le pied (station) → jamais
  confondu avec la navigation verticale entre pots.
- Pilote headless adapté (press + drag up), capture « en plein effort »
  ajoutée (06b-arrachage.png).

## 2026-07-03 — Plantation : un plant = une tige, coupe au pied

Décision de Sylvain : chaque plante REPRÉSENTE une tige — elle part donc
ENTIÈRE au séchoir, et le fil (4 crochets) fait sécher jusqu'à 4 récoltes
en parallèle. Conséquences :

- **Plant plus grand** (PLANT_H 3.0) : c'est une tige à part entière, têtes
  sur toute la hauteur. Ampoules remontées (+4.3) — corrige au passage le
  chevauchement lampe/plante signalé en test à maturité.
- **La coupe change de geste** : plus de 4 swipes de branches — UN SEUL
  swipe vif AU PIED du plant (zone de hit au bas de la tige) tranche tout.
  Le pot se libère aussitôt, la tige vole au crochet libre.
- **Tige pendue** = longue cola courbée (2.15) à 10 têtes alternées +
  mains de chanvre tombantes, façon recolte/. Le frotté (lent = A, vif =
  trim) et l'arbitrage sec/humide sont inchangés ; en embed les comptes
  par tige (variety, sentG, qsum, trim) sont conservés tels quels.
- Fil rehaussé (LINE_Y 2.75), cadrage caméra ajusté (BASE_TY 1.35).
- Prépare le terrain aux fils d'étendage supplémentaires + bac de récolte
  sous le fil (cf. feuille de route).

## 2026-07-03 — Plantation : retours visuels + feuille de route outils

Retours de Sylvain sur le refresh visuel (« très chouette, j'aime beaucoup la
direction ») + corrections et cap :

- **Sac de terreau** : le « pot de terre » ambigu devient un vrai sac plastique
  imprimé (étiquette, gueule ouverte, terre qui déborde). Le geste
  maintenir-verser est inchangé. Les TYPES de terre ne sont pas tranchés —
  on garde la dynamique, le sac accueillera étiquette/couleur par qualité.
- **Bug graines** : plus de graines en stock = plus de graines visibles dans
  la caisse (visibilité pilotée par seedAvail(), embed compris).
- **Plants longs et fournis** (référence : les colas de recolte/) :
  tige 2.45, 14 têtes alternées sur toute la hauteur, 7 étages de feuillage ;
  branches du séchoir rallongées à 3 têtes.
- **Feuille de route OUTILS (prochaine passe)** — R2/R9 : chaque ressource a
  son échelle « moins laborieux » :
  · Terre : longue durée (re-terreauter moins souvent) et/ou meilleure
    qualité. · Graines : DISTRIBUTEUR (un tube fixé au mur — un tap suffit,
    plus de drag). · Pots : rendement/qualité. · Lampes : vitesse (+ paliers).
  Même schéma partout : plus de rendement, plus de qualité, plus vite.
- **À penser** : fils d'étendage SUPPLÉMENTAIRES au séchoir (extension de
  capacité) + un BAC DE RÉCOLTE sous le fil qui recueille les buds frottés
  (le panier de recolte/), au lieu du vol direct vers le bac STOCK.

## 2026-07-03 — Plantation : refresh visuel complet aligné sur recolte/

Le feeling validé, passe visuelle en reprenant le vocabulaire de `recolte/`
(le proto au meilleur niveau de détail) :

- **Textures procédurales en grain** (canvas 96×96, zéro fichier) sur TOUT :
  sol en terre battue, murs de pierre (3 teintes de moellons), pot en
  terre cuite, sac de jute (+ col roulé + terre affleurante), caisse à
  graines en bois (graines visibles), étagères, bacs.
- **Têtes = nugs** : icosaèdres bosselés (makeNugGeo) en grappes de 2-3,
  pistils dans la texture — sur la plante, sur les branches du séchoir,
  dans le bac STOCK (vraie pile de têtes au lieu d'un cône) et sur les
  objets qui volent vers les bacs.
- **Vraies lames de feuilles** (plans déformés : pointe, pli central,
  courbure) partout — feuillage d'étages, feuilles gourmandes (avec deux
  folioles), sugar leaves au cul des têtes, feuilles des branches sèches.
- **Tiges courbées** (CatmullRom + tube) : silhouette retirée à CHAQUE
  semis (dérive + cambrure), les têtes/feuilles suivent la courbe via
  st.cx/st.cz. Branches du séchoir en petit tube courbé aussi.
- **Bac TRIM** : déchet végétal (brindilles, lames sèches, miettes) façon
  recolte/. Fil du séchoir en métal (metalness), arrosoir métallisé + pomme.
- **Éclairage recalé** : après la première passe (trop claire, ambiance
  cave perdue), sol/murs/têtes assombris, pistils adoucis, halo de
  guidage plus discret.
- Boucle et navigation revalidées headless après chaque passe (32 g → 372 €,
  zéro erreur console).

## 2026-07-03 — Plantation : navigation au swipe + pots multiples en étagères

Retours de test sur le proto Plantation (le travelling entre scènes « super
smooth ») → deux évolutions demandées, plus un garde-fou :

- **Boutons → swipe (mobile natif)** : la navigation Culture ↔ Séchoir passe au
  **swipe horizontal**, l'alternance entre pots au **swipe vertical**. Les
  pastilles/points ne sont plus que des **indicateurs de position** (tappables
  en secours — utile aussi pour le pilote headless). Désambiguïsation
  jeu/navigation : un geste qui **commence sur une station** (sac, arrosoir…)
  ou qui **touche quelque chose** en route (feuille, plant, tête) est consommé
  par le jeu ; sinon, au relâcher, ample et directionnel = navigation. Aucun
  seuil de vélocité sur la nav : c'est la **distance + la dominance d'axe** qui
  décident (`NAV_DIST`, `NAV_RATIO`).
- **Pots multiples** : jusqu'à **3 étages** débloqués en boutique (800 / 2500 €),
  empilés en **rack vertical** — chaque étage est une **station complète**
  (pot, terreau, graines, arrosoir, booster, lampe) qui vit en continu hors
  écran. Refactor : les singletons plante/pot sont devenus une **factory de
  stations** ; les gestes ne visent que l'étage cadré (le raycast ne touche
  que ce qui est à l'écran — pas de verrou explicite).
- **Balance réalisme de la station** (rappel de Sylvain en cours de refactor) :
  le rack vertical avec lampe par étage EST la pratique réelle (vertical
  farming) ; l'espacement d'étage a été élargi (`LEVEL_H` 4.4 → 5.6) pour
  cadrer un étage net avec un simple **liseré** des voisins (contexte sans
  fouillis), et le **câble de l'ampoule s'attache à la planche du dessus**
  (rien ne flotte). Concessions assumées côté gameplay : outils dupliqués par
  étage (un seul arrosoir « qui suit » serait plus réaliste mais plus
  frictionnel), vol instantané des branches vers le séchoir.
- Question ouverte : le guidage multi-pots (« ⬆️ SWIPE — Pot 2 : 💧 soif »)
  suffit-il, ou faudra-t-il un mini-état par point (couleur des dots) quand on
  jouera longtemps avec 3 étages ?

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
