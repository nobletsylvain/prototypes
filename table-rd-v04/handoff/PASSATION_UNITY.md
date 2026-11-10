# Table de R&D — Passation V04, qualité génétique et COA

10 novembre 2026. Évolution du prototype autonome V04 **publiée et vérifiée dans le navigateur**, avant intégration au jeu : tous les paliers deviennent possibles pour chaque nouveau croisement. Même URL, mêmes carrières V04 ; V03 reste intacte. Aucun nouveau composant, import ou build Unity n’est déclaré livré.

[Démo V04](https://nobletsylvain.github.io/prototypes/table-rd-v04/) · [Mode test](https://nobletsylvain.github.io/prototypes/table-rd-v04/?mode=test) · [V03 conservée](https://nobletsylvain.github.io/prototypes/table-rd-v03/)

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

Le propriétaire demande désormais que chaque croisement puisse obtenir tous les paliers, y compris Epic et Legendary avec des parents faibles. Les parents orientent toujours la distribution héritée, sans plafond imposé au résultat. Le mélange 90 % hérité / 10 % surprise globale, ses taux, la moyenne arrondie, l’amplitude −20/+20, les scores fondateurs 24/54/84 et le gain unique à partir de 60 sont des **propositions de démonstration**. La direction est confirmée ; les taux ne sont pas un équilibrage final adopté. Aucun classement scientifique, puissance réelle ou procédé de culture n’est simulé.

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

`genetic-quality.js` expose `QUALITY_VERSION=2`, `QUALITY_PARAMETERS`, `QUALITY_TIERS`, `tierForScore`, `getQualityOdds(parents,version=2)` et `drawGeneticQuality`. Le modèle expose `getOdds(state,parentIds,qualityVersion=2)`. Chaque nouvelle commande `START` enregistrée et son essai portent `qualityVersion:2`. Les anciens champs absents restent absents au rejeu strict de version 1 ; l’historique n’est pas réécrit. `tierForScore(score)` conserve les six seuils et refuse un score non entier ou hors bornes.

La composante héritée conserve le calcul précédent : centre `Math.round((parentA.geneticQuality + parentB.geneticQuality) / 2)`, décalages entiers de −20 à +20 avec poids `21 - Math.abs(offset)`, scores hors de 0–100 exclus avant normalisation, sans écrêtage ou report sur une borne. Elle représente 90 % de la nouvelle distribution.

Les 10 % de surprise couvrent toute l’échelle selon les poids de paliers `[10,20,25,25,15,5]` pour Poor/Common/Uncommon/Rare/Epic/Legendary. Cette part est uniforme entre les vingt scores de chaque palier, et concentrée sur 100 pour Legendary. Contributions minimales nominales dans le tirage complet : **1 / 2 / 2,5 / 2,5 / 1,5 / 0,5 %**. La composante héritée peut s’y ajouter. Cette surprise ne crée pas de nouveau potentiel, emplacement ou allèle visuel ; elle concerne uniquement la qualité génétique.

`QUALITY_PARAMETERS` fournit `parentalPercent:90`, `surprisePercent:10`, `offsetRadius:20`, `globalTierWeights` et `globalTierFloorsPercent`. Le mélange est calculé en rationnels `BigInt`, puis alloué sur exactement `2³²` graines par plus grands restes, avec intervalles `[seedStart,seedEnd)` et comptes par palier. Les pourcentages affichés proviennent de ces comptes, et non d’une fréquence du mode test. Les planchers sont nominaux : par exemple 2,5 % peut correspondre à 2,499999944 % après allocation ; les comptes exacts font foi.

Près des bornes, l’exclusion modifie la moyenne effective de la distribution : elle n’est pas promise exactement égale à celle des parents.

`getQualityOdds(parents)` retourne les six pourcentages, `version`, `center`, `counts`, `outcomes[{score,tier,count,seedStart,seedEnd,percent}]`, `exactPercent` et `sampleSpace`. `getOdds(state,parentIds)` ajoute `qualityOdds` ; ses pourcentages et `counts` publics décrivent la qualité. `inheritanceCounts` et les anciennes étiquettes de `outcomes.rarity` décrivent seulement la classification interne du patrimoine V03 : **aucune autorité de palier**. L’interface et le COA ne doivent pas les utiliser comme score ou rareté.

`START` exige deux uint32 : `seed` pour potentiels/capacité et sous-flux visuel, `qualitySeed` indépendante pour la qualité. Version de probabilités, graines, chances et résultat sont persistés ensemble dans l’essai et l’historique. Aucun rendu, maintien, rechargement ou COA ne tire à nouveau. Un lancement accepte une version absente, résolue à 2, ou explicitement 2 ; une demande explicite de version 1 est refusée sans mutation, même lors d’un retry. La version 1 est réservée au rejeu des anciennes commandes, sans réécrire les essais déjà engagés.

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

Schéma 5 et clés `botanical-table-v04` / `botanical-table-v04-test` conservés. Cette évolution poursuit les carrières V04 existantes ; elle ne déclenche ni reset ni nouvelle migration. La version de probabilités appartient à chaque essai : chances, score, identité, provenance, points, historique et ressources des essais de version 1 restent exactement conservés. Les états V03 restent refusés ; fichiers et sauvegardes V03 sont intacts. Persister avant les retours, refuser les données incohérentes et empêcher tout gain/débit partiel.

`createTestDiscovery(tier,previousState,rewardParentId)` prépare directement un palier admissible par les commandes ordinaires et s’arrête à `inspected`. Legendary n’exige plus de relais : toute paire disponible possède une chance en version 2. Les relais des anciens essais restent dans leur historique, sans suppression ou crédit nouveau. Le résultat final attend sa vraie révélation ; aucune injection de points ni modification des chances du mode normal. La préparation directe avec X × Y a été parcourue dans le navigateur publié.

## Vérification et limites

**Extension de probabilités version 2 : 154 tests réussis, zéro échec sur les sources, puis 154/154 sur les sources exportées.** Syntaxe et imports des 19 modules vérifiés. Les sauvegardes de version 1 capturées avec essai en attente et essai conservé restent strictement identiques ; les nouveaux essais utilisent la version 2. Le refus d’un nouveau `START` explicite en version 1 conserve l’état.

La [PR 297](https://github.com/nobletsylvain/prototypes/pull/297), commit `4ee23c03330784a64ab596d58f86a01ec0ce7238`, a été déployée puis parcourue dans le navigateur ; paquet SHA-256 `d15fa5c120014cff2f271544e195bb67e37695ba8fd71c0e7ba9f7072b3f7ba1`.

- Anciennes sessions chargées normalement : résultat normal 58 conservé ; ancien essai test 009 révélé à 69 sans nouveau tirage, avec bandeau de version historique visible. L’ancien affichage 15 % devient 14,97 % par passage à deux décimales uniquement ; les tables exactes restent identiques, ce que couvrent les tests.
- Pour X 24 × Y 54, les chances affichées Poor/Common/Uncommon/Rare/Epic/Legendary sont 1,2 / 48,94 / 45,36 / 2,5 / 1,5 / 0,5 %.
- Après remise à zéro du seul mode test, une préparation Legendary directe X × Y donne 100, centre parental 39, écart +61, génération 1 et aucun relais. Le COA garde le lot standard et ne crée aucune activation gratuite ; il s’agit d’un résultat préparé, pas d’une mesure de fréquence naturelle.
- Le stock normal reste à sept boutures avant/après le parcours test. Au format 390 × 844 : largeur cliente/défilante 375/375 px, capture lisible ; console sans erreur ni avertissement.

Captures de ce parcours : `universal-odds-desktop.png`, `legendary-modest-parents.png`, `universal-odds-phone.png`. Aucun téléphone physique, essai humain, écoute validée ou intégration Unity n’est déduit de ces contrôles.

### Historique — V04 avec probabilités version 1

La version précédente avait **146 tests réussis, zéro échec, puis 146/146 sur les sources exportées**, avec syntaxe et imports des 19 modules vérifiés. Les observations suivantes concernent cette distribution antérieure.

La revue navigateur a porté sur la [PR 294](https://github.com/nobletsylvain/prototypes/pull/294), commit `f7bdc5ffd17a00d7beb4c38f0e602d660fba9b3f`, paquet SHA-256 `4862706fb9c52469a21e1afacdd4eefe2ef97c5fd2677c151286ec8f49eaa63f` :

- Six paliers vus à 19/39/47/69/80/100 dans une session test continue ; le 47 emploie un descendant conservé, sans remplacer le 54 de l’exemple neuf.
- Rare : 750 ms de maintien, pause conservée à 36 %, puis reprise de 1 550 ms et révélation à 69. Legendary : pause à 88 % après 1 840 ms, indice Épique et halo observés, puis conclusion Légendaire à 100.
- COA ouvert et export SVG téléchargé. Arbre de dix entrées : recherche « légendaire » puis filtre de palier donnent chacun une correspondance sur dix et surlignent les ancêtres. Le clic sur Y ouvre ses emplacements ; activer Ramification fait passer le point disponible de 1 à 0, avec un emplacement occupé sur cinq.
- Le mode normal conserve neuf boutures après les essais test. Un résultat normal de qualité 58 reste identique après rechargement avant et après révélation ; le journal non révélé garde ses données cachées.
- Au format 390 × 844 : largeur cliente/défilante de page 375/375 px, COA 326/326 px ; aucun débordement horizontal mesuré. Console : zéro avertissement et zéro erreur.

La correction CSS des parents du COA mobile est publiée par la [PR 295](https://github.com/nobletsylvain/prototypes/pull/295), commit `019b78682770c38b6e04f212109da5f35e66f8b6`, paquet SHA-256 `d50af268ed9c7be36c81a1edc6c16ce10379576e0d6f208a03fa261dd150e9dc`. Sa relecture ciblée confirme une colonne de parents, largeurs cliente/défilante 249/249 px et console sans erreur ni avertissement. Elle complète le parcours initial sans prétendre le répéter intégralement ; aucun changement du modèle de jeu. Aucun essai humain, téléphone physique, écoute validée ou intégration Unity n’est déclaré ; les captures V03 restent historiques.

Contrôles exacts de l’évolution : six paliers accessibles à toutes les paires, part héritée conservée, allocation entière et quantification explicitée, rejeu version 1 strictement identique, seuls les nouveaux `START` en version 2, graines indépendantes, qualité stable, aucune fuite avant fiche, +1 unique aux bons parents à partir de 60, activation exacte, provenance/débits, refus sans mutation, patrimoine et lot inchangés. Le COA distingue génétique/lot et patrimoine/activation ; le plaisir reste à juger par le propriétaire.
