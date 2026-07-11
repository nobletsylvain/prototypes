# NEIGE — coupe cocaïne · doc de conception

> Core loop CrimWorld : **opérateur → empire**. Le grossiste te fronte de la
> coke **à crédit**, tu la **dégrades à la coupe** pour gonfler la quantité, tu
> **distribues**, tu **rembourses avant l'échéance**. Score d'un lot =
> `volume × pureté`. Ton : cash, street, satisfaisant.
>
> Ce document répond à la commande : **3 variations → choix → prototype détaillé
> + code Unity/Godot**. Le prototype jouable vit dans `neige/index.html`
> (WebGL/Three.js, mobile). Ce `.md` est la note de design qui l'accompagne.

## Rappel des deux règles d'or

- **R1 — Mini-jeux = ressenti de l'action manuelle.** Drag, swipe, hold. *Aucun
  malus en cas d'échec*, juste une légère frustration. Doit rester ludique et
  récompensant.
- **R2 — Progression par paliers** qui adoucit le travail jusqu'à
  l'automatisation / externalisation. La **frustration résiduelle** est le
  moteur d'achat d'outils.

Et la **mécanique coupants**, à intégrer partout : cuve dédiée, drag/slider pour
ajouter les coupants (lévamisole, lactose, mannitol, benzocaïne…), le volume
monte en temps réel pendant que la pureté descend, animation de mélange, jamais
de game-over. Progression outils : **manuel → assisté → externalisé**.

---

# 1. Trois variations de concept

Les quatre gestes du dealer de coke à couvrir : **peser**, **découper les
doses**, **ensacher**, **couper (diluer)**. Trois façons de les assembler en
core loop.

## Variation A — « La Dalle » (manipulation physique continue)

Une plaque de verre (la *dalle*) comme table de mixage. On **maintient le doigt**
sur la brique de coke pour faire couler un flux de poudre, on **maintient** sur
le pot de diluant pour en verser, puis on **tourne le doigt en rond** sur la
dalle pour mélanger (la teinte passe du blanc pur au beige coupé en temps réel).
Le produit fini tombe dans un bac ; on **tape/maintient** le bac pour qu'un
pochon se remplisse et parte à la vente. Peser = lire le tas qui grossit ;
découper les doses = le format de sachet (1 / 5 / 25 g) ; ensacher = le tap final.

- **Forces (R1)** : geste 100 % direct, tactile, jamais raté — verser plus ou
  moins, mélanger plus ou moins, c'est *toi* qui sens la matière. Très
  satisfaisant, zéro skill-check, parfait pour le ton street.
- **Forces (R2 + crédit)** : la coupe est un **arbitrage** lisible — plus de
  diluant = plus de grammes pour rembourser vite, mais pureté/réput en chute.
  Chaque palier d'outil (spatule → presse → ensacheuse → équipe) **retire un
  geste** du flux ; on sent la friction qu'on paie pour supprimer.
- **Faiblesses** : le geste « tourner en rond » peut lasser à très haut volume si
  rien ne l'automatise → l'externalisation (R2) doit arriver assez tôt. Demande
  un rendu 3D temps réel correct (poudre, puffs, pochons).

## Variation B — « Le Rail » (swipe rythmique de découpe)

Vue rapprochée d'un miroir. La coke arrive en tas ; on **swipe** avec une carte
pour étaler, aligner et **découper des rails/doses** au rythme (façon Guitar
Hero / fruit-ninja). La coupe se fait dans une **cuve à part** via un slider
avant la phase de découpe : on règle le taux de dilution, le volume monte, la
pureté descend, on valide. Ensachage = swipe de chaque dose dans un pochon.

- **Forces (R1)** : le swipe de découpe est nerveux, immédiat, *juteux* ; très
  lisible en « ressenti ». Le slider de coupe isole proprement l'arbitrage
  cupidité/prudence sur un seul écran.
- **Faiblesses (R1/R2)** : un mini-jeu rythmique glisse vite vers le **skill-check**
  (tempo, précision) — tentation d'un malus en cas de raté, ce que R1 interdit.
  La coupe (slider) et la découpe (swipe) sont **deux écrans séparés** : la cuve
  est « à côté » au lieu d'être au cœur du geste, donc l'arbitrage est moins
  charnel. L'automatisation d'un jeu de rythme est moins évidente à mettre en
  scène (qu'est-ce qu'une « équipe » qui swipe à ta place ?).

