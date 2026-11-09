# L’Étal — vente face au client

Le client arrive avec ses billets en main, puis les tend en formulant sa demande. Le joueur glisse le sachet et la monnaie sur le carton. Une confirmation juste collecte automatiquement le paiement dans la sacoche, même lorsque la main est occupée.

**Correction publiée et vérifiée.** [Essayer la démo corrigée](https://nobletsylvain.github.io/prototypes/customer-sale-v01/?v=20261109b). Les 79 contrôles automatiques passent, sans échec. Les trois situations ont été parcourues en navigateur ; les preuves distinguent cette correction de la première version.

## Jouer

Ouvrir `index.html` depuis un serveur HTTP. La copie autonome `Etal-V01.html` contient également les ressources ; sa mise à jour doit suivre la version livrée.

- **Souris ou doigt :** glisser sachet ou billet de monnaie vers l’étal ; cliquer sur un objet préparé pour le reprendre. On peut aussi toucher un objet puis l’étal.
- **E :** parler. **1 à 5 :** sortir un sachet de la case correspondante. **Espace :** confirmer la vente exacte ; aucune étape distincte Proposer. **Échap :** remettre l’objet déplacé.
- Le paiement rejoint automatiquement la sacoche ; aucune commande de ramassage ou rangement des recettes n’est nécessaire.
- **? :** aide et commandes accessibles ; sa lecture suspend la simulation.
- Son et retours renforcés se comparent avec les boutons du haut. Interface en français et anglais.

## Trois situations

1. **Vente simple :** sachet 4 g à 25 €, billet présenté 50 €, monnaie 25 €. Préparer les deux objets, confirmer et observer la collecte.
2. **Hésitation :** sachet 4 g, tarif 25 €, prix accepté 20 €. Le timer de cinq secondes se fige à la première prise. Le joueur ajuste à 20 €, sans contre-offre du client ; rendre 30 € sur les 50 € présentés puis confirmer une seule fois.
3. **Main occupée :** un colis reste tenu pendant la vente. Le paiement rejoint la sacoche, l’objet tenu est conservé et le suivant avance.

Chaque situation recommence un lot isolé : cinq cases de huit sachets, trente billets de fonds, huit clients distincts. Les billets visibles dans la main du client sont ceux transférés à la confirmation. Produits, coupures et identités sont conservés. Les capacités générales d’un autre jeu ne sont pas modifiées.

## Limites et preuves

Une référence et un sachet par demande ; seule l’hésitation de prix est démontrée. Pas de substitutions avancées, pourboires, séries, pénalités, secours sans monnaie ou progression. Prix, cadence de quatre secondes et durée maximale de cinq minutes sont provisoires. La séance peut finir après les huit clients.

Personnages, carton, sacoche, papier et sons restent des propositions. Le portrait utilise deux rangées de compartiments. Aucun asset final ni intégration Unity n’est livré.

La première version avait 76 contrôles réussis et une revue navigateur aux formats ordinateur et téléphone. La correction passe 79 contrôles : 45 registre, 17 contrôleur avec présentation simulée et 17 audio avec contexte simulé ; quatre modules valides en syntaxe. Une composition incompatible désactive la confirmation. Les trois situations ont été parcourues en ligne à 390 × 844, avec contrôles d’affichage à 360 × 740 et 1280 × 720 ; aucune erreur ni avertissement de console. Aucun essai humain, téléphone physique ou écoute de cette correction n’est validé.

Voir [le carnet](documentation.html), [la passation](HANDOFF.md), [la provenance](ASSETS.md), [les preuves datées](verification/summary.json) et [la revue publiée](verification/browser-review.json).
