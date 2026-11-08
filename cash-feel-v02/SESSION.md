# Papier & liasses V02 — journal de session

9 novembre 2026. Nouvelle version indépendante du prototype V01. [Lien prévu](https://nobletsylvain.github.io/prototypes/cash-feel-v02/) · [V01 conservée](../cash-feel-v01/) · [Carnet](documentation.html).

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
Passage logiciel final : **68 réussites, 0 échec** — 17 registre monétaire, 10 circuits, 17 contrôleur, 13 gestes et 11 audio. **Cinq comparaisons de réemploi réussies, 0 différence** (deux atlas, Three.js, licence et audio) et **cinq contrôles de syntaxe réussis, 0 échec**. Les scénarios monétaires couvrent les deux circuits, identités, sommes, coupures, limites et refus ; les contrôles de gestes incluent les zones de dépôt. Ne pas attribuer à ces contrôles un résultat de rendu, d’écoute ou de confort sur téléphone physique.
<!-- /QA_TOTAL -->

La statique documentaire vérifie les liens locaux et ancres du carnet, la présence des documents et la séparation entre décisions, propositions et preuves. Les détails finaux de validation doivent remplacer les marqueurs ci-dessus avant la passation.

## Publication et revue navigateur

<!-- PUBLICATION_STATUS -->
Publication V02 en préparation dans `nobletsylvain/prototypes`, dossier `cash-feel-v02/`. Le lien prévu n’est pas encore une preuve d’accès. La V01 reste à son adresse ; aucun changement du jeu Unity.
<!-- /PUBLICATION_STATUS -->

<!-- BROWSER_STATUS -->
La revue du geste et du rendu V02 dans un navigateur est à effectuer après déploiement. Aucun résultat visuel V01 n’est réattribué à V02. Vérifier notamment la prise d’une poignée dans le tas, son suivi, le dépôt dans chaque circuit, la reprise des piles triées, les refus et l’annulation.
<!-- /BROWSER_STATUS -->

## Réception et limites

Aucun essai humain, aucune écoute validée, aucun téléphone physique et aucun résultat Unity revendiqués à cette étape. Un calcul ou une simulation de pointeur ne prouve pas le confort au doigt. Le propriétaire doit pouvoir juger le plaisir de prendre une poignée, l’évidence des entrées, le rythme, la cohésion de la liasse et la fatigue après répétition.

La passation Unity décrit les API et événements nouveaux dans `HANDOFF.md`. Le prototype autonome précède cette future intégration ; il ne la remplace pas.
