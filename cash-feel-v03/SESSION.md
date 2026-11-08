# Papier & liasses V03 — journal de session

9 novembre 2026. Nouvelle version indépendante consacrée aux réserves intégrées à la trieuse. [Essai V03](https://nobletsylvain.github.io/prototypes/cash-feel-v03/) · [Carnet](documentation.html) · [V02 conservée](../cash-feel-v02/).

## Direction donnée par le propriétaire

Le propriétaire précise que le tri et le comptage doivent se faire dans une partie intégrante de la trieuse. Les billets restent dans la machine jusqu’à atteindre la taille souhaitée, 100 par défaut ; la liasse est alors faite puis tombe à l’extérieur. Cela permet de reprendre du liquide d’une coupure particulière ou d’attendre une autre livraison sans vider les réserves.

Cette direction remplace, pour la V03, la comparaison des circuits séparé et combiné de V02. La V02 reste intacte comme essai précédent. La capture fournie sert à comprendre les compartiments intégrés et la sortie des liasses ; elle n’est ni copiée comme texture, ni embarquée dans la publication.

Les deux choix de ressenti ne sont pas rouverts : compteuse énergique et rythmée ; compression puis petit relâchement de la liasse.

## Comportement implémenté

- Une entrée reçoit les poignées, avec le geste direct de V02.
- Chaque passage trie et compte un billet réel vers `reserve10` ou `reserve20`, à l’intérieur du bâti.
- La réserve expose son nombre et sa valeur ; une reprise porte uniquement sur la coupure demandée et respecte la place restante en main.
- À la taille choisie, `binding10` ou `binding20` conserve les identités pendant la formation. Une liasse en cerclage n’est pas une sortie reprenable.
- Après 650 ms de compression et 250 ms de relâchement, l’éjection transfère la liasse terminée vers la sortie ; sa présentation glisse puis tombe en environ 600 ms.
- Les billets libres restant sous le seuil restent en machine. Le passage suivant ajoute à la réserve existante dans la même page ouverte.
- « Former les liasses » désactivé suspend les nouvelles formations. Le cycle déjà engagé se termine. Réactiver autorise la formation des quantités devenues suffisantes.
- Une taille changée concerne les prochaines formations ; une liasse existante conserve son contenu exact.

Les commandes d’aide et de rangement restent disponibles. V03 n’a plus de sélecteur de circuits ; les liens vers V01 et V02 servent à retrouver les essais antérieurs.

## Paramètres proposés pour l’essai

| Paramètre | Proposition V03 |
|---|---|
| Taille de liasse | 100 au départ ; comparaison 25, 50 ou 100. Le principe de taille souhaitée vient de la demande ; les deux petites tailles sont des valeurs d’essai. |
| Formation automatique | Active au départ ; pause disponible pour conserver les billets libres. |
| Quantité reprise | 1, 10, 25 ou 100 ; 10 au départ, limitée par la réserve et la place en main. |
| Livraison | Jusqu’à 50 billets de 20 € et 10 de 10 € depuis le lot déjà existant. |
| Petit lot | 120 billets, 2 200 €, deux arrivées de 60. |
| Gros lot | 1 200 billets, 22 000 €, vingt arrivées de 60. |
| Mouvement de liasse | 900 ms de compression/relâchement dans la machine ; environ 600 ms de glissement et chute à l’éjection. |
| Cadence | 18 ou 26 billets/seconde ; volume et retours renforcés comparables. |

Une arrivée déplace des billets déjà identifiés de la pochette à la table ; elle ne crée pas de valeur. L’attente entre arrivées est un état de la session ouverte, pas une promesse de persistance après rechargement. Les variations de contact restent des phénomènes de présentation à mesurer, sans déduire de capacité monétaire des volumes dessinés.

## Règles et sources

Le brief « Prototype – Argent liquide et liasses » et le cadre « Prototypes – Trois sessions de ressenti » ont été relus, puis complétés par cette demande du 9 novembre. Les règles d’identité, de coupure, de valeur, de main et de mémoire de case restent exactes. La taille par défaut reste 100 ; les tailles variables d’essai sont explicites et chaque liasse retient son propre contenu.

Les deux atlas, la bibliothèque de rendu et les sons candidats proviennent des lots précédents. Leur vérification et leur provenance sont dans [ASSETS.md](ASSETS.md). Aucun nouvel extrait sonore de la référence n’est revendiqué. Les sons restent provisoires ; aucune sélection finale d’écoute ne découle d’un contrôle logiciel.

## Vérifications

<!-- QA_TOTAL -->
**71 réussites, 0 échec**, dans la suite locale et sa copie publiable : **17 registre, 12 machine intégrée, 13 contrôleur, 18 gestes et animation, 11 audio**. Les contrôles de geste exercent les événements pointeur avec le registre et les phases de rendu avec une scène simulée ; ils ne remplacent pas un navigateur WebGL réel. [Relevé logiciel final](verification/all-tests.tap).

Le premier passage était à **70 réussites, 1 échec** : le test de délai de cerclage prenait son origine après le passage de toute l’entrée, au lieu du début effectif du cerclage. Le test a été ancré sur cet événement ; le comportement de la machine n’a pas été assoupli. La preuve initiale est conservée séparément.
<!-- /QA_TOTAL -->

<!-- PUBLICATION_STATUS -->
Publication V03 en préparation dans `nobletsylvain/prototypes`, dossier `cash-feel-v03/`. Le lien annoncé est une destination prévue ; accès et déploiement restent à confirmer. V01, V02 et les autres prototypes sont conservés.
<!-- /PUBLICATION_STATUS -->

<!-- BROWSER_STATUS -->
La revue réelle de V03 reste à effectuer. Vérifier la réserve conservée après la première arrivée, la reprise de liquide par coupure, l’ajout de la seconde arrivée, la formation intérieure puis la chute extérieure, le reliquat libre de 10 €, la pause et le changement de seuil. Aucun résultat navigateur de V01 ou V02 n’est transféré à V03.
<!-- /BROWSER_STATUS -->

## Réception et passation

Aucun essai humain, aucune écoute validée, aucun téléphone physique et aucun résultat Unity revendiqués à ce stade. Le propriétaire doit juger la lisibilité de la réserve, le plaisir de reprendre le liquide, la continuité entre livraisons, le rythme et la chute des liasses.

[HANDOFF.md](HANDOFF.md) distingue le registre exact, les réserves, le cerclage verrouillé, l’éjection acceptée et les retours visuels et sonores. Le prototype autonome précède l’intégration au jeu ; aucun build Unity n’est livré par cette V03.
