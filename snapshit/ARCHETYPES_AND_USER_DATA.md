# Snapshit — Archétypes & données par *user* (contrat de données)

> **À qui** : un agent/session **dédié au peuplement** de Snapshit (les profils du
> hub social et leurs voix). **Ce doc est autosuffisant** : tu peux l'exécuter sans
> le reste de la conversation. Il fixe **le modèle de données d'un user** et **le
> roster d'archétypes**, alignés *exactement* sur ce que le moteur consomme déjà.
>
> **Périmètre** : archétypes + données par user (+ le dico d'argot). Pour le reste
> du brief de contenu (avatars, stories d'acteurs, likes/vues, historiques),
> voir le doc compagnon `snapshit/CONTENT_GEN_BRIEF.md`.

---

## 0. Coordonnées & documentation

| Quoi | Où |
|---|---|
| Dépôt | `nobletsylvain/prototypes` (GitHub) |
| Branche de travail | celle de ta session (créée pour toi). PR en **draft**, merge dans `main`. |
| Le proto (code = source de vérité) | [`snapshit/index.html`](../snapshit/index.html) — un seul fichier (HTML+CSS+module JS) |
| Brief contenu (large) | [`snapshit/CONTENT_GEN_BRIEF.md`](./CONTENT_GEN_BRIEF.md) |
| **Dico d'argot** (source) | [`slang/dico-trafic.json`](../slang/dico-trafic.json) + [`slang/README.md`](../slang/README.md) |
| Spec hub social (cadre design) | [`crimworld/FEATURES_HUB_SOCIAL.md`](../crimworld/FEATURES_HUB_SOCIAL.md) |
| Rendu live (GitHub Pages) | https://nobletsylvain.github.io/prototypes/snapshit/ |

> **Avant d'écrire quoi que ce soit**, lis `snapshit/index.html` (sections `VOICES`,
> `genProfile`, `DICO`, `LINES`, `MSG`, `buildDMs`, `doDMAction`, `addToPool`,
> `reup`) et `slang/README.md`. Le code prime sur ce doc en cas d'écart — et si tu
> en repères un, **signale-le** plutôt que de l'ignorer.

---

## 1. Ce que le moteur fait d'un *user* (le contrat)

Un *user* Snapshit est soit une **voix nommée récurrente** (la « troupe »), soit un
**anonyme généré à la volée** (la « foule »). Dans les deux cas, le moteur ne
manipule qu'un petit noyau de champs. **Tout le reste que tu produis est du
décor** (présentation) que le moteur *pioche* — il ne doit jamais piloter l'état.

### 1.1 Champs réellement consommés par le code (⚙️ = ne pas renommer)

Un DM entrant (`dmObj`) et une fiche carnet (`addToPool`) se résument à :

```jsonc
{
  "nm":      "Kévin",     // ⚙️ pseudo affiché
  "av":      "🧃",        // ⚙️ avatar (emoji) — fallback universel, DOIT exister
  "protag":  "kevin",     // ⚙️ IDENTITÉ D'ARCHÉTYPE (clé de mémoire) — voir §2
  "kind":    "lowball",   // ⚙️ type de demande : "genuine" | "lowball" | "flake"
  "qty":     12,          //   quantité demandée (moteur)
  "tone":    "mefi",      //   ton = réput OPAQUE : "chaleureux"|"neutre"|"mefi"|"hostile"
  "msg":     "…{QTY}…"    //   texte (gabarit, voir §3) — c'est CE que tu génères
}
```

Et la mémoire de relation (carnet 1:1) ajoute par user :
`goodwill` (0–100, opaque), `buys`, `lastBuy`, `lastContact`, `pref` (`"premium"|"any"`).

> **Point crucial** : le moteur attache les conséquences à **`protag`** (l'identité
> d'archétype), **pas** à `nm`/`av`. Deux anonymes différents partagent
> `protag:"client"`. Une voix nommée a un `protag` **stable** (= son `id`). C'est
> ça qui fait qu'« un perso se souvient ». **Tes données doivent donc fixer le bon
> `protag` pour chaque user**, sinon la mémoire ne s'accroche pas.

### 1.2 Le `tone` encode la réput — qui est **opaque**

Le ton (`chaleureux/neutre/mefi/hostile`) est dérivé par le moteur de la réputation
du joueur. **Tu n'écris jamais un chiffre de cote/followers** dans une réplique :
la cote se *lit dans le ton*. Tu fournis donc, pour chaque slot, **une variante par
ton pertinent**.

---

## 2. Le roster d'ARCHÉTYPES (autoritatif — copié du moteur)

Le moteur connaît aujourd'hui ces `protag`. **Garde ces `id` exacts** pour brancher
la mémoire existante ; un *nouvel* archétype = nouvel `id` **mais** il restera un
simple « skin » tant que le code ne lui attache pas de conséquence (à signaler).

| `protag` (id) | Visage (code) | `kind` | Ce dont il se souvient (mécanique réelle) | Constantes moteur |
|---|---|---|---|---|
| `accro` | L'accro 😵 | genuine (spécial) | son **manque** : `accroStreak` ↑ chaque jour → demande qui escalade ; plancher de la demande (toujours là) | `REUP_BASE.accro = 1` (reprend toujours) |
| `comtesse` | La Comtesse 👑 | genuine (spécial) | tes **promesses premium** : trahie (cry-wolf premium) → `comtesseState='parti'` (te lâche, quitte le bassin) ; promesse premium tenue → `'fan'` (revient, paie ~×1.6) | `REUP_BASE.comtesse = 0.65`, `pref:"premium"` |
| `kevin` | Kévin 🧃 | lowball | combien de fois tu l'as **bradé** : `protagBrade.kevin` ; au 3e bradage il « ramène toute l'équipe » (escalade mauvais public) | ouvre toujours le bal des lowballers |
| `sami` | Sami 🧢 | genuine | rien (extensible) — le « régulier » fiable | `REUP_BASE.sami = 0.75` |
| `petit` | Le petit du 4 🧒 | genuine | rien — le jeune curieux/naïf | `REUP_BASE.petit = 0.6` |
| `ancien` | L'ancien 🚬 | genuine | rien — le vieux routier, sec, désabusé | `REUP_BASE.ancien = 0.45` (relancable mais distant) |
| `client` | (foule) 👥 | genuine | rien — **anonyme** générique servi au détail | `REUP_BASE.client = 0.65` |
| `flake` | (foule) 🦗 | flake | rien — pose un RDV, ne vient jamais | — |

Notes de cohérence à respecter :
- **`accro` / `comtesse` / `kevin`** sont gérés à part (exclus de la « foule
  neutre » `CROWD_VOICES`). Leurs lignes ont des **escalades mémoire** dédiées
  (`accroLine()`, `MSG.comtesse`, répliques de bradage de Kévin).
- `REUP_BASE` = propension à racheter quand on les **relance** au carnet
  (déterministe : `propension × goodwill ≥ seuil`). Donne aux personnages à forte
  propension des lignes de relance enthousiastes, aux faibles des lignes tièdes.
- **`pref`** : seule `comtesse` est `"premium"` aujourd'hui ; les autres `"any"`.

### 2.1 `archetype` (famille) vs `protag` (id moteur)

Pour chaque user tu donnes **les deux** :
- **`id`/`protag`** : la clé technique (ci-dessus pour la troupe ; `null`→`"client"`
  ou `"flake"` pour la foule).
- **`archetype`** : l'étiquette de **famille de comportement** (lisible), qui guide
  le registre et le contenu. Familles proposées (liste ouverte) :
  `accro · connaisseur · lowballer · regular · jeune · ancien · flake · grossiste · touriste · curieux`.

> Si tu crées un archétype **avec** une mémoire (ex. un « balance » qui se souvient
> qu'on l'a grillé), écris **explicitement** à quoi il réagit, et **liste-le comme
> demande de code** (le moteur devra l'implémenter) — ne le noie pas dans la data.

---

## 3. Comment le texte se branche au dico (gabarits `{CONCEPT}`)

Toutes les répliques sont des **gabarits** : le moteur substitue à l'exécution
(`fillConcepts`) chaque `{CONCEPT}` par un terme tiré du dico (**aléatoire de
présentation** autorisé), et `{QTY}` / `{DELAI}` par des valeurs de jeu.

Concepts effectivement utilisés dans les gabarits Snapshit :
`{SELL_POINT}` · `{CUSTOMER}` · `{CANNABIS_WEED}` · `{QUALITY_GOOD}` ·
`{QUALITY_BAD}` · `{MONEY}` — plus les placeholders moteur `{QTY}`, `{DELAI}`.

Exemple réel (banque `MSG`, `kind:lowball`) :
`"gros volume {QTY}, lâche -40% sinon je vais ailleurs"`.

**Règle** : tu écris des **gabarits**, pas du texte figé, dès qu'un concept du dico
peut s'appliquer. Tu n'inventes pas de nouveau `{CONCEPT}` sans l'ajouter au dico.

---

## 4. LE DICTIONNAIRE d'argot (inclus)

### 4.1 Le fallback embarqué dans le proto (`DICO`)

Le proto reste autonome même sans réseau grâce à ce sous-ensemble **embarqué** —
c'est le minimum que tes gabarits peuvent supposer présent :

```js
DICO = {
  SELL_POINT:   ['le four','le tieks','le block','le terrain'],
  CUSTOMER:     ['les clients','les reufs','la clientèle','les habitués'],
  CANNABIS_WEED:['la beuh','la frappe','la verte'],
  QUALITY_GOOD: ['de la frappe','du haut de gamme','de la bonne'],
  QUALITY_BAD:  ['du pneu','de la merde','du sale'],
  MONEY:        ['la moula','les lovés','les bif'],
}
```

À l'amorçage, le proto **fusionne** par-dessus, si présent,
`../slang/dico-trafic.json` (concepts `SELL_POINT/CUSTOMER/CANNABIS_WEED/MONEY`).

### 4.2 La source de vérité : `slang/dico-trafic.json`

Asset **transverse** (Hash Slicer, CrimWorld, Snapshit), pensé i18n. État actuel :
**29 concepts, 410 termes, 8 langues**. Schéma :

```jsonc
{ "concepts": {
  "SELL_POINT": {
    "gloss": "Point de vente de rue…",
    "category": "roles",
    "terms": {
      "fr":    [{ "term":"four", "register":"cite" }, { "term":"charbon","register":"cite" }],
      "pt-BR": [{ "term":"boca" }]
    }
  }
}}
```

- **Langues** : `fr · en-US · en-GB · es · it · de · nl · pt-BR`
- **Registres** (`register`) : `courant · cite · rap · verlan · police · regional · prison`
- **Concepts (29 clés)** :
  `SELL_POINT · DEALER_RETAIL · LOOKOUT · POLICE_ALERT · SUPPLIER · STASH_KEEPER ·
  RESTOCK · CUT · PACKAGE · CANNABIS_RESIN · CANNABIS_WEED · COCAINE · JOINT ·
  DOSE_UNIT · HASH_BAR · KILO · MONEY · PRICE_UNIT · CREDIT · POLICE · FIREARM ·
  SHOOT_KILL · RAID_RIVAL · NEW_CREW · CUSTOMER · SAMPLE · WORK_DEAL · QUALITY · TRANSPORT`

> ⚠️ **Disclaimer (du README)** : argot **fiction/flavour uniquement**, évolutif,
> régional, parfois forgé par la police (`fantasia`, `Wakanda`). Rien ne décrit un
> procédé réel ; aucun terme ne pilote l'état ni une conséquence.

### 4.3 Ce que TU dois faire sur le dico

Le moteur sait déjà lire `concept → langue → [termes]` avec un `register` par terme.
**Besoin** : densifier **par registre** pour que la Comtesse (bourgeois-connaisseur)
et Kévin (radin-quartier) **ne parlent pas pareil**. Concrètement, pour les concepts
utilisés par Snapshit (§3) **et** `QUALITY` (manque `QUALITY_GOOD`/`QUALITY_BAD`
côté dico — aujourd'hui seulement dans le fallback) :
- **4–8 termes `fr` par concept et par registre** pertinent (au minimum `courant`,
  `cite`, et un registre « chic » pour le connaisseur).
- garder le schéma `{term, register?, region?, note?}` **exact** ;
- ne **rien** retirer d'existant ; n'ajouter que des termes plausibles et sourçables.

---

## 5. Schéma d'un PROFIL de la troupe (la « carte » NPC)

C'est la donnée centrale demandée. Pour **chaque** membre de la troupe :

```jsonc
{
  "id": "kevin",                       // ⚙️ = protag moteur (réutiliser les id existants §2 ; nouveau = à coder)
  "pseudo": "Kévin",                   // ⚙️ -> nm
  "handle": "@kev.du.91",              //   header DM/story (optionnel)
  "avatar": { "emoji": "🧃",           // ⚙️ -> av (obligatoire)
              "image_prompt": "…" },   //   prompt PdP (style clandé/anonyme — cf. CONTENT_GEN_BRIEF §3)
  "tag": "LOWBALLER",                  //   étiquette UI courte
  "archetype": "lowballer",            //   famille de comportement (§2.1)
  "kind_default": "lowball",           //   type de demande dominant (genuine|lowball|flake)
  "pref": "any",                       //   "premium" (Comtesse) | "any"
  "description": "Négocie même l'air…",//   bio 1 ligne, au ton du perso
  "registre": ["cite","radin"],        //   registres de langue à respecter (mappe les register du dico)
  "emoji_signature": ["👀","🤝","😏"], //   1–3 emojis qui « signent » le perso
  "relation_init": "neutre",           //   état de départ vs joueur
  "memory_note": "compte les bradages",//   SI archétype à mémoire : à quoi il réagit (sinon "")
  "lines": { /* voir §6 : ses répliques par slot */ }
}
```

Et pour **la foule** (anonymes), pas de fiche unitaire mais des **générateurs**
(banques `pseudo`/`avatar` + règles), cf. `CONTENT_GEN_BRIEF.md §2` et §7 ci-dessous.

---

## 6. Les répliques attendues **par archétype** (slots du moteur)

Le moteur pioche par **(contexte/kind × ton)**, parfois **× archétype**. Fournir,
par membre de la troupe (et par famille pour la foule), des **listes de variantes
courtes** (≤ ~80 car., 1 emoji max), gabarits `{CONCEPT}`/`{QTY}` :

| Slot | Clés | Ce qu'il faut | Réf. code |
|---|---|---|---|
| **Ouverture de DM** | `kind × ton` (genuine) ; `lowball` ; `flake` ; spéciaux `comtesse`, `accro` | 6–8 variantes/case ; `{QTY}` obligatoire | `MSG`, `accroLine()` |
| **Réplique à une action** | actions `vendre/refuser/brader/poser_rdv/bloquer` × archétype | 2–4 variantes + ligne « système » diégétique ; **inclure les escalades mémoire** (Kévin 3e brade, Comtesse départ/retour, Accro selon streak) | `doDMAction` |
| **Relance carnet (1:1)** | réponse à « je te garde {QTY} ? » : `buy/decline/annoyed/mute` × archétype | 2–3 variantes/case ; cohérentes avec `REUP_BASE` (accro = toujours partant, ancien = tiède) | `reup()` |
| **Commentaire de story** | contexte `ambiant/drop/qualite_basse/qualite_haute/cry_wolf/mauvais_public/promesse_tenue` × ton | 6–10/case **pertinente** (toutes les cases n'existent pas — voir `LINES`) | `LINES`, `lineFor()` |

> **Escalades mémoire = continuité.** Pour `accro/comtesse/kevin`, prévois des
> variantes « callback » qui font référence au passé (le manque qui empire, la
> trahison premium, « encore toi le pigeon »). C'est ce qui rend la troupe vivante.

---

## 7. Livrables & format

JSON prêt à charger (pas de prose), arbo suggérée sous `snapshit/content/` :

| Fichier | Contenu |
|---|---|
| `profiles.json` | la **troupe** : tableau de fiches §5 (avec `lines` §6) |
| `crowd.json` | banques de **la foule** : `pseudo` (fragments + règles pondérées), `avatar` (emojis + prompts génériques par archétype) |
| `lines.json` | (option) si tu sors les `lines` des fiches : `slot → archetype → ton → [variantes]` |
| `dico-trafic.json` | **patch** du dico (§4.3) : nouveaux termes par concept×registre, schéma inchangé |

Cibles v1 (premier lot) :

| Élément | Cible |
|---|---|
| Profils troupe écrits | 15–25 (dont les 6 id existants : `accro/comtesse/kevin/sami/petit/ancien`) |
| Fragments pseudo (foule) | 150–300 |
| Ouvertures DM | 6–8 par (kind × ton) |
| Répliques d'action | 2–4 par (action × archétype), **escalades incluses** |
| Réponses relance carnet | 2–3 par (résultat × archétype) |
| Commentaires story | 6–10 par case non vide de `LINES` |
| Dico : termes par concept × registre | 4–8 (fr au minimum) |

---

## 8. Garde-fous (invariants — NE PAS violer)

1. **Réput opaque** : **zéro** chiffre de popularité/followers/cote dans le texte —
   la cote vit dans le **ton** (`chaleureux/neutre/mefi/hostile`).
2. **Le texte ne décide rien** : aucune conséquence encodée dans une réplique. Le
   contenu est un **pool** ; c'est le moteur qui pioche et qui tient l'état.
   (Aligné sur l'invariant CrimWorld : *aléatoire de présentation* OK, jamais
   d'aléatoire pilotant l'état/les conséquences.)
3. **`protag`/`id` exacts** : réutilise les id moteur (§2) pour brancher la mémoire ;
   tout nouvel archétype à mémoire = **demande de code** signalée à part.
4. **Cohérence registre × archétype** : un perso ne sort pas du ton de sa carte ;
   Comtesse ≠ Kévin au niveau du registre du dico.
5. **Gabarits, pas de figé** : utilise `{CONCEPT}` connus dès que pertinent ;
   n'invente pas de concept sans l'ajouter au dico.
6. **Avatars anonymes** : univers « clandé » — pas de visage net identifiable
   (cf. `CONTENT_GEN_BRIEF.md §3`).
7. **Validation** avant livraison : longueurs respectées, placeholders bien formés
   (`{CONCEPT}` connus), JSON valide, aucun id en doublon avec la troupe.

---

## 9. Définition de « terminé »

- `profiles.json` couvre les **6 archétypes moteur** + extensions, chacun avec ses
  `lines` aux 4 slots (§6) et ses escalades mémoire pour `accro/comtesse/kevin`.
- `crowd.json` génère des anonymes crédibles (≥150 fragments) sans collision avec
  la troupe.
- Patch dico : concepts Snapshit (§3) + `QUALITY_GOOD/QUALITY_BAD` densifiés par
  registre, schéma intact, rien supprimé.
- Tout passe les garde-fous §8. PR **draft**, puis merge `main`.
