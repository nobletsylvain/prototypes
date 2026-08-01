# El Patrón — scope

**Statut :** proto jouable · sim pure séparée de l'UI · 26 invariants mécaniques verts
**Échelle :** le pays. C'est le pendant **macro** de La Loupe (qui tient le bloc).
**Ton :** français, sobre. Aucun détail opératoire réel — l'objet du jeu est une
chaîne économique abstraite (kg, €/kg, chaleur), pas un mode d'emploi.

```
FINCA ──► LABO ──► RUTA ──► PUNTO D'EXPORT ──► LIQUIDE ──► LESSIVE ──► PROPRE
 pâte     poudre   ordre     prix × saturation   volume     plafonnée   capacité
                  permanent                      qui déborde
```

## 1. La fantaisie

Tu ne touches plus le produit. Tu décides **où il pousse**, **comment il sort**,
et **où l'argent redevient propre**. Le plaisir visé n'est pas le geste (ça, c'est
La Loupe) : c'est de voir une machine qu'on a réglée tourner toute seule, et de
choisir quoi sacrifier quand elle grince.

## 2. Les deux monnaies — le cœur du jeu

| | paie | ne paie pas |
|---|---|---|
| **Liquide** (sale) | précurseurs, paysans, fret, escortes, mordidas, juges | rien de durable |
| **Propre** | fincas, labos, rutas, planques, fronts | rien d'opérationnel |

Conséquence : on peut faire tourner l'usine indéfiniment sur du sale, mais on ne
**grandit** qu'avec du propre. Et le blanchiment coûte structurellement plus cher
que la production — à euro propre investi, une finca rapporte environ le double
de ce qu'un front sait absorber. Le liquide s'entasse donc **par construction**.

## 3. Ce qu'on corrige de Cartel Tycoon

Les dix reproches ci-dessous sont sourcés (tests presse + fils Steam) ; la
colonne de droite est ce que le proto fait à la place.

| Reproche à Cartel Tycoon | Ce que fait El Patrón |
|---|---|
| 1. Les lieutenants ne prennent qu'un ordre à la fois : on redonne l'ordre de convoi à la main, indéfiniment. | Une **ruta est un ordre permanent**. On règle mode / destination / escorte une fois, ça tourne. Le joueur édite une **politique**, jamais un trajet. |
| 2. L'argent se déplace en tout-ou-rien, sans pouvoir en router une part. | **Réserve d'exploitation** en jours de charges : une politique proportionnelle, réglable à tout moment, appliquée en continu. Aucun billet n'est transporté à la main. |
| 3. Le blanchiment est opaque : les fronts se remplissent contre des plafonds invisibles. | Chaque front est un **tuyau imprimé** : débit, commission, plafond de crédibilité, soupçon, et ce qu'il absorbe réellement aujourd'hui. Aucune heuristique cachée. Le trop-plein retourne visiblement dans la planque. |
| 4. Un bâtiment privé d'entretien s'éteint et **ne se rallume pas tout seul**. | La réserve est **prélevée en premier**, avant la lessive, avec son autonomie affichée en jours. Un labo à sec redémarre **de lui-même** dès qu'il y a du liquide. La rupture est un signal, jamais une corvée de re-clic. |
| 5. « Le premier dollar demande autant d'attention que le dernier. » | Plafonds d'entités (6 fincas, 4 labos, 5 rutas, 6 fronts uniques) : on grandit **en montant en gamme**, pas en empilant des icônes. Grandir n'ajoute aucune tâche. |
| 6. La répétition sans variance : on exécute une procédure dont l'optimum est connu. | La décision récurrente est le **contrôle**, et sa bonne réponse **change selon le mode** : sur des mules (25 % de perte) on force, sur un conteneur (85 %) on paie toujours. C'est le véhicule qui arbitre, pas l'humeur. |
| 7. Loyauté : trahisons **aléatoires et destructrices**, rétroactives sur des biens payés. | **Aucun aléa nulle part.** La suspicion d'une ruta monte à chaque passage, elle est affichée, et le contrôle tombe à 100 — avec le compte à rebours en jours sur la fiche. On voit le barrage arriver. |
| 8. Opacité : un prix bouge, on ne sait pas pourquoi. | **Cause obligatoire** : aucun mouvement sans une chaîne de cause, rendue telle quelle. Le bandeau « Net / jour » se déplie sur les trois postes chiffrés + les anomalies **nommées** (« *Cocina Uno* est à sec de précurseurs »). L'UI n'invente jamais de texte d'état. |
| 9. Un seul camion par destination à la fois — règle invisible, jamais dans l'UI. | Le débit d'une ruta est imprimé en kg/j, la capacité d'un punto aussi, et sa **saturation** est une jauge visible qui fait baisser le prix. La contrainte est un objet de première classe. |
| 10. L'absence est punie par une cascade qu'on n'a pas vue venir. | Le rattrapage est borné (`DT_MAX_JOURS`) : rien ne casse pendant qu'on n'est pas là. *(Voir question ouverte n°2 : l'absence est sûre mais stérile.)* |

