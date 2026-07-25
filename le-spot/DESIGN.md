# Le Spot — design

**Statut :** proto jouable, un seul `index.html`, zéro dépendance.
**Position :** c'est le **P1 « Le spot »** du découpage de `../la-loupe/SHELTER.md` §14,
resté sur le papier depuis le 2026-07-22.
**Ce qu'il valide :** *le triangle tampon / débit / saisie est-il un VRAI dilemme ?
le préavis du chouf est-il lisible ?* — les deux questions que SHELTER se pose.

---

## 1. Le problème qu'on attaque

Le dépôt a **26 protos** et une loi transversale qu'on répète depuis un an, dans
tous les protos et dans la spec consolidée (§4.3) :

> petit format = €/g plus élevé

C'est un **bonus sec**. Rien ne s'y oppose. Aucun proto n'a jamais donné de coût
au petit calibre — donc « couper petit » n'a jamais été une décision, juste une
optimisation qu'on fait une fois et qu'on oublie.

En parallèle, la spec retient depuis D10 la bascule **discrétion ↔ dominance**
comme axe de tension candidat, et Q1 est ouverte depuis le 2026-07-04. Le
cadran « concurrence » n'a jamais été écrit : dans tout le dépôt, `rival` est
une règle CSS pour un pin de carte verrouillé. **La bascule n'a qu'un bras** —
et un axe à un bras ne produit pas un dilemme, il produit un plafond.

## 2. La thèse

**On donne enfin sa contrepartie au petit calibre : chaque transaction se voit.**

Écouler 100 g en sachets de 2 g, c'est 50 mains qui passent au pied de la barre.
Les écouler en 8 g, c'est 6 mains. Le €/g monte quand le calibre descend ; la
**visibilité** monte avec le **nombre de passages**. Les deux forces tirent en
sens inverse sur le même geste.

Ça donne le second bras sans avoir besoin d'inventer les rivaux : **le coût de
la discrétion, c'est le temps** — et le temps est cher parce que le bloc se paie
tous les jours, qu'on vende ou non (`LOYER_FIXE`, spec §4.7 : *« tu paies pour
EXISTER sur le block »*).

## 3. La décision centrale, et pourquoi elle reste vivante

> **En quoi je coupe, et à quelles heures j'ouvre.**

Chiffré par `simJour()` (fonction pure, dans le fichier, rejouée par le test) :

À produit égal (100 g de pain, grade B) :

| Calibre | Transactions | Recette | Chaleur | € par point de chaleur |
|---|---|---|---|---|
| **2 g** | 50 | **1 250 €** | +55 | 23 |
| 5 g | 20 | 1 000 € | +22 | 45 |
| **8 g** | 12,5 | 880 € | **+13,8** | **64** |

Puis, en jouant une journée entière (le stock est le goulot, pas la demande) :

| Contexte | Meilleur plan | Recette nette | Visibilité |
|---|---|---|---|
| **J1** — réservoir 40, grade C, un pain de 100 g | **2 g, 24 h** | 550 €/j | **+47,8 /j** |
| **Croisière** — réservoir 85, un pain de 250 g/jour | **8 g, 16 h→2 h** | 878 €/j | **−7,3 /j** |

Les deux réponses ne sont pas le même plan. À J1 la visibilité est à 0 et le
loyer tombe ce soir : on pousse au 2 g, quitte à voir passer une patrouille. En
croisière on écoule 250 g par jour — au 2 g ce serait 125 passages, intenable —
donc on se replie sur le gros calibre et sur le rush, et la chaleur **redescend**
pendant qu'on gagne davantage.

> **Le goulot est le STOCK, pas la demande.** La demande d'une journée (200 à
> 500 g) dépasse presque toujours le pain acheté (100 ou 250 g). Écouler 100 g
> demande donc `100 / calibre` transactions, quoi qu'il arrive. C'est la
> correction apportée après revue : la première version de `simJour()` bornait
> par la demande et « prouvait » un dilemme dans un régime que le jeu n'atteint
> jamais.

C'est le critère qu'on s'impose : *l'option A gagne dans un contexte, B dans un
autre*. Un dilemme dont la réponse ne change jamais n'est pas un dilemme.

## 3 bis. La coupe : « la lame s'émousse »

Retour de playtest : *« la coupe est vraiment facile »*. Elle était un minuteur —
on maintenait, les sachets tombaient, relâcher ne coûtait rien. Aucune décision.

