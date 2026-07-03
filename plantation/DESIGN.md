# Plantation — analyse marché & design tactile (pré-proto)

Étude préalable au core loop **« Plantation »** (culture de weed), l'étape amont
absente de nos protos : on sait couper (Hash Slicer), transformer (Green Front),
mélanger (Neige), emballer (GuitarShito) — on ne sait pas **faire pousser**.

Références analysées : Schedule I, Weedcraft Inc, Weed Firm: RePlanted (le jeu
des captures d'écran de référence), Hempire, Bud Farm: Grass Roots, Wiz Khalifa's
Weed Farm, Weed Inc, Weed Train — plus les étalons tactiles hors-weed : Hay Day,
Viridi, Prune, Fruit Ninja, Stardew mobile.

---

## 1. Grille de lecture (règles maison)

Celles qui gouvernent déjà les protos du dépôt :

- **Feeling > skill** : le geste doit être bon à faire même raté ; l'échec coûte
  de la marge, jamais le droit de jouer.
- **Un geste par station**, exécutable au pouce, en portrait.
- **Satisfaction décroissante → vanne de délégation** : quand un geste commence
  à lasser, la boutique vend son automatisation (massicot auto, auto-doseuse,
  auto-bucker) — on achète du confort, payé en marge.
- **Petit format = €/g plus élevé** ; la qualité est **un seul levier** continu
  (pas de curseur « pureté » séparé).
- **Timers diégétiques seulement** : une plante qui pousse peut prendre du temps,
  un geste ne se fait jamais gater par de l'énergie.

---

## 2. Ce que fait le marché

### 2.1 Schedule I (PC, 2025) — l'étalon du geste diégétique

- Toute la culture passe par des **micro-gestes physiques sans menu** : verser
  le sac de terreau, secouer la fiole de graine, **incliner l'arrosoir** pour
  doser à l'œil, verser les additifs, cliquer chaque bud aux ciseaux.
- **Qualité = additifs + séchage, rien d'autre** (5 paliers Trash → Heavenly).
  Fertilizer +1 étoile ; **PGR** (+50 % rendement) et **Speed Grow** (+50 %
  vitesse) coûtent **−1 étoile chacun** : le levier cupidité/qualité est
  littéralement une bouteille qu'on verse. Pot/lampe/terreau n'achètent que
  vitesse, rendement et confort.
- **Délégation en 3 paliers** : geste manuel → outil qui adoucit le geste
  (trimmers électriques : clic par bud devient drag continu ; sprinkler) →
  employé qui supprime le geste (botaniste, 8 stations, salaire quotidien +
  charge de configuration).
- Pousse ~5-6 min réelles, calée sur les autres activités : on sème, on part
  dealer, on revient récolter. **Jamais un écran d'attente.**
- Réception : les micro-gestes sont massivement loués ; ce qui use, c'est le
  **volume** (10+ pots = corvée), pas la difficulté — le geste ne rate jamais.

### 2.2 Weedcraft Inc (PC/consoles — pas de mobile) — l'anti-modèle du geste, le modèle du système

- Tout est **hold-to-fill** : maintenir le clic sur une icône goutte/ciseaux
  pendant qu'un anneau se remplit, avec cooldown. Aucune habileté. Les tests
  sont unanimes : « fin isolément, fastidieux en boucle », le jeu devient
  meilleur **une fois les jardiniers embauchés** — preuve que le geste était
  une taxe d'attention, pas un plaisir.
- Mais le **système** autour est riche : plafond de qualité fixé par
  l'environnement (N-P-K, température, humidité vs optimums de la souche),
  **séquencement des gestes** (arroser AVANT de tailler, car tailler assoiffe
  la plante), soin manuel strictement meilleur que l'automate (le jardinier
  s'achète en marge).
- Leçon : hold-to-fill sans lecture ni relâchement expressif = corvée garantie.
  L'arbitrage doit vivre **dans** le geste, pas seulement autour.

### 2.3 Weed Firm: RePlanted — le jeu des captures

Identifié avec confiance haute : cave au mur de pierre, ampoule nue, pots en
terre cuite numérotés, **sprinklers bleus à tubes avec minuteur**, compteur
feuille en haut à gauche (stash), **curseur smiley** de négociation en bas,
« touche la plante pour la récolter ».

- Boucle : tap pour planter, **tap répété pour arroser** (1 tap = 1 bouteille,
  jauge d'eau en %, à 0 % la pousse se fige), tap pour récolter, curseur de
  prix face au client qui frappe à la porte.
- Aucun geste skillé ; la friction d'arrosage est **explicitement vendue** :
  bouteille XL « un tap », sprinkler automatique.
- Addictif à court terme (cycle très rythmé, clients loufoques), corvée ensuite
  (tap-spam d'arrosage, timers, grind). C'est le plancher du marché, pas le
  plafond.

### 2.4 Hempire — la seule mécanique de soin louée du corpus

- Pendant la pousse, des **bulles d'arrosage** apparaissent à intervalles
  propres à chaque variété ; **tap dans la fenêtre de temps**. Rater réduit les
  fenêtres suivantes (cascade) ; tout réussir = plante « parfaite » → buds
  bonus, **maîtrise permanente** de la variété, chance d'Epic Buds.
- C'est LA mécanique la plus citée positivement de tout le corpus weed mobile :
  le joueur a le sentiment de **mériter sa récolte**.
- Revers : couplée à des timers longs (monétisation), elle devient une
  **contrainte de présence** (« on call » pendant des heures). À transposer
  avec des pousses courtes.

### 2.5 Le reste du marché mobile (idles)

Wiz Khalifa's Weed Farm, Weed Inc, Bud Farm Idle, Weed Train : le geste de
culture a disparu (tap de collecte, managers, merge). Les avis négatifs
regrettent précisément cette disparition. **Personne ne fait de récolte/taille
skillée ; la qualité n'est jamais un levier continu piloté par le joueur.**
La tactilité « Schedule 1 » n'a aucune transposition mobile : **trou de marché**.

### 2.6 Étalons tactiles hors-weed (à voler)

- **Hay Day** — récolte-étalon : l'outil apparaît **sous le doigt** (faucille),
  on **peint** le champ en un drag continu, feedback par unité traversée (pop
  visuel + ding + objets qui volent), pas d'échec moteur possible. Anti-modèle
  confirmé par Stardew mobile : jamais 1 tap = 1 plante.
- **Viridi** — arrosage-étalon : on lit **la matière, pas une jauge** (le sol
  fonce, la plante se redresse) ; le **sur-arrosage tue** : le soin est un
  arbitrage, pas un réflexe.
- **Prune** — taille-étalon : swipe-to-cut à la Fruit Ninja (seuil de vélocité,
  tranche qui suit le doigt, chute physique du morceau), et surtout **couper =
  donner** : l'énergie se redirige visiblement vers ce qui reste. La coupe est
  générative, pas du nettoyage.
- Principes transverses : feedback < 100 ms multicanal par micro-unité,
  variation de présentation (pitch, particules) pour la longévité sensorielle,
  haptique graduée, timers uniquement diégétiques, jamais d'énergie sur le
  geste.

---

## 3. Synthèse : le carré gagnant

| Levier | Meilleur du marché | Transposition |
|---|---|---|
| Semer | Schedule I (verser, secouer) / Hay Day (drag-pochoir) | geste-métaphore, snap pondéré |
| Arroser | Viridi (lecture matière, sur-arrosage) + notre « balance » gf2 (maintenir/lâcher, inertie) | hold-to-pour avec risque de dépassement |
| Soigner/tailler | Prune (swipe génératif) + Weedcraft (séquencement eau→taille) | le levier qualité ACTIF |
| Récolter | Hay Day (drag-peinture) + bucking Green Front (vitesse du geste = tri A/trim) | jamais un tap |
| Cupidité vs qualité | Schedule I (PGR/Speed Grow = bouteilles à −1 étoile) | l'arbitrage rendu physique |
| Délégation | Schedule I / Weedcraft (3 paliers, payés en marge) | boutique, comme nos protos |
| Éviter | Weed Firm (tap-spam), Weedcraft (hold-to-fill aveugle), Hempire (présence forcée), idles (geste supprimé) | |

---

## 4. Proposition de core loop « Plantation »

Un dossier `plantation/`, un `index.html`, Three.js via import-map, préfixe
`localStorage` **`plant_`** + `plant_ver`/`SAVE_VERSION`, comme les autres.

### Boucle (4 stations, un geste chacune)

1. **Semer** 🌱 — acheter la graine (variétés à prix/rendement croissants, la
   1ʳᵉ offerte), **glisser la graine dans le pot** (snap pondéré), **maintenir
   le sac de terreau** pour le verser. Gestes courts, purement plaisants,
   aucun échec.
2. **Arroser** 💧 — **maintenir l'arrosoir** au-dessus du pot : le débit
   s'emballe (inertie du dosage gf2), on lit **la terre qui fonce** et la
   plante qui se redresse — pas de jauge chiffrée. Lâcher trop tard =
   flaque, croissance ralentie un temps (punition douce, jamais de mort).
   La plante redemande de l'eau 1-2 fois par pousse.
3. **Tailler** ✂️ — pendant la pousse, des **feuilles gourmandes** poussent sur
   la tige ; **swipe à seuil de vélocité** pour les trancher **sans toucher les
   têtes** (le Trim express de gf2, rendu génératif) : chaque feuille coupée
   **redirige visiblement la vigueur** — les buds gonflent, brillent, son de
   sève. C'est le levier qualité actif : bien taillé = têtes plus grosses et
   plus riches. Séquencement à la Weedcraft : tailler assoiffe légèrement la
   plante (l'ordre eau→taille se découvre).
4. **Récolter** 🌿 — en deux temps (décision post-étude) : à maturité, **swipe
   vif sur le plant** pour le **couper en branches** qui partent pendre au
   **fil de séchage** (le pot se libère : on resème pendant que ça sèche) ;
   puis **frotter/faucher les buds de la branche sèche en un drag continu**
   (bucking Green Front + faucille Hay Day) : geste **lent et net** = têtes A
   entières, geste **vif** = ça part en trim. Sec = bonus de qualité, humide =
   malus. Feedback par bud détaché (pop + ding + haptique). Le produit tombe
   dans le bac STOCK.

### Le levier cupidité (un seul, physique)

Un **booster à verser** au choix à la station arrosage, façon Schedule I :
- **Engrais** (cher) : +qualité.
- **Boost PGR** (donné) : **+50 % de rendement, qualité plafonnée bas**.
Le joueur verse littéralement sa cupidité dans le pot. Un seul axe de qualité
(pas de « pureté » séparée), qui multiplie le €/g à la vente.

### Économie & progression

- Vente du STOCK en formats **1 g / 3,5 g / 7 g / 28 g** (petit = €/g plus
  élevé), × qualité × niveau. Le trim se brade (comme les miettes aux schlags).
- **Pousse courte (2-4 min)**, occupée par les stations taille/arrosage — calée
  sur le rythme Schedule I, jamais un écran d'attente, jamais de bulle à
  guetter pendant des heures (anti-Hempire).
- **Boutique / vannes de délégation** (payées en marge) : goutte-à-goutte
  (auto-arrosage), tuteur (moins de feuilles gourmandes), lampe (vitesse),
  sécateur auto (taille passive médiocre — le manuel reste meilleur, comme
  Weedcraft), et à terme le jardinier.
- **Séchage au fil** (intégré à la boucle) : la branche pendue monte en
  qualité en séchant ; la frotter encore humide coûte de la qualité —
  l'arbitrage patience/cash immédiat, cohérent avec la slice CrimWorld
  (cupidité vs prudence).
- **XP/niveaux** : +%/niveau sur les ventes, comme les autres protos.
- Chaînage futur possible : la récolte de `plantation/` est exactement le
  « front » que reçoit Green Front.

### Ce qu'on ne fait PAS

- Pas de tap-spam d'arrosage (Weed Firm), pas de hold-to-fill sur icône
  (Weedcraft), pas d'énergie, pas de fenêtre de présence punitive (Hempire),
  pas d'aléatoire de conséquence (une plante ratée a toujours une cause
  lisible : sur-arrosage, taille manquée, booster versé).
- Pas de N-P-K / température / humidité (sim d'environnement = hors périmètre
  proto ; c'est de la profondeur de tycoon, pas du feel).

---

## 5. Prochaine étape

Construire le proto `plantation/index.html` (checklist CLAUDE.md : hub, préfixe
localStorage, import-map, `node --check`, captures `tools/screenshots.mjs`).
