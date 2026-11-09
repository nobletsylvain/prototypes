# L’Étal — vente face au client

**Révision d du 9 novembre 2026 : reprise des modèles du jeu, grammage sur les sachets et retour de vente temporaire sans cadre.** [Lien de la révision d](https://nobletsylvain.github.io/prototypes/customer-sale-v01/?v=20261109d) · [Suivi de la correction, issue 280](https://github.com/nobletsylvain/prototypes/issues/280).

Cette révision a passé 90 contrôles automatiques et le chargement analysé des sept modèles GLTF ; sa revue visuelle navigateur reste à effectuer. Le lien désigne la cible de publication et ne constitue pas une preuve de déploiement.

Le client attend sans montrer son paiement. Quand vous lui parlez, il révèle sa demande et tend ses billets. Glissez le sachet et la monnaie sur le carton, puis confirmez. Le paiement rejoint automatiquement la sacoche, même avec un colis en main. La monnaie insuffisante bloque la vente ; un trop rendu est accepté et apprécié par le client.

## Jouer

Servir index.html par HTTP. Le démarrage attend le chargement des modèles ; une erreur de chargement doit être résolue avant de jouer. Une copie autonome Etal-V01.html a également été générée pour cette correction.

- **Souris ou doigt :** glisser un sachet ou un billet vers l’étal ; cliquer sur un objet préparé pour le reprendre. On peut aussi toucher un objet puis l’étal.
- **E :** parler. **1 à 5 :** sortir un sachet de la case correspondante. **Espace :** confirmer le produit conforme et la monnaie juste ou excessive. **Échap :** remettre l’objet déplacé.
- Le paiement est encaissé automatiquement ; aucune commande de ramassage ou de rangement des recettes n’est nécessaire.
- **? :** aide et commandes accessibles. L’aide, la page masquée et la perte de focus suspendent le temps, sans rattrapage au retour.
- Interface française et anglaise ; boutons pour comparer son et retours renforcés.

## Trois situations

| Situation | Parcours |
|---|---|
| Vente simple | Sachet 4 g à 25 €, billet présenté 50 €, monnaie 25 €. Préparer, confirmer, observer la collecte. |
| Hésitation | Sachet 4 g, tarif 25 €, prix accepté 20 €. La première prise d’un sachet fige les cinq secondes ; ajuster à 20 €, rendre 30 € sur 50 €, confirmer. |
| Main occupée | Garder le colis pendant la vente. Le paiement rejoint la sacoche, le colis reste tenu et le suivant avance. |

Chaque situation recommence un lot isolé : cinq cases de huit sachets, trente billets de fonds et huit clients distincts. Les identités, coupures et quantités restent conservées. Les prix, les arrivées toutes les quatre secondes, la file de cinq et la durée maximale de cinq minutes sont des valeurs provisoires. Le lot de clients peut finir plus tôt.

## Présentation et retour de vente

Le cadrage et la sacoche validés par le propriétaire sont conservés. Le poids figure sur chaque sachet ; les cases conservent seulement leur repère de raccourci. Les contenus sont les modèles du jeu : têtes HeadsV05 de 2 et 5 g, maître de 2 g également utilisé pour la gamme premium, et barrette HashV02 dont l’épaisseur distingue 4 et 8 g. Film, zip et étiquette restent construits pour cette scène. Les clients réemploient Leah, Moira, Eddie et Martin, quatre modèles originaux historiquement intégrés à CapitalWorld.

Pendant la préparation, **Présenté / À rendre / Rendu** distingue manque en rouge, compte exact en vert et trop rendu en ambre. Après la vente, un texte sans cadre accompagne la satisfaction et les indications **Produit / Service / Fidélisation**. Il apparaît pendant au plus **2,8 secondes de temps actif**, disparaît plus tôt à l’arrivée du suivant ou lorsque vous lui parlez, et ne reste pas attaché à la nouvelle vente. L’aide le masque et suspend son temps ; la perte de focus ou le masquage de la page suspend aussi sa durée.

Une vente conforme donne un retour positif ; un trop rendu renforce service et fidélisation. Ce sont des indications qualitatives, sans points ni nouvelles visites simulées. Exemple : prix 25 €, paiement 50 €, monnaie 30 € → 5 € en plus pour le client, recette réelle 20 €. Les billets réellement remis financent cet écart.

## Limites et preuves

Une référence et un sachet par demande ; seule l’hésitation de prix est démontrée. Une composition incompatible empêche la confirmation. Pas de substitutions avancées, pourboires du client, séries, pénalités relationnelles, secours sans monnaie ou campagne. Le shader de résine Unity n’est pas porté ; les matières exportées sont conservées. Sons, animations et adaptation des modèles au navigateur restent à éprouver.

La révision d a passé **90 contrôles, aucun échec** : 51 registre, 22 contrôleur avec présentation simulée et 17 audio avec contexte simulé. Les sept modèles utilisés ont aussi passé leur analyse GLTF, sans rendu. La revue visuelle navigateur reste en attente ; aucun essai humain, téléphone physique ou écoute de cette révision n’est validé. La révision c avait 88 contrôles et sa propre revue navigateur, conservés comme historique. Aucune intégration ni compilation Unity n’a lieu dans cette correction.

[Carnet](documentation.html) · [Passation](HANDOFF.md) · [Ressources](ASSETS.md) · [Relevé daté](verification/summary.json). Lire la révision et les empreintes du relevé avant de lui attribuer une validation.
