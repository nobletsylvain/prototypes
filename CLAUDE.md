# CLAUDE.md — repère pour les sessions

Dépôt de **prototypes de core loops** mobiles (WebGL/Three.js). On teste
plusieurs boucles de jeu, **une par dossier**, listées par un hub à la racine :

```
/index.html              ← hub (liste/links des core loops)
/hash-slicer/index.html  ← core loop "Hash Slicer" (le plus abouti)
/tools/                  ← captures d'écran headless (cible paramétrable)
/app/                    ← app iOS Capacitor (hub + protos → TestFlight), voir app/README.md
```

Déployé sur **GitHub Pages** (https://nobletsylvain.github.io/prototypes/ →
hub ; chaque proto à `…/prototypes/<dossier>/`). Chaque core loop est un seul
fichier `index.html` (HTML + CSS + un module JS), Three.js chargé via import-map.

## Hash Slicer — boucle de jeu (résumé)

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
- Vérifier la syntaxe avant de pousser :
  ```bash
  # extraire le module et le passer à node --check (voir l'historique des PRs)
  node --check <module-extrait>.mjs
  ```
- Hash Slicer : persistance via `localStorage` (`hash_*`). La clé `hash_ver`
  force un reset propre : **bumper `SAVE_VERSION`** dans
  `hash-slicer/index.html` après un gros rééquilibrage.

## Ajouter un nouveau core loop (checklist)

À suivre dans l'ordre pour rester cohérent avec la structure :

1. **Dossier + page** : créer `<slug>/index.html` (slug en kebab-case, ex.
   `mon-idee/`). Partir d'un proto existant comme base si utile
   (`hash-slicer/index.html`).
2. **Hub** : ajouter une carte dans le `/index.html` racine, qui pointe vers le
   nouveau dossier :
   ```html
   <a class="card" href="./<slug>/">
     <div class="ic">🎲</div>
     <div><div class="nm">Nom du proto</div><div class="ds">Pitch en une ligne.</div></div>
     <span class="tag live">jouable</span>
   </a>
   ```
3. **localStorage** : utiliser un **préfixe unique** par proto (ex. `<slug>_…`)
   pour éviter les collisions de sauvegarde entre boucles (Hash Slicer
   utilise `hash_*`). Prévoir une clé de version (`<slug>_ver`) + une constante
   `SAVE_VERSION` pour forcer un reset propre après un gros rééquilibrage.
4. **Three.js** : charger via import-map comme les autres, JS en module :
   ```html
   <script type="importmap">
   { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
   </script>
   ```
   (L'outil de captures sert Three.js depuis `tools/vendor/` — garder la même
   version, sinon mettre à jour le vendor : voir `tools/README.md`.)
5. **Vérifier la syntaxe** : extraire le module et `node --check` (voir ci-dessous).
6. **Captures** : `cd tools && npm install && node screenshots.mjs <slug>/index.html`.
   ⚠️ Les *interactions* du script (coupe/boutique/dosage) sont propres à
   Hash Slicer ; pour un autre proto, au minimum la capture de base marche,
   adapter les clics si besoin.
7. **Commit/PR** sur la branche de la session, puis merge dans `main`.

NB : l'app iOS (`app/`) embarque **automatiquement** tout dossier racine
contenant un `index.html` — rien de plus à faire pour qu'un nouveau proto y
apparaisse. Contrainte : pas d'asset chargé depuis un CDN autre que
l'import-map Three.js (l'app doit marcher hors-ligne ; `app/build-www.mjs`
avertit si une URL externe reste).

## Voir le rendu (captures d'écran)

Le rendu WebGL peut être capturé sans appareil — outil dans **`tools/`** :

```bash
cd tools && npm install
node screenshots.mjs                       # cible hash-slicer/ -> tools/shots/hash-slicer/
node screenshots.mjs <dossier>/index.html  # cible un autre core loop
```

Il lance Chromium headless et **sert Three.js depuis `tools/vendor/`**
(les CDN publics type unpkg/jsdelivr sont souvent bloqués en session distante ;
GitHub raw et storage.googleapis.com — d'où Puppeteer prend Chromium — sont,
eux, accessibles). Voir `tools/README.md`.
