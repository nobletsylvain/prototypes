# Papier & liasses V03 — passation vers Unity

9 novembre 2026. La trieuse reçoit les poignées, trie et compte chaque billet, puis conserve les réserves par coupure dans son corps. Une liasse ne rejoint la sortie extérieure qu’après sa formation.

[Essai V03](https://nobletsylvain.github.io/prototypes/cash-feel-v03/) · [Carnet](documentation.html) · [Journal et résultats](SESSION.md) · [V02 conservée](../cash-feel-v02/).

## Ce qui est décidé et ce qui est proposé

| Statut | Portée |
|---|---|
| Correction du propriétaire, 9 novembre | Tri et comptage font partie intégrante de la trieuse. Les billets triés restent dedans, disponibles pour un besoin de liquide ou une livraison ultérieure. La liasse se forme lorsque la taille souhaitée est atteinte, 100 billets par défaut, puis tombe hors de la machine. |
| Choix de ressenti conservés | Compteuse énergique et rythmée ; compression de la pile, serrage de la bande puis léger relâchement. |
| Règles exactes conservées | Identité, coupure et valeur de chaque billet ; une seule coupure par liasse ; liasse fermée = un objet en main ; main de 100 objets ; refus sans mutation ; formes séparées et affectation mémorisée par case. |
| Remplacement dans V03 | Le choix de deux circuits V02 reste consultable dans sa version historique. V03 éprouve une machine intégrée et ses réserves internes. |
| Paramètres d’essai proposés | Tailles 25 et 50 en complément du défaut 100 ; retrait de 1, 10, 25 ou 100 billets de la coupure choisie ; commande de pause des nouvelles formations ; livraisons de 50 billets de 20 € et 10 billets de 10 €. |
| Rangement des petites liasses | Le plafond existant de dix liasses par case est appliqué aussi aux liasses de 25 ou 50 dans cette démo. C’est une généralisation proposée, pas un nouvel arbitrage définitif de capacité du jeu. |
| Mise en scène proposée | Corps de machine, baies visibles, compteurs, zones de prise, bandes, trajet de sortie et chute guidée. L’image fournie sert de référence fonctionnelle ; elle n’est ni une texture, ni un modèle repris. |

Le petit lot contient toujours 120 billets et 2 200 € : deux livraisons de 60 permettent d’observer l’attente. Sans retrait ni changement du seuil, la première laisse 50 billets de 20 € et 10 de 10 € dedans ; la seconde permet une liasse de 100 × 20 €, avec 20 billets de 10 € restant en réserve. Le gros lot contient 1 200 billets et 22 000 € ; son découpage en vingt livraisons de 60 reste un réglage d’essai.

## Modèle exact et états

| Emplacement | Contenu autorisé et rôle |
|---|---|
| `pouch` | Billets du lot pas encore livrés ; livrer déplace des identités existantes. |
| `table` | Billets libres et liasses posés, disponibles à la prise. |
| `hand` | Au plus 100 objets, dont les liasses solidaires. |
| `input` | Billets libres en attente de passage ; mélange de coupures accepté. |
| `reserve10`, `reserve20` | Billets triés et comptés, libres et conservés à l’intérieur, séparés par coupure. |
| `binding10`, `binding20` | Une liasse en formation au plus par coupure. Les identités sélectionnées sont verrouillées dans cet objet ; elles ne peuvent plus être retirées comme du liquide libre. |
| `output` | Liasses terminées et éjectées seulement. Aucun billet libre ne doit y apparaître. |
| `slot0` à `slot4` | Cases par forme : 100 billets libres ou 10 liasses ; reste en main en cas de dépôt partiel. |

Circuit normal :

`pouch → table → hand → input → reserve10/20 → binding10/20 → output → hand/slot`.

Retrait de liquide : `reserve10/20 → hand`, puis usage, pose, rangement ou réintroduction. Compter à nouveau un billet réintroduit constitue un nouveau passage, pas une nouvelle identité ou une valeur supplémentaire.

Les réserves persistent pendant l’attente, tant que l’essai n’est pas réinitialisé. Cette version ne fournit pas de sauvegarde durable entre fermetures/rechargements de la page. Un changement de petit/gros lot ou un redémarrage recrée explicitement un scénario neuf.

## API monétaire

| Appel | Contrat |
|---|---|
| `new CashLedger(mode = 'small')` | Scénario `small` ou `large`, circuit `integrated` immuable, seuil initial 100. |
| `dumpDelivery()` | Déplace jusqu’à 50 billets de 20 € et 10 de 10 € depuis la pochette vers la table. Ne crée rien. `dump()` reste disponible pour les scénarios de contrôle qui versent tout. |
| `pickup(ids)`, `dropHand()` | Prise atomique d’identités présentes sur la table ; pose de la main. |
| `feed()` | Déplace les billets libres tenus vers l’entrée, même mélangés. Refuse une liasse fermée sans la modifier. `feedSorter()` est un alias. |
| `tickMachine()` | Déplace exactement un billet de l’entrée vers sa réserve. |
| `takeReserve(cut, limit = 25)` | Prend la quantité disponible de la coupure demandée, limitée par la demande et la place en main. Les billets verrouillés en formation sont exclus. Le contrôleur passe la quantité choisie ; son défaut d’interface est 10. |
| `setBundleSize(size)` | Accepte 25, 50 ou 100 dans l’essai. Ne déplace aucun billet et ne forme rien par lui-même. |
| `bind(cut)` | Si la réserve contient le seuil et que sa baie est libre, réunit exactement ces identités dans une liasse interne. Sa taille est figée dans `bundleSize` et `noteCount`. |
| `eject(cut)` | Transfère la liasse de la baie de formation vers la sortie. Le contrôleur appelle cette commande seulement après la fin de la séquence de formation. |
| `takeOutput(id?)` | Prend un seul objet terminé, éventuellement celui désigné. Une liasse en formation n’est jamais accessible par cette commande. |
| `openHand()` | Restitue les identités d’origine en main, à leur nombre réellement enregistré, si la capacité permet l’ouverture. |
| `store`, `withdraw`, `clearSlot` | Conservent limites, dépôts partiels et mémoire de forme ; effacement seulement à vide. |
| `verify()`, `snapshot()` | Audit exact et copie de contrôle ; le seuil figure dans l’instantané. |

Les refus utiles incluent `reserve-empty`, `need-matching-notes`, `binding-busy`, `binding-empty`, `invalid-bundle-size`, `hand-full` et `open-bundle-first`. Tout refus conserve les contenus, associations, taille choisie et prochain identifiant de liasse.

## Formation, pause et éjection

Le contrôleur vérifie chaque coupure après les passages. Si la formation automatique est active, si la réserve atteint le seuil et si aucune liasse n’y est déjà en formation, il demande `bind(cut)`. Le registre verrouille les identités immédiatement ; le rendu montre ensuite le tassement, la bande et la légère détente.

Le délai proposé est de **900 ms de temps actif** : 650 ms de compression/serrage, puis 250 ms de détente. Le contrôleur conserve une échéance par coupure et ne demande `eject(cut)` qu’une fois cette échéance atteinte. Masquer l’onglet suspend le temps actif et les passages ; il ne provoque pas une éjection instantanée au retour. Les deux coupures peuvent former en parallèle ; de nouveaux billets peuvent continuer à rejoindre leur réserve.

La pause proposée empêche les **nouvelles formations**. Une liasse déjà engagée termine sa séquence puis sort ; la pause n’ouvre pas un objet en cours de serrage. Pendant la pause, tri et comptage continuent et le liquide libre reste accessible. Reprendre la formation permet de traiter les réserves atteignant le seuil.

Changer le seuil ne redimensionne aucune liasse existante, y compris en formation. Une liasse de 100 conserve ses 100 identités si le réglage passe à 25. Le nouveau seuil s’applique aux formations suivantes.

La chute après éjection est une présentation guidée. La liasse appartient déjà exactement à `output` pendant ce trajet ; elle n’existe pas en double dans la machine et sur la table. Un son de contact proposé suit le trajet, seulement si la liasse est encore en sortie.

## Geste direct et présentation

La prise locale, le maintien pour compléter et le glissement vers l’entrée sont conservés. Les paramètres hérités — jusqu’à 24 billets proches au premier contact, maintien de 350 ms puis compléments de 16 au plus toutes les 150 ms, déplacement supérieur à 8 pixels — restent des propositions.

Une prise dans une réserve passe par `takeReserve` avec la coupure choisie. L’interface de scène ne retire jamais un billet visuel pour en déduire le contenu : elle demande le transfert au modèle, puis synchronise les identités acceptées. Un dépôt valable sur la table conserve sa position de présentation ; un geste annulé ou hors surface garde la poignée en main.

Le mode Regarder sépare caméra et manipulation. L’entrée doit accepter tout le rectangle visible de sa cible, pas seulement un point. Les quantités, sommes et états de formation des réserves doivent rester lisibles sur écran étroit ; la visibilité d’une baie ne dispense pas de l’indication textuelle.

Modules à reprendre :

| Module | Reprise Unity proposée |
|---|---|
| `ledger.mjs` | Modèle métier exact branché sur les identités existantes du jeu. |
| `app.mjs` | Orchestration : commandes acceptées, seuil, pause, échéances, événements. |
| `gesture.mjs` et `scene.mjs` | Sélection, projection, poignée, machine, réserves, compression, éjection et contacts visuels. |
| `audio.mjs` | Candidats synthétiques à écouter puis raccorder aux événements retenus. |
| `texts.json` | Tables françaises et anglaises, hors code. |

Événements importants : `dump`, `pickup`, `feed`, `tick`, `reserve`, `target`, `bind`, `eject`, `output`, `drop`, `store`, `withdraw`, `open`. Ils sont émis après le transfert accepté. Le survol ne modifie aucun euro.

Les billets de rendu font 140 × 65 mm ; convertir explicitement en mètres dans Unity. Le montant ne devient pas une masse ni une pénalité de déplacement. Compression, ressorts et épaisseur artistique agissent sur le rendu ; les capacités et colliders suivent les contrats métier. Aucun réassort fréquent de bandes n’est ajouté.

## Contrôles et intégration future

Les 29 contrôles monétaires dédiés exécutés pendant cette préparation couvrent les invariants hérités et le nouveau circuit : attente entre livraisons, retrait choisi, retour des mêmes identités, seuils, verrouillage, formation simultanée, sortie réservée aux liasses, ouverture, main et cases, petits et gros lots complets. Le contrôleur doit en plus vérifier temporellement l’absence d’éjection avant l’échéance et la pause des nouvelles formations. Les résultats globaux et de navigateur sont consignés dans le journal ; ce document ne les anticipe pas.

À observer séparément : lisibilité des réserves, lecture du seuil, geste de retrait, compression interne, passage au dehors, chute et contact. Les trajectoires variables se mesurent ; elles ne deviennent pas des seuils de réussite arbitraires. Le confort sur téléphone physique, l’écoute et le plaisir nécessitent l’essai du propriétaire.

La future carte Unity part de l’état courant du jeu et raccorde d’abord les identités, puis les retours. Les liasses restent utilisables comme les billets, notamment pour payer ; la démo ne reconstruit pas le commerce. Cette passation ne lance aucun build ni intégration Unity. Les sources fournisseur FEEL restent exclues. **Aucun essai humain ou résultat Unity n’est revendiqué par la préparation V03.**
