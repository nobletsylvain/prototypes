# Revue mini-jeux — documentation & prototypes

> Revue de design des core loops tactiles (`hash-slicer*`, `green-front*`,
> `guitar-shito`, `neige`) et des maquettes d'arbitrage CrimWorld
> (`crimworld`, `crimworld-sandbox`, `la-bascule`), au regard des **règles
> mini-jeux**. Constats vérifiés dans le code (`file:line`). Aucune correction
> appliquée : ce document propose, il ne tranche pas.

---

## 0. Constat documentaire prioritaire — le référentiel R1–R10 n'est écrit nulle part

`CrimWorld/CLAUDE.md` fonde tout le cadrage mini-jeux sur un **« référentiel
prototypes »** et cite explicitement **R1–R6** (définition du mini-jeu
tactile), **R9** (équilibrage systémique) et **R10** (qualité/pureté = un seul
levier). Ce référentiel **n'existe comme fichier dans aucun des deux dépôts**
(`grep` exhaustif : seules des *citations* existent, jamais la source).

Conséquence : les règles qui pilotent ces prototypes ne sont ni numérotées, ni
définies, ni versionnées. Chaque session les paraphrase de mémoire.

> **✅ Corrigé dans ce PR** : le référentiel est désormais écrit dans
> [`REFERENTIEL_MINIJEUX.md`](REFERENTIEL_MINIJEUX.md) (v0.1, à valider). Le
> tableau ci-dessous en est le résumé ; le document détaille chaque règle
> (énoncé, test de conformité, état dans les protos).

### Résumé (détail dans `REFERENTIEL_MINIJEUX.md`)

| Règle | Énoncé (reconstruit) |
|---|---|
| **R-RESSENTI** | Le geste tactile porte un feedback juteux (son, secousse, particules, combo, jugement). |
| **R-SATISFACTION-DÉCROISSANTE** | La satisfaction d'un geste répété **décroît par design** — c'est ce qui motive la délégation. |
| **R-VANNE-DÉLÉGATION** | Il existe une automatisation pour se décharger du geste une fois lassé, **dosée** (ni trop tôt, ni hors d'atteinte). |
| **R9 — équilibrage systémique** | Un outil qui réduit une friction est **compensé ailleurs** (coût, contrepartie). La tension se règle au niveau de la courbe, pas d'un geste isolé. |
| **R10 — un seul levier** | Qualité et pureté sont **un seul levier**, pas deux systèmes séparés. |
| **INVARIANT-NO-RANDOM** | Aucun aléatoire ne pilote l'**état** ni les **conséquences**. L'aléa de **présentation** est autorisé. |

---

## 1. Tableau de conformité

Vert = conforme, Orange = partiel/problème, Rouge = violation nette, — = non applicable.

| Règle | hash-slicer | hs-v2 | green-front | gf-v2 (lab) | gf-v3 | guitar-shito | neige |
|---|---|---|---|---|---|---|---|
| **Ressenti** | 🟢 | 🟢+ | 🟢 | 🟢 | 🟢 | 🟢 (le meilleur) | 🟠 plat |
| **Satisfaction décroissante** | 🟠 subie | 🟠 subie | 🔴 absente | 🟠 (G3) | 🔴 absente | 🔴 *combo facilite* | 🔴 plat d'emblée |
| **Vanne délégation** | 🟢 étagée | 🔴 absente | 🟠 brutale | — | 🟠 brutale | 🟠 mal placée | 🟢 la mieux dosée |
| **R9 systémique** | 🟠 compens. molles | — | 🟠 faille auto-bucker | — | 🟠 idem | 🔴 heat morte | 🟠 partiel |
| **R10 un seul levier** | 🟢 | 🟢 (neutralisé) | 🟢 | 🟢 | 🟢 (le + pur) | 🟢 | 🔴 deux états |
| **No-random (conséquence)** | 🔴 `:1163` | 🟢 | 🔴 `:740/:1045` | 🟠 (lab) | 🔴 idem v1 | 🟢 | 🔴 `:674` |

Les maquettes CrimWorld (`crimworld`, `crimworld-sandbox`, `la-bascule`) ne sont
**pas** des mini-jeux tactiles (arbitrage abstrait) : les trois premières règles
ne s'y appliquent pas. Elles sont traitées en §6.

---

## 2. Transversal #1 — l'aléatoire pilote des conséquences (violation no-random)

C'est la violation la plus répandue **et** la plus facile à corriger. Tous ces
cas font dépendre une conséquence économique d'un `Math.random` non traçable —
exactement ce que l'invariant interdit (un mini-jeu peut tolérer du hasard de
*présentation*, jamais de *conséquence*).

