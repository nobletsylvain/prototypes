# CLAUDE.md — repère pour les sessions

Prototype de jeu mobile **Hash Slicer 3D** : un seul fichier `index.html`
(HTML + CSS + un module JS) utilisant **Three.js** (WebGL) chargé depuis un CDN
via import-map. Déployé sur **GitHub Pages**
(https://nobletsylvain.github.io/prototypes/).

## Boucle de jeu (résumé)

1. **Acheter** une savonnette (matière première, 100/250 g, prix de gros).
2. **Couper** la savonnette en **barrettes ~10 g** (mini-jeu de timing à la
   jauge ; tap quand le curseur est dans le vert). Les barrettes vont
   automatiquement dans le **bac STOCK** ; les pertes vont au **bac DÉCHETS**.
3. **Doser** : taper le bac STOCK ouvre le dosage continu — débiter le stock en
   **doses 1/2/5 g** via une méthode au choix (🪓 Hachoir / ⚖️ Balance /
   ✂️ Coupe tracée), vendues au détail (petite dose = €/g plus élevé).
4. **Boutique** : massicot auto, auto-doseuse, cadence, gabarit, savonnettes…
   Plus un système de **niveaux (XP)** et le bac déchets revendable aux schlags.

## Conventions

- Tout est dans `index.html`. Le JS est un `<script type="module">`.
- Vérifier la syntaxe avant de pousser :
  ```bash
  # extraire le module et le passer à node --check (voir l'historique des PRs)
  node --check <module-extrait>.mjs
  ```
- Persistance via `localStorage` (`hash_*`). Une clé `hash_ver` force un reset
  propre de la progression : **bumper `SAVE_VERSION`** dans `index.html` après
  un gros rééquilibrage.

## Voir le rendu (captures d'écran)

Le rendu WebGL peut être capturé sans appareil — outil dans **`tools/`** :

```bash
cd tools && npm install && node screenshots.mjs   # -> tools/shots/*.png
```

Il lance Chromium headless et **sert Three.js depuis `tools/vendor/`**
(les CDN publics type unpkg/jsdelivr sont souvent bloqués en session distante ;
GitHub raw et storage.googleapis.com — d'où Puppeteer prend Chromium — sont,
eux, accessibles). Voir `tools/README.md`.
