# Cristal — mini-jeu Méthamphétamine (core loop CrimWorld)

> Pendant de `neige` (coke) et `hash-slicer` (hash), côté **meth**.
> Contexte global commun : crédit grossiste, dégradation des coupants,
> **R1** (ressenti satisfaisant sans punition) + **R2** (progression qui
> *adoucit* la difficulté jusqu'à l'automatisation), boucle CrimWorld
> (réception à crédit → transformation → conditionnement → vente → réput/éco).

La meth a un geste signature que ni la coke ni le hash n'ont : le **cristal**
est un solide dur et brillant qu'il faut **casser**. C'est ça qu'on exploite :
le **broyage rythmé**. On part de gros cailloux bleus translucides, on tape en
rythme, ça **éclate en poudre mate**. La transfo visuelle cristaux → poudre est
le cœur du plaisir.

---

## 1) Trois variations de mini-jeu

Chaque variation couvre les 4 verbes demandés (**broyer + pesée + packaging +
coupe**), mais hiérarchise le geste différemment.

### Variation A — « Le Métronome » (broyage rythmé, tap/hold en cadence)
- **Broyer** : une pulsation (BPM) bat sous la cuve. Tu **tapes sur le temps**
  pour fracasser un caillou → poudre. Tap juste = grain fin (qualité haute) +
  **combo** qui enfle (snowball satisfaisant). Tap à côté = grain grossier
  (qualité plus basse) mais **ça broie quand même** (zéro échec → R1). Tu peux
  aussi **maintenir** : auto-broyage cadencé, qualité « correcte » plafonnée —
  le no-skill avance, le skill gagne plus.
- **Coupe** : tu verses du MSM dans la cuve (maintien sur le pot). Co-effet
  parallèle façon CrimWorld : plus de grammes, qualité diluée — jamais une
  punition scriptée, juste un arbitrage cupidité/réput.
- **Pesée + packaging** : tap la cuve → **drag sur la balance** pour remplir le
  sachet jusqu'au gabarit (point / 0,5 g / g / 8-ball). Snap au poids = « pesée
  nickel ».
- **Progression (5 outils)** : mortier → broyeur à main → électrique →
  industriel → **ligne externalisée** (broie tout seul). Chaque palier élargit
  la fenêtre de timing, accélère le BPM, monte le plancher de qualité.

### Variation B — « La Mandoline » (broyage au drag continu)
- **Broyer** : on **frotte** le caillou sur une plaque/grille au doigt (drag
  aller-retour). La vitesse du geste = finesse. Pas de rythme, du tactile pur.
- Coupe / pesée / packaging identiques.
- **Progression** : la grille devient plus fine, puis motorisée.

### Variation C — « Le Concassage » (tap de force / jauge de pression)
- **Broyer** : une jauge monte/descend ; tu **relâches dans le vert** pour
  écraser au bon dosage de force (trop = pulvérisé/perte, pas assez = cailloux).
  Single-shot, façon timing-bar de `hash-slicer`.
- Coupe / pesée / packaging identiques.
- **Progression** : presse hydraulique → automate.

---

## 2) Analyse rapide (forces / faiblesses)

| | R1 (ressenti, no-punish) | R2 (progression adoucissante) | Boucle CrimWorld | Verdict |
|---|---|---|---|---|
| **A — Métronome** | ✅ Tap toujours productif, le combo *récompense* sans punir. Très satisfaisant (snowball + son). | ✅✅ Les outils élargissent la fenêtre, montent BPM et plancher qualité → la pression rythmique *fond* jusqu'à l'auto. Lecture parfaite de la courbe. | ✅ Identique à neige (cuve, coupe parallèle, réput). Geste **propre à la meth** (casser le cristal). | **Choisi.** |
| **B — Mandoline** | ✅ Tactile, jamais raté. | ⚠️ Le drag motorisé tue le geste d'un coup (marche/arrêt), pas un *adoucissement* progressif. | ✅ Mais geste quasi identique au mélange de `neige` → peu de différenciation. | Bon mais redondant avec neige. |
| **C — Concassage** | ⚠️ Le « relâche dans le vert » **peut rater** → perte = punition. Contraire à R1. | ✅ Presse qui pardonne de plus en plus. | ✅ | Le plus punitif, à éviter pour R1. |

