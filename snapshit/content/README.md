# Snapshit — `content/` (données users : troupe, foule, voix)

Peuplement des *users* Snapshit, calé sur le contrat **`../ARCHETYPES_AND_USER_DATA.md`**
et le code source de vérité **`../index.html`**. Tout ici est de la **présentation**
(pool piochable) : le moteur décide *quand/à qui*, le texte ne décide rien.

## Fichiers

| Fichier | Contenu |
|---|---|
| `profiles.json` | **La troupe** : 6 archétypes moteur (`accro/comtesse/kevin/sami/petit/ancien`) + faces cosmétiques (`protag:"client"`/`"flake"`), avec `lines` par slot et escalades mémoire. |
| `lines.json` | Banques **partagées** (foule + fallback) : `dm_open` (kind×ton), `story_comment` (ctx×ton), `action_reply`, `reup_reply`. Densifie `MSG`/`LINES`/`accroLine`/`doDMAction`/`reup`. |
| `crowd.json` | Générateurs de **la foule** : banques de pseudo (≥150 fragments) + patterns pondérés, emojis d'avatar, prompts d'avatar génériques par archétype. |
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

## ⚠️ Écarts à traiter côté MOTEUR (le code prime — signalés, non codés ici)

1. **Le loader ne lit pas `QUALITY_*`.** `index.html` ne `grab()` que
   `SELL_POINT/CUSTOMER/CANNABIS_WEED/MONEY` depuis le JSON. Les nouveaux
   `QUALITY_GOOD`/`QUALITY_BAD` (ajoutés au dico) **ne seront pas fusionnés** tant que
   `grab('QUALITY_GOOD','QUALITY_GOOD')` et `grab('QUALITY_BAD','QUALITY_BAD')` ne sont pas
   ajoutés. En attendant, le fallback embarqué (`DICO`) reste la source pour ces deux concepts.
2. **`content/*.json` n'est pas encore chargé.** Le moteur a `MSG`/`LINES`/`accroLine`/
   `doDMAction`/`reup` **en dur**. Pour consommer `profiles.json`/`lines.json`/`crowd.json`,
   il faut un chargeur (un `fetch` + merge analogue au loader du dico). C'est du **code moteur**
   (hors périmètre data) : décrit, pas câblé.
3. **Convention d'article incohérente dans les `LINES` existantes.** Certains gabarits du code
   préfixent l'article (`les {CUSTOMER}`) en supposant un terme bare pluriel, d'autres non.
   Au moment du câblage, harmoniser (les nouveaux `lines.json` suivent la convention « article
   dans le gabarit » + `CUSTOMER` pluriel).
4. **`chic`** a été ajouté à `meta.registres` du dico (v2) pour distinguer Comtesse (chic) de Kévin (cite).

## Périmètre figé (v1)

- **Aucun `id`/`protag` moteur nouveau** : les faces en plus sont cosmétiques (`client`/`flake`).
- Mémoire câblée uniquement pour `accro` (streak), `comtesse` (départ/retour premium), `kevin` (3e bradage).
- **Backlog moteur (non produit)** : `grossiste`, `touriste`, `balance` — exigent du code (état + conséquence tracée) avant toute data. Voir contrat §10.
