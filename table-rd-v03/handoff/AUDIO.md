# Table de R&D V03 — Sons et retours provisoires

9 novembre 2026. La V03 distingue découverte du potentiel et activation choisie. Les sons/VFX accompagnent cette différence avant toute intégration Unity. Les synthèses reprises et leurs paramètres restent des essais de ressenti ; aucune écoute humaine validée n’est déclarée.

## Ce que chaque retour confirme

| Usage | Déclenchement | Sens et limite |
|---|---|---|
| Parent posé | Pose acceptée | Papier et contact, sans récompense de précision |
| Bouture prélevée | `HARVEST` enregistré | Une bouture réelle et son débit, aucun succès si budget épuisé |
| Essai engagé | `START` enregistré | Deux boutures consommées, tirage fixé ; distinct de la découverte |
| Loupe | `INSPECT` accepté | Approche stable de l’objet avant fiche |
| Charge | Maintien ou ouverture assistée | Attente neutre, sans information sur la classe cachée |
| Découverte | `REVEAL` accepté | Potentiels et capacité enfin connus, ponctuation de leur classe |
| Points parentaux | Gain inscrit après rare/exceptionnelle | Retour vers chacun des parents, une seule fois |
| Emplacement/aperçu | Consultation d’un point blanc ou choix provisoire | Information et comparaison, sans débit |
| Activation | `ACTIVATE` accepté | Potentiel déjà hérité choisi pour s’exprimer, point débité et emplacement occupé |
| Conservation | `KEEP` accepté | Nom/signature et lignée conservés, distinct de l’activation |
| Refus | Commande rejetée | Cause lisible, aucune mutation, signal discret limité |

La révélation ne signifie pas que tous les potentiels sont actifs. L’activation ne signifie pas nouvelle hérédité ou nouveau lot. Le son d’activation doit confirmer ce choix, sans faire croire à une récolte, une bouture gratuite ou une hausse rétroactive de qualité.

Les points blancs correspondent aux trois ou cinq emplacements disponibles. Leur nombre et leurs positions restent des réglages V03. Le journal et ses filtres relèvent de la consultation : aucune recherche de texte ou navigation généalogique ne crée de point.

## Maintien de révélation

La charge dure environ 1,5 seconde cumulée. Relâcher arrête la montée sonore et met le geste en pause sans retirer l’avancement de la séquence. Clavier et assistance conduisent au même résultat. Aucun timing parfait, bonus d’adresse ou nouveau tirage n’est ajouté.

`setRevealCharge(progress, active)` module deux oscillateurs neutres : hauteur de base de 128 à 266 Hz, seconde voix au rapport 1,5 ; filtre de 620 à 1520 Hz. Les étapes `charge-step` ponctuent la charge sans annoncer la rareté. Le mode discret atténue cette couche. Pause, volume nul, désactivation du son, révélation ou destruction du système arrêtent les voix. Le fondu habituel de 65 ms est raccourci à la révélation.

Ces paramètres ne constituent pas un choix de mixage final. Les ponctuations ordinaire/rare/exceptionnelle et le retour de points suivent la transaction acceptée, pas l’avancement visuel de la charge. Mauve pour rare et doré pour exceptionnel restent des codes de présentation, distincts de la qualité du lot.

## Synthèses présentes

Les événements WebAudio sont `paper`, `select`, `start`, `ready`, `harvest`, `point`, `upgrade`, `reveal-common`, `reveal-rare`, `reveal-exceptional`, `sign`, `refuse` et `charge-step`, avec un contact simple et un alias de révélation ordinaire. Le nom technique `upgrade` est réutilisé pour l’activation V03 ; il n’implique plus les anciennes voies de bonus probabilistes.

Ils combinent bruits filtrés, impulsions et tons courts. Aucun sample tiers n’est utilisé. La révélation ordinaire emploie deux tons, la rare trois, l’exceptionnelle quatre en mode expressif ; enveloppes principales respectives de 0,58, 0,9 et 1,15 seconde avec étagement. Ces durées ne limitent pas la lecture ou l’examen de l’objet.

Le volume initial de l’interface est de 45 %. Un compresseur réduit les écarts ; un même événement répété dans les 75 ms est ignoré. Le son nécessite une activation explicite et garde un équivalent visuel. Expressif/Discret et volume comparent le même état sans modifier résultat, patrimoine, points, ressources ou qualité.

## Essai rapide et rejeux

La session de test est séparée. Les boutons de rejeu répètent les sons/VFX d’une découverte déjà révélée ou d’une activation déjà acquise, sans commande métier ni gain. Ils permettent de comparer l’intensité sur le même état.

Préparer une exceptionnelle peut construire un relais Y × X, révélé et conservé par les règles ordinaires avant le descendant final. Ses ressources et points restent dans le journal de test. Ce montage est annoncé ; il n’est pas une fréquence de découverte normale. La cible finale attend le maintien ou l’assistance avant son retour de découverte.

## Validation à poursuivre

Les preuves d’écoute et de navigateur V02 ne valent pas pour V03. Les résultats des contrôles de la version finale seront ajoutés séparément ; aucune revue navigateur V03, écoute humaine ou manipulation sur téléphone physique n’est déclarée ici à ce stade.

À juger : distinction entre potentiel découvert et potentiel activé, lisibilité des points parentaux, poids relatif d’une rare/exceptionnelle, répétition des activations, arrêt de charge lors des interruptions et fatigue sonore. Tester les mêmes scènes en expressif/discret, avec réduction des mouvements et sans son. Une animation interrompue ne doit pas laisser une voix de charge active.

Les synthèses ne remplacent pas une sélection artistique. Une future banque ou prise devra garder licence, original, variantes et verdict. Le portage et le mixage Unity sont une étape ultérieure ; l’interface publique du système de retours du projet peut servir cette intégration sans modifier les sources fournisseur.
