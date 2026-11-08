# Papier & liasses V03 — réserves intégrées

[Essayer la V03](https://nobletsylvain.github.io/prototypes/cash-feel-v03/) · [Carnet d’essai](documentation.html) · [V02 conservée](../cash-feel-v02/) · [V01 conservée](../cash-feel-v01/)

Le tri et le comptage font désormais partie de la trieuse. Chaque coupure s’accumule dans sa réserve **à l’intérieur de la machine**. Les billets libres restent disponibles pour une reprise ou pour compléter le stock à la livraison suivante. Quand le seuil choisi est atteint, la pile est ceinturée dans la machine ; seule la liasse terminée tombe à l’extérieur.

La prise directe est conservée : appuyez sur le tas, maintenez pour compléter la poignée, glissez vers l’entrée puis relâchez. Vue FPS, compteuse énergique, compression puis léger relâchement, sons provisoires et retours visuels actifs dès le premier appui.

## Essai proposé

1. Versez la première livraison du petit lot : 50 billets de 20 € et 10 de 10 €.
2. Portez les poignées dans la trieuse. Les réserves arrivent à 50 et 10 ; aucune liasse ne sort au seuil par défaut de 100.
3. Choisissez une quantité et reprenez du 10 ou du 20 €, par le bouton correspondant ou directement dans la réserve. Redéposez la poignée si vous voulez retrouver ensuite le seuil de 100 dans ce petit lot.
4. Versez la seconde livraison. À 100 billets de 20 €, la liasse se comprime, se ferme, se relâche puis tombe en sortie. Les 20 billets de 10 € restent à l’intérieur.
5. Reprenez et rangez la liasse. Vous pouvez aussi garder la réserve en billets en décochant « Former les liasses ».

La pause empêche les **nouvelles** formations ; une liasse déjà en cours de cerclage finit son cycle. Les réserves restent entre deux livraisons dans la même page ouverte. Aucune sauvegarde après rechargement n’est promise.

## Décisions et propositions

La machine intégrée, la conservation par coupure, la reprise de liquide et la sortie après formation sont la direction demandée par le propriétaire le 9 novembre. La taille souhaitée est réglable, avec **100 billets par défaut**. La compteuse énergique et le tassement suivi du petit relâchement restent acquis.

Les tailles d’essai **25 / 50 / 100**, la pause de formation, les prises de **1 / 10 / 25 / 100** (10 au départ), les livraisons de 60, l’implantation et les durées restent des propositions de cette démo. Elles ne constituent pas à elles seules les réglages définitifs du jeu. V03 présente une machine intégrée ; les deux circuits expérimentaux de V02 restent accessibles dans leur version conservée.

Chaque billet garde son identité, sa coupure et sa valeur. Une liasse garde le nombre et les identités retenus à sa formation, même si le réglage change ensuite. Main de 100 objets, cases de 100 billets libres ou de 10 liasses, formes mémorisées et refus sans mutation sont conservés. Le plafond de 10 liasses est aussi appliqué aux petites tailles d’essai de 25 et 50, sans augmenter le nombre d’objets par case.

<!-- QA_STATUS -->
**71 contrôles logiciels réussis, zéro échec**, dans la suite locale et sa copie publiable : 17 registre, 12 machine intégrée, 13 contrôleur, 18 gestes et animation, 11 audio. Un premier passage à 70/1 a révélé une mauvaise origine temporelle du test de cerclage ; le test a été corrigé, sans assouplir le comportement de la machine. La preuve initiale est conservée.

La revue WebGL réelle de V03, sa publication et l’accès final au lien restent à confirmer. Aucun résultat navigateur de V02 n’est attribué à cette version. Le rapport logiciel final est disponible dans [le relevé des contrôles](verification/all-tests.tap).
<!-- /QA_STATUS -->

Aucun essai humain, écoute validée, téléphone physique ou résultat Unity revendiqué à ce stade. [Passation Unity](HANDOFF.md) · [Assets et provenance](ASSETS.md) · [Journal de session](SESSION.md). Le prototype autonome précède l’intégration au jeu.
