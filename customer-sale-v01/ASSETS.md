# Ressources de L’Étal — révision d

Les modèles sont repris des sources du projet et convertis pour le navigateur. La correction ne remplace ni les fichiers du jeu, ni leurs sources artistiques. [Suivi : issue 280](https://github.com/nobletsylvain/prototypes/issues/280).

## Personnages originaux du projet

assets/models/characters/Leah.glb, Moira.glb, Eddie.glb et Martin.glb proviennent des FBX homonymes sous game/Assets/Resources/Art/. Ce sont quatre modèles originaux procéduraux, historiquement intégrés à CapitalWorld, notamment par CapitalSocialWorld.cs. Ils ne sont pas présentés comme une nouvelle collection finale ou comme les personnages du banc actuel.

Les exports conservent les pivots indépendants de tête et de bras ; aucune animation enregistrée ni nouveau squelette n’est fourni. La scène du navigateur anime ces pivots. La source éditable est art/blender/original/THE_CAPITAL_original_assets.blend, et la provenance est décrite dans art/README.md et art/provenance/original/ASSETS.txt.

| GLB | SHA-256 |
|---|---|
| Leah.glb | f77effbe3a27851c8d57f6619a2379dfbd982ab36ac6152f87e44a255a4a3046 |
| Moira.glb | 149f3f4ad6a85166b396212582632bd03566c9c101a570ac93dfbe56a457a80c |
| Eddie.glb | d0be13efaacbcc1243f7dd6add78699377ac3f8d087cc9342896f849abd5a396 |
| Martin.glb | 85b35d8387629164b4138a46c00be9df4e4fbe75b1e2828ac63c6ed8b1f0a4b3 |

## Contenu des sachets

Les têtes sont les maîtres **HeadsV05** actuellement chargés par BenchHeadVisuals.cs. Les FBX du jeu correspondent exactement aux fichiers artistiques sous art/props/plant-revision-v05-20261105/candidate01/delivery/. Leurs GLB compagnons ont été copiés à l’identique, avec leurs matières par facette et sans texture externe. La démo charge les maîtres 2 et 5 g ; la gamme premium de 2 g utilise le même maître de 2 g. Le maître 1 g a été vérifié localement, mais il n’est ni utilisé ni publié avec ce catalogue.

La barrette provient de **HashV02/ResinSlice_V02.fbx**, actuellement sélectionné par CapitalProductMaterials.cs et BenchHashCutSequence.cs. Le GLB garde la géométrie et les emplacements Hash / Crust et Hash / Interior. Les portions 4 et 8 g se distinguent par leur épaisseur de coupe, comme dans le banc ; le 8 g n’est pas un agrandissement uniforme. Le shader Unity Capital/ResinSurface, dépendant des lots, n’est pas porté : les matières exportées restent une approximation de l’habillage en jeu.

| GLB sous assets/models | SHA-256 |
|---|---|
| bud-2g.glb | 287ec110084038eaacbc4f4912d9684f220cbd04cb218ae792377553cf726ce4 |
| bud-5g.glb | 08199d585ec173c05e059d6cbe9962c11f4e2ee55d6fe517cdde9de1329c8834 |
| resin-slice-v02.glb | 20988993ac5ac73186e78390a2dc683b4b9a0cf1a519582a2e0d40d386659173 |

Le film transparent, le zip rouge et l’étiquette de poids sont construits dans la scène du navigateur. Aucun ancien BagClosed ni scan FlowerBud n’est substitué aux contenus actuels. Le grammage apparaît sur les sachets, sans doublon sur les cases. Les fichiers GLB n’ajoutent aucun stock : les grammes et les identités restent dans le registre logique.

Les rapports locaux qa/product-models-manifest.json, qa/product-models-provenance.md et qa/character-model-exports.json, à la racine du dossier de travail, consignent les sources exactes, leurs empreintes avant/après et les contrôles de conversion. Ces vérifications de fichiers ne constituent pas une validation visuelle du navigateur.

## Billets

Les cinq atlas 5, 10, 20, 50 et 100 euros proviennent du lot original de dessins géométriques TheCapital « currency-lowpoly-v02 ». Aucun scan de billet réel. Les copies restent identiques à la source.

Le rendu compose une grande valeur au-dessus d’un aperçu du recto original pour qu’elle dépasse du compartiment. Ce montage, son format et la courbure sont des choix de lisibilité de la démo ; les textures source restent inchangées.

| Fichier | SHA-256 |
|---|---|
| banknote_5eur_front_back.png | 237c7da686071d946576952e008776807affd71521e70a24e57fe8b4654036e6 |
| banknote_10eur_front_back.png | c0e6d0354bb95e15bfb7d1ec4c5cd908997adcee8032658e2abefeba52771bf3 |
| banknote_20eur_front_back.png | eab02c00cc9a813703683c593aeec20a73c7bef6d6545ed45f5f9b2c1fe56467 |
| banknote_50eur_front_back.png | 4b7dcc5ff1cbe9e92c5296ff1f144d5182ef6a0ea17a23997e8155a28e21ba5b |
| banknote_100eur_front_back.png | 7baaaf6f3972244a969d53f5cc3b8e8201f2c1476cece8487fac2812bcee59cc |

## Rendu et dépendances

**Three.js r160**, sous licence MIT, est livré localement avec THREE-LICENSE.txt. Le moteur three.module.js est conservé à l’identique. GLTFLoader.js et BufferGeometryUtils.js proviennent de la même version ; seuls leurs chemins d’import sont adaptés aux fichiers locaux. La notice MIT accompagne ces fichiers. Décor, carton et sacoche restent des géométries dédiées à la démo.

| Fichier | SHA-256 |
|---|---|
| three.module.js | 76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495 |
| GLTFLoader.js | ba3a390eb67b7a03bc4bfc24e446f3048e09b4f03bf4abf3e413c81299198cc9 |
| BufferGeometryUtils.js | 97700bcd28781fb3f92605c5e1e486c912fd239ee77432929cfa789d44af2a23 |
| THREE-LICENSE.txt | 852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d |

## Sons et polices

Synthèses Web Audio originales et provisoires dans audio.mjs : prise et froissement, contact papier/carton, pose du sachet, rangement, accord et refus. Les sons accompagnent les mouvements acceptés par le registre et leur arrivée visuelle ; ils ne transfèrent aucun argent. Aucune extraction audio d’un jeu tiers, voix finale ou écoute propriétaire validée.

Les polices sont Arial/Helvetica/Georgia selon le système, sans téléchargement. Toutes les ressources nécessaires sont locales ; aucun service externe n’est requis pendant l’essai.
