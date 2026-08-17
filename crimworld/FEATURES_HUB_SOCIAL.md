# CrimWorld — Bloc HUB SOCIAL « Snapshit » (features + design)

> Document **unique** du bloc social, à valider AVANT tout code (**CP-1**).
> En tête : la **carte des features joueur** (le *quoi*, brief d'exécution).
> En dessous : le **design** (le *pourquoi*, §0–§10) — c'est la source de vérité
> que référencent les tableaux.
>
> Extension de `SANDBOX_24H_SPEC.md`. Ce lot ne touche NI la sim NI l'UI : il fixe
> le design avant d'écrire la moindre ligne. On STOPpe en fin de doc et on attend
> l'approbation explicite (checkpoint 1 de la DNA CrimWorld).
>
> Pré-requis assumé : **le pivot v2 a mis la concurrence (rivaux/corner) en
> pause.** Le downside d'exposition retenu n'a donc pas besoin de rallumer les
> rivaux (voir §2) — **décision DNA** qui amende §8.1 de la sandbox, à trancher.

---

# PARTIE I — CARTE DES FEATURES JOUEUR

**Légende d'état** · ✅ construit (proto scripté / asset) · 📝 spec'd, à
construire · 🔜 plus tard / en pause · ⛔ hors bloc social

## 1. Le Feed — consultation (ce que le joueur regarde)

| État | Feature | Renvoi |
|---|---|---|
| ✅ | Mur de commentaires du block qui réagit à toi | `crimworld/index.html` (`showStoryComments` ~l.660, pools ~l.1263) |
| ✅ | Stories des acteurs (toi, Momo, PdV) + viewer plein écran | `crimworld/index.html` `setViewerStory`/`openMomoStory` ~l.748–860 |
| ✅ | ♥ / likes (pure présentation) | proto scripté |
| 📝 | Ton des réactions = **jauge de réput OPAQUE** (chaleureux/neutre/méfiant/hostile) | §4b |
| 📝 | Suppression du **compteur de followers** (`40+réput×6` = fuite d'opacité) | §4b ; sandbox §8.4 |

## 2. Poster — les actes du joueur (peu, mais qui pèsent)

| État | Feature | Renvoi |
|---|---|---|
| ✅ | Poster sa vitrine (story) → contribue à l'exposition | `crimworld/index.html` composer/`storyMine` ~l.827 |
| 📝 | **DROP-PROMESSE** = acte central, un **bluff** (spike now ↔ scrutin later) | §3 |
| 📝 | → spike immédiat d'attention/demande (cupidité) | §3b ; cause `DROP_SPIKE` (§5) |
| 📝 | → armement d'une attente de qualité (le prochain batch doit tenir) | §3b ; cause `DROP_PROMESSE_TENUE` |
| 📝 | → **cry-wolf** si non tenu : effondrement différé **tracé** | §3b ; cause `CRY_WOLF` |
| 📝 | → **érosion de crédibilité** si abus répété (spike rapetisse, déterministe) | §3e ; cause `CREDIBILITE_EROSION` |
| 📝 | **Drop ciblé** par segment (premium/volume) = même système paramétré | §3d |

## 3. La voix du block — l'ambiance comme SYSTÈME

| État | Feature | Renvoi |
|---|---|---|
| 📝 | Troupe de **voix récurrentes** nommées (l'accro, la comtesse, le lowballer, le petit qui t'idolâtre…) | §4c |
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
| 📝 | Exposition poussée par les actes sociaux (poster, drop, volume visible) | §2b |
| 📝 | **Demande ↑** (payoff cupidité : bassin élargi, plus de DM) | §2c |
| 📝 | **Mauvais public ↑ différé** (flakes/lowballers, tracé) — downside SANS rivaux | §2c, §2d ; cause `EXPO_MAUVAIS_PUBLIC` |
| 📝 | Décroissance passive si on lève le pied + plafond | §2c ; consts `EXPO_DECAY_JOUR`, `EXPO_CAP` (§7) |

## 6. Diagnostic / pré-écho

| État | Feature | Renvoi |
|---|---|---|
| 📝 | Le feed = **le rapport de minuit qui parle pendant la journée** (anticipation + diagnostic in-fiction des causes) | §0, §1 |

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
  cause (contrat `cause`, §5–§6).

**⛔ Hors bloc social** : appro/darkweb/Ubeur, coupe, allocation/vente,
dette/fournisseur, moteur heat, rivaux (en pause v2), heat autorités. Le social
*touche* la réput/expo mais ne les *calcule* pas.

## Sous-livrables par maturité

- **✅ Déjà là** : feed / stories / commentaires scriptés (`crimworld/index.html`)
  + dico (asset `slang/`).
- **📝 Cœur à construire** : drop-promesse, axe expo / mauvais public,
  voix-qui-se-souviennent, ton = jauge opaque, branchement du dico.
- **🔜 Affinage** : escalade de registre (power fantasy), trace inter-jours côté
  feed (rejoint sandbox lot 5).

---

# PARTIE II — LE DESIGN

## 0. Pourquoi ce lot existe — la couche manquante

La sandbox prouve deux choses (arbitrage *ressenti*, trace *lisible*). Ce sont
des **critères de designer**, pas une **raison de jouer**. Il manque la réponse
à : *pourquoi un humain passerait sa soirée là-dedans ?*

Réponse de ce lot : **l'ambiance**. Le hub social (« Snapshit ») est l'endroit
où la simulation devient un *lieu où on a envie d'être* — power fantasy, codes
de la rue, langage fleuri, réalisme cru et WTF assumé (réf. *Schedule 1* : la
sim est serrée, le **ton** ne se prend pas au sérieux). Le pari : ce ton plaît à
un public large, indépendamment de la recherche de performance.

**Recadrage central.** Le feed n'est pas un cadran de leviers de plus (sinon =
mur de taps « +X »). C'est **le rapport de minuit qui parle pendant la journée,
avec une gueule** : la version diégétique, à chaud, incarnée et *partielle* de
ce que le bilan nommera froidement le soir. Il ne **produit** pas de ressources ;
il **coûte** (un seul acte qui pèse) et il **révèle** (anticipation + diagnostic).

Trois piliers, au même rang :

- **A. Axe EXPOSITION** — un cadran séparé de la réput, poussé par les actes
  sociaux (le pendant social du levier prix de la sandbox §2d).
- **B. Le DROP-PROMESSE** — l'unique vrai acte social, un **bluff** : hype
  maintenant ↔ scrutin plus tard. Sanction différée et silencieuse, tracée.
- **C. Le TON / la VOIX DU BLOCK** — l'ambiance comme **système** (pas comme
  finition cosmétique) : une troupe de voix récurrentes qui se souviennent.

