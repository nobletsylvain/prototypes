# Référentiel mini-jeux — R1 à R10

> **Source de vérité des règles de design** des core loops tactiles de ce dépôt
> (`hash-slicer`, `green-front`, `guitar-shito`, `neige`, et leurs forks).
> Ce document était jusqu'ici **cité mais jamais écrit** (`CrimWorld/CLAUDE.md`
> renvoie à « R1–R6 / R9 / R10 du référentiel prototypes » sans fichier source).
> Le voici. **v0.1 — à valider/amender par le créateur.**
>
> **Provenance des règles** (honnêteté) :
> - **R9** et **R10** sont repris *mot pour mot* des citations existantes.
> - **R2 / R4 / R5** formalisent le triptyque déjà cité (« ressenti, satisfaction
>   décroissante, vanne de délégation »).
> - **R1 / R3 / R6 / R7 / R8** sont **reconstruits** pour compléter la
>   numérotation de façon cohérente avec ce que les prototypes incarnent déjà et
>   avec les invariants de `CrimWorld/CLAUDE.md`. À confirmer.
>
> Chaque règle suit le même gabarit : **énoncé · pourquoi · autorisé/interdit ·
> test de conformité · état dans les protos**.

---

## Vue d'ensemble

| # | Règle | Axe |
|---|---|---|
| **R1** | Geste direct et physique | Le geste |
| **R2** | Ressenti juteux obligatoire | Le geste |
| **R3** | Feeling > skill (ressenti, pas mire de précision) | Le geste |
| **R4** | Satisfaction décroissante par design | Durée de vie du geste |
| **R5** | Vanne de délégation dosée | Durée de vie du geste |
| **R6** | La délégation ne bat jamais le geste bien joué | Durée de vie du geste |
| **R7** | Chaîne bulk → retail lisible | Économie |
| **R8** | Aucun aléatoire ne pilote l'état/les conséquences | Économie |
| **R9** | Équilibrage systémique, pas local | Économie |
| **R10** | Qualité/pureté = un seul levier | Économie |

Les trois premiers axes (R1–R6) **définissent** un mini-jeu tactile : une slice
qui valide un *arbitrage abstrait* (ex. CrimWorld « La Bascule », curseur de
ratio) n'incarne PAS un mini-jeu tactile et **n'est pas soumise à R1–R6** — mais
reste soumise à R8/R10.

---

## Le geste

### R1 — Geste direct et physique

**Énoncé.** Le cœur d'un mini-jeu est une **manipulation directe** de la matière
au doigt (tap, maintien, glissé, swipe), pensée mobile-first et jouable à une
main. Pas de menu qui *simule* l'action : on touche la chose.

**Pourquoi.** L'intérêt naît du contact, pas de la lecture d'un panneau de
contrôle. Un curseur abstrait (`<input type=range>`) est un réglage, pas un
geste.

**Autorisé / interdit.**
- ✅ maintenir le doigt sur la pile pour verser, glisser le long de la branche,
  taper pile au passage de la barre.
- ❌ remplacer le geste par un slider ou un champ numérique (sauf slice
  d'arbitrage assumée, hors R1–R6).

**Test de conformité.** Le geste principal se déclenche-t-il par un
`pointerdown/move/up` sur l'objet 3D/canvas, et non par un widget de formulaire ?

**État dans les protos.** ✅ partout pour le geste central. ⚠️ `green-front` (et
`green-front-v3` en l'état) garde un **slider de stretch** (`#strack`) — c'est
précisément l'écart à R1 que v3 voulait corriger (mais le dosage tactile n'y est
pas branché).

---

### R2 — Ressenti juteux obligatoire

**Énoncé.** Tout geste porte un **feedback multi-sensoriel immédiat** : son
synthétisé, secousse de caméra, particules, et un retour d'état (combo, jugement,
étiquette). L'haptique (`navigator.vibrate`) est attendue sur mobile.

**Pourquoi.** C'est le « juice » : ce qui fait qu'un geste répété reste agréable
*au début*. Sans lui, R4 (décroissance) part déjà du plancher.

