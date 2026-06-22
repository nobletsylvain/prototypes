# CrimWorld — Features joueur du bloc HUB SOCIAL « Snapshit »

> Brief **focalisé sur le seul bloc social**, pour une session/agent dédiée.
> Exhaustif à l'intérieur du périmètre social, et rien d'autre.
> Sources : `crimworld/HUB_SOCIAL_SPEC.md` (PR #104), le proto scripté
> `crimworld/index.html`, l'asset `slang/`, la spec sandbox `SANDBOX_24H_SPEC.md`.

**Légende d'état** · ✅ construit (proto scripté / asset) · 📝 spec'd (PR #104),
à construire · 🔜 plus tard / en pause · ⛔ hors bloc social

---

## 1. Le Feed — consultation (ce que le joueur regarde)

| État | Feature | Renvoi |
|---|---|---|
| ✅ | Mur de commentaires du block qui réagit à toi | `crimworld/index.html` (`showStoryComments` ~l.660, pools ~l.1263) |
| ✅ | Stories des acteurs (toi, Momo, PdV) + viewer plein écran | `crimworld/index.html` `setViewerStory`/`openMomoStory` ~l.748–860 |
| ✅ | ♥ / likes (pure présentation) | proto scripté |
| 📝 | Ton des réactions = **jauge de réput OPAQUE** (chaleureux/neutre/méfiant/hostile) | HUB_SOCIAL_SPEC §4b |
| 📝 | Suppression du **compteur de followers** (`40+réput×6` = fuite d'opacité) | HUB_SOCIAL_SPEC §4b ; sandbox §8.4 |

## 2. Poster — les actes du joueur (peu, mais qui pèsent)

| État | Feature | Renvoi |
|---|---|---|
| ✅ | Poster sa vitrine (story) → contribue à l'exposition | `crimworld/index.html` composer/`storyMine` ~l.827 |
| 📝 | **DROP-PROMESSE** = acte central, un **bluff** (spike now ↔ scrutin later) | HUB_SOCIAL_SPEC §3 |
| 📝 | → spike immédiat d'attention/demande (cupidité) | §3b ; cause `DROP_SPIKE` (§5) |
| 📝 | → armement d'une attente de qualité (le prochain batch doit tenir) | §3b ; cause `DROP_PROMESSE_TENUE` |
| 📝 | → **cry-wolf** si non tenu : effondrement différé **tracé** | §3b ; cause `CRY_WOLF` |
| 📝 | → **érosion de crédibilité** si abus répété (spike rapetisse, déterministe) | §3e ; cause `CREDIBILITE_EROSION` |
| 📝 | **Drop ciblé** par segment (premium/volume) = même système paramétré | §3d |

## 3. La voix du block — l'ambiance comme SYSTÈME

| État | Feature | Renvoi |
|---|---|---|
| 📝 | Troupe de **voix récurrentes** nommées (l'accro, la comtesse, le lowballer, le petit qui t'idolâtre…) | HUB_SOCIAL_SPEC §4c |
| 📝 | Les voix **se souviennent** (callback d'une décision passée → trace diégétique) | §4c, §4e ; `callbacks{cause_code}` (§4g) |
| 📝 | **Escalade de registre = power fantasy** (mépris → déférence) | §4d |
| 📝 | **Contraste de ton** : rapport froid ↔ feed vulgaire (le contraste *est* le ton) | §4e |
| 📝 | Garde-fou : le WTF **porte** la cause, ne l'enterre jamais | §4f |

## 4. La langue — argot crédible & i18n

| État | Feature | Renvoi |
|---|---|---|
| ✅ | **Dico** `slang/dico-trafic.json` (29 concepts / 410 termes / 8 langues) | `slang/` sur `main` ; en ligne `…/prototypes/slang/` |
| 📝 | Branchement : gabarits à trous `{CONCEPT}` résolus depuis le dico selon la locale | §4g ; `concepts[CLÉ].terms[langue][]` |
| 📝 | Migration du matériau inline du prologue vers le schéma de phrases | §4g ; `crimworld/index.html` ~l.1263, ~l.1289 |

## 5. L'axe EXPOSITION — le seul cadran propre au social

| État | Feature | Renvoi |
|---|---|---|
| 📝 | Exposition poussée par les actes sociaux (poster, drop, volume visible) | HUB_SOCIAL_SPEC §2b |
| 📝 | **Demande ↑** (payoff cupidité : bassin élargi, plus de DM) | §2c |
| 📝 | **Mauvais public ↑ différé** (flakes/lowballers, tracé) — downside SANS rivaux | §2c, §2d ; cause `EXPO_MAUVAIS_PUBLIC` |
| 📝 | Décroissance passive si on lève le pied + plafond | §2c ; consts `EXPO_DECAY_JOUR`, `EXPO_CAP` (§7) |

## 6. Diagnostic / pré-écho

| État | Feature | Renvoi |
|---|---|---|
| 📝 | Le feed = **le rapport de minuit qui parle pendant la journée** (anticipation + diagnostic in-fiction des causes) | HUB_SOCIAL_SPEC §0, §1 |

---

## Frontières du bloc (pour rester en lane)

Le hub social **lit** un état et **produit** trois choses ; il **ne contient
aucune logique de conséquence** :

- **Consomme** (appartient à la sim) : réputation conso, exposition, qualité du
  dernier batch.
- **Produit** : (a) la **décision** « poster un drop » (+ promesse/cible) ;
  (b) les **contributions d'exposition** ; (c) toute la **présentation** (voix,
  ton, dico).
- **Sanctions** (spike, cry-wolf, mauvais public, érosion crédibilité) =
  **déterministes, dans la sim**, rendues au rapport. Le hub n'invente aucune
  cause (contrat `cause`, HUB_SOCIAL_SPEC §5–§6).

**⛔ Hors bloc social** : appro/darkweb/Ubeur, coupe, allocation/vente,
dette/fournisseur, moteur heat, rivaux (en pause v2), heat autorités. Le social
*touche* la réput/expo mais ne les *calcule* pas.

---

## Les 3 sous-livrables du bloc, par maturité

- **✅ Déjà là** : feed / stories / commentaires scriptés (`crimworld/index.html`)
  + dico (asset `slang/`).
- **📝 Cœur à construire (PR #104)** : drop-promesse, axe expo / mauvais public,
  voix-qui-se-souviennent, ton = jauge opaque, branchement du dico.
- **🔜 Affinage** : escalade de registre (power fantasy), trace inter-jours côté
  feed (rejoint sandbox lot 5).

---

## Ordre de construction (rappel DNA — sim d'abord, UI ensuite)

1. **Sim** (console-testable, sans UI) : axe expo + drop-promesse + cry-wolf —
   rejoint le **Lot 3** de la sandbox (moteur heat + prix, même famille de
   co-effets parallèles / sanction différée). Constantes nommées (§7).
2. **UI / hub** (présentation pure, par-dessus la sim) : troupe de voix, ton =
   jauge, contraste rapport↔feed, branchement du dico.
3. **Intégration** : causes `EXPO_*` / `DROP_*` / `CRY_WOLF` dans le **rapport
   cumulatif** (sandbox lot 5), reliées aux tours passés.

> Rappel checkpoints DNA : STOP avant l'UI, et reviewer obligatoire avant chaque
> commit de code.
