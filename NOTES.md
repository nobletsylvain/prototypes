# NOTES — journal du projet (prototypes)

Journal chronologique des décisions, idées, écarts constatés et questions
ouvertes. On y écrit ce qui s'est passé et **pourquoi**. Les *règles* stables,
elles, vivent dans `CLAUDE.md` (section « Notes & règles vivantes »).

Format d'une entrée : `## AAAA-MM-JJ — titre court`, puis des puces.
Les entrées les plus récentes en haut.

---

## 2026-07-23 — La Loupe : recentrage — présence au corner, loop minimal, dette 280/4j

Après coup, Sylvain recadre : « ça me va que le joueur fasse tout lui-même durant
les premières actions » — mais **le corner demande explicitement sa présence**.
L'autonomie notée juste avant est en fait l'état d'**après** embauche, pas le
défaut. On revient donc sur la direction :

- **Présence requise au corner** : au début, le charbonneur c'est **toi** — tu ne
  vends au corner que quand tu le **tiens** (écran corner). Le code d'autonomie
  reste, mais **dormant derrière un hook** `S.upgrades.charbonneur` (posé plus
  tard par l'embauche) ; sans lui, le corner est **fermé** quand tu n'y es pas.
- **Le vrai arbitrage (à caler ensuite)** : ta présence est unique → **tenir le
  corner** ⇄ **vendre/livrer sur SnapShit**. Deux niveaux discutés : *soft* (=
  quel écran tu regardes) ou *fort* (= une livraison **coûte du temps** pendant
  lequel le corner ferme). Non tranché — prochaine étape design.
- **Deux canaux qui se différencient** (idée, à confirmer) : le **corner** = détail
  au comptoir, **petites barrettes (2 g ≈ 20 €)**, présence requise, gros volume /
  petit ticket ; **SnapShit** = le canal des **grosses commandes** (min ~**50 € /
  5 g+**), sur DM + livraison, branché **plus tard**. C'est ce qui justifie de
  **parquer SnapShit** maintenant sans le jeter : on le rallumera pour le haut du
  panier, pas pour la vente à la barrette.
- **Loop minimal en cours** : barrettes **2 g** → **corner** → **rembourser
  Karim**. Tranche verticale qu'on veut solide avant d'élargir.
- **Dette Karim simplifiée** (demande directe) : **prix unique 280 propre**, plus
  de rabais « cash tôt » (**200 supprimé**), **4 jours** (front J1 → échéance J4).
  `SUPPLIER.cashPrice`/`creditPrice` → `SUPPLIER.price` ; `repayDebt`, `debtStrip`,
  `openRepay`, la carte d'intro et le rappel de nuit nettoyés en conséquence.
- **Smoke** `smoke-loupe-pdv.mjs` : bascule de « vend hors écran » à **« fermé
  hors présence »** (bac **et** `seq` gelés quand on quitte le corner). Vert.

L'entrée ci-dessous (autonomie « charbonneur implicite ») reste pour la trace :
elle décrit désormais l'état **post-embauche**, pas le comportement par défaut.

## 2026-07-23 — La Loupe : le corner vend tout seul (charbonneur implicite)

Remarque de Sylvain : « théoriquement on a déjà un charbonneur avec le premier
point de vente ». La fiction l'implique déjà — le corner ne devait donc pas se
figer dès qu'on quitte son écran.

- **Fin du présentiel** : `pdvTick` ne se coupe plus quand on n'est pas sur
  l'écran corner (l'ancien `if(!(tab==="shelter"&&shelterSub==="pdv")) return;`).
  Le charbonneur **tient le poste en fond** : la file, les ventes, le bac et la
  Heat tournent tant que l'app est ouverte. Hors-ligne toujours plafonné (rAF se
  met en pause onglet masqué ; `dt` plafonné à 0,05 s → pas de pic au réveil).
  Aligné CADRE (délégation, « puits infini ») et R6/R7 : on délègue la
  **répétition** (charbonner la file), pas la **décision** (prix, menu, ravito,
  chouffes, encaisse).
- **Le corner ne chauffe que s'il tourne** : arrivées clients **et** montée de
  Heat conditionnées à `tampon > 0`. À sec, le corner est « fermé » — plus de
  clients qui s'entassent, la Heat **redescend**. Corrige une punition muette
  qui apparaissait avec l'autonomie (un corner vide se serait cuit tout seul
  jusqu'à la descente, saisie d'un bac vide → interdit par R1).
- **Recette visible depuis la carte** : petit badge `€…` sur le pin corner qui
  suit le **bac de rue** en direct (`pdvBadge`), pour savoir qu'il y a à
  encaisser sans ouvrir l'écran. Caché quand le bac est vide.
