# Table de R&D — V01

Démo botanique autonome pour **Au four, mon amour**. Préparée les 8 et 9 novembre 2026, elle explore le plaisir de composer une variété, de la découvrir comme un objet, puis de la nommer et de garder sa généalogie. Elle précède toute intégration dans Unity.

[Ouvrir la démo](index.html) · [Passation Unity](handoff/PASSATION_UNITY.md) · [Sons provisoires](handoff/AUDIO.md)

## Parcours

1. Choisir deux parents disponibles et poser leurs fiches. Les boutures sont des ressources identifiées provenant de plantes ; connaître une fiche ne fournit pas une bouture.
2. Superposer un calque d’intention, puis engager le petit essai. Deux boutures sont consommées une seule fois et un pot est mobilisé.
3. Observer la petite production. Le bouton d’avance du temps et les douze secondes d’attente sont des outils de démonstration.
4. Prendre le résultat sous la loupe, le tourner et le rapprocher, puis révéler sa fiche et la comparaison avec ses parents.
5. Nommer et signer la création conservée ; retrouver sa fiche et sa généalogie dans le carnet. Une fiche téléchargée est une image de présentation, sans importation jouable ni publication automatique.

La vue est à la première personne. Glissement, boutons de rotation et zoom permettent d’examiner la table et le spécimen. Les fiches se calent automatiquement ; l’adresse ne change jamais le résultat. Le son s’active à la demande. Les modes **Sensible** et **Discret** comparent les retours sur le même essai ; le volume se règle séparément.

## Ce qui appartient à la démonstration

Aube, Lisière et Velours sont des profils fictifs. Trois boutures de chacun, un pot, un spécimen par essai et un calcul déterministe servent ce prototype. Selon l’intention, le profil reprend le goût d’un parent et le caractère fictif de l’autre. Les reflets alternent doré/mauve entre les essais : cette variation ne représente pas une probabilité finale.

L’identité de variété demeure stable. La qualité du lot est un témoin de démonstration distinct ; elle n’évalue ni l’identité ni l’adéquation à une clientèle. Reproduction ordinaire, coûts et gestes de prélèvement, probabilités, recettes des autres produits et emplacements de spécialisation restent à concevoir.

## Sauvegarde et compatibilité

Les essais sont enregistrés localement dans ce navigateur, sur cet appareil. Recharger retrouve le même résultat et les mêmes ressources. Il n’y a pas de synchronisation entre téléphone et ordinateur. La commande explicite de nouvelle session efface le carnet local et rétablit le stock de démo.

Un navigateur compatible avec WebGL, le stockage local et les verrous inter-onglets est requis. Si la sauvegarde ou le verrou est indisponible, l’engagement est bloqué et une explication est affichée. L’interface est prévue pour ordinateur et téléphone ; son confort tactile reste à vérifier sur appareil réel.

## Vérifications et limites

**16 tests du modèle réussis, 0 échec.** Ils couvrent notamment les refus sans mutation, la consommation unique, la conservation des identités et provenances, le rechargement, l’ordre examen/révélation et le rejet d’états corrompus. La [suite de contrôles](checks/model.test.mjs) accompagne le [modèle](source/model.mjs). La syntaxe JavaScript a été vérifiée. Ces contrôles ne constituent pas une revue visuelle.

À cette publication, aucune revue navigateur complète, aucun essai humain, aucune écoute validée et aucune intégration ou build Unity ne sont déclarés. Le ressenti, la lisibilité de la loupe, la reconnaissance des créations et l’envie de répéter restent à juger en jouant.

La scène réutilise un spécimen de référence : 526 triangles, UV conservées, texture de couleur réduite à 512 pixels. Les détails figurent dans la [passation](handoff/PASSATION_UNITY.md). La bibliothèque de rendu conserve sa [licence](LICENSE-three.txt).
