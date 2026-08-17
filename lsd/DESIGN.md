# Buvard — core loop LSD (dosage liquide · découpe · dilution)

> Proto de la série CrimWorld. Même squelette économique que Hash Slicer / Neige :
> **crédit grossiste** (dette), **dégradation par les coupants/dilution**, **R1 = ressenti
> tactile**, **R2 = progression d'outils**. Invariant CrimWorld respecté : *la qualité est
> le levier unique* ; le volume écoulé et la réputation sont deux **co-effets parallèles**,
> jamais une chaîne « moins de qualité → moins de ventes → heat ». Aucune conséquence n'est
> tirée au hasard : tout remonte à un geste du joueur (visée de la goutte, ratio de dilution,
> propreté de la découpe) et porte une `cause` lisible affichée dans le rapport.

---

## 1. Trois variations de mini-jeu

### Variation A — « Le compte-gouttes » (dosage à la goutte)
On drague la pipette au-dessus d'une feuille de buvards (grille 10×10). Sur chaque case,
on **maintient pour titrer** (un anneau se remplit) et on **relâche pour déposer** la goutte.
- Sous-doser → buvard *placebo* (faible) ; sur-doser → *overdose* (fait peur au client) **et**
  gaspille la solution (moins de buvards au total).
- Le sweet-spot exact (dose = 1.0) donne un buvard *calibré*.
- **Geste** : viser + presser. Ceil de qualité le plus haut → récompense la dextérité.

