# Sous la lame — V03

Révision du 5 novembre 2026 : grand couteau de poche low poly inspiré du N°12 Opinel, et cadrage FPS en perspective réglable. La V02 reste dans son dossier.

## Utilisation

- Vue FPS au départ ; Atelier retrouve le cadrage orthographique, Vue libre permet l’observation.
- Regarder réserve le glissement à la caméra et désactive la coupe. Manipuler rend le geste de coupe disponible.
- Régler l’angle ouvre Orientation et Inclinaison. +/− ajustent la proximité ; Recentrer restaure la vue sans réinitialiser la matière.
- Activer les sons, maintenir le bouton pour couper, relâcher entre deux portions.

## Journal

Le propriétaire confirme que le lien V02 fonctionne et demande une caméra adaptée au futur jeu FPS, puis un couteau de type grand Opinel. Cette révision conserve le registre et les sources de matière, les mouvements, les effets et les sons V02. Le fil courbe du nouveau modèle pilote le contact de la lame. Le manche galbé, la virole, le biseau et l’axe sont des volumes low poly ; la silhouette s’inspire de la [fiche officielle N°12](https://www.opinel.com/en-eu/pocket-knives/stainless-steel/n12-stainless-steel), avec proportions stylisées et sans texture externe.

## Vérifications et limites

44 contrôles des modules de matière, géométrie, mouvement et audio réussis ; 26 parcours et contrôles de dessin réussis ; 867 cas de projection et découpage de caméra réussis. Modèle de 766 triangles : composants fermés, normales et orientation des faces vérifiées, 41 points sur le tranchant réel. Les cinq scripts de base et la disposition mobile V02 sont identiques.

La première exécution de la suite géométrie a échoué parce que sa copie locale ne contenait pas le manifeste de provenance. Le fichier d’origine a été ajouté, puis les neuf tests de géométrie ont réussi sans changement du moteur.

Les vues calculées sont des commandes Canvas rasterisées, pas des captures de navigateur. Les tests audio emploient un graphe simulé et ne remplacent pas l’écoute. La validation tactile humaine, la fluidité sur téléphone et le ressenti restent à essayer. Aucun changement Unity ; la perspective représente un poste de travail, sans déplacement FPS dans un niveau ni mains animées.
