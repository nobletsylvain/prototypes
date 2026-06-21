# prototypes

Petits prototypes de **core loops** jouables/testables dans le navigateur (mobile-first).
**Un dossier par core loop**, listés par un hub à la racine :

```
/index.html              ← hub (liste des core loops)
/hash-slicer/         ← core loop "Hash Slicer"
/green-front/         ← core loop "Green Front"
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

### 🧪 Green Front v2 (fork « lab »)

`green-front-v2/` est un **fork bac-à-sable** de Green Front : copie conforme de la core loop, destinée à **tester une nouvelle mécanique sans toucher à l'original**. Sa sauvegarde est **isolée** (préfixe `localStorage` `gf2_` au lieu de `gf_`) — les deux protos coexistent sans écraser leurs parties. Un badge `🧪 v2 · lab` (et le tag « labo » du hub) le distingue. En ligne : **https://nobletsylvain.github.io/prototypes/green-front-v2/**.