## Variation C — « La Balance » (pesée de précision + dosage)

Coeur = une **balance numérique**. On verse la coupe via un slider dans la cuve
(volume↑ / pureté↓), puis on **drag** la poudre coupée vers une balance pour
peser des doses exactes (1 g, 5 g…), un curseur de masse à stabiliser dans le
vert ; ensachage en maintenant au-dessus du sachet. La progression d'outils
remplace la balance manuelle par une doseuse, puis une ligne d'ensachage.

- **Forces (R2 + crédit)** : la pesée exacte colle au fantasme « pro », et la
  doseuse automatique est une externalisation **évidente** et désirable (R2 nickel).
  L'économie « petite dose = €/g plus élevé » tombe naturellement.
- **Faiblesses (R1)** : « stabiliser un curseur dans le vert » est un
  **skill-check déguisé** — rater la fenêtre crée de la frustration *punitive*,
  pas la « légère frustration ludique » de R1. La pesée est aussi le geste le
  moins *street*, le plus clinique ; on perd le côté cash/sale.

---

# 2. Choix : Variation A — « La Dalle »

**A gagne** parce qu'elle est la seule où **la cuve de coupe EST le geste
principal**, pas un écran annexe. La poudre qu'on verse, mélange et ensache au
doigt respecte R1 à la lettre (aucun seuil de réussite, aucun malus — verser
trop de diluant n'est jamais « raté », c'est juste un *choix* qui paiera
en réput). C'est aussi la variation qui sert le mieux **la boucle crédit** : le
seul levier pour rembourser vite le front du grossiste est de **stretcher** le
produit à la coupe, et ce levier est littéralement sous le doigt du joueur — la
tension « je coupe plus pour solder ma dette, mais je crame ma réput » est
*physique*, pas abstraite. Enfin, chaque palier d'outil **retire un geste** du
flux (R2), ce qui rend l'automatisation/externalisation lisible et désirable :
on achète pour **supprimer la friction qu'on vient de ressentir**.

> B et C ne sont pas jetées : le **slider de coupe isolé** de B est un bon mode
> « réglage rapide » pour les gros volumes, et la **doseuse** de C est la
> meilleure incarnation du palier d'externalisation. On les greffe comme
> upgrades dans A plutôt que comme loops concurrents.

---

# 3. Prototype détaillé (Variation A)

## 3.1 Boucle de jeu (une session)

```
RÉCEPTION ──► VERSER ──► COUPER (cuve) ──► MÉLANGER ──► ENSACHER ──► VENDRE
   ▲  front à crédit        slider/drag       drag rond      tap/hold     │
   │                        volume↑ pureté↓                               │
   └──────────────── REMBOURSER avant échéance ◄───── cash ───────────────┘
```

1. **Réception** — au grossiste, brique de coke **cash** *ou* **à crédit**
   (front). Le front crée une **dette** avec une **échéance** (compte à rebours).
2. **Verser** — `hold` sur la brique → flux de coke sur la dalle. `hold` sur le
   pot de coupe → flux de diluant. Le tas grossit en temps réel.
3. **Couper / Mélanger** — `drag` circulaire sur la dalle : homogénéise. Au
   commit : `volume = coke + diluant`, `pureté = coke / volume`,
   `qualité = f(pureté, propreté du diluant)`. La teinte vire blanc→beige.
4. **Ensacher** — `tap`/`hold` le bac PRODUIT : un pochon se remplit au format
   choisi (1 / 5 / 25 g) et se vend. Petit format = €/g plus élevé.
5. **Vendre & Rembourser** — chaque vente rentre du cash. On **rembourse** la
   dette avant l'échéance pour garder la confiance du grossiste (→ fronts plus
   gros). Dépassement = **pas de game-over** : le crédit gèle + petit malus de
   réput **tracé** (« dette en retard »), jamais une mort.

## 3.2 Contrôles tactiles

| Geste | Entrée | Effet |
|---|---|---|
| Verser coke | `hold` sur la brique | flux de poudre → dalle (`POUR_RATE` g/s) |
| Verser coupe | `hold` sur le pot (palier sélectionné en bas) | flux de diluant → dalle |
| **Choisir le diluant** | tap dans la barre « Coupe » | léva / lacto / manni / benzo |
| Mélanger | `drag` en rond sur la dalle | homogénéité ↑ (au doigt) + un peu au temps |
| Ensacher | `tap` (1 dose) / `hold` (rafale) sur le bac PRODUIT | vend au format choisi |
| Format dose | tap dans la barre « Sachet » | 1 / 5 / 25 g |
| Caméra | pinch | zoom (persistant) |

