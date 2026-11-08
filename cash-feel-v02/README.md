# Papier & liasses V02 — les poignées

[Essayer](https://nobletsylvain.github.io/prototypes/cash-feel-v02/) · [Carnet d’essai](documentation.html) · [Comparer avec V01](../cash-feel-v01/)

Prenez une poignée directement dans le tas, déplacez-la au doigt ou à la souris et relâchez-la dans l’entrée. La poignée reste visible pendant le déplacement ; un geste raté ou annulé ne fait perdre aucun billet.

**Deux circuits :** trieuse puis compteuse séparées au démarrage ; machine combinée pour comparer. La première sépare les billets de 10 et de 20 € avant la reprise vers la compteuse. La seconde accepte une poignée mélangée et effectue le tri et le comptage. Changer de circuit recommence explicitement le lot.

La compteuse énergique et la liasse qui se comprime puis se relâche sont conservées. Vue FPS, sons provisoires au premier appui et retours visuels actifs. Le maintien complète la prise ; Regarder sépare la caméra de la manipulation ; Aide aux gestes ouvre les commandes assistées. Les paramètres de prise et les zones de dépôt restent des propositions d’essai.

Chaque billet garde son identité, sa coupure et sa valeur. Les liasses contiennent 100 billets d’une coupure ; main et cases conservent leurs limites. La V01 et les sources artistiques antérieures restent intactes.

<!-- QA_STATUS -->
**69 contrôles logiciels réussis, zéro échec** : 17 registre monétaire, 10 circuits, 18 contrôleur, 13 gestes, 11 audio. Les cinq fichiers réemployés sont identiques à V01 et les cinq contrôles de syntaxe passent.

**V02 publiée et parcourue dans le navigateur** en 1 280 × 720, 390 × 844 et 360 × 740. Sur v2a, les petits lots de 120 billets ont été terminés dans les deux circuits, jusqu’au rangement d’une liasse de 100 billets de 20 € et de 20 billets de 10 €, soit 2 200 € conservés. Prise directe, maintien, dépôts, refus sans perte, pose et reprise sur table, FR/EN et bascule des effets ont été vérifiés ; aucun débordement mobile ni avertissement ou erreur de console relevé.

Le gros lot combiné de 1 200 billets a été chargé ; une poignée de 100 billets, valant 1 840 €, a été déplacée puis comptée. Le parcours complet du gros lot est couvert par les tests du modèle dans les deux circuits. Les corrections des panneaux ont été vérifiées de façon ciblée sur v2b puis **v2c publiée**, en 360 × 740 : rangement, réglages et aide initiale restent séparés, y compris avant le premier versement et après changement de circuit. Les parcours complets de v2a n’ont pas tous été rejoués sur v2c. Aucun essai humain, écoute validée, téléphone physique ou résultat Unity n’est déduit de ces résultats.
<!-- /QA_STATUS -->

[Passation Unity](HANDOFF.md) · [Provenance](ASSETS.md) · [Journal](SESSION.md). Sources modulaires locales, sans dépendance CDN.
