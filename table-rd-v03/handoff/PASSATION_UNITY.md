# Table de R&D — Passation Unity, héritage visuel V03

9 novembre 2026. Démonstration web autonome avant intégration au jeu. Cette extension conserve l’URL V03 et passe les données au schéma 4 pour l’héritage visuel. Ses contrôles automatisés sont terminés ; sa revue navigateur reste en attente. Aucun import, composant ou build Unity n’est déclaré livré.

[Démo V03](https://nobletsylvain.github.io/prototypes/table-rd-v03/) · [Mode test](https://nobletsylvain.github.io/prototypes/table-rd-v03/?mode=test) · [V02 conservée](https://nobletsylvain.github.io/prototypes/table-rd-v02/)

## Décision et périmètre

À la suite de la photo de référence et des choix précisés le 9 novembre, le croisement transmet un **potentiel hérité** et une **capacité d’emplacements**. Le joueur choisit ensuite quels potentiels activer dans ces emplacements. L’expression active et le patrimoine transmissible sont séparés. Un trait non activé reste transmissible ; l’activation ne fabrique pas un trait absent.

La recherche appartient à chaque variété. Révéler un descendant rare ou exceptionnel donne un point à chacun de ses deux parents, une seule fois. Les activations consomment les points de la variété concernée. Points et activations ne passent pas au descendant. V03 remplace les anciennes voies de bonus probabilistes par ce choix de potentiels ; elle n’en conserve pas les formules.

Objet avant fiche, gestes assistés, identité et généalogie stables, deux boutures physiques identifiées et distinction variété/lot restent appliqués. Aucune précision motrice n’intervient dans le résultat. Le téléphone permet une prévisualisation ; il ne modifie pas la plateforme cible du jeu.

Les cinq traits, leurs chances, les capacités 3/5, les classes de rareté, coûts, budgets et positions des points blancs sont des propositions de démonstration. Ils ne fixent ni les recettes des autres produits, ni les emplacements définitifs de spécialisation, ni l’économie ou la production ordinaire.

La nouvelle demande rend les ressemblances parent/enfant explicites : huit axes visuels fictifs sont transmis par le croisement. Ils complètent les potentiels de jeu sans modifier leur distribution. Le style s’appuie sur les têtes low poly V05 : volumes facettés, formes compactes ou élancées, grappes et palettes harmonisées avec les assets préparés pour Unity. La classification botanique réelle, la puissance et les paramètres de culture ne sont pas simulés.

## Données à séparer

| Donnée | Contrat |
|---|---|
| Variété | `id`, `parents`, `generation`, `potentialIds`, `slotCapacity`, apparence et rareté fixés au croisement ; nom et signature ajoutés à la conservation |
| Patrimoine visuel | `visual`, version 1, deux allèles par axe et `expressionSeed` ; fixé au croisement, conservé avec l’identité |
| Phénotype | Description commune calculée depuis `visual`, utilisée par l’objet 3D et le portrait ; aucun tirage supplémentaire au rendu |
| Configuration active | `research[varietyId].choices`, indexée par `slot-0`, `slot-1`… ; aucun changement du patrimoine hérité |
| Points | `earned` et `spent` propres à la variété ; une source unique, les descendants rares/exceptionnels révélés |
| Plante physique | Identité, variété, capacité et prélèvements déjà effectués |
| Bouture | Identité, variété, `sourcePlantId` ; consommation unique |
| Essai | Parents, boutures, graine, contexte des chances, résultat, phase, lot et trace de récompense |
| Lot | Identité, quantité, unité et qualité propres au lot ; relation au résultat par l’essai |
| Présentation | Rotation, zoom, point blanc sélectionné, charge, filtres du journal, volume et retours ; aucune transaction de jeu |

La rareté d’une variété n’est ni l’activation de ses effets ni la qualité de son lot. Une configuration destinée à la qualité future ne modifie pas un lot existant. Le volume visuel du modèle 3D ne définit pas de masse ou de rendement.

## Contrat de l’héritage visuel

`visual-genetics.js` expose `VISUAL_AXES`, `VISUAL_PALETTE`, `founderVisual(id)`, `inheritVisual(parents, seed)`, `validateVisual(visual)` et `getVisualPhenotype(visual)`. Le format persistant est `{version: 1, alleles: {…}, expressionSeed}`. Il contient exactement huit paires :

| Axe | Valeurs et expression |
|---|---|
| `shape` | `compact`, `spire`, `cluster` ; une forme parmi les deux allèles est exprimée, de manière déterministe |
| `elongation` | Élongation du volume |
| `fullness` | Ampleur du volume |
| `leafWidth` | Largeur du feuillage |
| `foliage` | Présence visuelle du feuillage |
| `pigment` | `olive`, `lime`, `mauve` ; mélange des deux couleurs |
| `pistil` | Teinte des accents de pistils |
| `frost` | Touches claires sur les facettes, sans cristaux réalistes ni mesure de composition |

Les six axes numériques sont des entiers de 0 à 100 par allèle. Leur expression est la moyenne ramenée à 0–1 : somme des deux valeurs divisée par 200. Les pigments utilisent olive `#1c4f24`, citron vert `#789629`, mauve `#6e387a` ; leur couleur exprimée est la moyenne RGB arrondie. Ces valeurs sont des réglages artistiques de démonstration.

Chez les fondatrices, forme et pigment ont deux copies identiques : X porte la forme compacte et le pigment olive, Y la forme élancée et le citron vert, Z les grappes et le mauve. Les six axes numériques possèdent chacun deux valeurs, centre moins/plus 15 borné à 0–100 ; les moyennes artistiques initiales sont conservées. Chaque parent transmet ensuite **une de ses deux valeurs pour chaque axe**. Cela permet des variations dès la première génération sans variation ajoutée hors du patrimoine. Aucun allèle absent de ses parents n’est créé. Les formes exprimées peuvent différer entre générations tout en conservant des possibilités parentales non exprimées.

Les parents sont ordonnés par identité pour la transmission : l’allèle 0 vient de l’identité alphabétiquement inférieure, l’allèle 1 de l’autre parent. Cet ordre n’est pas celui du placement des fiches. Les parents persistés et leurs paires permettent de vérifier la provenance. La sélection utilise un sous-flux déterministe séparé, dérivé de la graine de l’essai, des identités parentales et de l’axe, sans dépendre de l’identité de l’essai. Elle ne consomme ni ne déplace le tirage existant des potentiels/capacités/rareté.

`getVisualPhenotype` renvoie forme, six valeurs normalisées, `pigmentBlend`, `color`, `accent` et `signature` FR/EN. Objet, portrait et comparaison doivent lire ce même résultat. Les moteurs de rendu ne redéfinissent ni la transmission ni l’expression et ne recolorent pas le corps selon sa rareté. Les domaines de hachage/version et l’ordre des parents doivent être conservés lors du portage ; le calcul actuel utilise les unités UTF-16 et une arithmétique entière sur 32 bits.

Le rendu commun conserve les pigments parentaux en plages de facettes et leur teinte moyenne. L’emplacement des plages est fixe dans les coordonnées de l’objet. `head-geometry.js` exprime les maîtres V05 ; la scène 3D et le portrait SVG utilisent les mêmes faces et couleurs. Les coefficients de présentation et la provenance des maîtres sont décrits dans [Têtes communes à l’arbre et à la loupe](HEAD_ASSETS.md). Il ne s’agit pas d’une correspondance pixel à pixel avec l’éclairage Unity.

Le résultat visuel est engagé avec le résultat métier à `START`, conservé au rechargement, à la nomination et à la reproduction. Une activation ne le change pas. Deux essais peuvent partager une apparence : aucune unicité mondiale ou différence perceptible garantie n’est promise. Les maîtres de tête donnent une géométrie de référence ; leur déformation n’ajoute aucune matière ou quantité comptable.

Le **cycle n’est pas implémenté** : les objets sont présentés au même stade d’observation, sans nouveau chrono, maturation ou rendement. L’architecture complète d’un plant reste hors de cette première tranche. Les règles sont fictives et personnalisables, sans table de culture réelle. Mauve, silhouette volumineuse et surface claire ne signifient ni puissance, ni rareté, ni qualité du lot.

## Paramètres exécutés

| Fondatrice | Capacité | `potentialIds` |
|---|---:|---|
| X · Aromatique (`x`) | 3 | `citrus`, `floral`, `yield` |
| Y · Réserve (`y`) | 5 | `yield`, `quality` |
| Z · B1 (`z`) | 3 | `b1`, `quality` |

Le catalogue `TRAITS` contient Citronné (`citrus`), Floral (`floral`), Ramification (`yield`), Qualité potentielle (`quality`) et l’effet fictif B1 (`b1`). Les textes FR/EN et descriptions sont distincts des identifiants.

Le tirage considère l’union des potentiels des deux parents, qu’ils soient actifs ou non. Aucun potentiel extérieur à cette union n’apparaît. Les valeurs ci-dessous sont les poids nominaux d’essai, avant allocation entière des graines :

| Transmission | Un parent le porte | Les deux le portent |
|---|---:|---:|
| Citronné, Floral, Ramification, Qualité potentielle | 65 % | 90 % |
| B1 | 35 % | 65 % |

La capacité est choisie parmi celles des parents : 50/50 si elles diffèrent, 100 % si elles sont identiques. Il n’y a ni bonus de génération ni bonus dû à l’activation ou au seul libellé de rareté. L’affinité retournée par le modèle est la part de potentiels partagés dans leur union ; elle ne rajoute pas de bonus.

Le modèle énumère toutes les combinaisons admissibles de potentiel/capacité et leur attribue le produit de leurs poids. Il distribue exactement les `2³²` graines possibles par quotient entier puis plus grands restes, avec un départage stable. Les intervalles de chaque combinaison sont enregistrés par `seedStart`, `seedEnd`, `count`. `potentialOdds`, `capacityOdds`, les trois classes et `exactPercent` décrivent la même distribution discrète. Jusqu’à 64 combinaisons sont possibles avec les cinq traits et deux capacités.

La classification est dérivée du résultat, pas tirée séparément :

| Classe | Condition de démonstration |
|---|---|
| Exceptionnelle | 5 emplacements **et** Citronné **et** Floral **et** B1 |
| Rare | B1, **ou** 5 emplacements avec Citronné et Floral, en excluant le cas exceptionnel ci-dessus |
| Ordinaire | Tous les autres cas |

Ainsi les trois paires fondatrices ne peuvent pas produire immédiatement une exceptionnelle : X × Y ne possède pas B1 ; X × Z ne possède pas la capacité 5 ; Y × Z ne possède pas les deux arômes. Les générations successives permettent de réunir ces possibilités. B1 reste un identifiant d’effet fictif, sans règle médicale ou biologique.

## Activation choisie

`getConfiguration(state, varietyId)` renvoie `activeIds`, les `slots` et un aperçu de production. Bases et variétés conservées disposent d’une configuration modifiable. Un résultat révélé mais non conservé, ou archivé, est consultable sans pouvoir acheter d’activation ; son aperçu est vide. Un résultat caché ne fournit pas de configuration publique.

`ACTIVATE` exige une variété disponible, un emplacement existant et vide, un potentiel déjà hérité, ce trait non encore activé ailleurs, et un point disponible. Le débit et le choix sont enregistrés ensemble. Un emplacement occupé exclut les autres choix pour cet emplacement ; la session ne propose pas de désactivation ni de remboursement. Chaque trait ne peut être activé qu’une fois par variété.

L’aperçu compare le profil avant/après. Ramification passe `productionBranches` de 3 à 5 ; Qualité potentielle passe `qualityPotential` à vrai. Ce sont des données de configuration pour une production future, **pas une culture simulée** : aucune récolte, bouture, matière ou modification de qualité du lot n’en découle dans la démo. La transmission future continue d’utiliser `potentialIds` et `slotCapacity`, sans consulter les activations.

## États et ressources

| Commande | Transaction |
|---|---|
| `HARVEST` | Créer une bouture identifiée depuis une plante physique et débiter une unité de son budget |
| `START` | Vérifier deux parents distincts et leurs boutures ; en consommer deux ; réserver le pot ; enregistrer graine, chances, résultat et patrimoine visuel en une transaction |
| `ADVANCE` | `growing` → `ready` ; libérer le pot, sans restituer les boutures ni recalculer |
| `INSPECT` | `ready` → `inspected` ; accès à l’objet sous la loupe avant fiche |
| `REVEAL` | `inspected` → `revealed` ; publier le résultat enregistré ; rare/exceptionnel : un point à chacun des parents |
| `KEEP` | `revealed` → `kept` ; enregistrer nom/signature sur la même identité, créer la plante et une recherche vide |
| `ARCHIVE` | `revealed` → `archived` ; conserver essai et généalogie sans plante, remboursement ou nouveau gain |
| `ACTIVATE` | Débiter un point et remplir un emplacement autorisé ; préserver patrimoine, chances et lot |

Stock initial : trois boutures par fondatrice, neuf au total, un pot. Chaque plante fondatrice dispose de trois prélèvements supplémentaires. Conserver un descendant crée une plante avec huit prélèvements possibles et zéro bouture disponible avant `HARVEST`. Ce budget a été porté à huit pour laisser essayer le gain des cinq points nécessaires à cinq activations, puis poursuivre la lignée ; il ne garantit aucun gain en mode normal. Ramification ne modifie ni ce budget ni le stock. Ce réglage n’est pas un rendement définitif. Chaque lot d’essai comporte un spécimen, qualité `demo-standard`.

`START` reçoit un `requestId` ; une demande déjà engagée ne redébite rien. La sélection directe d’un potentiel ou d’une capacité dans cette commande est refusée. `REVEAL` n’est accepté qu’une fois, en phase `inspected` ; `pointsAwarded` garde la trace du gain. Archiver après révélation ne retire pas les points parentaux. Toute commande refusée préserve l’état.

## Sauvegarde, gestes et retours

Le schéma 4 conserve un journal de commandes `history` et vérifie l’état par rejeu. Graine, contexte, résultat métier et patrimoine visuel sont enregistrés dès `START`. Recharger conserve les deux résultats ; les gestes ne déclenchent aucun nouveau hasard. Persister la transaction avant les sons/VFX.

Les sauvegardes `botanical-table-v03` et `botanical-table-v03-test` sont séparées entre elles et des clés V02. Aucun import de points, essais ou activations n’est prévu. La sauvegarde reste locale au navigateur. Les écritures utilisent un verrou et les autres onglets sont synchronisés ; une erreur de sauvegarde bloque les transactions.

La migration d’une sauvegarde du schéma 3 commence par sa validation stricte avec le modèle V3 conservé. Son historique est ensuite rejoué au schéma 4 pour initialiser les apparences héréditaires. Identités, noms, signatures d’auteur, parents, résultats de jeu, points, stocks, prélèvements, lots, `history` et `revision` restent identiques ; seuls les champs d’apparence sont initialisés. Aucun événement, point ou ressource n’est accordé par la migration. Un ancien état invalide est refusé, pas réparé en silence.

L’interface annonce cette initialisation d’apparence : l’ancienne silhouette décorative peut changer, sans nouvelle découverte métier. Les clés et les URL V03 normal/test restent identiques, chaque sauvegarde étant traitée séparément. Géométrie du journal, sélection et zoom restent des données de présentation. La migration et ses invariants disposent de tests propres à cette extension, détaillés plus bas.

La révélation utilise une charge de présentation cumulative d’environ 1,5 seconde. Relâcher met en pause sans perte dans la séquence en cours. Clavier et ouverture assistée conduisent à la même commande. Quitter/recharger peut réinitialiser cette présentation, jamais le résultat engagé ni les ressources. La charge reste neutre ; la ponctuation de rareté et le retour de points suivent seulement une révélation acceptée.

**Objet avant fiche :** pendant l’examen, l’objet montre déjà sa vraie forme et ses vraies couleurs, sans étiquettes de caractéristiques ni célébration anticipée. La confidentialité du journal ne doit pas rendre cette observation neutre. Le journal, ses recherches et les portraits restent masqués jusqu’à `REVEAL` ; ils utilisent ensuite le même phénotype que l’objet. Les VFX mauves/dorés de rareté sont des retours de révélation, distincts du pigment héréditaire.

Les points blancs donnent accès aux emplacements de la variété ; Origine et le journal servent la généalogie. Prévoir des boutons équivalents, aucune visée exigeante. Les modes Expressif/Discret, le volume et la réduction des mouvements ne changent aucun état métier. Les replays de test n’appellent aucune transaction.

## Journal et arbre généalogique

`buildJournalEntries` projette les seules informations publiques. Les fondatrices et tous les essais restent présents. Après révélation, le portrait et les descriptions utilisent le phénotype issu du patrimoine visuel. Avant révélation, nom de variété, signature, couleur, reflets, forme, potentiel, capacité et rareté restent masqués ; seuls les parents et l’identité de l’essai sont visibles. Son `result` n’est pas consulté par cette projection.

Les filtres se combinent par **ET** : texte nom/identité/signature/descriptions visuelles connues, potentiel hérité, trait activé, capacité minimale, rareté, parent/ancêtre et statut. Le texte ignore la casse et les accents ; il recherche aussi les formes, le feuillage et les couleurs décrits par les huit axes enregistrés, par exemple « reflets mauves », uniquement après révélation. Les statuts séparent fondatrice, conservée, archivée et en attente. Les filtres restent retenus lors des allers-retours arbre/emplacements et séparés par mode normal/test.

La vue principale est un **herbier sombre horizontal** : les portraits sont reliés entre générations. Un filtre ne supprime ni carte ni lien ; il colore les correspondances en doré, accentue leur ascendance et atténue les autres branches. Ce doré de sélection ne constitue pas un palier de rareté. Le nombre de correspondances exclut les ancêtres de contexte. Même sans correspondance, le graphe reste affiché ; ses positions restent stables pendant la recherche.

Le module pur `journal-graph.js` expose `buildJournalGraph(entries, matchIds, filtered)`. Il travaille uniquement sur les entrées publiques et retourne positions, dimensions, cartes, liens et états de surlignage. La disposition ne dépend pas des filtres. Chaque ascendant partagé possède une seule carte ; les liens qui traversent plusieurs générations sont routés sans inventer de parent. Aucune donnée cachée, sauvegarde ou commande de jeu n’intervient dans ce calcul.

Le module de portrait consomme le même phénotype que l’objet 3D. Il ne génère plus une silhouette indépendante tirée de l’identité. Les essais inconnus retournent une silhouette neutre commune avant lecture de leur apparence. Les représentations 2D/3D peuvent simplifier le détail, mais doivent préserver la famille de forme, les proportions, le feuillage et les teintes pour rendre la parenté reconnaissable.

Après révélation et depuis Origine, une comparaison présente les deux portraits parentaux et celui du descendant. Les détails des huit axes séparent **Transmis** (deux valeurs avec provenance parentale dans l’ordre canonique) et **Exprimé** (lecture qualitative du phénotype). Ces textes ne deviennent pas disponibles au journal avant la fiche. La signature visuelle calculée ne remplace pas la signature d’auteur.

Les huit axes ci-dessus sont la première réalisation fictive de la grammaire visuelle demandée. Les catégories de plant entier et de cycle restent des pistes. Aucun axe visuel ne devient implicitement un bonus de qualité, une puissance ou une donnée de culture réelle lors du portage.

Le clic sur une fondatrice ou une variété conservée ouvre directement ses emplacements. Les archives, les essais non révélés et les résultats non encore conservés sont consultables seulement, avec les mêmes restrictions de visibilité. Les commandes de zoom +/−, Tout voir et Résultat précédent/suivant facilitent la navigation. Le cadre défile au doigt, aux flèches clavier lorsqu’il a le focus, ou par glissement du fond à la souris ; aucune précision ne change le résultat.

Un volet replié conserve les fiches détaillées et leurs actions : consultation, usage parental lorsque le parcours l’autorise et export. Les ancêtres de contexte restent disponibles dans ces détails. Les archives sont lisibles mais non réutilisables. La fiche exportée porte identité, parents, génération, potentiel, capacité, profil actif, nom, signature d’auteur, lot, portrait commun et signature visuelle ; c’est une présentation, sans import jouable. Les sessions de test sont marquées.

API web : `renderJournal(host, {state, strains, lang, onResearch, onUse, onDownload, canUse})`. Les callbacks reçoivent une identité de variété, sauf le téléchargement qui reçoit l’identité d’essai. Le portage Unity doit conserver les mêmes règles de visibilité et de séparation entre filtres et transactions.

## Mode test : préparation explicite

`createTestDiscovery(tier, previousState, rewardParentId)` construit une issue admissible via les commandes ordinaires, sans changer leurs règles. `getTestSeed` choisit le milieu de l’intervalle admissible de la classe demandée ayant le plus grand nombre de graines. Si la classe est impossible, il n’invente pas de trait ou de capacité.

Sans variété ciblée, une rare utilise X × Z. Pour une exceptionnelle, l’assistant cherche un intermédiaire Y × X disponible, doté de 5 emplacements et de Citronné/Floral. À défaut, il le prépare, le **révèle réellement**, puis le conserve avec un nom/signature de préparation de test. Cet essai intermédiaire débite ses boutures et donne les points normaux à Y et X ; il reste dans le journal et dans `setupTrialIds`/`setupLabels`. L’assistant prélève ensuite sur sa plante si nécessaire et le croise avec Z. Le résultat final s’arrête à `inspected`, sans sa récompense avant la révélation du joueur.

Avec `rewardParentId`, l’assistant cherche parmi les autres variétés connues un partenaire disponible permettant la classe demandée. Il choisit la plus grande chance de cette classe, départagée par identité, et conserve la variété ciblée comme parent. Il ne crée pas d’intermédiaire dans cette branche. Le gain de la cible provient ensuite de la révélation réelle de son descendant ; aucun point n’est injecté directement.

Les disponibilités sont vérifiées avant prélèvement, les budgets sont finis et un échec retourne l’état d’origine, sans préparation partiellement enregistrée. L’assistant n’accède à aucun stockage. L’interface peut archiver un résultat déjà révélé avant le prochain essai ; elle bloque le remplacement d’un résultat encore caché, sauf reset explicite du test. Le reset recrée une rare X × Z avec points/activations à zéro. Le premier accès au test prépare également une rare ; les accès suivants reprennent la sauvegarde.

## Événements de portage proposés

| Événement | Moment métier ou présentation |
|---|---|
| `ParentPlaced`, `CuttingHarvested` | Pose acceptée, prélèvement enregistré |
| `TrialCommitted`, `TrialReady`, `InspectionStarted` | Transaction engagée, résultat disponible, approche de l’objet |
| `RevealHoldStarted`, `RevealHoldPaused` | Début/reprise et pause de la charge neutre |
| `RevealHoldCompleted` | Demander une fois `REVEAL`, sans créditer directement |
| `ResultRevealed`, `ParentResearchGranted` | Résultat et points enregistrés |
| `SlotOpened`, `PotentialPreviewed` | Consultation/aperçu sans mutation |
| `PotentialActivated` | Débit et choix enregistrés ; retour distinct de la découverte |
| `CreationKept`, `CommandRefused` | Conservation ou refus sans mutation |

Ce sont des noms proposés, pas des API Unity existantes. Utiliser le système de retours du projet et, si retenue pour le portage, l’interface publique de FEEL ; ne pas lire ni modifier les sources du fournisseur. Les synthèses web et les effets sont provisoires.

## Vérifications et limites

**Sources finales : 120 tests réussis, zéro échec dans neuf fichiers. Les 15 modules publics et leurs versions embarquées hors ligne passent les contrôles de syntaxe et d’imports.** Les contrôles portent sur le modèle, les préparations de test, la génétique visuelle, la géométrie et les présentations communes, le journal et la révélation.

Dans cette suite, les preuves unitaires de migration couvrent une carrière sur trois générations à chaque phase : identités, noms, historique, révision, points et ressources restent conservés. Les anciennes sauvegardes invalides et les apparences altérées sont refusées. Les issues non visuelles et les chances des fondatrices restent égales à V3. Sur 96 graines de première génération, chaque axe numérique exprime trois moyennes possibles et plus de vingt combinaisons strictement parentales sont obtenues ; ce contrôle ne promet pas une différence visible pour chaque essai.

Les projections SVG des têtes et la planche de trois fondateurs suivis de deux générations ont été calculées puis regardées. Elles documentent la géométrie commune et les plages de pigments ; elles ne prouvent pas le rendu WebGL final. **La revue navigateur de cette extension reste en attente**, notamment pour la comparaison et les détails Transmis/Exprimé. Les contrôles et captures de l’herbier précédent sont historiques et ne la remplacent pas.

Aucun essai humain, téléphone physique, écoute validée ou intégration Unity n’est revendiqué. La lisibilité des portraits, la distinction reflet/surlignage et le confort de navigation demanderont leurs propres observations.

Contrôles exacts à préserver : provenance et débits, budgets, refus sans mutation, identité au rechargement, tirage unique et distribution métier inchangée, allèles issus de chaque parent, expression déterministe commune, capacité admissible, activation uniquement héritée, emplacement exclusif, coût exact, lot inchangé, points uniques aux bons parents et préparation de test traçable. Ajouter migration V3 invalide refusée, historique/identités/points/ressources préservés après migration valide, neutralité du journal avant révélation et absence d’effet des filtres/gestes/replays.

Comparer visuellement parents et descendants sous la loupe, dans les portraits et en plusieurs générations ; rechercher une ressemblance lisible sans identité trompeuse entre tous les résultats. Ce jugement, le plaisir, l’écoute et le confort tactile demandent l’essai du propriétaire. Le prototype autonome précède une éventuelle intégration Unity, qui exige ses propres contrôles.