Aucun de ces gestes ne peut être « raté ». La seule friction est la **durée** du
geste — exactement ce que les outils des paliers viennent raccourcir (R2).

## 3.3 Cuve de coupe & feedback visuel temps réel

- Le **tas sur la dalle** scale en temps réel avec `coke + diluant` (volume).
- La **teinte** lerp `blanc pur → beige` selon l'homogénéité de la coupe.
- **Puffs** de poudre à chaque flux et à chaque mélange (juteux, ton street).
- Le label dalle affiche en direct `Xg coke + Yg coupe · homog%`.
- Au commit : toast `Coupé ×1.8 → +Z g (pureté 54 %, qual 71 %)` — l'arbitrage
  est **chiffré et tracé**, jamais caché.

## 3.4 Économie (calibrée sur le marché UE réel)

- **Gros (achat)** : ~38–52 €/g dégressif selon la taille de brique ; pureté
  d'import 80–92 %.
- **Détail (vente)** : `prix = grammes × €/g(format) × qualité × réput × bonus_niveau`.
  Petit sachet = €/g plus élevé. Qualité = `f(pureté, propreté du diluant)`.
- **Coupe** : les diluants coûtent des centimes/g — leur vrai coût n'est pas
  l'agent mais la **réputation** (donc le prix de *toutes* les ventes suivantes).
  Cheap + nocif (lévamisole) → volume immédiat mais réput qui plonge.
- **Crédit** : front = dette `D`, échéance `T`, confiance grossiste `C ∈ [0,1]`.
  Limite de front `≈ C × plafond`. Rembourser avant `T` → `C↑` (fronts plus
  gros) ; dépasser `T` → crédit gelé + `réput↓` tracé. Jamais de game-over (R1).
- **Réputation** opaque-ish, bornée `[0.7 … 1.2]`, bouge à chaque lot selon
  qualité et nocivité — c'est le multiplicateur long terme.

## 3.5 Les 5 paliers d'outils (manuel → assisté → externalisé)

| Niv | Outil | Débloque / change | Geste retiré |
|---|---|---|---|
| **1** | 🖐️ **Main nue** | verser / mélanger / ensacher au doigt | — (état de base) |
| **2** | 🥄 **Spatule de coupe** | mélange ~2× plus rapide (`MIX_TIME_K↑`) | raccourcit le *mélange* |
| **3** | 🗜️ **Presse à briquettes** | débloque le format **25 g** (semi-gros), €/g de gros mais volume | raccourcit l'*ensachage* (grosse unité) |
| **4** | 🤖 **Auto-ensacheuse** | ensache **et vend** seule (cadence améliorable) | supprime l'*ensachage* |
| **5** | 👥 **Équipe (externalisation)** | **auto-coupe** : verse coke+diluant et mélange seule quand la dalle est libre | supprime *verser + mélanger* |

Au niveau 5, le joueur ne *fait* plus la matière : il **pilote** (choix du
diluant, des formats, gestion du crédit et de la réput). C'est l'arc
opérateur → empire. La frustration résiduelle de chaque niveau (« c'est long de
mélanger à la main ») est ce qui rend le palier suivant désirable (R2).

---

# 4. Code prêt à copier (Unity C# & Godot GDScript)

Pseudocode condensé des fonctions et de la boucle. Indépendant du moteur de rendu
(le proto web fait le rendu en Three.js ; ici on isole la **simulation**).

## 4.1 Variables & constantes (communes)

