# Passation de L’Étal — révision d

9 novembre 2026. Correction suivie dans [l’issue 280](https://github.com/nobletsylvain/prototypes/issues/280), cible [révision d](https://nobletsylvain.github.io/prototypes/customer-sale-v01/?v=20261109d). Les 90 contrôles automatiques et les sept analyses GLTF ont réussi ; la preuve visuelle navigateur reste à établir. Un paramètre d’URL ne prouve pas son déploiement.

## Comportement à transmettre

Le client attend sans billet visible. Parler révèle sa demande et son paiement ensemble ; il tend alors les mêmes billets. Le joueur prépare sachet et monnaie directement sur le carton, reprend librement et confirme une fois. Le produit conforme et une monnaie juste ou excessive permettent la vente ; un manque, un produit incompatible ou un prix dépassant le budget la bloquent.

À la confirmation, les produits et la monnaie préparée passent au client, et les billets originaux du paiement rejoignent la sacoche. Le client réagit puis le suivant avance. Aucun rangement manuel des recettes n’est nécessaire, même avec le colis du troisième scénario dans la main.

Le cadrage et la sacoche validés par le propriétaire sont conservés. Les cases portent leurs raccourcis ; le grammage figure uniquement sur les sachets. Pendant la préparation, le cadre Présenté / À rendre / Rendu conserve les repères rouge, vert et ambre pour manque, compte exact et trop rendu.

## Modèles et présentation

| Élément | Source et traitement |
|---|---|
| Clients | Leah, Moira, Eddie et Martin, originaux du projet historiquement intégrés à CapitalWorld. Exports GLB des FBX existants, avec pivots de tête et bras pour les mouvements procéduraux. |
| Fleurs 2 et 5 g | Maîtres HeadsV05 actuellement chargés par BenchHeadVisuals. Même maître 2 g pour la gamme premium ; aucune nouvelle géométrie premium. |
| Résine 4 et 8 g | Barrette HashV02/ResinSlice_V02 ; épaisseur de coupe proportionnelle aux grammes, section conservée. |
| Pochon | Film, zip rouge et étiquette construits dans la scène du navigateur autour du contenu. |
| Dépendances | Three.js r160 et ses utilitaires GLTFLoader/BufferGeometryUtils, licence MIT conservée ; imports adaptés aux fichiers locaux. |

Les GLB sont des visuels ; ils ne créent ni identités ni quantités. Le shader de résine Unity n’est pas porté : les matières exportées sont conservées. Les personnages sont des ressources existantes du projet, pas une revendication de personnages définitifs ou d’identité avec ceux du banc actuel. Provenance et empreintes : [ASSETS.md](ASSETS.md).

Le démarrage attend le chargement des modèles. Un échec de chargement ne doit pas autoriser une partie donnant l’impression d’avoir repris les modèles avec succès.

## Registre exact

Le registre est l’autorité sur chaque identité et son emplacement exclusif. Un billet garde coupure et valeur entière ; un sachet garde produit, quantité et composition. La présentation anime ces identités sans calculer le contenu à partir des images.

Avant confirmation, le paiement reste au client. La mutation acceptée transfère une seule fois les produits, tous les billets de monnaie réellement préparés et le paiement original. La recette nette vaut paiement reçu moins monnaie donnée. Le prix convenu reste séparé de cette recette ; le trop rendu réduit réellement le fonds du joueur et ne crée aucun billet.

Après confirmation, les recettes peuvent servir à la vente suivante. La main occupée ne modifie ni ce transfert ni le colis tenu. L’arrivée d’une animation ne crédite rien de plus ; interrompre le trajet ne répète ni n’annule le paiement.

Une confirmation refusée laisse le registre inchangé. Reprise ou annulation avant vente restitue les mêmes objets préparés, sans encaissement. Double clic, Espace répété et événements tactiles/souris rapprochés ne doivent produire qu’une transaction.

## Retour de vente temporaire

L’événement de vente accepté est sale-happy. Le relevé conserve agreedPrice, received, returned, changeError et actualRevenue ; price reste égal à la recette réelle pour compatibilité. L’écart est returned moins monnaie due, toujours positif ou nul dans une vente autorisée.

Une vente exacte porte un produit conforme, un service positif et une fidélisation positive. Un trop rendu renforce service et fidélisation, avec le supplément et la recette nette affichés. Le manque n’entraîne aucune vente ni satisfaction. Un refus de vente peut montrer une déception, sans pénalité de relation ajoutée.

Le retour produit/service/fidélisation est un texte **sans cadre**, visible au plus **2,8 secondes de temps actif**. L’arrivée du client suivant ou l’action Parler l’efface plus tôt. Il ne doit pas persister comme bilan du nouveau client. L’aide le masque et suspend son âge ; page masquée et perte de focus suspendent aussi cette durée. Revenir sur la page ne consomme pas le temps caché.

Ce retour est qualitatif. Ne pas en déduire points, seuils, probabilité de retour, nouvelles visites ou bonus monétaire. L’émotion et ses effets n’interviennent jamais dans le registre.

## États et événements

Le parcours courant emploie approach, request ou hesitation, puis receipt et departing après confirmation ; waiting et closed couvrent l’attente et la fin. payment reste compatible avec l’ancienne proposition, mais l’interface n’exige aucune étape Proposer : sachet et monnaie peuvent être préparés dans n’importe quel ordre avant la confirmation directe.

Le premier sachet pris fige le timer de l’hésitation. La reprise est libre et n’efface pas la monnaie déjà préparée. Une modification de produit invalide l’ancien accord éventuel, sans perdre les objets. Le prix baisse par pas de 5 €, sans dépasser le tarif normal.

Les sons d’extraction, contact, reprise et arrivée en sacoche suivent les gestes acceptés et les objets concernés. Le contact est une arrivée visuelle, pas une seconde mutation. Une animation interrompue ne rejoue pas un paiement. Les synthèses sont originales et provisoires ; écoute et mixage restent à éprouver.

## Trois cas et fermeture

| Cas | Données |
|---|---|
| Vente simple | 4 g à 25 €, reçu 50 €, dû 25 €. |
| Hésitation | 4 g au tarif 25 €, prix accepté 20 €, reçu 50 €, dû 30 €. |
| Main occupée | Même vente directe, colis tenu conservé, paiement automatique. |

Arrivées toutes les 4 s, file limitée à 5, séance de 300 s au maximum et lot de huit clients : valeurs provisoires. À l’expiration, finir le client en cours puis vider la file. L’épuisement du lot peut terminer avant cette durée. Une recette confirmée reste acquise indépendamment de la fin de son animation.

Les timers s’arrêtent lorsque la page est masquée, perd le focus ou affiche l’aide. Pas de rattrapage du temps caché. Commandes : E pour parler, glisser ou toucher/poser, cliquer pour reprendre, 1–5 pour les cases, Espace pour confirmer, Échap pour annuler un déplacement. Les zones de saisie et listes déroulantes doivent conserver leurs propres commandes. Textes français/anglais hors du code.

## Vérifications de la correction d

La révision d a passé **90 contrôles, aucun échec** : 51 registre, 22 contrôleur avec présentation simulée et 17 audio avec contexte simulé. Les sept modèles utilisés ont passé leur analyse GLTF, sans rendu. La copie autonome a été générée. La revue visuelle navigateur reste en attente. La révision c avait 88 contrôles réussis et une revue navigateur ; ces résultats restent historiques.

Points suivis par les contrôles et la revue du candidat final :

- Chargement des quatre personnages et des contenus actuels ; absence d’erreur de chargement, de rendu et de console.
- Poids sur chaque sachet et absence de doublon de grammage sur les cases, en ordinateur et portrait.
- Retour sans cadre, durée maximale 2,8 s actives, arrêt anticipé au suivant ou à Parler, pause avec aide/page masquée/perte de focus.
- Vente exacte, trop rendu avec net réel, manque bloqué, reprise/annulation, confirmation unique, colis conservé et réemploi des mêmes recettes.
- Hésitation figée à la première prise, fermeture, commandes clavier et gestes tactiles sans duplication.
- Capture réellement regardée et lien servi correspondant aux empreintes des fichiers.

Euros, grammes, identités, contenus et refus sans mutation restent exacts. La durée maximale demandée et l’absence de transfert doublé sont des règles vérifiables ; les mouvements et amplitudes d’expression restent à juger en jouant. Les tests de contrôleur ou d’audio simulés ne sont pas des preuves de rendu, d’écoute ou d’essai humain.

## Limites et intégration future

Une référence et un sachet par demande, seule l’hésitation de prix démontrée. Pas de campagne, substitutions avancées, pourboires du client, séries, pénalités relationnelles ou secours sans monnaie. Les capacités générales de la sacoche et ses débordements restent hors périmètre.

Aucune modification ni compilation Unity dans cette correction. Une intégration future devra suivre sa carte, sa revue indépendante, la régression complète du dernier exécutable et l’essai du propriétaire. Consigner séparément correction locale, publication, revue navigateur, téléphone physique, écoute et essai humain.
