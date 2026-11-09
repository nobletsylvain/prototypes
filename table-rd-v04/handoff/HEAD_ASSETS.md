# Têtes communes à l’arbre et à la loupe

Vérification et portage du 9 novembre 2026. Ce document distingue les sources du jeu, le rendu autonome livré et les paramètres de présentation proposés. Aucun fichier Unity ni asset source n’a été modifié ; aucun import ou build Unity n’a été lancé.

## Source réellement employée dans le jeu

`game/Assets/Scripts/Bench/BenchHeadVisuals.cs:128` charge les trois maîtres `game/Assets/Resources/Workbench/HeadsV05/bud-{1,2,5}g.fbx`. Le plateau et les plantes appellent cette même construction. La géométrie est reconstruite en facettes à normale constante : trois groupes de feuillage et un groupe de facettes orange. La couleur ne modifie pas la géométrie physique.

Les trois FBX ont été comparés par SHA-256 aux sources de `art/props/plant-revision-v05-20261105/candidate01/delivery/` : ils sont identiques octet pour octet. Le contrôle d’import de `qa/v0.1.0-block.185.1/build-20261109T080623349Z-7a3a2547/bench-head-import.json`, daté du 9 novembre à 08:07 UTC, rapporte 55 réussites et zéro échec. Ce rapport existant est une preuve d’import ; il ne constitue pas un essai humain de cette démo.

| Maître source | Sommets uniques | Triangles | GLB source | Identifiant de présentation |
|---|---:|---:|---:|---|
| bud-1g | 92 | 180 | 18 372 octets | compact |
| bud-2g | 122 | 240 | 23 052 octets | spire |
| bud-5g | 162 | 320 | 29 304 octets | cluster |

Les formes sont normalisées chacune à une hauteur de présentation de 1, avec base Y = 0. **Le choix de forme, la taille affichée et les déformations ne signifient aucun poids ni rendement.** Les masses des noms source restent uniquement une indication de provenance. La démo ne crée pas de grammes à partir du volume.

Les GLB V05 ont un seul nœud sans transformation et aucun fichier image. L’extraction conserve chaque triangle et son groupe, soude seulement les coordonnées source strictement identiques, puis applique translation et échelle uniforme. Les coordonnées normalisées sont arrondies à neuf décimales. Voir `evidence/head-masters-extraction.json` pour les empreintes, dimensions, groupes et contrôles.

La classe de licence existante est `owner-session`, définie dans `art/IMPORT_POLICY.json` ; les copies Unity sont répertoriées dans `art/PROVENANCE.json`. La preuve gelée initiale est `qa/v0.1.0-block.176.1/source-inputs.json`. Ce portage n’accorde aucune licence nouvelle et ne requalifie pas les photographies documentaires externes.

## Écart corrigé avec la démo précédente

L’ancien `dist/assets/specimen.json` provenait de `art/props/products-lowpoly-v01/bud-2g/prepared/bud-2g.glb`, premier essai texturé du 5 novembre : 526 triangles et une texture couleur réduite à 512 pixels. Son SHA-256 source vérifié est `d08736eca3ffa52aad8b29114e12b102d6edfc7a79eb4b30af902c81f90a9bed`. Ce n’est pas le maître actuellement chargé par Unity.

La scène ne charge plus cet ancien spécimen ni ses textures. Les silhouettes SVG organiques dessinées indépendamment ont également été remplacées par la projection des véritables faces V05. Les anciens dossiers de livraison et sources sont conservés.

## Matières et apparence

`BenchGrowAppearance.cs` définit les trois palettes du jeu : jaune-olive, vert sombre, violet. Elles sont reprises dans `head-geometry.js`, dans l’ordre sombre / clair / moyen / pistil :

| Pigment | Sombre | Clair | Moyen | Pistil |
|---|---|---|---|---|
| lime | #525c17 | #b8b840 | #789629 | #d48f2b |
| olive | #0e3016 | #3b6b36 | #1c4f24 | #ab5e24 |
| mauve | #4a1f52 | #9e61ab | #6e387a | #d19e5e |

