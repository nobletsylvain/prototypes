# Table de R&D V02 — Retours sonores provisoires

9 novembre 2026. Synthèses de travail pour une démo web autonome. Les retours sont renforcés à la demande du propriétaire ; écoute, niveau et fatigue en répétition restent à juger. Aucune prise finale ni intégration Unity n’est déclarée.

## Événements à distinguer

| Usage | Déclenchement réel | Limite |
|---|---|---|
| Fiche parentale | Pose acceptée et calage | Pas de récompense de précision |
| Bouture | Prélèvement physique accepté | Pas de réussite si budget épuisé |
| Engagement | Deux boutures consommées et essai enregistré | Pas de découverte avant résultat |
| Loupe et point blanc | Approche ou information ouverte | Pas de tirage ni de point produit par le geste |
| Révélation | Fiche après examen | Palier obtenu perceptible sans masquer le spécimen |
| Recherche parentale | Points inscrits après descendant rare/exceptionnel | Un retour par attribution, pas au rechargement |
| Amélioration exclusive | Achat validé | Confirmation distincte du refus/exclusion |
| Conservation | Nom/signature enregistrés | Distincte de la découverte |
| Refus | Action impossible sans mutation | Cause visible, répétition limitée |

Le code WebAudio de synthèse et ses paramètres sont les sources des sons provisoires ; aucun sample tiers n’est utilisé. Ce tableau décrit les responsabilités de présentation, pas un nombre de prises enregistrées.

## Catalogue exécuté

Les événements du synthétiseur sont `paper`, `select`, `start`, `ready`, `harvest`, `point`, `upgrade`, `reveal-common`, `reveal-rare`, `reveal-exceptional`, `sign` et `refuse`. Ils associent bruits filtrés, impulsions et tons à enveloppe courte. `reveal` conserve un alias ordinaire et le contact simple reste disponible.

La révélation ordinaire utilise deux tons, la rare trois et l’exceptionnelle quatre en mode expressif. Les enveloppes principales durent respectivement 0,58, 0,9 et 1,15 seconde, avec un léger étagement ; ce sont des réglages provisoires, pas des durées imposées de lecture. Le mode discret garde une ponctuation atténuée avec moins de couches. Le son ne pilote pas le résultat.

Le volume initial appliqué par l’interface est 45 %. Un compresseur limite les écarts ; un événement identique répété dans les 75 ms est ignoré. Ces paramètres servent le ressenti de V02, sans validation d’écoute. Les sons restent activés par un geste explicite de l’utilisateur et conservent leur équivalent visuel.

## Comparaison limitée

Expressif et discret comparent les retours sur le même état. Le volume est indépendant. Son, VFX et précision du geste ne changent ni tirage, ni points, ni ressources, ni qualité du lot. L’activation sonore reste explicite. Respecter la réduction des mouvements et garder les informations compréhensibles sans son.

## À écouter

Vérifier les contacts, la distinction engagement/découverte/conservation, le poids d’une découverte rare et son retour vers les parents. La montée sonore doit rester courte, répétable et laisser regarder l’objet. Tester téléphone, casque, révélations successives et interruptions. Une animation coupée ne doit pas laisser une boucle active.

Les synthèses ne remplacent pas une sélection artistique. Toute future banque ou prise devra conserver licence, original, variantes et verdict. L’intégration et le mixage Unity restent séparés.
