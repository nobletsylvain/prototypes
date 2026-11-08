# Papier & liasses V01 — passation vers Unity

Date : 8 novembre 2026. Démo autonome de ressenti, préparée avant toute intégration au jeu. Ce dossier ne livre aucune fonction Unity, aucun exécutable du jeu et aucune validation propriétaire.

Les résultats réellement exécutés sont consignés dans [SESSION.md](SESSION.md) et `qa/`. Le présent document décrit le contrat à conserver pour une future carte d’intégration ; il ne remplace pas sa revue ni ses preuves.

## Décisions conservées et propositions d’essai

| Statut | Contenu |
|---|---|
| Décidé le 8 novembre | Compteuse énergique et rythmée ; la pile se comprime, la bande serre, puis le papier reprend légèrement du volume. |
| Décidé le 8 novembre, plus tôt | Retours visuels marqués : ressorts de 6 à 10 mm selon les gestes. La nouvelle orientation sonore ne remet pas leur intensité au vote. |
| Règle conservée | Chaque billet garde son identité, sa coupure et sa valeur. Trier, déplacer, ceinturer, ouvrir et ranger ne créent ni ne convertissent d’euros. |
| Décidé le 26 octobre | Une seule coupure par liasse. Cases séparées par forme ; 100 billets libres ou 10 liasses de 100. Affectation persistante, effacement seulement après vidage ; dépôt partiel possible avec le reste en main. |
| Décidé le 4 novembre | Une liasse fermée compte pour un objet en main et doit rester utilisable comme les billets, notamment au paiement. |
| Proposition de cette démo | Petite situation de 120 billets et grande situation de 1 200 ; disposition de l’établi, compteuse, deux sorties, rangement et présentation FPS. |
| Réglages d’essai | 18 ou 26 billets/seconde ; compression de 650 ms puis détente de 250 ms ; détail des trajectoires, mixage, volume et amplitudes visuelles. Ces nombres ne sont pas des décisions de gameplay. |
| Hors de cette démo | Vente complète, blanchiment, réseau, nouveaux risques, film plastique, économie des bandes et intégration Unity. |

Les références CCS documentent une apparence et un ressenti. Elles n’imposent ni solveur physique, ni plafond de poignée, ni capacité de rangement. Les sons de cette version sont des synthèses Web Audio originales et provisoires, indépendantes des captures CCS dépourvues d’audio.

## Architecture à reprendre

| Module autonome | Responsabilité | Destination Unity proposée |
|---|---|---|
| `ledger.mjs` | Billets, identités, coupures, propriétaires, contenus, capacités et transferts autorisés | Modèle métier sans dépendance aux objets de scène ; raccorder aux identités monétaires existantes au lieu d’en recréer. |
| `app.mjs` | Commandes, sélection, états d’interaction, coordination et interface | Contrôleur d’interaction ; validation de la commande avant lancement du retour visuel ou sonore. |
| `scene.mjs` | Vue FPS, représentation du papier, trajets visibles, compression, détente et VFX | Enfants de rendu et animations ; ils ne modifient jamais les identités, valeurs ni capacités. |
| `audio.mjs` | Synthèses et déclenchement des sons provisoires | Banque candidate ou synthèse dédiée, événements raccordés aux succès réels. Écoute et mixage à valider séparément. |
| `texts.json` | Textes français et anglais hors du code | Tables de textes du jeu, après vérification de leur organisation actuelle. |

Ne pas recopier la boucle navigateur dans un composant monolithique. Le modèle exact doit rester indépendant du nombre de feuilles dessinées, de la cadence d’affichage et de la présence du son. Les sons et animations consomment les événements acceptés par ce modèle ; ils n’accordent aucune valeur monétaire.

## Objets et états