---

## 1. Principe directeur — le feed est un MIROIR, pas un panneau de commandes

| Le feed N'EST PAS | Le feed EST |
|---|---|
| une liste de boutons « j'engage pour +réput » | un miroir incarné de ton état |
| un compteur de followers à faire monter | la **jauge de réput opaque**, lue dans le *ton* des réactions |
| une source de ressources | une source d'**anticipation** (poster → attendre qui débarque) et de **diagnostic** (pré-écho du rapport) |
| de la narration ambiante random | des **personnages** qui te connaissent et **tracent** une cause |

Conséquence design : **peu d'actes sociaux, idéalement UN** (le drop, §3). Tout
le reste du hub est **présentation** — donc terrain libre vis-à-vis des
invariants (cf. §6).

---

## 2. Pilier A — l'axe EXPOSITION (séparé de la réput)

### 2a. Pourquoi un axe séparé
La réput conso (la demande, opaque) et l'exposition (l'attention) sont des
**co-effets PARALLÈLES** de ta visibilité, jamais une chaîne. Faire passer
l'expo par la réput les confondrait. L'expo est donc un **cadran propre**, à la
manière de la pression-corner de la sandbox §2b — mais avec un downside qui ne
réveille pas les rivaux (pivot v2).

### 2b. Ce qui pousse l'expo (co-effets, traçables)
- poster une vitrine / un drop (§3),
- volume écoulé *visible*,
- coupe à l'arrache (qualité basse, visible dans les réactions).

### 2c. Les deux sorties parallèles de l'expo
- **Demande ↑ (le payoff de cupidité)** : plus d'yeux → bassin d'acheteurs
  élargi → plus de DM.
- **Mauvais public ↑ (le downside, DIFFÉRÉ et tracé)** : la part de
  **flakes / lowballers / emmerdeurs** monte dans le bassin. *C'est le downside
  canonique d'expo SANS rivaux* — il reste dans le périmètre (rue) et réutilise
  la mécanique « composition du bassin = f(état) » de la sandbox §4.