**Autorisé / interdit.**
- ✅ aléatoire de **présentation** ici (dispersion des particules, jitter,
  enveloppe de bruit audio) — cf. R8.
- ❌ un geste « muet » sans retour, ou un seul feedback global pour N gestes
  (ex. conditionner tout un bac d'un coup sans micro-récompense par unité).

**Test de conformité.** Le geste produit-il au moins **son + retour visuel** dans
la même frame ? L'haptique est-elle câblée ?

**État dans les protos.** 🟢 fort sur `guitar-shito` (audio par combo, jugement),
`hash-slicer-v2` (haptique + bump matière). 🟠 `neige` plat (pas de jugement, mix
auto-résolu). `hash-slicer` v1 n'a **pas** d'haptique.

---

### R3 — Feeling > skill (ressenti, pas mire de précision)

**Énoncé.** Le geste se joue **au ressenti**, pas à la mire de précision
millimétrée. Mais « pas de skill » ≠ « pas d'enjeu » : il doit rester un
**arbitrage** (vitesse vs propreté, débit vs dépassement) avec un **échec
possible**.

**Pourquoi.** Un geste 100 % automatisable de tête (maintenir jusqu'au seuil)
n'a aucun pic de satisfaction *haut* à faire décroître : il est plat-puis-
ennuyeux. Un geste qui exige une précision d'horloger fatigue le pouce. La cible
est entre les deux : **lisible, tolérant, mais conséquent**.

**Autorisé / interdit.**
- ✅ une zone de réussite généreuse, une inertie qui pardonne mais punit l'excès.
- ❌ un geste sans aucun risque d'échec ni arbitrage (ex. un mix qui se termine
  au temps passif, doigt immobile) — le geste devient décoratif.
- ❌ une fenêtre de timing punitive façon rhythm-game hardcore.

**Test de conformité.** Existe-t-il un **résultat raté** atteignable par un geste
négligent, et un arbitrage que le joueur *sent* sans le calculer ?

**État dans les protos.** ⚠️ `neige` revendique « feeling > skill, rien à viser »
mais tombe dans le piège : le mix se complète seul (`homog += dt*MIX_TIME_K`),
geste décoratif → aucun enjeu. C'est la mauvaise lecture de R3 : *feeling* ≠
*rien à faire*.

---

## Durée de vie du geste

### R4 — Satisfaction décroissante par design

**Énoncé.** La satisfaction d'un geste répété **doit décroître volontairement**.
C'est un mécanisme conçu (rendement marginal qui baisse, exigence qui se resserre
sans gain), pas un creux d'ennui subi par monotonie.

**Pourquoi.** La décroissance est le **moteur narratif de la progression** :
c'est elle qui rend la vanne de délégation (R5) désirable au bon moment. Sans
elle, soit le joueur s'ennuie sans solution, soit il automatise par hasard.

**Autorisé / interdit.**
- ✅ la 20ᵉ unité d'un lot rapporte/juicy moins que la 1ʳᵉ ; le geste reste
  faisable mais cesse d'être *gratifiant*.
- ❌ un geste qui **se facilite** avec la répétition (un combo qui pardonne de
  plus en plus) — c'est l'inverse de R4.
- ❌ compter sur la seule monotonie pour lasser (« il finira par en avoir marre »).

**Test de conformité.** Peux-tu nommer la variable qui fait *décroître* l'intérêt
du geste sur un même lot ? Si non, R4 n'est pas implémentée.

**État dans les protos.** 🔴 **jamais conçue.** Pire à contresens : `guitar-shito`
*facilite* le geste via le combo (`keep += combo*0.012`). C'est la règle la moins
respectée du dépôt.

---

### R5 — Vanne de délégation dosée

**Énoncé.** Il existe une **automatisation** pour se décharger du geste, **dosée**
sur deux plans : elle arrive *après* que le joueur a vécu la décroissance (R4),
et de préférence en **continu** (curseur de % délégué) plutôt qu'en interrupteur
on/off.

**Pourquoi.** La vanne transforme la lassitude en **décision économique**
(« je paie pour ne plus faire ça »). Trop tôt, elle vide le jeu ; absente, elle
emprisonne le joueur dans la corvée.

