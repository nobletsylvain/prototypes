# Passation de la démo de vente face au client

9 novembre 2026. **Révision du feedback : trop rendu accepté, manque bloqué, émotion et retour qualitatif.** [La première version est publiée](https://nobletsylvain.github.io/prototypes/customer-sale-v01/). La révision précédente a passé 79 contrôles automatiques, sans échec : 45 registre, 17 contrôleur avec présentation simulée et 17 audio avec contexte simulé ; quatre modules valides en syntaxe. Les trois situations ont été parcourues en ligne, sans erreur ni avertissement de console. Les résultats de la révision courante sont consignés dans le relevé correspondant à ses empreintes ; la revue précédente ne valide pas les nouveaux cas de monnaie et de feedback.

Les noms d’événements et d’états sont un contrat proposé, pas une API Unity livrée. Aucun essai humain, écoute ou téléphone physique n’est validé pour la correction.

## Boucle à transmettre

Le client attend bras au repos, sans billet visible. L’action Parler révèle sa demande et ses billets ensemble ; il les tend alors. Le joueur prépare sachet et monnaie sur le carton bas, reprend librement et confirme une fois. Produits et monnaie passent au client, paiement original dans la sacoche. Le client réagit brièvement puis le suivant avance.

Cinq cases de produits et les billets debout dans leurs compartiments entourent L’ÉTAL. Le cadre reste Présenté / À rendre / Rendu, sans pictogrammes répétant le billet présenté. Rouge signifie manque bloqué, vert signifie juste, ambre signifie trop rendu confirmable.

## Registre exact et billet présenté

Le registre est l’autorité sur chaque identité. Billet : coupure, valeur entière, propriétaire et emplacement exclusif. Sachet : produit, quantité, composition et emplacement exclusif. La présentation anime ces identités ; elle ne compte pas l’argent à partir des images.

Avant confirmation, le billet visible reste au client. Le tenir, le tendre ou afficher sa valeur n’encaisse rien et ne crée aucune copie. À la confirmation autorisée, produits, tous les billets de monnaie posés et paiement sont transférés atomiquement une seule fois. Le prix convenu reste distinct de la recette nette réelle : paiement reçu moins monnaie effectivement donnée. Le trop rendu, égal à monnaie donnée moins monnaie due, est positif pour le client et réduit réellement cette recette ; il ne crée aucun billet. La destination des recettes est la sacoche. L’animation peut continuer après la mutation ; son arrivée ne crédite rien de plus.

Après confirmation, les mêmes billets présents dans la sacoche peuvent servir à la vente suivante. Aucune étape obligatoire par la main du joueur ou l’étal. La main occupée ne modifie ni ce résultat ni l’objet déjà tenu.

Une validation refusée laisse le registre inchangé. Reprise ou annulation restitue les mêmes objets préparés ; le paiement du client reste chez lui. Double clic, Espace répété et événements tactiles/souris rapprochés ne transfèrent rien deux fois.

## États proposés

| État | Données et geste | Sortie |
|---|---|---|
| `AwaitingConversation` | Client visible, billets et demande cachés | Interaction |
| `RequestPresented` | Demande et billet tendu ; tarif accepté ou hésitation | Préparation |
| `Hesitating` | Motif, cinq secondes et refus possible | Premier sachet fige le timer, sinon expiration |
| `ComposingOffer` | Produit, quantité et prix du joueur | Accord si le souci est résolu |
| `PreparingSale` | Produit conforme ; monnaie posée/reprise | Confirmation si monnaie juste ou excessive ; manque bloqué |
| `Completed` | Transfert achevé ; paiement animé vers sacoche | Réaction brève |
| `AdvancingQueue` | Aucun rangement manuel requis | Suivant |
| `Closed` | Aucune nouvelle vente ; recettes conservées | Fin ou nouvelle situation |

Une interruption reconstruit la présentation depuis le registre. La file ne dépend pas d’une touche de rangement.

## Événements de mouvement et son

| Événement proposé | Déclencheur | Réponse |
|---|---|---|
| `CustomerPaymentHeld` | Client arrivé avec ses billets identifiés | Paiement conservé par le client, hors de vue |
| `CustomerPaymentPresented` | Demande révélée | Main tendue, mêmes billets, aucun encaissement |
| `BillExtractionStarted` | Prise autorisée dans la sacoche | Extraction, légère flexion, froissement |
| `ItemDragMoved` | Déplacement du pointeur | Mouvement du même objet |
| `ItemContactedStall` | Premier contact réel après pose acceptée | Impact papier/carton ou sachet et retombée |
| `ItemReturnedToPocket` | Reprise d’objet préparé | Retour visible vers la source |
| `OfferAccepted` | Proposition conforme | Réaction brève |
| `SaleCommitted` | Mutation atomique réussie, prix et net distincts | Confirmation unique, information sur le trop rendu et recette réelle |
| `RevenueAutoStored` | Paiement transféré par confirmation | Trajet depuis la main du client vers la sacoche |
| `RevenueEnteredPocket` | Arrivée visuelle à l’ouverture | Froissement de rangement, aucune mutation monétaire |
| `CustomerSatisfied` | Vente confirmée | Satisfaction ; expression renforcée si trop rendu |
| `CustomerDisappointed` | Refus de vente | Déception brève, sans pénalité relationnelle ajoutée |
| `SaleFeedbackShown` | Transaction confirmée | Produit conforme, service et fidélisation qualitatifs, sans points ni fréquence de retour |
| `CustomerDeparted` | Fin du face-à-face | Suivant |

Synchroniser les sons avec l’objet concerné et le contact effectif. Une animation interrompue ne rejoue pas un paiement. Le son de rangement suit le trajet automatique, sans attendre une commande manuelle. La synthèse originale reste provisoire ; conserver provenance et paramètres. Écoute, mixage et assets finaux restent à éprouver.

## Feedback et fidélisation qualitative

Une vente normale présente un produit conforme, un service positif et une fidélisation positive. Un trop rendu renforce visuellement service et fidélisation ; il ne change pas la conformité du produit. Le message indique le supplément et la recette nette réelle. Le manque ne déclenche aucune vente ni satisfaction : sa confirmation reste refusée sans mutation.

Ces états sont un feedback local de la transaction. Ne pas ajouter de points, seuils, probabilité de retour, nouvelles visites ou bonus monétaire. Les expressions satisfaites ou déçues ne remplacent pas les gardes du registre. Leur amplitude et leur durée restent à éprouver.

## Main occupée et fermeture

Le troisième scénario conserve un colis tenu pendant la vente. Les billets rejoignent automatiquement la sacoche sans libérer ni remplacer ce colis. Il ne définit pas une nouvelle capacité.

À la fin du temps, fermeture après le client en cours et départ de la file. Toute vente confirmée a déjà conservé ses recettes. Interrompre l’animation par le départ ou la fermeture ne peut répéter ni annuler le transfert.

Capacités et débordement du jeu restent hors périmètre. Une future intégration s’appuie sur ses règles réelles ; le petit fonds de démonstration ne prouve pas une capacité illimitée.

## Hésitation, données et commandes

Le timer commence à la révélation de l’hésitation et se fige au premier sachet préparé. Reprendre est libre. Le joueur propose le prix ; aucune contre-offre automatique. Baisse par pas de 5 €, sans dépasser le tarif normal.

Trois cas : 4 g à 25 €, billet 50 €, monnaie 25 € ; hésitation 4 g à 25 €, proposition 20 €, monnaie 30 € sur 50 € ; main occupée avec collecte automatique. Cadence 4 s, file 5, durée maximale 300 s et lot de huit clients : valeurs provisoires.

Les timers s’arrêtent lorsque la page est masquée, perd le focus ou affiche l’aide. Pas de rattrapage d’une longue durée cachée. Commandes : parler, glisser, reprendre, 1–5, Espace pour confirmer une seule fois, sans étape distincte Proposer, Échap pour annuler le déplacement. Aucune commande de rangement des recettes. Textes français/anglais hors code ; second doigt, annulation du pointeur et relâchement hors cible sans double prise.

## Paramètres à essayer

- Billet absent avant Parler, puis lisible avec la demande.
- Hauteur du carton, visibilité du client, cadre et accès aux compartiments.
- Extraction, flexion et contact du papier.
- Collecte automatique, son d’arrivée et enchaînement avec le départ.
- Réaction du client et comparaison des retours simples/renforcés.

## Limites

Aucune modification ni compilation Unity dans cette session ; capacités du jeu et autres prototypes préservés. Interfaces publiques des dépendances et licences respectées. Pas de création d’argent ou stock par animation, son ou particule. Séries, pourboires, pénalités, campagne et secours sans monnaie hors essai. Contrôles automatiques distincts de l’essai humain.

## Contrôles requis pour la correction

Les résultats de la révision courante doivent correspondre aux empreintes du candidat dans le relevé ; les anciens comptes ne valident pas les nouveaux scénarios. Le bilan final doit identifier la version publiée. Une composition incompatible rend la confirmation indisponible.

| Cas | Attendu |
|---|---|
| Arrivée et conversation | Billet caché avant interaction, puis révélé et tendu avec la demande |
| Préparation, reprise et annulation | Identités conservées ; paiement non encaissé avant confirmation |
| Monnaie insuffisante | Rouge et confirmation refusée sans mutation |
| Trop rendu | Ambre, confirmation autorisée, billets exacts transférés, supplément et recette nette justes |
| Vente exacte | Produits/monnaie au client, paiement original en sacoche ; total constant |
| Feedback | Produit conforme ; service/fidélisation positifs, renforcés pour trop rendu, sans points ni véritables visites |
| Double confirmation | Une transaction |
| Main occupée | Collecte automatique et colis strictement conservé |
| Réemploi d’une recette | Même billet utilisable comme monnaie, sans duplication |
| Animation interrompue | Aucun deuxième versement ni perte |
| Suivant et fermeture | Aucune attente de rangement ; paiement conservé |
| Hésitation | Timer figé et proposition de 20 € recevable dans le cas prévu |
| Pause et toucher | Pas de temps caché ni double prise |
| Revue PC et téléphone | Billets lisibles, client visible, carton accessible |
| Audio | Son raccordé à la collecte et au contact, sans effet économique |

Euros, grammes, identités, contenus, refus sans mutation et erreurs sont bloquants. Amplitudes et durées visuelles sont des mesures de ressenti.

## Preuves et intégration future

Consigner version exacte, URL servie, comptes de tests, captures regardées et défauts. Distinguer ancien candidat, correction locale, publication, revue navigateur, téléphone physique et essai humain. Les anciennes preuves restent datées.

Une intégration Unity demandera périmètre, revue indépendante, construction et régression complète de l’exécutable final. Le prototype ne remplace pas ces étapes ni l’essai humain du résultat intégré.


Ajustement conservé du 9 novembre : les billets apparaissent uniquement après Parler. Les observations de la révision précédente restent datées ; la vérification de ce déclenchement est consignée dans le suivi de la correction. [Suivi](https://github.com/nobletsylvain/prototypes/issues/257).


Le cadrage a été validé par le propriétaire. Les grammages sont renforcés par des repères contrastés, sans ajout de sacoche ni changement de caméra.
