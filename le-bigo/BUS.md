# Le Bigo — bus d'économie partagée (contrat postMessage)

Le téléphone (`le-bigo/index.html`) est l'« OS » : il possède l'état partagé
(caisse, heat, stock) et embarque les **vrais protos** en iframe. Chaque proto
gagne un mode `#embed=bigo`, **inerte en standalone** (précédent :
`crimworld/coupe.html#embed=prologue`).

## Flag d'URL

- `#embed=bigo` — active le mode embarqué.
- Protos d'atelier uniquement : `&g=<grammes>&q=<qualité 0-100>` (le lot brut à travailler).
- Récolte uniquement : `&b=<Variete>:<g>:<q>,<Variete>:<g>:<q>,…` (le branchage séché à travailler ;
  noms de variété URL-encodés).

## Économie partagée — LE référentiel (tous les modes embed s'y alignent)

Une seule courbe de valeur, pilotée par la qualité (0-100) :

```
street(q) = 4 + 0.09 × q        // valeur de rue €/g  (q50→8.5, q65→9.9, q80→11.2)
```

Canaux de vente (multiplicateurs sur street(q) du stock réellement vendu) :

| Canal | ×street | Pourquoi |
|---|---|---|
| 👻 SnapShit détail (deal sérieux) | ×1.0 | le prix de référence |
| 👻 SnapShit brade (lowball) | ×0.55 | écouler vite, réput en jeu |
| 👻 SnapShit grossiste | ×0.7 | volume contre marge |
| 🛵 BeuherEats livraison | ×0.85 × premium du point (0.9-1.35) | volume + frais de course |

Achat (🧅) : le gros se paie ~0.5-0.7 × street(realQual) — le cheap est un
piège lent (qualité réelle basse → demande et réput s'effritent), le premium
paie sa tranquillité. **Familles actives en embed : résine, weed, graines**
— les autres (coke, MDMA…) sont masquées tant qu'aucun canal de vente ne
sait les pricer.

Culture (🌱→🌿) : rendement 8-14 g par graine (placeholder, réglage humain),
graine 4-8 €. Plus rentable au gramme que l'achat, payé en temps et en gestes.

La dilution (🌿 Récolte) reste LE levier de fraude : chaque gramme de coupe
ajouté vaut ≥4 € à la rue, mais baisse q → demande, réput et cry-wolf
encaissent en différé. Cohérent avec l'ADN CrimWorld (qualité = levier unique).

## Variétés (filière weed)

Enum partagée, celle de `recolte/` : `Skunk`, `White Widow`, `Lemon`, `Purple`.
Les graines achetées sur OnionMarket portent une variété ; la plante et ses
branches l'héritent ; la Récolte trie par variété.

## iframe → parent (`parent.postMessage(msg, "*")`)

```js
{ type: "bigo-ready", app: "<slug>" }         // au boot en mode embed → le parent répond bigo-state
{ type: "bigo-txn",   app: "<slug>",
  cash:    <±€>,                              // optionnel : + encaisse, − dépense
  heat:    <±points 0-100>,                   // optionnel : échelle partagée 0-100
  brutAdd: { g, q, family, label },           // optionnel : lot brut livré à l'atelier
  finiAdd: { g, q },                          // optionnel : produit fini vers la planque
  finiTake: <g>,                              // optionnel : consomme du stock fini
  lotConsumed: true,                          // optionnel (atelier) : le lot passé en URL est soldé
  brutLeft: <g>,                              // optionnel (atelier) : grammes NON travaillés — le
                                              //   parent recrée un lot brut du restant (rien n'est perdu, R1)
  seedsAdd: { variety, n },                   // optionnel (onion) : graines achetées
  seedsTake: { variety, n },                  // optionnel (plantation) : graines semées
  branchesAdd: { variety, g, q },             // optionnel (plantation) : branchage SÉCHÉ prêt pour la Récolte
  branchesConsumed: true,                     // optionnel (récolte) : le branchage passé en URL est soldé
  miettes: <g>,                               // optionnel : déchets (bradables aux schlags)
  journal: { icon, txt, cause, cls }          // optionnel : entrée Karnet — cause OBLIGATOIRE
}                                             //   pour toute conséquence (contrat CrimWorld)
{ type: "bigo-close", app: "<slug>" }         // demande la fermeture (fin d'un poste d'atelier)
```

## parent → iframe (après `bigo-ready` et après chaque txn)

```js
{ type: "bigo-state", cash, heat, fini: { g, q }, brutCount,
  seeds: { "<Variete>": n, … },               // graines dispo (plantation les sème)
  branchesCount, day, clock }
```

## Règles pour chaque proto patché

1. **Standalone intact** : sans le flag, comportement inchangé (toutes les
   modifs derrière `EMBED`).
2. **Pas d'écriture localStorage** du proto en mode embed (shim mémoire).
3. **Coque masquée** en embed (notch/statusbar du proto) : la page remplit l'iframe.
4. **Cash affiché = cash du parent** ; toute dépense/recette passe par `bigo-txn`
   (jamais de vérité locale).
5. Valider l'origine des messages entrants (`same-origin` ou `"null"` en `file://`).
6. Aucun `Math.random` sur une conséquence (invariant du dépôt).
