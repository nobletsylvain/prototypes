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

**Arbre & journal** conserve fondatrices et essais, y compris les archives et les essais en attente. Rechercher un nom, une identité ou une signature, puis combiner potentiel hérité, trait activé, capacité minimale, rareté, ascendance et statut. Les résultats sont regroupés par génération avec liens parents/enfants. Les ancêtres de contexte restent visibles et sont distingués des correspondances. Les filtres sont gardés pendant les allers-retours entre arbre et emplacements, séparément pour chaque mode. Un essai non révélé conserve ses parents visibles, mais pas son potentiel, ses emplacements ou sa rareté.

Une variété conservée peut être consultée, réutilisée et exportée en fiche avec nom, signature et généalogie. Une archive reste consultable sans devenir un parent disponible. Les fiches sont des images partageables, sans import jouable.

Activer le son à la demande. **Expressif** et **Discret** comparent les retours sur le même état ; le volume est séparé. Les boutons de rejeu du mode test répètent uniquement les sons/VFX, sans gain supplémentaire.

## Essai rapide séparé

Le mode test force une issue admissible pour essayer révélation, points et activation. Il possède sa propre sauvegarde ; rien ne passe vers le mode normal ou V02. Le premier accès prépare une rare X × Z sous la loupe.

Préparer une exceptionnelle peut créer un parent intermédiaire Y × X à cinq emplacements portant Citronné et Floral, puis le croiser avec Z. Cet intermédiaire est réellement révélé et conservé dans la session test : son essai, ses ressources et les points accordés à Y/X restent dans le journal. Le résultat final attend votre révélation.

La commande de test propre à une variété cherche un partenaire admissible pour lui faire gagner un point par un descendant rare. Elle respecte les ressources et refuse si aucun tirage compatible n’existe. Recommencer le test remet seulement cette session à zéro. Les issues forcées ne mesurent pas leurs chances normales.

## Limites et vérification

Identité, potentiel hérité, activation, rareté et qualité réelle du lot sont distincts. Le lot d’essai reste un spécimen de qualité standard. Deux boutures identifiées sont consommées une fois ; le pot est réutilisé. Chaque fondatrice dispose de trois boutures initiales et trois prélèvements supplémentaires. Chaque descendant conservé dispose de huit prélèvements, pour laisser essayer le remplissage de cinq emplacements puis poursuivre la lignée. Ce budget de démonstration ne garantit pas les découvertes rares ; Ramification ne l’augmente pas et ne crée aucune bouture.

V03 utilise un nouveau schéma et des sauvegardes séparées de V02, sans migration automatique. La sauvegarde reste locale au navigateur. Les recettes des autres produits, les emplacements définitifs de spécialisation, l’économie et la production ordinaire restent ouverts.

Les résultats de validation V03 seront ajoutés après les contrôles de la version finale. Les preuves navigateur V02 ne sont pas des preuves V03. Aucun parcours navigateur V03, essai humain, téléphone physique, écoute validée ou intégration Unity n’est revendiqué ici à ce stade.

Le spécimen utilise un modèle visuel partagé ; les sons sont synthétisés localement. Three.js est fourni sous licence MIT, incluse dans ce dossier.

[Passation Unity](handoff/PASSATION_UNITY.md) · [Sons provisoires](handoff/AUDIO.md)
