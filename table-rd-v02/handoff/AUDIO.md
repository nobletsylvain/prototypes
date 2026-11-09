# Table de R&D V02.1 — Charge de révélation et sons provisoires

9 novembre 2026. Synthèses de travail pour une démo web autonome. Les retours sont renforcés à la demande du propriétaire ; écoute, niveau et fatigue en répétition restent à juger. Aucune prise finale ni intégration Unity n’est déclarée.

## Ajout : maintenir pour révéler

Le maintien d’environ 1,5 seconde prépare la découverte par une charge sonore neutre. Elle ne révèle pas le palier et ne tire aucun résultat. Relâcher met en pause le geste et arrête la montée ; reprendre poursuit l’avancement de la séquence. Le contrôle assisté et le clavier donnent accès à la même conclusion.

La ponctuation ordinaire, rare ou exceptionnelle et le retour de points ne partent qu’après une commande `REVEAL` acceptée. Une interruption arrête la charge. L’API `setRevealCharge(progress, active)` module deux oscillateurs neutres : la hauteur de base monte de 128 à 266 Hz, avec une seconde voix à un rapport de 1,5 ; le filtre s’ouvre de 620 à 1520 Hz. Le mode discret atténue cette couche. Les étapes `charge-step` donnent une ponctuation sans annoncer le palier final.

Pause, volume nul, son désactivé, révélation ou destruction du système arrêtent les voix de charge. Le fondu habituel est de 65 ms, raccourci à la révélation. Ces réglages sont provisoires ; les contrôles techniques et l’écoute du maintien restent distincts.

Le mode test permet de forcer un palier pour comparer rapidement ces retours. Une réussite forcée est signalée comme test et ne mesure pas sa fréquence normale. Les points de cette séance restent dans son bac à sable séparé.

Après découverte ou achat, les boutons de rejeu du test répètent uniquement leurs sons/VFX. Ils ne relancent pas une transaction et ne donnent aucun point. Ce sont des commandes de comparaison du ressenti.

Sur la V02.1 publiée, les commandes de rejeu de découverte et d’amélioration ont été actionnées dans le navigateur : les compteurs sont restés à 0 point disponible, 1 gagné, 1 dépensé après l’achat de Convergence pour Aube. Une révélation rare par maintien et une exceptionnelle par assistance ont aussi été parcourues. Ces observations valident leur raccordement au parcours et l’absence de gain par rejeu, sans constituer une écoute humaine ou une appréciation du mixage.

## Événements à distinguer

| Usage | Déclenchement réel | Limite |
|---|---|---|
| Fiche parentale | Pose acceptée et calage | Pas de récompense de précision |
| Bouture | Prélèvement physique accepté | Pas de réussite si budget épuisé |
| Engagement | Deux boutures consommées et essai enregistré | Pas de découverte avant résultat |
| Loupe et point blanc | Approche ou information ouverte | Pas de tirage ni de point produit par le geste |
| Charge de révélation | Maintien ou commande assistée | Montée neutre, pause et arrêt sans gain ni nouveau tirage |
| Révélation | Commande acceptée après examen et charge | Palier obtenu perceptible sans masquer le spécimen |
| Recherche parentale | Points inscrits après descendant rare/exceptionnel | Un retour par attribution, pas au rechargement |
| Amélioration exclusive | Achat validé | Confirmation distincte du refus/exclusion |
| Conservation | Nom/signature enregistrés | Distincte de la découverte |
| Refus | Action impossible sans mutation | Cause visible, répétition limitée |

Le code WebAudio de synthèse et ses paramètres sont les sources des sons provisoires ; aucun sample tiers n’est utilisé. Ce tableau décrit les responsabilités de présentation, pas un nombre de prises enregistrées.

## Catalogue V02 conservé

Les événements du synthétiseur sont `paper`, `select`, `start`, `ready`, `harvest`, `point`, `upgrade`, `reveal-common`, `reveal-rare`, `reveal-exceptional`, `sign` et `refuse`. Ils associent bruits filtrés, impulsions et tons à enveloppe courte. `reveal` conserve un alias ordinaire et le contact simple reste disponible.

Ce catalogue précède l’ajout du contrôle de charge. Pour l’ajout actuel, 11 contrôles audio réussissent avec un contexte simulé ; ils couvrent le fonctionnement des voix et ponctuations, sans attester d’une écoute ou du comportement dans le navigateur final.

La révélation ordinaire utilise deux tons, la rare trois et l’exceptionnelle quatre en mode expressif. Les enveloppes principales durent respectivement 0,58, 0,9 et 1,15 seconde, avec un léger étagement ; ce sont des réglages provisoires, pas des durées imposées de lecture. Le mode discret garde une ponctuation atténuée avec moins de couches. Le son ne pilote pas le résultat.

Le volume initial appliqué par l’interface est 45 %. Un compresseur limite les écarts ; un événement identique répété dans les 75 ms est ignoré. Ces paramètres servent le ressenti de V02, sans validation d’écoute. Les sons restent activés par un geste explicite de l’utilisateur et conservent leur équivalent visuel.

## Comparaison limitée

Expressif et discret comparent les retours sur le même état. Le volume est indépendant. Son, VFX et précision du geste ne changent ni tirage, ni points, ni ressources, ni qualité du lot. L’activation sonore reste explicite. Respecter la réduction des mouvements et garder les informations compréhensibles sans son.

## À écouter

Vérifier les contacts, la distinction engagement/découverte/conservation, le poids d’une découverte rare et son retour vers les parents. La montée sonore doit rester courte, répétable et laisser regarder l’objet. Tester téléphone, casque, révélations successives et interruptions. Une animation coupée ne doit pas laisser une boucle active.

Les synthèses ne remplacent pas une sélection artistique. Toute future banque ou prise devra conserver licence, original, variantes et verdict. L’intégration et le mixage Unity restent séparés.