- Smoke `tools/smoke-loupe-pdv.mjs` étendu : on quitte le corner, on vérifie que
  le **bac grossit hors écran** (`bgSold`) et que le badge s'affiche. Vert.
- Pas de bump `SAVE_VERSION` : schéma de save inchangé (état `pdv` identique),
  simple changement de comportement — inutile de wiper les sauvegardes.

---

## 2026-07-22 — La Loupe : efficience coupe, achats plus gros, horloge unique

Retours de test tel de Sylvain (session corner-PDV v2) :

- **Découpe répétitive** → **efficience par paliers avant l'auto** (choix de
  Sylvain : un massicot immédiat idle trop vite). Nouvel upgrade **Gabarit**
  (`UPG.gabarit`, max 4) : `cutBatch()=1+niveau` barrettes **par geste** (3D
  `onCut` boucle ; 2D « Couper ×N » / « ×5N »). Le geste reste, le débit monte
  avec l'investissement ; l'automatisation complète viendra plus tard (R2/R9).
- **Impossible d'acheter > 100 g** → gates de standing baissés : Pain 250 **sans
  gate** (dispo d'entrée), Lot 500 gate 65 → 30 (visible dès reput 25).
- **Temps incohérent** (corner temps réel vs SnapShit à la soirée) → **horloge
  UNIQUE** : `advanceDay()` extrait du bouton ; la soirée se clôture **toute
  seule** tous les `DAY_SEC_REAL=90 s` depuis `frame()` (nouvelle demande Snap,
  paie chouffes, dette, hit planque). « Clôturer » devient **⏭ Passer la nuit
  maintenant** (avancer plus vite). Jauge de progression de soirée sur la pill
  « J{n} » du HUD.
- **200+ clients/h** : gardé tel quel (Sylvain : pratique pour tester vite,
  fine-tuning plus tard).
- SAVE_VERSION 20 → 21. Vérifs : `node --check` ; smoke corner (vente/tri/
  déception) zéro erreur ; check features (gabarit acheté, jour 3→4 via bouton).

## 2026-07-22 — Corner PDV v2 : vente par client (file + ledger), barrettes, rush, fix tri

Retours de test tel de Sylvain sur le corner-PDV → refonte :

- **Débit trop lent → rush** : temps de jeu accéléré (`PDV_TIME_COMPRESS`) +
  pics cycliques (`pdvRush()` sinus, badge « RUSH ») + demande boostée par le
  **buzz** (`S.expo`, vitrine). Le corner vit (ex. 266 clients/h en rush).
- **Vente par CLIENT (file d'attente virtuelle)** : `P.queue` de clients
  nominatifs, chacun un panier de barrettes ; arrivées ∝ demande, service à
  `PDV_SERVE_RATE`, patience `PDV_MAX_WAIT` (sinon départ = rupture douce). Sert
  le **ledger** (`P.ledger`, dernières ventes affichées) — on en aura besoin
  pour la suite.
- **Vente par BARRETTE, plus au grammage** : tampon = sachets (unités)
  `P.tampon{taille:n}` ; chaque client débite N barrettes (petites d'abord) ;
  prix = grammes × €/g.
- **Choisir la quantité livrée** : ravitaillement +10 / +25 / Max barrettes
  (planque → tampon exposé).
- **Menu = vitrine SnapShit** : la carte « Menu · vitrine » (qualité annoncée =
  déception) + bouton **Poster la vitrine** (`snap.posterVitrine` → +buzz →
  +demande). Relie le PDV au moteur Snap existant.
- **Fix bug tri liquide** : `Encaisser` ajoutait à `S.dirty` sans créer les
  **billets** (`S.bills`) que la trieuse consomme → trémie vide. Ajout de
  `pushBills(v)` (comme le retour BeuherShit). Vérifié : après encaisse,
  `dirty>0` ET `bills>0`.
- État PDV étendu (`shelter.mjs` : tampon/queue/ledger/…), **SAVE_VERSION 19→20**
  (reset propre). Smoke `tools/smoke-loupe-pdv.mjs` mis à jour (Max, file,
  ledger, tri) : **zéro erreur console**.

## 2026-07-22 — Le corner devient le PDV à 3 curseurs (intégré DANS La Loupe)

Correction de cap : Sylvain attendait le proto **sur La Loupe**, pas dans un
dossier autonome. Le `le-bloc/` standalone est **fondu dans La Loupe puis
supprimé** (carte hub + `tools/smoke-bloc.mjs` retirés). Le **pin « corner »**
de la carte Quartier Nord devient le **point de vente jouable à 3 curseurs**
(Shelter P1) — bouton « Tenir le corner » depuis la fiche du pin.

- **`renderPDV()`** dans `la-loupe/index.html` : Demande / Satisfaction
  (déception annoncé vs livré) / Heat, en temps réel via `pdvTick(dt)` branché
  sur la boucle `frame()` (on tient le corner **en présence** — délégation plus
  tard). Réutilise les classes CSS existantes → rendu natif La Loupe.
- **Stock réel** : vend le **tampon** (sachets stagés au corner, exposés,
  débités de `S.sachets` au ravitaillement, en grammes) → **bac** (liquide de
  rue). **Encaisser** verse le bac dans `S.dirty` (à trier au Liquide). La
  **descente** (seuil de Heat) saisit tampon + bac ; la planque est sauve.
- **Qualité livrée = `S.sachetQ`** ; annoncée = sélecteur (Merdique/Correct/
  Bonne/Top). Prix €/g, chouffes (paie 60 €/soir à la clôture — sinon un part).
- **État** dans `S.shelter.pdv` (défauts dans `shelter.mjs`, migration douce) ;
  **SAVE_VERSION 18 → 19** (reset propre, convention).
- Vérif : `node --check` (module + shelter.mjs) OK ; smoke Puppeteer
  `tools/smoke-loupe-pdv.mjs` (sert en HTTP, seed sachets, carte → corner →
  ravitailler → vente → encaisser → déception) : **zéro erreur console**,
  déception vérifiée (annoncer Q78 en livrant Q62 → réservoir qui fuit).

Le `le-bloc/` reste consultable dans l'historique (commits d3a6e65 / PR #167).
Prochaines passes : rush horaire, charbonneur (délégation = vente sans présence),
2e PDV, puis les autres produits du catalogue VARIETES.

## 2026-07-22 — Le Bloc : 1er proto jouable (le-bloc/, PDV à 3 curseurs)

Premier proto du cadre décidé : **hash seul, 1 PDV, boucle complète**
(`le-bloc/index.html`, 2D DOM+canvas, portrait mobile, préfixe `bloc_`,
SAVE_VERSION 1). Zéro Three.js, zéro hasard d'état. Valide le **cœur du CADRE** :

- **3 curseurs** en temps réel : Demande (clients/h ← réservoir × attractivité
  prix), Satisfaction (contentement = livré vs annoncé, + pénalité prix > juste
  → cible du réservoir, convergence lente), Heat (∝ activité, amortie par les
  chouffes, **seuil déterministe** → descente qui saisit le stock + le bac
  exposés ; ce qui est en planque est sauf).
- **Déception jouable** : sélecteur « qualité annoncée » vs qualité livrée du
  stock ; annoncer plus haut que livré = vente OK mais réservoir qui fuit
  (ligne d'état verte/rouge en direct). Vérifié en headless.
- **Cash exposé/rangé** : les ventes tombent dans le **bac** (exposé, saisi à la
  descente) ; **Encaisser** le rentre en planque. **1er automatisme** : embaucher
  un **porteur** (400 €) qui auto-encaisse — la délégation du geste (R7).
- **Appro Karim** : plaquettes 100 g, 4 tiers de hash (Q12→Q72), 1re à crédit
  (dette 900 €, remboursable sans timer). **Charcler** : +30 % volume, −qualité
  (levier R10, descend l'échelle de VARIETES).
- **Paie** en fin de « jour » (100 s) : chouffes 60 €/j ; pas de cash → un
  chouffe part (pas de game over, R1).

Tous les nombres sont des **constantes nommées** en tête de fichier (à régler).
Outillage : `tools/smoke-bloc.mjs` (Puppeteer — charge, joue appro/charcler/
encaisse/chouffe, vérifie zéro erreur console + capture). Rééquilibrage initial
après 1er run (revenus trop lents) : panier 3 g, corner 150 clients/h.

Prochaines passes possibles : tampon/planque séparés (exposition réglable),
courbe de demande (rush), 2e PDV, pub SnapShit, puis les autres produits.

## 2026-07-22 — Le Bloc : CADRE recentré + VARIETES (catalogue 15 produits)

Longue session de design avec Sylvain (à partir du corpus de recherche qu'il a
réuni : org des réseaux FR, blanchiment, gestion du cash, RH, débit des PDV,
prix). On a **recentré** la proposition SHELTER (trop touffue) dans un cadre
jouable — `la-loupe/CADRE.md` — puis détaillé le système de variétés dans
`la-loupe/VARIETES.md`. SHELTER.md reste comme réserve d'idées.

**CADRE.md — le cœur.** Un PDV = **3 curseurs** : Demande (potentiel du lieu +
pub, segmentée par produit, zéro substitution entre produits), Satisfaction
(qualité du sourcing + prix → réservoir de clients fidélisés), Heat (**seuil
déterministe**, pas de proba — R4 ; repoussé par les chouffes). Prix ~fixé par
le marché → battre un rival coûte la marge (qualité↑ ou prix↓) OU la violence ;
la sortie = **intégration verticale** (posséder la chaîne : sourcer/produire/
distribuer) et **horizontale** (absorber les concurrents). Manuel → automatismes
(embauche + outils). Argent en 3 outils : liquide (paie auto le soir) → hawala
(dark web, services/prod étranger, **caisse noire = corruption qui baisse la
Heat d'un secteur**) → blanchiment (**plafonné par le CA plausible des
façades**). Violence feutrée. Poids = système à part. **Temps réel + hors-ligne
plafonné, actif sans limite** (garde-fou anti-idle). Principe directeur nommé :
**le puits infini** (jamais de mur en jeu actif ; le tactile est le puits).
Échelle **quartier → ville → monde** (la carte partagée = 1 quartier). Arc :
petit jobbeur → producteur-distributeur.

**VARIETES.md — variété = QUALITÉ, pas goût.** 15 produits, chacun une échelle
de tiers (hash, weed, coke, héro, crack, ecsta, MDMA, 3-MMC, kétamine, speed,
méth, tucibi/2C-B, LSD, GHB, champis). 4 stats par variété (qualité, prix,
coût, segment+sensibilité). **Mécanique de déception** (idée de Sylvain) :
annoncé vs livré — sous-livrer n'empêche pas la vente mais **déçoit** (érode le
réservoir ∝ écart × sensibilité), déterministe. Native sur les produits « à
arnaque » (écaille coke, 3-MMC/3-CMC, tucibi, LSD/NBOMe). Quatre ascenseurs de
qualité : production / sourcing d'import / cuisson / synthèse. Pipelines
weed→hash, coke→crack. Ancré sur sources OFDT/presse/Psychoactif.

**Décisions tranchées** (fondations + round 3, détaillées dans CADRE) : Heat
déterministe, échec = perte bornée (pas de game over), temps réel plafonné,
qualité = sourcing (coupe = format + charcler optionnel, R10 réconcilié), € assumé
(supersede le « neutre » du SCOPE), demande par emplacement+pub, automatismes
embauche+outils, corruption = anti-Heat, blanchiment plafonné par le CA façade.
**1er proto décidé : hash seul, 1 PDV, boucle complète.**

Deux artefacts visuels publiés (boucle éco ; catalogue des 15 échelles avec
rendus procéduraux + démo de déception jouable). Prochaine étape : prototyper le
1er proto.

## 2026-07-22 — Shelter : proposition GDD « Le Bloc » (la-loupe/SHELTER.md)

Demande de Sylvain (screenshot carte Quartier Nord) : améliorer la core loop
(achat gros → coupe → conditionnement → advertising → vente) en y ajoutant la
**gestion d'un bloc d'immeuble** à la française — four, appro, nourrice,
chouf, fournisseurs, clientèle, raids police, rivalités. Proposition écrite
dans `la-loupe/SHELTER.md`, ancrée dans le documenté (rôles/salaires réels,
pilonnage/place nette, guerres de points, jobbeurs — sources en fin de doc) :

- **Deux boucles imbriquées** : la boucle produit existante (tactile, à la
  minute) alimente une boucle bloc (gestion, à la session) : tenir le point →
  encaisser → payer → répartir → renforcer → encaisser la pression.
- **Triangle logistique** planque → nourrice → tampon du four ; règle d'or
  « tout ce qui est exposé peut être saisi, ce qui est rangé jamais » — la
  taille du tampon devient LA décision continue.
- **Police en deux jauges** (VISIBILITÉ qui redescend, DOSSIER qui ne se
  rembourse pas) et 4 paliers annoncés : patrouille → pilonnage → place nette
  → la Chute. Zéro dé : conforme R1/R4 (le chouf donne un préavis, le mini-jeu
  d'évacuation ne peut que SAUVER une perte déjà écrite).
- **Rivalité œil pour œil** déterministe : frictions déclenchées par la
  croissance du joueur, réponses graduées toutes chiffrées avant décision ;
  la violence rentable court terme mais DOSSIER à vie.
- **Actes 0→4** : planque + 100 g à crédit (front Karim P0) → location du
  spot 20 % CA → four + équipe → bloc/multi-PDV → devenir Karim (fournir à
  crédit aux petits nouveaux — la boucle se referme).
- **Méta « la Chute »** : roguelite doux, run de 15-25 h, réputation conservée.
- **Monétisation** : recommandation premium + web/PWA (le F2P à timers
  contredit R4/R7 ; stores hostiles au thème, cf. guideline Apple 1.4.3).

Questions ouvertes : la Chute (fin de run) est-elle acceptable pour Sylvain ou
faut-il une purge du DOSSIER plus généreuse ? Le corner P1 doit-il coexister
avec la vente DM dès le début (cannibalisation à régler) ?

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
