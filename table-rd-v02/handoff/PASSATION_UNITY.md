# Table de R&D — Passation V02

9 novembre 2026. Démonstration web autonome, avant toute intégration Unity. V01 reste conservée séparément. Cette passation décrit les contrats à préserver ; elle ne déclare aucun composant, import ou build Unity livré.

## Direction retenue depuis V01

Le joueur choisit les parents et construit une lignée par croisements successifs. Il ne choisit plus directement le goût et l’effet du descendant avec un calque. Des parents intéressants doivent améliorer les chances de découvertes rares ; chaque résultat doit donner envie d’être examiné.

Sur le spécimen 3D, des points blancs ouvrent Héritage, Résonance et Origine. La recherche appartient à chaque variété et propose des améliorations exclusives. Elle ne réécrit ni ses gènes ni les lots déjà obtenus. Sons et effets accompagnent plus fortement contacts, révélation et conservation ; leur désactivation ne change pas les résultats.

La source de points retenue est unique : **révéler un descendant rare ou exceptionnel donne un point à chacun de ses deux parents, une seule fois pour cet essai**. Une naissance ordinaire, un nom, un rechargement ou un geste de loupe ne donnent aucun point. Les probabilités, branches, coûts et effets précis demeurent des réglages d’essai.

Les acquis précédents restent conservés : deux boutures physiques identifiées issues de plantes cultivées, consommation unique lors du croisement, pot mobilisé puis libéré, recherche personnelle, résultat fixé avant sa révélation, objet avant fiche, variété/lot/clientèle distincts et fiche partageable sans importation jouable.

## Données à séparer

| Donnée | Contenu | Mutation autorisée |
|---|---|---|
| Variété | Identité, parents, génération, gènes, apparence, résultat d’origine | Nom et signature ; pas de réécriture des gènes par une amélioration |
| Recherche de variété | Points, choix exclusifs, événements de récompense | Gain unique par descendant admissible ; achat compatible |
| Plante physique | Identité, variété, budget de prélèvement | Débit explicite d’une unité de budget par prélèvement |
| Bouture | Identité unique, variété, `sourcePlantId` | Création par prélèvement et consommation unique |
| Essai | Parents, boutures consommées, contexte et graine de calcul, résultat fixé, état | Progression puis conservation/archivage ; pas de nouveau tirage |
| Lot | Identité, variété, unité/quantité, qualité propre au lot | Données de production distinctes, sans effet rétroactif d’une recherche |
| Pot | Identité, réservation par essai | Réservation/libération, sans destruction |
| Présentation | Point blanc ouvert, rotation, zoom, volume, retours | Aucun effet sur ressources, points ou tirage |

Une bonne probabilité de découverte n’est pas une qualité de lot. Un descendant rare n’est pas universellement supérieur pour tous les clients. Le volume du modèle 3D ne définit ni masse ni rendement.

## États et transactions

| Commande | Contrat |
|---|---|
| `HARVEST` | Prélever une bouture depuis une plante physique avec budget disponible, conserver sa provenance et débiter une fois. Une fiche ne fournit pas de bouture gratuite. |
| `START` | Vérifier deux parents distincts et leurs boutures, consommer deux identités, réserver le pot, fixer et sauvegarder le résultat et le contexte en une transaction. |
| `ADVANCE` | `growing` → `ready` ; libérer le même pot et présenter le spécimen, sans restitution ni nouveau tirage. |
| `INSPECT` | `ready` → `inspected` ; approcher l’objet, permettre loupe/rotation avant fiche. |
| `REVEAL` | `inspected` → `revealed` ; montrer le résultat fixé. Si rare/exceptionnel, inscrire une fois un point pour chacun des deux parents. |
| `KEEP` | Conserver la variété déjà tirée, son identité, son origine, son nom et sa signature ; rendre sa plante disponible selon le jeu d’essai. |
| `ARCHIVE` | Garder l’essai non retenu dans le journal, sans remboursement ni nouvelle récompense. |
| `UPGRADE` | Vérifier points et exclusion, puis débiter et enregistrer ensemble ; changer seulement la recherche et les effets futurs explicitement prévus. |

Le modèle livré définit les préconditions et conserve chaque commande acceptée dans `history`. `START` reçoit un `requestId` : répéter une demande déjà engagée ne redébite rien. `REVEAL` n’est accepté qu’en phase `inspected` ; son gain est donc unique. `pointsAwarded` conserve la trace du gain. Les objets se reconstruisent depuis l’état sauvegardé. Une animation ne porte jamais la transaction.

## Tirage et sauvegarde