> ⚠️ Invariant : JAMAIS « moins de ventes → mauvais public ». Demande et mauvais
> public sont deux **sorties parallèles** de la même cause (l'expo), pas une
> chaîne. L'expo **décroît** passivement si on lève le pied, et est **plafonnée**.

### 2d. Décision DNA à trancher (checkpoint)
Le downside d'expo retenu est **« sur-exposition → mauvais public différé »**
(et NON le retour des rivaux). Ça amende §8.1 de la sandbox. À valider.

---

## 3. Pilier B — le DROP-PROMESSE (le bluff)

### 3a. Le problème actuel
Le drop est un `+réput` gratuit, 1×/jour, sans downside — le trou exact qu'on a
bouché côté prix (sanction différée et silencieuse, sandbox §2d). On lui donne
la **même forme**.

### 3b. La forme : une promesse publique
> Un drop = une **promesse** faite au block (« gros arrivage premium ce soir »,
> ou ciblée sur un segment). Effet immédiat : **spike d'attention/demande**
> (cupidité, expo↑). Effet armé : une **attente de qualité**. Si le prochain
> batch tient la promesse → le spike se convertit. S'il ne la tient pas
> (tu as hypé puis vendu de l'arrache) → **cry-wolf** : effondrement différé de
> confiance, **tracé** au rapport (« 6 clients t'ont lâché ↩ tu avais hypé un
> drop premium il y a 2 jours »).

### 3c. Pourquoi c'est l'unique acte qui pèse
- **Arbitrage ressenti** (critère §0 de la sandbox) : tu *hésites* avant de
  sur-hyper. Cupidité (eyes now) ↔ prudence (scrutin later).
- **Rattaché au levier unique** : la sanction = écart entre qualité *promise* et
  qualité *livrée*. Déterministe, jamais un tirage.
- **Co-effet parallèle** : le drop agit sur la demande/expo, il ne « cause » pas
  la pression via les ventes.

### 3d. Fusion avec le « drop ciblé »
Promettre **à un segment** (premium vs volume) est la même mécanique avec une
cible : l'écart promesse↔livraison se mesure contre les attentes *de ce segment*.
Le drop générique et le drop ciblé sont **un seul système paramétré**.

### 3e. Anti-abus (cry-wolf)
Sur-droper (promesses répétées non tenues) **érode la crédibilité** des futurs
drops (le spike rapetisse), de façon **déterministe et tracée** — pas un
cooldown arbitraire. Le block apprend que tu bluffes.

---

## 4. Pilier C — le TON / la VOIX DU BLOCK (l'ambiance comme système)

### 4a. Le ton vit dans la PRÉSENTATION (donc gratuit vis-à-vis des invariants)
Langage fleuri, codes de la rue, WTF, réalisme cru : tout ça est de la
**présentation**. Les invariants interdisent l'aléatoire dans l'*état/les
conséquences*, pas dans le *texte*. **Aucune règle de sim n'est touchée.**

### 4b. Le ton EST la jauge de réput opaque
§8.4 sandbox = réput **totalement opaque**. On **supprime le compteur exact**
(`40 + réput×6` est une fuite) et on le remplace par le **ton des réactions** :
chaleureux / neutre / méfiant / hostile selon la tendance de réput. Le joueur
*sent* sa cote dans la manière dont on lui parle, ne lit aucun chiffre. Le feed
devient la jauge diégétique.

> Note de vocabulaire : ce **ton** (chaleur de la réaction) ≠ le **registre**
> linguistique du dico (`cite`/`rap`/`verlan`/`prison`…, §4g). Le ton vient de
> l'état ; le registre vient du choix éditorial/de la voix.

### 4c. Une troupe de voix récurrentes (pas des strings jetables)
Des **personnages persistants** (archétypes : l'accro, la comtesse, le
lowballer, le petit qui t'idolâtre…) qui :
- ont une personnalité stable,
- **se souviennent** : un comm qui te clashe aujourd'hui rappelle ton drop foireux
  d'avant-hier. → c'est **drôle ET c'est la trace diégétique de la cause** (le WTF
  et la pièce maîtresse se renforcent au lieu de se concurrencer).

### 4d. Power fantasy = reconnaissance, pas un chiffre
La montée se lit dans **l'escalade de registre** : on passe du mépris (« c'est
qui lui ») à la déférence (« le plug a du bon »). Flex compatible opacité.

### 4e. Le contraste comme outil de ton
Le **rapport de minuit** est froid, clinique, nomme la cause. Le **feed** est
vulgaire, à chaud, vivant. Le contraste *est* le ton : le sérieux du bilan rend
la déconne du feed plus drôle, et inversement.

### 4f. Garde-fou (non négociable)
Le WTF **porte** la cause, ne l'enterre jamais. Comédie au service de la
lisibilité de la trace, jamais l'inverse. L'edge gratuit lasse ; ce qui tient,
ce sont les **personnages qui reviennent**, pas les vannes choc isolées.

### 4g. Deux couches : le DICO (vocabulaire) + les VOIX (phrases)

Il existe **déjà** un asset transverse — **ne pas réinventer** :

- **`slang/dico-trafic.json`** (+ `slang/README.md`), sur `main` ; en ligne :
  `https://nobletsylvain.github.io/prototypes/slang/`. **29 concepts / 410
  termes / 8 langues** (`fr, en-US, en-GB, es, it, de, nl, pt-BR`), registres
  `courant/cite/rap/verlan/police/regional/prison`. Schéma :
  `concepts[CLÉ].terms[langue][] → { term, register?, region?, note? }`
  (ex. `SELL_POINT` → `four`, `charbon`, `trap`, `boca`…). Son README pose déjà
  l'alignement invariant (**présentation only**, aucun terme ne pilote l'état).

