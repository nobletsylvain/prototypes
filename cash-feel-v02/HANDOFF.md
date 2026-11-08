# Papier & liasses V02 — passation vers Unity

9 novembre 2026. Démo autonome du geste **prendre une poignée, la porter et la déposer dans une machine**. Elle propose deux circuits pour l’essai et précède toute intégration au jeu.

[Essayer la V02](https://nobletsylvain.github.io/prototypes/cash-feel-v02/) · [Carnet](documentation.html) · [V01 conservée](../cash-feel-v01/). L’état de publication et les résultats réellement exécutés sont dans [SESSION.md](SESSION.md).

## Décisions, demande reçue et propositions

| Statut | Portée |
|---|---|
| Retour du propriétaire, 9 novembre | Le but est de prendre des poignées de billets et de les mettre dans la trieuse et la compteuse. Le geste direct devient le centre de l’essai. |
| Deux configurations demandées pour l’essai | Trieuse puis compteuse distinctes ; machine combinée qui trie et compte. Le mode séparé démarre par défaut. Cela ne tranche pas l’équipement final du jeu. |
| Choix conservés du 8 novembre | Compteuse énergique et rythmée ; compression de la pile sous la bande puis petit relâchement. Les retours visuels marqués déjà décidés restent acquis. |
| Règles exactes conservées | Identités, coupures, valeurs, main de 100 objets, liasses homogènes de 100 billets, cases par forme, refus sans mutation. |
| Propositions V02 | Sélection locale de 24 billets au plus, complément par maintien, seuil de déplacement, zones de dépôt tolérantes, suivi de main, implantation des deux circuits et commandes d’aide. |
| Paramètres à éprouver | Maintien de 350 ms puis au plus 16 billets toutes les 150 ms ; déplacement de plus de 8 pixels ; 18 ou 26 passages/s ; compression de 650 ms et détente de 250 ms. |
| Hors périmètre | Commerce complet, blanchiment, réseau, film plastique, nouveaux risques, réassort de bandes et intégration Unity. |

## Séparer le modèle, le geste et le rendu

| Module | Responsabilité | Reprise Unity proposée |
|---|---|---|
| `ledger.mjs` | Billets exacts, états des deux circuits, capacités, transferts et refus atomiques | Modèle métier raccordé aux identités existantes du jeu. Aucun nombre de feuilles dessinées ne définit le contenu. |
| `gesture.mjs` | Sélection de billets proches, choix de l’entrée et validité d’une pose | Fonctions de sélection déterministes testables sans scène. Les unités écran et monde doivent être explicites. |
| `scene.mjs` | Rayons, geste pointeur, poignée visible, parcours des billets, machines, compression et VFX | Interaction et enfants de rendu ; aucune création ou conversion monétaire. |
| `app.mjs` | Commandes, validation du registre, coordination des événements, circuit et langue | Contrôleur qui demande le transfert puis émet les retours seulement après acceptation. |
| `audio.mjs` | Synthèses provisoires reprises à l’identique de V01 | Sons candidats ; raccordement aux événements acceptés et écoute distincte de la validation logicielle. |
| `texts.json` | Textes français et anglais | Tables de texte du jeu, selon leur organisation actuelle lors de l’intégration. |

Les synthèses, atlas et bibliothèque sont décrits avec leurs empreintes dans [ASSETS.md](ASSETS.md). Aucune lecture ou modification des sources fournisseur FEEL n’est requise par cette démo.

## États exacts des deux circuits

| Emplacement | Rôle |
|---|---|
| `pouch` | Contenant de départ du lot. |
| `table` | Billets et liasses posés, accessibles à la prise. |
| `hand` | Objets réellement tenus, au plus 100. Une liasse fermée compte pour un objet. |
| `sortInput` | Entrée de la trieuse séparée : billets libres mélangés admis. |
| `sorted10`, `sorted20` | Sorties de la trieuse : billets libres séparés par coupure, sans cerclage. |
| `input` | Entrée de la compteuse ; dans le circuit séparé, une seule coupure y circule à la fois. |
| `output` | Billets comptés, piles ouvertes et liasses complètes à reprendre. |
| `slot0` à `slot4` | Cases de rangement, affectation persistante par forme. |

Circuit séparé : `table → hand → sortInput → sorted10/20 → hand → input → output → hand/slot`.

Circuit combiné : `table → hand → input → output → hand/slot`. L’admission accepte une poignée mélangée ; la sortie reste organisée par coupure.

Un billet en animation appartient toujours à un emplacement exact. Les identités des billets au passage sont celles de l’entrée ; une animation n’accorde aucun billet supplémentaire.

## API monétaire V02

- `new CashLedger(mode, circuit)` : `mode` vaut `small` ou `large` ; `circuit` vaut `separate` ou `combined`. Le constructeur garde `combined` comme valeur de compatibilité, mais le contrôleur V02 demande explicitement `separate` au démarrage.
- `feedSorter()` : transfère les billets libres tenus vers `sortInput`. Une liasse doit d’abord être ouverte.
- `tickSorter()` : déplace exactement un billet vers `sorted10` ou `sorted20`, selon sa coupure immuable.
- `takeSorted(denomination, limit = 100)` : reprend une portion de la sortie choisie, limitée par la demande et par la place en main.
- `feedCounter()` : exige des billets libres d’une seule coupure. Une poignée mélangée ou une coupure incompatible avec l’entrée en cours est refusée sans mutation.
- `feed()` : admission combinée historique ; pour un registre `separate`, délègue à `feedCounter()`.
- `tickMachine()` : un billet passe de `input` à `output`.
- `bind(denomination)` : réunit 100 identités déjà présentes en sortie, d’une même coupure, dans une liasse. Le cerclage reste automatique.
- `pickup`, `dropHand`, `takeOutput`, `openHand`, `store`, `withdraw`, `clearSlot` : conservent les contrats d’identité et de capacité de V01.
- `verify()` : audit exact des identités, valeurs, contenus, coupures et capacités ; il ne mesure pas le plaisir ou la stabilité visuelle.

Changer de circuit est un **redémarrage explicite du lot**, par création d’un nouveau registre. Ne pas convertir à la volée des billets en transit d’un circuit vers l’autre. Une interruption du geste, à l’inverse, ne redémarre pas le lot et ne vide pas la main.

## Contrat du geste direct

1. Au contact d’un billet sur la table, sélectionner jusqu’à 24 billets proches, avec identités uniques, ordre stable et capacité disponible. Le rayon de voisinage de cette scène est une proposition de présentation.
2. Un maintien immobile complète la poignée après 350 ms, puis par groupes de 16 au plus toutes les 150 ms, sans dépasser 100 objets. Le déplacement supérieur à 8 pixels arrête le complément.
3. Projeter le pointeur vers le plan de portée, puis faire suivre la poignée visible avec un léger retard. Le rendu pointe vers les objets de `hand` ; il ne copie pas leur contenu.
4. Au relâchement, demander le transfert vers l’entrée ciblée. Donner priorité à la zone d’admission pour que les billets tenus ne masquent pas la machine. La zone de dépôt doit couvrir le bouton visible complet, pas seulement son point d’ancrage ; vérifier les rectangles réels après la mise en page.
5. Sur une zone valide de table, demander `dropHand()` et conserver la position de pose comme information de rendu. Hors zone, ou en cas d’annulation, conserver la poignée en main.

Un clic bref peut laisser la poignée en main ; un appui suivant sur une entrée permet de la déposer. Les commandes d’aide sont un accès complémentaire au même modèle. Le mode Regarder déplace la caméra, jamais les objets.

L’interruption de capture du pointeur, l’annulation tactile, la perte de focus et l’onglet masqué doivent arrêter le complément et le suivi, sans dépôt implicite ni perte d’argent. Le prochain geste doit repartir proprement.

## Interface de scène et événements

`CashScene(canvas, onSelect, { circuit })` expose notamment :

- `setCircuit(circuit)` : disposition et visibilité des machines ; annule le geste de présentation en cours.
- `setLabels(labels)` : libellés de scène fournis par les textes localisés.
- `getHotspots()` : entrées projetées avec `x`, `y`, `visible` et zone de tolérance ; coordonnées relatives au canvas.
- `getInteractionState()` : `dragging` et `hoverTarget`, pour l’indication de dépôt.
- `sync(ledger, event)` : synchronise une représentation avec l’état exact déjà accepté.
- `reset`, `resetCamera`, `setEffects`, `step` : remise à zéro de présentation, caméra, comparaison visuelle et images.

| Action remontée | Données | Commande métier attendue |
|---|---|---|
| `handful` | Tableau d’identités `ids` | Prise atomique de ces objets. |
| `sorter`, `counter`, `combined` | Entrée ciblée | Admission appropriée au circuit. |
| `sorted` | `denomination` | Reprise de la pile triée choisie. |
| `output` | Identité éventuelle | Reprise des billets ou de la liasse de sortie. |
| `drop` | Position `x`, `z` | Dépôt de la main ; position destinée au rendu. |
| `slot` | Index de case | Rangement ou reprise selon la commande validée. |
| `hover-target` | Cible ou `null` | Indication visuelle uniquement, aucune mutation monétaire. |

Les coordonnées ne sont jamais une autorisation de créer du contenu. Le contrôleur vérifie le transfert, puis raccorde l’animation et le son aux identités déplacées.

## Événements, sons et matière

| Événement accepté | Retour proposé | Registre audio |
|---|---|---|
| Prise ou complément | Froissement groupé ; éviter un son par feuille de la poignée. | SFX-020, SFX-021 |
| Admission dans une machine | Papier attiré vers l’entrée, claquement net. | SFX-024 |
| Passage réel d’un billet | Claquement synchronisé au transfert, variation limitée ; pas de boucle machine vide. | SFX-024 |
| Pile de 100 complète | Tassement, tension de bande, fermeture à 650 ms, détente de 250 ms. | SFX-025 |
| Pose, reprise ou ouverture | Papier libre plus souple, liasse plus solidaire et contact plus dense. | SFX-022, SFX-023 |
| Rangement partiel ou complet | Contact groupé lié au contenu réellement déplacé. | SFX-026, SFX-010 |
| Refus | Cause lisible, signal bref ; aucune réussite ni mutation. | INF-003 |

Les sons V01 sont réemployés à l’identique, pas déclarés finaux. Aucun enregistrement n’est extrait des captures CCS. Le montant ne sert jamais de masse ; aucun réassort fréquent de bandes n’est introduit.

## Échelle et invariants de reprise

Les billets mesurent 140 × 65 mm dans le rendu. Les UV recto/verso et leur orientation sont documentés dans `ASSETS.md`. Convertir explicitement les unités en mètres dans Unity ; ne pas faire du nombre d’euros, de l’épaisseur artistique ou de la déformation visuelle une règle physique.

La compression et les ressorts de 6 à 10 mm agissent sur les enfants de rendu. Les colliders et les contenus suivent les règles du jeu. Les trajectoires guidées ne prouvent pas une simulation complète de papier.

Les vérifications exactes restent bloquantes : somme, identités, coupures, contenus, main de 100 objets, liasses de 100 billets homogènes, cases de 100 billets libres ou 10 liasses, affectation persistante, dépôts partiels et refus sans mutation. La séparation des cases porte sur la forme, pas sur une nouvelle obligation générale de coupure unique.

Les liasses doivent rester utilisables comme les billets, notamment au paiement. Cette démo ne reconstruit pas le commerce pour vérifier ce principe.

## Recette avant une intégration

Vérifier les deux circuits sur petit et gros lots ; reprise des sorties triées ; refus d’une poignée mélangée par la compteuse ; conflit de coupure en entrée ; prise additive et main pleine ; sortie partielle ; rangement, retrait et ouverture ; interruptions du geste ; redémarrage pendant un passage ; invariance avec et sans retours.

Observer séparément le suivi de la poignée, la lisibilité de l’entrée, les ratés récupérables, les chutes, les contacts et les performances. Ces mesures ne deviennent pas des seuils bloquants arbitraires. Le confort tactile, l’écoute et le plaisir de répétition nécessitent l’essai du propriétaire.

La future carte Unity part de l’état actuel du projet et raccorde les identités existantes avant le rendu. Elle suit sa revue, sa régression complète sur l’exécutable final, son contrôle de livraison et son essai propriétaire. **La présente passation ne constitue ni une intégration, ni une validation Unity, ni un essai humain.**