| Objet | Données exactes | Représentation et transitions |
|---|---|---|
| Billet libre | Identité stable ; coupure immuable ; emplacement unique | Papier irrégulier dans le contenant ou sur la table ; prise, main, entrée, passage, sortie, rangement. |
| Poignée | Ensemble des objets réellement tenus, sans copie des billets | Les prises successives complètent la main. Chaque billet libre compte pour un objet ; chaque liasse fermée compte pour un objet. |
| Pile ouverte | Identités des billets de même coupure reçus par la machine | Croît au passage réel des billets. Une pile incomplète reste reprenable ; aucune liasse fictive ne complète le compte. |
| Liasse fermée | Identité de contenant et liste des 100 billets d’origine, d’une seule coupure | Solidaire en main et au dépôt. Compression, fermeture et petit relâchement ; ouverture restitue les billets d’origine. |
| Case | Affectation `billets libres` ou `liasses`, même après vidage ; contenu exact | Premier dépôt affecte la case ; retrait ne l’efface pas ; effacement explicite permis seulement vide. |
| Contenant initial | Ensemble de départ du scénario | Le vidage transfère les identités vers la table. Changer de scénario est un redémarrage d’essai explicite. |
| Compteuse | Entrée, transit, sorties par coupure et lot en formation | Aucun billet ne devient sans propriétaire pendant un trajet ; chaque étape visuelle pointe vers un billet existant. |

Le plafond de la main dans cette démo est de **100 objets**. La correction du 4 novembre s’applique : une liasse n’occupe pas les 100 places de ses billets internes. L’ancienne formulation « 100 billets en main, liasses comprises » des comptes rendus historiques ne doit pas réapparaître par copie.

La séparation des cases porte sur la **forme**. La démo n’ajoute pas d’obligation générale de consacrer une case à une seule coupure : des billets libres non triés restent possibles, et chaque liasse garde individuellement son homogénéité.

## Parcours et paramètres

| Situation | Composition exacte | Valeur exacte | Rôle de l’essai |
|---|---|---:|---|
| Petite | 100 billets de 20 € et 20 billets de 10 € | 2 200 € | Lire les feuilles, former une liasse complète et garder une pile partielle identifiable. |
| Grande | 1 000 billets de 20 € et 200 billets de 10 € | 22 000 € | Éprouver plusieurs prises, des séries de liasses et le rangement répété. |

La machine forme automatiquement une liasse à **100 billets de la même coupure** ; aucun nouveau geste de cerclage manuel obligatoire n’est introduit. Les bandes sont disponibles pour l’essai, sans réassort récurrent.

Deux cadences seulement sont proposées : **18** et **26 billets/seconde**. À partir du même état, comparer la lecture du passage, l’agrément des claquements et la fatigue. La compression dure **650 ms** et la détente **250 ms** ; ces durées sont des paramètres de présentation à éprouver, pas des délais économiques.

La vue FPS est l’entrée par défaut. Sur téléphone, le lien sert à prévisualiser le ressenti ; il ne transforme pas la cible du jeu, qui reste PC solo. Le premier geste doit autoriser l’audio du navigateur. La comparaison des retours renforcés est disponible par **F7** et par un contrôle tactile équivalent ; elle ne change ni les capacités, ni les transferts, ni la valeur du lot. Le volume reste un réglage d’essai indépendant.

## Échelle et séparation physique/rendu

Les atlas V02 sont prévus pour des billets de **140 × 65 mm**, quelle que soit leur coupure. La source Blender est plate et mesure **0,18 mm** d’épaisseur artistique ; cette épaisseur ne doit pas devenir automatiquement celle du collider. Conserver les identités et unités du jeu actuel, puis choisir les colliders d’après sa stabilité et son interaction.

Pour Unity, convertir explicitement les unités visuelles en mètres. Utiliser les UV de `ASSETS.md`, conserver le haut du recto et du verso, et mirer U au verso sans retourner V une seconde fois. Le montant inscrit ne sert jamais de masse. Un paquet de 100 billets de 10 € et un paquet de 100 billets de 20 € ne diffèrent pas physiquement du seul fait de leur montant.

