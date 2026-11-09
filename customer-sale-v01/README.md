# L’Étal — vente face au client

Le client attend sans présenter de billet. Quand le joueur lui parle, il révèle sa demande et tend ses billets. Le joueur glisse le sachet et la monnaie sur le carton. Une confirmation avec la monnaie juste ou un trop rendu collecte automatiquement le paiement dans la sacoche, même lorsque la main est occupée. Une monnaie insuffisante reste bloquée.

**Révision du retour de vente :** le trop rendu est accepté et apprécié par le client ; le manque reste bloqué. [Ouvrir la démo](https://nobletsylvain.github.io/prototypes/customer-sale-v01/). Les preuves identifient la révision réellement contrôlée ; les 79 contrôles et la revue navigateur précédents appartiennent à la version antérieure.

## Jouer

Ouvrir `index.html` depuis un serveur HTTP. La copie autonome `Etal-V01.html` contient également les ressources ; sa mise à jour doit suivre la version livrée.

- **Souris ou doigt :** glisser sachet ou billet de monnaie vers l’étal ; cliquer sur un objet préparé pour le reprendre. On peut aussi toucher un objet puis l’étal.
- **E :** parler. **1 à 5 :** sortir un sachet de la case correspondante. **Espace :** confirmer avec le produit conforme et une monnaie juste ou excessive ; aucune étape distincte Proposer. **Échap :** remettre l’objet déplacé.
- Le paiement rejoint automatiquement la sacoche ; aucune commande de ramassage ou rangement des recettes n’est nécessaire.
- **? :** aide et commandes accessibles ; sa lecture suspend la simulation.
- Son et retours renforcés se comparent avec les boutons du haut. Interface en français et anglais.

## Trois situations

1. **Vente simple :** sachet 4 g à 25 €, billet présenté 50 €, monnaie 25 €. Préparer les deux objets, confirmer et observer la collecte.
2. **Hésitation :** sachet 4 g, tarif 25 €, prix accepté 20 €. Le timer de cinq secondes se fige à la première prise. Le joueur ajuste à 20 €, sans contre-offre du client ; rendre 30 € sur les 50 € présentés puis confirmer une seule fois.
3. **Main occupée :** un colis reste tenu pendant la vente. Le paiement rejoint la sacoche, l’objet tenu est conservé et le suivant avance.

Chaque situation recommence un lot isolé : cinq cases de huit sachets, trente billets de fonds, huit clients distincts. Les billets révélés dans la main du client après Parler sont ceux transférés à la confirmation. Produits, coupures et identités sont conservés. Les capacités générales d’un autre jeu ne sont pas modifiées.

## Le retour après vente

Le client est satisfait après une vente, davantage encore si vous rendez trop ; un refus suscite une déception. Le retour visuel distingue **Produit conforme**, **Service** et **Fidélisation** : une hausse qualitative sur une vente normale, renforcée si vous rendez trop. Ces indications ne sont ni des points ni un calcul de prochaines visites.

Le cadre montre le manque en rouge, le compte exact en vert et le trop rendu en ambre. L’excès est confirmable ; le message indique combien vous avez rendu en plus et votre recette réelle. Exemple : prix 25 €, paiement 50 €, monnaie 30 € → 5 € en plus pour le client, recette réelle 20 €. Tous les billets restent comptés exactement.

## Limites et preuves

Une référence et un sachet par demande ; seule l’hésitation de prix est démontrée. Pas de substitutions avancées, pourboires du client, séries, pénalités de relation, secours sans monnaie ou progression chiffrée de fidélisation. Prix, cadence de quatre secondes et durée maximale de cinq minutes sont provisoires. La séance peut finir après les huit clients.

Personnages, carton, sacoche, papier et sons restent des propositions. Le portrait utilise deux rangées de compartiments. Aucun asset final ni intégration Unity n’est livré.

La première version avait 76 contrôles réussis et une revue navigateur aux formats ordinateur et téléphone. La révision précédente a passé 79 contrôles : 45 registre, 17 contrôleur avec présentation simulée et 17 audio avec contexte simulé ; quatre modules valides en syntaxe. Une composition incompatible désactive la confirmation. Les trois situations ont été parcourues en ligne à 390 × 844, avec contrôles d’affichage à 360 × 740 et 1280 × 720 ; aucune erreur ni avertissement de console. Les résultats de la révision courante sont dans le relevé correspondant à ses empreintes. Aucun essai humain, téléphone physique ou écoute de cette révision n’est validé.

Voir [le carnet](documentation.html), [la passation](HANDOFF.md), [la provenance](ASSETS.md), [les preuves datées](verification/summary.json) et [la revue publiée](verification/browser-review.json).


Ajustement conservé du 9 novembre : les billets apparaissent uniquement après Parler. Les observations de la révision précédente restent datées ; la vérification de ce déclenchement est consignée dans le suivi de la correction. [Suivi](https://github.com/nobletsylvain/prototypes/issues/257).
