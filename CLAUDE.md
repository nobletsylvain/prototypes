# CLAUDE.md — repère pour les sessions

Dépôt de **prototypes de core loops** mobiles (WebGL/Three.js). On teste
plusieurs boucles de jeu, **une par dossier**, listées par un hub à la racine :

```
/index.html              ← hub (liste/links des core loops)
/hash-slicer/index.html  ← core loop "Hash Slicer" (le plus abouti)
/tools/                  ← captures d'écran headless (cible paramétrable)
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

## Notes & règles vivantes

Suivi mis en place le 2026-06-22. Deux supports complémentaires :

- **Notes** — journal chronologique (décisions, idées, écarts constatés,
  questions ouvertes) dans `NOTES.md`. On y écrit ce qui s'est passé et
  *pourquoi*, pour pouvoir y revenir sans se fier à la mémoire.
- **Règles** — engagements stables qu'on s'impose, consignés ici-même
  ci-dessous. Les *conventions* plus haut restent valables ; cette section
  recueille les règles **ajoutées au fil du projet**.

Tenue des règles : une règle = une ligne claire **avec sa raison d'être**,
datée et numérotée (`R1`, `R2`, …). On n'efface jamais une règle : on la
marque *abrogée* (date + motif) pour garder la trace de la décision.

### Règles ajoutées

- **R1 — Les mini-jeux servent le ressenti, pas la punition** _(2026-06-22)_.
  Un mini-jeu existe pour faire **sentir** l'action en l'exécutant à la main ;
  ce n'est **pas** un test d'adresse. **Rater n'inflige aucun malus** — au pire
  une frustration légère (refaire, un peu de temps), jamais une perte sèche.
  Seule exception : un proto où l'adresse est explicitement le sujet. La tâche
  manuelle doit rester ludique et donner le sentiment de récompense une fois
  finie. *Raison* : le plaisir vient de l'action accomplie, pas de la peur de
  l'échec.
- **R2 — La progression adoucit le travail manuel, par étapes** _(2026-06-22)_.
  Chaque palier doit offrir des outils qui **allègent** la tâche manuelle (plus
  rapide, plus tolérante, moins frustrante), jusqu'à pouvoir l'**automatiser**
  ou l'**externaliser** et laisser le joueur se concentrer sur la big picture.
  *Raison* : la frustration résiduelle est un moteur d'achat d'outils et un fil
  de progression — du « faire à la main » vers le « piloter » —, jamais une
  punition.
- **R3 — Le tactile EST le plaisir** _(2026-06-27)_.
  Chaque corvée de production doit être un **mini-jeu tactile satisfaisant** :
  c'est le **geste** qui régale (leçon *Schedule I*, « le crafting qui ne suce
  pas »). *Raison* : si produire est un plaisir de la main, la boucle se tient
  d'elle-même.
- **R4 — Déterminisme obligatoire** _(2026-06-27)_.
  Le résultat d'un mini-jeu est **prévisible et traçable, jamais randomisé** :
  **skill oui, hasard non**. Le skill **module la récompense**, il ne **punit**
  pas (cohérent avec R1). *Anti-exemple fondateur* : la vente de *The Boss
  Gangster* (vol aléatoire, prix au jeu d'adresse, comportements imprévisibles)
  = frustration. *Raison* : le joueur doit pouvoir relier son résultat à son geste.
- **R5 — Satisfaction(t) décroissante** _(2026-06-27)_.
  Le plaisir d'un mini-jeu **diminue avec la maîtrise** ; il n'est pas éternel.
  *Raison* : c'est ce qui justifie, le moment venu, de pouvoir déléguer (R6).
- **R6 — La vanne de délégation** _(2026-06-27)_.
  Quand la satisfaction tombe à zéro, le joueur **peut déléguer** ce mini-jeu —
  son **choix**, pas un automatisme imposé. Il garde la main tant que ça régale ;
  on délègue en priorité la **répétition sans plaisir**. *Raison* :
  l'automatisation libère de la corvée, jamais de la décision.
- **R7 — Règle d'or** _(2026-06-27)_.
  **Automatise la satisfaction épuisée, jamais la décision vivante ; bannis le
  hasard.** *Raison* : synthèse de R4+R5+R6, boussole de tout nouveau mini-jeu.
- **R8 — Un mini-jeu doit porter une décision** _(2026-06-27)_.
  Le cœur de jeu = la case « **satisfaction haute + déterministe** ». Un mini-jeu
  qui ne porte plus de décision devient **candidat à la délégation**. *Raison* :
  on garde sous la main du joueur ce qui **arbitre**, on délègue le reste.

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