**Chaque COUPE émousse la lame** (`NETTETE_PAR_COUPE`), pas chaque seconde. Une
lame qui force n'ouvre plus, elle **écrase** : le geste consomme le sachet *plus*
ce qu'il broie à côté, et ces grammes partent aux **miettes** — ils reviennent
avec le pain suivant. Rien n'est détruit (R1), mais ce n'est pas disponible
*aujourd'hui*. Lâcher au moins `RELACHE_MIN` laisse la lame reprendre.

Mesuré sur un pain de 100 g en 5 g : **maintien continu → 10 g écrasés**,
**rythme alterné → 5 g**. Le prix de la précipitation est de l'ordre de 5 % du pain.

**Pourquoi les grammes et pas les secondes.** La première version facturait la
propreté en temps. C'était faux : la journée est bornée par le **stock**, pas par
le temps (§3) — donc couper lentement ne perd aucune vente, on vend les mêmes
100 g plus tard. Pire, le temps passé à la planque est le seul état où la chaleur
retombe vite : couper proprement **refroidissait le point**. Le coût n'était pas
nul, il était négatif. Les grammes, eux, sont le vrai goulot.

**Et ça alimente le dilemme central** au lieu de flotter à côté : l'usure se paie
par coupe, donc écouler 100 g en 2 g use la lame **4× plus** qu'en 8 g
(50 coupes contre 12,5). Le petit calibre paie désormais un **troisième** prix,
après le €/g et la visibilité.

| Calibre | Coupes pour 100 g | Usure de lame |
|---|---|---|
| 2 g | 50 | 1,75 |
| 5 g | 20 | 0,70 |
| 8 g | 12,5 | 0,44 |

**Écarté après pré-vol adverse** : une prime de +15 % au gramme sur les lots nets.
Elle ne changeait aucun rapport entre calibres (inflation uniforme), érodait
`LOYER_FIXE` — le second bras de la bascule —, et son optimum était un
martèlement du pouce à ~5 Hz : un cookie clicker, l'inverse de R3.

## 4. Les trois autres décisions qui vivent autour

- **Le tampon** — ce qu'on pose dehors se vend sans rupture… et c'est
  exactement ce qu'une descente emporte. Gros tampon = zéro rupture, perte
  maximale. Petit tampon = sûr, mais des clients repartent.
- **La navette** — la *navigation est la décision*. Aller à la planque avance
  l'horloge et le spot ne vend plus pendant ce temps (jusqu'à ce qu'un
  charbonneur soit embauché). La poche borne ce qu'on rapporte : c'est le
  système « poids » de `CADRE.md` §6 en miniature.

  > **C'est l'arbitrage de présence, tranché.** Le 2026-07-23, `NOTES.md`
  > pose : *« le vrai arbitrage (à caler ensuite) : ta présence est unique →
  > tenir le corner ⇄ vendre/livrer sur SnapShit »*, propose deux niveaux, et
  > conclut **« Non tranché — prochaine étape design »**. Quatre sessions plus
  > tard il ne l'était toujours pas. La navette **est** le « niveau fort » qui y
  > était décrit : *une absence coûte du temps pendant lequel le point ferme*.
  > C'est ce qui donne enfin une valeur au charbonneur — sans arbitrage de
  > présence, déléguer la présence rend un temps dont on ne ferait rien.
- **La qualité** — le tier de Karim fait le grade, le grade fait la clientèle
  qui revient. Payer 5,80 €/g au lieu de 3,40 fait grossir le réservoir deux
  fois plus vite. Marge contre satisfaction, `CADRE.md` §1.

## 5. Conformité aux règles (et ce qu'on en a rendu mécanique)

| Règle | Comment elle est tenue ici |
|---|---|
| **R1** — jamais de punition | La descente est **annoncée** par une jauge à seuils dessinés. L'évacuation ne peut que **réduire** une perte déjà décidée. Relâcher la coupe en cours ne perd rien. Et surtout : **présent avec du stock, aucun client ne part jamais** — la lenteur de la main ne coûte qu'un pourboire, jamais une vente. |
| **R2 / R6** | Chouf (la vigilance), charbonneur (la présence), grand sac (les trajets). On délègue le geste répétitif, jamais l'arbitrage — et chacun coûte tous les soirs. |
| **R3** | Le geste de coupe **encode la décision** : couper en 2 g prend physiquement 4× plus longtemps qu'en 8 g (`CUT_S_PAR_SACHET`). On sent son choix dans la main. |
| **R4** | Zéro `Math.random` — tout dérive de `hh(a,b)`. Vérifié au grep par le test. |
| **R5** | Servir à la main paie un pourboire ; quand ça lasse, le charbonneur prend le relais à 70 %. |
| **R8** | Chaque geste porte un arbitrage. Aucun bouton ne fait « avancer » sans choix. |
| **R9** | La tension est **systémique** : ce n'est pas le geste qui durcit, c'est le réservoir qui grossit — donc le même calibre qui allait hier chauffe aujourd'hui. |