La compression et les ressorts doivent agir sur un enfant de rendu. Les colliders, identités et compteurs restent gouvernés par le modèle exact. Les trajectoires guidées de la compteuse constituent une mise en scène ; elles ne démontrent pas une simulation de papier, de tissu ou d’aérodynamique.

## Événements de contact et son

Les noms ci-dessous décrivent un contrat de passation ; vérifier les noms exportés exacts des modules avant le raccordement.

| Événement sémantique | Déclencheur exact | Retour proposé | Registre audio |
|---|---|---|---|
| Prise / complément accepté | Au moins un objet effectivement transféré en main | Froissement groupé, bref resserrement puis ressort ; éviter un son par billet d’une poignée. | SFX-020, SFX-021 |
| Dépôt / contact | Objet réellement relâché puis premier contact utile | Papier libre plus léger ; liasse plus dense ; filtrer les microcontacts répétés. | SFX-022, SFX-023 |
| Admission machine | Transfert accepté vers l’entrée | Aspiration franche, mouvement lisible de l’entrée ; aucun bruit de réussite si refus. | SFX-024 |
| Passage d’un billet | Billet existant passe de l’entrée au circuit de sortie | Claquement synchronisé, variation légère ; pas de boucle autonome qui continue machine vide. | SFX-024 |
| Lot complet | 100 identités homogènes disponibles | Début du tassement ; tension puis fermeture de la bande ; retour de volume limité. | SFX-025 |
| Éjection / arrêt | Liasse transférée vers la réception / plus aucun transfert en cours | Contact plus dense, sortie visible puis arrêt propre du mécanisme. | SFX-025 |
| Rangement accepté | Transfert réel, éventuellement partiel, dans la case | Pose groupée dans le motif de rangement ; nombre effectivement déposé visible. | SFX-026, SFX-010 |
| Ouverture | Liasse réellement ouverte, liste d’identités restituée | Détente courte de la bande, papier redevenu libre ; pas de nouveau billet. | SFX-023, SFX-022 |
| Refus | Préconditions non satisfaites | Cause visible, signal bref et limité ; aucun effet de réussite, aucune mutation métier. | INF-003 |

Conserver les variantes synthétisées comme **candidates provisoires**. Leur présence dans la démo ne valide ni l’écoute ni le mixage Unity et ne remet pas en service l’audio du jeu. Les sources FEEL fournisseur restent hors de toute lecture/modification ; seule son interface publique et l’intégration propre au projet peuvent être utilisées lors d’une future carte.

## Contrôles de reprise

Les vérifications exactes bloquent : somme en euros entiers, identités uniques et intégralement conservées, coupures immuables, propriétaires et contenus, homogénéité des liasses, limites de main/cases, absence de mélange des formes, refus sans mutation. Une opération qui échoue ne consomme ni billet ni bande et ne joue pas de réussite.

Une suite de reprise doit notamment couvrir : lot petit et grand ; liasse complète et pile partielle ; prise additive ; vidage ; tri ; ouverture/reprise ; case incompatible ; case pleine ; dépôt partiel ; retrait ; affectation persistante ; effacement d’une case vide et refus si remplie ; duplication d’une commande ; interruption d’un cycle ; comparaison avec/sans retours. Vérifier les règles indépendamment de la cadence des images.

Mesurer séparément les durées de chute, écarts de pose, oscillations et performances. Ne pas transformer leurs variations naturelles en seuils bloquants non demandés. Vérifier des captures réellement regardées et une séquence complète, puis laisser au propriétaire l’écoute, le confort tactile et le plaisir de répétition.

La future intégration commence par une carte issue de l’état actuel de `atelier`, dans l’ordre du projet et avec revue. Elle raccorde d’abord les identités et événements existants, puis les enfants de rendu et sons retenus. Elle suit les vérifications Unity, la régression complète sur l’exécutable final, le contrôle de livraison et l’essai propriétaire requis. **Cette démo ne vaut ni autorisation de fusion, ni preuve d’intégration, ni essai humain.**