C'est la couche **VOCABULAIRE** (comment *nommer* : noms de lieux, rôles,
produit, came, thune…) **+ i18n**. Elle n'est PAS la couche voix.

La spec ajoute la couche **VOIX / PHRASES** (ce que le block *dit*), **mince et
posée par-dessus le dico** — elle pioche les noms dans le dico → argot crédible
et localisé gratuitement. Schéma proposé :

```text
voix:    { id, archétype, avatar, registre_dico }   // la troupe (§4c) ;
                                                     // registre_dico ∈ registres du dico
phrases: { ton: 'chaleureux'|'neutre'|'méfiant'|'hostile',   // pioché par état (§4b)
           contexte: 'drop'|'qualité_basse'|'volume'|'cry_wolf'|'ambiant', // mappe §5
           gabarit }   // gabarit à trous : « {SELL_POINT} tourne fort frérot 🔥 »
callbacks: { cause_code, gabarit }   // rappel d'une décision passée → trace (§4c/§4e)
```

Clés : le `ton` vient de l'**état** (jauge opaque, §4b) ; le `registre_dico`
vient de la **voix/éditorial** ; les **trous `{CONCEPT}`** sont résolus depuis
`dico-trafic.json` selon la locale → i18n du flavour offerte. Aucune logique de
jeu : juste du texte indexé.

> Le matériau brut existe aussi **inline** dans le prologue `crimworld/index.html`
> (commentaires du block ~l.1263, DM du Terrain ~l.1289) : à **migrer** vers ce
> schéma de phrases, en pointant ses noms vers les concepts du dico.

---

## 5. Contrat de données `cause` (ce que la sim devra produire)

Le hub ne crée aucune logique : il **rend** des conséquences produites par la
sim, chacune portant sa `cause` lisible (contrat de données existant). Nouveaux
codes de cause attendus (sim, lot ultérieur) :

| Code (placeholder) | Sens | Origine traçable |
|---|---|---|
| `EXPO_MAUVAIS_PUBLIC` | part de flakes/lowballers ↑ (différé) | sur-exposition (drops/volume visibles aux tours N-k) |
| `DROP_SPIKE` | spike de demande/expo immédiat | la décision « poster un drop » de ce tour |
| `DROP_PROMESSE_TENUE` | conversion du spike | qualité livrée ≥ qualité promise |
| `CRY_WOLF` | effondrement différé de confiance | écart promesse↔livraison aux tours N-k |
| `CREDIBILITE_EROSION` | spike futur rapetissé | promesses répétées non tenues |

Le **ton** d'une réaction (§4b) est dérivé de l'état (réput/expo) **dans la
présentation** ; il ne crée pas de conséquence et n'a pas besoin de `cause`.