```
# Économie
BRICK_PRICES   = {50:2600, 100:4800, 250:10500, 500:19000}   # €, ~38-52 €/g
FMT_PRICE      = {1:78, 5:62, 25:50}                          # €/g détail @ qualité 100%
POUR_RATE      = 26.0                                         # g/s versés au hold
MIX_TIME_K     = 0.55                                         # vitesse de mélange (×2 avec spatule)
IMPORT_PURITY  = (0.80, 0.92)                                 # fourchette pureté de gros

# Diluants : price €/g · clean (→qualité) · harm (→réput)
DILUANTS = {
  "leva":  {price:0.06, clean:0.55, harm:0.12},   # lévamisole, cheap & nocif
  "lacto": {price:0.03, clean:0.70, harm:0.04},
  "manni": {price:0.07, clean:0.85, harm:0.015},
  "benzo": {price:0.22, clean:1.00, harm:0.0},    # propre & cher
}

# Crédit
CREDIT_CAP     = 15000.0     # plafond de front à confiance max
CREDIT_TERM    = 120.0       # secondes avant échéance (proto ; = "jours" en prod)
OVERDUE_REP    = 0.05        # malus réput à l'échéance dépassée

# État
bulkG, bulkPurity            # stock de coke (g) et sa pureté moyenne
dilStock[key]                # stock de chaque diluant (g)
tray = {coke, dil, cokePure, dilClean, dilHarm}   # contenu de la dalle
prodG, prodQsum              # produit fini (g) et somme pondérée de qualité
cash, rep                    # €, réput [0.7..1.2]
debt, dueTimer, supConf      # dette €, compte à rebours s, confiance grossiste [0..1]
toolLevel                    # 1..5, dérivé des upgrades possédés
```

## 4.2 Unity (C#) — fonctions principales

```csharp
// --- COUPE : on verse coke + diluant sur la dalle, puis on mélange ---
void PourCoke(float dt) {
    float g = Mathf.Min(bulkG, POUR_RATE * dt);
    bulkG -= g; tray.coke += g; tray.cokePure += g * bulkPurity;   // garde la pureté
}
void PourDiluant(float dt, Diluant d) {
    float g = Mathf.Min(dilStock[d.key], POUR_RATE * dt);
    dilStock[d.key] -= g; tray.dil += g;
    tray.dilClean += g * d.clean; tray.dilHarm += g * d.harm;
}

// Mélange : au doigt (drag) + un peu au temps. Vitesse ×2 si spatule (niv.2).
void Mix(float fingerPx, float dt) {
    float k = (toolLevel >= 2) ? 2f : 1f;
    homog = Mathf.Min(1f, homog + fingerPx/650f + dt * MIX_TIME_K * k);
    if (homog >= 1f) CommitMix();
}

// Au commit : volume = coke+diluant, pureté = coke/volume, qualité = f(pureté, propreté).
void CommitMix() {
    float total = tray.coke + tray.dil;
    float purity = total > 0 ? tray.cokePure / total : 0f;
    float clean  = tray.dil > 0 ? tray.dilClean / tray.dil : 1f;
    float harm   = tray.dil > 0 ? tray.dilHarm  / tray.dil : 0f;
    float cutFrac= total > 0 ? tray.dil / total : 0f;
    float qual   = Mathf.Clamp(0.25f + 0.45f*purity + 0.30f*clean, 0.2f, 1f);

    prodQsum += total * qual; prodG += total;              // score lot = volume × qualité
    SetRep(rep + (qual - 0.55f)*0.06f - harm*cutFrac);     // nocivité → réput (tracé)
    tray = new Tray();  homog = 0f;
    AddXP(Mathf.Max(1, Mathf.RoundToInt(total * 0.3f)));
}

// --- ENSACHAGE / VENTE ---
void BagOnce(int fmt) {
    if (prodG < 0.05f) return;                       // R1 : rien à rater, juste rien à faire
    float take = Mathf.Min(fmt, prodG);
    float q = prodQsum / prodG;
    prodQsum *= 1f - take/prodG; prodG -= take;
    float price = take * FMT_PRICE[fmt] * q * rep * LevelMult();
    SetCash(cash + price);
}

// --- CRÉDIT : front, remboursement, échéance ---
float CreditLimit() => CREDIT_CAP * supConf;
void BuyOnCredit(int size) {
    float cost = BRICK_PRICES[size];
    if (debt + cost > CreditLimit()) { Toast("Crédit insuffisant"); return; }
    debt += cost; if (dueTimer <= 0f) dueTimer = CREDIT_TERM;   // démarre l'horloge
    ReceiveCoke(size);
}
void Repay(float amount) {
    float pay = Mathf.Min(amount, Mathf.Min(cash, debt));
    cash -= pay; debt -= pay;
    if (debt <= 0.01f) {                       // soldé avant l'échéance → confiance ↑
        debt = 0f; dueTimer = 0f;
        supConf = Mathf.Min(1f, supConf + 0.08f);
    }
}
void TickCredit(float dt) {                    // dans Update()
    if (debt <= 0f) return;
    dueTimer -= dt;
    if (dueTimer <= 0f) {                       // échéance dépassée — PAS de game-over
        SetRep(rep - OVERDUE_REP);             // malus tracé "dette en retard"
        supConf = Mathf.Max(0f, supConf - 0.15f);
        creditFrozen = true;                    // plus de front tant que pas remboursé
        dueTimer = CREDIT_TERM;                 // ré-arme pour le prochain tick de pénalité
    }
}

// --- BOUCLE PRINCIPALE ---
void Update() {
    float dt = Time.deltaTime;
    if (holdingCoke)    PourCoke(dt);
    if (holdingDiluant) PourDiluant(dt, current);
    if (mixing)         Mix(0f, dt);
    if (bagging)        BagTimer(dt, fmt);
    if (toolLevel >= 4) AutoBag(dt);            // auto-ensacheuse
    if (toolLevel >= 5) AutoCut(dt);            // équipe : auto-coupe
    TickCredit(dt);
}
```

