# Le Bigo — bus d'économie partagée (contrat postMessage)

Le téléphone (`le-bigo/index.html`) est l'« OS » : il possède l'état partagé
(caisse, heat, stock) et embarque les **vrais protos** en iframe. Chaque proto
gagne un mode `#embed=bigo`, **inerte en standalone** (précédent :
`crimworld/coupe.html#embed=prologue`).

## Flag d'URL

- `#embed=bigo` — active le mode embarqué.
- Protos d'atelier uniquement : `&g=<grammes>&q=<qualité 0-100>` (le lot brut à travailler).

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
  miettes: <g>,                               // optionnel : déchets (bradables aux schlags)
  journal: { icon, txt, cause, cls }          // optionnel : entrée Karnet — cause OBLIGATOIRE
}                                             //   pour toute conséquence (contrat CrimWorld)
{ type: "bigo-close", app: "<slug>" }         // demande la fermeture (fin d'un poste d'atelier)
```

## parent → iframe (après `bigo-ready` et après chaque txn)

```js
{ type: "bigo-state", cash, heat, fini: { g, q }, brutCount, day, clock }
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