Le jeu emploie `game/Assets/Resources/Shaders/CapitalSurface.shader`, shader `Capital/Material`, avec grain et mélange de textures nuls. `BenchTrayMatter.cs:1645` fixe le lissé à 0,13 ; `BenchMatter.cs:52` emploie 0,22 pour la plante. Le web utilise une matière mate à couleurs par sommet et normales plates. Les éclairages, l’exposition et les modèles d’ombrage diffèrent : aucune identité pixel à pixel avec Unity n’est revendiquée.

## Une géométrie exprimée, deux présentations

`head-masters.js` contient les trois topologies gelées. `head-geometry.js` appelle `getVisualPhenotype(visual)` puis produit les positions, triangles, normales et couleurs de chaque face. `scene.js` construit le maillage Three à partir de ces données ; `journal-portrait.js` projette exactement les mêmes faces dans le SVG, triées par profondeur. L’arbre n’ajoute donc aucun contexte WebGL par vignette.

Les coefficients suivants sont des **paramètres de démonstration**, pas des règles finales de botanique ou de production :

- Forme : sélection d’un des trois maîtres par le phénotype hérité.
- Allongement : hauteur × 0,84 à 1,18 ; ampleur : section × 0,80 à 1,20.
- Largeur du feuillage : profondeur × 0,86 à 1,14 ; quantité de feuillage : modulation douce de la section basse de ±10 %. Aucun pétale réaliste ou feuille étrangère n’est ajouté au maître.
- Pigments : palette unique ou deux pigments hérités visibles en plages de facettes, avec leur teinte moyenne commune. L’implantation des plages est fixe dans les coordonnées de l’objet.
- Pistils : nuance chaude des facettes dédiées ; surface : léger éclaircissement de facettes. Aucun cristal réaliste ajouté.

Aucune variation décorative n’est dérivée de l’identifiant, du nom ou de la rareté. L’identité visuelle ne change pas lorsqu’on active un slot. Les impulsions de découverte peuvent conserver leur couleur de rareté, indépendamment de la matière de la tête.

La loupe montre le résultat physique pendant l’examen, avant sa fiche. L’arbre garde au contraire une silhouette neutre scellée jusqu’à la révélation : le rendu inconnu retourne avant de lire `id`, `visual`, couleur ou rareté. Un ancien objet public sans gènes utilise un défaut de présentation explicite ; cette protection ne remplace pas la validation du modèle.

Les repères blancs suivent les sommets transformés. La zone de sélection s’adapte aux dimensions affichées avec une marge, sans modifier le résultat suivant l’adresse du geste.

## Images regardées et contrôles

Les trois captures Unity suivantes ont été effectivement regardées dans `qa/v0.1.0-block.185.1/bench-20261109T091141199Z-c9633a40/bench-1080/` :

- `176-owner-heads-tray-fr.png` : trois tailles de tête et plateau, grandes facettes orange sur feuillage vert.
- `08-persistent-three-size-heads-after-12-seconds.png` : têtes libres regroupées après repos.
- `419-grow-mixed-varieties-in-tray.png` : coexistence des palettes jaune-olive, verte et violette.

La note Obsidian `Arts/Direction et production/Assets 3D - Produits low poly et plante modulaire.md`, datée du 5 novembre, conserve la provenance V05 et distingue déjà les textures V01 des facettes V04/V05. Sa mention « aucune intégration Unity » décrit son état historique : les imports et le rapport block.185.1 plus récents établissent l’emploi actuel des trois têtes, sans prouver toute l’intégration de la plante.

Les images `evidence/head-portraits.png` et `evidence/head-inheritance-contact.png` ont été calculées par projection SVG puis regardées. La seconde montre les trois fondateurs et deux générations de descendants ; le JSON associé conserve leurs parents, graines, allèles et phénotypes.

Les tests ciblés vérifient les topologies, 192 combinaisons extrêmes de formes et gènes, les normales unitaires, le cadrage des vignettes, l’expression de chaque axe, le déterminisme, les IDs SVG, l’absence d’injection et la confidentialité de la silhouette inconnue. Ils ne prouvent ni le rendu WebGL final, ni le confort tactile, ni un essai humain sur téléphone.
