# Table de R&D — V03, hériter puis activer

Une démo autonome d’**Au four, mon amour**, préparée le 9 novembre 2026 avant intégration Unity. Les croisements transmettent des possibilités ; les points permettent ensuite de choisir celles que la variété exprime.

[Ouvrir V03](https://nobletsylvain.github.io/prototypes/table-rd-v03/) · [Essai rapide V03](https://nobletsylvain.github.io/prototypes/table-rd-v03/?mode=test) · [V02 conservée](https://nobletsylvain.github.io/prototypes/table-rd-v02/)

## La boucle à essayer

Choisir deux parents → engager deux boutures → examiner l’objet sous la loupe → révéler son potentiel et sa capacité → conserver, nommer et signer → le réutiliser comme parent → dépenser ses points pour activer des possibilités héritées.

Cette direction reprend la photo de référence et les choix précisés par le propriétaire le 9 novembre : une variété possède un patrimoine transmissible, des emplacements limités et un profil choisi par activation. **Hériter d’un trait ne l’active pas.** Un potentiel non activé reste transmissible ; un potentiel absent des deux parents ne peut pas apparaître. Les points et les activations ne sont pas hérités.

Une découverte rare ou exceptionnelle donne un point à chacun de ses deux parents, une seule fois. Chaque activation coûte un point propre à la variété, occupe un emplacement libre et choisit un potentiel qu’elle possède déjà. Elle ne modifie ni son identité, ni ses chances de transmission, ni le lot antérieur.

## Les parents de démonstration

| Parent | Capacité | Potentiels héritables |
|---|---:|---|
| X · Aromatique | 3 emplacements | Citronné, Floral, Ramification |
| Y · Réserve | 5 emplacements | Ramification, Qualité potentielle |
| Z · B1 | 3 emplacements | Effet fictif B1, Qualité potentielle |

Ces cinq traits, les capacités de 3/5 emplacements, les chances, le coût d’activation et les classes de rareté sont des **paramètres d’essai**. B1 désigne uniquement un effet fictif. La transmission détaillée est consultable avant engagement.

Ramification affiche un aperçu de production à 5 branches au lieu de 3. Qualité potentielle décrit une possibilité de production future. La démo ne simule pas cette culture : aucune bouture, quantité ni qualité de lot supplémentaire n’est créée par l’activation.

## Commandes et journal

La vue est à la première personne. Poser les parents avec les boutons, puis engager le petit essai. Sous la loupe, glisser pour tourner et utiliser les commandes de rapprochement. Les points blancs donnent accès aux emplacements ; Origine ouvre la généalogie.

Maintenir environ 1,5 seconde pour révéler. Relâcher met en pause sans perdre l’avancement de la séquence en cours. Espace/Entrée et l’ouverture assistée donnent accès au même résultat. Aucune précision, vitesse ou réussite motrice ne change le tirage ou les ressources.

**Arbre & journal** montre désormais un arbre graphique complet : fondatrices et essais sont reliés de génération en génération. La recherche et les filtres se combinent sans masquer les autres branches. Les correspondances sont dorées, leurs ancêtres et les liens qui les relient sont accentués ; le reste de l’arbre est atténué. Même sans résultat, l’arbre reste présent. Les filtres sont gardés pendant les allers-retours entre arbre et emplacements, séparément pour chaque mode. Un essai non révélé conserve ses parents visibles, mais pas son potentiel, ses emplacements ou sa rareté.

Rechercher un nom, une identité ou une signature, puis filtrer par potentiel hérité, trait activé, capacité minimale, rareté, ascendance ou statut. Utiliser **+ / −**, **Tout voir** et **Résultat précédent/suivant** pour parcourir les branches. Faire défiler au doigt ou avec les flèches du clavier lorsque l’arbre a le focus ; sur ordinateur, glisser son fond à la souris. Cliquer une fondatrice ou une variété conservée ouvre directement ses emplacements. Les essais archivés, non révélés ou non encore conservés restent en consultation seule.

Les fiches détaillées et leurs actions restent disponibles dans un volet replié sous l’arbre : consultation, réutilisation parentale lorsque le parcours l’autorise et export avec nom, signature et généalogie. Une archive ne devient pas un parent disponible. Les fiches exportées sont des images partageables, sans import jouable.

Activer le son à la demande. **Expressif** et **Discret** comparent les retours sur le même état ; le volume est séparé. Les boutons de rejeu du mode test répètent uniquement les sons/VFX, sans gain supplémentaire.

## Essai rapide séparé

Le mode test force une issue admissible pour essayer révélation, points et activation. Il possède sa propre sauvegarde ; rien ne passe vers le mode normal ou V02. Le premier accès prépare une rare X × Z sous la loupe.

Préparer une exceptionnelle peut créer un parent intermédiaire Y × X à cinq emplacements portant Citronné et Floral, puis le croiser avec Z. Cet intermédiaire est réellement révélé et conservé dans la session test : son essai, ses ressources et les points accordés à Y/X restent dans le journal. Le résultat final attend votre révélation.

La commande de test propre à une variété cherche un partenaire admissible pour lui faire gagner un point par un descendant rare. Elle respecte les ressources et refuse si aucun tirage compatible n’existe. Recommencer le test remet seulement cette session à zéro. Les issues forcées ne mesurent pas leurs chances normales.

## Limites et vérification

Identité, potentiel hérité, activation, rareté et qualité réelle du lot sont distincts. Le lot d’essai reste un spécimen de qualité standard. Deux boutures identifiées sont consommées une fois ; le pot est réutilisé. Chaque fondatrice dispose de trois boutures initiales et trois prélèvements supplémentaires. Chaque descendant conservé dispose de huit prélèvements, pour laisser essayer le remplissage de cinq emplacements puis poursuivre la lignée. Ce budget de démonstration ne garantit pas les découvertes rares ; Ramification ne l’augmente pas et ne crée aucune bouture.

V03 utilise un schéma et des sauvegardes séparés de V02, sans migration automatique. L’ajout de l’arbre graphique conserve les règles, chances, ressources, sauvegardes V03 et les mêmes liens normal/test. La sauvegarde reste locale au navigateur. Les recettes des autres produits, les emplacements définitifs de spécialisation, l’économie et la production ordinaire restent ouverts.

**79 tests réussis, 0 échec ; les neuf modules embarqués passent le contrôle de syntaxe.** Le nouveau calcul de disposition est testé séparément : liens parentaux, positions stables sous filtrage, surlignage de l’ascendance et absence de divulgation des résultats cachés.

La vue publiée a ensuite été parcourue dans le navigateur : sept variétés et huit liens conservés, recherche « heritage » donnant un résultat et quatre liens d’ascendance surlignés, filtres B1/cinq slots et B1 activé, ouverture des slots au clic, recherche conservée au retour, archive consultable et recherche vide sans suppression de branche. Zoom, vue complète, navigation entre résultats et défilement clavier ont été essayés. Les dispositions 1280 × 720 et 390 × 844 ont été inspectées, sans débordement horizontal du document ou de la fenêtre du journal ni erreur/avertissement console. Le grand arbre défile à l’intérieur de sa propre zone. Voir les captures `checks/tree-desktop.jpg`, `checks/tree-mobile.jpg` et `checks/validation.json`.

**Historique V03 avant l’arbre graphique :** le parcours navigateur avait vérifié rare X × Z, activation Citronné sur X, exceptionnelle via relais Y × X, masquage sous filtre B1 + cinq emplacements, conservation de la variété XYZ, gain par son descendant rare puis activation B1. Rejeu, rechargement et séparation du mode normal avaient été contrôlés. L’ancienne vue en fiches, corrigée pour montrer les correspondances avant les ancêtres, avait été inspectée à 1280 × 720 et 390 × 844 ; recherche et filtres combinés fonctionnaient sans débordement horizontal ni erreur/avertissement console relevé. Maintien interrompu/repris et assistance avaient aussi été parcourus. Ces observations et captures historiques ne valident pas le nouvel arbre graphique.

Ces parcours sont automatisés et les captures ont été examinées. Aucun essai humain, téléphone physique, écoute validée ou intégration Unity n’est revendiqué. Le confort du glissement à la souris et du défilement tactile reste à apprécier en jouant.

Le spécimen utilise un modèle visuel partagé ; les sons sont synthétisés localement. Three.js est fourni sous licence MIT, incluse dans ce dossier.

[Passation Unity](handoff/PASSATION_UNITY.md) · [Sons provisoires](handoff/AUDIO.md)