| Fichier:ligne | Code | Conséquence pilotée | Correctif proposé |
|---|---|---|---|
| `neige/index.html:674` | `purity = 0.80 + Math.random()*0.12` | pureté d'import → qualité → **prix de vente** | pureté **déterministe par palier de brique** (50 g = 80 %, 100 g = 85 %…). |
| `green-front/index.html:740` | `key = sizes[Math.floor(Math.random()*…)]` (`newOffer`) | taille + THC + humidité du front → **toute l'éco du lot** | **cycle déterministe lisible** d'offres (le joueur planifie l'arbitrage). |
| `green-front/index.html:1045` | `if (opts.label && Math.random() < 0.07)` | **descente de police** (−cash, −8 réput, −30 % stock) | piloter par un **état `heat` accumulé** (étiquette fake → +heat → seuil de bust), traçable. Identique dans `green-front-v3:1107`. |
| `hash-slicer/index.html:1163` | `sliver = …0.3 + Math.random()*0.6` (dosage balance) | grammage prélevé → surplus gaspillé → **revenu** | prélèvement **déterministe** (fonction du maintien). ⚠️ même moteur que `crimworld/coupe.html:1163` — **dormant** en mode prologue (dosage masqué), mais **bombe à retardement** si le dosage est un jour câblé dans la slice. |
| `green-front-v2/index.html:494` | `target = [3.5,7,14,28][Math.floor(Math.random()*4)]` | cible de dosage → **score** | tolérable (lab de feel sans persistance d'état), mais un **cycle de cibles** rendrait le record plus juste. |

> Tous les autres `Math.random` relevés (grain de texture, vitesses de chute,
> jitter de piles, secousse caméra, pseudos des commentateurs, brouillage de la
> jauge de réput opaque) sont de la **présentation** — autorisés.

---

## 3. Transversal #2 — la satisfaction décroissante n'est conçue nulle part

Aucun mini-jeu n'**instrumente** la décroissance de satisfaction. La lassitude
est partout **subie** (monotonie) au lieu d'être **conçue** comme une pente qui
pousse vers la vanne de délégation. Pire, deux protos vont à contresens :

- **guitar-shito** : le combo **facilite** le geste —
  `keep = min(1, keep + min(combo,12)*0.012)` (`guitar-shito/index.html:786`).
  Plus on enchaîne, plus un timing moyen pardonne. Le pattern et le tempo sont
  figés (`PATTERN`/`BEAT`, `:722-723`). Le geste est identique au coup 5 et au
  coup 500.
- **neige** : geste sans skill ni échec possible — le mix se termine au **temps
  passif** (`homog += dt * MIX_TIME_K`, `neige/index.html:721`), doigt immobile =
  mix complet. Le parti pris « feeling > skill, rien à viser » (`:139`) donne une
  courbe de plaisir **plate dès le premier geste**, donc rien de *haut* à faire
  décroître.

**Proposition** : choisir un mécanisme de décroissance explicite et le rendre
lisible — p.ex. rendement marginal du geste qui baisse sur un même lot (la 20ᵉ
barrette rapporte/juicy moins que la 1ʳᵉ), ou exigence de timing qui se resserre
sans gain. La décroissance doit **désigner** la vanne, pas être un creux d'ennui.

---

## 4. Transversal #3 — la vanne de délégation et R9

La règle veut une vanne **dosée** *et* **compensée**. État des lieux :

- **Le bon exemple** : l'auto-ensacheuse de **neige** délègue *et* taxe la marge
  de 15 % — `price = … * 0.85 * levelMult()` (`neige/index.html:778`) vs vente
  manuelle plein pot (`:755`). C'est le **seul** R9 réellement respecté du lot :
  à reprendre comme patron.
- **Le contre-exemple** : l'auto-bucker de **green-front** (`:1060-1075`) est un
  **interrupteur on/off** (achat unique 2500 €) qui **supprime tout le geste**
  sans perte ni malus qualité, et est **strictement meilleur** que le geste
  manuel. Même schéma pour le **massicot auto** de hash-slicer (perte 5 % vs
  jusqu'à 68 % en manuel — `hash-slicer:568` vs `:582`) : **automatiser bat le
  geste bien joué**, ce qui inverse l'arbitrage.
- **Mal placée** : guitar-shito délègue la phase **satisfaisante** (découpe, via
  métronome `:828-840`) mais **pas** la phase répétitive (emballage briquet, sans
  auto-ensacheuse). La vanne manque là où elle servirait le plus.
- **Absente** : hash-slicer-**v2** n'a **aucune** automatisation — boutique vide
  de machines (`:1195-1205`), machine masquée (`:1151`), flags `owned.*` morts.
  Le joueur lassé n'a aucune sortie.

**Proposition** : transformer chaque vanne « interrupteur » en **curseur de
délégation** (% du geste automatisé) avec une **contrepartie** systématique —
décote de marge (patron neige) ou coût récurrent. Une vanne ne doit jamais être
plus rentable que le geste bien joué.

Cas R9 connexe à corriger : dans **guitar-shito**, la barre `#heatfill` existe en
HTML (`:20-23`) mais `heat` **n'est jamais calculé** — HUD mort, et surtout
aucune friction d'échelle ne compense les bonus de revente. Le **gabarit** de
hash-slicer (`:1423`) élargit la zone verte sans aucune contrepartie.

---

## 5. R10 — un seul levier : le cas Neige à corriger

Partout ailleurs R10 est tenu (le « stretch » de green-front et le grade de
hash-slicer sont des leviers uniques ; green-front-**v3** est le plus pur après
suppression du bac B). **Neige est la seule violation nette.**

La coupe y manipule **deux variables d'état séparées** —
`tray.dilClean` et `tray.dilHarm` (`neige/index.html:372, :701`) — dérivées des
deux champs `clean` et `harm` des diluants (`:182-185`) :

```
cleanAvg → cutQuality → qualité → prix   (:734, :614, :755)
harmAvg  → setRep                        (:735, :739)
```

C'est précisément la structure que R10 interdit : qualité et nocivité comme
**deux systèmes**. Aujourd'hui les données sont *quasi* colinéaires (cheap =
mauvaise qualité **et** nocif), donc le choix se *joue* comme un curseur unique
prix↔réput — mais le **code** le porte en deux états, et rien n'empêche
d'introduire demain un agent « propre mais nocif » qui ré-ouvrirait deux axes.

**Proposition** : fusionner en **un seul scalaire** (« pureté du cut ») dont
qualité *et* réputation dérivent toutes deux. Un seul nombre par diluant, une
seule variable d'état.

---

## 6. Maquettes CrimWorld — l'enjeu est le périmètre, pas l'aléatoire

Les trois protos sont **propres sur l'invariant no-random** (tous les
`Math.random` y sont de la présentation : pseudos de commentateurs
`crimworld:1031`, brouillage de réput opaque `crimworld-sandbox:265`, feel du
mini-jeu de coupe). `crimworld-sandbox/sim.mjs` est exemplaire : déterministe,
qualité = levier unique, co-effets **parallèles** (`PRESS_EXPO` / `PRESS_VOLUME`
branchés *chacun* sur la décision, jamais en chaîne), réput opaque, contrat
`cause` formel, trace inter-jours.

Le vrai risque est ailleurs :

- **🔴 Périmètre — `crimworld/index.html:1203-1282` (chapitre 2)** : finance un
  « contrat » pour faire **disparaître Momo** (`PRIX_CONTRAT`, `:1015`),
  « zonzon » / foudre des autorités (`:968-971`). Cela code **violence +
  élimination + heat autorités**, tous **hors-périmètre strict** de la slice. À
  **isoler du build de validation** ou flaguer « hors slice » : sinon le test
  mêle l'arbitrage cupidité/prudence à des axes non validés.
- **🟠 Heat chaînée** : `crimworld` lie `clientAccro` (heat) → fuite du
  `clientParano` (`:1472 → :1539`). Ce n'est pas la chaîne interdite « moins de
  ventes → heat », mais c'est une heat **chaînée à une conséquence** plutôt
  qu'un co-effet parallèle. À aligner sur le modèle sandbox si cette FTUE doit
  refléter la DNA systémique.
- **🟠 Sécurité légère** : `la-bascule:648-651` reçoit un `postMessage` **sans
  filtrer `e.origin`** (alors que `crimworld:813` le durcit) ; `coupe.html:1535`
  émet en cible `"*"`. À aligner sur la version durcie.
- **🟠 Micro-violence narrative** (« je te marrave », `la-bascule:737`,
  `crimworld:1064`) — hors-périmètre mineur (ton).

---

## 7. Backlog priorisé (propositions, à valider)

**P0 — invariants (rapide, fort impact)**
1. ✅ *(fait, Lot 1)* Déterminiser les 4 conséquences aléatoires : `neige:674`
   (pureté par palier de brique), `green-front:740` & `gf-v3` (cycle d'offres),
   `green-front:1045` & `gf-v3:1107` (descente pilotée par une heat accumulée),
   `hash-slicer:1163` (éclat piloté par la cadence de tap) — + la copie dormante
   `crimworld/coupe.html:1163`. (§2)
2. ✅ *(fait, Lot 1)* Fusionner `dilClean`/`dilHarm` de neige en un seul scalaire
   `pur` (« pureté du cut ») dont dérivent qualité **et** nocivité. (§5)
3. Isoler/flaguer le chapitre 2 hors-périmètre de `crimworld`. (§6) — *repo CrimWorld, à part.*

**P1 — structure mini-jeu**
4. ✅ *(fait)* Écrire le **référentiel R1–R10** comme document source. (§0)
5. Rétablir une vanne de délégation dans **hash-slicer-v2** (régression). (§4)
   — *reporté : l'auteur a explicitement différé l'automatisation du fork
   (« machines/employés à venir », `v2 Phase 1`) ; y toucher = faire sa Phase 2,
   décision de design à valider, pas une correction.*
6. ✅ *(fait, Lot 2 — compensation R6/R9)* Les vannes « gratuites » sont désormais
   **compensées** : massicot hash-slicer capé au grade B (jamais le premium A) +
   gabarit qui rogne le rendement ; auto-bucker green-front/gf-v3 avec **perte de
   matière** (15 %) ; métronome guitar-shito capé sous le PARFAIT. Reste à faire :
   passer ces interrupteurs en **curseurs de % délégué** (patron neige). (§4)
7. ✅ *(fait, Lot 3)* **Satisfaction décroissante** — pilote sur **hash-slicer** :
   couper en rafale « fatigue » le geste (juice qui s'éteint + rendement rogné,
   `cutFresh`), ce qui rend le massicot tireless attractif ; se pacer/déléguer la
   restaure. Toujours ≥ machine quand frais (R6 tenu), déterministe (cadence, pas
   hasard — R8). Et **combo qui *facilite* retiré** dans guitar-shito (le combo
   ne rachète plus la matière : panache seulement). (§3)

**P2 — hygiène / cohérence** *(audit Lot 4 — plusieurs constats de la revue
initiale étaient trop sévères ; correction ci-dessous)*
8. **Dosage tactile mort de green-front-v3** — confirmé : `startPour`/`updatePour`/
   `stopPour` sont **définis mais jamais appelés** (le `loop()` n'appelle que
   `updateGauges/updateFlyers/updateAutoBuck`), et le slider `#strack` reste
   l'unique mécanique active. La feature-phare du fork est inerte. « Brancher **ou**
   retirer » = **décision d'identité du fork**, pas de l'hygiène → laissée à valider
   (comme la vanne de hs-v2). Non tranchée unilatéralement.
9. ✅ *(fait, Lot 2)* `heat` morte de guitar-shito **retirée** (CSS orphelin).
10. **Code mort — audit** :
    - ✅ *(fait, Lot 4)* `neige_waste` (clé de reset orpheline, feature retirée) et
      `TBUCK` (gf-v2, timer d'un mini-jeu qui n'en a plus) : **supprimés** — vrais
      résidus accidentels, non annotés.
    - ⚠️ **Faux positif — bac B de green-front n'est PAS fantôme** : il est produit
      (pondération THC distincte `×0.9`), affiché (`labB`/`binB`), et **fondu dans le
      blend** au stretch (`flowerG = A + B`). C'est un vrai palier mid-grade ;
      le retirer = passer 3→2 paliers (ce que gf-v3 explore déjà), un choix de
      **design**, pas du nettoyage. **Non touché.**
    - ⚠️ **Code mort de hs-v2 = intentionnel** : `gradeVal` « (conserve, inutilise) »,
      `SELL_POS` « (leftover, code emballage dormant) », `SCHLAG_RATE` « (reserve) »
      (green-front + guitar-shito) sont **annotés par l'auteur comme parqués
      volontairement**. Les retirer contredirait une intention documentée. **Non
      touchés** — à l'auteur de décider s'il les purge.

---

*Revue menée par lecture intégrale du code des 10 prototypes ; chaque constat
chiffré renvoie à `file:line`. Les Lots 1–4 de correction ont depuis été appliqués
(cf. cases ✅) ; restent ouverts : la vanne de hs-v2 et le dosage de gf-v3 (deux
décisions d'identité de fork), les curseurs de délégation, et le passage des
faux positifs/annotés en revue par l'auteur.*