Le schéma V02 est séparé de V01. Un journal de commandes permet de vérifier les états sauvegardés. Une graine de 32 bits est fournie une seule fois à `START`, puis résultat et contexte parental sont enregistrés. Recharger pendant la croissance, sous la loupe ou après révélation conserve le même essai. Une amélioration acquise après engagement ne change pas son résultat.

Pour Unity, persister la transaction avant les sons/VFX. Séparer le générateur et ses versions du rendu, des animations et de la précision des gestes. La recherche ne change ni les gènes de sa variété ni les lots antérieurs. Reproduire une variété conservée garde son identité ; coûts, rythme et gestes de production ordinaire ne sont pas fixés par cette démo.

Le stockage reste local au navigateur et à l’appareil, sans synchronisation cloud. L’écriture et la synchronisation inter-onglets doivent préserver une transaction unique ; une impossibilité de sauvegarder bloque l’engagement avec une explication. Seule une réinitialisation explicite recrée le jeu d’essai.

## Recherche : propositions de démonstration

Deux embranchements sont proposés, chacun à un point : **Convergence ou Exploration** dans Héritage (`inheritance`), **Mémoire ou Éclat** dans Résonance (`lineage`). Ils sont indépendants : aucun ordre d’achat n’est imposé. Un choix exclut son alternative et appartient à la variété concernée. Nombre, noms, coûts, effets et conditions restent des réglages V02 ; ils ne figent pas les emplacements de spécialisation du jeu. L’option Éclat porte l’identifiant `radiance` dans le modèle.

Les points blancs sont des accès sur l’objet, pas des zones biologiques ni des emplacements définitifs. Origine montre la généalogie sans achat. L’interface distingue information, choix possible, manque de points et choix exclu. Avant achat, une comparaison chiffrée montre l’effet hypothétique avec un autre parent nommé ; elle utilise une copie de l’état et ne dépense aucun point.

Une variété conservée commence avec zéro point et aucun choix, même si elle est rare. Les points et améliorations de ses parents ne sont pas transmis. Elle gagnera ses propres points si l’un de ses futurs descendants est révélé rare/exceptionnel. Archiver ensuite ce descendant ne rembourse ni n’efface le gain déjà obtenu.

## Paramètres numériques exécutés

Ces valeurs sont exclusivement celles de V02. Un pourcentage affiché est une cible de démonstration, pas une statistique biologique ou une règle finale.

| Paramètre | Valeur |
|---|---|
| Bases | Aube, Lisière, Velours ; génération 0 et recherche vide |
| Stock initial | Trois boutures identifiées par base, soit neuf ; un pot |
| Plantes de base | Une par base, avec trois prélèvements supplémentaires disponibles |
| Création conservée | Une plante expérimentale de sa variété, budget de quatre prélèvements ; zéro bouture disponible avant `HARVEST` |
| Prélèvement | Une commande acceptée produit une bouture et consomme une unité du budget de la plante source |
| Lot d’essai | Un spécimen, qualité `demo-standard`, séparée de la variété |
| Reflets de présentation | Ordinaire : doux ; rare : mauves ; exceptionnel : dorés ; aucun effet sur la qualité du lot |
| Points | Rare et exceptionnel : un point pour chacun des deux parents au `REVEAL` ; ordinaire : zéro |
| Coût de recherche | Un point par embranchement choisi ; choix irréversible dans la session de démo |
| Chances de deux bases différentes sans recherche | 75 % ordinaire, 20 % rare, 5 % exceptionnel, avant discrétisation sur 32 bits |

Les distributions de goûts et de caractères des bases sont `[70,20,10]`, `[10,70,20]` et `[20,10,70]`. Les deux parents contribuent à parts égales. Le goût et le caractère visibles sont tirés dans ces distributions mélangées ; celles-ci peuvent donc transmettre une famille qui n’était pas dominante chez un parent. Pour le patrimoine du descendant, 80 % du mélange est conservé et 20 % est concentré sur la famille obtenue. Les distributions sont arrondies par les plus grands restes et totalisent exactement 100.

L’affinité `a` est le recouvrement moyen des distributions goût/caractère, de 0 à 1. La profondeur `g` est la plus grande génération des deux parents ; le descendant est de génération `g + 1`.

| Contribution aux chances futures | Réglage V02 |
|---|---|
| Affinité naturelle | `round(max(0, a − 0,4) × 25)` points de pourcentage rare |
| Profondeur | `2 × min(4, g)` points rare |
| Convergence | Pour chaque parent équipé : `round(6 × a)` points rare |
| Exploration | Pour chaque parent équipé : 4 points exceptionnel |
| Mémoire | Pour chaque parent équipé : `min(8, 2 + 2 × génération du parent)` points rare |
| Éclat (`radiance`) | Pour chaque parent équipé : transfert de 4 points rare vers exceptionnel |

