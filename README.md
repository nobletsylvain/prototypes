# prototypes

Petits prototypes de **core loops** jouables/testables dans le navigateur (mobile-first).
**Un dossier par core loop**, listés par un hub à la racine :

```
/index.html              ← hub (liste des core loops)
/hash-slicer/         ← core loop "Hash Slicer"
/green-front/         ← core loop "Green Front"
/guitar-shito/        ← core loop "GuitarShito"
/tools/                  ← captures d'écran headless (voir tools/README.md)
```

Hub en ligne : **https://nobletsylvain.github.io/prototypes/**

## 🟫 Hash Slicer (core loop)

Mini-jeu mobile en **3D** (HTML + [Three.js](https://threejs.org/) chargé via CDN, un seul fichier `index.html`). Reskin humoristique d'un jeu de découpe/revente : chaîne de production en 3 niveaux, du gros au détail.

**Boucle de jeu :**
1. **Acheter** la matière première à la boutique 🛒 : une **savonnette 100 g ou 250 g** (prix de gros, le gramme baisse avec le volume). La 1ʳᵉ est offerte. Le **poids restant** s'affiche sous le titre.
2. **Couper** en **barrettes ~10 g** — mini-jeu de **timing** : un curseur balaie une jauge, tape **dans le vert** (coupe parfaite = 10 g pile ; raté = perte en miettes). Les barrettes filent **automatiquement dans le bac STOCK** (qui se remplit visuellement) ; les pertes vont au **bac DÉCHETS**.
3. **Doser** : tape le bac **STOCK 📦** pour ouvrir le **dosage continu** — débite le stock en **doses 1 / 2 / 5 g** (sélecteur de calibre). Trois méthodes de coupe au choix, chacune son ressenti :
   - 🪓 **Hachoir rythmé** : tap au bon moment (combo qui monte le prix).
   - ⚖️ **Balance** : tape pour peser **pile** le calibre, puis **Ensacher**.
   - ✂️ **Coupe tracée** : **swipe bien droit** le long du gabarit.
   Les 📦 doses produites s'empilent ; **vente au détail** (petite dose = €/g plus élevé : 1 g ≈ 10, 5 g ≈ 7 €/g, × qualité × combo × niveau).
4. **Déchets** : tape le bac **🗑️ DÉCHETS** pour brader les miettes aux schlags (≈ 2,5 €/g). Rien ne se perd.

**Progression :**
- **Boutique** : Gabarit de coupe (élargit la zone verte), **Auto-doseuse** + Cadence, **Massicot auto** (coupe passive) + Affûtage, savonnettes.
- **Niveaux (XP)** : chaque vente donne de l'XP ; +4 % de revenus par niveau (barre + badge dans le HUD).
- Chaîne **idle** possible : Massicot auto → STOCK → Auto-doseuse.

**Feedback juteux** : sons synthétisés (WebAudio, zéro fichier), miettes de résine, secousse de caméra, combos, pop des étiquettes.

> Prototype de jeu, habillage purement visuel/humoristique.

### Jouer

- **Caméra** : cadrage auto (portrait/paysage) + **pinch à deux doigts pour zoomer** (sauvegardé).
- En ligne : **https://nobletsylvain.github.io/prototypes/hash-slicer/** (depuis le hub).
- En local : ouvrir `hash-slicer/index.html` dans un navigateur (idéalement Safari iOS). Nécessite une connexion (Three.js est chargé depuis un CDN).

> ℹ️ L'aperçu de fichier intégré au chat/Files n'exécute pas le JavaScript (écran vide) — il faut une vraie URL (Pages) ou ouvrir le fichier dans un navigateur.

## 🌿 Green Front (core loop)

Mini-jeu mobile en **3D** (HTML + Three.js, un seul fichier `index.html`). Chaîne de transfo/distribution de fleur, de la réception du **front** jusqu'au **pochon** scellé. Réinterprétation jouable d'un jeu de gestion type *Schedule 1*.

**Boucle de jeu (4 étapes, suivies par un *stepper* en haut) :**
1. **Réception & inspection** — un **front** (lot **à crédit**) tombe sur le plan de travail. **Tape pour scanner** (pesée + qualité) : on révèle **% THC**, **humidité**, **% trim/stems**. Puis **Accepter** (alimente la **dette**), **Négocier** (timing → remise / fournisseur vexé) ou **Refuser**.
2. **Bucking & trimming** — **tape dans le vert** pour bucker/trimmer une poignée. **🤚 Main** = lent mais plus de **A-flower** ; **⚙️ Machine** = rapide mais plus de **smalls/trim**. Tri auto dans les bacs **A / B / Trim**.
3. **Coupe / stretch** — **curseur de coupe** : on gonfle le poids vendable en mélangeant du **trim** à la fleur. Plus on stretch, **plus de grammes** mais **%THC qui baisse** et **réputation qui chute** (jauge de **satisfaction clients** + plaintes si trop dilué).
4. **Conditionnement multi-formats** — ensachage **1 g / 3.5 g / 7 g / 28 g / ½ lb / 1 lb** (petit = €/g plus élevé). **Scellage** au timing (bonus si serré), options **💧 humidité** (+valeur/réput) et **🏷️ étiquette fake** (+valeur mais **risque de descente** 🚔).

**Économie :** le front est **à crédit** → les ventes **remboursent d'abord la dette**, le surplus tombe en cash. La **réputation** (0–100) module le prix retail et la qualité/prix des prochains fronts.

**Progression :** Boutique (filière brique, doigté hand-trim, trimmeuse pro, packs humidité, scelleuse, réseau de revendeurs, **auto-bucker** idle) et **niveaux (XP)**, +4 % de revenus par niveau. Persistance `localStorage` préfixée `gf_` (distincte de Hash Slicer `hash_`).

### Jouer

- En ligne : **https://nobletsylvain.github.io/prototypes/green-front/** (depuis le hub).
- En local : ouvrir `green-front/index.html` dans un navigateur. **Caméra** : cadrage auto + **pinch pour zoomer** (sauvegardé).

## 🎸 GuitarShito (core loop)

Mini-jeu mobile en **3D** (HTML + Three.js, un seul fichier `index.html`). « Guitar Hero du hasch » : trois stations chaînées (suivies par un *stepper* en haut), chacune avec son **mini-jeu d'adresse**.

**Boucle de jeu (3 stations) :**
1. **Découpe Précise** *(rythme + swipe)* — des **lignes de coupe** descendent un **manche** façon Guitar Hero vers une **barre de strum**. **Tape / swipe PILE** quand la ligne passe la barre : `PARFAIT` (barrette nette, premium) → `BIEN` → `JUSTE`. Le **combo** réduit la perte et monte la qualité ; **raté** = miettes + combo remis à zéro. Les barrettes filent dans le bac **STOCK**. Format **5 g / 10 g**.
2. **Dilution / Stretch** *(balance physique)* — **maintiens « Verser »** pour gonfler le poids au **filler**. Le **fléau penche** avec inertie et la jauge de **« visibilité »** monte : reste **sous le repère** (zone sûre), sinon la came perd en grade et la **chaleur** 🚔 grimpe. `Emballer ▸` transforme STOCK → **blend**.
3. **Emballage Cellophane** *(stealth drag + tap)* — **glisse pour enrouler** serré, mais des **flics passent en fond** : bouger pendant qu'**🔴 ça mate** fait monter la **suspicion** → **contrôle** (saisie + chaleur). À 100 %, **🔥 Sceller** vite quand c'est calme (emballage rapide = bonus). Vente par **format** (5 / 10 / 50 / 100 g — petit = €/g plus élevé).

**Économie :** on achète une **plaque** (gros), on la transforme, on vend. La **chaleur policière** (0–100) monte avec les coupes trop visibles et les contrôles, redescend avec le temps, et augmente le **risque de descente** à la vente.

**Progression :** Boutique — **Métronome auto** (auto-coupe parfaite au rythme), **Calibreur** (élargit la zone sûre de dilution), **Guetteur** (raccourcit les fenêtres de surveillance), **Scelleuse pro** (enroulage plus rapide), plaques — et **niveaux (XP)**, +3 % de revenus par niveau. Persistance `localStorage` préfixée `gs_` (distincte de `hash_` / `gf_`).

**Feedback juteux** : notes de guitare synthétisées (WebAudio, hauteur qui monte avec le combo), miettes, secousse de caméra, combo géant + jugement à l'écran.

> Prototype de jeu, habillage purement visuel/humoristique.

### Jouer

- En ligne : **https://nobletsylvain.github.io/prototypes/guitar-shito/** (depuis le hub).
- En local : ouvrir `guitar-shito/index.html` dans un navigateur. **Caméra** : cadrage auto + **pinch pour zoomer** (sauvegardé).
