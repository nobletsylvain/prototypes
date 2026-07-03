# Crack — « La Cuisson » · note de design

> Core loop mobile : cuisiner du caillou, l'arbitrage du joueur = **volume gonflé
> (coupe) contre pureté**, sous la pression du **front à crédit** (la dette). Game
> design + dev, dans la lignée de `neige/` (bulk → retail, paliers de coupe, réput).

Crédits de lecture rapide : **R1 = ressenti / juteux** (la main, le geste, le
feedback) ; **R2 = progression** (paliers, idle, courbe de maîtrise) ; **crédit**
= la dette du front qu'il faut rembourser avant de toucher du cash.

---

## 1. Trois variations de mini-jeu

Toutes partagent les briques imposées : **cuisson + séchage + bris des rocks +
coupe pendant la cuisson**. Elles diffèrent par *où vit le skill*.

### V1 — « Le Chef » (timing pur sur la chauffe)
La chauffe est un **mini-jeu de timing à la jauge** : on maintient la flamme, la
température monte, il faut la **lâcher dans la zone verte** ; trop chaud = ça crame.
La coupe est un geste **séquentiel** (d'abord cuire, puis verser la coupe), le
séchage une seconde jauge, le bris un swipe. Skill concentré sur **la maîtrise de
la flamme**.
- **R1** : net, lisible, mais une station à la fois — geste après geste.
- **R2** : courbe « je rate moins la chauffe » + paliers qui élargissent la zone.
- **Crédit** : revenu ≈ régularité de la cuisson ; une mauvaise fournée = dette qui stagne.

### V2 — « La Fournée » (multi-cuves / gestion-idle)
Plusieurs cuves en parallèle. Peu de skill par cuisson (on règle un thermostat),
le jeu est dans le **débit** : lancer, surveiller, encaisser. La coupe se règle
au sélecteur avant lancement. Le bris est automatisable.
- **R1** : faible — on **gère**, on ne **fait** pas. Peu tactile.
- **R2** : excellente — scaling idle naturel, beaucoup de paliers.
- **Crédit** : remboursement rapide par le volume, mais l'arbitrage coupe/pureté
  devient un curseur abstrait, pas une décision ressentie.

### V3 — « Le Cuistot pressé » (coupe pendant la cuisson, gestes simultanés) ✅
La **coupe se verse PENDANT que ça chauffe**, dans la **même cuve** : une main
tient la flamme dans le vert, l'autre verse la coupe — et **le mélange gonfle à
vue d'œil** (liquide laiteux → roches beiges gonflées). Plus tu verses, plus tu as
de grammes, moins c'est pur. Puis **séchage** (timing) et **bris au swipe**.
- **R1** : le plus fort — deux gestes concurrents + **transformation visuelle**
  qui réagit en direct au versement (le gonflement EST le retour de la coupe).
- **R2** : 5 paliers qui élargissent la zone de chauffe puis automatisent ; idle en bout.
- **Crédit** : l'arbitrage est **incarné dans le geste** — verser plus rembourse
  la dette plus vite *ce tour-ci*, mais fait chuter la réput (donc le €/g des tours suivants).

---

## 2. Comparatif

| Critère | V1 Le Chef | V2 La Fournée | **V3 Le Cuistot** |
|---|---|---|---|
| **R1 — ressenti** | bon, séquentiel | faible (gestion) | **fort, gestes simultanés + gonflement live** |
| **R2 — progression** | correcte | excellente (idle) | **bonne** (paliers → idle en fin) |
| **Impact crédit** | régularité | volume brut | **arbitrage incarné : volume↑ dette↓ mais réput↓ → €/g↓** |
| **« coupe intégrée à la cuisson »** | non (séquentiel) | réglage abstrait | **oui, geste central** |
| **Transformation visuelle** | moyenne | faible | **forte (liquide → roches gonflées en direct)** |

**V1** est solide mais sépare cuisson et coupe — or la consigne veut la **coupe
intégrée à la cuisson**. **V2** scale bien mais sacrifie le ressenti et dématérialise
la décision-clé. **V3** est la seule qui fait de **l'arbitrage volume/pureté un
geste**, avec la transformation visuelle la plus forte — et garde une progression
qui finit en idle. **→ On développe V3.**

---

## 3. V3 en détail — « Le Cuistot pressé »

### Boucle (une fournée)
1. **Charger** — pose une fournée de coke (`COKE_BATCH` g) prise **à crédit** :
   la **dette monte** (`g × COKE_COST_G`). On ne touche du cash qu'une fois la dette épongée.
2. **Cuisson + coupe (simultané)** — maintenir **🔥** : la température monte, il
   faut la garder dans la **zone verte** (`band` du palier). Au-dessus de `BURN_TEMP`,
   **ça crame** → la *façon* se dégrade. En même temps, maintenir **🥄** verse la
   **coupe** choisie → le contenu **gonfle** (niveau qui monte, teinte qui s'éclaircit,
   roches plus grosses). La **cuisson avance** tant que la temp est dans le vert.
3. **Séchage** — un curseur balaie une jauge ; **✋ Sortir** au centre (fenêtre
   `dryWin`, élargie par les paliers). Trop tôt/tard = caillou mal pris (*façon* basse).
4. **Briser** — **swipe** en travers de la dalle séchée : elle se fissure puis
   éclate en **cailloux** (taille gonflée par la part de coupe).
5. **Vendre** — la fournée s'écoule. Le **volume** (coke+coupe) × le **€/g**.

### Économie (constantes nommées dans le code, réglables)
```
volume    = coke + coupe                         // grammes vendables (gonflés)
pureté    = coke / volume                        // 0..1, dilution
façon     = cuisson × séchage                    // qualité du geste (0..1)
qualité   = pureté × façon × potency(coupe)      // potency : propreté de l'agent
€/g       = RETAIL_BASE × qualité × repMult × lvlMult
revenu    = volume × €/g
```
- **Co-effets parallèles, pas une chaîne** : `volume` et `réputation` sortent tous
  deux de la **même** décision (combien verser), ils ne se causent pas l'un l'autre.
- **Réputation** (0–100) : tirée vers la qualité vendue (`rep += (qualité×100 − rep) × REP_PULL`).
  Elle module le `€/g` des tours suivants → **verser trop rembourse vite mais sabote la suite**.
- **Crédit** : chaque vente **rembourse la dette d'abord**, le surplus tombe en cash.

### 5 paliers d'outils (`TOOLS`)
| # | Outil | Effet |
|---|---|---|
| 0 | 🥄 Cuillère & briquet | zone verte étroite `[64,82]`, séchage serré — départ |
| 1 | 🔥 Réchaud de camping | zone `[60,84]`, séchage plus tolérant |
| 2 | 🧪 Bec Bunsen + thermo | zone `[57,86]`, marge confortable |
| 3 | ♨️ Plaque régulée | zone `[54,88]` + **assist** : la temp se tient en partie seule |
| 4 | 🏭 Labo + cuisinier | zone `[50,90]` + **auto** : cuisson *et* séchage automatiques (idle) |

Progression : on **achète dans l'ordre**, chaque palier rend la chauffe plus
pardonnante, puis **automatise** → la boucle devient idle en fin de courbe (R2).

### Paliers de coupe (`CUTS`)
`Pur` (0 coupe, max pureté) · `Bicarbonate` (la recette, propre) · `Lévamisole`
(gros volume, sale → réput↓) · `Benzocaïne` (gros volume mais propre, cher). Le
vrai coût d'une coupe cheap, c'est la **réputation**, pas l'agent.

---

## 4. Prototype

Implémenté ici en **HTML + 2D canvas, zéro dépendance** (`crack/index.html`),
mobile-first, persistance `localStorage` préfixe `crack_` (clé de version
`crack_ver` + `SAVE_VERSION` pour reset propre). Feedback synthétisé WebAudio
(cha-ching, craquement du bris, grésillement de surchauffe). Voir la note
technique dans le `README.md` racine.

> Choix 2D canvas (et non Three.js comme `neige/`) : la **transformation
> liquide → roches gonflées** se pilote au pixel et reste **fonctionnelle sans
> CDN** en session distante. Précédent dans le dépôt : `green-front-v2/`.

### Pseudocode mobile-ready (Unity C# / Godot)

Le cœur est **engine-agnostic** : une machine à états par fournée + des constantes.

```csharp
// ---- Unity (C#) : squelette de la fournée ----
enum Phase { Idle, Cook, Dry, Break, Sell }

class Batch {
    public float coke, cut;          // grammes
    public float temp, cook;         // % température, % avancement cuisson
    public float craft = 1f;         // façon, dégradée par la surchauffe
    public float dryQ;               // qualité de séchage
    public Phase phase = Phase.Idle;
}

[System.Serializable] class Tool { public Vector2 band; public float dryWin, assist; public bool auto; }
[System.Serializable] class Cut  { public float potency, rate; }

class CrackLoop : MonoBehaviour {
    public float HEAT_RATE = 58, COOL_RATE = 34, BURN_TEMP = 92, BURN_PEN = .55f;
    public float COOK_RATE = 30, POUR_RATE = 22, CUT_MAX = 70;
    public float COKE_BATCH = 28, COKE_COST_G = 42, RETAIL_BASE = 95, REP_PULL = .16f;

    Batch b; Tool tool; Cut cut;
    float debt, cash, rep = 50, xp; int level = 1;
    bool heating, pouring;           // liés aux boutons « maintien » (PointerDown/Up)

    void Load() {                                   // bouton « Charger »
        b = new Batch { coke = COKE_BATCH, phase = Phase.Cook };
        debt += COKE_BATCH * COKE_COST_G;           // front à crédit
    }

    void Update() {
        float dt = Time.deltaTime;
        if (b == null) return;

        if (b.phase == Phase.Cook) {
            // température (timing doux) — auto/assist pour les paliers hauts
            bool on = tool.auto || heating;
            b.temp += (on ? HEAT_RATE : -COOL_RATE) * dt;
            if (tool.assist > 0) {
                float mid = (tool.band.x + tool.band.y) / 2f;
                b.temp += (mid - b.temp) * tool.assist * dt * 1.6f;
            }
            b.temp = Mathf.Clamp(b.temp, 0, 100);
            if (b.temp > BURN_TEMP) b.craft = Mathf.Max(.1f, b.craft - BURN_PEN * dt); // ça crame

            // coupe versée PENDANT la cuisson → gonflement
            if (pouring && b.cut < CUT_MAX)
                b.cut = Mathf.Min(CUT_MAX, b.cut + POUR_RATE * cut.rate * dt);

            // avancement seulement en zone verte
            if (b.temp >= tool.band.x && b.temp <= tool.band.y) b.cook += COOK_RATE * dt;
            if (b.cook >= 100) { b.phase = Phase.Dry; /* lance le curseur de séchage */ }
        }
        else if (b.phase == Phase.Dry) {
            // curseur triangulaire 0..1 ; « Sortir » verrouille dryQ = proximité du centre
        }
        // Break : swipe (longueur du drag → breakProg) ; Sell : voir ci-dessous
    }

    void Sell() {
        float volume = b.coke + b.cut;
        float purity = b.coke / Mathf.Max(1, volume);
        float craft  = b.craft * b.dryQ;
        float quality = Mathf.Max(.05f, purity * craft * cut.potency);
        float repMult = .55f + .45f * (rep / 100f);
        float lvlMult = 1f + (level - 1) * .025f;
        int revenue = Mathf.RoundToInt(volume * RETAIL_BASE * quality * repMult * lvlMult);

        float pay = Mathf.Min(debt, revenue); debt -= pay; cash += revenue - pay; // dette d'abord
        rep = Mathf.Clamp(rep + (quality * 100 - rep) * REP_PULL, 0, 100);        // co-effet
        xp += volume * 1.4f; /* level-up si seuil */
        b = null;                                                                  // fournée suivante
    }
}
```

```gdscript
# ---- Godot (GDScript) : même machine à états, condensée ----
enum Phase { IDLE, COOK, DRY, BREAK, SELL }
var phase := Phase.IDLE
var coke := 0.0; var cut := 0.0; var temp := 0.0; var cook := 0.0
var craft := 1.0; var dry_q := 0.0
var heating := false; var pouring := false        # boutons maintien (button_down/up)

func _process(dt):
    if phase == Phase.COOK:
        temp += (HEAT_RATE if (heating or tool.auto) else -COOL_RATE) * dt
        temp = clamp(temp, 0, 100)
        if temp > BURN_TEMP: craft = max(0.1, craft - BURN_PEN * dt)
        if pouring and cut < CUT_MAX: cut = min(CUT_MAX, cut + POUR_RATE * cut_def.rate * dt)
        if temp >= tool.band.x and temp <= tool.band.y: cook += COOK_RATE * dt
        if cook >= 100: phase = Phase.DRY

func sell():
    var volume = coke + cut
    var quality = max(0.05, (coke / max(1, volume)) * craft * dry_q * cut_def.potency)
    var revenue = round(volume * RETAIL_BASE * quality * (0.55 + 0.45 * rep/100.0))
    var pay = min(debt, revenue); debt -= pay; cash += revenue - pay
    rep = clamp(rep + (quality*100 - rep) * REP_PULL, 0, 100)
    phase = Phase.IDLE
```

**Contrôles mobile** : chauffe & coupe = boutons **maintien** (`pointerdown/up`) ;
bris = **swipe** sur la dalle (longueur du drag accumulée). Aucun aléatoire ne
pilote l'état — chaque conséquence (réput qui chute, fournée cramée) remonte à un
geste du joueur.
