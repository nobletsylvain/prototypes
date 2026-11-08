# Papier et liasses V01 — journal de publication

Démo créée le 8 novembre 2026 ; relevé de publication et de revue actualisé le 9 novembre. La publication dans le dépôt prototypes a été demandée explicitement par le propriétaire. La nouvelle version reste indépendante des démos précédentes et du jeu Unity.

[Jouer](https://nobletsylvain.github.io/prototypes/cash-feel-v01/) · [Documentation](https://nobletsylvain.github.io/prototypes/cash-feel-v01/documentation.html)

## Publication

La publication initiale sur GitHub Pages a réussi : PR #219 fusionnée dans `main`, commit `c4edc484`, exécution de déploiement `42528850253`. Le lien déployé a été ouvert dans un navigateur pour la revue ci-dessous.

Deux défauts constatés pendant cette revue ont été corrigés dans la PR #222, fusionnée au commit `893543b27d4e155f0816ec93db6504e72012da4a` : orientation verticale des UV, qui retournait les chiffres des billets, et consigne incorrecte concernant le reliquat. Le nouveau déploiement et la confirmation visuelle finale de ces corrections sont encore en cours.

## Contenu

Vue FPS, sons synthétiques activés au premier geste, papier manipulable, compteuse énergique, compression puis léger relâchement de la liasse. Petit lot de 120 billets (2 200 €) et grand lot de 1 200 (22 000 €). Deux cadences, volume et comparaison des retours renforcés. Interface FR/EN.

## Vérifications

**39 tests réussis, 0 échec** : 17 registre monétaire, 11 audio simulé, 11 parcours du contrôleur avec présentation simulée. **12 contrôles de fichiers** ont aussi réussi. Résultats dans `verification/all-tests.tap` ; reproduction : `node --test tests/*.test.mjs` depuis ce dossier.

Les atlas 10 et 20 € sont identiques aux sources V02. La bibliothèque Three.js r160 reprend le fichier déjà présent dans le dépôt, avec fins de ligne LF. Chaque billet garde identité, coupure et valeur ; les refus laissent les contenus inchangés. La relecture a aussi corrigé le volume de sélection des billets après déplacement : la sphère utilisée par le rayon est recalculée lorsque les positions changent.

## Revue dans le navigateur

Le site déployé a réellement été chargé et manipulé dans des fenêtres de **1 280 × 720** et **390 × 844** pixels. Il ne s’agit pas seulement des parcours à présentation simulée des tests.

- Vue FPS chargée ; petit lot de 120 billets, soit 2 200 €, entièrement compté puis rangé : une liasse de 100 billets de 20 € et 20 billets libres de 10 €.
- Refus du mélange des formes essayé, sans changement du contenu affiché.
- Liasse retirée puis ouverte : 100 billets restitués ; affectation de la case conservée après son vidage.
- Réglage de la cadence à 26 billets/seconde et désactivation des retours renforcés essayés.
- Gros lot de 1 200 billets, soit 22 000 €, chargé ; premier passage de 100 billets compté. Les douze passages complets de ce lot n’ont pas été exécutés dans le navigateur.
- Console relevée à ce stade : **0 erreur, 0 avertissement**.

Cette première revue a révélé les deux défauts visuels et de consigne décrits plus haut. **La confirmation visuelle finale après leur correction est encore en cours.** Les dimensions de fenêtre étroite ne constituent pas un essai sur un vrai téléphone.

## Limites de réception

Les tests et la revue navigateur ne prouvent ni une écoute, ni le confort tactile, ni le plaisir de répétition. **Aucun essai humain, aucune écoute validée, aucun essai sur un téléphone physique et aucun résultat Unity revendiqués.** Les contacts et chutes variables restent à observer ou mesurer sans les transformer en seuils arbitraires.

## Reprise Unity

Voir [HANDOFF.md](HANDOFF.md) pour les objets, états, événements, paramètres et invariants. [ASSETS.md](ASSETS.md) conserve les sources, UV et limites. Les choix de compteuse énergique et de liasse comprimée puis relâchée sont acquis ; l’établi, les durées et la cadence restent des propositions d’essai.
