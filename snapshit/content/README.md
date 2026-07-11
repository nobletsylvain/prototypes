# Snapshit — `content/` (données users : troupe, foule, voix)

Peuplement des *users* Snapshit, calé sur le contrat **`../ARCHETYPES_AND_USER_DATA.md`**
et le code source de vérité **`../index.html`**. Tout ici est de la **présentation**
(pool piochable) : le moteur décide *quand/à qui*, le texte ne décide rien.

## Fichiers

| Fichier | Contenu |
|---|---|
| `profiles.json` | **La troupe** : 6 archétypes moteur (`accro/comtesse/kevin/sami/petit/ancien`) + faces cosmétiques (`protag:"client"`/`"flake"`), avec `lines` par slot, escalades mémoire, `history` et **`snaps`** (grille de profil : 3–6 × `{emoji,cap}`, du + récent au + ancien). |
| `lines.json` | Banques **partagées** (foule + fallback) : `dm_open` (kind×ton), `story_comment` (ctx×ton), `action_reply`, `reup_reply`. Densifie `MSG`/`LINES`/`accroLine`/`doDMAction`/`reup`. |
| `crowd.json` | Générateurs de **la foule** : banques de pseudo (≥150 fragments) + patterns pondérés, emojis d'avatar, prompts d'avatar génériques par archétype, **`snaps_by_archetype`** (grille générique, 6–8 × `{emoji,cap}` par famille) et **`bio_by_archetype`** (1 bio ≤ ~80 car. par famille). |
| `vcap.json` | Légendes de **ta vitrine** : `by_quality` (`arrache/standard/propre` ×10) + `by_drop` (`vitrine/normal/premium` ×6). Alimente `vcap.big`. |
| `actors.json` | Stories d'**ambiance** des 4 acteurs (`Le Comptoir/Le Campus/La Ruelle/● ARRIVAGE`) : décor, pas d'acheteurs — 8 captions + 4 commentaires d'amorce chacun. |
| `reactions.json` | Vues/likes **opaques** (zéro compteur) : `views_sub` (le `vsub`), `view_gauge` low/mid/high, `likes_by_tone`, `reaction_labels` flous. |
| `histories.json` | Historiques **génériques** de la foule, 1:1 avec les archétypes de `crowd.json` (×6) + `generic`. Pour les anonymes ; la troupe a ses historiques bespoke dans `profiles.json`. |
| `events.json` | Légendes **saisonnières/événementielles** (4 saisons + 10 occasions, `mood` indicatif). Couleur de fond — **data dormante** tant que non câblée (jeu jour-par-jour). |
| `../../slang/dico-trafic.json` | **Patché** (v2) : registres densifiés + nouveaux concepts `QUALITY_GOOD`/`QUALITY_BAD`. |

## Conventions de gabarit (IMPORTANT)

- Concepts utilisés : `{SELL_POINT} {CUSTOMER} {CANNABIS_WEED} {QUALITY_GOOD} {QUALITY_BAD} {MONEY}` + `{QTY} {DELAI}`.
- **Termes du dico = noms BARES** (`four`, `clients`, `beuh`…) → **l'article vit dans le gabarit** :
  `le {SELL_POINT}`, `les {CUSTOMER}`, `de la {CANNABIS_WEED}`.
  - `SELL_POINT` fr : choisis masculins à initiale consonne → `le {SELL_POINT}` toujours correct.
  - `CANNABIS_WEED` fr : féminins → `de la {CANNABIS_WEED}`.
- **`QUALITY_GOOD`/`QUALITY_BAD` = expressions AUTO-PORTÉES** (article inclus : `de la frappe`, `du pneu`)
  car genres mixtes → s'emploient **sans** article ajouté : `c'est {QUALITY_BAD}`, `de la {QUALITY_GOOD}` non.
- Réput **opaque** : zéro chiffre de cote/followers ; la cote = le **ton**.

## Écarts MOTEUR — état (le code prime)

1. ✅ **RÉSOLU — le loader lit `QUALITY_*`.** `index.html` fait désormais
   `grab('QUALITY_GOOD','QUALITY_GOOD')` / `grab('QUALITY_BAD','QUALITY_BAD')` : les deux concepts
   du dico (v2) sont fusionnés. Le fallback embarqué (`DICO`) reste le filet hors-ligne.
2. ✅ **RÉSOLU — `content/*.json` est chargé.** Au boot, `fetch` + `CONTENT` consomment
   `profiles/lines/crowd/vcap/reactions/actors/histories/events` : profils (`applyProfiles`),
   foule (`genProfile`/crowd), historiques & ambiance (`fouleHistory`/`dayAmbiance`) et l'écran
   profil. Le contenu n'est plus en dur.
3. **Convention d'article dans les `LINES` historiques** *(à surveiller)*. Certains gabarits du
   code préfixent l'article (`les {CUSTOMER}`) en supposant un terme bare pluriel, d'autres non.
   Les `lines.json` suivent la convention « article dans le gabarit » + `CUSTOMER` pluriel.
4. **`chic`** a été ajouté à `meta.registres` du dico (v2) pour distinguer Comtesse (chic) de Kévin (cite).
5. ✅ **RÉSOLU — écran profil câblé.** `openProfile()` rend la grille SNAPS et la bio :
   `profil.snaps` → `crowd.snaps_by_archetype[arch]` → fallback ; `profil.description` →
   `crowd.bio_by_archetype[arch]` → fallback (bio **et** caps passées à `fillConcepts`, donc les
   gabarits `{CONCEPT}` s'expansent). Le contrat documente ces 3 slots en **§11**. Données **live**.

## Périmètre figé (v1)

- **Aucun `id`/`protag` moteur nouveau** : les faces en plus sont cosmétiques (`client`/`flake`).
- Mémoire câblée uniquement pour `accro` (streak), `comtesse` (départ/retour premium), `kevin` (3e bradage).
- **Backlog moteur (non produit)** : `grossiste`, `touriste`, `balance` — exigent du code (état + conséquence tracée) avant toute data. Voir contrat §10.
