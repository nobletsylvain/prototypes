# CLAUDE.md — repère pour les sessions

Dépôt de **prototypes de core loops** mobiles (WebGL/Three.js). On teste
plusieurs boucles de jeu, **une par dossier**, listées par un hub à la racine :

```
/index.html              ← hub (liste/links des core loops)
/barrettes-shit/index.html  ← core loop "Barrettes Shit" (le plus abouti)
/tools/                  ← captures d'écran headless (cible paramétrable)
```

Déployé sur **GitHub Pages** (https://nobletsylvain.github.io/prototypes/ →
hub ; chaque proto à `…/prototypes/<dossier>/`). Chaque core loop est un seul
fichier `index.html` (HTML + CSS + un module JS), Three.js chargé via import-map.

## Barrettes Shit — boucle de jeu (résumé)

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

- Un core loop = un dossier avec son `index.html` (JS en `<script type="module">`).
  Le hub racine `index.html` ne fait que lister/linker les protos.
- Nouveau core loop : créer `un-nouveau-dossier/index.html` et l'ajouter au hub.
  Utiliser un **préfixe localStorage distinct** par proto (sinon collisions :
  Barrettes Shit utilise `hash_*`).
- Vérifier la syntaxe avant de pousser :
  ```bash
  # extraire le module et le passer à node --check (voir l'historique des PRs)
  node --check <module-extrait>.mjs
  ```
- Barrettes Shit : persistance via `localStorage` (`hash_*`). La clé `hash_ver`
  force un reset propre : **bumper `SAVE_VERSION`** dans
  `barrettes-shit/index.html` après un gros rééquilibrage.

## Voir le rendu (captures d'écran)

Le rendu WebGL peut être capturé sans appareil — outil dans **`tools/`** :

```bash
cd tools && npm install
node screenshots.mjs                       # cible barrettes-shit/ -> tools/shots/barrettes-shit/
node screenshots.mjs <dossier>/index.html  # cible un autre core loop
```

Il lance Chromium headless et **sert Three.js depuis `tools/vendor/`**
(les CDN publics type unpkg/jsdelivr sont souvent bloqués en session distante ;
GitHub raw et storage.googleapis.com — d'où Puppeteer prend Chromium — sont,
eux, accessibles). Voir `tools/README.md`.