---

## 6. Invariants (rappel + comment ce lot les respecte)

- **Aucun aléatoire pilotant l'ÉTAT/les CONSÉQUENCES.** Spike, cry-wolf, mauvais
  public, érosion de crédibilité = **déterministes**, tracés. Le **texte** des
  voix (qui parle, pseudo, vanne) est présentation → aléatoire **autorisé**.
- **Qualité = levier UNIQUE.** Demande et expo = co-effets **parallèles** ; le
  drop relie la promesse à la **qualité livrée**, jamais aux ventes.
- **Une seule courbe** (demande ↔ qualité), réglée par un humain au checkpoint ;
  expo et crédibilité = constantes nommées (§7).
- **Contrat `cause`** sur chaque conséquence ; le hub rend le label, n'invente
  rien.
- **Opacité réput** : compteur exact **supprimé** ; ton du feed = jauge (§4b).

---

## 7. Constantes nommées (PLACEHOLDERS — non réglées ; réglage humain plus tard)

```text
// --- Axe EXPOSITION (séparé de la réput) ---
EXPO_PAR_DROP            // expo gagnée par drop posté
EXPO_PAR_VOLUME          // expo par dose écoulée (visible)
EXPO_DECAY_JOUR          // retombée passive si on lève le pied
EXPO_CAP                 // plafond d'exposition
EXPO_SEUIL_MAUVAIS_PUBLIC// au-delà : part de flakes/lowballers ↑
EXPO_DELAI_MAUVAIS_PUBLIC// décalage (jours) avant que le mauvais public arrive

// --- DROP-PROMESSE ---
DROP_SPIKE_AMPLITUDE     // taille du spike de demande/expo immédiat
DROP_QUALITE_PROMISE_DEF // qualité « promise » par défaut (drop générique)
CRY_WOLF_SEUIL_ECART     // écart promesse↔livraison déclenchant le cry-wolf
CRY_WOLF_DELAI           // décalage (jours) avant l'effondrement de confiance
CRY_WOLF_AMPLEUR         // ampleur de la perte différée
CREDIBILITE_DECAY        // érosion du spike par promesse non tenue répétée
```

---

## 8. Hors périmètre (ne pas coder, signaler)

- Rivaux / concurrence pour le corner : **en pause (pivot v2)** ; ce lot ne les
  rallume pas.
- Heat autorités, pureté, réput de relation, violence, branding, blanchiment :
  hors périmètre (rappel sandbox §6).
- Le hub ne contient **aucune logique de jeu** (elle vit dans la sim).

---

## 9. Ordre de construction — où ça s'insère

Discipline DNA : **sim d'abord (console-testable), UI ensuite, reviewer, commit.**
Ce lot social se branche sur les lots de la sandbox :

- **Sim** : l'axe expo + le drop-promesse + cry-wolf rejoignent le **Lot 3**
  (moteur heat + prix) de la sandbox — même famille (co-effets parallèles,
  sanction différée). Constantes §7, console-testable, sans UI.
- **UI / hub** : la troupe de voix, le ton-comme-jauge, le contraste
  rapport↔feed viennent **après** la sim, au-dessus d'elle (présentation pure).
- **Intégration** : les causes `EXPO_*`, `DROP_*`, `CRY_WOLF` apparaissent dans
  le **rapport cumulatif** (Lot 5 sandbox), reliées aux tours passés.

---

## 10. À trancher au checkpoint

1. **Downside d'expo** : on valide « sur-exposition → mauvais public différé »
   (§2d) plutôt que le retour des rivaux ? (amende §8.1 sandbox)
2. **Followers** : on **supprime** le compteur exact au profit du ton-jauge
   (§4b) — confirmé ?
3. **Drop** : un **seul système** drop générique + drop ciblé (§3d) — ok ?
4. **Périmètre du ton** : jusqu'où pousse-t-on le WTF / langage cru (curseur
   éditorial) ? (§4f garde-fou : la comédie ne doit pas noyer la trace)
5. **Lexique** : on réutilise `slang/dico-trafic.json` comme couche
   **vocabulaire** (i18n) et on bâtit la couche **voix/phrases** par-dessus
   (gabarits à trous `{CONCEPT}`, §4g) — confirmé ? (le dico est sur `main`,
   pas encore lié au hub ni branché dans un proto)
