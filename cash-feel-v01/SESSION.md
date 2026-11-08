# Papier et liasses V01 — journal de publication

Démo créée le 8 novembre 2026, publication dans le dépôt prototypes demandée explicitement par le propriétaire. La nouvelle version reste indépendante des démos précédentes et du jeu Unity.

## Contenu

Vue FPS, sons synthétiques activés au premier geste, papier manipulable, compteuse énergique, compression puis léger relâchement de la liasse. Petit lot de 120 billets (2 200 €) et grand lot de 1 200 (22 000 €). Deux cadences, volume et comparaison des retours renforcés. Interface FR/EN.

## Vérifications

39 tests réussis, 0 échec : 17 registre monétaire, 11 audio simulé, 11 parcours du contrôleur avec présentation simulée. Résultats dans verification/all-tests.tap ; reproduction : `node --test tests/*.test.mjs` depuis ce dossier.

Les atlas 10 et 20 € sont identiques aux sources V02. La bibliothèque Three.js r160 reprend le fichier déjà présent dans le dépôt, avec fins de ligne LF. Chaque billet garde identité, coupure et valeur ; les refus laissent les contenus inchangés. La relecture a aussi corrigé le volume de sélection des billets après déplacement : la sphère utilisée par le rayon est recalculée lorsque les positions changent.

Le rendu navigateur et l’essai tactile restent à vérifier après déploiement. Les tests simulés ne prouvent ni une écoute, ni le confort, ni le plaisir de répétition. Aucun essai humain ou résultat Unity revendiqué.

## Reprise Unity

Voir [HANDOFF.md](HANDOFF.md) pour les objets, états, événements, paramètres et invariants. [ASSETS.md](ASSETS.md) conserve les sources, UV et limites. Les choix de compteuse énergique et de liasse comprimée puis relâchée sont acquis ; l’établi, les durées et la cadence restent des propositions d’essai.