> **R1 rendu testable.** L'audit du dépôt a trouvé R1 *cité en commentaire et
> violé douze lignes plus bas* (`la-loupe/corner.mjs:7` annonce « jamais de malus
> sec » ; `:24/:37/:38` ponctionnent relation, réput et réservoir sur un walk).
> Ici l'invariant est **exécuté** par `tools/smoke-spot.mjs` : cinq clients, sept
> secondes sans y toucher, zéro rupture. Une règle qu'on ne teste pas est une
> règle qu'on cite.

## 6. Ce qui est volontairement hors périmètre

- **Les rivaux / le cadran concurrence.** C'est P3 dans SHELTER. Ici le second
  bras est porté par le loyer fixe, ce qui suffit à faire exister le dilemme
  sans inventer un système entier.
- **La négociation client.** Elle est déjà excellente dans `la-loupe/corner.mjs`
  et n'a pas besoin d'un deuxième banc d'essai. Ici la vente est au **débit** :
  c'est le volume qu'on regarde, pas la tête du client.
- **Le prix réglé par le joueur.** `CADRE.md` §1 tranche : *« le prix est
  (presque) fixé par le marché, ce n'est pas un robinet »*. Deux leviers de prix
  concurrents auraient brouillé la lecture du calibre.
- **La weed, les autres produits, le hors-ligne.** Hash seul, session active.

## 7. Points laissés à l'arbitrage humain

Marqués ici plutôt que tranchés en douce — tous sont des **placeholders nommés** :

1. **`[DÉCISION REQUISE]` — la granularité du tampon.** Aujourd'hui la poche se
   remplit toujours au maximum et l'arrivée au spot déverse tout : le joueur ne
   choisit pas *combien* il expose, alors que c'est censé être sa deuxième
   décision. Deux formes possibles — des paliers au remplissage (30/60/140 g),
   ou dissocier « arriver » de « poser » (un bouton « poser X g », le reste
   restant en poche et non saisissable). La seconde est plus riche mais ajoute
   une troisième quantité à lire. À trancher avant de tuner quoi que ce soit.
2. **`[DÉCISION REQUISE]` — le poids du liquide.** `CADRE.md` §6 veut que le cash
   pèse aussi (petites coupures, sous-vide, grosse coupure). Ici la caisse rentre
   sans occuper de place : seul le produit pèse. L'ajouter double la pression de
   navette — à sentir avant de décider.
3. **`[DÉCISION REQUISE]` — la Chute à `DOS_MAX`.** SHELTER la place en P3. Elle
   est ici en version légère (fin de run + récap) parce qu'une session sans fin
   n'a pas de forme. À valider ou à repousser.
4. **Tuning ouvert :** `DEMANDE_PIC` 45, `VIS_PAR_TX` 0,55, `LOYER_FIXE` 220,
   `PREAVIS_S` [0, 7, 13], la table `PAINS`. Ce sont des chiffres de premier
   jet, pas des arbitrages — ils attendent le playtest, pas un registre.

## 7 bis. Ce que la mesure a corrigé

Trois choses que la relecture n'avait pas vues :

1. **Spirale de mort au J1.** Un tampon vide attirait quand même des clients qui
   repartaient les mains vides : le réservoir se creusait sans retour possible.
   → pas de came, pas de file.
2. **La jauge était un plafond.** Au réservoir 85, *aucun* calibre n'était
   tenable en continu — le test l'a écrit noir sur blanc. → le rideau, et la
   décision passe à deux dimensions (calibre × fenêtre).
3. **L'amorçage bloquait la partie.** Lot d'entrée à 50 g → **+15 €/jour** : la
   marche vers le tier suivant ne se franchit jamais (J1 275 → J4 320, le pneu
   à 340 hors d'atteinte). Passé à 100 g → J1 610, J2 960, J3 1 310.
   *Une marche d'appro se vérifie en simulant quatre jours, pas en comparant
   des €/g.*

## 8. Vérifier

```bash
cd tools
node check.mjs le-spot     # syntaxe (extrait le module, node --check)
node smoke-spot.mjs        # 25 invariants + captures dans tools/shots/le-spot/
```

Le smoke-test ne regarde pas seulement si ça s'affiche : il **déroule une partie**
(appro → coupe → poche → navette → ventes → descente → rapport) et **prouve le
dilemme** en balayant l'espace calibre × fenêtre d'ouverture. Si un jour un seul
plan domine partout, `Dilemme · pousser et tenir ne sont pas le même plan` casse.