**Pourquoi A.** C'est la seule qui (1) donne un geste *signature meth* qu'aucune
autre boucle n'a déjà, (2) respecte R1 à la lettre (aucun tap perdu, le skill
ajoute du bonus au lieu d'enlever), (3) **incarne R2 dans la mécanique elle-même**
— la difficulté rythmique s'efface palier après palier jusqu'à la ligne
externalisée qui joue à ta place. Le combo + le son + l'éclatement visuel du
cristal = la dopamine.

---

## 3) Prototype retenu — « Le Métronome »

Voir `index.html` (WebGL/Three.js, mobile-first, jouable). Boucle :

```
ACHETER cristaux (crédit grossiste) + MSM (coupe)
   → BROYER  : tap/hold en cadence → cailloux bleus éclatent en poudre mate
   → COUPER  : verser MSM dans la cuve (+grammes, -qualité)  [co-effet parallèle]
   → PESER   : drag sur la balance pour remplir le sachet au gabarit
   → VENDRE  : prix = poids × €/g(format) × qualité × réput × bonus niveau
```

- **5 paliers d'outils** : Mortier & pilon → Broyeur à main → Électrique →
  Industriel → **Ligne externalisée** (auto-broyage, puis auto-ensachage avec
  l'auto-doseuse).
- **Impact éco/réput** : la **qualité** (timing du broyage + pureté d'import +
  propreté du coupant) pilote le prix de *toutes* les ventes via la réput ; un
  coupant nocif rapporte vite au volume mais plombe la réput (donc le prix).
- **Transformation visuelle** : la matière de la cuve **lerp** de cristal
  (bleu translucide, brillant, scintillant) vers **poudre mate** (blanc cassé,
  rugueux) à mesure du broyage.

---

## 4) Pseudocode prêt à intégrer (Unity / Godot)

API-agnostique : `dt` = delta time, `Stock`/`Cuve` = structs d'état. Les noms
collent au prototype JS pour que le portage soit mécanique.

### Constantes (paliers d'outils — incarne R2)
```
GRIND_TIERS = [
  { name:"Mortier & pilon",     gBeat:2.2, window:0.10, bpm:84,  qFloor:0.35, auto:false },
  { name:"Broyeur à main",      gBeat:3.5, window:0.13, bpm:96,  qFloor:0.45, auto:false },
  { name:"Broyeur électrique",  gBeat:5.5, window:0.16, bpm:112, qFloor:0.55, auto:false },
  { name:"Broyeur industriel",  gBeat:8.5, window:0.20, bpm:128, qFloor:0.65, auto:false },
  { name:"Ligne externalisée",  gBeat:12,  window:0.99, bpm:140, qFloor:0.80, auto:true  },
]
// window ↑, bpm ↑, qFloor ↑ : chaque palier ADOUCIT le rythme (R2).
```

### Broyage rythmé (tap = cœur du jeu)
```
state: beatTimer = 0, combo = 0

function Tick(dt):
    beatTimer += dt
    period = 60 / tier.bpm
    if beatTimer >= period:
        beatTimer -= period
        EmitBeatPulse()                 // visuel : l'anneau se contracte
    if tier.auto:                       // ligne externalisée : broie sans toi
        GrindChunk(tier.gBeat * dt, quality:0.92)

function OnTapCuve():                    // R1 : un tap ne rate JAMAIS de grammes
    period = 60 / tier.bpm
    phase  = beatTimer / period
    dist   = min(phase, 1 - phase) * period      // s jusqu'au temps le plus proche
    if   dist <= tier.window * 0.35: q = 1.0;            combo += 1; Feedback("PARFAIT")
    elif dist <= tier.window:        q = 1.0 - dist/tier.window*0.3; combo += 1; Feedback("BIEN")
    else:                            q = tier.qFloor;    combo  = 0; Feedback("RATÉ")  // broie quand même
    comboMult = 1 + min(combo, 10) * 0.08            // snowball plafonné 1.8×
    GrindChunk(tier.gBeat * comboMult, q)

function OnHoldCuve(dt):                  // no-skill : maintien = auto-tap "BIEN" plafonné
    if BeatJustFired(): GrindChunk(tier.gBeat, quality:0.78)

function GrindChunk(g, quality):
    g = min(g, Stock.crystalG)            // borné par le stock brut
    Stock.crystalG -= g
    Cuve.powderG   += g
    Cuve.qGrindSum += g * quality         // qualité de broyage pondérée
    Cuve.puritySum += g * Stock.purity    // pureté d'import pondérée
    Cuve.grindProgress = Cuve.powderG / (Cuve.powderG + Stock_loaded)  // 0→1 : tint cristal→mat
    SpawnShatterFX()
```

### Coupe (co-effet parallèle — arbitrage CrimWorld)
```
function OnPourCut(dt, cutAgent):         // MSM / Epsom / Diméthylsulfone
    g = CUT_RATE * dt
    Cuve.cutG      += g
    Cuve.cleanSum  += g * cutAgent.clean
    Cuve.harmSum   += g * cutAgent.harm
```

### Pesée + packaging (drag)
```
state: bagging=false, fillG=0

function OnScaleDragStart(): bagging = true; fillG = 0
function OnScaleDrag(dragPixels):
    if not bagging: return
    fillG = clamp(fillG + dragPixels * PESE_K, 0, FMT_TARGET * 1.2)
    if fillG >= FMT_TARGET: SealBag()     // snap au gabarit = "pesée nickel"
function OnScaleDragEnd():
    if bagging and fillG >= 0.02: SealBag()

function SealBag():
    bagging = false
    take    = min(fillG, Cuve.powderG + Cuve.cutG)
    quality = ProductQuality()
    DebitCuve(take)
    price = take * PricePerGram(take) * quality * rep * LevelMult()
    cash += price
    rep  += (quality - 0.55) * 0.05 - HarmAvg() * CutFraction()   // qualité↑réput, nocivité↓réput
    AddXP(...)
```

### Qualité produit & prix
```
function ProductQuality():
    grindAvg = Cuve.qGrindSum / Cuve.powderG
    pureAvg  = Cuve.puritySum / Cuve.powderG
    cleanAvg = (Cuve.cutG>0) ? Cuve.cleanSum / Cuve.cutG : 1
    return clamp(0.15 + 0.45*grindAvg + 0.25*pureAvg + 0.15*cleanAvg, 0.2, 1.0)

function PricePerGram(w):                 // petit sachet = €/g plus cher (détail)
    return interp(FMT_TABLE, w)           // 0.2g→110 … 3.5g→50 €/g (à qualité 100%)
```

### Boucle simplifiée (1 frame)
```
function GameLoop(dt):
    Tick(dt)                  // métronome + auto-broyage si ligne externalisée
    UpdatePour(dt)            // coupe en cours ?
    UpdateBagging(dt)         // drag balance
    UpdateAuto(dt)            // auto-doseuse (palier boutique)
    UpdateFX(dt); Render()
```

Portage : remplace `SpawnShatterFX`/`EmitBeatPulse`/`Render` par particules +
Tween Unity/Godot ; l'état (`Stock`, `Cuve`, `cash`, `rep`, `tier`) est du C#/
GDScript pur. Le timing rythmé n'utilise **aucun aléatoire de conséquence** : la
qualité sort du geste du joueur ET la **pureté d'import est fixe par taille de
lot** (`CRYSTAL_PURITY`, gros lot = moins cher mais moins pur = arbitrage
tracable) — compatible invariant CrimWorld. L'aléatoire ne sert qu'à la
présentation (éclats, choix de matériau des particules).