### Variation B — « La cuve de dilution » (arbitrage du ratio)
On verse solution + solvant dans une cuve ; le **ratio fixe la puissance**. Les buvards teintés
par la cuve **deviennent plus pâles** à mesure qu'on dilue. Diluer plus = **plus de buvards**
(volume ↑) mais **plus pâles/plus faibles** (qualité ↓ → prix ↓, réputation ↓).
- **Geste** : verser (drag d'un curseur/jet). Arbitrage cupidité vs prudence très lisible.

### Variation C — « La grille & le massicot » (trempage + découpe au swipe)
On trempe la feuille entière d'un geste, puis on **swipe le long des perforations** pour
séparer la feuille en buvards. Droiture/précision du swipe = buvards nets vs **déchirés** (perte).
- **Geste** : swipe satisfaisant (comme couper). Ajoute une mécanique de déchet et un skill de coupe,
  mais la précision de dose y est abstraite.

---

## 2. Évaluation

| Critère | A — Compte-gouttes | B — Cuve dilution | C — Grille/swipe |
|---|---|---|---|
| **Ressenti tactile (R1)** | ★★★★★ viser+presser, haut plafond | ★★★☆☆ un seul geste de versée | ★★★★☆ swipe juteux |
| **Boucle CrimWorld** | ★★★★★ lie la *qualité* (levier unique) au skill | ★★★★☆ porte la courbe volume/qualité | ★★★☆☆ ajoute le déchet |
| **Arbitrage** | moyen (dose par dose) | **fort** (le ratio EST l'arbitrage) | faible (propreté) |
| **Lisibilité de la cause** | ★★★★★ « 12 buvards surdosés » | ★★★★☆ « lot dilué ×3 » | ★★★☆☆ « 8 déchirés » |
| **Profondeur seul** | moyenne (répétitif seul) | mince (1 décision/lot) | mince (skill unique) |

**Verdict** : aucune des trois, isolée, ne tient une boucle complète — A devient répétitif,
B n'a qu'une décision par lot, C n'a qu'un skill. Mais elles sont **complémentaires** et
correspondent exactement aux trois temps canoniques de la boucle CrimWorld : *préparer → doser → couper*.

---

## 3. Sélection — synthèse autour de A

On **sélectionne A (le compte-gouttes) comme cœur de skill** — plus haut plafond tactile,
et c'est le geste qui lie le plus directement la **qualité** (levier unique) au joueur — et on
**intègre B et C comme cadre** :

- **B (cuve)** devient la *courbe économique* : le ratio de dilution règle le couple
  **volume ↑ / plafond de qualité ↓**. C'est l'arbitrage cupidité↔prudence de la boucle.
- **A (gouttes)** est le *cœur d'exécution* : dans le plafond fixé par la dilution, ta visée
  décide la qualité réelle de chaque buvard.
- **C (swipe)** est le *geste de finition* : la propreté de la découpe convertit la feuille en
  stock vendable, avec un déchet traçable.

Boucle finale : **Achat (crédit) → Dilution (cuve) → Dosage (pipette) → Découpe (swipe) → Vente → Rapport (causes) → horloge de dette.**

### Progression d'outils (R2) — un vrai arbitrage d'externalisation
1. **Pipette** : 100 % manuel, titrage à la main. Plafond qualité **1.00**. Lent, artisanal, max de contrôle.
2. **Doseur semi-auto** : la goutte s'aimante près de la case et délivre une dose régulière.
   Rapide, faible variance, mais plafond **0.92** (moins de perfection artisanale).
3. **Machine externalisée** : la feuille part dehors, dosée instantanément en gros volume,
   mais **commission de 18 %** sur la vente + plafond qualité **0.80** + plafond de réputation.
   → On échange contrôle et marge contre vitesse et volume.

---

## 4. Pseudocode prêt à porter (moteur mobile)

Économie déterministe, nombres en constantes nommées (réglage humain plus tard).

```pseudo
CONST  N=10, TABS=100
CONST  VIAL_DOSES=60          # doses "idéales" dans une fiole non diluée
CONST  DEBT_PER_VIAL=80       # crédit grossiste -> dette
CONST  PRICE_BASE=6           # € par buvard calibré (qualité 1)
CONST  FEE_MACHINE=0.18
CONST  CEIL = { pipette:1.00, semi:0.92, machine:0.80 }

# --- Dilution : la courbe volume vs qualité (levier unique = qualité) ---
potencyPerDrop(dil)  = BASE_POTENCY / (1 + dil*0.5)     # 0..3 -> 1.0,0.8,0.66,0.57
dosesAvailable(dil)  = VIAL_DOSES * (1 + dil)           # plus dilué -> plus de doses

# --- Dosage : la visée du joueur décide la qualité, jamais le hasard ---
accuracy(dose):                     # dose en multiples de l'idéal (1.0)
    if dose <= 1: return dose                       # sous-dose -> placebo
    else:         return max(0, 1 - (dose-1)*0.7)   # sur-dose  -> overdose
tabQuality(dose, dil, tool) = min(CEIL[tool], potencyPerDrop(dil)) * accuracy(dose)
solutionUsed += dose                # l'overdose vide la fiole plus vite

# --- Découpe : propreté du swipe -> déchet traçable ---
on swipe near perforation line L:
    cuts[L] = true
    if offset(swipe, L) > TOL: tornTabs += tabsAlong(L)   # déchet
sheetReady when all 18 internal lines cut

# --- Vente : prix suit la qualité ; volume & réput = co-effets parallèles ---
sell():
    sold      = separatedTabs - tornTabs
    revenue   = Σ_tab PRICE_BASE * q_tab * repMult * levelMult
    if tool==machine: revenue *= (1 - FEE_MACHINE)
    cash += revenue
    # réputation = co-effet de la QUALITÉ moyenne, PAS du volume
    defects = count(overdose) + count(placebo)
    rep    += (avgQuality - 0.55)*REP_GAIN - defects*REP_DEFECT
    report += cause("Rép", avgQuality, defects, dil, tool)   # contrat `cause`
    debtTick()    # horloge de dette grossiste
```

Mapping moteur mobile (Unity/Godot) :
- Grille = pool de 100 quads ; `q_tab` pilote `tint` (lightness = dilution, alpha = dose, rouge = overdose).
- Pipette = objet draggable ; *press-hold* → remplit `dose` à `DOSE_RATE`/s ; *release* → commit.
- Swipe = gesture recognizer ; projette le trait sur les 9+9 lignes ; `offset` → net/déchiré.
- Cuve = slider/jet ; recolore en direct le matériau « encre » et re-teinte les buvards (feedback pâleur).
- Persistance : préfixe `lsd_*`, `SAVE_VERSION` pour reset propre après rééquilibrage.

> Voir `index.html` pour l'implémentation jouable (canvas 2D, zéro dépendance).
