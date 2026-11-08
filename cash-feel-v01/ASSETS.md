# Papier & liasses V01 — assets et provenance

Audit en lecture seule du 8 novembre 2026. Les lots antérieurs restent en place ; seuls les fichiers utiles sont copiés dans cette version indépendante. Aucun fichier fournisseur sous `game/Assets/Feel/` n’a été lu.

## Billets réutilisés

Source : `TheCapital/art/currency-lowpoly-v02/`. Le `README.md` décrit des dessins géométriques originaux pour TheCapital : arches, ponts et motifs facettés, mention « THE CAPITAL », aucun scan de billet. Les dessins n’emploient pas de police externe ; la police des planches d’aperçu n’est pas nécessaire au runtime.

| Fichier copié dans `assets/` | Taille | SHA-256 du fichier source vérifié |
|---|---:|---|
| `banknote_10eur_front_back.png` | 68 014 octets | `c0e6d0354bb95e15bfb7d1ec4c5cd908997adcee8032658e2abefeba52771bf3` |
| `banknote_20eur_front_back.png` | 72 942 octets | `eab02c00cc9a813703683c593aeec20a73c7bef6d6545ed45f5f9b2c1fe56467` |

Les deux scénarios emploient ces coupures ; les autres atlas ne sont pas nécessaires à leur premier essai. Les copies 10 € et 20 € de `assets/` ont été comparées aux sources par SHA-256 : **deux correspondances, zéro différence**. Les six textures V02 ont été contrôlées : **417 009 octets au total**, PNG 1024×1024, tailles et SHA-256 conformes au manifeste du lot. L’aperçu `readability-116x54.png` a été regardé : les six grandes valeurs sont lisibles à 116×54 pixels. Cette revue ne prouve pas encore leur lisibilité à toutes les distances de la nouvelle scène.

Les 23 fichiers présents du manifeste V02 correspondent à leurs empreintes. **Limite constatée : `v01-preservation.json` est mentionné dans le manifeste mais absent du dossier actuel.** Les textures sélectionnées sont vérifiées ; le manifeste complet n’est pas déclaré intégralement validé. Aucun fichier ancien n’a été régénéré pour masquer cette absence.

## Format et UV

Chaque billet utilise un format de jeu de **140 × 65 mm**. L’atlas RGB opaque 1024×1024 contient :

| Zone | Lignes de pixels, origine en haut, bornes incluses | UV, V=0 en bas |
|---|---|---|
| Recto | 0–475 | U=0–1 ; V=0,53515625–1 |
| Papier séparateur | 476–547 | U=0–1 ; V=0,46484375–0,53515625 |
| Verso | 548–1023 | U=0–1 ; V=0–0,46484375 |

Les deux faces source sont à l’endroit. Au verso du mesh physique, mirer **U**, conserver **V**. La tranche peut échantillonner le centre `(0,5 ; 0,5)`. Référence exacte : `art/currency-lowpoly-v02/uv-rects.json`. Le froissement et les reflets viennent du rendu, pas d’un éclairage peint dans les PNG.

## Sources considérées et non retenues

| Source | Constat vérifié | Choix pour cette démo |
|---|---|---|
| `art/currency-lowpoly-v01/banknotes/exports/banknote_*eur.glb` | Six fichiers d’environ 1,07 à 1,16 Mo. Le 20 € possède un mesh, une image embarquée et deux morphs `Curl`/`Wrinkle`. Dimensions et UV historiques différents de V02. | Conservés ; pas de substitution de texture sans remappage. Les atlas V02 sur une géométrie légère sont plus adaptés au lot autonome. |
| `art/currency-lowpoly-v02/banknotes.blend` | Source de six billets plats, dessins modifiables et images intégrées ; le lot V02 n’offre pas de GLB/FBX. | Source conservée pour reprise Unity/art ; aucune nouvelle exportation annoncée. |
| `game/Assets/Resources/Art/Counter.fbx` | Fichier de 219 100 octets. Le nom seul ne démontre pas qu’il s’agit d’une compteuse plutôt que d’un comptoir. | Non réutilisé faute de vérification visuelle/provenance spécifique suffisante. |
| `game/Assets/Resources/Art/CashBundle.fbx` | Fichier de 104 572 octets, sans vérification de sa composition pour cette démo. | Non réutilisé : la nouvelle liasse doit représenter ses propres billets et sa compression. |

La table, la machine, les bacs, la bande et les mouvements procéduraux de cette version sont des **propositions de mise en scène**. Ils ne remplacent pas les modèles de production et n’imposent pas un nouvel équipement au jeu.

## Audio

`audio.mjs` prépare des synthèses Web Audio propres à cette version : papier, prise groupée, admission, claquements de passage, tension/fermeture, pose et refus. Elles sont **provisoires, à écouter**, sans prise finale retenue et sans validation du mixage en jeu.

Aucun son n’est présenté comme extrait des captures CCS : les captures de référence documentées ne comportent pas de piste audio. Le code propre `game/Assets/Scripts/Bench/BenchFeel.cs` a été consulté pour l’inventaire d’événements existants ; cette démo produit ses synthèses indépendantes. Les événements utiles recensés sont `PaperPickup`, `HandfulPickup`, `PaperFlutter`, `CounterFeed`, `CounterBand`, `CounterEject`, `CounterStop`.

Le registre Obsidian à compléter est `Arts/Audio/Audio - Inventaire et besoins.md`, besoins **SFX-020 à SFX-026**, avec **SFX-010** pour le rangement et **INF-003** pour le refus. Le registre local distingue préparation, présence dans la démo, écoute et intégration.

## Bibliothèque de rendu

`assets/three.module.js` est la dépendance de rendu locale de cette version : **Three.js r160**, 1 272 972 octets, SHA-256 `76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495` (fins de ligne LF ; même code r160). Le module est repris de `TheCapital/work/prototypes-source/tools/vendor/three.module.js`. Son en-tête déclare `Copyright 2010-2023 Three.js Authors`, licence MIT ; la notice complète est livrée dans `assets/THREE-LICENSE.txt`. Le module et cette notice doivent rester livrés ensemble. Cette bibliothèque n’est pas une création originale du projet.

La livraison utilise des fichiers locaux au site pour éviter une dépendance au chargement de bibliothèques et textures depuis un CDN durant l’essai. Le paquet final doit vérifier les empreintes des copies et conserver leur provenance.