## 4. La trouvaille qu'on ajoute : la prime de chaleur

Dans Cartel Tycoon — et dans la première version de ce proto — **tout tirait vers
le bas** : produire chauffe, stocker chauffe, grossir chauffe, blanchir coûte une
commission. La posture optimale devenait « en faire le moins possible », ce qui
est le contraire d'un jeu de cartel.

Ici, **un corridor surveillé est un corridor où la marchandise se raréfie**, donc
elle se paie plus cher :

| Palier | Chaleur | Prix | Ce qui se passe |
|---|---|---|---|
| Calme | 0 | ×1.00 | Personne ne regarde. |
| Repérage | 25 | **×1.10** | On photographie tes camions. |
| Opération | 50 | **×1.22** | Les descentes commencent. |
| Task Force | 75 | **×1.38** | Presque plus rien ne passe. Ce qui passe fixe son prix. |
| Extradition | 92 | ×0.70 | Les acheteurs te lâchent. 8 jours avant la fin. |

Le meilleur tarif du jeu est **juste avant la falaise**. La chaleur cesse d'être
une punition et devient une gourmandise. C'est le seul changement qui rende la
seconde moitié de la partie tendue plutôt que défensive.

## 5. Les cinq goulots, dans l'ordre où ils mordent

1. **Labo** (min. 2-5) — les fincas débordent, la pâte s'entasse.
2. **Ruta** (min. 5-10) — les labos débordent, la poudre ne sort pas.
3. **Punto** (min. 10-15) — un point saturé paie 38 % de moins ; il faut diversifier.
4. **Lessive** (min. 15-25) — plafond absolu, tous fronts confondus. La production, elle, n'a pas de plafond.
5. **Planque puis chaleur** (min. 25+) — le liquide déborde en m³ et chauffe ; les juges se paient en sale, donc il faut en garder.

## 6. Architecture

- `sim.mjs` — la **simulation pure**. Aucun DOM, aucun `Math.random`, aucune
  `Date`. `tick(S, dt)` en jours. Toutes les constantes d'équilibrage en tête de
  fichier, nommées. C'est ce qui rend les tests possibles sans navigateur.
- `index.html` — la coque et le rendu. Ne calcule **jamais** d'économie : elle lit
  `rythmes()`, `diagnostics()`, `bilan()` et affiche.
- `tools/invariants-patron.mjs` — 26 invariants mécaniques (déterminisme, bornes,
  causes, anti-blocage, plafonds, fin de partie atteignable).
- `tools/shots-patron.mjs` — joue la page dans Chromium, résout les événements,
  capture les écrans, échoue sur la moindre erreur console.

```bash
cd tools
node check.mjs el-patron        # syntaxe
node invariants-patron.mjs      # logique
node shots-patron.mjs           # UI + captures
```

## 7. Sauvegarde

`localStorage` préfixe `patron_*` · `patron_ver` porte `SAVE_VERSION`.
Bumper `SAVE_VERSION` dans `sim.mjs` après tout gros rééquilibrage : la clé de
version force un reset propre.

## 8. [DÉCISION REQUISE] — ce que je n'ai pas tranché

1. **R3 « le tactile EST le plaisir » n'est pas honoré ici, volontairement.**
   El Patrón est le pendant *macro* : la fantaisie est de **piloter**, pas de
   faire — ce qui est cohérent avec R6/R7 (on délègue la répétition sans plaisir,
   on garde la décision vivante). Mais c'est un écart à une règle du dépôt, et
   c'est à Sylvain de dire si :
   - (a) l'échelle cartel justifie l'exemption, ou
   - (b) il faut un geste signature — le meilleur candidat étant la **mordida en
     maintien** : on maintient, le montant monte, la jauge de suspicion redescend
     à mesure, on relâche pour payer.
2. **Progression hors-ligne.** Aujourd'hui l'absence est *sûre* (rien ne casse)
   mais *stérile* (rien n'avance). Faut-il un rattrapage à taux réduit au retour,
   avec un rapport d'absence ? Ça change la nature du jeu (idle vs session).
3. **Le choix de l'acheteur.** L'étape export n'offre aujourd'hui que le choix du
   punto (prix × saturation). Faut-il y ajouter un choix d'acheteur récurrent
   (local / gringo / fixer, prix × chaleur) ? Ça densifierait la décision, au
   risque d'un pop-up de plus.
4. **Tout l'équilibrage est en placeholder.** Les constantes sont nommées et
   groupées en tête de `sim.mjs` ; les courbes tiennent sur 220 jours simulés,
   mais les valeurs attendent le tuning humain. En particulier :
   `CHALEUR_K` (à quel volume la police s'intéresse), `MORDIDA_PART` (le pivot du
   choix payer/forcer), et les prix des fronts (qui règlent à eux seuls le moment
   où la planque déborde).