## 4.3 Godot (GDScript) — équivalents

```gdscript
func pour_coke(dt: float) -> void:
    var g := min(bulk_g, POUR_RATE * dt)
    bulk_g -= g; tray.coke += g; tray.coke_pure += g * bulk_purity

func mix(finger_px: float, dt: float) -> void:
    var k := 2.0 if tool_level >= 2 else 1.0
    homog = min(1.0, homog + finger_px/650.0 + dt * MIX_TIME_K * k)
    if homog >= 1.0: commit_mix()

func commit_mix() -> void:
    var total := tray.coke + tray.dil
    var purity := tray.coke_pure/total if total > 0 else 0.0
    var clean  := tray.dil_clean/tray.dil if tray.dil > 0 else 1.0
    var harm   := tray.dil_harm/tray.dil  if tray.dil > 0 else 0.0
    var cut_frac := tray.dil/total if total > 0 else 0.0
    var qual := clampf(0.25 + 0.45*purity + 0.30*clean, 0.2, 1.0)
    prod_qsum += total * qual; prod_g += total          # score lot = volume × qualité
    set_rep(rep + (qual - 0.55)*0.06 - harm*cut_frac)
    tray = Tray.new(); homog = 0.0
    add_xp(max(1, round(total * 0.3)))

func buy_on_credit(size: int) -> void:
    var cost := BRICK_PRICES[size]
    if debt + cost > CREDIT_CAP * sup_conf: toast("Crédit insuffisant"); return
    debt += cost
    if due_timer <= 0.0: due_timer = CREDIT_TERM
    receive_coke(size)

func tick_credit(dt: float) -> void:
    if debt <= 0.0: return
    due_timer -= dt
    if due_timer <= 0.0:                                 # PAS de game-over (R1)
        set_rep(rep - OVERDUE_REP)                       # cause tracée "dette en retard"
        sup_conf = max(0.0, sup_conf - 0.15)
        credit_frozen = true
        due_timer = CREDIT_TERM

func _process(dt: float) -> void:                        # boucle principale
    if holding_coke:    pour_coke(dt)
    if holding_diluant: pour_diluant(dt, current)
    if mixing:          mix(0.0, dt)
    if bagging:         bag_timer(dt, fmt)
    if tool_level >= 4: auto_bag(dt)
    if tool_level >= 5: auto_cut(dt)
    tick_credit(dt)
```

## 4.4 Externalisation (niv. 5) — auto-coupe

```
# L'équipe verse coke + diluant courant et mélange seule quand la dalle est libre.
func auto_cut(dt):
    auto_timer += dt
    if auto_timer < team_interval(): return
    auto_timer = 0
    if tray.is_empty() and bulk_g > BATCH and dil_stock[cur] > BATCH:
        pour_coke_instant(BATCH); pour_diluant_instant(BATCH * cut_ratio, cur)
        commit_mix()              # le joueur ne touche plus la matière : il pilote
```

---

# 5. Mapping proto web ↔ ce document

Le prototype `neige/index.html` implémente la **Variation A** : `PourCoke`/
`PourDiluant` = section *Geste 1 — verser*, `Mix`/`CommitMix` = section *Geste 2 —
mélanger* (`cutQuality(purity, clean)`), `BagOnce` = *Geste 3 — ensacher*, le
crédit = module *Crédit* (dette + échéance + confiance grossiste), et les 5
paliers = l'« Atelier » de la boutique (spatule → presse → auto-ensacheuse →
équipe). Persistance `localStorage` préfixe `neige_*`.
