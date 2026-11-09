# Table de R&D — Passation V04, qualité génétique et COA

10 novembre 2026. Prototype web autonome **aux sources finalisées et contrôlées**, avant intégration au jeu ; revue navigateur à venir. Nouvelle URL et nouvelle carrière V04 ; V03 reste intacte. Aucun nouveau composant, import ou build Unity n’est déclaré livré.

[Adresse V04 prévue](https://nobletsylvain.github.io/prototypes/table-rd-v04/) · [Mode test prévu](https://nobletsylvain.github.io/prototypes/table-rd-v04/?mode=test) · [V03 conservée](https://nobletsylvain.github.io/prototypes/table-rd-v03/)

## Décisions et réglages d’essai

La photo du 10 novembre fournit six paliers de qualité et leurs couleurs. Le propriétaire confirme une **qualité génétique propre à la variété, héritée avec variation** : elle ne résulte pas d’un score des goûts, effets ou emplacements. La nouvelle variété reçoit un COA de création après sa découverte.

| Score entier | Identifiant | Libellé de référence | Couleur |
|---|---|---|---|
| 0–19 | `poor` | Poor | Gris |
| 20–39 | `common` | Common | Vert |
| 40–59 | `uncommon` | Uncommon | Bleu |
| 60–79 | `rare` | Rare | Rouge |
| 80–99 | `epic` | Epic | Violet |
| 100 | `legendary` | Legendary | Jaune |

Moyenne arrondie, amplitude −20/+20, poids triangulaires, scores fondateurs 24/54/84 et gain unique à partir de 60 sont des **propositions de démonstration**. Les seuils/couleurs viennent de la référence ; cette provenance n’adopte pas les formules comme règles finales. Aucun classement scientifique, puissance réelle ou procédé de culture n’est simulé.

Les cinq potentiels, leurs poids, capacités 3/5, coûts, budgets physiques et positions des points blancs restent des réglages d’essai. Le prototype ne fixe pas les recettes des autres produits, leurs spécialisations ou l’économie définitive.

## Données indépendantes

| Donnée | Contrat |
|---|---|
| Identité | `id`, parents, génération, nom et signature d’auteur ; stable après création |
| Qualité génétique | `geneticQuality`, entier 0–100 enregistré au lancement |
| Palier | `rarity`, dérivé uniquement de `tierForScore(geneticQuality)` |
| Potentiels et capacité | `potentialIds`, `slotCapacity` ; aucune contribution au score génétique |
| Apparence | `visual` : huit paires d’allèles et graine d’expression ; aucun bonus de score dû au pigment ou au volume |
| Configuration | `research[varietyId].choices`, `earned` et `spent` ; points/activations non hérités |
| Production future | `productionBranches` et `qualityPotential` : aperçus seulement |
| Lot | Identité, quantité et `batch.quality` distinctes et inchangées |
| Essai | Parents, boutures, deux graines, chances, résultat, phase et trace de récompense |
| Présentation | Loupe, maintien, filtres, COA, sons/VFX ; aucune transaction de jeu |

Le potentiel activable `quality` n’est pas `geneticQuality`. Il prépare une production future sans changer score génétique ou lot existant. B1 ou cinq emplacements ne décident plus du palier V04.

## Tirage et API de qualité

`genetic-quality.js` expose `QUALITY_VERSION=1`, `QUALITY_TIERS`, `tierForScore(score)`, `getQualityOdds(parents)` et `drawGeneticQuality(odds, qualitySeed)`. Le modèle réexporte `QUALITY_TIERS`, `tierForScore` et `getQualityOdds`. `tierForScore` retourne `{id,min,max,color,name:{fr,en}}` et refuse un score non entier ou hors bornes.

1. Centre : `Math.round((parentA.geneticQuality + parentB.geneticQuality) / 2)`.
2. Décalages entiers de −20 à +20, poids `21 - Math.abs(offset)`.
3. Exclure les scores hors de 0–100 avant normalisation, sans écrêtage ni report sur une borne.
4. Allouer exactement `2³²` graines par quotients entiers et plus grands restes ; départage par score croissant.
5. Enregistrer les intervalles de scores `[seedStart, seedEnd)` et agréger leurs comptes par palier.

Près des bornes, l’exclusion modifie la moyenne effective de la distribution : elle n’est pas promise exactement égale à celle des parents.

`getQualityOdds(parents)` retourne les six pourcentages, `version`, `center`, `counts`, `outcomes[{score,tier,count,seedStart,seedEnd,percent}]`, `exactPercent` et `sampleSpace`. `getOdds(state,parentIds)` ajoute `qualityOdds` ; ses pourcentages et `counts` publics décrivent la qualité. `inheritanceCounts` et les anciennes étiquettes de `outcomes.rarity` décrivent seulement la classification interne du patrimoine V03 : **aucune autorité de palier**. L’interface et le COA ne doivent pas les utiliser comme score ou rareté.

`START` exige deux uint32 : `seed` pour potentiels/capacité et sous-flux visuel, `qualitySeed` indépendante pour la qualité. Graines, chances et résultat sont persistés ensemble dans l’essai et l’historique. Aucun rendu, maintien, rechargement ou COA ne tire à nouveau.

## Potentiels, emplacements et ressources

| Fondatrice | Qualité | Capacité | Potentiels |
|---|---:|---:|---|
| X · Aromatique (`x`) | 24 | 3 | `citrus`, `floral`, `yield` |
| Y · Réserve (`y`) | 54 | 5 | `yield`, `quality` |
| Z · B1 (`z`) | 84 | 3 | `b1`, `quality` |

Potentiels ordinaires : poids 65 % avec un parent porteur, 90 % avec deux ; B1 : 35 % et 65 %. La capacité vient des parents, à parts égales si elle diffère. Ces combinaisons conservent leur allocation indépendante de `2³²` graines. Un potentiel absent des deux parents ne paraît pas ; un potentiel non activé reste transmissible.

`getConfiguration(state,varietyId)` retourne emplacements et `activeIds`. `ACTIVATE` exige une variété disponible, un emplacement libre existant, un potentiel hérité non déjà actif et un point disponible. Débit et choix sont atomiques ; aucun remboursement ou remplacement. Ramification propose trois à cinq branches pour une production future, sans créer de matière ou modifier le budget de prélèvements.

| Commande | Effet métier |
|---|---|
| `HARVEST` | Créer une bouture identifiée et débiter le budget de sa plante source |
| `START` | Consommer deux boutures de parents distincts, réserver le pot et engager deux graines/résultats une fois |
| `ADVANCE` | `growing` → `ready` ; libérer le pot sans remboursement ou nouveau tirage |
| `INSPECT` | `ready` → `inspected` ; observer le vrai objet avant sa fiche |
| `REVEAL` | `inspected` → `revealed` ; publier résultat/COA ; score ≥60 : +1 à chaque parent |
| `KEEP` | `revealed` → `kept` ; nom/signature sur la même identité, plante et recherche propre vide |
| `ARCHIVE` | `revealed` → `archived` ; conserver essai/généalogie sans plante ni remboursement |
| `ACTIVATE` | Débiter un point et remplir un emplacement autorisé sans réécrire patrimoine, qualité ou lot |

Rare, Epic et Legendary donnent tous **un point par parent**, une seule fois ; les trois paliers inférieurs n’en donnent aucun. Phase et `pointsAwarded` empêchent un second gain. Archiver ne retire pas les points. Un rejet préserve l’état ; un `requestId` déjà engagé ne redébite rien.

Budget : neuf boutures initiales, trois par fondatrice, puis trois prélèvements supplémentaires par plante fondatrice ; chaque descendant conservé dispose de huit prélèvements et aucune bouture gratuite. Un pot réutilisable, un spécimen par lot, qualité `demo-standard`. Aucun budget ne garantit un palier.

## Apparence et découverte

Contrat visuel conservé : `visual={version:1,alleles,expressionSeed}`, axes `shape`, `elongation`, `fullness`, `leafWidth`, `foliage`, `pigment`, `pistil`, `frost`. Chaque parent transmet une valeur par axe, dans l’ordre canonique des identités. Six axes numériques exprimés par somme/200 ; forme déterministe parmi les deux allèles, pigments parentaux et moyenne RGB. Les fondatrices numériques portent centre±15 borné à 0–100 ; forme/pigment sont identiques dans chaque paire initiale. Aucun caractère extérieur aux parents.

`getVisualPhenotype` reste commun à l’objet, aux portraits, à la comparaison et au COA. `head-geometry.js` exprime les trois maîtres V05 du jeu, avec des plages de facettes parentales fixes dans l’objet. La couleur du palier appartient aux retours et au certificat, sans recolorer la tête. [Provenance et coefficients](HEAD_ASSETS.md) sont conservés ; aucun fichier Unity modifié. Aucun poids, rendement ou cycle n’est déduit de cette géométrie.

**Objet avant fiche :** vraie géométrie sous la loupe à l’examen ; journal scellé, sans score, palier, portrait révélateur, description ou COA du résultat. Le maintien cumulatif d’environ 2,1 secondes commence neutre, puis donne des pulsations et indices intermédiaires bornés au palier final déjà enregistré. Seule cette séquence présente ces indices ; les autres surfaces restent aveugles jusqu’à `REVEAL`. Relâcher conserve l’avancement, sans perte, nouveau tirage ou bonus. Rotation, zoom, clavier et assistance n’affectent aucun résultat.

L’arbre complet et ses filtres lisent uniquement les entrées publiques. Huit descripteurs recherchables après révélation ; ancêtres de contexte exclus du nombre de correspondances. Surlignage de recherche distinct du palier. Détails **Transmis/Exprimé** et comparaison des deux parents au descendant après fiche ; archives consultables mais non réutilisables.

## COA et retours

Le COA est un **certificat de création fictif du jeu** : identité, qualité génétique entière et palier, parents/provenance, potentiels hérités/capacité, activations séparées, portrait/signature visuelle, nom/signature d’auteur et lot distinct. Aucune analyse chimique, laboratoire réel ou certification indépendante. Export en image partageable, sans import jouable ni publication automatique.

Les six paliers différencient la conclusion de révélation. Les premiers instants sont neutres ; les indices progressifs ne dépassent jamais le palier final fixé à `START` et ne constituent pas des découvertes récompensées. Le point et le COA suivent seulement `REVEAL` accepté. Cette présentation remplace la charge entièrement neutre de V03. Expressif/Discret, volume, réduction des mouvements et replays ne déclenchent aucune transaction. Événements proposés : `TrialCommitted`, `InspectionStarted`, `RevealHoldStarted/Paused/Completed`, `ResultRevealed`, `ParentResearchGranted`, `PotentialActivated`, `CreationKept`, `CommandRefused`.

Références utilisateur : [Opening Starr Drops — Chicotinha](https://www.youtube.com/watch?v=G-sX12EClF4), coque étoilée, anneaux et pulsation observés à 0:13 ; [All Starr Drop Sound Effects — Starfer713](https://www.youtube.com/watch?v=pjKabPIBgY4), présentation sur fond bleu puis rouge observée. Les vidéos ont été inspectées muettes : aucune écoute des SFX n’est revendiquée. L’adaptation retient le maintien explicitement demandé ; elle ne copie ni probabilités, ni palette de paliers, ni sons. La photo reste la référence des six couleurs, dont Rare rouge. Les synthèses sonores sont originales.

Ce sont des contrats de portage proposés, pas des API Unity déjà livrées. Si FEEL est retenu, employer son interface publique et l’intégration propre au projet ; ne pas lire/modifier les sources du fournisseur. Sons web provisoires.

## Carrières et mode test

Schéma 5, carrière neuve : les états V03 sont refusés, sans migration ou réinterprétation. Clés `botanical-table-v04` et `botanical-table-v04-test` séparées entre elles et des clés V03. La V03 publiée reste préservée. Historique de commandes et validation par rejeu ; persister avant les retours, refuser les données incohérentes et empêcher tout gain/débit partiel en cas d’erreur de sauvegarde.

`createTestDiscovery(tier,previousState,rewardParentId)` prépare une issue admissible par les commandes ordinaires. Les exemples de qualité sont 19/39/54/69/80 pour les cinq premiers paliers. Legendary prépare un relais Y × Z de qualité 89, réellement révélé et conservé, puis son enfant avec Z de qualité 100, arrêté à `inspected`. `setupTrialIds/setupLabels` exposent les étapes préparées ; les points du relais proviennent de sa vraie révélation, le résultat final n’a encore attribué aucun point. Aucune modification des chances normales ou injection gratuite de points. Le parcours final du helper reste à vérifier dans l’interface.

## Vérification et limites

**Preuves finales des sources V04 : 146 tests réussis, zéro échec, puis 146/146 sur les sources exportées.** Cela comprend les contrôles du modèle, de la qualité, des préparations, de l’héritage visuel, des retours, du journal et du COA. Les 19 modules du paquet passent les contrôles de syntaxe et d’imports. La relecture indépendante ne relève aucun blocage. La revue navigateur reste à faire après publication ; les captures V03 restent historiques. Aucun essai humain, téléphone physique, écoute validée ou intégration Unity n’est déclaré.

Contrôles exacts : six seuils, allocation entière, exclusion sans écrêtage, graines indépendantes, qualité stable, aucune fuite avant fiche, +1 unique aux bons parents à partir de 60, activation exacte, provenance/débits, refus sans mutation, patrimoine et lot inchangés, carrières séparées. Le COA doit distinguer génétique/lot et patrimoine/activation. Le plaisir et la lisibilité des six révélations restent à juger par le propriétaire.
