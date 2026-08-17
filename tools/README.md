# Outils — captures d'écran du prototype

Le jeu (`../index.html`) est en **WebGL/Three.js**. Pour en voir le rendu sans
appareil, ce dossier fournit un script qui prend des captures via **Chromium
headless** (Puppeteer).

## Lancer

```bash
cd tools
npm install        # installe puppeteer (télécharge Chromium, ~1 min)
node screenshots.mjs
```

Les PNG sont écrits dans `tools/shots/` (ignoré par git) :
`01-base.png`, `02-coupe.png`, `03-boutique.png`, `04-dosage-hachoir.png`,
`05-dosage-balance.png`.

## Comment ça marche

- `index.html` importe Three.js depuis un CDN (unpkg). En environnement
  distant, les CDN publics sont souvent **bloqués** : le script **intercepte**
  la requête `three.module.js` et la sert depuis la copie locale
  **`tools/vendor/three.module.js`** (Three.js r160, figé sur la version de
  l'import-map).
- WebGL tourne en logiciel (SwiftShader) → l'éclairage/les ombres sont un peu
  plus plats que sur un vrai GPU / iPhone, mais la composition est fidèle.

## La Colline Creuse (proto sans WebGL)

`colline-creuse/` est en SVG pur, sans CDN : trois scripts dédiés, tous
hors-ligne (toute requête réseau fait échouer la capture, c'est voulu).

```bash
node shots-colline.mjs          # captures : coupe, salle, soupçon, panneaux
node shots-colline.mjs --full   # + la feuille entière, en une image
node test-colline.mjs           # 4 tests : persistance, objectif, délestage, tenue
node sim-colline.mjs            # équilibrage : 4 stratégies jouées 15 min
node sim-colline.mjs equilibre 30
```

`sim-colline.mjs` et `test-colline.mjs` pilotent le jeu par la **sonde
`?debug`** : la page expose alors `window.CC` (état, `step()`, actions,
bilans). Sans ce paramètre, rien n'est exposé. C'est ce qui permet de jouer
30 minutes en deux secondes et de lire la trajectoire des stocks, du soupçon
et du moral — au lieu d'équilibrer à l'intuition.

## Mettre à jour Three.js vendoré

Si la version dans l'import-map de `index.html` change, remplacer
`tools/vendor/three.module.js` par le `build/three.module.js` correspondant
(récupérable depuis `raw.githubusercontent.com/mrdoob/three.js/<tag>/build/…`,
GitHub raw étant accessible là où les CDN ne le sont pas).