**Autorisé / interdit.**
- ✅ massicot/auto-doseuse/auto-ensacheuse/auto-bucker débloqués par paliers de
  prix croissants ; idéalement un ratio réglable.
- ❌ aucune vanne du tout (le joueur lassé est piégé).
- ❌ une vanne qui **supprime intégralement** une phase d'un coup sans transition.

**Test de conformité.** Le geste central est-il délégable ? Le déblocage tombe-t-il
*après* un temps de jeu manuel, pas dès le départ ?

**État dans les protos.** 🟢 étagée sur `hash-slicer` v1, 🟢 la mieux faite sur
`neige` (auto-ensacheuse). 🔴 **absente** sur `hash-slicer-v2` (régression).
🟠 interrupteur brutal sur `green-front` (auto-bucker on/off).

---

### R6 — La délégation ne bat jamais le geste bien joué

**Énoncé.** Une vanne de délégation est une **commodité taxée**, pas une
optimisation. Automatiser doit coûter quelque chose (décote de marge, perte de
qualité, coût récurrent) de sorte que **le geste parfaitement joué reste au
moins aussi rentable** que la machine.

**Pourquoi.** Si la machine est strictement supérieure au geste, l'arbitrage
disparaît : il n'y a plus de raison de jouer, seulement d'attendre l'achat. La
vanne doit soulager l'ennui, pas surclasser la compétence.

**Autorisé / interdit.**
- ✅ auto-ensacheuse à **−15 %** de marge (`neige` : `price * 0.85`) : on délègue
  *en payant*.
- ❌ machine qui perd 5 % quand le geste manuel raté en perd 68 %, ou qui force
  un grade A gratuit — automatiser devient meilleur que bien jouer.

**Test de conformité.** À l'optimum, le revenu/heure du geste parfait est-il ≥ à
celui de la machine ? Si la machine gagne, R6 est violée.

**État dans les protos.** 🟢 `neige` (auto-ensacheuse taxée, le patron à
généraliser). 🔴 `hash-slicer` (massicot auto > geste raté), 🔴 `green-front`
(auto-bucker sans malus). R6 est le **correctif transversal** des vannes.

---

## Économie

### R7 — Chaîne bulk → retail lisible

**Énoncé.** L'économie suit **un seul fil conducteur de la matière** : achat en
gros → transformation (le ou les gestes) → vente au détail, où **le petit format
vaut plus cher au gramme**. Rien ne se perd sans destination (déchets revendables).

**Pourquoi.** C'est la colonne vertébrale qui donne du *sens* aux gestes : on
voit la valeur monter à chaque étape. La dégressivité gros/petit crée l'incitation
à transformer plutôt qu'à revendre en l'état.

**Autorisé / interdit.**
- ✅ savonnette 250 g → barrettes → doses 1/5 g ; brique → produit → pochons.
- ❌ une source de revenu déconnectée de la chaîne (bonus de revente sans
  contrepartie matière) qui court-circuite le fil.

**Test de conformité.** Peut-on tracer chaque euro gagné jusqu'à une unité de
matière achetée en gros et transformée ? Le €/g monte-t-il quand le format baisse ?

**État dans les protos.** 🟢 respecté partout (chaîne claire, formats dégressifs).
⚠️ bacs « fantômes » (bac B de `green-front`, déchets annoncés mais absents de
`guitar-shito`) brouillent la lisibilité sans casser la règle.

---

### R8 — Aucun aléatoire ne pilote l'état/les conséquences

