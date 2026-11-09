# L’Étal — vente face au client

Une démo autonome en vue subjective, avec des données fictives et finies. Le client découvre sa demande après interaction ; le joueur prépare depuis la sacoche, propose puis rend la monnaie. Les recettes restent récupérables pendant que le suivant avance.

## Jouer

Ouvrir `index.html` depuis un serveur HTTP. La copie autonome `Etal-V01.html` livrée à côté du dossier `dist` contient aussi toutes les ressources et peut s’ouvrir directement dans un navigateur compatible avec les modules et import maps.

- **Souris ou doigt :** glisser un sachet ou billet vers l’étal ; cliquer sur un objet posé pour le reprendre. On peut aussi toucher un objet puis l’étal.
- **E :** parler. **1 à 5 :** sortir un sachet de la case correspondante. **Espace :** proposer, puis confirmer le paiement exact. **R :** ranger la main. **Échap :** remettre l’objet en cours de déplacement.
- **? :** aide et commandes accessibles pour chaque objet ; la simulation est en pause pendant la lecture.
- Le son et les retours renforcés se comparent depuis les boutons du haut. Les textes d’interface sont disponibles en français et en anglais.

## Trois situations

1. **Vente simple :** premier sachet, tarif 45 €, paiement 50 €, monnaie 5 €.
2. **Hésitation :** deuxième sachet, tarif 25 €, budget 20 €. Le timer de cinq secondes se fige à la première prise. Le joueur peut proposer 20 € ; le client ne fait aucune contre-offre.
3. **Main pleine :** un colis de démonstration occupe la main. Après vente, le client laisse ses billets sur l’étal. Ranger le colis, ramasser puis ranger les billets. Le suivant avance pendant ce temps.

Chaque situation recommence un lot isolé : cinq cases de huit sachets, trente billets dans le fonds, huit clients distincts. Les produits, coupures et identités sont conservés à chaque transfert. Les capacités générales d’un autre jeu ne sont pas simulées.

## Limites

Une seule référence et un sachet par demande ; seul le motif d’hésitation « prix » est démontré. Les substitutions, pourboires, séries, pénalités, solutions de secours sans monnaie et progression ne sont pas reconstruits. Les quantités, prix, cadence de quatre secondes et durée maximale de cinq minutes sont des données de démonstration. La séance peut aussi finir après les huit clients.

Personnages, carton, sacoche, mouvements, papier et sons sont des propositions d’essai. Le portrait emploie deux rangées de compartiments dans la même sacoche. Il ne s’agit pas d’assets finaux ni d’une intégration Unity.

Voir [le carnet](documentation.html), [la passation](HANDOFF.md), [la provenance](ASSETS.md) et [les preuves](verification/summary.json). Les tests automatiques ne constituent ni une écoute ni un essai humain.
