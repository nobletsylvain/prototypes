# prototypes

Petits prototypes de **core loops** jouables/testables dans le navigateur (mobile-first).
**Un dossier par core loop**, listés par un hub à la racine :

```
/index.html              ← hub (liste des core loops)
/hash-slicer/         ← core loop "Hash Slicer"
/neige/                  ← core loop "Neige"
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

## ❄️ Neige (core loop)

Mini-jeu mobile en **3D** (même base technique : HTML + [Three.js](https://threejs.org/) via CDN, un seul `index.html`). Reskin stylisé d'une chaîne **« bulk → retail »** : on transforme du gros en unités de détail, sur un plan de travail vu en 3/4 plongeant (brique, dalle en verre, balance, bacs).

**Boucle de jeu — gestes directs (feeling > skill, rien à « viser ») :**
1. **Réception** : à la boutique 🛒, on reçoit une **brique 50 / 100 g** (prix de gros) avec sa **pureté**. La 1ʳᵉ est offerte (🔄 Lot de dépannage).
2. **Verser** : **maintiens le doigt sur le 🧱 BLOC** → un flux de poudre coule sur la **🪟 DALLE**. On verse autant qu'on veut — aucune perte.
3. **Mélanger** : **tourne le doigt sur la DALLE** → le **volume gonfle** (stretch) et la poudre s'homogénéise (sa teinte vire). Ça se termine juste en s'y prenant, même grossièrement — jamais raté. Le lot devient du **PRODUIT** (**qualité = pureté diluée par le stretch**).
4. **Ensacher** : **tape (ou maintiens) le bac 📦 PRODUIT** → chaque geste remplit un sachet du **format** choisi (**1 / 5 / 25 g**) qui se scelle, s'envole et **se vend**. Pas de timing, pas de raté (petit format = €/g plus élevé).

Un **halo lumineux** pulse sous la station à utiliser et un **bandeau de consigne** indique le geste courant : la boucle bloc → poudre → mix → sachet est guidée.

**Économie & progression :**
- **Réputation** : la **qualité moyenne** de tes ventes fait monter/descendre le prix. Affichée dans le HUD.
- **Boutique** : **Agent de coupe** (stretch +), **Presse à briquettes** (débloque le 25 g semi-gros), **Auto-ensacheuse** + Cadence, briques.
- **Niveaux (XP)** : chaque vente donne de l'XP ; +2,5 % de revenus par niveau.
- **Déchets** : tape le bac **🗑️ DÉCHETS** pour les brader aux schlags (≈ 12 €/g).

**Feedback juteux** : sons synthétisés (WebAudio, zéro fichier — flux de poudre, raclage du mix, zip, cha-ching), puffs de poudre, sachets qui s'envolent, secousse de caméra.

> Prototype de jeu, habillage purement visuel/stylisé.

### Jouer

- **Caméra** : cadrage auto (portrait/paysage) + **pinch à deux doigts pour zoomer** (sauvegardé).
- En ligne : **https://nobletsylvain.github.io/prototypes/neige/** (depuis le hub).
- En local : ouvrir `neige/index.html` dans un navigateur (idéalement Safari iOS). Nécessite une connexion (Three.js est chargé depuis un CDN).
- Sauvegarde locale sous le préfixe `neige_*` (cash, niveau, réputation, boutique).