**Énoncé.** `Math.random` ne décide **jamais** d'une conséquence ou d'un état
(prix obtenu, qualité produite, descente, pureté d'un lot). L'aléatoire de
**présentation** (particules, jitter, grain, brouillage d'un affichage opaque)
est autorisé et n'écrit jamais dans l'état.

**Pourquoi.** Invariant partagé avec CrimWorld : toute conséquence doit remonter
à une **décision** du joueur, traçable. Le hasard de conséquence casse la boucle
« mon problème ↩ ma décision passée » et rend l'équilibrage non reproductible.

**Autorisé / interdit.**
- ✅ `burstPuffs`, jitter des pochons, secousse caméra, pseudo d'un commentateur.
- ❌ `purity = 0.80 + Math.random()*0.12` → prix ; `Math.random() < 0.07` → descente.

**Test de conformité.** Pour chaque `Math.random`, demander : *écrit-il dans une
variable qui influence un gain, une qualité, une perte ou un événement ?* Si oui,
violation.

**État dans les protos.** 🔴 4 violations vérifiées (`neige:674`,
`green-front:740` & `:1045`, `hash-slicer:1163`). 🟢 maquettes CrimWorld propres.
Détail et correctifs : `REVUE_MINIJEUX.md` §2.

---

### R9 — Équilibrage systémique, pas local

**Énoncé.** *(repris de `CrimWorld/CLAUDE.md`)* La tension se règle **au niveau de
la courbe entière**, jamais sur un geste isolé. **Un outil qui réduit une friction
doit être compensé ailleurs.** Les constantes d'équilibrage pilotent la courbe,
pas un détail.

**Pourquoi.** Sans compensation, chaque achat de boutique est un gain net : la
courbe de difficulté s'effondre et le jeu se résout en empilant des bonus. La
compensation maintient l'arbitrage vivant à toutes les étapes de progression.

**Autorisé / interdit.**
- ✅ vanne qui accélère mais décote (R6) ; gabarit qui élargit la zone verte mais
  baisse le €/g ; brique dégressive compensée par une friction d'échelle (heat,
  coût de stockage).
- ❌ empiler des réductions de friction (achats gros dégressifs **+** bonus de
  revente **+** multiplicateur de niveau) sans **aucun** coût croissant en face.

**Test de conformité.** Pour chaque item de boutique : *quelle est sa
contrepartie systémique ?* Si la réponse est « aucune », R9 est violée.

**État dans les protos.** 🟠 généralisé : bonus nets fréquents, `heat` câblée mais
**morte** dans `guitar-shito`, gabarit non compensé dans `hash-slicer`. Seul
contre-exemple sain : l'auto-ensacheuse taxée de `neige`.

---

### R10 — Qualité/pureté = un seul levier

**Énoncé.** *(repris de `CrimWorld/CLAUDE.md`)* Qualité et pureté sont **un seul
levier**, pas deux systèmes séparés. Le geste de coupe/dilution incarne *à lui
seul* le couple qualité/pureté ; il n'existe pas de curseur/chimie de pureté à
part.

**Pourquoi.** Deux axes découplés multiplient la complexité sans profondeur et
rouvrent la porte à des combinaisons incohérentes (« propre mais nocif »). Un
levier unique garde l'arbitrage net : plus de volume ↔ moins de qualité.

**Autorisé / interdit.**
- ✅ un seul scalaire (grade, stretch, pureté du cut) dont **dérivent** prix *et*
  réputation.
- ❌ deux variables d'état parallèles (`dilClean` *et* `dilHarm`) alimentant deux
  conséquences indépendantes.

**Test de conformité.** Y a-t-il **une seule** variable d'état qui porte la
qualité, ou deux nombres que le joueur règle séparément ?

**État dans les protos.** 🟢 respecté partout (grade, stretch). 🟢 `green-front-v3`
le plus pur (bac B supprimé). 🔴 **`neige`** : seule violation (`dilClean` /
`dilHarm` = deux états). Correctif : fusionner en un scalaire « pureté du cut ».

---

## Comment se servir de ce référentiel

- **Avant de coder un nouveau geste** : passer R1–R3 (est-ce un vrai geste
  tactile, juteux, au ressenti ?).
- **Avant d'ajouter une boutique/vanne** : passer R5–R6–R9 (dosée, taxée,
  compensée ?).
- **Avant tout commit** : passer R8 (aucun `Math.random` n'a glissé dans une
  conséquence ?) et R10 (un seul levier ?).
- **`CrimWorld/CLAUDE.md`** peut désormais pointer ici plutôt que vers un
  référentiel fantôme (à mettre à jour côté CrimWorld, hors de ce dépôt).

*v0.1 — document de travail. Les énoncés R1/R3/R6/R7/R8 sont une reconstruction
proposée : à valider, renuméroter ou réécrire selon ton intention d'origine.*
