# Table de R&D — Passation Unity V03

9 novembre 2026. Démonstration web autonome avant intégration au jeu. Ce document décrit les contrats de V03 ; il ne déclare aucun import, composant ou build Unity livré.

[Démo V03](https://nobletsylvain.github.io/prototypes/table-rd-v03/) · [Mode test](https://nobletsylvain.github.io/prototypes/table-rd-v03/?mode=test) · [V02 conservée](https://nobletsylvain.github.io/prototypes/table-rd-v02/)

## Décision et périmètre

À la suite de la photo de référence et des choix précisés le 9 novembre, le croisement transmet un **potentiel hérité** et une **capacité d’emplacements**. Le joueur choisit ensuite quels potentiels activer dans ces emplacements. L’expression active et le patrimoine transmissible sont séparés. Un trait non activé reste transmissible ; l’activation ne fabrique pas un trait absent.

La recherche appartient à chaque variété. Révéler un descendant rare ou exceptionnel donne un point à chacun de ses deux parents, une seule fois. Les activations consomment les points de la variété concernée. Points et activations ne passent pas au descendant. V03 remplace les anciennes voies de bonus probabilistes par ce choix de potentiels ; elle n’en conserve pas les formules.

Objet avant fiche, gestes assistés, identité et généalogie stables, deux boutures physiques identifiées et distinction variété/lot restent appliqués. Aucune précision motrice n’intervient dans le résultat. Le téléphone permet une prévisualisation ; il ne modifie pas la plateforme cible du jeu.

Les cinq traits, leurs chances, les capacités 3/5, les classes de rareté, coûts, budgets et positions des points blancs sont des propositions de démonstration. Ils ne fixent ni les recettes des autres produits, ni les emplacements définitifs de spécialisation, ni l’économie ou la production ordinaire.

## Données à séparer

| Donnée | Contrat |
|---|---|
| Variété | `id`, `parents`, `generation`, `potentialIds`, `slotCapacity`, apparence et rareté fixés au croisement ; nom et signature ajoutés à la conservation |
| Configuration active | `research[varietyId].choices`, indexée par `slot-0`, `slot-1`… ; aucun changement du patrimoine hérité |
| Points | `earned` et `spent` propres à la variété ; une source unique, les descendants rares/exceptionnels révélés |
| Plante physique | Identité, variété, capacité et prélèvements déjà effectués |
| Bouture | Identité, variété, `sourcePlantId` ; consommation unique |
| Essai | Parents, boutures, graine, contexte des chances, résultat, phase, lot et trace de récompense |
| Lot | Identité, quantité, unité et qualité propres au lot ; relation au résultat par l’essai |
| Présentation | Rotation, zoom, point blanc sélectionné, charge, filtres du journal, volume et retours ; aucune transaction de jeu |

La rareté d’une variété n’est ni l’activation de ses effets ni la qualité de son lot. Une configuration destinée à la qualité future ne modifie pas un lot existant. Le volume visuel du modèle 3D ne définit pas de masse ou de rendement.

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
| `START` | Vérifier deux parents distincts et leurs boutures ; en consommer deux ; réserver le pot ; calculer et enregistrer graine, chances et résultat en une transaction |
| `ADVANCE` | `growing` → `ready` ; libérer le pot, sans restituer les boutures ni recalculer |
| `INSPECT` | `ready` → `inspected` ; accès à l’objet sous la loupe avant fiche |
| `REVEAL` | `inspected` → `revealed` ; publier le résultat enregistré ; rare/exceptionnel : un point à chacun des parents |
| `KEEP` | `revealed` → `kept` ; enregistrer nom/signature sur la même identité, créer la plante et une recherche vide |
| `ARCHIVE` | `revealed` → `archived` ; conserver essai et généalogie sans plante, remboursement ou nouveau gain |
| `ACTIVATE` | Débiter un point et remplir un emplacement autorisé ; préserver patrimoine, chances et lot |

Stock initial : trois boutures par fondatrice, neuf au total, un pot. Chaque plante fondatrice dispose de trois prélèvements supplémentaires. Conserver un descendant crée une plante avec huit prélèvements possibles et zéro bouture disponible avant `HARVEST`. Ce budget a été porté à huit pour laisser essayer le gain des cinq points nécessaires à cinq activations, puis poursuivre la lignée ; il ne garantit aucun gain en mode normal. Ramification ne modifie ni ce budget ni le stock. Ce réglage n’est pas un rendement définitif. Chaque lot d’essai comporte un spécimen, qualité `demo-standard`.

`START` reçoit un `requestId` ; une demande déjà engagée ne redébite rien. La sélection directe d’un potentiel ou d’une capacité dans cette commande est refusée. `REVEAL` n’est accepté qu’une fois, en phase `inspected` ; `pointsAwarded` garde la trace du gain. Archiver après révélation ne retire pas les points parentaux. Toute commande refusée préserve l’état.

## Sauvegarde, gestes et retours

Le schéma 3 conserve un journal de commandes `history` et vérifie l’état par rejeu. Graine, contexte et résultat sont enregistrés dès `START`. Recharger conserve le tirage ; les gestes ne déclenchent aucun nouveau hasard. Persister la transaction avant les sons/VFX.

Les sauvegardes `botanical-table-v03` et `botanical-table-v03-test` sont séparées entre elles et des clés V02. Aucun import de points, essais ou activations n’est prévu. La sauvegarde reste locale au navigateur. Les écritures utilisent un verrou et les autres onglets sont synchronisés ; une erreur de sauvegarde bloque les transactions.

La nouvelle vue graphique du journal ne change ni ce schéma, ni ces clés, ni les règles ou probabilités du modèle. Les URL V03 normal/test restent identiques. Sa géométrie, sa sélection et son zoom sont des données de présentation, sans migration ou transaction métier.

La révélation utilise une charge de présentation cumulative d’environ 1,5 seconde. Relâcher met en pause sans perte dans la séquence en cours. Clavier et ouverture assistée conduisent à la même commande. Quitter/recharger peut réinitialiser cette présentation, jamais le résultat engagé ni les ressources. La charge reste neutre ; la ponctuation de rareté et le retour de points suivent seulement une révélation acceptée.

Les points blancs donnent accès aux emplacements de la variété ; Origine et le journal servent la généalogie. Prévoir des boutons équivalents, aucune visée exigeante. Les modes Expressif/Discret, le volume et la réduction des mouvements ne changent aucun état métier. Les replays de test n’appellent aucune transaction.

## Journal et arbre généalogique

`buildJournalEntries` projette les seules informations publiques. Les fondatrices et tous les essais restent présents. Après révélation, la projection inclut les champs `color` et `accent` déjà enregistrés. Avant révélation, nom de variété, signature, couleur, reflets, potentiel, capacité et rareté restent masqués ; seuls les parents et l’identité de l’essai sont visibles. Son `result` n’est pas consulté par cette projection.

Les filtres se combinent par **ET** : texte nom/identité/signature/reflets connus, potentiel hérité, trait activé, capacité minimale, rareté, parent/ancêtre et statut. Le texte ignore la casse et les accents et peut retrouver « reflets mauves » dans `accent` après révélation. Il ne recherche pas une morphologie supposée. Les statuts séparent fondatrice, conservée, archivée et en attente. Les filtres restent retenus lors des allers-retours arbre/emplacements et séparés par mode normal/test.

La vue principale est un **herbier sombre horizontal** : les portraits sont reliés entre générations. Un filtre ne supprime ni carte ni lien ; il colore les correspondances en doré, accentue leur ascendance et atténue les autres branches. Ce doré de sélection ne constitue pas un palier de rareté. Le nombre de correspondances exclut les ancêtres de contexte. Même sans correspondance, le graphe reste affiché ; ses positions restent stables pendant la recherche.

Le module pur `journal-graph.js` expose `buildJournalGraph(entries, matchIds, filtered)`. Il travaille uniquement sur les entrées publiques et retourne positions, dimensions, cartes, liens et états de surlignage. La disposition ne dépend pas des filtres. Chaque ascendant partagé possède une seule carte ; les liens qui traversent plusieurs générations sont routés sans inventer de parent. Aucune donnée cachée, sauvegarde ou commande de jeu n’intervient dans ce calcul.

Le module pur `journal-portrait.js` expose `renderStrainPortrait(entry, prefix)`. Il produit un SVG à partir de la couleur et des reflets publics enregistrés ; l’identité donne une silhouette décorative déterministe. Les essais inconnus retournent une silhouette neutre commune avant toute lecture de leur apparence. Les portraits ne créent aucun caractère transmissible, ne simulent aucun héritage morphologique et ne modifient ni identité, rareté ou qualité du lot.

La classification visuelle évoquée par le propriétaire — plante, feuilles, fleurs, pigmentation, trichomes, cycle — est une **piste de conception personnalisable**. Elle pourrait fournir des catégories artistiques et des étiquettes propres au jeu. Aucune de ces catégories n’est ici un système génétique implémenté, une règle de transmission ou une table réelle de culture. Les variations décoratives du SVG ne doivent pas être converties implicitement en paramètres métier lors du portage.

Le clic sur une fondatrice ou une variété conservée ouvre directement ses emplacements. Les archives, les essais non révélés et les résultats non encore conservés sont consultables seulement, avec les mêmes restrictions de visibilité. Les commandes de zoom +/−, Tout voir et Résultat précédent/suivant facilitent la navigation. Le cadre défile au doigt, aux flèches clavier lorsqu’il a le focus, ou par glissement du fond à la souris ; aucune précision ne change le résultat.

Un volet replié conserve les fiches détaillées et leurs actions : consultation, usage parental lorsque le parcours l’autorise et export. Les ancêtres de contexte restent disponibles dans ces détails. Les archives sont lisibles mais non réutilisables. La fiche exportée porte identité, parents, génération, potentiel, capacité, profil actif, nom, signature et lot ; c’est une présentation, sans import jouable. Les sessions de test sont marquées.

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

**94 tests réussis, 0 échec, également sur les sources distribuées.** Ces contrôles portent sur règles, ressources, préparations, maintien, journal, géométrie et portraits. Ils restent distincts d’une validation visuelle. Les dix modules embarqués, dont `journal-portrait.js`, passent les contrôles de syntaxe et des imports.

La vue publiée a été inspectée en 1280 × 720 et 390 × 844 après PR 287 : neuf portraits, douze liens conservés, recherche « reflets mauves » (cinq résultats), « heritage » (un résultat, quatre liens ancestraux), B1/cinq slots (deux résultats), accès aux slots et filtre conservé au retour. Zéro correspondance garde les neuf portraits et les douze liens. Tout voir, zoom et navigation entre résultats ont été parcourus. Le dépassement initial de largeur mobile est corrigé : fenêtre de 364,67 px dans une largeur disponible de 375 px, sans débordement de son contenu. Aucune erreur ni avertissement console relevé. Les captures `checks/herbarium-desktop.jpg` et `checks/herbarium-mobile.jpg` ont été regardées ; `checks/validation.json` décrit les observations. Les essais de cette carrière étaient déjà révélés : la confidentialité des portraits cachés est couverte par les tests automatiques. Les preuves des anciennes vues et de V02 restent historiques.

Aucun essai humain, téléphone physique, écoute validée ou intégration Unity n’est revendiqué. La lisibilité des portraits, la distinction reflet/surlignage et le confort de navigation demanderont leurs propres observations.

Contrôles exacts à préserver : provenance et débits, budgets, refus sans mutation, identité au rechargement, tirage unique et distribution entière, potentiel uniquement parental, capacité admissible, activation uniquement héritée, emplacement exclusif, coût exact, lot inchangé, points uniques aux bons parents, préparation de test traçable, absence de fuite avant révélation et absence d’effet des filtres/gestes/replays.

Plaisir de découverte, compréhension des potentiels, lisibilité de la généalogie, choix d’activation, écoute et confort tactile demandent l’essai du propriétaire. Le prototype autonome précède ce jugement puis une éventuelle intégration Unity, qui exige ses propres contrôles.
