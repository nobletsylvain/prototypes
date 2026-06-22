# prototypes

Petits prototypes de **core loops** jouables/testables dans le navigateur (mobile-first).
**Un dossier par core loop**, listés par un hub à la racine :

```
/index.html              ← hub (liste des core loops)
/hash-slicer/         ← core loop "Hash Slicer"
/green-front/         ← core loop "Green Front"
/guitar-shito/        ← core loop "GuitarShito"
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

## 🌿 Green Front (core loop)

Mini-jeu mobile en **3D** (HTML + Three.js, un seul fichier `index.html`). Chaîne de transfo/distribution de fleur, de la réception du **front** jusqu'au **pochon** scellé. Réinterprétation jouable d'un jeu de gestion type *Schedule 1*.

**Boucle de jeu (4 étapes, suivies par un *stepper* en haut) :**
1. **Réception & inspection** — un **front** (lot **à crédit**) tombe sur le plan de travail. **Tape pour scanner** (pesée + qualité) : on révèle **% THC**, **humidité**, **% trim/stems**. Puis **Accepter** (alimente la **dette**), **Négocier** (timing → remise / fournisseur vexé) ou **Refuser**.
2. **Bucking & trimming** — **frotte/glisse le doigt sur le tas** pour effeuiller : un **geste lent et net** donne de belles **A-flower**, un **geste vif** déchire en **trim** (la vitesse du drag fait la qualité). **🤚 Main** = qualité ; **⚙️ Machine** = volume. Tri auto dans les bacs **A / B / Trim**.
3. **Coupe / stretch** — **curseur de coupe** : on gonfle le poids vendable en mélangeant du **trim** à la fleur. Plus on stretch, **plus de grammes** mais **%THC qui baisse** et **réputation qui chute** (jauge de **satisfaction clients** + plaintes si trop dilué).
4. **Conditionnement multi-formats** — ensachage **1 g / 3.5 g / 7 g / 28 g / ½ lb / 1 lb** (petit = €/g plus élevé). **Scellage** au timing (bonus si serré), options **💧 humidité** (+valeur/réput) et **🏷️ étiquette fake** (+valeur mais **risque de descente** 🚔).

**Économie :** le front est **à crédit** → les ventes **remboursent d'abord la dette**, le surplus tombe en cash. La **réputation** (0–100) module le prix retail et la qualité/prix des prochains fronts.

**Progression :** Boutique (filière brique, doigté hand-trim, trimmeuse pro, packs humidité, scelleuse, réseau de revendeurs, **auto-bucker** idle) et **niveaux (XP)**, +4 % de revenus par niveau. Persistance `localStorage` préfixée `gf_` (distincte de Hash Slicer `hash_`).

### Jouer

- En ligne : **https://nobletsylvain.github.io/prototypes/green-front/** (depuis le hub).
- En local : ouvrir `green-front/index.html` dans un navigateur. **Caméra** : cadrage auto + **pinch pour zoomer** (sauvegardé).

### 🧪 Green Front v2 (fork « lab »)

`green-front-v2/` est un **fork bac-à-sable** de Green Front, transformé en **banc d'essai de mini-jeux** : on y teste des mécaniques tactiles en isolé (menu → un mini-jeu → rejouer), sans toucher à la core loop d'origine (intacte dans `green-front/`). Trois mini-jeux à mécaniques volontairement différentes :

- 🌿 **Effeuillage** — *glisser* le doigt le long de la branche pour détacher les têtes (lent & précis = A premium, trop vite = trim).
- ⚖️ **Dosage balance** — *maintenir pour verser, lâcher* pile au bon poids (le débit s'emballe, l'inertie piège, le dépassement coûte cher).
- ✂️ **Trim express** — *réflexe* : couper les feuilles qui poussent sans toucher la tête, avant qu'elles durcissent.

2D canvas + DOM, zéro dépendance, records en `localStorage` (préfixe **`gf2_`**, isolé de Green Front `gf_`). Badge `🧪 v2 · lab` + tag « labo » du hub. En ligne : **https://nobletsylvain.github.io/prototypes/green-front-v2/**.

### ⚖️ Green Front v3 (fork « coupe au dosage »)

`green-front-v3/` est un **fork de la core loop complète** (avec le bucking au drag) où l'**étape coupe/stretch** passe du curseur à un **dosage tactile** : on **maintient sur le bol pour verser le trim** (le débit s'emballe), on **lâche au bon dosage** (inertie + risque de dépassement → clients fâchés / réput en chute). Le reste de la boucle (réception, tri, conditionnement, éco) est identique. Sauvegarde isolée (préfixe **`gf3_`**), badge `🧪 v3 · dosage`. En ligne : **https://nobletsylvain.github.io/prototypes/green-front-v3/**.

## 🎸 GuitarShito (core loop)

Mini-jeu mobile en **3D** (HTML + Three.js, un seul fichier `index.html`). « Guitar Hero du hasch » : deux stations chaînées (suivies par un *stepper* en haut), chacune avec son **mini-jeu d'adresse**.

**Boucle de jeu (2 stations) :**
1. **Découpe Précise** *(rythme + swipe)* — des **lignes de coupe** descendent un **manche** façon Guitar Hero vers une **barre de strum**. **Tape / swipe PILE** quand la ligne passe la barre : `PARFAIT` (barrette nette, premium) → `BIEN` → `JUSTE`. Le **combo** réduit la perte et monte la qualité ; **raté** = miettes + combo remis à zéro. Les barrettes filent dans le bac **STOCK**. Format **5 g / 10 g**.
2. **Emballage Cellophane** *(scellage au briquet)* — une barrette du **STOCK** est sous film, **2 bouts** torsadés dépassent. **Maintiens le 🔥 briquet** sur chaque bout (il rougit, fond, grésille) et **lâche dans le vert** = bout scellé **propre** ; trop tenu = **cramé** (un peu moins cher). 2 bouts → **pochon vendu** par **format** (5 / 10 / 50 / 100 g — petit = €/g plus élevé).

**Économie :** on achète une **plaque** (gros), on **coupe** en barrettes (STOCK), on **emballe** et on vend. Petit format = €/g plus élevé.

**Progression :** Boutique — **Métronome auto** (auto-coupe parfaite au rythme), **Réseau de revente** (+6 %/niv sur les pochons), **Briquet turbo** (les bouts fondent plus vite), plaques — et **niveaux (XP)**, +3 % de revenus par niveau. Persistance `localStorage` préfixée `gs_` (distincte de `hash_` / `gf_`).

**Feedback juteux** : notes de guitare synthétisées (WebAudio, hauteur qui monte avec le combo), miettes, secousse de caméra, combo géant + jugement à l'écran.

> Prototype de jeu, habillage purement visuel/humoristique.

### Jouer

- En ligne : **https://nobletsylvain.github.io/prototypes/guitar-shito/** (depuis le hub).
- En local : ouvrir `guitar-shito/index.html` dans un navigateur. **Caméra** : cadrage auto + **pinch pour zoomer** (sauvegardé).

## ❄️ Neige (core loop)

Mini-jeu mobile en **3D** (HTML + [Three.js](https://threejs.org/) via CDN, un seul `index.html`). Reskin stylisé d'une chaîne **« bulk → retail »** : on transforme du gros en unités de détail sur un plan de travail vu en 3/4 plongeant (brique, dalle en verre, balance, bacs). Même base technique que Hash Slicer.

**Boucle de jeu — gestes directs (feeling > skill, rien à « viser ») :**
1. **Réception** 🛒 — on achète la **coke (50 / 100 g)** ET le **diluant (recharge 200 g)**, de la même façon. Le 1ᵉʳ lot est offert (🔄 Lot de dépannage).
2. **Verser** — **maintiens le doigt sur la 🧱 PILE DE COKE** → un flux de poudre coule sur la **🪟 DALLE**. Idem sur le **🧪 POT DE COUPE** (à droite). La **coupe est physique** : la quantité de diluant fait le **stretch**, et tu choisis le **palier** au sélecteur « Coupe » — de **Lévamisole** (donné mais nocif) à **Benzocaïne** (cher mais propre), via Lactose / Mannitol. Aucune perte.
3. **Mélanger** — une fois **coke + diluant** sur la dalle, **tourne le doigt dessus** → ça se coupe/homogénéise (teinte qui vire) et part en **PRODUIT** (grammes = coke + diluant ; **pureté diluée d'autant**, qualité = pureté × propreté de la coupe). Même un geste grossier marche.
4. **Ensacher** — **tape (ou maintiens) le bac 📦 PRODUIT** → chaque geste remplit un **pochon** (sachet zip carré plat) du **format** choisi (**1 / 5 / 25 g**, **2 tailles**), qui se pose sur la table et **se vend**. Pas de timing, pas de raté (petit = €/g plus élevé).

Un **halo lumineux** pulse sous la station active et un **bandeau de consigne** suit l'étape : la boucle coke + diluant → mix → sachet est guidée.

**Économie & progression :** **prix calibrés sur le marché réel (UE, €)** — coke en gros ~**38–52 €/g** selon la quantité (briques 50/100/250/500 g, pureté ~80–92 %), détail rue ~**50–78 €/g** (× qualité), agents de coupe à **quelques centimes/g** : le vrai coût d'un cut bâclé, c'est la **réputation**, pas l'agent. La **coupe** a 4 paliers — **propreté** (→ qualité/€/g) vs **nocivité** (→ réput) : le cheap (Lévamisole) maximise le volume mais plombe la réput, le premium (Benzocaïne) « passe ». **Niveaux (XP)** +2,5 %/niv. Boutique : **coke** (briques dégressives) & les 4 **coupes**, **presse à briquettes** (25 g), **auto-ensacheuse** + cadence. **Formes** inspirées de *Drug Dealer Simulator* (briques pressées empilées, pots cylindriques, pochons zip plats alignés). Persistance `localStorage` préfixée **`neige_`** (isolée de `hash_` / `gf_` / `gs_`).

**Feedback juteux** : sons synthétisés (WebAudio — flux de poudre, raclage du mix, zip, cha-ching), puffs de poudre, pochons qui s'alignent sur la table, secousse de caméra.

> Prototype de jeu, habillage purement visuel/stylisé.

### Jouer

- En ligne : **https://nobletsylvain.github.io/prototypes/neige/** (depuis le hub).
- En local : ouvrir `neige/index.html` dans un navigateur. **Caméra** : cadrage auto + **pinch pour zoomer** (sauvegardé).
