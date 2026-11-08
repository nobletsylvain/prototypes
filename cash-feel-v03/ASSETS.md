# Papier & liasses V03 — assets et provenance

9 novembre 2026. Cinq fichiers réemployés ont été comparés par SHA-256 entre les copies V02 et V03 : **cinq correspondances, zéro différence**. Les versions V01, V02 et les lots d’art antérieurs sont conservés.

## Fichiers livrés à l’identique

| Fichier | Octets | SHA-256 |
|---|---:|---|
| `assets/banknote_10eur_front_back.png` | 68 014 | `c0e6d0354bb95e15bfb7d1ec4c5cd908997adcee8032658e2abefeba52771bf3` |
| `assets/banknote_20eur_front_back.png` | 72 942 | `eab02c00cc9a813703683c593aeec20a73c7bef6d6545ed45f5f9b2c1fe56467` |
| `assets/three.module.js` | 1 272 972 | `76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495` |
| `assets/THREE-LICENSE.txt` | 1 081 | `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d` |
| `audio.mjs` | 7 478 | `6adee8a48d9fa553d1a3b2973afb7be781ab0e4d2e72b0da80adc1b39307dfe3` |

Cette vérification porte sur les fichiers, sans réattribuer à V03 une écoute ou une revue visuelle antérieure. [Relevé V02 conservé](../cash-feel-v02/ASSETS.md).

## Billets et UV

Les atlas viennent de `TheCapital/art/currency-lowpoly-v02/`. Le lot les décrit comme des dessins géométriques originaux pour TheCapital : arches, ponts et motifs facettés, mention « THE CAPITAL », sans scan ni police externe nécessaire au runtime. Les coupures 10 et 20 € suffisent aux scénarios.

Les atlas RGB opaques font 1024 × 1024 pixels. Chaque billet utilise un format de rendu de **140 × 65 mm** :

| Zone | Lignes de pixels, origine en haut | UV, V=0 en bas |
|---|---|---|
| Recto | 0–475 inclus | U=0–1 ; V=0,53515625–1 |
| Séparateur papier | 476–547 inclus | U=0–1 ; V=0,46484375–0,53515625 |
| Verso | 548–1023 inclus | U=0–1 ; V=0–0,46484375 |

Pour un billet à plat, le bord éloigné −Z correspond au haut imprimé ; V utilise `0.5 − z / profondeur`. Mirer U au verso, conserver V ; la tranche peut échantillonner le centre de l’atlas. Source de remappage : `art/currency-lowpoly-v02/uv-rects.json`. La déformation et les reflets viennent du rendu, pas des PNG.

L’audit historique du 8 novembre avait relevé une limite du manifeste d’art : un `v01-preservation.json` y était mentionné mais absent. Cette limite n’est pas effacée par la comparaison V03. Les deux fichiers employés sont vérifiés ; le manifeste d’art complet n’est pas déclaré intégralement validé.

## Machine et image de référence

L’image jointe par le propriétaire le 9 novembre illustre une machine où tri/comptage, stock par coupure et formation de liasses appartiennent à un même équipement. Elle sert à préciser le **fonctionnement demandé**. Elle n’est pas copiée dans la livraison, transformée en texture ou présentée comme un asset du projet.

Le corps, les baies internes, les bandes, les bacs et les trajets de sortie de V03 sont construits procéduralement pour l’essai. Couleurs, volumes, indicateurs, disposition et chute guidée sont des propositions de mise en scène ; ils ne constituent pas un modèle Unity de production ni une reproduction de l’image.

Les anciens fichiers `Counter.fbx` et `CashBundle.fbx` restent hors de cette livraison : leur nom et leur taille, relevés dans l’audit antérieur, ne suffisent pas à établir une adéquation visuelle ou fonctionnelle. Aucun fichier fournisseur FEEL n’a été lu ou modifié.

## Sons candidats

Le module audio V02 est repris à l’identique : froissement groupé, admission, claquement de passage, tension/fermeture de bande, pose et refus. Ces synthèses sont **originales et provisoires**, sans écoute finale retenue. Aucun son n’est extrait de la capture fournie ou des références CCS documentées.

Le nouveau raccordement distingue le passage d’un billet vers une réserve, la formation interne et l’éjection. Il ne change pas les fichiers synthétiques. L’inventaire Obsidian de référence rattache ces gestes aux besoins SFX-020 à SFX-026, avec SFX-010 pour le rangement et INF-003 pour le refus. Aucun audio Unity n’est remis en service.

## Bibliothèque

La dépendance locale est **Three.js r160**, initialement reprise de `TheCapital/work/prototypes-source/tools/vendor/three.module.js`, puis conservée avec des fins de ligne LF. L’en-tête déclare « Copyright 2010-2023 Three.js Authors », licence MIT. La notice complète accompagne le module dans `assets/THREE-LICENSE.txt` ; conserver les deux à chaque livraison.

La scène charge ses modules et textures depuis le même dossier publié, sans CDN requis pendant l’essai. Aucune bibliothèque, texture ou capture supplémentaire n’a été ajoutée pour cette version.

Les résultats de rendu V03, d’écoute, de téléphone et de publication doivent être lus dans [SESSION.md](SESSION.md). Ce relevé établit le réemploi vérifié, sans anticiper ces validations.