Les contributions des deux parents s’ajoutent. Le rare est plafonné à `90 − exceptionnel`, réservant au moins 10 % à l’ordinaire. L’ordinaire complète le total à 100. Le palier de rareté d’un parent n’ajoute pas, à lui seul, un bonus : patrimoine, affinité, profondeur et recherche déterminent les probabilités de cette démo.

Le modèle convertit les seuils en nombres entiers sur les `2³²` graines possibles. Il conserve seuils, nombres de graines par palier et pourcentages exacts ; l’écart de discrétisation n’est pas caché derrière une affirmation de probabilité réelle. La graine fixe également les tirages goût/caractère via des transformations déterministes. Le résultat existe dès `START` et reste masqué jusqu’au parcours d’examen.

Ces budgets de plantes rendent les générations successives essayables. Ils ne fixent ni le prélèvement, ni le rendement, ni les ressources de la production ordinaire dans le jeu.

## Événements de portage proposés

| Événement | Moment réel | Retour |
|---|---|---|
| `ParentPlaced` | Parent accepté | Papier, contact et calage |
| `CuttingHarvested` | Prélèvement validé | Contact végétal, bouture identifiée |
| `TrialCommitted` | Essai enregistré | Contact du dossier/pot, distinct de la découverte |
| `TrialReady` | Résultat disponible | Présence du spécimen, sans fiche anticipée |
| `InspectionStarted` | Prise sous la loupe | Rapprochement stable |
| `ResearchHotspotOpened` | Point blanc activé | Information lisible |
| `ResultRevealed` | Révélation effective | Ponctuation du palier obtenu, sans masquer l’objet |
| `ParentResearchGranted` | Points inscrits | Retour vers les deux parents, une seule fois |
| `ResearchUpgradeApplied` | Achat enregistré | Choix confirmé et alternative exclue |
| `CreationKept` | Conservation enregistrée | Signature et généalogie |
| `CommandRefused` | Refus sans mutation | Cause visible, signal discret limité |

Ce sont des noms proposés, pas des APIs Unity existantes. Regrouper les contacts par geste et éviter les confirmations doublées. Mode discret et volume permettent de comparer le même essai. Respecter la réduction des mouvements et proposer des boutons alternatifs au glissement.

Les sons sont provisoires. Le portage peut utiliser le système de retours du projet et l’interface publique documentée de FEEL, sans lecture ou modification des sources du fournisseur. Cette passation n’active pas l’audio du jeu.

## Périmètre et vérifications

Profils fictifs, budgets de prélèvement, paliers de rareté, probabilités, effets, durée accélérée, catalogue et intensités sont des réglages de démonstration. Recherche personnelle, points gagnés seulement par descendants rares/exceptionnels, choix exclusifs par variété et absence de défi d’adresse sont les décisions appliquées.

Recettes des autres produits, emplacements définitifs, économie complète, prix, production ordinaire et rendement matériel restent hors du périmètre. Le téléphone sert à prévisualiser la boucle, sans changement de plateforme cible du jeu.

Contrôles exacts à reprendre : provenance des boutures, budget physique, débit unique, refus sans mutation, pot réutilisable, résultat fixe au rechargement, contexte de départ immuable, points uniques aux bons parents, achat exclusif atomique, gènes/lots inchangés, descendant conservé réutilisable, fiche après examen et export de présentation seulement.

**Modèle V02 : 27 tests réussis, 0 échec.** Ils couvrent notamment quatre générations de croisements, les seuils exacts de rareté, la symétrie des parents, le rechargement de chaque phase, le gain unique des deux parents, les exclusions, le patrimoine inchangé après achat, les budgets de prélèvement, la correspondance des reflets et le rejet d’états corrompus. Un descendant conservé ne devient parent qu’après prélèvement explicite d’une bouture depuis sa plante.

Le lien GitHub Pages V02 a été ouvert après déploiement réussi. Un parcours navigateur a vérifié sélection, chances, engagement, examen avant fiche, révélation ordinaire, nom, conservation, prélèvement et réutilisation de la descendante. La paire suivante affichait 32 % rare et 5 % exceptionnel avec 78 % d’affinité, contre 20 % et 5 % pour les deux fondatrices. Les repères blancs et l’aperçu chiffré d’une voie verrouillée ont été vérifiés à 390 × 844 puis sur grand écran, sans erreur ou alerte console relevée. Le parcours navigateur n’a pas exécuté d’achat ni de révélation rare : ces branches restent couvertes par les tests du modèle. La capture conservée montre la recherche sur le spécimen.

Ces contrôles ne valident pas plaisir, écoute, confort tactile physique ou reconnaissance. Aucun essai humain, test sur téléphone physique ou intégration Unity n’est revendiqué ici. Le portage demande ses propres contrôles sur l’exécutable et son essai humain.
