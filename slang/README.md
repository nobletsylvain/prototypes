# Dico du trafic — slang multilingue

Asset **transverse** aux prototypes (Hash Slicer, CrimWorld/La Bascule, futures boucles).
Sert à deux choses :

1. **Crédibilité** : habiller les protos avec un vocabulaire juste.
2. **Localisation (i18n)** : base de traduction du *flavour*, clé **par concept** puis **par langue**.

> ⚠️ **Usage fiction/flavour uniquement.** Argot **évolutif** et **régional** : il « se réinvente »
> en permanence (brouiller les écoutes, les rendre inexploitables au procès). Certains termes sont
> **forgés par la police**, pas par les trafiquants (`fantasia`, `Wakanda`). Rien ici ne décrit un
> procédé réel. Cohérent avec l'invariant CrimWorld : l'**aléatoire de présentation** (varier/brouiller
> l'affichage des termes) est autorisé ; aucun terme ne pilote l'état ni une conséquence.

## Fichiers

| Fichier | Rôle |
|---|---|
| `dico-trafic.json` | **Source de vérité**. `concepts[CLE].terms[langue][]` → `{ term, register?, region?, note? }` |
| `README.md` | Lecture humaine + sources |

**Langues** : `fr`, `en-US`, `en-GB`, `es`, `it`, `de`, `nl`, `pt-BR`
**Registres** : `courant`, `cite`, `rap`, `verlan`, `police`, `regional`, `prison`
**État** : 29 concepts, 410 termes.

## Schéma (exemple)

```json
{
  "concepts": {
    "LOOKOUT": {
      "gloss": "Guetteur : surveille les accès et donne l'alerte.",
      "category": "roles",
      "terms": {
        "fr":   [{ "term": "chouf", "register": "cite", "note": "arabe « regarde »" }],
        "pt-BR":[{ "term": "olheiro" }, { "term": "fogueteiro", "note": "alerte aux fusées" }]
      }
    }
  }
}
```

### Usage i18n (pseudo)

```js
import dico from "./slang/dico-trafic.json";
// terme principal d'un concept dans une langue
const term = dico.concepts.LOOKOUT.terms[locale]?.[0]?.term ?? "guetteur";
// variante aléatoire (aléatoire de PRÉSENTATION uniquement)
const variants = dico.concepts.SELL_POINT.terms[locale] ?? [];
```

## Concepts (clés)

`SELL_POINT` · `DEALER_RETAIL` · `LOOKOUT` · `POLICE_ALERT` · `SUPPLIER` · `STASH_KEEPER` ·
`RESTOCK` · `CUT` · `PACKAGE` · `CANNABIS_RESIN` · `CANNABIS_WEED` · `COCAINE` · `JOINT` ·
`DOSE_UNIT` · `HASH_BAR` · `KILO` · `MONEY` · `PRICE_UNIT` · `CREDIT` · `POLICE` · `FIREARM` ·
`SHOOT_KILL` · `RAID_RIVAL` · `NEW_CREW` · `CUSTOMER` · `SAMPLE` · `WORK_DEAL` · `QUALITY` · `TRANSPORT`

## Français — noyau (source : article de référence)

Vocabulaire le plus crédible, issu de l'article *« Arah », « guitarisé »… Le dico du trafic de drogue
est stupéfiant* (20 Minutes) — Marseille/Paris, et **mots forgés par la police**.

| Terme | Concept | Sens |
|---|---|---|
| **arah / arahhh** | POLICE_ALERT | Cri du guetteur (Marseille). Arabe *akha* = « attention » |
| **artena** | POLICE_ALERT | Équivalent parisien. Arabe = « laisse tomber » |
| **chouf** | LOOKOUT | Guetteur. Arabe = « regarde » (« chouf les bleus ») |
| **four** / **charbon** | SELL_POINT | Point de vente où l'on « cuisine » (coupe + conditionne) |
| **charbonneur** | DEALER_RETAIL | Vendeur du four (bas de l'échelle) |
| **jobber** | DEALER_RETAIL | Celui qui « bosse » le point (de l'anglais *job*) |
| **mach** | COCAINE | Cocaïne (abrégé *machin/mâche*) |
| **guitare** | FIREARM | Arme, le plus souvent une Kalachnikov |
| **guitarisé** | SHOOT_KILL | Kalaché (SCH, *Bande organisée*) |
| **fantasia** | RAID_RIVAL | *(mot police)* Raid mitraillé sur un point rival |
| **Wakanda** | NEW_CREW | *(mot police)* Nouvelle équipe (réf. Marvel) |
| **à crome** | CREDIT | Faire à crédit (vieil argot) |
| **charcler** | SHOOT_KILL | Tuer (vieil argot) |
| **beuh / beuher** | CANNABIS_WEED | Herbe (verlan de « herbe ») |
| **jaune / marron / noir** | QUALITY | Qualités de haschisch |

Complément courant : `charbonner`, `bicraver`, `réup`, `nourrice`, `savonnette`, `barrette`, `pochon`,
`teush`, `peuf`, `oseille/lové/biff`, `les bleus/keufs/condés`, `kalach/calibre`.

## Le monde — points saillants par langue

- **en-US** : `plug`/`connect` (fournisseur), `trap (house)` (point), `re-up`, `brick`/`key` (kilo),
  `cut`/`step on` (couper), `feds`/`5-0` (police), `strap`/`burner` (arme), `fire` (top qualité).
- **en-GB** (*county lines*) : `the line` (réseau), `going OT`, `trapping`, `food`/`work` (came),
  `tick` (crédit), `soap bar`/`nine bar` (hasch), `runners`/`youngers`, `plugging`.
- **es** : `camello`/`trapichear`, `papelina`/`china` (dose), `costo`/`chocolate` (hasch),
  `perico`/`farlopa` (coke), `la pasma`/`maderos` (police), `¡agua!` (alerte).
- **it** : `spacciatore`, `piazza di spaccio`, `vedetta`/`fare il palo` (guet), `fumo`/`erba`,
  `bianca` (coke), `panetto` (pain), `tagliare` (couper), `paranza`/`stesa` (Naples).
- **de** : `Dealer`/`ticken`, `Ticket` (unité), `strecken` (couper), `Gras`/`Bubatz`, `Koks`,
  `Bullen` (police), `Para`/`Kohle` (argent).
- **nl** (*Mocro Maffia*) : `uitkijk` (guet), `versnijden` (couper), `wiet`/`hasj`/`coke`,
  `go fast`, `afrekening` (règlement de compte), `wouten` (police).
- **pt-BR** : `boca de fumo` (point), `vapor` (vendeur), `avião` (passeur), `olheiro`/`fogueteiro`
  (guet aux fusées), `dono da boca` (chef), `batizar` (couper), `tijolo` (kilo), `nóia` (usager).

## Sources

- *« Arah », « guitarisé »… Le dico du trafic de drogue est stupéfiant* — **20 Minutes** (article de référence, fourni en PDF).
- [« Saraf », « charcleurs », « guitares »… le vocabulaire du narcotrafic marseillais — France 3 Régions](https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/bouches-du-rhone/marseille/saraf-charcleurs-guitares-le-vocabulaire-tres-codifie-des-organisations-pyramidales-du-narcotrafic-marseillais-2935131.html)
- [Argot spécial : drogue — languefrancaise.net (Bob)](https://www.languefrancaise.net/Usage/32)
- [Drug Dealer Slang: 50+ Street Names — Resurgence Behavioral Health](https://www.resurgencebehavioralhealth.com/drug-dealer-slang/)
- [Glossary of Terms: Drug Dealers and the Drug Trade — Linda C J Turner](https://lindacjturner.com/2024/09/19/glossary-of-terms-drug-dealers-and-the-drug-trade/)
- [Gergo da pusher / vedette — PalermoToday & Il Giornale Popolare](https://www.palermotoday.it/cronaca/arresti-droga-capaci-carini-isola-intercettazioni.html)
- [Gírias do tráfico — Portal Educação & Portal Insights (vapor, olheiro, boca)](https://blog.portaleducacao.com.br/girias-utilizadas-no-mundo-das-drogas/)

> Vocabulaire à enrichir au fil des protos. Bumper `meta.version` dans `dico-trafic.json` après un gros ajout.
