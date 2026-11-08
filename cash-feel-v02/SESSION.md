# Papier & liasses V02 — journal de session

9 novembre 2026. Nouvelle version indépendante du prototype V01. [Essayer la V02 publiée](https://nobletsylvain.github.io/prototypes/cash-feel-v02/) · [V01 conservée](../cash-feel-v01/) · [Carnet](documentation.html).

## Retour du propriétaire et portée

Après la présentation de V01, le propriétaire précise que le but est de prendre des poignées de billets et de les mettre dans la trieuse et la compteuse. À la question « deux machines séparées ou une machine qui fait les deux ? », il demande les deux. La V02 donne donc accès aux deux configurations ; leur bascule redémarre explicitement le lot.

Cette demande recentre l’essai sur la manipulation directe. Elle ne rouvre pas les décisions de compteuse énergique et de liasse comprimée puis légèrement relâchée. Elle ne décide pas encore du circuit définitif du jeu.

## Ce que change V02

- Contact sur le tas : prise locale de plusieurs billets identifiés ; maintien pour compléter, déplacement pour porter.
- Poignée visible qui suit le doigt ou la souris jusqu’à l’entrée. Relâchement accepté pour alimenter ; pose sur table valide ; maintien en main si raté ou annulé.
- Circuit séparé par défaut : trieuse, sorties libres de 10 et 20 €, reprise d’une pile triée, compteuse.
- Circuit combiné : admission d’une poignée mélangée, tri et comptage dans une seule machine.
- La compteuse séparée refuse les coupures mélangées et les conflits avec son entrée en cours, sans modifier la poignée.
- Interface allégée : commandes d’aide et rangement repliables. Les indications d’entrée accompagnent le geste.

La prise initiale de 24 billets au plus, le maintien de 350 ms puis les compléments de 16 toutes les 150 ms, le seuil de 8 pixels et les zones de dépôt restent des réglages proposés. Les plafonds de main et de cases restent des règles exactes conservées.

## Sources et réemploi

Le brief « Prototype – Argent liquide et liasses » et le cadre « Prototypes – Trois sessions de ressenti » sont les sources de cadrage. Le retour du 9 novembre précise la direction de manipulation. La passation conserve les règles de « Conception – L’argent qui pèse » et les arbitrages récents du propriétaire déjà repris dans V01.

Les deux textures, le module audio, Three.js r160 et sa licence ont été comparés à la copie publiée V01 : **cinq fichiers identiques**. Leur provenance et leurs empreintes sont dans `ASSETS.md`. Aucun nouveau son n’est présenté comme extrait des références CCS. Les lots antérieurs ne sont pas modifiés.

## Vérifications exactes

<!-- QA_TOTAL -->
Passage logiciel final : **69 réussites, 0 échec** — 17 registre monétaire, 10 circuits, 18 contrôleur, 13 gestes et 11 audio. **Cinq comparaisons de réemploi réussies, 0 différence** (deux atlas, Three.js, licence et audio) et **cinq contrôles de syntaxe réussis, 0 échec**. Les scénarios monétaires couvrent les petits et gros lots complets dans les deux circuits, identités, sommes, coupures, limites et refus ; les contrôles de gestes incluent les zones de dépôt. Le 69e contrôle vérifie la séparation des panneaux au redémarrage et avant le premier versement. Le passage final de la copie portable confirme également **69 réussites, 0 échec** ; son ancien relevé à 68 est conservé comme historique. Ne pas attribuer à ces contrôles un résultat de rendu, d’écoute ou de confort sur téléphone physique.
<!-- /QA_TOTAL -->

La statique documentaire vérifie les liens locaux et ancres du carnet, la présence des documents et la séparation entre décisions, propositions et preuves.

## Publication et revue navigateur

<!-- PUBLICATION_STATUS -->
La V02 est publiée dans `nobletsylvain/prototypes`, dossier `cash-feel-v02/`, et a été ouverte dans le navigateur. La [PR 227](https://github.com/nobletsylvain/prototypes/pull/227) a été fusionnée au commit `da9c4884a964b8755059e7050acd940b88d1d852` ; le [déploiement Pages 42532158750](https://github.com/nobletsylvain/prototypes/actions/runs/42532158750) a réussi. La V01 reste à son adresse, inchangée ; aucun changement du jeu Unity.

La revue a révélé un chevauchement des panneaux après redémarrage. Le premier correctif, couvert par le 69e contrôle logiciel, est fusionné dans la [PR 229](https://github.com/nobletsylvain/prototypes/pull/229), commit `d8d93f74252610dbd2bc4993b20351c0080d4064`, puis confirmé visuellement sur v2b déployée en 360 × 740. La [PR 230](https://github.com/nobletsylvain/prototypes/pull/230), fusionnée au commit `77af5a4820e58cc147de5073e0ab78197b3d3aea`, complète la correction pour l’ouverture du rangement avant le premier versement. Le [déploiement Pages 42532872954](https://github.com/nobletsylvain/prototypes/actions/runs/42532872954) a réussi et la **v2c publique est confirmée visuellement**, avec `app.mjs?v=20261109-v2c` effectivement chargé.
<!-- /PUBLICATION_STATUS -->

<!-- BROWSER_STATUS -->
La V02 publiée a été parcourue dans le navigateur aux formats **1 280 × 720, 390 × 844 et 360 × 740**. Les parcours complets des petits lots et les manipulations ci-dessous ont été observés sur **v2a** ; les corrections de panneaux ont ensuite été vérifiées de façon ciblée sur **v2b et v2c**. Tous les parcours de v2a n’ont pas été rejoués sur v2c. Les captures ont été vues dans l’outil de revue ; aucun fichier PNG de preuve n’est joint.

- **Petit lot complet dans les deux configurations :** 120 billets passent jusqu’au rangement d’une liasse de 100 billets de 20 € dans une case et de 20 billets libres de 10 € dans une autre. Total conservé : **2 200 €**.
- **Geste direct :** prise dans le tas, maintien pour compléter plusieurs prises, suivi de la poignée, dépôt dans l’entrée et reprise des sorties triées vers la compteuse. Les bords des cartes d’entrée acceptent le dépôt.
- **Refus et pose :** la compteuse séparée refuse une poignée mélangée de 24 billets, valant 400 €, et la conserve. Un lâcher hors table conserve les 24 billets tenus, valant 440 €. Une pose valide sur table puis une reprise dans la même zone ont été observées.
- **Interface :** français et anglais, bascule des effets visuels, aucun débordement horizontal aux formats mobiles. Console : **0 avertissement, 0 erreur** sur les parcours effectués.
- **Gros lot combiné :** 1 200 billets chargés ; une poignée de 100 billets, valant 1 840 €, a été glissée vers l’entrée puis comptée. Aucun parcours navigateur complet du gros lot n’est revendiqué ; les tests du modèle couvrent les lots complets dans les deux circuits.

Sur **v2c publique en 360 × 740**, ouvrir le rangement avant le premier versement masque l’aide et met son état accessible à fermé ; ouvrir les réglages masque rangement et aide ; fermer le panneau rétablit l’aide initiale. Basculer entre les deux circuits ne laisse visible que cette aide initiale. Le module v2c chargé a été vérifié dans la page. **0 avertissement et 0 erreur de console** restent relevés sur l’ensemble des parcours observés.
<!-- /BROWSER_STATUS -->

## Réception et limites

Aucun essai humain, aucune écoute validée, aucun téléphone physique et aucun résultat Unity revendiqués à cette étape. Un calcul ou une simulation de pointeur ne prouve pas le confort au doigt. Le propriétaire doit pouvoir juger le plaisir de prendre une poignée, l’évidence des entrées, le rythme, la cohésion de la liasse et la fatigue après répétition.

La passation Unity décrit les API et événements nouveaux dans `HANDOFF.md`. Le prototype autonome précède cette future intégration ; il ne la remplace pas.
