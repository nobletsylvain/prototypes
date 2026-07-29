# NOTES — journal du projet (prototypes)

Journal chronologique des décisions, idées, écarts constatés et questions
ouvertes. On y écrit ce qui s'est passé et **pourquoi**. Les *règles* stables,
elles, vivent dans `CLAUDE.md` (section « Notes & règles vivantes »).

Format d'une entrée : `## AAAA-MM-JJ — titre court`, puis des puces.
Les entrées les plus récentes en haut.

---

## 2026-07-28 — POINT DE REPRISE (fin de session)

À lire en premier au début de la prochaine session. Rien ici ne remplace la lecture des
entrées du jour ci-dessous, mais ceci dit **où on en est** et **ce qui attend une décision**.

### État du dépôt

`main` = `1a6f312`. Arbre propre, branche de session repartie de `main`.
Suite complète : **287/287 vérifications**, `smoke` sans erreur, `check` 32 fichiers.
Modules de La Loupe en `?v=57`.

```
invariants 58 · karnet 44 · crypto 29 · cause 21 · blanchiment 19 · nourrice 19
ardoise 16 · bulles 15 · karim 14 · raccourcis 10 · arah 8 · chaleur 8 · tap 7
escalier 6 · desync 5 · tap-bigo 4 · cache 3 · lexique 1
```

### Ce que La Loupe sait faire maintenant

La chaîne complète, **cinq étages avec un délai à chaque palier** :

```
vendre au corner → trier (liasses) → déposer en laverie (J+2) → changer (J+1) → commander (J+2..J+5)
   liquide             sale comptable          propre              crypto            pains q53..q92
```

Plus, côté corner : l'ARAH qui mord enfin (25 barrettes sur 60 à un chouffe), les ardoises
avec impayé possible, la nourrice, le Karnet à quatre blocs, et deux raccourcis (favori du
dock, puce liquide) qui ramènent l'aller-retour nourrice de 5 appuis à 3.

### CE QUI ATTEND UNE DÉCISION DE SYLVAIN

Rien de tout ceci n'est bloquant pour avancer sur autre chose, mais rien ne doit être
tranché sans lui.

1. **Le tier moyen du marché est du contenu mort.** Mesuré : AtlasFinest (q78, 9,62/point)
   et CaramelBeldia (q71, 9,58/point) contre l'Appro à 8,72/point pour la même qualité.
   2 vendeurs sur 6. Compté en veille dans `crypto-loupe` — la ligne dira si le trou s'est
   refermé quand les nombres bougeront. **C'est de l'équilibrage : son appel.**

2. **Refuser un crédit est gratuit**, donc l'impayé ne porte qu'une décision mince : lire
   l'avertissement, puis refuser. Le levier qui l'épaissirait — **refuser coûte la
   relation** — n'est pas posé.

3. **Trois règles candidates pour `CLAUDE.md`**, toutes issues de cette session. Je ne
   touche pas aux règles sans son feu vert :

   - *R4 interdit le hasard, pas la perte.* Le code portait `jamais d'impayé (R4)` : une
     règle appliquée de travers, qui a coûté la mécanique du crédit pendant des semaines.
     Une clarification, pas une nouvelle règle.
   - *Une monnaie et son débouché s'ouvrent dans la même passe.* Le propre a été produit
     sans usage deux fois (trieuse coupée, front coupé). La crypto aurait suivi.
   - *Un contrôle se rejoue toujours sur le code d'avant.* Cinq contrôles vides attrapés
     cette semaine, dont un où le défaut était l'**instant** de la mesure et pas la mesure.

4. **La monnaie du dark web pour les gros investissements.** Le propre achète les gros
   investissements (arbitré), la crypto achète le marché (arbitré). Mais le second corner
   et la planque — passe 3 — n'ont pas encore de prix, ni de monnaie assignée.

### Suite du programme, dans l'ordre convenu

- **Passe 3** — second corner + planque au propre. Le propre a enfin une source ; c'est le
  moment. Attention : déplacer un upgrade EXISTANT du liquide vers le propre retirerait un
  outil acquis à une partie en cours (R2). Le safe est de donner un prix en propre aux
  choses NEUVES.
- **Charbonneur** puis un second — le code le prévoit déjà (`P.charbonneur`, `CHARB_WAGE`,
  et `pdvTick` sait déjà tourner en l'absence du joueur).
- **Weed** comme second produit.
- **Le levier de coupe (R10)** — et c'est là que le proto `darkweb-market/` a le plus à
  donner : agents de coupe classés par pureté (`PharmaGradeCut` 96 → `BulkFillers` 60),
  kits réactifs, presse, précurseurs. La Loupe n'a toujours qu'un seul curseur de qualité.
- **L'économie de revente** du même proto (prix et qualité annoncés par le joueur, demande
  déterministe, falaise de confiance quand la tromperie s'accumule) — un second système,
  non arbitré.

### Ce que la prochaine session doit savoir sur la méthode

- **Chaque correctif se rejoue sur le code d'avant** (`git stash push la-loupe/…`). Cinq
  contrôles vides attrapés cette semaine par cette seule discipline.
- **`evaluateOnNewDocument` REJOUE à chaque navigation.** Piège rencontré six fois. Un seed
  empilé doit être écrit pour s'appliquer sur l'état laissé par les précédents.
- **Les modules de La Loupe portent une version d'import** (`?v=NN`) : bumper les 8 imports
  d'un coup et vérifier avec `cache-loupe`. Il a déjà attrapé un `snap.mjs` resté en arrière.
- **`node --check` sur le module extrait d'`index.html`** avant tout commit — le fichier
  fait 3 900 lignes et une accolade manquante ne se voit pas.
- **Mesurer, ne pas raisonner.** Les trois quarts des vraies trouvailles de la semaine
  viennent d'un nombre calculé, pas d'une relecture : les 15 gestes de marge de l'ARAH, les
  boutons de dépôt sous le dock, le tier moyen dominé, la pastille de HUD écrasée.

---

## 2026-07-28 — Le marché, récolté sur `darkweb-market/`

Sylvain : « Regarde le proto onion market. Il contient déjà énormément de bonnes choses. »
Il avait raison, et sur un point que je n'avais pas vu.

### Ce que j'avais écrit, et pourquoi c'était pauvre

Trois offres fixes, une qualité fixe, un prix fixe. Le marché était un **palier supérieur** :
meilleur que l'Appro, donc on y va dès qu'on peut. Aucune décision.

### La pièce maîtresse du proto

```
realQual = annoncée x (0,5 + 0,1 x note)
```

**La qualité affichée n'est pas celle qui arrive**, et l'écart est une fonction
déterministe d'une note publique. PneuDeSecours (2,1 etoiles) annonce 74 et livre **53** ;
AtlasFinest (4,2) annonce 85 et livre **78**.

Le vendeur pas cher n'est donc pas un piège : c'est un **calcul**. C'est R4 dans sa
meilleure forme — le risque est lisible, arithmétique, et il ne surprend jamais celui qui
lit. L'écran l'affiche côte à côte avant le moindre bouton : `Annoncé q74 · livre q53`.

### Le reste de la récolte

- **Remises plafonnées par tier** — 32 % en cheap, 14 % en premium. Volume et fidélité
  s'additionnent mais le plafond est plus serré là où le produit est bon : le premium ne
  brade pas, donc la progression n'aplatit jamais le choix (R9).
- **Les grosses quantités exigent un passé CHEZ CE VENDEUR** — 2, 5, 10 commandes pour
  ouvrir 100, 250, 500 g. Une relation, pas un niveau global : choisir un fournisseur
  devient un engagement.
- **Le volume paie surtout en bas de gamme** — 16 % à 500 g en cheap, 7 % en premium.

Non repris : l'économie de **revente** sur le marché (prix et qualité annoncés par le
joueur, demande déterministe, falaise de confiance quand la tromperie s'accumule) — c'est
un second système complet et La Loupe vend au corner. Les familles hors hash non plus.
**Les fournitures méritent un vrai coup d'oeil le jour où on touchera au levier de coupe
(R10)** : agents de coupe par pureté, kits réactifs, presse, précurseurs.

Changé pour La Loupe : le proto livre immédiatement, ici la livraison prend des jours et
plus la commande est grosse plus elle traîne — c'est l'arbitrage « temps ET capacité comme
goulot ».

### Le contrôle qui a démontré que ma question était mal posée

J'avais écrit : « à qualité comparable, la chaîne bat l'Appro ». **Il est tombé.**

```
Appro        250 g q78 = 1700 sale -> 8,72 par g et par point
AtlasFinest  250 g q78 = 1799 sale -> 9,23
```

Ce n'était pas un bug de test : la valeur du marché n'est **pas** d'être moins cher à
qualité égale, c'est d'offrir ce que l'Appro ne peut pas vendre. Deux promesses, donc deux
contrôles — le marché atteint **q92** quand l'Appro plafonne à q78, et en bas de gamme il
descend à **7,92/point** contre 8,72.

### Un trou d'équilibrage, compté plutôt que caché

Le tier **moyen est aujourd'hui strictement dominé** par l'Appro : qualité équivalente,
9,58-9,62 contre 8,72. Deux vendeurs sur six sont du contenu mort.

C'est une question d'équilibrage — donc de Sylvain, pas de moi. Le test ne l'interdit pas,
il le **compte** :

```
[VEILLE] 2/6 - AtlasFinest (q78, 9.62/point), CaramelBeldia (q71, 9.58/point)
```

Le jour où les nombres bougeront, cette ligne dira si le trou s'est refermé. Un défaut
d'équilibrage qu'on connaît et qu'on chiffre vaut mieux qu'un test vert qui l'ignore.

Suite : crypto **29/29** · blanchiment 19/19 · ardoise 16/16 · invariants 58/58 ·
karnet 44/44 · nourrice 19/19 · arah 8/8 · raccourcis 10/10 · karim 14/14 · cause 21/21 ·
chaleur 8/8 · tap 7/7 · bulles 15/15 · tap-bigo 4/4 · escalier 6/6 · desync 5/5 · cache 3/3 ·
lexique 1/1 · smoke sans erreur. Modules en `?v=57`.

---

## 2026-07-28 — L'écran Liquide passe en onglets, et un contrôle qui mesurait à côté

Sylvain, sur mon constat que l'app Liquide devenait très longue : « Exact. »

La chaîne fait quatre étapes — trier → déposer → changer → commander — et les empiler sur
un seul écran donnait **quatre hauteurs de défilement**. Chacune a maintenant son onglet,
et **chaque puce porte le compteur de son étape** : `Billets 2000 · Laveries 0 · Crypto 0 ·
Marché 0`. Ce n'est pas qu'une navigation — on voit où le goulot se forme sans ouvrir les
écrans, comme le bac sur le favori du corner.

Deux gardes posés au passage :

- `sorterTick` et `sorterCommit` repeignaient l'écran à chaque billet trié, **même depuis
  un autre onglet**. Guardés sur `cashSub === "trieuse"`.
- Les quatre onglets partagent **un seul bloc de liaison** (`cashBind`). Deux blocs
  parallèles, c'est la garantie d'en oublier un le jour où on ajoute une étape — et un
  bouton muet ne se voit pas dans un test qui ne le tape pas.

### Le contrôle qui mesurait la seule chose qui allait bien

En ajoutant la crypto au HUD, la deuxième ligne est passée à cinq pastilles et « buzz »
sortait de l'écran sur 412 px. J'ai écrit un contrôle qui comparait
`getBoundingClientRect().right` à la largeur de l'écran. **Il passait aussi bien avec que
sans le correctif.**

La raison : en flex sans retour à la ligne, les pastilles ne débordent pas, elles se font
**écraser** (`flex-shrink` vaut 1 par défaut). La boîte reste donc dans l'écran, et c'est
le **texte** qui déborde d'elle. Je mesurais la boîte — la seule chose qui allait bien.

Deux corrections, et la seconde est celle qui compte :

1. comparer `scrollWidth` à `clientWidth` : la largeur qu'il **faudrait** contre celle
   qu'on a ;
2. **mesurer au bon moment.** Même corrigé, le contrôle passait encore : il tournait en fin
   de scénario, quand les nombres sont courts. Déplacé à l'ouverture du marché — l'état où
   j'avais vu la coupure — il tombe enfin : `J5 (30px dans 30px) · buzz 10 (66px dans 66px)`.

Un contrôle juste au mauvais moment ne vaut pas mieux qu'un contrôle faux. La discipline
« rejouer sur le code d'avant » a attrapé les deux — c'est la quatrième fois de la semaine
qu'elle rattrape un contrôle vide, et la première où le défaut était l'**instant** de la
mesure et pas la mesure elle-même.

Suite : crypto **20/20** · blanchiment 19/19 · ardoise 16/16 · invariants 58/58 ·
karnet 44/44 · nourrice 19/19 · arah 8/8 · raccourcis 10/10 · karim 14/14 · cause 21/21 ·
chaleur 8/8 · tap 7/7 · bulles 15/15 · tap-bigo 4/4 · escalier 6/6 · desync 5/5 · cache 3/3 ·
lexique 1/1 · check 32 fichiers · smoke sans erreur.

---

## 2026-07-28 — Le blanchiment (2/4) : la crypto, et la règle qu'on ne refera pas une 3e fois

Sylvain : « oui le propre → crypto → darkweb ». Ça confirmait l'architecture en deux
étages et ça réglait la question que je gardais ouverte.

### La contrainte que ça impose, et qui a décidé du découpage

**Je ne pouvais pas livrer la crypto sans le dark web.** Ce dépôt a fait deux fois la même
erreur : `S.cash` était produit sans rien acheter, et il a fallu couper la trieuse ET le
front de Karim. Une monnaie sans débouché n'est pas une monnaie, c'est un compteur. La
crypto aurait eu exactement le même sort.

D'où la règle appliquée ici, et le premier contrôle du fichier de test :
**une monnaie et son débouché s'ouvrent dans la même passe, jamais l'un avant l'autre.**
Si ce contrôle tombe un jour, c'est que le marché a été retiré et que la crypto est
redevenue un compteur — la troisième fois, on le saura tout de suite.

### Deux portes qui ne se concurrencent pas

| | frais | plafond | délai | source |
| --- | --- | --- | --- | --- |
| 🏧 **La borne** | 15 % | 1 000/jour | direct | liasses |
| 🤝 **Vlad (OTC)** | 6 % | 5 000/jour | J+1 | propre |

La borne est la **porte d'entrée** : on peut toucher au marché sans posséder un seul
commerce, et on paie cher pour n'avoir rien monté. L'OTC prend du propre, donc il suppose
qu'on a déjà blanchi. **Il ne s'ouvre pas plus tôt, il s'ouvre plus grand.**

Elles ne se marchent pas dessus parce que le plafond de la borne est journalier : à petite
échelle elle suffit, à grande échelle elle devient une goutte d'eau. Le goulot se déplace
de lui-même sans qu'on interdise quoi que ce soit (R9).

### Le contact se gagne

Le marché ne s'ouvre pas avec une adresse : c'est Vlad qui présente, après trois passages.
Même gabarit que Karim et l'Appro — le déblocage se relie à un geste. Et l'écran fermé
**dit comment l'ouvrir** au lieu d'afficher un cadenas : un cadenas est un catalogue, une
phrase est une direction.

### Le contrôle qui valide toute la chaîne

Rien ne garantissait que monter les deux étages serve à quelque chose. Le test le calcule,
tous frais payés, en ramenant tout en sale :

```
Appro   250 g q78 = 1700 sale (6,80/g)
Marché  250 g q88 = 1619 sale (6,48/g)   ← fonds possédé (8 %) puis OTC (6 %)
```

**Moins cher au gramme ET dix points de qualité.** La chaîne se justifie au gramme, pas par
un discours. C'est aussi la comparaison qu'aucun écran ne fait pour le joueur — donc celle
qu'un test doit tenir, sinon un rééquilibrage la casse sans que personne ne le voie.

### Détails qui comptent

- **La borne crédite sur place.** Elle est annoncée « immédiate » : la faire passer par la
  clôture aurait fait de ce mot un mensonge d'écran.
- **Une commande payée arrive**, même si la planque déborde — refuser une livraison déjà
  réglée serait une perte sèche (R1). Le débordement est annoncé au moment de commander et
  se paie en hit de planque, ce qui existe déjà.
- **La crypto n'entre au HUD qu'une fois touchée.** Avant, c'est un mot de plus dans un
  bandeau chargé pour une monnaie qui n'existe pas dans la partie ; après, c'est
  indispensable — une monnaie qu'on ne voit qu'en scrollant jusqu'à son écran, on l'oublie,
  et c'est exactement comme ça qu'un débouché meurt.

⚠️ Tous les nombres restent des **placeholders**.

### Reste au programme

Second corner et planque au propre (3), puis l'approfondissement du marché (4).

Suite : crypto **19/19** (nouveau) · blanchiment 18/18 · ardoise 16/16 · invariants 58/58 ·
karnet 44/44 · nourrice 19/19 · arah 8/8 · raccourcis 10/10 · karim 14/14 · cause 21/21 ·
chaleur 8/8 · tap 7/7 · bulles 15/15 · tap-bigo 4/4 · escalier 6/6 · desync 5/5 · cache 3/3 ·
lexique 1/1 · check 32 fichiers · smoke sans erreur. Modules en `?v=56`.

---

## 2026-07-28 — Le blanchiment (1/4) : la trieuse revient, et le propre sert enfin

Sylvain, après playtest : « la nourrice fonctionne bien, et on arrive désormais au moment
où on a besoin de » — trieuse de billets, blanchiment par petit commerce (% + plafond
quotidien + temps), borne crypto plafonnée à 1000/jour, achat OTC « pas regardant »,
et l'introduction au réseau de fournisseurs du dark web.

### Le diagnostic qui commande tout le reste

`S.cash` (le propre) n'avait **aucun débouché**. Ses seuls usages : l'affichage du HUD, le
remboursement de Karim (coupé), et un repli sur la paie des chouffes. C'est ce qui avait
fait couper la trieuse ET le front : une monnaie sans débouché n'est pas une monnaie, c'est
un compteur.

**Le blanchiment ne vaut donc que s'il s'ouvre EN MÊME TEMPS qu'un débouché.** Sinon on
rebâtit exactement l'impasse qu'on vient de démonter.

### Ce qui a été arbitré

| question | arbitrage |
| --- | --- |
| Propre et crypto : deux étages ou deux sorties ? | **Deux étages** — sale → propre → crypto |
| Le commerce : loué ou acheté ? | **Les deux** — on loue avant de pouvoir acheter |
| À quoi sert le blanchi ? | **Les gros investissements** (planque, corners, commerces) |

Le troisième choix est le plus intéressant, et ce n'est pas celui que j'avais recommandé :
Sylvain a écarté « les fournisseurs du dark web » comme débouché du propre, alors qu'il
l'avait lui-même listé. Ça donne une boucle **qui se referme sur elle-même** : on blanchit
pour racheter le commerce qui permet de blanchir plus. Le dark web reste au programme, mais
sa monnaie sera à confirmer quand on y arrivera — je ne la déduis pas.

### Passe 1 : la boucle complète, en petit

- **La trieuse revient**, mais elle ne produit plus de propre. Elle produit des **liasses**,
  du sale comptable. Un commerce n'accepte pas un sac de billets en vrac : compter est
  redevenu la **porte** du blanchiment au lieu d'en être le raccourci. Avant, `bankBundles`
  convertissait liasses → propre d'un tap et court-circuitait tout le système.
- **Chez Sofiane** (barber shop), loué : 22 % de frais, 400/jour, versement à J+2. Rachat
  du fonds à 3 500 propre → 8 %, 900/jour. **L'Épicerie du bas** ne s'ouvre qu'une fois un
  premier fonds possédé — on ne loue pas deux fois en aveugle.
- Les **trois** paramètres, pas un seul (arbitrage antérieur : « temps, capacité comme
  goulot et pas seulement une taxe »). Une taxe seule se paie et s'oublie — c'est le défaut
  mesuré sur la pension fixe. Le plafond et le délai, eux, ne se rattrapent pas avec de
  l'argent : ils bornent le **débit**, donc la vitesse à laquelle l'empire grandit.
- **Ce qui est engagé est sûr** (R1) : une fois déposé, l'argent n'est plus saisissable.
  C'est la contrepartie du délai. Sans elle, le joueur paierait des frais **et** porterait
  un risque — le blanchiment deviendrait une punition pour avoir bien vendu.
- **Aucun aléa** (R4) : délai en jours fixe, frais en pourcentage fixe, plafond fixe. Le
  devis annonce au billet près ce qui sera versé et quand, **avant** de valider (R8), et la
  clôture verse exactement ça. Une seule source — c'est la leçon de l'impayé.

### Le contrôle qui compte

`sorti des liasses 100 = propre 78 + frais 22`. Une fuite de conversion ne se verrait
qu'au bout de vingt soirées, et jamais comme un bug — seulement comme un équilibrage qui
« ne tombe pas juste ». C'est le genre de chose qu'un test attrape et qu'un playtest non.

⚠️ Tous les nombres sont des **placeholders**. Ordre de grandeur visé : à pleine capacité
louée, racheter le fonds demande une dizaine de soirées.

### Reste au programme

Borne crypto (1000/jour) + OTC (2), second corner et planque au propre (3), dark web (4).

Suite : blanchiment **18/18** (nouveau) · ardoise 16/16 · invariants 58/58 · karnet 44/44 ·
nourrice 19/19 · arah 8/8 · raccourcis 10/10 · karim 14/14 · cause 21/21 · chaleur 8/8 ·
tap 7/7 · bulles 15/15 · tap-bigo 4/4 · escalier 6/6 · desync 5/5 · cache 3/3 · lexique 1/1 ·
check 31 fichiers · smoke sans erreur.

---

## 2026-07-28 — L'impayé : R4 interdit le hasard, pas la perte

### Une coquille lue comme un arbitrage

Sylvain avait écrit « J'aime l'idée du retard possible et **le nom paiement** ». J'ai lu ça
comme le nom d'un écran et j'ai passé une session à demander confirmation de l'orthographe.
Sa réponse : « je voulais dire le **NON** paiement — c'est une faute de frappe. Que celui à
qui on prête ne revient jamais rembourser. »

Ce qui a sauvé le coup, c'est R11 : j'avais gardé le mot **hors du code** en attendant.
S'il était parti dans les identifiants, les classes CSS et les libellés de tests, il aurait
fallu le déraciner de partout — et il serait remonté, comme `ARAH`. **La règle a payé sur
un cas qu'elle n'avait pas prévu** : elle protège du contresens, pas seulement de la faute
d'orthographe.

Leçon à garder : une citation qui ne veut **presque** rien dire est le signal d'une
coquille, pas d'un arbitrage à interpréter. À relancer, pas à lire.

### La règle avait été mal lue, et ça avait coûté la mécanique

Le code disait, noir sur blanc :

```js
// ardoise (crédit) : … — jamais d'impayé (R4)
```

C'est une confusion, et elle est instructive : **R4 interdit le HASARD, pas la perte.** Un
impayé qu'on voit venir est parfaitement déterministe. Le design s'était privé du crédit
risqué en croyant respecter le déterminisme — une règle appliquée de travers coûte plus
qu'une règle absente, parce qu'on ne la rediscute jamais.

### Ce qui a été arbitré, et construit

| question | arbitrage |
| --- | --- |
| Qu'est-ce qui rend l'impayé prévisible ? | **Le type du client, dit dans son tell** |
| Qu'est-ce qu'on perd ? | **L'argent ET le client** — il disparaît |
| Combien de prêteurs ? | **Plusieurs** |

Quatre prêteurs, deux et deux : **Yaz** et **Nassim** règlent, **Riton** et **Kenza**
disparaissent. Chaque tell le dit, et un test le vérifie mot pour mot — sans ça, l'impayé
serait un dé déguisé en personnage.

Deux choses valent d'être notées sur la construction :

- **Une seule source.** `corner.paieArdoise()` est lue par la carte (qui annonce) ET par la
  clôture (qui applique). Deux décisions parallèles finiraient par diverger, et le joueur
  se ferait planter par un client annoncé sûr. C'est le contrôle central du fichier de
  test : quand on débranche le lien, **six vérifications tombent**.
- **Le défaut est « sûr ».** Un persona à qui on ajoute `credit` sans y penser paie. La
  valeur qui fait mal ne s'obtient jamais par omission.

Le chip d'avertissement s'affiche **au-dessus des boutons**, en rouge, comme 🔥 chaleur et
👃 exigence. Le tell le dit déjà en prose, mais c'est le chip qui tient R4 : une phrase
d'ambiance se lit en diagonale.

Réutilisations plutôt que nouveaux chemins : `c.quit` existait déjà (le client qu'on a trop
pressé), le tirage l'excluait déjà, le Karnet l'affichait déjà. On a ajouté `quitCause`,
sans quoi l'écran écrivait « parti » pour deux histoires opposées — celui qu'on a fait
fuir, et celui qui s'est tiré avec la came.

### Un bug de comptabilité trouvé au passage

`karnetOuvrir()` photographiait `soir` **à l'ouverture** de la clôture. Or l'ardoise
envolée s'écrit *après*. Résultat mesuré : une perte de 240 n'apparaissait **nulle part**
dans le bilan. `soir` n'est remis à zéro qu'après le scellement — il est donc relu au
scellement maintenant, ce qui est de toute façon la seule lecture qui contient la soirée
entière.

La perte est rangée en **manque à gagner**, pas en dépense : la marchandise est partie, le
liquide n'est jamais entré. La compter comme un débit ferait mentir la marge, et « Non
expliqué » s'allumerait.

### Ce qui reste mince, et que je signale plutôt que de le corriger tout seul

Tel qu'arbitré, la décision se réduit à **lire l'avertissement**. Refuser un crédit est
gratuit aujourd'hui (`cornerLeave(…, "refus")` ne touche pas la relation), donc face à un
fuyard il n'y a aucun arbitrage : on refuse, point. Le levier qui l'épaissirait — **refuser
coûte la relation** — n'est pas posé : c'est un arbitrage de Sylvain, pas une correction.

Suite : ardoise **16/16** (nouveau) · invariants 58/58 · karnet 44/44 · nourrice 19/19 ·
arah 8/8 · raccourcis 10/10 · karim 14/14 · cause 21/21 · chaleur 8/8 · tap 7/7 ·
bulles 15/15 · tap-bigo 4/4 · escalier 6/6 · desync 5/5 · cache 3/3 · lexique 1/1 ·
check 30 fichiers · smoke sans erreur. Modules en `?v=55`.

---

## 2026-07-28 — Playtest : la tension du remballage, les raccourcis, la pension muette

Trois retours de Sylvain après une session. Chacun s'est révélé pire — ou plus large —
que ce qu'il avait ressenti.

### 1. L'ARAH ne coûtait aucun choix

> « J'avais 2 chouffes qui ont bien sonné le ARAH et le feeling était vraiment bon de
> pouvoir remballer le matos et éviter de se faire capturer. En revanche, le temps donné
> pour remballer les barrettes était trop long. Pas assez de tension. »

Mesuré sur les constantes d'avant — préavis `[0,6,12,18]`, lot de 8, cadence 520 ms.
Vider un tampon plein (60 barrettes) demande 8 gestes, plus 1 pour la caisse :

```
n=1 →  6 s = 12 gestes possibles pour 9 nécessaires →  3 de MARGE
n=2 → 12 s = 24 gestes possibles pour 9 nécessaires → 15 de marge   ← son cas
n=3 → 18 s = 35 gestes possibles pour 9 nécessaires → 26 de marge
```

Il n'y avait donc **aucun arbitrage à aucun niveau de chouffe** : on sauvait tout, deux
fois plutôt qu'une. Son ressenti était même optimiste — il attribuait le problème à ses
2 chouffes, alors qu'**un seul suffisait déjà** à tout rentrer avec 3 gestes de rab.

Et le commentaire d'`ARAH_COOL_MS` annonçait depuis le début « on ne sauve jamais tout,
et ça se voit ». Les nombres ne l'ont jamais tenu. Une intention écrite en commentaire
n'est pas une garantie — c'est un souvenir.

**Correctif** : `ARAH_LOT` 8 → 5 et `PDV_PREAVIS_S` `[0,6,12,18]` → `[0,3,5,7]`. C'est le
PRODUIT lot × cadence qui décide de la tension, pas le préavis seul : à 8 par geste, un
tampon plein tenait en 8 gestes et n'importe quel préavis lisible suffisait.

```
n=1 → 3 s =  6 gestes → 25 barrettes sur 60 + la caisse
n=2 → 5 s = 10 gestes → 45 sur 60 : le dernier bloc OU la caisse, pas les deux
n=3 → 7 s = 14 gestes → tout, si tu ne traînes pas — ce que 180/soir achète
```

**Ce qui vaut mieux que le réglage lui-même** : avec une sacoche légère (`SAC_LOT` = 25),
même un seul chouffe sauve tout. La tension devient donc **fonction de ce qu'on a choisi
d'exposer**. Ce n'est pas le geste qui se durcit (ce serait R5 à l'envers), c'est la
décision d'amont qui prend enfin un poids — R9 au pied de la lettre.

Le préavis **annonce** maintenant ce qu'il permet (R8) : *« Ils arrivent. 3 s — de quoi
rentrer ~30 barrettes sur 60. La caisse te coûte un geste. »* Le brief est figé à
l'ouverture : une consigne qui change pendant qu'on l'exécute n'est plus une consigne.

⚠️ `PDV_PREAVIS_S` et `ARAH_LOT` restent des **placeholders** — la courbe est mesurée,
le ressenti reste à valider à la main.

### 2. La navigation était de la corvée pure, pas un arbitrage

> « La navigation entre le corner et la nourrice puis revenir sur le corner est assez
> laborieuse, et donc faudrait penser à mettre plus en évidence les menus clés. Peut-être
> même les mettre en favoris dans la barre du bas ? »

Mesuré : l'aller-retour coûtait **5 appuis** (↩, pin nourrice, dépôt, pin corner, « Tenir
le corner »), dont **un seul portait une décision**. Et le point qui tranche : `pdvTick`
sort immédiatement quand le corner n'est pas tenu — partir chez elle ne coûte **ni client,
ni vente, ni chaleur**. Ce n'était donc pas un arbitrage déguisé en trajet ; c'était de la
répétition sans plaisir, exactement ce que R6 dit de ne pas laisser sur la main du joueur.

**Correctif — deux raccourcis, chacun portant sa propre justification :**

- le **favori du dock** (`▶ Corner`, avec le bac) ramène au corner depuis n'importe où.
  Il occupe la colonne qu'une app masquée laissait vide, et se distingue des onglets
  (liseré froid) : la barre ne ment pas sur ce qu'elle contient ;
- la **puce liquide du corner** affiche ce qu'on a sur soi avec la marque 🔥, et mène chez
  la nourrice, fiche ouverte. Le liquide se fabrique au corner : c'est de là que la
  décision de le planquer peut naître, et la scène plein écran masquait le HUD.

Trajet : **5 appuis → 3**, dont celui du milieu est le dépôt. Le **lieu reste** — c'est
chez elle que la pension est annoncée avant d'être prélevée, et supprimer la visite
supprimerait l'annonce. C'est le chemin qui raccourcit, pas la décision qui disparaît.

**Deux défauts trouvés en écrivant le test, pas en réfléchissant :**

- les boutons de dépôt tombaient à y=855 dans un `#stage` qui s'arrête à 812 : **sous le
  dock**. Le raccourci déposait le joueur sur une fiche dont les boutons étaient hors du
  pli. D'où `voirFiche()` — toute sélection de pin faite PAR LE CODE amène la fiche sous
  les yeux (quand c'est le doigt qui tape un pin, on ne vole pas son défilement) ;
- la barre du corner **débordait déjà avant** : le bouton `▤ Gérer` sortait de l'écran sur
  412 px. Le `flex-wrap` ajouté pour la 6ᵉ puce le remet à portée.

Et mon helper de test mentait : il vérifiait « dans le viewport » et répondait *tapable*
d'un bouton couvert par le dock. Il consulte maintenant `elementFromPoint`. Un contrôle de
tapabilité qui ne regarde pas le recouvrement ne teste rien.

### 3. La pension était juste, mais muette

> « En checkant le karnet, je vois pension. Du coup il y a eu des frais de nourrice ?
> Sans doute besoin de le rendre plus explicite. »

Trois trous, dont **un structurel qui valait pour les sept postes** :

- le poste s'appelait « Pension » tout court — il ne disait pas chez qui l'argent part ;
- **le pont affichait `av → ap` À LA PLACE de l'aide.** Un joueur qui découvrait un poste
  voyait deux nombres et aucun mot pour dire ce qu'ils comptaient. La question portait sur
  le poste le plus récent, mais le défaut touchait tout le bilan ;
- la pension ne s'écrivait qu'au journal : elle ne se voyait qu'en allant la chercher. Un
  prélèvement automatique doit s'annoncer **quand il tombe** (R4), comme la paie des
  chouffes le fait déjà.

Plus un quatrième, non signalé mais du même ordre : le magot n'apparaissait nulle part sur
la carte. **Un puits invisible se lit comme un puits gratuit** — il porte maintenant un
badge sur son pin, comme le bac sur le corner.

### Ce que les tests ont attrapé, et ce qu'ils ont laissé passer

`bulles-loupe` est tombé à 14/15 : son contrôle du tiroir tournait juste après le bloc
ARAH, chaleur à 96 — et avec un préavis de 3 s au lieu de 12, la descente vidait le tampon
**au milieu du contrôle**. Le contrôle accusait alors le tiroir de mentir alors qu'il
disait la vérité. Il ne tenait pas sur un état, il tenait sur un **délai** : et un délai
qui dépend d'une constante d'équilibrage d'un autre système n'est pas une garantie, c'est
un sursis.

Et un contrôle que j'avais écrit ne pouvait pas échouer : « le poste dit à quoi il sert »
passait aussi sur le code d'avant, parce qu'avec **une seule soirée close** il n'y a pas de
pont — donc pas de chiffres à la place de l'aide. Il lui fallait deux soirées. Troisième
fois que ce dépôt écrit un contrôle vide ; le réflexe à garder est de **toujours le
rejouer sur le code d'avant**, jamais de se fier à ce qu'il prétend vérifier.

Suite : invariants 58/58 · karnet 44/44 · nourrice 19/19 (+5) · **arah 8/8** (nouveau) ·
**raccourcis 10/10** (nouveau) · karim 14/14 · cause 21/21 · chaleur 8/8 · tap 7/7 ·
bulles 15/15 · tap-bigo 4/4 · escalier 6/6 · desync 5/5 · cache 3/3 · lexique 1/1 ·
check 30 fichiers · smoke sans erreur. Modules en `?v=54`.

---

## 2026-07-28 — Les têtes : le Karnet dit enfin quel format couper

Section 3 des quatre demandées par Sylvain. Trois blocs, et l'**ordre est le propos**.

### 1. Ce qu'on te demande — la seule décision de l'écran

```
Le format qui te manque le plus : 5 g — demandé 8×, raté 5×.

  5 g   demandé 8× · servi 3×          raté 5 (63 %)
  8 g   demandé 2× · servi 1×          raté 1 (50 %)
  2 g   demandé 7× · servi 7×          tout servi
```

C'est la seule chose que cet écran porte (R8), et c'est le **premier éclairage qu'ait jamais
eu la coupe** — le levier de qualité du jeu (R10). Jusqu'ici `missed` était incrémenté
depuis des semaines et **lu nulle part**.

Le conseil désigne le format le plus **raté**, pas le plus demandé : le 2 g est plus
demandé, mais il est servi. Et il ne sort **que** s'il y a de quoi le fonder — carnet vide,
tout servi, ou une seule demande : le jeu se tait plutôt que de dire quelque chose de
plausible. Quatre contrôles tiennent ça.

### 2. Tes connaissances, 3. Les têtes du quartier

La séparation est la raison d'être des deux blocs : on **cultive** les personas (relation,
ardoise, exigence), on **reconnaît** les visages. Mélanger rendrait le déblocage d'un
persona sans intérêt.

### La capture a trouvé ce que les tests n'attrapaient pas

Sur l'écran fini, **Riton et Nassim apparaissaient des deux côtés** — une fois dans
« Tes connaissances », une fois dans « Les têtes du quartier ». La réserve de têtes
reprenait `PDV_NAMES`, écrit avant que les personas existent.

Ça ne cassait rien mécaniquement, et **aucun test ne pouvait le voir** : les deux listes
étaient correctes séparément. Il a fallu regarder l'écran. C'est la troisième fois cette
semaine qu'une capture trouve ce qu'un assert ne cherchait pas.

Réserve assainie (24 noms, aucun ne recoupe un persona, ni Karim, ni la nourrice) et
**invariant posé** : la prochaine tête ajoutée retomberait dans le piège autrement.

### Deux fois le même piège de seed, dans la même journée

`s.clients` n'existe pas encore quand `evaluateOnNewDocument` s'exécute — il est créé au
chargement. Un `if (s.clients && …)` ne fait donc jamais rien. Rencontré ce matin dans
`cause-loupe`, re-rencontré ce soir dans `karnet-loupe`. Les deux fois, le contrôle passait
au vert en ne prouvant rien jusqu'à ce que je regarde le détail.

## 2026-07-28 — Blanchiment : la forme est arrêtée (temps + capacité, la taxe par-dessus)

Sylvain, après la démonstration stock/flux : « On est alignés concernant la mécanique de
blanchiment. Temps, capacité comme goulot d'étranglement et pas seulement une taxe dessus. »

**Arbitrage figé, à ne pas rediscuter le jour où on le codera :**

| élément | rôle |
| --- | --- |
| **Capacité** | combien on peut faire passer par soirée → l'arbitrage « lequel je blanchis d'abord » |
| **Temps** | l'argent est immobilisé pendant qu'il se lave → blanchir, c'est renoncer à s'en servir maintenant |
| **Taxe** | un % par-dessus, mais **jamais seule** — seule, elle ne serait qu'un péage |

Le raisonnement qui a mené là, pour mémoire : une commission sur flux ne borne rien et ne
porte **aucune décision** (on blanchit tout, toujours). Capacité et délai transforment le
flux en **stock temporaire** — et c'est le stock qui porte la tension, exactement comme la
garde chez la nourrice.

**Ce qui devra être vrai le jour où on l'écrit :**

- le circuit du **propre** se rouvre (`SORTER_ENABLED`, `FRONT_ENABLED`) — aujourd'hui
  `S.cash` n'a aucune source in-game, et c'est ce qui avait tué la dette Karim ;
- la file d'attente du blanchiment se **voit** avant de valider (R8) ;
- rien d'aléatoire sur le délai ni sur la réussite (R4) ;
- aucune saisie possible sur ce qui est en cours de lavage sans préavis — sinon on
  réintroduit la perte sèche que R1 interdit.

**Pas construit maintenant** : Sylvain a explicitement mis `FRONT_ENABLED` en attente, et
le blanchiment n'a de sens que quand le propre sert à quelque chose.

## 2026-07-28 — Le % sur la valeur devient un motif : réservé pour le blanchiment

Sylvain, après la nourrice : « Le mécanisme de % sur la valeur sera utilisé de nouveau
lorsqu'on va attaquer le blanchiment d'argent. »

Bonne généralisation — mais il y a une distinction à ne pas rater au moment de coder, parce
que « un pourcentage » recouvre **deux systèmes qui ne se ressemblent pas du tout**.

### Loyer sur un STOCK ≠ commission sur un FLUX

Simulé, 20 soirées à 800 net :

```
(a) LOYER sur ce qu'on DÉTIENT — la nourrice, 10 %/soirée
      il reste 6 325 caché · 9 675 payés
      → plafond ≈ 8 000 : on ne peut pas cacher plus, quoi qu'on fasse

(b) COMMISSION sur ce qui PASSE — le blanchiment, une fois
      20 % → 12 800 de propre accumulé      30 % → 11 200      40 % → 9 600
      → le propre s'accumule SANS LIMITE
```

Le loyer sur stock crée une **pression continue avec un point d'équilibre** : la détention
coûte, donc il existe un plafond à ce qu'on peut garder. C'est ce qui fait de la nourrice
une décision qu'on reprend tous les soirs.

La commission sur flux est une **taxe** : elle rend chaque euro un peu moins rentable et
c'est tout. Elle ne borne rien, elle ne crée aucune pression, et surtout **elle ne porte
aucune décision le soir** — on blanchit tout, toujours, il n'y a rien à arbitrer (R8).

### Ce que ça implique pour le blanchiment

Si le blanchiment n'est qu'une commission sur ce qui passe, il ne sera pas un système, il
sera un péage. Pour qu'il porte une décision, il lui faut au moins un des deux :

- une **capacité** — on ne peut faire passer que N par soirée, donc « lequel je blanchis
  d'abord » devient un arbitrage ;
- un **délai** — l'argent est immobilisé pendant qu'il se lave, donc blanchir, c'est
  renoncer à s'en servir maintenant.

Les deux transforment un flux en stock temporaire, et **c'est le stock qui porte la
tension**. C'est aussi ce que disait l'angle « Lavomatic » du workflow, qui l'avait
justement conçu avec tranches plafonnées et deux soirées de délai.

### La règle candidate

La synthèse proposait de la verser dans `CLAUDE.md` :

> *Un puits de liquide se paie par un débit permanent, jamais par un droit d'entrée ; son
> taux ne baisse jamais avec la progression ; sa capacité est bornée par ce que le joueur
> produit, pas par ce qu'il achète.*

**Pas encore écrite** : ajouter une règle numérotée est un acte, et Sylvain n'a pas dit
« fais-en une règle », il a dit que le mécanisme reviendrait. Elle attend son feu vert.

## 2026-07-28 — La vanne du liquide : Tata Yamina garde, et se paie

Sylvain, en jouant : « aucune option de retirer l'argent du corner, ou bien de cacher
l'argent chez une nourrice ». Le code lui donnait raison, et **plus largement qu'il ne le
disait**.

### Le diagnostic : tous les puits étaient des STOCKS

| puits | ce qu'il vaut vraiment |
| --- | --- |
| Upgrades | **7 900** au total, une seule fois dans la partie. (Et pas 9 150 comme je l'avais dit : `scooter` et `counter` ne sont dans aucune ligne de boutique.) |
| Acheter du pain | Ne supprime pas la pression, il la **déplace** vers le hit planque. |
| Paie des chouffes | 180/soir à 3 chouffes, face à des soirées de 400 à 1 100. |
| Trieuse liquide→propre | **Coupée**. C'était *la* vanne prévue. |

Une fois les upgrades au max, le liquide **ne pouvait plus que monter**. Et au-dessus de
450 il chauffe à +40/min pour un seuil de descente à 95 : 2,4 minutes.

**Et la conséquence en cascade que je n'avais pas reliée** : c'est cette même trieuse coupée
qui a forcé l'extinction de la dette Karim. Elle était payable en propre, le propre n'a
aucune source in-game, donc impayable. La vanne manquante n'a pas seulement bouché le
liquide, elle a tué la seule échéance datée du jeu.

### Sa piste, telle qu'énoncée, effaçait la tension

Trois angles ont été conçus indépendamment et jugés contre R1..R11. **La nourrice a été
classée dernière** (5,5/10) et fut la seule des trois marquée « efface la tension ». Motif :
une cachette qui coûte une commission *une fois* transforme la pression du liquide en
formalité. Tu déposes, c'est fini, la tension disparaît.

Ce qui la sauve tient en un seul changement, greffé des angles perdants : **une pension par
soirée au lieu d'une commission unique**. Elle garde ; tant qu'elle garde, le compteur tourne.

### Pourquoi un pourcentage et pas une somme fixe

Sylvain a demandé. Simulé sur 30 soirées, plutôt qu'argumenté :

```
                pension fixe 100/soir      pension 10 %
  net 400/soir  tu caches  9 000  (25 %)   tu caches  3 400
  net 3000/soir tu caches 87 000  ( 3 %)   tu caches 25 900
```

Le fixe a **exactement le défaut des upgrades** : c'est un stock, et le jeu le dépasse. Il
pique quand on n'a pas les moyens (25 % de la soirée) et devient du bruit quand le liquide
devient un vrai problème (3 %). Le pourcentage, lui, coûte **toujours une soirée de travail
à l'équilibre** — la garde se stabilise à 10× le net. *« Tu ne peux cacher que dix fois ce
que tu gagnes en une soirée. Pour cacher plus, produis plus. »*

J'avais proposé un intermédiaire — une somme fixe par tranche de 1 000, qui se **compte** au
lieu de se calculer. Sylvain a tranché pour le pourcentage franc.

### Pourquoi ça n'efface pas la tension (R9)

L'argument principal ne coûte aucun nombre nouveau, il était déjà dans le code : **un pain
coûte 200, le premier palier de chaleur est à 180**. Un joueur qui garde de quoi ravitailler
demain est donc en zone 1 **par construction** — la nourrice ne peut pas le descendre en
zone froide sans lui retirer sa soirée suivante. Le palier doux devient le régime de
croisière ; seul le palier dur devient évitable, et lui n'était pas une tension mais un
verrou sans issue.

Et la pension **compose** : un magot oublié perd la moitié en 6,6 soirées. Ce n'est pas une
épargne, c'est une cellule avec un compteur.

**Ce que je ne peux pas défendre, et je le dis** : le report de chaleur d'un soir sur l'autre
est en grande partie supprimé. C'est délibéré — c'était la partie « impasse » — mais c'est
bien un cran de tension retiré. Si Sylvain veut le récupérer, le levier est `wasteG`, à la
source, et il l'a mis en réserve plutôt que de l'activer maintenant.

### R1 : elle mange le magot, elle ne crée jamais de dette

Si la poche est courte, elle se sert **dans la garde**. Le magot fond, il ne devient jamais
une dette — c'est le gabarit de la paie des chouffes, le seul mécanisme de charge que ce
dépôt ait écrit sans rouvrir la boucle sans sortie de `FRONT_ENABLED`.

### Un vrai bug, attrapé par le test

`spendDe().nourrice = (spendDe().nourrice||0) + p` — deux appels dans la même expression.
L'accesseur **réassignait** `S.dayTally.spend` à chaque appel : le premier rend A, le second
remplace A par B, et l'affectation atterrit sur **A que plus personne ne lit**. La dépense
disparaissait en silence.

`spendDe()` **mute désormais sur place**, ce qui supprime la classe entière — la même
expression à deux appels ne peut plus se tromper de cible. Attrapé par le contrôle de la
pension, pas par relecture.

### Le pont a bien mordu

Ajouter un puits au jeu sans l'ajouter à `POSTES` aurait fait apparaître « Non expliqué » au
Karnet. C'est exactement à ça que sert cette ligne, et le test vérifie qu'elle dort.

## 2026-07-28 — Les visages du quartier, et une fausse alerte sur mon propre poste

Arbitrage de Sylvain : les anonymes doivent avoir des **têtes récurrentes**. Il a pris
l'option que je n'avais pas recommandée, et il avait raison : 85 % du trafic défilait sans
que personne n'existe deux fois. Un quartier peuplé, pas des statistiques.

Ce qu'un visage **est** : quelqu'un qu'on reconnaît. Il revient, on se souvient de ce qu'il
demande, on sait combien de fois on l'a laissé repartir les mains vides —
« Déjà vu 4× · 8 g d'habitude · reparti bredouille 2× ».

Ce qu'un visage **n'est pas** : un persona. Pas d'ardoise, pas d'exigence de qualité, pas de
graphe social, pas de relation qui monte. Les personas nommés restent la **récompense** du
bouche-à-oreille — si un passant pouvait devenir aussi intéressant qu'eux, débloquer Lina ou
Nassim ne voudrait plus rien dire. La frontière tient à une chose et une seule : un visage
n'a **pas de `cid`**, donc `applyDeltas` continue de sauter sa branche persona.

La mémoire est **purement descriptive** : aucune conséquence mécanique. C'est ce qui évite
d'inventer un malus sur une rupture de stock (R1), et ce qui alimentera le Karnet — « on t'a
demandé douze fois du 5 g, tu en as servi quatre », c'est-à-dire la décision de coupe, le
seul vrai levier de qualité (R10). Sylvain avait à choisir entre têtes récurrentes et
agrégat par format : en le construisant comme ça, on a les deux.

### Pourquoi 24 têtes et pas 12

Mesuré : à ~19 anonymes par soirée, une réserve de 12 ferait revenir chaque tête **1,6 fois
par soirée** — ce n'est pas un habitué, c'est un figurant en boucle. À 24, on croise 24 têtes
distinctes en 8 soirées, chacune ~4,8 fois, et jamais plus de 4 fois dans la même soirée.

### La reconnaissance se calcule au RENDU, pas au spawn

Premier jet : le tell était figé dans `cl.tell` au moment du spawn. Un client déjà en file
revenait donc **sans mémoire** après un rechargement, et la vérité était dupliquée alors
qu'elle vit déjà dans `S.visages`. Attrapé par le test d'écran, pas par relecture. Une seule
source, lue au moment où on la montre : elle ne peut pas être périmée.

L'autre oubli : l'expiration de patience ne passe **pas** par `cornerLeave` (la file est
filtrée directement), donc un visage parti d'impatience n'aurait rien laissé. Il est reparti
les mains vides comme les autres.

### La fausse alerte

En cours de route, mon checkout local s'est retrouvé **trois commits en arrière** :
`karnet.mjs` avait disparu du disque et `karnet-loupe.mjs` était retombé à 13 contrôles au
lieu de 29. J'ai bien failli annoncer à Sylvain que `main` était cassé — que son `index.html`
importait un module absent, donc que le jeu ne chargeait plus.

**C'était faux, et sa capture d'écran le prouvait déjà** : elle montrait le nouveau Karnet,
donc le pont était bien déployé. J'ai vérifié `origin/main` avant de parler. Le dépôt était
intact ; c'est ma copie de travail qui avait perdu le fil, et j'avais construit les visages
sur cette base périmée. Tout a été rejoué sur le vrai `main`.

**La leçon, et elle vaut d'être écrite** : avant d'annoncer une panne, vérifier la source de
vérité — pas son propre poste. Et quand une observation du joueur contredit mon diagnostic,
c'est le diagnostic qui est suspect.

## 2026-07-28 — Le Karnet dit enfin quelque chose : le pont

Écran 1 du plan, fait. Le Karnet n'est plus un journal : il ouvre sur **le pont** — d'où
vient l'écart de marge avec la veille, poste par poste.

```
J4 · clôturée                                     marge 175
Le détail de la soirée
  Corner     ventes au comptoir, pourboires compris        +20
  SnapShit   les commandes livrées en DM                  +275
  Chouffes   leur paie, prélevée à la clôture             −120

Pas encaissé — hors marge
  Ce n'est pas sorti de ta poche : ce n'est jamais entré.
  Ruptures         1 · la sacoche ne composait pas — coupe un autre format    −10
  Départs fâchés   1 · ton prix a dépassé leur plafond                        −22
```

**La somme tombe juste, et elle est visible** : 20 + 275 − 120 = 175.

### Ce qui rend le pont honnête

**La somme est juste par CONSTRUCTION**, pas vérifiée après coup. Chaque ligne est la
différence du même poste entre deux soirées, et la marge est la somme de ces postes, lue
depuis **la même liste** (`POSTES`). Ajouter un poste l'ajoute au total automatiquement :
il n'y a pas de somme parallèle qui puisse prendre du retard sur la liste.

Le test balaie quand même **3 024 paires de soirées** — parce qu'une construction qui se
croit correcte, ça existe. Et la contre-épreuve vérifie que **le contrôle mord** : oublier
un poste fait bien apparaître un résidu. Sans elle, « ça boucle » ne prouverait rien, un
pont vide boucle aussi.

**Le manque à gagner reste DEHORS.** Ruptures, départs fâchés et descente ne sont pas des
dépenses : c'est de l'argent qui n'est jamais entré. Les mélanger au pont casserait la
somme et ferait passer une vente jamais conclue pour de l'argent sorti de la poche. Bloc
séparé, étiqueté « hors marge », avec la phrase qui le dit en clair.

**Un résidu, s'il y en avait un, s'AFFICHERAIT** — « Non expliqué : un poste manque au
bilan, c'est un bug, pas un arrondi ». Un résidu visible est un bug qu'on corrige ; un
résidu lissé est un mensonge.

### Ce que j'ai changé par rapport au plan de conception

Le plan mélangeait dans le même pont les postes de marge (pain, chouffes) et le manque à
gagner (ruptures, descente). **Ça ne peut pas boucler** : les deux ne sont pas de même
nature. Je les ai séparés — c'est la seule façon de garantir la somme, qui est le seul
argument que le Karnet a pour exister.

Le plan proposait aussi une ligne « + 80 Pain » quand on achète moins que la veille. Écarté
pour la même raison qu'il l'écartait lui-même : ça apprendrait « achète moins de pain, ta
soirée est meilleure » pendant que la planque se vide.

### Le verdict ne fait pas de reproche

Il nomme le poste le plus lourd **en valeur absolue, gain compris** : une bonne soirée doit
s'expliquer aussi bien qu'une mauvaise. Un Karnet qui ne parlerait que des pertes serait un
instrument de reproche, ce que R1 interdit.

## 2026-07-28 — La photo de soirée, en deux temps parce qu'un seul ne suffit pas

Sylvain a tranché : le Karnet ne montre **que les soirées closes**. Il faut donc figer
chaque soirée au moment où elle se ferme. Étape 2 du plan, faite.

**Une capture unique ne peut pas marcher, où qu'on la place** — les chiffres d'une soirée
ne sont pas disponibles au même instant :

- la **recette SnapShit** meurt dès la **première** instruction de la clôture
  (`passerSoiree` remet `dayTally` à zéro) ;
- la **paie des chouffes** tombe vers la **fin**, après le règlement des ardoises.

D'où `karnetOuvrir()` avant, `karnetSceller()` après. Une seule fonction au milieu perdrait
forcément l'un des deux bouts — et en silence, puisqu'un bilan amputé reste plausible.

`seq` et `res` sont figés à l'ouverture pour que « passages » soit un **delta** : les
clients de cette soirée-là, pas le compteur cumulé depuis le début de la partie.

### Deux contrôles qui passaient sans rien prouver

Écrits d'abord comme ça : la photo gardait `dm 0` et `passages 0` — les deux vérifications
passaient au vert **sur des zéros**. Un contrôle qui ne peut pas échouer ne garde rien,
c'est la troisième fois cette semaine que je m'y reprends.

Refaits pour être vrais :

- la soirée est seedée avec **275 € de recette DM**, et le test vérifie à la fois que la
  photo les garde **et** que le jeu les a bien effacés (`dayTally.cash → 0`). Sans la
  seconde moitié, on ne saurait pas si la photo a sauvé quoi que ce soit ;
- le compteur cumulé part à **5** : si la photo rendait le cumul au lieu du delta, elle
  afficherait « 5 passages » pour une soirée qui n'a vu arriver personne. Le test compare
  explicitement les deux lectures.

## 2026-07-28 — Karnet : les quatre derniers arbitrages

| Question | Décision de Sylvain |
| --- | --- |
| Les anonymes | **Des têtes récurrentes** (j'avais recommandé l'agrégat par format — il a tranché l'inverse) |
| La soirée en cours | **Seulement les soirées closes** |
| L'ardoise | **Le retard est possible** — et l'écran s'appelle **Paiements**, pas Échéances |
| La dette Karim (`FRONT_ENABLED`) | **Pas maintenant** |

### Têtes anonymes récurrentes

Il veut que le quartier soit **peuplé**, pas statistique. Ça demande une identité stable
pour les passants, qu'aucun n'a aujourd'hui (`cid: null`).

La contrainte à tenir : cette identité doit rester **déterministe** (R4). Elle se dérivera
du hash de présentation déjà en place (`cornerHash(day, seq)`), donc sans aucun aléa
d'état — le même seed donnera les mêmes visages. Et il faudra une frontière lisible avec
les personas nommés, qui restent la **récompense** du bouche-à-oreille : un habitué anonyme
n'est pas un persona, il n'a ni ardoise, ni exigence de qualité, ni graphe social.

### Le retard sur l'ardoise — et pourquoi il faut y aller prudemment

J'avais signalé le risque : le retard rouvre la porte que `FRONT_ENABLED = false` a dû
fermer — une dette qui enfle (+8 chaleur, −6 standing, ×1,15 tous les 2 jours) sans moyen
de la solder, c'est-à-dire **R1 violé de la pire façon**. Sylvain a maintenu son choix.
C'est sa décision, et elle se tient : sans risque, accepter une ardoise n'est pas un
arbitrage, c'est un bouton « oui ».

Ce que ça engage côté implémentation, et qui n'est pas négociable :

- le retard doit être **borné** — un montant qui rentre plus tard, pas une dette qui enfle
  indéfiniment ;
- il doit toujours exister une **sortie** ;
- il doit être **annoncé avant** le geste (R8 : la carte doit dire ce qu'on risque), et
  **déterministe** (R4 : jamais un tirage) — donc lisible sur la fiche du client, pas une
  surprise à la clôture.

Autrement dit : ce n'est pas le retard qui violait R1 dans l'ancien système, c'est
l'**escalade sans issue**. On garde le premier, on ne réintroduit pas la seconde.

### ~~« Paiements » plutôt que « Échéances »~~ — LECTURE FAUSSE, corrigée le 2026-07-28

Sa formulation exacte : « J'aime l'idée du retard possible et le nom paiement ». Je l'ai lu
comme le nom de l'écran, en marquant que c'était une interprétation.

**Ce n'en était pas une de bonne.** Sylvain : « je voulais dire le **NON** paiement — c'est
une faute de frappe. Que celui à qui on prête ne revient jamais rembourser. » Il n'y avait
aucun nom d'écran à trancher : il arbitrait une **mécanique**.

Ce qui a marché, et qui vaut d'être noté : j'ai gardé le mot **hors du code** en attendant
sa confirmation, précisément au nom de R11. S'il était parti dans les identifiants, les
classes CSS et les libellés de tests, il aurait fallu le déraciner de partout — et il
serait remonté, comme `ARAH`. La règle a payé sur un cas qu'elle n'avait pas prévu :
elle protège aussi du contresens, pas seulement de la faute d'orthographe.

Leçon de fond : une citation qui ne veut **presque** rien dire (« le nom paiement ») est le
signal d'une coquille, pas d'un arbitrage à interpréter. À relancer, pas à lire.

## 2026-07-28 — Le socle du Karnet, et une erreur d'un jour qui ne se voyait pas

Sylvain a arbitré les **quatre** sections du Karnet. Un workflow de conception a tourné
(relevé de ce que le save contient déjà, trois propositions jugées contre R1..R11,
synthèse). J'ai **vérifié ses affirmations sur le code** avant de m'en servir — quatre
étaient porteuses, quatre sont exactes :

| affirmation | vérifié |
| --- | --- |
| `missed` incrémenté (`index.html:1238`), **lu nulle part** | ✅ que des écritures |
| la branche `walk` ne rend ni le plafond ni le montant demandé | ✅ `corner.mjs:526` |
| `passerSoiree` remet `dayTally` à zéro **avant** la paie et les ardoises | ✅ `advanceDay:2910` puis `:2913+` |
| `FRONT_ENABLED = false` rend la dette Karim morte | ✅ coupe `takeFront`, l'escalade, `debtInfo` |

L'**étape 1** du plan ne dépend d'aucun arbitrage restant : c'est de la plomberie. Faite.

### Compter à la source, pas relire le journal

`S.journal` est plafonné à 50 entrées et une soirée en dépasse. Des totaux tirés de là
seraient faux dès qu'une soirée est chargée — et faux **en silence**, ce qui est le pire
cas. Les compteurs vivent donc sur le corner (`P.soir`), écrits là où le montant est déjà
en main : vente, rupture, impatience, départ fâché, descente.

### Les trois pertes ne se confondent plus

Dire « tu as perdu 380 » n'aide personne : le joueur ne sait pas s'il doit couper un autre
format, ravitailler plus, ou baisser son prix. Elles sont désormais séparées, et chacune
porte le **nombre réel** :

- **rupture** → l'euro avait été **accepté** au moment où la sacoche s'est révélée
  incapable de composer ;
- **impatience** → chiffrée **seulement** si la carte affichait un montant tapable. Un
  hésitant n'annonce aucun prix : le Karnet dira « 3 partis » sans montant plutôt qu'un
  chiffre fabriqué ;
- **départ fâché** → `resolveOffer` rend maintenant `ceil` et `asked`. Les deux nombres
  **existaient déjà dans le scope** ; on les rendait à la poubelle. Sans eux, expliquer un
  départ imposerait de **resimuler** le client après coup — donc d'afficher « son plafond
  était 88 » sans que 88 ait jamais décidé de quoi que ce soit.

### L'erreur d'un jour

`advanceDay` fait `S.day++` **en troisième instruction**, avant la paie des chouffes, le
règlement des ardoises et les conséquences de la nuit. Toutes ces lignes étaient donc
datées de la soirée **suivante**.

Un bilan bâti là-dessus aurait imputé chaque soir la dépense la plus régulière du jeu à la
mauvaise colonne. Et ça ne se voit **jamais** : le total reste plausible. Attrapé par le
contrôle « la paie du soir reste attribuée à la soirée qui vient de se clore », qui est
tombé du premier coup.

### Trois erreurs dans mon propre test

Écrites ici parce qu'elles disent quelque chose sur le jeu :

1. Je croyais qu'un client demandant 5 g depuis une sacoche de 2 g déclenchait une
   **rupture**. Non : c'est un **remplissage partiel** (4 g couverts). Seul un format
   strictement incomposable — 1 g depuis des 2 g — donne une rupture.
2. Je croyais qu'une contre-offre trop haute donnait un `walk`. Non : au premier tour elle
   donne un `counter` (son dernier prix). Le walk demande deux tours, ou une offre
   au-dessus de sa poche acceptée directement.
3. Un contrôle « planque pleine » écrit en ternaire retombait sur `true` — il **passait
   sans rien vérifier**. Remplacé.

### Ce qui attend Sylvain

Cinq `[DÉCISION REQUISE]` sont sortis de la conception, et je ne les tranche pas :
la mémoire des anonymes (85 % du trafic), ce que `missed` doit coûter, si l'ardoise peut
échouer, si le Karnet doit jamais montrer la soirée **en cours**, et s'il faut réveiller
`FRONT_ENABLED`.

## 2026-07-28 — L'appro passe par Karim avant que le marché s'ouvre

Deuxième arbitrage implémenté. L'app Appro n'est plus disponible d'emblée : avant, on se
fournit chez **Karim** — celui qui t'a lancé — et c'est en le faisant tourner qu'on obtient
le contact. Déblocage **narratif et mérité**, pas un compte à rebours.

- Un pin **Chez Karim** sur la carte. Il vend son gabarit, 100 g à Q55, **280 en liquide**
  — contre 200 au marché pour 100 g. **+40 %** : ce que coûte de n'avoir qu'un seul
  fournisseur. Ce n'est pas une punition, c'est la friction qui donne sa valeur au contact.
- Au **3e achat** : « T'es réglo. Tiens, appelle ce numéro. » L'Appro s'ouvre, et le
  déblocage entre au Karnet comme une cause nommée — jamais une surprise.
- La tuile Appro reste **visible mais éteinte**, et **cliquable** : elle mène chez Karim.
  Une app qu'on cache n'apprend rien ; une app éteinte qu'on peut taper dit à la fois
  « pas encore » et « voilà par où ».

### Cinq portes, une seule serrure

Cinq endroits menaient à l'Appro : la tuile, la planque, l'écran de coupe, le repli 2D, la
reprise 3D. Poser le verrou dans quatre et en oublier un, c'est **exactement** la
moitié-corrigée que ce dépôt s'est infligée trois fois cette semaine. Tout passe par une
fonction `allerAppro()` unique — et quand elle refuse, elle **emmène chez Karim** au lieu
d'afficher un mur.

### Ce que la planque impose, et qu'on garde

La planque de départ tient 250 g, son pain fait 100 g : **on ne peut pas en empiler trois**.
Le déblocage force donc à jouer la boucle — acheter, couper, vendre, revenir. Découvert en
écrivant le test, qui achetait trois fois d'affilée et voyait le 3e achat tomber à +0 g.
**Le fautif était le test, pas le jeu**, et la contrainte est même ce qui rend le contact
mérité plutôt qu'acheté. On la garde. En revanche le test vérifie maintenant que les deux
refus possibles se **lisent** — « Planque pleine — 200/250 g », « Liquide insuffisant (279) » —
parce qu'un bouton mort sans raison, ça, ce serait un vrai bug.

### La partie en cours ne perd rien

Migration v32 : toute save qui a **déjà vécu** (jour > 1, du stock, ou un journal) est
considérée comme ayant le contact. Verrouiller l'Appro de Sylvain l'aurait renvoyé à un
tutoriel fini depuis des jours — R2 à l'envers. Même critère que la cinématique d'intro,
parce que c'est la même question : cette partie a-t-elle commencé ?

Nouveau `tools/karim-loupe.mjs` (14/14). Contre-épreuve : sur le code d'avant, **12 des 14
contrôles tombent**.

### Un contrôle creux, attrapé et remplacé

Le premier jet du contrôle « planque pleine » était écrit `!/Prendre/.test(t) ? … : true` —
donc il retombait sur `true` dès que le bouton était actif, et **passait sans rien vérifier**.
C'est le même défaut que la comparaison au ledger de la semaine dernière : un test qui ne
peut pas échouer ne garde rien. Remplacé par deux scénarios qui provoquent vraiment chaque
refus.

## 2026-07-28 — Quatre arbitrages de Sylvain, et deux de mes chiffres qui étaient faux

Sylvain a tranché quatre questions en attente. **Deux des chiffres sur lesquels je l'ai
fait décider étaient erronés** — les voici corrigés avant les décisions elles-mêmes.

### Ce que j'avais dit de travers

1. **« Les chouffes s'embauchent gratuitement. »** Faux. `PDV_CHOUFFE_PAY = 60` existe,
   est prélevé à la clôture de soirée (liquide d'abord, puis propre, et un chouffe part si
   la paie manque), et l'écran l'affiche : « Chouffes (60/soir) ». Ma phrase se contredisait
   d'ailleurs elle-même, puisqu'elle chiffrait « 1 200/soir » deux lignes plus bas.
2. **« La chaleur ne monte plus dès n = 20. »** Le seuil réel est **n = 11** (660/soir), à
   activité pleine. J'avais vérifié qu'à 20 c'était négatif sans chercher où ça basculait.

Le fond tenait — la jauge se fige bel et bien — mais je l'ai fait décider sur un prix
d'entrée deux fois trop élevé et sur un système que je croyais absent.

### Les arbitrages

| Question | Décision |
| --- | --- |
| Chouffes | **Plancher de chaleur + salaire par soirée** |
| App Appro | **Après N pains achetés chez Karim** (déblocage narratif, mérité) |
| Karnet | **Les quatre sections** : bilan de soirée, échéances, carnet de clientèle, tableau de bord des corners |
| Combo | **On garde tel quel** — à tester en jeu avant de toucher aux nombres |

### Chouffes : le plancher, fait

Le salaire existait déjà ; il ne restait que le plancher. Il est calé **là où le préavis
cesse de s'améliorer** : `PDV_PREAVIS_S` s'arrête à 3 chouffes, donc l'amortissement sature
à 3 chouffes. Au-delà, un chouffe de plus n'achète plus rien — ni secondes d'ouverture, ni
préavis — mais son salaire continue de courir.

Mesuré sur la vraie page, corner tenu, 5 s sans rien toucher :

```
                 avant            après
  0 chouffe    +12,8            +12,7
  3 chouffes    +7,0             +7,1     ← la plage voulue : rien ne change
 24 chouffes     0,0  « le coin  +7,1     ← la jauge repart
                       ne chauffe plus »
```

**Pas de plafond dur** — Sylvain l'a écarté, et il avait raison : un mur se subit sans se
comprendre. L'autolimitation passe par l'information. `chouffeGain` dit maintenant
« un de plus n'achète rien · préavis déjà au max (18 s) — et 60/soir en plus », **avant**
le bouton. On peut toujours embaucher ; on sait juste que c'est de l'argent jeté.

Trois sites recalculaient la formule à l'identique. Ils passent par un `chouffeAmorti()`
unique : un plancher oublié dans l'un des trois aurait été exactement la moitié-corrigée
que ce dépôt s'est déjà infligée trois fois cette semaine.

Nouveau fichier `tools/chaleur-loupe.mjs` (8/8). Contre-épreuve : sur l'`index.html` d'avant,
**5 contrôles sur 8 tombent**, dont « LA JAUGE EST GELÉE ». Les deux contrôles de contexte
— ça chauffe à sec, le chouffe ralentit — passent dans les deux cas : ils sont là pour
qu'un échec des autres veuille dire quelque chose.

### Resté ouvert

Ma question sur le combo mêlait deux choses : l'équilibrage (×3 plus facile à tenir) et le
cas du **pigeon**, dont la vente remet le combo à 1 en silence. Sylvain a répondu « on garde
tel quel » — ce qui tranche l'équilibrage. Le message manquant sur le pigeon reste donc
**non arbitré** : ma question était mal découpée, pas sa réponse.

## 2026-07-28 — Le garde du cache ne regardait pas dans `tools/`

Repéré en travaillant sur le verrou de carte : `smoke-loupe-pdv.mjs` importait
`/la-loupe/corner.mjs?v=3` — une version figée au 20 juillet, pendant que le module était
réécrit de fond en comble. Le smoke tournait donc sur une **seconde instance** du module,
périmée, à côté de celle du jeu.

C'est exactement la faute que `cache-loupe.mjs` a été écrit pour attraper — le `?v=19` de
`scene3d`. Le garde affichait pourtant 3/3, parce qu'il ne balayait que `la-loupe/`.

Troisième fois que la même leçon revient sous un habit différent : **un garde ne couvre que
ce qu'on a pensé à lui montrer**. La première fois c'était une forme d'import (statique vs
dynamique), la deuxième une forme de mot (texte affiché vs identifiant), celle-ci un
dossier. À chaque fois le garde existait, à chaque fois il rassurait à tort.

`cache-loupe.mjs` balaie maintenant aussi `tools/`. La version reste **littérale** dans le
test, exprès : le garde refuse toute divergence, donc l'oubli est impossible, alors qu'un
calcul dynamique passerait sous son nez sans rien vérifier.

## 2026-07-28 — Le revers du tap mort : l'appui qui atterrit sur quelqu'un d'autre

Dixième et dernière trouvaille de la chasse. Même racine que les taps morts corrigés hier
— une carte reconstruite en place — mais la panne est **inverse**.

Le tap mort, c'est le nœud détruit *sous* le doigt : rien ne se passe. Ici le nœud n'est pas
détruit sous le doigt, il est **remplacé entre deux appuis** par la carte du client suivant,
aux mêmes pixels, avec les mêmes libellés. Le joueur a lu une carte, décidé, et son appui
s'exécute **sur une autre personne**.

Mesuré — deux appuis au **même point** (81,748), 230 ms d'écart, file de deux anonymes dont
les offres viennent de `makeAnon` (donc en bande, état non fabriqué) :

```
  1er appui : « ✅ OK 20 » (Le premier)  → vente 2 g / 20 €
  2e appui  : même pixel, la carte est devenue « ✅ OK 47 » (Le suivant)
  résultat  : DEUX ventes — ledger [Le suivant 4 g/38 €, Le premier 2 g/20 €]
```

La seconde vente porte sur un client dont la carte n'a **jamais été lue**.

Correctif en deux morceaux, parce qu'un seul ne suffit pas :

- **`CARD_LOCK_MS` (320 ms)** — la carte d'un client qu'on découvre n'accepte aucun appui
  tant qu'elle glisse. Le verrou ne s'arme que sur un **changement de client** : un cran de
  stepper, une modification de prix, un re-rendu pour le même client restent immédiats.
  Sinon on aurait remplacé un tap qui atterrit au mauvais endroit par un tap qui meurt —
  l'autre moitié du même problème.
- **Un liseré sur la carte neuve.** `cslide` jouait déjà, mais **à l'identique** pour un
  simple re-rendu et pour un changement de client : rien ne signalait que la personne en
  face avait changé. Le verrou seul aurait juste mangé un appui sans dire pourquoi.

Le test `tap-loupe.mjs` porte les deux moitiés : l'appui volé est bloqué, **et** l'appui
suivant marche normalement une fois le verrou relâché.

### Ce que le correctif a révélé dans le smoke test

`smoke-loupe-pdv.mjs` enchaînait ses clics toutes les **250 ms** — plus vite que le verrou,
donc plus vite qu'un joueur qui *lit* la carte devant lui. Il est passé au rouge, ce qui est
la bonne réaction : il pilotait le jeu à une cadence qu'aucune main n'atteint. Son rythme
lit maintenant `CARD_LOCK_MS` dans la source, pour qu'il suive si la constante bouge au lieu
de figer un nombre qui redeviendrait faux en silence.

## 2026-07-28 — L'hésitant partait en « rupture » avec 24 g dans la sacoche

Neuvième trouvaille. Les deux boutons de l'hésitant servaient des grammages **fixes** —
son habituel, ou 2 g — jamais confrontés à la sacoche. Une barrette ne se casse pas : une
sacoche de 24 g en barrettes de 8 ne compose pas 5 g. Mesuré :

```
  sacoche {8:3} — 24 g bien réels · Sofia veut son 5 g habituel
  bouton offert : « 💬 Son 5 g habituel »
  tap           → « Rupture — charge ta sacoche (Gérer). » · réservoir 90 → 88,8
```

Perte sèche sur un bouton **offert par le jeu**, stock plein en main — et un message faux
par-dessus : la sacoche *est* chargée, c'est le **format** qui ne convient pas.

C'est exactement la classe de bug déjà fermée pour le rail du stepper de négo (« la liste
servable ne contenait que de l'inservable »). Elle était restée ouverte ici : le correctif
avait été appliqué à l'endroit où on l'avait vu, pas à la classe. **Troisième fois en deux
jours** qu'une faute survit à côté de sa jumelle réparée.

Correctif : on sert le composable le plus proche, et le bouton l'**annonce** — « Son 5 g
habituel » quand on peut le lui donner, « Au plus près · 8 g » quand le format oblige à
s'en écarter. Le joueur voit que c'est sa **sacoche** qui décide, ce qui en fait une
information de jeu au lieu d'un mur (R2 : la composition de la sacoche devient un levier
lisible). Quand les deux boutons retombent sur la même quantité, le second n'offre plus de
choix : il disparaît.

La récompense de l'attention reste acquise même quand le format oblige à s'écarter — sinon
la contrainte de sacoche redeviendrait une amende. En revanche la réplique ne peut plus
dire « C'est EXACTEMENT ça » sur 8 g quand il en voulait 5 : `lu` n'est mérité que si on
lui a servi **son** grammage. Le test vérifie les deux sens — que la sacoche qui compose
pile son habituel le lui serve, et garde sa réplique.

## 2026-07-28 — Négocier tranquillement coûtait le multiplicateur, en silence

Huitième trouvaille — et c'est **l'autre moitié de la précédente**, laissée sur place par
un audit qui n'avait corrigé que sa voisine.

Le gel de patience ne protège que le client de **tête** : le fond de file continue de
fondre pendant qu'on négocie. Or une expiration **n'importe où** dans la file remettait le
combo à 1. Mesuré — file de 4, tête en « nego », on ne touche à rien pendant 5 s :

```
  t0    chip ⚡×2.5 · file 4 · tête « nego » pat 22
  t+5s  chip ⚡×1   · file 2 · tête « nego » pat 22
  message à l'écran : aucun
```

Le client **en face** n'a rien raté — il garde toute sa patience. C'est prendre le temps de
bien négocier, ce que la carte invite explicitement à faire, qui coûtait le multiplicateur.
Sans un mot.

**Ce qui rend le diagnostic sûr : le commentaire au-dessus de la ligne la condamne.** Il dit
qu'un client qui se lasse est « une VENTE PERDUE, pas une amende », et que ponctionner `res`
« punissait la LENTEUR DE LA MAIN — exactement ce que R1 interdit ». L'audit d'alors a retiré
la ponction de `res`… et laissé `P.combo=1` sur la même ligne, sous ce commentaire.

C'est très exactement le mode de défaillance que R11 décrit : **la moitié visible réparée, la
même faute survivant à côté** sous une autre forme. Deux fois en deux jours, sur deux sujets
sans rapport (l'orthographe d'ARAH, puis ce combo). La leçon tient : ce qui n'est pas
vérifié mécaniquement revient.

Correctif : l'expiration ne touche plus au combo.

### Conséquence d'équilibrage, à valider

Il ne reste plus qu'**une seule** façon de perdre le combo en cours de soirée : le `walk`,
c'est-à-dire s'être trompé de prix — et il est annoncé par `negoFace` **avant** le bouton
(R8). Le combo devient donc littéralement « depuis quand tu n'as pas mal tarifé », ce qui est
cohérent avec ce qu'il prétend être, mais **plus facile à tenir haut** qu'avant.

**[DÉCISION REQUISE]** : ×3 tenable toute une soirée sur un pourboire de 18–22 %, est-ce le
bon plafond ? Si c'est trop, le levier propre est `COMBO_MAX` / `COMBO_STEP` (constantes
nommées, `corner.mjs:14`) — pas le retour d'une amende sur la lenteur.

## 2026-07-28 — « aucun malus » s'affichait pendant que le combo tombait de ×3 à ×1

Septième trouvaille. Recaler un profil louche qui s'avère être un vrai client affiche
« 🙄 C'était un vrai client… vente perdue (aucun malus). » — et remettait le combo à 1.

Le combo, c'est la chaîne de prix justes de la soirée : multiplicateur de pourboire
jusqu'à ×3, affiché en permanence dans la chip ⚡×N. Mesuré en navigateur, le geste réel,
avec un pigeon en file et un combo plein :

```
  avant le geste : chip ⚡×3
  après le geste : chip ⚡×1     message : « vente perdue (aucun malus) »
```

Les deux dans la **même frame**. Le joueur lit « aucun malus » en regardant son multiplicateur
s'effondrer.

**Trois indices disaient que c'était un lapsus, pas une intention.** Le cas frère — recaler
un client normal — porte le même libellé « (aucun malus) » et ne touche à rien. La branche
d'à côté dans la *même fonction* — flairer un vrai flic, donc la bonne issue — préserve le
combo. Et le commentaire qui gouverne la ligne annonce « juste une vente perdue, R1 ». Le
code contredisait son propre commentaire, son propre message et son cas frère.

Correctif : le refus ne touche plus au combo. Il se casse quand on se **trompe de prix**
(walk), pas quand on **renonce à vendre**.

Le contrôle ajouté à `cause-loupe.mjs` est volontairement général : il ne vérifie pas
« le combo », il vérifie que **rien** de ce que le joueur voit ne se dégrade pendant qu'on
lui promet le contraire (combo, standing, réservoir). Contre-épreuve faite en repassant le
contrôle sur l'`index.html` d'avant correctif : il échoue, `⚡×3 → ⚡×1`.

### Repéré au passage, pas corrigé

`cornerResolveLouche` remet aussi le combo à 1 sur la **vente** au pigeon — celle que le jeu
présente comme une réussite (« client réglo, grosse vente propre »). Là, aucun message ne
ment : c'est silencieux, pas contradictoire. C'est donc une question d'équilibrage, pas un
bug — **[DÉCISION REQUISE]** : une grosse vente hors bande « prix juste » doit-elle casser
la chaîne, ou seulement ne pas l'allonger ?

## 2026-07-28 — La tête du client promettait une marge sur le prix qui casse la relation

Sixième trouvaille de la chasse à la logique, corrigée. `negoFace` — le visage qui réagit
pendant qu'on règle le prix — reprenait les deux plafonds de **refus** de `resolveOffer`
(budget, tolérance) mais pas la **frontière de l'abus** : celle qui, au-dessus de ×1,2 le
menu, fait basculer une vente pourtant *acceptée* en `gouge` (relation −, standing −, et
deux fois d'affilée le client ne revient plus jamais).

La fonction porte pourtant sa propre promesse en commentaire : *« même référence que
resolveOffer : la tête qu'il fait doit prédire son verdict »*. Elle ne la tenait pas, et
rien ne le vérifiait.

Mesuré avant de toucher au code, sur le vrai module — 3 033 offres acceptées balayées
(kind × rel × qFac × grammage × standing) :

```
  88 cas où le visage rassure alors que le verdict est « gouge »
  ex. regulier rel100 · 2 g à 17 € → « Il suit… y a de la marge. »  →  gouge
```

C'est le pire type de tell : il n'est pas silencieux, il **invite** — au geste qui coûte.
Un tell muet laisse le joueur prudent ; celui-là le pousse.

Correctif : la même frontière, calculée de la même façon (`ref × NEGO_MAX × max(1, qFac)`),
avec son propre visage — 😒 *« Il paiera… mais il retiendra. »* Après : **0 sur 3 033**.

**Contre-épreuve, dans les deux sens.** Le test rejoue la chaîne d'avant (identique, moins
les deux lignes ajoutées) et compte 88 cas ; en repassant le contrôle principal sur le
`corner.mjs` d'avant correctif, il **échoue à 88** — le même nombre. Cette égalité vaut
validation de la reconstitution elle-même : si ma copie du code retiré avait dérivé, les
deux comptes auraient divergé.

## 2026-07-28 — Le HUD mentait sur la chaleur, et deux sceptiques m'avaient dit que non

Suite de l'audit. Onze trouvailles confirmées au total ; deux d'entre elles étaient
**contredites entre lentilles** — une lentille les confirmait, un sceptique les réfutait
en raisonnant sur les appelants de `hud()`.

J'ai mesuré au lieu de trancher sur le raisonnement. Sonde en navigateur, corner ouvert,
on ne touche à rien pendant 12 secondes :

```
  t+2.5s   HUD « chaleur 0 » · chip « 🔥 7 »  · état réel 6
  t+5s     HUD « chaleur 0 » · chip « 🔥 13 » · état réel 10
  t+12.5s  HUD « chaleur 0 » · chip « 🔥 31 » · état réel 30
```

**Le sceptique avait tort.** `hud()` n'est appelée que sur événement discret — navigation,
vente, fin de journée. Or au corner la chaleur monte **en continu**, sans événement.
Résultat : deux nombres contradictoires à l'écran en même temps, sur la jauge qui décide
de la descente — et celui du haut est le seul qu'on voit depuis les autres écrans.

Sur les captures de Sylvain les deux coïncidaient, ce qui m'aurait rassuré à tort : elles
étaient prises juste après une navigation ou une vente, donc juste après un `hud()`.

### Et la barre du jour ne progressait pas non plus

La seconde trouvaille contredite portait sur la pastille de jour. Même mesure, sur le
Quartier cette fois, sans rien toucher :

```
  t+4s   barre « 0 % » · avancement réel 2 %
  t+16s  barre « 0 % » · avancement réel 9 %
```

**Une barre de progression qui ne progresse pas.** Deux sceptiques contredits par la
mesure, deux fois sur deux.

### Le correctif : global, pas propre au corner

Mon premier jet patchait la chaleur dans `pdvPatch` — donc uniquement au corner. Or ces
deux pastilles bougent sur **tous** les écrans : la journée avance partout, et la chaleur
monte aussi hors du corner (la dérive du liquide qui dort tourne dans `frame()`).

Une source unique, `hudLive()`, appelée depuis la boucle et bridée à 4 Hz. Deux écritures
de texte et un dégradé : aucun nœud interactif reconstruit — le tap mort est venu de là,
on ne rouvre pas cette porte.

Après : `HUD 31 · chip 31`, et la barre passe de 3 % à 9 % en suivant la journée.

### Et la clôture de journée ne rafraîchissait que le corner

Dernière trouvaille de l'audit : `advanceDay` rebat tout — liquide (paie des chouffes),
stock, marché, standing, hit de planque, prix des upgrades — mais ne re-rendait **que** le
corner. Sur n'importe quel autre écran, le corps gardait les chiffres de la veille jusqu'à
ce qu'on navigue. Le bloc « Réinvest » du Quartier annonçait notamment une abordabilité
périmée.

Gravité réelle : faible, parce que l'achat **est gardé** (`if(S.dirty<cost)` → toast). Ce
n'est pas une perte sèche, c'est un écran qui ment. Corrigé quand même : la bascule est
rare (toutes les 180 s) et discrète, donc re-rendre l'écran courant n'y risque pas le tap
mort — contrairement à un rendu par frame.

### Bilan de la nuit : six correctifs, une seule famille

Cinq des six sortent du même motif — **une couche de mise à jour incrémentale qui ne
couvre pas tout ce que le rendu initial a écrit**. C'est la quatrième fois de la semaine.
La règle qui se dégage, et qui vaut mieux que « relire les patchs » :

> Tout ce que le joueur LIT et qui peut changer **sans qu'il agisse** doit être produit
> par une fonction rafraîchie depuis la boucle — jamais écrit en dur dans un template.

Trois catégories de choses bougent sans geste : le **temps** (la journée), les **jauges
continues** (la chaleur), et les **conséquences différées** (la clôture). Elles étaient
toutes les trois affichées comme des photos.

---



### Ce que ça dit sur la méthode

Le panel de sceptiques est là pour **tuer les fausses pistes**, et il le fait bien — sept
trouvailles écartées à raison. Mais il peut aussi tuer une vraie, parce qu'un sceptique
lit le code et conclut, là où le bug ne se voit qu'à l'exécution. La règle qui se dégage :
**quand une trouvaille porte sur ce que le joueur LIT, on la mesure ; on ne la
raisonne pas.** Un `getElementById` et douze secondes d'observation tranchent ce que trois
lectures de code n'arrivent pas à trancher.

C'est la même leçon que le `RELACHE_MIN` de ce matin, dans l'autre sens : là j'avais
conclu « instable » sans mesurer, ici j'ai failli conclure « faux positif » sans mesurer.

### Vérification

`cause-loupe` passe à 7/7. Contre-épreuve : sans le correctif, `HUD 0 · chip 12`.
Le contrôle porte un garde `aMonte` — si la chaleur ne monte pas (sacoche vide → corner
fermé → activité nulle), il échoue bruyamment au lieu de passer à vide. Il a d'ailleurs
attrapé exactement ça à son premier jet.

---

## 2026-07-28 — Le tiroir « Gérer » décidait sur des chiffres périmés

Audit systématique de la classe de bug qui a mordu trois fois cette semaine (un
affichage qui ne suit pas l'état). **Quatre trouvailles, toutes classées « trompe une
décision », toutes dans le tiroir du corner, et toutes la même racine.**

### La racine unique

`openDr` ouvre le tiroir en **pur CSS** (`display:block` + `transform`). Le corps a été
construit une fois, dans `renderCorner`. Tout ce que `pdvPatch` ne vise pas explicitement
reste donc figé à la dernière construction complète de l'écran.

### Les quatre mensonges

1. **Les compteurs de la sacoche.** Tu charges 20×2 g + 6×5 g, tu fermes, tu sers quatre
   clients, tu rouvres : les lignes disent toujours 20 et 6, pendant que le total
   « Exposé » affiché **trois lignes plus bas** dit 17 barrettes. *Deux vérités
   contradictoires dans le même panneau*, au moment précis où on décide quoi recharger.
   Et la ligne « Sert : » listait des quantités que le tampon ne composait plus — celle-là
   même qu'on avait ajoutée pour supprimer la devinette.
2. **La tête du client.** Tu montes ton prix dans le tiroir, tu refermes : la carte
   affiche toujours « prix menu » et 😊. Tu tapes « ✅ OK », et `resolveOffer` évalue avec
   le NOUVEAU tarif → contre-offre ou départ. La grimace promise avant le bouton avait
   menti.
3. **L'argumentaire des chouffes.** « ouverture 49 s → 119 s avec un de plus » est daté de
   l'ouverture du tiroir, alors que la chip du haut affiche déjà « 🔥 88 · 4 s ». C'est le
   seul chiffre qui justifie de lâcher 60/soir.
4. **Le conseil de prix.** « au prix du marché » reste affiché pendant que le marché
   monte avec la réputation. Tu te retrouves sous le marché sans le savoir — donc plus de
   clients, donc plus de chaleur — sans pouvoir relier l'un à l'autre.

### Le correctif : un seul, à la racine

- **À l'ouverture** du tiroir, on repart de l'état réel. C'est un événement **discret** —
  le doigt n'est pas en train d'appuyer sur un bouton du tiroir — donc reconstruire ici
  ne peut pas rouvrir le tap mort.
- **Pendant** qu'il est ouvert, les deux textes qui bougent tout seuls (chouffes, conseil
  de prix) sont patchés en `textContent` par `pdvPatch`. Jamais d'`innerHTML` sur un
  conteneur de boutons.
- **Changer son prix** rappelle `renderCornerActive` : la promesse faite au joueur doit
  suivre le tarif qu'il vient de fixer.
- `prixHint` était une **fermeture** dans `renderCorner`, capturant le marché du moment —
  donc structurellement impossible à rafraîchir. Extrait en `prixHintTx`, une seule
  source.

### Le piège de test, une troisième fois

Premier jet du contrôle : j'écrivais le tampon dans le `localStorage` puis je
rechargeais. `evaluateOnNewDocument` **rejoue à chaque navigation** et écrasait mon
écriture — le test passait en affichant `avant 20 · vrai 20`, c'est-à-dire **en ne
prouvant rien**. Réécrit pour **vendre pour de vrai** (cliquer le bouton du client), avec
un garde `aBouge` qui fait échouer bruyamment si aucune vente n'a eu lieu.

C'est la troisième fois cette nuit que ce piège me prend. Il est désormais commenté à
l'endroit exact où il mord, dans les deux fichiers de test concernés.

### Vérification

13/13 sur `bulles-loupe`. Contre-épreuve : sans le rafraîchissement à l'ouverture, le
tiroir annonce **20** quand l'état réel est **10**.

---

## 2026-07-28 — Un libellé de test qui mentait (le grossiste et ses bornes fantômes)

En vérifiant un écart que j'avais chiffré il y a des jours sans jamais le contrôler
(« le grossiste paie 432 en DM alors que sa poche au corner est de 260 »), j'ai trouvé
autre chose : **l'écart n'existe pas, mais trois textes affirment qu'il devrait**.

Un commentaire de `corner.mjs` déclare : *« `TOL`/`BUDGET`/`OFFER.grossiste` restent
définis : ils bornent le prix du DM. »* C'est faux. `snap.mjs` n'importe de `corner.mjs`
que `menuAt`, `personaById`, `rueCalibre` et `RUE_MIN` — jamais `BUDGET`, jamais `TOL`.
Le prix du gros sort du barème volume commun, ce qui est **le bon comportement** (une
seule échelle de prix dans tout le jeu, c'était un correctif délibéré). Sa poche de 260
est un vestige de l'époque où il faisait la queue au corner.

Le plus gênant : **le libellé d'un invariant répétait la même affirmation** — « Les
bornes du kind grossiste restent définies (elles bornent le DM) ». Un libellé de test est
l'endroit le plus crédible du dépôt : il passe au vert à chaque exécution, donc il se lit
comme une vérité vérifiée. Il ne vérifiait pourtant qu'une chose, que les constantes sont
`!= null`. La prochaine session aurait raisonné à partir de là.

Corrigé aux trois endroits, en disant ce qui est vrai : ces constantes ne bornent rien
aujourd'hui, on les garde pour que la persona reste bien formée et parce qu'un grossiste
qui repasserait un jour par la file du corner en aurait besoin.

C'est la même leçon que R11, appliquée au code plutôt qu'au vocabulaire : **une
affirmation qui survit finit par être crue**. Un test qui décrit mal ce qu'il vérifie est
pire qu'un test absent.

### Fausse piste, notée pour ne pas la refaire

J'ai aussi soupçonné un trou de lisibilité côté BeuherShit : le lancement refuse de
partir si un coursier serait saisi (« CHAUD — allège la charge »), et je pensais que rien
n'indiquait **lequel**. Vérification faite, le bandeau « Flotte » affiche déjà une puce de
risque par coursier, avec la charge et le cap. Pas de trou. Vérifier avant d'affirmer a
économisé un correctif inutile.

Reste, pour mémoire, que le `busted` post-mortem (`SAISI`, `Constater`, 🚨) est du contenu
**inatteignable** : `runBusted` sert à refuser le départ, puis les tournées sont créées
avec `busted:false` en dur. La plomberie est prête si on veut un jour qu'un coursier se
fasse prendre — ce n'est pas un bug, c'est une porte fermée.

---

## 2026-07-28 — La liste « servable » contenait de l'inservable

Sixième bug de la chasse. `cornerQuantites` calcule les quantités que le tampon compose
vraiment (`snap.composables`), puis **réinjecte la demande du client** même quand elle
n'en fait pas partie :

```js
const liste = snap.composables(P.tampon||{}, cap);
if(!liste.includes(cl.g) && cl.g>0) liste.push(cl.g);   // ← la ligne fautive
```

Cette liste est le **rail du stepper** de négociation. Y glisser une quantité inservable
ouvre la négo sur un **cul-de-sac** : un seul bouton, qui ne peut pas aboutir.

### Le pire : ça défaisait l'intention écrite juste en dessous

Trois lignes plus bas, le code promet :

> « on ouvre sur le composable le plus proche de sa demande : quand le tampon ne fait que
> du 8 g et qu'il en veut 5, la carte s'ouvre **déjà sur 8 g** »

Sauf que le `reduce` du « plus proche de `cl.g` » tombe **mécaniquement sur `cl.g`**
puisqu'on vient de l'ajouter. La carte n'ouvrait donc **jamais** sur le 8 g qu'on avait
réellement. Un commentaire qui décrit une intention que la ligne d'à côté annule.

C'est le troisième cas cette nuit où **le code dit une chose et fait l'autre** — après le
libellé de test sur les bornes du grossiste, et le commentaire sur la sur-livraison que
`cancel` rouvrait.

### Le correctif

On ne réinjecte plus. Dernier recours seulement : si **rien** n'est composable, on garde
sa demande comme ancre pour que le stepper ait un index — la carte dit déjà « aucune
barrette ne compose N g », et la vente part en rupture **annoncée**.

Mesuré avec le vrai `composables` : tampon `{8×3}`, demande 5 g → propositions `[8, 16]`,
et la négo ouvre bien sur **8**. Contre-épreuve : avec la réinjection, la liste devient
`[5, 8, 16]` et la négo ouvre sur **5**, incomposable.

---

## 2026-07-28 — Le client refusait le prix qu'il venait lui-même d'annoncer

Cinquième bug de la chasse. Le client contre avec un « dernier prix », calculé contre le
menu **du moment** — sa tolérance en dépend :

```js
const t2 = Math.max(1, Math.min(Math.floor(g*tol*0.97), Math.floor(bud)));
```

Mais `accept2` rappelle `resolveOffer` avec le menu **courant**. Si le joueur baisse son
tarif entre la contre-offre et l'acceptation, `fair` baisse, donc `tol` baisse, donc le
montant que le client venait d'annoncer dépasse sa propre tolérance : **`walk`**. Un
départ fâché en tapant « ✅ Vendu », sur un prix que le client a lui-même fixé.

Mesuré avec le vrai `resolveOffer` : **20 cas sur 20** finissent en départ.

Le correctif gèle le menu au moment de la contre-offre et l'honore. Le commentaire de
`resolveOffer` disait déjà que ce prix « doit TOUJOURS passer son propre test (R4) » — le
cas de l'**arrondi** avait été fermé, celui du **changement de menu** était resté ouvert.

Le contrôle appelle le module réel et balaie les couples (menu avant, menu après) ; la
contre-épreuve prouve les 20/20.

---

## 2026-07-28 — Le menu annonçait un tarif que le corner ne facture jamais

Le tiroir affichait le menu par format en `g × prix` brut. Or **toute** vente passe par
`menuAt`, c'est-à-dire par le rabais au volume que Sylvain avait demandé (« le prix au
gramme d'un 8 g doit être plus attractif que celui d'un 2 g »).

Mesuré à 10/g :

| format | affiché | encaissé | écart |
| --- | --- | --- | --- |
| 2 g | 20 | 20 | 0 % |
| 5 g | 50 | 46 | 8 % |
| 8 g | 80 | 68 | **15 %** |
| 12 g | 120 | 96 | 20 % |
| 20 g | 200 | 150 | **25 %** |

Le rabais est **voulu** — ce n'est pas lui le bug. Le bug, c'est que la ligne sur laquelle
le joueur **règle son tarif** annonce un nombre que le jeu ne pratique nulle part. Il
calibrait son prix sur une fiction, jusqu'à un quart au-dessus (R4).

Une seule source, `menuFmtTx`, comme pour `prixHintTx` — les deux sites d'affichage la
partagent. Le contrôle vérifie que les lignes ne sont pas toutes au tarif brut ; la
contre-épreuve, elle, en trouve 3 sur 3.

---

## 2026-07-28 — 85 % des ventes ne comptaient pas, et le corner mourait de ça

Deux trouvailles de la chasse de nuit, rapportées séparément par deux lentilles
différentes. **C'est le même bug**, et une seule ligne ferme les deux.

### Le défaut

```js
function applyDeltas(cl, v){
  const c=S.clients[cl.cid]; if(!c) return;   // ← tout est derrière ce garde
  …
  if(v.reput) S.reput = …
  if(v.res)   P.res   = …
}
```

Le garde protège la **fiche persona**. Mais `reput` et `res` sont **globaux** : ils n'ont
besoin d'aucune fiche. Or un client anonyme n'a pas de `cid`, et `ANON_SHARE = 0.85` —
**85 % du trafic**.

Donc 85 % des ventes ne créditaient **ni standing ni réservoir**, pendant que le verdict
affichait 😍 et que le toast annonçait la récompense. Le joueur ne pouvait pas relier son
résultat à son geste (R4), pour la écrasante majorité de ses gestes.

### Pourquoi le corner mourait

`res` monte de `RES_DEAL` sur une bonne vente, descend de `RES_WALK` sur un départ. Mais
les **ruptures** le font baisser depuis **quatre autres endroits**, qui ne passent pas par
`applyDeltas` — et **rien ne le recharge à la clôture**.

La seule voie de recharge, les bonnes ventes, était donc coupée pour 85 % d'entre elles.
Résultat : un réservoir **à sens unique**, qui ne peut que fondre. À 0, le corner est mort
définitivement, sans issue — R1 dans sa forme la plus dure, un blocage de progression.

La seconde lentille avait rapporté ça comme un bug distinct (« `P.res` est un cliquet »).
C'était la **conséquence** du premier, pas une cause séparée.

### Le correctif

Sortir les deux effets globaux **avant** le garde. Le garde reste, pour ce qui est
réellement per-persona : la relation et le compteur d'abus.

### Vérification

Un invariant rejoue une soirée de 40 anonymes bien servis : standing 20 → 60, réservoir
30 → 100. La contre-épreuve rejoue l'ancienne version sur la même soirée : **standing 20,
réservoir 30, inchangés** — quarante ventes sans la moindre conséquence.

---

## 2026-07-28 — « Annuler » offrait des grammes en silence

La chasse de nuit sur la logique a rendu. Sa première trouvaille est une violation de R1
franche, et **trois sceptiques indépendants l'ont reproduite en exécutant les vrais
modules — 0 sur 3 la réfutent**.

### Le défaut

`cancel` remettait `cl.mode="offer"` et **laissait `cl.propG` posé** :

```js
if(a==="cancel"){ cl.mode="offer"; return renderCornerActive(P); }
```

La carte « offre » réaffiche alors `cl.g` et `cl.offer` — l'offre d'origine — pendant que
`cornerResolve` exécute sur `propG(cl)`, resté à la valeur du brouillon. **Le montant vient
de la carte, les grammes viennent d'un état invisible.**

Séquence : un client demande 5 g → « ↔️ Autre quantité » → un tap sur `+` (le brouillon
passe à 6) → on se ravise, « Annuler » → la carte réaffiche « [5 g → 48] » → « ✅ OK 48 ».
Résultat mesuré : **6 g sortent pour le prix de 5**.

Le bouton le plus neutre de l'écran produisait une perte sèche non annoncée.

### L'ironie

Le commentaire situé trois lignes plus haut déclare : *« l'ancien code sur-livrait en
silence (24 g pour 5) »*. Le garde `cornerComposable` protège bien le chemin direct — et
`cancel` rouvrait exactement la même sur-livraison par la porte de derrière.

### Deux fois où j'ai failli écrire un test qui ne prouve rien

**1. Comparer au ledger.** Premier jet : « les grammes débités == ceux du ledger ». Les
deux sortent du **même chemin de code** : si le jeu débitait 6 et écrivait 6 au ledger, le
contrôle passait au vert pendant que la carte affichait 5. Il faut comparer à ce que la
**carte** annonce — c'est la promesse faite au joueur, et c'est la seule référence externe.

**2. Comparer à l'égalité.** Deuxième jet : « débité == annoncé ». Il a échoué… sur un
comportement **légitime** : quand le tampon ne compose pas la quantité demandée, la vente
est partielle et facturée au prorata (4 g pour 38 au lieu de 5 g pour 48). La carte le dit
(« ton tampon ne compose que 4 g »), et le joueur n'y perd rien.

L'invariante juste est asymétrique : **on ne débite jamais PLUS que ce que la carte
annonce.** Moins, c'est une rupture partielle annoncée ; plus, c'est un cadeau silencieux.

J'ai bien failli « corriger » un comportement sain parce que mon assertion était trop
raide. Mesurer l'état réel avant de conclure m'a évité ça — le tampon n'était même pas
celui que je croyais avoir semé.

### Et une erreur de page causée par mon propre test

Le seed du contrôle supposait `shelter.corners` présent au moment où il s'exécute, avant
le chargement de la page. Il jetait `Cannot read properties of undefined (reading 'pdv')`.
Attrapé par le contrôle « aucune erreur page », qui existe précisément pour ça.

### Vérification

14/14 sur `bulles-loupe`. Contre-épreuve : sans le correctif, la carte annonce 5 g et le
jeu en débite **6** pour le même prix.

---

## 2026-07-28 — Les corners deviennent pluriels (fondation)

Programme donné par Sylvain avant d'aller dormir : un **deuxième corner**, l'embauche
d'un **charbonneur** puis d'un second, la **sacoche comme espace de stratégie**
(grammage, combinaisons, négociation), la **weed** plus tard, l'app **Appro** à verrouiller
derrière un temps de jeu (avant : on s'approvisionne chez **Karim**), et une **refonte du
Karnet**, aujourd'hui simple ledger.

J'ai commencé par la clé de voûte : **`S.shelter.pdv` (singulier) → `S.shelter.corners`
(carte)**. Sans ça, rien du reste n'est possible — c'est ce que je lui avais déjà dit à
propos de sa rotation : avec un point de vente unique, une sacoche qui tourne n'est pas
une rotation, c'est une navette.

### Un refactor qui ne change rien, et c'est le but

21 sites d'appel, tous ramenés à un accesseur `activeCorner()` null-safe — il absorbe au
passage les trois formes gardées qui traînaient (`S.shelter.pdv`,
`S.shelter&&S.shelter.pdv`, `S.shelter.pdv||{}`). Toute la suite reste verte : le joueur
ne voit aucune différence, ce qui est exactement ce qu'on demande à une fondation.

### La migration a failli manger la partie en cours

Premier jet de la condition :

```js
if(S.shelter.pdv && (!S.shelter.corners || !S.shelter.corners.pdv)){ … }
```

`shelterDefaults()` fournit **toujours** un `corners.pdv` neuf, et la fusion
`{...shelterDefaults(), ...S.shelter}` tourne avant. Donc `corners.pdv` existe toujours,
la condition est **toujours fausse**, la migration ne se déclenche **jamais** — et
l'ancien corner (sacoche, bac, ledger, prix, chouffes) part à la poubelle en silence.

Sur la sauvegarde de Sylvain, ça lui remettait son corner à zéro sans un mot.

**Attrapé par les tests, pas par relecture** : 4 contrôles sur 13 sont tombés d'un coup.
La condition porte maintenant sur « un ancien `pdv` existe », point. Et l'invariant qui
protège ça rejoue la fusion telle que le jeu la fait, avec sa contre-épreuve — laquelle
montre que l'ancienne condition rendait un corner NEUF (bac 0, prix 10) là où la partie
avait bac 340, prix 13.

### Une leçon de méthode, encore une

J'ai remplacé les 21 sites par substitution en masse… ce qui a **réécrit le bloc de
migration lui-même**, jusqu'à produire un `delete activeCorner();` absurde. Une
substitution globale ne distingue pas le code du commentaire qui parle du code. Réécrit à
la main.

### Migration plutôt que bump

La convention du dépôt autorise « bump + reset propre **ou** migration explicite ». Une
partie est en cours : on ne la jette pas. `SAVE_VERSION` reste à 30, la migration fait le
travail, et elle est rejouée à chaque exécution des tests puisque les seeds utilisent
encore l'ancienne forme — un bon effet de bord.

### Ce qui reste du programme

Fondation posée. Restent : le second corner comme contenu, le charbonneur, le verrou de
l'Appro avec Karim, et le Karnet. Le Karnet est le seul dont **je ne connais pas la
cible** — « revoir la valeur ajoutée » ne dit pas ce qu'il doit devenir. Je proposerai
plutôt que de construire à l'aveugle.

---

## 2026-07-28 — Le liquide qui dort chauffait le quartier, et personne ne le disait

Trouvé en reprenant un défaut que j'avais signalé il y a des jours sans jamais le
traiter : « la dérive de chaleur sur `S.dirty > 180`, non nommée et non affichée ».

### Ce que ça faisait vraiment

```js
if(S.dirty>DIRTY_HOLD_SOFT){            // 180
  S._dirtyAcc=(S._dirtyAcc||0)+dt;
  if(S._dirtyAcc>=3){ S._dirtyAcc=0; S.heat=clamp(S.heat+(S.dirty>DIRTY_HOLD_HARD?2:1),0,100); }
}
```

+1 de chaleur toutes les **3 secondes réelles** au-dessus de 180 de liquide, +2 au-dessus
de 450. Soit **+20 par minute**, et **+40 par minute** au palier haut — pour un seuil de
descente à 95. C'est la plus grosse source de chaleur du jeu.

Et **rien** ne le disait : aucune `cause()` au Karnet, aucune marque au HUD, les seuils
180 et 450 n'apparaissaient nulle part à l'écran. La pastille affichait « liquide 567 »
comme un chiffre neutre — c'est-à-dire, sur la capture de Sylvain, un joueur assis au
palier HAUT en train de prendre +40 chaleur/minute sans le moindre indice.

Le Karnet promet pourtant, en toutes lettres sous son titre : *« Chaque ligne a une
cause. L'UI n'invente rien. »* Ici la conséquence la plus lourde du jeu n'avait aucune
ligne du tout.

### Ce que j'ai changé — et ce que je n'ai PAS changé

**Aucun nombre.** Ni les seuils, ni les taux. La mécanique est saine : garder du liquide
est risqué, le contre-jeu est de réinvestir (pain, upgrades), et ça existe déjà. Ce qui
manquait, c'était uniquement la **lisibilité** :

- une `cause()` au **franchissement de palier** — jamais à chaque tick, une ligne toutes
  les 3 secondes noierait le journal et ne dirait plus rien ;
- la cause dit **quoi faire** (« réinvestis — pain, upgrades »), pas seulement ce qui
  arrive ;
- la pastille du HUD porte la marque (`liquide 570 🔥`, contour rouge, pulsation au
  palier haut) et explique le seuil au survol.

### Le même défaut de persistance, encore

Premier jet : la cause était émise mais **pas sauvegardée** — elle vivait en mémoire et
ne survivait pas à un rechargement. Exactement ce que je venais de corriger sur
`arahRentrer` et `arahCaisse`. C'est le test qui l'a attrapé, en lisant le journal
depuis le `localStorage` plutôt que depuis le DOM.

### Et le même piège de test, encore

`evaluateOnNewDocument` **rejoue à chaque navigation** : écrire le save puis recharger le
fait écraser par le seed d'origine. Je l'avais documenté dans `bulles-loupe.mjs` après
m'y être fait prendre — et je viens de m'y refaire prendre. C'est noté dans le nouveau
fichier de test aussi, à l'endroit exact où ça mord.

### Vérification

`tools/cause-loupe.mjs`, 6/6, vérifié dans les deux sens : sur le code d'avant, 3 des 6
contrôles échouent.

---

## 2026-07-27 — La rue racontait un état périmé (« Sacoche vide » avec 25 barrettes dehors)

Sylvain, deux captures : la scène affiche *« Sacoche vide — charge des barrettes (Gérer)
et attends. »* pendant que le tiroir montre **25 barrettes · 50 g · Q43**.

### La cause

Le texte d'attente est écrit **une seule fois**, dans le `stage.innerHTML` de
`renderCorner`. La seule chose qui le retouche ensuite (`cornerLayoutPersos`) ne fait
que basculer son `display` selon qu'il y a un client ou non — **jamais son contenu**.

Donc : on charge la sacoche, `pdvSacPatch` rafraîchit le tiroir et la carte de négo,
mais la phrase de la rue garde ce qu'elle disait au dernier rendu complet. On referme
le tiroir, et la rue continue d'annoncer une sacoche vide avec 50 g dehors.

Et **symétriquement, c'est pire dans l'autre sens** : sacoche vidée (tout vendu, « Tout
rentrer », ou une descente), la rue continue de dire « un client va passer » alors que
le corner est fermé faute de stock. Elle invite à attendre quelque chose qui n'arrivera
jamais.

### Le correctif

Une seule source, `cornerEmptyTx(P)`, appelée au rendu **et** à chaque tick depuis
l'endroit qui touchait déjà `#cEmpty`. Tout ce qui change le tampon — charger, vendre,
évacuer, se faire descendre — s'y reflète sans que l'appelant ait à y penser. Le texte
n'est réécrit que s'il a changé.

### La famille

C'est la **troisième** fois cette semaine qu'un morceau d'affichage vivant ne suit pas
l'état : `pdvPatch` qui écrivait dans sept identifiants inexistants, les deux lignes qui
affichaient le même total avec des textes divergents, et maintenant celle-ci. Le motif
est toujours le même — **une couche de mise à jour incrémentale qui ne couvre pas tout
ce que le rendu initial avait écrit**.

Le garde n'est pas « relire le patch » : c'est que **tout texte d'état soit produit par
une fonction, jamais inline dans un template**. Une phrase écrite en dur dans un
`innerHTML` n'a aucun moyen de se rafraîchir ; une fonction, si.

### Vérification

Un contrôle navigateur rejoue la séquence exacte : vider → lire (« Sacoche vide ») →
charger → relire **sans re-rendre la scène**. Vérifié dans les deux sens : en
neutralisant le rafraîchissement, la suite tombe à 11/12.

---

## 2026-07-27 — Piste : la sacoche qui TOURNE (rotation produit ⇄ cash)

Sylvain, à chaud, avant même d'avoir testé la sacoche : *« le renouvellement de sacoche
est la bonne piste. Mécanique manuelle qui très vite va pouvoir être automatisée. Le
produit est conditionné, puis distribué par sacoche, la sacoche est donnée au corner,
puis un autre récupère le cash du corner dans la sacoche précédente. »*

### Pourquoi c'est la bonne piste : ça bouche le trou que je n'arrivais pas à boucher

Le `[DÉCISION REQUISE]` laissé ouvert avec la sacoche était : **rien ne coûte de
recharger**. Mesuré, exposer 40 barrettes plutôt que 6 achète +8 points de servabilité
et multiplie le risque par 6,6 — donc « expose le minimum, recharge souvent » domine, et
la sacoche devient une corvée à réponse unique au lieu d'un arbitrage (R9).

La rotation met un **prix** sur le rechargement : un **trajet**. Et le prix ne vient pas
d'un facteur d'équilibrage posé à la main, il vient de la **fiction** — une sacoche est
un objet physique, elle est quelque part, elle met du temps à revenir. C'est le bon type
de contrepoids : systémique, lisible, non arbitraire.

### Ce que ça débloque en plus : le cash devient un vrai enjeu

Aujourd'hui `P.bac` s'accumule au corner et se récupère par **un tap gratuit et
instantané** (`Encaisser le bac ▸ liquide`). Le bac est pourtant saisi par la descente
(`pdvDescente`) — donc le laisser traîner est risqué, mais le rentrer ne coûte rien :
il n'y a aucune raison de ne pas taper le bouton en permanence. Zéro décision.

Avec la rotation, récupérer le cash est **aussi** un trajet. Et comme c'est **le même
objet** qui porte le produit à l'aller et le cash au retour, il ne peut pas faire les
deux à la fois. Voilà l'arbitrage : **ravitailler ou encaisser**, jamais les deux.
C'est une contrainte qui produit de la décision sans rien ajouter d'artificiel.

### L'échelle de délégation tombe pile sur R7

- **Manuel** : tu portes la sacoche. Le geste existe, il régale (R3).
- **Délégué** : un porteur. La satisfaction de porter s'épuise vite (R5), donc on la
  délègue (R6).
- **Ce qui ne se délègue JAMAIS** : ce qu'on met dedans. Composer la sacoche reste la
  décision (R8), et c'est déjà ce que la sacoche actuelle porte.

C'est littéralement R7 : *automatise la satisfaction épuisée, jamais la décision
vivante*. Sylvain le formule d'ailleurs tout seul — « mécanique manuelle qui très vite
va pouvoir être automatisée ».

### Le manque structurel : il n'y a qu'UN corner

`S.shelter.pdv` est au singulier. Avec un seul corner, une rotation n'est pas une
rotation, c'est une **navette** — une file d'attente de longueur 1, donc aucun choix.

Le mécanisme ne devient un puzzle qu'avec **plusieurs corners** : N sacoches, M points
de vente, et il faut décider *lequel* on ravitaille et *lequel* on encaisse ce soir.
C'est là que la décision (R8) apparaît. **La rotation implique donc les corners
multiples, ou elle reste mince.** C'est la vraie question à trancher avant d'écrire une
ligne.

### Deux pièges à ne pas se tendre

1. **Un porteur qui se fait prendre doit être DÉTERMINISTE** (R4). Le risque doit être
   une fonction lisible de ce qu'on a chargé et de la chaleur — pas un jet de dés.
   L'anti-exemple fondateur du projet (*The Boss Gangster*) est exactement ça.
2. **La perte doit être choisie, pas subie** (R1). Perdre une sacoche pleine est une
   conséquence systémique acceptable — la descente en fait déjà autant — à condition
   que le joueur ait **vu le risque avant d'envoyer**. Ce qui est interdit, c'est la
   surprise.

### Statut

`[DÉCISION REQUISE]` — direction validée par Sylvain sur le principe, **pas encore
jouée**. Il n'a pas testé la sacoche actuelle. On ne construit rien par-dessus tant que
la fondation n'a pas été touchée du doigt : c'est précisément l'erreur qui a produit
l'écran d'évacuation mort, testé au vert et jamais essayé à la main.

---

## 2026-07-27 — L'écran d'évacuation était mort au doigt (et ne se sauvegardait pas)

Sylvain, capture à l'appui : *« Je ne sais pas trop ce qui s'est passé. Je cliquais sur
récupérer les barrettes mais rien ne se passait. »* Puis, au Karnet, une minute plus
tard : `Descente au corner · −440 exposé`.

Deux bugs distincts, le second masqué par le premier.

### 1. Le bouton mourait sous le doigt

`arahTick` rappelait `arahRender()` à **chaque frame**, et `arahRender` écrivait
`el.innerHTML = …`. Les deux boutons étaient donc **détruits et recréés ~60 fois par
seconde**.

Un événement `click` n'est émis que si le pointeur se **relève** sur le **même nœud
DOM** que celui où il s'est **posé**. Au doigt il s'écoule ~100 ms entre les deux : le
bouton pressé n'existait déjà plus au relâchement. Le geste ne partait **jamais** sur
téléphone. Sylvain tapait dans le vide en regardant la descente tout prendre.

Correctif : la structure est construite **une fois** (`el.dataset.built`), et
`arahPatch()` ne met à jour que ce qui bouge — la barre de préavis, le compte, la
classe `cool`. Jamais d'`innerHTML` sur les boutons. C'est la forme que `le-spot` avait
déjà (`majArah` ne touche que le timer et le pied) : **le portage vers La Loupe l'a
perdue en route**.

### 2. Le sauvetage ne se sauvegardait pas

En écrivant le test, il est passé une fois puis a échoué deux fois de suite. J'ai
d'abord voulu conclure « flaky » — le réflexe exact que je venais de me faire prendre
sur `RELACHE_MIN`. Cette fois j'ai instrumenté avant d'expliquer : au moment du tap,
le bouton était présent, `pointer-events: auto`, l'écran ouvert, la classe propre.
Donc le clic partait bien, et pourtant rien ne bougeait.

`arahRentrer` et `arahCaisse` étaient les **seules** actions mutantes du jeu à ne pas
appeler `save()` — 39 autres endroits le font. L'évacuation vivait en mémoire et
n'atteignait jamais le `localStorage`. Conséquence pour le joueur : un onglet mis en
arrière-plan pendant l'alerte — sur téléphone, précisément le moment où ça arrive —
et le sauvetage était perdu. `arahCaisse` touche au **liquide** et ne le persistait pas
non plus.

Le test lisait le `localStorage` ; il mesurait donc un état que le code n'écrivait pas.
**La seule fois où il est passé, il est passé par chance** — un autre `save()` était
tombé dans la fenêtre.

### Ce que le test d'avant prouvait vraiment

Il vérifiait « l'écran d'évacuation s'ouvre avec ses deux gestes ». Il ne **tapait
pas** dessus. Un écran mort passait donc au vert, et il est passé au vert à chaque
merge depuis que l'ARAH existe.

Le nouveau check tape pour de vrai, avec un appui de **120 ms** — parce qu'un clic
synthétique instantané ne reproduit rien. Vérifié dans les deux sens : avec le
re-rendu par frame rétabli, Puppeteer lui-même refuse le clic (`Node is detached from
document`) ; avec le correctif, 4 runs sur 4 donnent `40 g → 24 g`, exactement les 8
barrettes du lot.

### 3. Le même bug ailleurs : BeuherShit

Un balayage du dépôt lancé après coup a trouvé la **même faute, à une autre cadence**.
`renderBeuher()` réécrit `stage.innerHTML` et rebinde ses boutons, et la boucle de
frame le rappelait **toutes les 350 ms** tant qu'un coursier était dehors. Les deux
boutons concernés ne sont pas décoratifs : **affecter un coursier** à une commande, et
**« Compter le liquide »** — encaisser une tournée rentrée.

À 350 ms contre un appui de ~100 ms, le tap ne meurt pas à tous les coups : il meurt
quand l'appui chevauche une reconstruction, soit **environ une fois sur trois**. Et
c'est pire qu'un échec systématique — un bouton qui marche deux fois sur trois, le
joueur croit qu'il a mal visé.

Mesuré, et c'est joli : en rétablissant l'ancienne cadence, le contrôle *structurel*
(« le nœud est-il remplacé ? ») échoue **3 fois sur 3**, tandis que le *tap* lui-même
n'échoue que **1 fois sur 3** — exactement la proportion attendue. D'où la forme du
test : on garde les deux, le structurel comme garde fiable, le tap comme preuve que la
conséquence est réelle.

Correctif identique à l'ARAH : `beuherPatch()` ne touche qu'au compte à rebours et à sa
barre. Le rendu complet ne survit que pour l'**événement** « une tournée rentre » —
là, une ligne apparaît vraiment, et un événement n'est pas une cadence.

### 4. Et un troisième, dans Le Bigo : toute la navigation

Le balayage a aussi trouvé la même faute dans un **autre proto**. `renderHome()` vidait
`#apps` et recréait **chaque tuile d'application** — avec son `addEventListener` — à
chaque `tick`, soit **une fois par seconde**, sur l'écran par défaut du téléphone.

Ce qui meurt là, ce n'est pas un bouton : c'est **la navigation entière de l'OS**. Les
huit apps, plus les tuiles verrouillées (dont le tap déclenche le toast « Pas encore.
Suis le fil 🐺 » — le joueur n'avait même pas l'explication).

Correctif : l'idiome **`dockSig`**, que `le-spot` avait déjà (`// signature de la FORME
du dock (pas de ses chiffres)`). La grille ne se reconstruit que si sa forme change —
une app qui se déverrouille — et les pastilles sont patchées à part. Trois protos, la
même faute : `le-spot` avait la bonne réponse, `la-loupe` et `le-bigo` l'ont perdue en
la portant.

### Deux contrôles, parce qu'un seul mentirait

En rétablissant l'ancien comportement pour vérifier que le test mord :

| | structurel (« le nœud est-il remplacé ? ») | le tap lui-même |
| --- | --- | --- |
| BeuherShit (350 ms) | échoue 3/3 | échoue **1/3** |
| Le Bigo (1 000 ms) | échoue 3/3 | **passe 3/3** |

Le tap seul est un **détecteur trop faible** : à 1 Hz, un appui de 150 ms ne chevauche
une reconstruction que ~15 % du temps, donc trois essais ne le voient jamais. Le
contrôle structurel est le **garde** ; le tap prouve que la **conséquence** est réelle.
Garder l'un sans l'autre, c'est se raconter une histoire — et j'ai failli publier le
seul tap en croyant qu'il suffisait.

### 5. Le garde-fou anti-cache avait lui-même un angle mort

Trouvé en relisant mes propres affirmations avant de les publier : le corps de la PR
annonçait « modules bumpés à `?v=35` », et je suis allé vérifier. Il y avait un
`?v=19`.

`scene3d.mjs` — la scène 3D de la coupe, donc **le geste central du jeu** — n'est pas
importée statiquement mais **dynamiquement** :

```js
scene3dPromise = Promise.race([ import("./scene3d.mjs?v=19"), … ])
```

Or `cache-loupe.mjs`, écrit exprès contre ce bug après le playtest du 27, ne cherchait
que la forme `from "./x.mjs?v=N"`. Un `import(...)` dynamique n'a pas de `from` : le
garde ne l'a **jamais vu**, et affichait 3/3 depuis le début.

Le coût réel, daté : `?v=19` a été posé le **20 juillet**, et `scene3d.mjs` a été
corrigé le **25** (la désync du gabarit — un bug qu'on avait trouvé et réparé). Pendant
**cinq jours**, tout navigateur au cache chaud a joué l'**ancienne** scène de coupe. Le
correctif existait dans le dépôt et n'atteignait pas le joueur — exactement le
symptôme que ce garde-fou devait rendre impossible.

Corrigé : la règle couvre maintenant les **deux formes** d'import, et le contrôle est
vérifié dans les deux sens (en refigeant la scène à `?v=19`, il tombe à 2/3).

**Un garde qui ne couvre pas toutes les formes du danger ne garde que celles auxquelles
on avait déjà pensé.** Et le seul moyen de s'en apercevoir a été d'aller vérifier une
phrase que j'avais écrite avec assurance.

### La leçon, qui n'est pas sur l'ARAH

**Un test qui n'exécute pas le geste ne teste pas le geste.** Vérifier qu'un bouton
*existe* ne dit rien sur le fait qu'on puisse *appuyer dessus*, et la différence entre
les deux est invisible au clic synthétique. Partout où un écran se rafraîchit en
cadence, le test doit presser, pas cliquer.

D'où `tools/tap-loupe.mjs`, qui ne regarde jamais si un bouton existe : il presse
120 ms et vérifie que **l'état a bougé**. Deux écrans y passent aujourd'hui ; tout
nouvel écran qui se rafraîchit sous une boucle doit y entrer.

---

<!-- lexique-exempt-bloc : cette entrée PORTE sur l'orthographe, elle cite forcément l'ancienne forme -->
## 2026-07-27 — ARAH, pas ARA : le lexique devient vérifiable

Sylvain, deux fois dans la même journée : d'abord l'écran d'évacuation qui titrait
`ARA ! ARA !` quand le cri dans la rue disait déjà `ARAH !!`, puis — après correction —
*« l'expression exacte est ARAH pas Ara »*.

La deuxième correction dit quelque chose que la première ne disait pas : le problème
n'était pas **un** titre, c'était que le mot vivait sous deux formes dans le dépôt. Le
texte affiché avait été corrigé ; tout le reste — constantes, identifiants, classes CSS,
commentaires, docs, libellés de tests — continuait de dire `ARA`. Tant que la forme
courte reste disponible quelque part, elle remonte : on relit, on « normalise » sans y
penser, et le mot juste redevient le mot plausible.

**ARAH est un cri, pas un sigle.** Il n'y a donc pas de forme abrégée légitime, et le
`H` final n'est pas décoratif : c'est le son. C'est déjà écrit dans le code depuis le
26 (« le cri du guetteur, pas un sigle ») — ce qui n'a pas empêché la dérive, parce
qu'un commentaire n'est pas un garde-fou.

### Ce qui a changé

- **La Loupe** (proto actif) : renommage complet, 90 occurrences — `ARA_LOT` →
  `ARAH_LOT`, `araState` → `arahState`, `.ara-*` → `.arah-*`, `#ara` → `#arah`, et la
  cause de journal `cause("ARA", …)` que le joueur lisait vraiment.
- **le-spot** : d'abord le seul texte affiché (`ARAH !! ARAH !!`), en laissant les
  identifiants tranquilles — c'est un proto gelé et ses tests sélectionnent `#ara`.
  Puis j'ai fait demi-tour et renommé aussi ses identifiants (`#arah`, `arahState`,
  `arahTitle`…, et les trois sélecteurs côté tests). *Raison du demi-tour* : épargner un
  dossier, c'est précisément recréer la condition qui a produit la dérive — une forme
  courte encore disponible quelque part. Un garde-fou avec une exception géographique ne
  garde rien.
  Piège au passage : `arahead` contient déjà « arah », donc une substitution naïve
  `ara` → `arah` donnait `arahhead`. Liste de jetons explicite, du plus long au plus
  court, plutôt qu'un `sed` global.
- **Docs et hub** : `README.md`, `la-loupe/SHELTER.md`, l'`index.html` racine.

### Le garde-fou : `tools/lexique.mjs`

Se faire corriger deux fois sur le même mot, c'est le signe qu'il faut une machine, pas
une bonne résolution. Une règle = un terme fautif, son remplacement, et **sa raison
d'être** — la même forme que les règles R1..R10, parce que c'est la même nature de
décision : un arbitrage de Sylvain qu'on ne redevine pas.

Avec une échappatoire explicite, `lexique-exempt`, parce que trois lignes du journal
**doivent** porter la forme fautive : celle qui cite le titre buggé (c'est le sujet de
la note), celle qui explique que le mot n'est pas un sigle, et la citation mot pour mot
du message de Sylvain. Réécrire ces trois-là aurait effacé ce que les notes racontent.
Une exemption marquée reste visible en relecture ; un contournement silencieux, non.

Vérifié dans les deux sens : la règle passe sur les 74 fichiers du dépôt, et **échoue**
dès qu'on remet `ARA !!` dans le cri. La portée du bloc a été vérifiée pareillement — un
`ARA` glissé APRÈS le `---` de clôture est bien rattrapé. Un garde-fou qu'on n'a pas vu
échouer ne garde rien.

Deux fausses pistes en route, notées parce qu'elles reviendront.

La première : le garde-fou a semblé « rater » des lignes, alors que c'était mon
`tail -3` qui tronquait sa sortie. Le test n'avait rien.

La seconde mérite d'être racontée en entier, parce que je m'y suis pris à trois fois.
Le smoke-test de le-spot tombe à 33/34 sur `RELACHE_MIN` — un contrôle de *timing*
(fenêtre de 30 ms « trop courte pour couper »). J'ai d'abord conclu « ça dérape quand la
machine est chargée, 34/34 au calme avant comme après » : deux runs qui passaient, deux
qui échouaient, et une explication qui collait. **C'était une conclusion tirée d'une
comparaison non contrôlée** — les runs « avant » avaient tourné pendant une période
calme, les runs « après » pendant que je travaillais. Trois runs isolés du nouveau code
ont ensuite échoué 3/3, ce qui a tué l'explication par la charge.

Deux vérifications ont tranché :

1. **Une preuve statique.** En re-normalisant le fichier renommé vers les anciens noms,
   on obtient un fichier **identique octet pour octet** à celui d'avant. Un renommage pur
   ne peut pas changer un comportement — quel que soit le compte des runs.
2. **Un A/B entrelacé**, les deux versions dans la même commande, même état machine :

   | | run 1 | run 2 | run 3 |
   |---|---|---|---|
   | avant | 33/34 | 33/34 | 33/34 |
   | après | 33/34 | 33/34 | **34/34** |

   La version **d'avant échoue 3/3**. La mienne passe même une fois.

Donc : `RELACHE_MIN` est un test **instable préexistant**, il échoue la plupart du temps
sur les deux versions, et il n'a rien à voir avec le renommage. La leçon n'est pas sur
ARAH, elle est sur la méthode : comparer deux mesures prises à des moments différents et
appeler ça une explication. Le réflexe juste, c'est l'entrelacement — et quand une preuve
statique existe, elle vaut mieux que n'importe quel comptage de runs.

`[DÉCISION REQUISE]` — un test qui échoue ~80 % du temps n'est plus un signal, c'est du
bruit qui égare la session suivante (il m'a égaré). Soit on stabilise `RELACHE_MIN` (la
fenêtre de 30 ms est le point fragile), soit on le marque explicitement instable. Je ne
tranche pas : c'est la mécanique de coupe de le-spot, un proto gelé.

---

## 2026-07-27 — La Loupe : la sacoche (tu composes ce que tu exposes)

Sylvain, en jouant : *« lorsque on ajoute des barrettes à un corner, on ajoute
automatiquement les dernières barrettes produites. Ce qui m'a donné situations où je
ne pouvais pas vendre 5 g alors que j'avais coupé du 2 et du 5 juste avant. »*

### Ce que faisait vraiment le code

Pas « les dernières produites » — **les plus petites d'abord**, et chaque taille
vidée entièrement avant de passer à la suivante :

```js
for(const f of sizes.sort((a,b)=>a-b)){ while(S.sachets[f]>0 && moved<target){ … } }
```

Avec `{2:30, 5:12}` en planque, `+25` donnait **25 barrettes de 2 g et zéro de 5 g**.
Et 5 g ne se compose pas avec des 2 g (2+2=4, 2+2+2=6) : la demande de 5 g mourait
sur place, avec le produit en planque à deux mètres.

### Mesuré à dénominateur fixe (tampon 25 barrettes, 200 clients)

| rue | petites d'abord | mélangé |
| --- | --- | --- |
| 2 g   | 25 clients / 50 g | 25 clients / 68 g |
| 7,5 g | **10 clients / 50 g** | **22 clients / 113 g** |

Le défaut **empire le long de l'axe de progression** : plus la rue monte en calibre
(ce que le joueur pilote lui-même depuis qu'il annonce son format sur SnapShit), plus
le ravitaillement automatique sabote sa propre demande.

### Pourquoi une sacoche, et pas un meilleur tri automatique

J'ai commencé par chercher la bonne heuristique. Il n'y en a pas : **le bon mélange
dépend de la demande**, et la demande est désormais un levier du joueur. Un tri
« intelligent » aurait été une décision vivante prise à sa place — exactement ce que
R7 interdit. La sacoche n'est donc pas un confort d'UI, c'est la **seule réponse
juste** (R8) : un `−`/`+` par format, le stock en planque affiché en face, et le total
exposé avec sa qualité.

Les deux gestes de masse restent, mais bornés : `⤒ Charger au max` remplit **au
prorata de la demande** (un défaut par défaut sain, corrigeable format par format) et
`⤓ Tout rentrer` vide la sacoche d'un geste — la réponse directe à *« pouvoir les
enlever si le heat monte trop »*. Ce que tu exposes est exactement ce que la police
peut saisir : la sacoche devient le curseur de risque du corner.

### Un seul mouvement de barrettes, dans un module

`snap.deplacerBarrettes(src, dst, format, n)` sert les **deux sens**. Même raison que
pour `evacuerLot` : dupliquer la boucle, c'est dupliquer le risque de perdre un
gramme, et un test qui recopie la boucle ne teste que lui-même. La conservation est
garantie par construction (on décrémente la source et on incrémente la destination du
même compteur, jamais de conversion en grammes au milieu).

### Vérification

Trois invariants ajoutés (35/35), dont une **contre-épreuve** qui rejoue l'ancien
ravitaillement et prouve qu'il montait 25×2 g depuis une planque contenant 12
barrettes de 5 g. Sept checks navigateur (7/7) : `Charger au max` sort bien
`53×2g · 5×5g · 2×8g`, `Tout rentrer` préserve 254 g exactement.

### La revue a trouvé cinq défauts de plus, tous vérifiés en exécution

Une reconnaissance en parallèle (deux lecteurs + une synthèse de game design) a été
lancée sur la sacoche pendant l'implémentation. Elle a rapporté des mesures, pas des
impressions — j'ai re-vérifié chaque point avant d'y toucher, et les cinq tenaient.

1. **Le client refusait le prix qu'il venait d'annoncer.** `cornerReniffle` recalculait
   `qFac` pour **toute** la file, y compris un client en « dernier prix ». Son prix avait
   été calculé avec l'ancien `qFac` ; le changer sous ses pieds faisait que
   `resolveOffer` réévaluait sa propre offre et renvoyait `walk`. Composer sa sacoche
   pendant qu'un client parle lui faisait donc **refuser son propre prix** — une perte
   sèche déclenchée par une action neutre, R1 exactement à l'envers. Le prédicat
   existait déjà pour la patience (`waiting`) ; c'est la même frontière.
2. **L'aller-retour fabriquait de la qualité.** Rentrer en planque ne diluait jamais
   `S.sachetQ` : 214 g à q62 + 40 g à q40 rendaient **q62** au lieu de q58,5. Les grammes
   étaient conservés, la qualité non — donc un aller-retour suffisait à laver un mauvais
   produit, en boucle. `deplacerBarrettes` est symétrique ; ce qu'on y trimballe doit
   l'être aussi.
3. **`Charger au max` téléportait la qualité.** Il écrivait `P.tamponQ = S.sachetQ` sans
   condition alors qu'il ne remplit que la place libre : charger 10 g de q90 sur 40 g de
   q30 faisait passer **tout** le lot à q90, +29 % de tolérance client en un tap.
4. **La DP de composition était un glouton déguisé.** Elle ne mémorisait **qu'une**
   représentation par montant (un `break` après la première taille faisable). Depuis
   `{3,4,5,7,7,8}`, elle déclarait **21 g impossible** alors que 3+4+7+7 = 21. Un faux
   négatif coûte une vente que le stock pouvait servir. Invisible tant qu'on coupait en
   séries homogènes — **une sacoche composée à la main est hétérogène par construction**.
   Remplacée par un knapsack borné exact, partagé par `qtyToSachets` et `composables`
   (elles portaient le même défaut, deux fois).
5. **L'évacuation ARAH sauvait le nombre, pas la valeur.** `evacuerLot` prenait les
   petites d'abord : avec un lot borné à 8 barrettes/tap, le joueur sauvait 16 g de 2 g
   et **abandonnait ses 8 g** aux stups. Inversé, et réécrite par-dessus
   `deplacerBarrettes` — quatrième occurrence en trois jours du piège « une règle
   recopiée quelque part ».

### Ce que la revue a changé au design (et pas seulement au code)

- **La sacoche dit maintenant ce qu'elle SERT** (`Sert : 2 · 4 · 6 · 8 …`) et **ce que la
  rue demande** (`surtout 2 g · 3 g · 5 g · tu ne sers pas 3 g, 5 g`). L'information
  existait déjà, calculée, mais n'apparaissait que dans la carte de négo — c'est-à-dire
  une fois le client devant soi, trop tard pour composer. C'est le correctif qui répond
  le plus littéralement à la phrase de Sylvain : il découvrait le trou au pire moment.
- **`⤒ Charger au max` devient `⤒ Charger la soirée`**, borné à `SAC_LOT = 25`. Mesuré :
  passer de 25 à 40 barrettes exposées achète ~4 points de servabilité et multiplie par
  1,6 ce que la police peut saisir. Un bouton ne doit pas pousser vers le mauvais côté
  d'un arbitrage qu'il présente comme neutre.
- **`⤓ Tout rentrer` est désactivé pendant un ARAH.** En l'état il cannibalisait le
  guetteur : 60 barrettes en un tap rendait obsolète le préavis de 8 barrettes/tap qu'on
  venait d'écrire. C'est un outil de **planification** (« le heat monte, je réduis »), pas
  un bouton de panique. Le geste à la main reste, lui, disponible.
- Et un **`tout` par format**, parce que 25 taps pour remplir une ligne, c'est de la
  corvée sans décision (R8).

### Deux défauts trouvés à la relecture des captures

<!-- lexique-exempt : cite le titre fautif, c'est le sujet de la note -->
- L'écran d'évacuation titrait `ARA ! ARA !` alors que le cri dans la rue dit
  `ARAH !!` — l'orthographe de Sylvain est la bonne, les deux sont alignés.
- `chouffeGain` affichait des **secondes négatives** quand la chaleur avait déjà
  dépassé le seuil. Borné à 0 : au-delà du seuil la marge est nulle, pas négative.
- Deux lignes affichaient le même total (`Tampon exposé` et `Exposé`), avec des
  textes divergents — une seule ligne désormais, dans la sacoche, où on compose.

### `[DÉCISION REQUISE]` — ce que je ne tranche pas

- **Le prix de l'exposition.** Mesuré : passer de 6 à 40 barrettes exposées achète +8
  points de servabilité et multiplie le risque par 6,6. Sans contre-poids, « expose le
  minimum, recharge souvent » domine, et la sacoche devient une corvée optimale au lieu
  d'un arbitrage (R9). Options : (a) assumer — le prix, ce sont les taps (R3) ; (b)
  brancher l'attractivité de la rue sur les grammes exposés (une devanture vide n'attire
  pas) ; (c) plafonner les ravitos par soirée.
- **`Tout rentrer` : bouton, ou outil qu'on achète ?** Je l'ai désactivé pendant l'ARAH
  pour ne pas tuer le guetteur. L'autre lecture, plus dans l'esprit de R2, serait d'en
  faire un **déblocage de boutique** (« besace à cordon ») : au départ on retire barrette
  par barrette, la friction devient un moteur d'achat.
- **Le plafond exposé est en barrettes, pas en grammes.** `PDV_TAMPON_MAX = 60` autorise
  de 120 g (tout en 2 g) à 1 200 g (tout en 20 g), contre 250 g de capacité de planque.
  La rue peut donc tenir 4,8× la planque. Cap en grammes, cap mixte, ou assumé ?
- **Le trou du 3 g.** 8 à 13 % de la demande porte sur 3 g, et 3 g n'est **jamais**
  composable avec 2/5/8/12. La sacoche l'affiche désormais (« tu ne sers pas 3 g »), ce
  qui donne une raison de couper à 3 g — mais faut-il retirer 3 g du cycle d'`anonQty`,
  ou laisser le joueur découvrir la coupe à 3 g ?
- **`stockG` ignore le tampon** (`shelter.mjs`) : charger la sacoche fait *baisser*
  `stashHit` — le HUD annonce une planque calme pendant que la marchandise est dehors.
  Aujourd'hui `stashHit` n'alimente aucune mécanique, donc c'est un mensonge d'écran et
  pas un exploit. Le jour où il en alimentera une, ce sera un exploit à un tap.
- **Placeholders touchés** : `SAC_LOT` (25) et `PDV_TAMPON_MAX` (60). Aucun n'est réglé
  par la mesure — ils attendent la main.

---

## 2026-07-27 — La Loupe : les modules étaient servis depuis le cache (bug de déploiement)

Sylvain, en jouant : *« je viens d'avoir une descente mais aucun message ni aucune
alerte n'a été déclenchée »*.

Testé les deux chemins en navigateur : ils marchent tous les deux. Sans chouffe, le
toast « 🚨 Descente — barrettes + bac saisis » s'affiche. Avec chouffe, l'ARAH s'ouvre
et le cri part. Le bug n'était donc pas dans la mécanique.

### La cause : des versions d'import figées

```js
import * as snap    from "./snap.mjs?v=18";
import * as beuher  from "./beuher.mjs?v=18";
import * as shelter from "./shelter.mjs?v=18";
import * as corner  from "./corner.mjs?v=3";
```

Ces numéros n'ont **pas bougé de toute la session**, pendant que `corner.mjs`,
`snap.mjs` et `shelter.mjs` étaient réécrits de fond en comble (qualFac, menuAt,
rueApres, evacuerLot, canal DM, FRONT_ENABLED…). Le navigateur revalide le document
de navigation (`index.html`) mais **sert les modules depuis son cache** tant que
l'URL ne change pas. Sylvain jouait donc un `index.html` à jour avec des modules
vieux de plusieurs jours — un mélange de deux versions.

Et un second défaut du même ordre : `snap.mjs` importait `"./corner.mjs"` **sans
version**, donc à une URL différente de celle du HTML. Deux URL = **deux instances**
du module chargées en parallèle.

### Le correctif, et surtout le garde-fou

Version unifiée à `?v=32` partout, imports croisés compris. Mais un numéro qu'il faut
penser à bumper à la main se re-figera : `tools/cache-loupe.mjs` le vérifie
mécaniquement, en trois règles —

1. aucun import de `.mjs` sans suffixe de version ;
2. **une seule** version dans tout le dossier (sinon : modules en double) ;
3. le suffixe est au moins aussi récent que chaque module, mesuré sur git.

Vérifié dans les deux sens : **1/3 sur l'état d'avant, 3/3 après**.

### Ce que ça dit sur mes vérifications

Tous mes tests tournent sur les fichiers du dépôt, jamais sur ce que le navigateur
d'un joueur reçoit réellement. C'est un angle mort entier : trois merges de suite ont
été validés « tout vert » alors qu'une partie du code n'atteignait pas le joueur. Le
`node --check` et les invariants ne disent rien du **déploiement**.

## 2026-07-27 — La Loupe : des bulles dans la rue, et « ARAH !! »

Sylvain, image à l'appui (des gamins qui courent dans une ruelle avec une bulle de BD
« Arah !! ») : *« on pourrait voir des bulles apparaître dans la scène corner, avec des
retours haptiques »*.

<!-- lexique-exempt : la note porte sur le mot lui-même -->
Au passage, ça corrige ma lecture : **ARA n'est pas un sigle, c'est le cri**. Le nom du
système vient du hurlement du guetteur.

### La voix existait déjà, elle était au mauvais endroit

Les répliques des clients (`bank.arrive`, `reactLine`) partaient dans un **toast en haut
de l'écran** — à l'opposé de la personne qui parle. Les bulles ne créent rien, elles
remettent le texte là où le joueur regarde.

Première version : bulle à l'arrivée, à la réaction, au départ fâché, plus le cri.
**Retour de playtest immédiat de Sylvain** : *« pas besoin de la bulle pour indiquer
que le client parle, on le voit bien qu'il est là. En revanche le ARAH fonctionne
bien. »*

Il a raison, et c'est une distinction qui vaut d'être notée : la bulle d'arrivée
signalait une **présence** — que la silhouette signale déjà. Elle ajoutait du bruit,
pas de l'information. Le cri, lui, annonce un **événement qu'on ne peut pas voir
venir autrement**. Toutes les bulles clients sont retirées ; seul « ARAH !! » reste,
et `cornerBulle` avec elles (pas de machinerie sans appelant).

Les retours haptiques restent sur les trois moments : eux ne sont pas du bruit visuel,
ils disent dans la main ce qui vient de se passer.

### Haptique par motif, pas par intensité

`HAPTIC = { bulle:8, deal:22, juste:[18,50,18], walk:[30,60,30], cri:[70,50,70,50,120] }`.
Le motif dit **quoi** s'est passé sans regarder l'écran : un tic pour « quelqu'un
parle », un coup franc pour un deal, deux secs pour un départ, une alarme pour l'ARAH.
Tout est enveloppé — `navigator.vibrate` est absent sur iOS Safari, rien n'en dépend.

### Trois défauts trouvés par le test navigateur, pas par relecture

1. **Le cri était muet dans le cas le plus fréquent.** Je l'avais accroché à
   `P.queue[0]` — or la descente tombe souvent quand **la rue est vide**, et le cri
   appartient de toute façon au *chouffe*, pas à un client. Il est désormais au niveau
   de la scène.
2. **L'écran d'évacuation s'ouvrait par-dessus le cri.** Mon `setTimeout` ne retardait
   rien : `arahTick` appelle `arahRender` à chaque frame. Il fallait un vrai sas
   (`arahState.cri`) qui garde la modale fermée **et** gèle le préavis — le temps que le
   chouffe achète commence quand le joueur a compris, pas quand le guetteur ouvre la
   bouche.
3. **Les bulles se chevauchaient, et celle du client de devant répétait la carte de
   négo mot pour mot.** Corrigé par un décalage vertical par rang, et en ne faisant
   parler que ceux qui **attendent** — c'est là que la bulle ajoute quelque chose (la
   rue vit pendant que tu sers).

Aucun de ces trois-là n'était visible en lisant le code. C'est la capture d'écran qui
les a montrés.

### Un piège de test, noté pour la suite

`page.evaluateOnNewDocument` rejoue à **chaque** navigation : écrire la chaleur dans
`localStorage` puis recharger la faisait écraser par le seed d'origine, et l'ARAH ne se
déclenchait jamais. Diagnostiqué en sondant l'état réel (`heat: 0`) au lieu d'ajuster
les temporisations à l'aveugle. Correctif : empiler un second seed, qui s'exécute après
le premier.

`tools/bulles-loupe.mjs` — 6 vérifications en vrai navigateur.

## 2026-07-26 — La Loupe : l'ARAH — le chouffe achète du préavis, pas de l'immunité

Sylvain, après avoir vu les secondes s'afficher : *« le mécanisme du chouffe n'est
pas parfait car le heat retombe vraiment bas. Je pense qu'il s'agit d'une opportunité
<!-- lexique-exempt : citation mot pour mot de Sylvain -->
pour placer le rameur ARA, qui permettrait au joueur de partir à temps. »*

Son diagnostic colle exactement à la mesure : `PDV_CHOUFFE_DAMP = 0,7` divisait la
génération de chaleur, et à 3 chouffes elle passait **sous** le terme de
refroidissement — la jauge redescendait toute seule, la descente ne pouvait plus
arriver. La soupape ne rendait pas la tension gérable, elle la **supprimait**. Et
l'embauche était gratuite par-dessus (`P.chouffes++`, aucun coût, aucun plafond).

### Le modèle repris de `le-spot`

Là-bas, le chouf n'immunise pas : il achète du **préavis** (`PREAVIS_S = [0, 7, 13]`),
et pendant ces secondes le monde s'arrête pendant qu'on planque le tampon et la
caisse. Ce qui reste dehors est saisi.

Le calage sur La Loupe est parfait : `pdvDescente` saisit exactement `P.bac` et
`P.tampon` — les deux seules choses qu'on peut sauver, et « la planque est sauve »
était déjà écrit dans son toast.

- `PDV_CHOUFFE_DAMP` 0,7 → **0,18** : le chouffe ralentit un peu, il n'immunise plus.
- `PDV_PREAVIS_S = [0, 6, 12, 18]` : sans chouffe, la descente tombe sec.
- Au seuil, l'ARAH s'ouvre en plein écran. Deux gestes : **rentrer les barrettes**
  (tampon → planque, 8 par tap, les petites d'abord) et **la caisse** (bac → liquide).
  Un cooldown de 520 ms entre deux taps : on ne sauve jamais tout, et ça se voit.
- Le monde s'arrête pendant l'ARAH — le préavis est un temps de **décision**, pas une
  course contre les autres systèmes.

R6 en plein : ça ne supprime pas la décision, ça donne le temps de la prendre. R8 :
partir maintenant ou servir un client de plus reste l'arbitrage, et il est enfin
lisible grâce aux secondes affichées du même jour.

### Le test recopiait la fonction qu'il testait — troisième fois

Ma première version de l'invariant de conservation ARAH **recopiait** la boucle de
`arahRentrer` au lieu de l'appeler. Un test qui duplique ce qu'il teste passe quoi
qu'il arrive — et l'évacuation est le pire endroit pour se le permettre : c'est
très exactement le geste où j'avais introduit un bug de conservation dans `le-spot`
(retirer des grammes puis n'en réinjecter qu'une partie, soit une évacuation qui
CRÉE la perte qu'elle prétend éviter).

La boucle vit maintenant dans `snap.evacuerLot()` : le jeu l'appelle, l'invariant
l'importe. Même correctif que `rueApres` la veille. C'est la troisième occurrence du
même piège en deux jours — le motif est clair : **dès qu'une règle est recopiée
quelque part, elle doit être extraite dans un module.**

### `[DÉCISION REQUISE]`

- **`PDV_PREAVIS_S` et `PDV_CHOUFFE_DAMP`** sont des placeholders. 6 s au premier
  chouffe est un pari : assez pour deux taps (16 barrettes), pas assez pour tout.
- **L'embauche reste gratuite.** Le préavis change la nature de la soupape mais pas
  son prix : `P.chouffes++` sans coût d'entrée ni plafond. À trancher.
- **La descente reste-t-elle à `PDV_AFTER = 45` ?** Si on évacue bien, la sanction
  devient légère ; c'est cohérent avec R1, mais ça mérite un regard en jeu.

## 2026-07-26 — La Loupe : le grossiste passe en DM, et la pression devient visible

Deux demandes de Sylvain, dans la même session de test.

### 1. « Le temps d'ouverture peut être parfois trop rapide. Mais ça force à agir. »

Il nomme la tension sans trancher. En mesurant, le problème n'est **pas la vitesse** :

| chouffes | secondes ouvertes | clients servis |
| --- | --- | --- |
| 0 | 47 s | ~5 |
| 1 | 149 s | ~15 |
| 2 | 1 500 s | ~150 |
| 3 | ∞ | illimité |

Deux découvertes derrière ce ressenti :

**a) La pression était littéralement invisible.** `pdvPatch` patche huit
identifiants — `pHeat`, `pHeatB`, `pRes`, `pResT`, `pDem`, `pQ`, `pCombo`,
`cHeatChip`. Vérifié : **sept sur huit n'existent plus dans le markup**. Toute la
couche de mise à jour live du corner écrivait dans le vide. Ce n'était pas « jamais
conçu », c'était branché puis débranché lors d'une réécriture. Le joueur ne voyait
qu'un entier brut : `🔥 62`.

**b) La courbe des chouffes est une falaise, pas une progression.** À 3 chouffes,
la génération de chaleur passe sous le terme de refroidissement et le corner ne
chauffe plus **du tout**. Et `P.chouffes++` n'a **aucun coût d'entrée ni plafond** :
trois taps le premier jour suppriment la contrainte pour toujours (les 60 €/soir ne
sont prélevés qu'à la clôture). R9 en défaut — l'outil qui efface la friction est
gratuit.

**Fait** : la chip dit maintenant `🔥 62 · 24 s` — le temps restant à la vitesse de
*cet instant*, rush compris — et clignote sous 20 s. Le réservoir client est affiché
(`👥 72`), parce que c'est **lui** qui raccourcit le créneau : le joueur voyait son
temps fondre au fil des jours sans comprendre que c'était son propre succès. Et les
chouffes annoncent ce qu'ils **achètent** : « ouverture 49 s → 119 s avec un de plus »,
au lieu de « −Heat ».

**Pas fait, délibérément** : aucune constante de chaleur touchée. Les chiffres ne le
justifient pas — 307 s en début de partie, 43 s à réservoir 85, c'est une courbe de
tension saine. Le problème était en aval, à l'affichage.

### 2. « Le grossiste ne devrait pas passer par la rue, mais par SnapShit en DM, puis livraison via BeuherShit »

Le canal existait **déjà à 80 %** : le DM grossiste est écrit dans `buildDMs`, il
produit un ordre livrable, et cet ordre est la **seule** alimentation de BeuherShit.
Il manquait la porte et la cohérence.

- `canal:"dm"` sur Diego le retire du tirage de la rue **sans le sortir de
  `CORNER_PERSONAS`** : il garde son visage, ses trois répliques et ses deux portes de
  déblocage, qui servent maintenant à faire sonner le téléphone.
- Ses `hours` et son `traits.heat:6` disparaissent : un deal livré n'a pas d'heure de
  passage, et la cause rendue était « le **coin** chauffe » — ce qui n'a plus de sens.
- `checkUnlocks` est appelée **aussi à la clôture**, plus seulement quand un client
  quitte le corner. Sans ça, `rueGate` devenait du code mort et « annoncer son
  format » perdait la moitié de ce qu'il achète.
- Le DM prend le **prix `menuAt`** comme tous les autres canaux — `GROSSISTE_FACTOR`
  (0,70) était un second barème pour 5 points d'écart.
- Sa quantité suit le **calibre annoncé** (`rueCalibre(rueMax) × n`) : composable par
  construction, et le volume du gros devient la conséquence du geste qui a ouvert la
  porte. L'ancienne échelle saturait à 72 g dès l'apparition — `QTY_BASE`/`QTY_STEP`
  ne produisaient aucune variation — et 72 g était parfois **inservable** (un stock
  tout en 5 g ne compose pas 72).
- Diego sort de `PDV_NAMES`/`PDV_AV` : une silhouette anonyme portait son nom et son
  avatar exacts au corner. Clin d'œil hier, mensonge à l'écran maintenant.

Les bornes `TOL`/`BUDGET`/`PATIENCE.grossiste` **restent définies** : elles bornent le
prix du DM et sont balayées par deux invariants. Les retirer donnerait `NaN`.

### `[DÉCISION REQUISE]`

- **Le double barème du grossiste**, toujours ouvert : Diego paie 432 € en DM contre
  un plafond de poche de 260 € au corner. Le même homme, deux prix. Le passage à
  `menuAt` referme la moitié du problème ; le plafond de poche en DM reste à trancher.
- **`PDV_CHOUFFE_PAY = 60` et l'embauche gratuite.** 3 chouffes = 180 €/soir ≈ 18
  secondes de recette, et multiplient l'ouverture par 16. C'est le point d'équilibrage
  le plus saillant du jeu aujourd'hui.
- **Le liquide qui dort** : au-dessus de 180 €, `+1 chaleur toutes les 3 s`, soit +60
  par jour — plus que le corner lui-même, et ni nommé ni affiché.
- **`busted` dans BeuherShit** : codé deux fois, joué zéro (`launchRuns` refuse de
  lancer ET écrit `busted:false` en dur). Porte ou conséquence ? Le garder en porte est
  le plus conforme à R1/R4, mais alors il faut supprimer la branche morte.

## 2026-07-26 — Playtest Sylvain : les trois chantiers tiennent

Validé manette en main, sur téléphone, après merge de #197/#198/#199 :

- **La coupe** — « coupe est bien ». Le barreau 1 de l'escalier tient : lame
  émoussée au départ, qualité qui monte avec le couteau (R10), et le gabarit qui
  se voit enfin (le pain maigrit de ce qu'il donne vraiment).
- **SnapShit** — « ça marche aussi ». Le lien *je coupe du 8 → je l'annonce → les
  gros arrivent* se sent en jeu. L'app a enfin un rôle.
- **La négo à quantité variable** — « ça marche bien ».

Aucun rééquilibrage demandé à ce stade. Les placeholders (`LAME_NETTETE`,
`RABAIS_FORMAT`, `RUE_INERTIE`, `RUE_PART_MAX`, `RUE_PENTE`, `QUAL_REF`,
`QUAL_TOL_MAX`) restent donc en l'état — ils tiennent le ressenti.

### Correction de cadrage, importante : le volume n'est pas un rabais

Sylvain : *« l'erreur serait de considérer la négociation en volume seulement
comme un rabais, le but étant aussi de vendre plus que prévu. »*

Il a raison et ça invalide mon vocabulaire. J'analysais le €/g — la métrique du
**client**. Celle du **joueur**, c'est ce que rapporte un créneau d'ouverture,
puisque la chaleur est un impôt sur les secondes ouvertes et non sur les grammes.

Un anonyme (poche 55 €) qui demande 2 g :

| servi | €/g | € encaissés | vs sa demande |
| --- | --- | --- | --- |
| 2 g | 11,00 | 22 € | référence |
| 3 g | 10,67 | 32 € | **+43 %** |
| 5 g | 10,20 | 51 € | **+128 %** |
| 6 g | 9,17 | 55 € | **+146 %** |
| 8 g et + | ≤ 6,88 | 55 € | +146 % (plafond) |

Pousser le volume n'est donc pas une concession : c'est **une vente qu'on
n'aurait pas faite**, dans le même créneau, pour la même chaleur.

Conséquence UI, à faire : au-delà de la saturation de sa poche (6 g ici), les
grammes supplémentaires ne rapportent **rien** — ce n'est pas une braderie à
signaler en rouge, c'est une **information à donner** : « il paie 55 € au
maximum ; au-delà de 6 g tu donnes du produit sans encaisser un euro de plus ».
Une info, jamais une punition (R1).

### `[DÉCISION REQUISE]` toujours ouverte

- **Le grossiste doublement remisé** (−45 % : son profil `OFFER`/`TOL` portait
  déjà un rabais volume, `menuAt` s'ajoute par-dessus). Réponse de Sylvain
  interrompue en cours de frappe — à reprendre.
- **Les secondes d'ouverture restantes**, toujours non affichées. C'est ce qui
  explique pourquoi le gros panier est bon : sans ce chiffre, le joueur ne voit
  pas ce que son créneau lui coûte.

## 2026-07-26 — La Loupe : proposer plus ou moins dans la négociation

Demande de Sylvain : *« dans la négociation, on devrait pouvoir proposer plus ou
moins. Ça permettrait de gérer les demandes lorsqu'on n'a pas ou trop la quantité
demandée. »* C'est l'attaque frontale du problème que trois chantiers successifs
avaient seulement contourné : `qtyToSachets` ne casse jamais une barrette, donc un
tampon en 8 g ne sert pas une demande de 5 g.

### La mécanique était déjà là, il manquait le geste

`resolveOffer(client, g, total, …)` **ne lit jamais `client.g`** : la quantité est
déjà un paramètre libre. `offerCap`, `menuAt`, `cornerComposable` sont tous
paramétrés en quantité. Et le jeu **disait déjà le problème** sans permettre d'agir :
« Ton tampon ne compose que 6 g — il manque 2 g ».

### Aucune pénalité à inventer : l'économie était déjà juste

`cornerBudget` ne dépend pas de la quantité. Vendre plus que la poche du client ne
peut donc pas encaisser plus — ça encaisse **la même somme sur plus de grammes**, et
le €/g s'effondre tout seul :

| proposé à un anonyme (poche 55 €) | €/g encaissé |
| --- | --- |
| 2 g (sa demande) | **11,00** |
| 5 g | 10,20 |
| 8 g | **6,88** |
| 20 g | 2,75 |

L'arbitrage « écouler du stock bâtard vs tenir son prix » est donc porté par
l'économie existante (R8), et le contre-poids R9 aussi : la chaleur est un impôt sur
les secondes d'ouverture, pas sur les grammes.

### Deux défauts trouvés dans ce que je venais d'écrire

1. **`offerQual` comparait au menu BRUT.** Vendre 8 g au tarif exact du 8 g affichait
   « −15 % menu ». Sans réglage de quantité c'était cosmétique ; avec, ça devenait le
   message principal de la carte, et il aurait menti au joueur sur le sens même de son
   geste. `offerQual` prend maintenant la quantité et compare à `menuAt`.
2. **Mon stepper avançait par pas de la plus petite barrette**, ce qui laisse
   atteindre des quantités inservables (tampon 2 g + 8 g : 6 g est atteignable et ne
   se compose pas) — donc une rupture partielle silencieuse. Il saute désormais de
   **composable en composable** : `snap.composables()` expose l'ensemble que la DP de
   `qtyToSachets` calculait déjà et jetait. C'est la contrainte qui règle le problème,
   pas un avertissement — le joueur voit le bord de son stock, boutons grisés compris.
   Contre-épreuve inscrite en invariant : le pas naïf produirait **17 quantités
   inservables** sur les 8 tampons testés.

### Ce que la carte montre maintenant

La ventilation du tampon par calibre (`3×8g · 2×2g`) et la liste des quantités
servables — l'information manquait **partout** dans le jeu, le seul code qui la
lisait n'en affichait rien. Plus une ligne côté joueur : « 6,88 €/g encaissé · tarif
du 8 g : 8,50 ». La grimace dit ce que le CLIENT ressent ; le joueur a besoin de son
propre chiffre.

Le mode « dernier prix » n'a délibérément **pas** de stepper : quand il annonce son
dernier prix, la quantité fait partie du deal — sinon l'invariant « son dernier prix
reste acceptable par lui » tombe.

### `[DÉCISION REQUISE]`

- **La braderie au-delà de sa poche.** Aujourd'hui autorisée : le €/g s'effondre
  (−43 % à 12 g pour un anonyme) mais c'est le seul moyen d'écouler un tampon coupé
  trop gros. À assumer, à étiqueter explicitement « braderie », ou à plafonner.
- **Le mode « ambigu » reste à part** : il vend hors de `resolveOffer` (aucun test de
  budget ni de tolérance) et facture linéairement, un second barème contradictoire.
  À absorber dans le chemin commun.
- **Le manque revient-il ?** Un client servi 3 g sur 5 repasse-t-il plus tôt ? Aucun
  code n'existe dans un sens ou dans l'autre.

## 2026-07-25 — La Loupe : l'annonce du format, et le rabais au volume

Deux demandes de Sylvain : *« la demande de morceaux plus gros pourrait se déclencher
au moment où le joueur coupe le morceau de taille la première fois »* et *« poster des
stories devrait être au cœur de la communication des nouveaux produits… le prix au
gramme d'un 8 g doit être plus attractif que celui pour un 2 g »*. Elles se sont
révélées être **la même chose**.

### La reconnaissance a trouvé un défaut dans ce que je venais d'écrire

Ma première version du déclencheur posait `S.rueMax = take` — un **maximum**, qui ne
redescend jamais. Un faux clic sur le stepper de calibre redéfinissait la clientèle
*définitivement* : perte sèche issue d'une erreur de manipulation, silencieuse et
irréversible. R1 l'interdit, R8 aussi (ce n'était pas une décision). Mesuré sur la
version à inertie seule : 69 à 123 coupes de 2 g pour redescendre.

### La correction est exactement la demande (B) : la coupe ARME, le joueur ANNONCE

`applyCut` ne bascule plus la rue. Il arme `S.annonce = { calibre, jour }` et le dit :
« Tu sors du 8 g. Annonce-le sur SnapShit pour que la rue le demande. » L'annonce est
un geste explicite sur SnapShit, **symétrique** (ré-annoncer le petit calibre fait
revenir les petites doses), et elle donne enfin un rôle à l'app.

Deux signaux distincts, et c'est délibéré :
- `rueMax` — CE QU'ON DEMANDE, immédiat, piloté par l'annonce ;
- `rue` — COMBIEN en demandent, progressif, gagné à la coupe.

Sans cette séparation, une seule barrette de 8 g convertirait 46 % du trafic du jour
au lendemain et assécherait la clientèle de petites doses.

Le gain mesuré sur le décalage offre/demande : **14 à 20 coupes invendables → 1**.

### Le rabais au volume : la forme comptait autant que la courbe

Exprimé comme un facteur sur la tolérance, le rabais aurait rogné le plafond que le
client s'impose APRÈS avoir annoncé son offre — le bug Nassim/Bilal, que nos propres
invariants **interdisent explicitement**. Exprimé comme un **menu par format**
(`menuAt(menu, qty)`), il baisse la référence de prix elle-même : comme
`cornerTol(kind, rel, base)` prend cette référence en entrée, le plafond et l'offre
bougent ensemble. La classe de bugs entière est évitée par construction.

Barème (placeholder) : **2 g 10,00 €/g · 5 g 9,20 · 8 g 8,50 · 12 g 8,00 · 20 g 7,50**.
Appliqué aux trois canaux — corner, PDV auto, DM SnapShit — une seule échelle.

### Le contre-poids R9 existait déjà, il n'était juste jamais nommé

Un rabais au gramme rend le gros panier moins rentable *au gramme*. Ce qui le rend
malgré tout désirable : **la chaleur est un impôt sur les secondes d'ouverture**, pas
sur les grammes ni sur le nombre de ventes (`activity` ne contient aucun terme en
quantité). Écouler 200 g au corner :

| panier moyen | clients | chaleur accumulée |
| --- | --- | --- |
| 2 g | 100 | **422** → descente garantie (seuil 95) |
| 5 g | 40 | 169 → descente |
| 12 g | 17 | **70** → tu passes |

Le gros panier coûte **6× moins d'exposition** pour les mêmes grammes. Avant ce
rabais, il rapportait autant au gramme ET coûtait 6× moins cher : il était
strictement meilleur, donc gratuit. Le rabais est **le prix de la discrétion**.

### Trois trous trouvés dans mes propres tests

1. **L'invariant recopiait la formule qu'il testait** (`const RUE_INERTIE = 0.08;
   // même valeur que index.html`). Changer la règle dans `applyCut` laissait le test
   vérifier l'ancienne et passer au vert. `rueApres()` est maintenant exportée de
   `corner.mjs`, appelée par le jeu ET importée par le test : une seule source.
2. **L'invariant du stock mort sautait la rampe** : 40 coupes pour stabiliser, PUIS
   le tampon, PUIS la vente. Coupe et vente jamais entrelacées — c'est-à-dire un
   scénario incapable d'exhiber le seul moment où le stock mort se forme. Réécrit en
   jouant 14 soirées, coupe et vente alternées.
3. **La part d'abus se mesurait sur une grille** : le bruit d'échantillonnage
   (0,17 pt à 2 000 pas) était du même ordre que le signal, et le test échouait sur
   des cas affichant « 4 % → 4 % ». Remplacé par une bissection sur les deux
   frontières réelles. Zéro bruit — et la discrimination passe de 104/216 à
   **115/216** cas rouges sans le correctif.

### `[DÉCISION REQUISE]` — un point d'économie que je ne tranche pas

**Le grossiste est maintenant doublement remisé.** `CORNER.OFFER.grossiste
[0.68, 0.74]` et `TOL.grossiste 0.78` étaient DÉJÀ un rabais volume déguisé, propre à
ce type de client. `menuAt` s'applique par-dessus : Diego paie **5,50 €/g** contre
10,00 €/g pour un anonyme à 2 g, soit −45 %. Trois options : assumer (le gros
acheteur est vraiment le moins cher), retirer le rabais `OFFER`/`TOL` du grossiste
puisque `menuAt` le porte désormais pour tout le monde, ou plafonner le cumul.

Autres placeholders en attente : `RABAIS_FORMAT`, `RUE_INERTIE`, `RUE_PART_MAX`,
`RUE_PENTE`, `LAME_NETTETE`, `QUAL_REF`, `QUAL_TOL_MAX`.

Non fait, signalé : la promesse SnapShit ne porte pas encore le calibre (seulement la
qualité) ; l'affichage des secondes d'ouverture restantes manque, et sans lui le
rabais se lit comme une punition alors que la mécanique le rembourse au double.

`SAVE_VERSION` 29 → 30 (les prix changent).

---

## 2026-07-25 — La Loupe : le bouche-à-oreille — la rue t'envoie les clients que tu mérites

J'avais laissé un `[DÉCISION REQUISE]` mal posé : « quelle clientèle monte en panier,
à quel palier de couteau », c'est-à-dire une **table de tuning**. Sylvain a répondu par
une question qui la rend caduque : *« pourquoi ça n'attirerait pas de nouveau type de
clients ? Ça serait légitime de penser que le bouche à oreille puisse faire changer le
type de clientèle. »* C'était la bonne réponse, et elle est conforme à R9 —
l'équilibrage est **systémique**, pas local. La clientèle devient une *conséquence*.

### Le jeu le faisait déjà, sur le mauvais signal

Une chaîne de parrainage complète existait : chaque persona a un `unlockedBy` et
arrive quand la relation avec son parrain atteint 40 (Momo → **Diego** grossiste
16-24 g, Riton → **Nassim** accro, Inès → Lina…). Donc « le gros consommateur
recommandé » était déjà codé.

Ce qui bloquait tenait en une ligne, dans `makeAnon` :

```js
const qty = [2,2,3,5,2][((day+seq)%5+5)%5];   // 85 % du trafic, écrit en dur
```

Les anonymes — **85 % du volume** — avaient leur panier gravé : un cycle de cinq
valeurs, identique au jour 1 et au jour 200. Et les deux signaux qui montent dans le
jeu ne pilotaient rien de tout ça : `S.reput` pilote le **prix**, `S.expo` pilote
**combien** de clients viennent. Personne ne pilotait **qui**.

### Signal retenu : ce que tu COUPES (arbitrage Sylvain)

`S.rue` — moyenne à inertie du calibre débité, mise à jour dans `applyCut`.

Le choix « à la coupe » et non « à la vente » n'est pas un détail d'implémentation,
c'est ce qui rend le système jouable. Sur « ce que tu vends », il se bloque en rond :
pas de gros clients tant que tu n'as pas vendu gros, pas de vente gros tant qu'il n'y
a pas de gros clients. **Mesuré** : à 25 % du tampon coupé en 8 g, 10 barrettes sur
40 dorment et ne repartent **jamais** (`qtyToSachets` ne casse pas une barrette).

### Le piège suivant, et il était pire : la demande arrivait un cran SOUS l'offre

Première version, panier de gros = `round(S.rue)`. Simulation : couper à 8 g fait
plafonner `rue` à 6,8 → paniers de **7 g** → une barrette de 8 ne sert pas une demande
de 7 → **0 % de servable**. La rumeur atterrissait systématiquement dans le seul
angle mort possible.

Correctif : la rumeur porte un **calibre nommé**, accroché aux paliers `[2,5,8,12,20]`
(les mêmes que `CUT_CAPS`). On ne dit pas « il vend du 6,8 », on dit « il vend du 8 ».

| coupe | rue | calibre nommé | % gros paniers | demandes servables |
| --- | --- | --- | --- | --- |
| 2 g | 2,0 | 2 g | 0 % | 60 % |
| 5 g | 4,8 | 5 g | 23 % | 36 % |
| 8 g | 7,5 | 8 g | 46 % | 46 % |
| 12 g | 10,1 | 12 g | 55 % | 55 % |

Et le joueur qui **suit le ratio affiché** (moitié gros, moitié petit) monte de 56 % à
73 % de couverture avec **zéro barrette dormante** aux trois calibres. C'est la
garantie R1 : couper gros est une décision, jamais un piège.

### Ce qui rend ça jouable : la conséquence est VISIBLE

Une chip pendant la coupe : « La rue : **8 g** · 46 % de gros paniers ». Sans ça, ce
serait un système qui décide dans le dos du joueur — donc pas une décision (R8). Et
le déblocage annonce sa cause : « On parle de toi pour du gros — Diego passera te voir. »

### Deuxième porte pour le grossiste

Diego avait `unlockedBy: "momo"`. Il a maintenant aussi `rueGate: 5` : un grossiste ne
débarque pas par amitié, il débarque parce qu'on lui a parlé de vous. Les deux chemins
**ouvrent** ; aucun ne devient une condition supplémentaire (invariant dédié).

### Le quartier ne meurt jamais

`RUE_PART_MAX = 0.55` : au plus haut, 45 % des anonymes restent le trafic de base, soit
36 % de petites doses (la table du quartier n'est elle-même qu'à 80 % de ≤ 3 g). On
n'enlève rien, on ajoute (R1).

Pas de bump `SAVE_VERSION` : à `rue = 2` le comportement est identique à l'actuel.

`[DÉCISION REQUISE]` restant : `RUE_INERTIE`, `RUE_PART_MAX`, `RUE_PENTE` sont des
placeholders. Et le fallback 2D reste plus rapide que la 3D nominale.

---

## 2026-07-25 — La Loupe : l'escalier d'outils, barreau 1 — le couteau devient le levier qualité

Arbitrages de Sylvain, en réponse au constat « la qualité ne paie pas » :
**la qualité achète de la TOLÉRANCE, pas du prix**, et le chantier suivant est
**l'escalier d'outils** (couteau pourri → meilleur → semi-auto → auto → salarié,
sans consommables ni réparation : on monte en outil).

### Ce que la reconnaissance a trouvé, et qui a changé le plan

Le `couteau` avait ses 5 paliers **entièrement codés et branchés** — `CUT_CAPS`,
`cutCap()`, les clamps du sélecteur, les chips 🔒, la position de la lame 3D — et
**aucun point d'achat**. Il n'existait que dans le menu debug. L'escalier n'avait
donc pas de premier barreau.

Mais l'ajouter tel quel aurait livré un **piège**. Vérifié en balayant la vraie
distribution de la demande (1 000 tirages) contre `qtyToSachets` :

| calibre coupé | demandes servies exactement | g livrés par client |
| --- | --- | --- |
| 2 g | 60 % | 2,44 g |
| 5 g | 20 % | 1,04 g |
| 8 g | **0 %** | 0,04 g |
| 12 g / 20 g | **0 %** | ~0 |

96 % de la demande est entre 2 et 5 g. Acheter le couteau *et s'en servir* menait
donc à la faillite : l'outil censé alléger le travail (R2) appauvrissait.

### Ce qui manquait n'était pas le semi-auto, c'était la RAISON de monter

Et R10 la nomme déjà : « la coupe est le levier qualité/pureté ». Le couteau porte
désormais ce levier — `LAME_NETTETE = [0.82, 0.88, 0.94, 0.98, 1.00]`, appliqué
dans `applyCut` : `q_barrette = q_pain × netteté(couteau)`. Une lame pourrie hache
et chauffe, une bonne lame préserve. Ce n'est **pas** une punition (R1) : aucun
raté possible, aucun gramme jamais perdu — c'est la ligne de base de l'outil qu'on
possède, et dont on sort en montant (R2, mot pour mot la demande de Sylvain).

Vérifié en navigateur, même pain q78 : **couteau 0 → q64, couteau 4 → q78.**

### La qualité achète de la tolérance : le tuyau existait déjà

`qFac` était propagé dans les trois seuls consommateurs de `cornerTol` (`offerCap`,
`negoFace`, `resolveOffer`) — il ne servait qu'aux **2 connaisseurs sur 12**. Il
suffisait de le donner à tout le monde : `qualFac(q)`, up-only, plancher q40,
plafond ×1,35 à q100. Le menu (`cornerFair`) reste fonction de la réput seule :
du bon produit ne fait pas monter ton tarif, il le fait accepter plus largement.

Réponse au défaut d'origine : le Pain 250, payé ×3,4 le gramme, fait passer la
tolérance de ×1,02 à ×1,14 — **+12 % de marge acceptée**, en plus de son volume.

### Le piège qu'on a failli livrer : la frontière d'abus était restée fixe

`NEGO_MAX = 1,2 × menu` en dur, pendant que `tol` devenait élastique. Résultat :
tous les prix débloqués par la qualité tombaient en `gouge` — −2 relation, −2
réput, et le client ne revient plus après deux fois. **Avoir du bon produit
devenait une punition.** La frontière suit maintenant le facteur qualité.

### Trois reformulations avant d'avoir un test qui prouve quelque chose

Notable, parce que c'est le piège récurrent de cette session :

1. « la qualité n'aggrave jamais un verdict » → **passait avant ET après**. À prix
   fixe, monter en qualité n'a jamais pu nuire. Le test ne testait rien.
2. « aucun prix débloqué n'est un abus » → discriminait (1081 → 209) mais restait
   rouge : un client très lié tolère déjà plus que la ligne d'abus (×1,254 à
   rel 80 contre ×1,2), et **ça, c'est voulu** — il avale et il s'en souvient.
3. « la qualité n'augmente pas la PART punie », mesurée sur grille fine → **PASS
   avec le correctif, 104/216 cas rouges sans**. En euros entiers le test gardait
   8 faux positifs de pure discrétisation ; en continu la part vaut
   `1 − NEGO_MAX/TOL[kind]`, strictement indépendante de `qFac`.

### La dette dormante, neutralisée sans être effacée

`repayDebt` exige du **propre**, et la trieuse est coupée (`SORTER_ENABLED=false`) :
`S.cash` n'a aucune source in-game. Une dette armée était donc **impayable**, et
`nightTick` la faisait enfler sans fin (+8 chaleur, −6 standing, ×1,15 tous les
2 jours). Boucle de punition sans sortie, dormante par accident — R1 violé de la
pire façon. `FRONT_ENABLED = false` bloque l'armement ET l'escalade (y compris sur
un save déjà infecté) **sans effacer** `debtDue`/`debtDueDay` : le jour où le propre
retrouve une source, on repasse à `true` et l'état repart où il en était.

### Vérifié aussi, et laissé tel quel

Le « désync » du Lot 500 (affiché dès réput 25, achetable à 30) signalé par la
reconnaissance n'en est pas un : c'est un **teaser volontaire** — l'article
s'affiche verrouillé pour montrer ce qui vient. Non touché.

### `[DÉCISION REQUISE]` — ce qui reste ouvert avant les barreaux du haut

- **Le contre-poids R9 chiffré** : quelle clientèle monte en panier, à quel palier
  de couteau. Sans ça, le calibre reste un choix à sens unique (petit = servir
  tout le monde), et les barreaux semi-auto / auto n'ont rien à équilibrer.
  `CORNER.BUDGET` / `OFFER` / `usual` sont tous tunés pour du petit volume.
- **Le sort du fallback 2D** : `manualCut ×5×cutBatch()` en un tap, gratuit et non
  gaté — le mode dégradé est aujourd'hui **plus rapide** que le mode nominal 3D
  (un appui de 0,6 s par geste). Le brider sur l'escalier, ou l'assumer.
- Les **placeholders** `LAME_NETTETE`, `QUAL_REF` et `QUAL_TOL_MAX` attendent le
  tuning humain.

---

## 2026-07-25 — La Loupe : le pain sur la planche mentait (désync visuel/état)

`pressCut` (scene3d) retirait **une** tranche du pain visible, pendant que le
hook `onCut` (index.html) en débitait **`1 + gabarit`**. Conséquence : « Plus de
pain. Appro requis. » s'affichait devant un pain encore à moitié plein, et
l'écart *grandissait à chaque palier de gabarit acheté* — c'est-à-dire le long
de l'axe de progression R2. Le joueur qui investit dans l'outil voit le jeu
devenir de plus en plus incohérent : exactement l'inverse de la promesse.

Correctif : l'**état est la vérité**. `applyCut` retourne désormais les grammes
réellement débités (au lieu d'un booléen), `onCut` les cumule et les retourne,
et `pressCut` retire du pain visible ce montant-là — jamais une estimation. Une
barrette tombe par tranche réellement coupée, donc le gabarit **se voit**. La
lame se pose aussi à la largeur du geste complet, gabarit compris.

Ce qui fait qu'on ne le reverra pas : `tools/desync-loupe.mjs` joue la scène en
vrai navigateur (vraie 3D swiftshader, vrais appuis longs) sur un pain de 250 g
— au-dessus du plafond visuel de 170 g, donc une recharge de planche est
*obligatoire*. Vérifié dans les deux sens : **0 recharge avant le correctif,
1 après**. C'est la seule façon honnête de prouver un correctif visuel.

### Correction d'un point d'audit : l'échelle d'appro n'est pas inversée

Sylvain : « l'échelle d'appro rend l'unité plus rentable à très petite échelle,
mais la valeur se fait dans la quantité ». Il a raison, et le jeu l'encode déjà.
Marge **absolue** au prix `cornerFair(reput)` : à réput 20 le Pain 100 gagne
(600 € vs 300 €), à réput 48 c'est l'égalité, au-delà le volume écrase tout
(à réput 100 : 1 200 € vs 1 800 € vs 3 800 € pour le Lot 500). Trois verrous
cohérents gardent le gros lot : 3 200 € de liquide, `reputGate 30`, et surtout
`planqueCap` (250 g de base, +120/palier → **3 agrandissements** pour tenir
500 g). Ma comparaison « à capital égal » ignorait ces plafonds, qui sont la
vraie contrainte. Point retiré.

### Ce que la vérification a fait apparaître à la place : la qualité ne paie pas

On paie la qualité **×3,4 le gramme** (2,00 €/g en q52 → 6,80 €/g en q78, soit
+240 % pour +50 % de qualité). Ce qu'elle rapporte :

| canal | prix de vente | apport qualité |
| --- | --- | --- |
| Corner (négo) | `cornerFair(reput)` | **+0 %** — fonction de la réput seule |
| Snap (DM) | `ppuG = f(reput)` | **+0 %** — même formule |
| PDV auto | `pdvFair(q) = 5 + 0,10q` (+25 %) | n'entre que dans le terme de *satisfaction*, jamais dans le prix ; et `pdvServe` ne tourne que pour le charbonneur, encore en debug |
| `qualCheck` | ×1,12 tolérance, +12 % pourboire | **2 personas sur 12**, et les personas font 15 % du volume |

Symptôme qui le prouve sans discussion : **dès réput 30, le Lot 500 domine
strictement le Pain 250** — 6,40 €/g contre 6,80 €/g, et deux fois plus gros.
Le seul avantage du Pain 250 est ses +8 de qualité, qui ne valent rien à la
caisse : c'est un SKU mort dès qu'on a la planque.

Ça percute **R10** de plein fouet (« la coupe est le levier qualité/pureté ») :
le levier a un coût, il n'a pas de surface de gain. `[DÉCISION REQUISE]` —
brancher la qualité sur le prix (et où : menu du corner, budget client, ou
tolérance), ou assumer que la qualité n'achète que de la *tolérance* et
rééquilibrer le prix des pains en conséquence.

---

## 2026-07-25 — La Loupe : le corner passe aux GRAMMES (et le calibre devient un levier)

Arbitrage de Sylvain : **le corner vend À LA TÊTE** — « il n'y a pas de demande
sans client ». Ça tranche le `[DÉCISION REQUISE]` ouvert par l'audit, et ça a une
conséquence immédiate : la thèse de `le-spot/` (visibilité ∝ nombre de
transactions, le calibre pilotant ce nombre) **ne s'applique pas à La Loupe**. En
vente à la tête, servir 8 g en 4 barrettes ou en 1 seule, c'est une transaction
dans les deux cas.

Mais le calibre reprend aussitôt un sens, meilleur et déjà à moitié codé :
**en quoi tu coupes décide QUI tu peux servir.** Riton veut 2 g, Momo 5, Bilal 8,
Diego 16-24. Un tampon de 8 g ne sert pas Riton. Couper petit = servir tout le
monde et travailler plus à la planche ; couper gros = expédier la coupe et fermer
la porte à une partie de la clientèle. C'est social au lieu d'être statistique,
et ça colle aux personas au lieu de leur passer à côté.

**Le bug n°2 de l'audit ÉTAIT cette mécanique, mal implémentée.** Le corner
facturait des grammes et débitait des barrettes via `clamp(round(g/2),1,6)`.
Mesuré avant correctif :

| tampon | le client veut | livré (avant) | facturé |
|---|---|---|---|
| 8 g | 5 g | **24 g** | 5 g |
| 5 g | 8 g | **20 g** | 8 g |
| 2 g | 5 g | 6 g | 5 g |
| 2 g | 24 g (Diego) | 12 g | **24 g** |

Le corner branche désormais sur `snap.qtyToSachets` — la composition exacte qui
existait déjà à quinze mètres, testée, avec son commentaire « Exact match only
(jamais sur-livrer) ». Facturation **au prorata des grammes réellement livrés**.
La réparation et la feature étaient le même travail.

**Nouveau cas à rendre lisible** : une commande peut devenir *incomposable*
(5 g avec un tampon de 8 g). La carte le dit maintenant AVANT d'accepter —
« ton tampon ne compose que N g » ou « aucune barrette ne compose 5 g, coupe plus
fin ». Sans ça c'était un échec caché (R4).

**Deux autres réparations du même passage**
- **L'offre du client passe enfin son propre test.** `BUDGET` étant indexé sur le
  `kind` et non sur le persona, Nassim (accro, budget 50, demande 8 g) partait
  **fâché dans 100 % de ses visites** après qu'on ait accepté le montant qu'il
  venait d'annoncer ; Bilal dans 42 %. Vérifié en rejouant 400 couples jour/seq.
  Les offres sont maintenant bornées par `offerCap` — la poche ET la tolérance —
  et re-bornées au spawn une fois le `qFac` du connaisseur connu.
- **R1 : l'expiration de patience ne ponctionne plus le réservoir.** Elle punissait
  la LENTEUR DE LA MAIN, et `res` pilote la demande : une amende durable pour un
  défaut d'attention. Le walk après une contre-offre trop haute, lui, reste
  sanctionné — il est annoncé par `negoFace` avant le bouton, donc c'est une
  décision (R8). Trois chemins de « vente perdue », trois traitements.

**Outillage** — `tools/invariants-loupe.mjs` : 7 invariants sans navigateur, dont
les deux que l'audit réclamait (grammes facturés == livrés ; l'offre d'un client
passe son propre test, balayée sur 21 520 offres × menus × relations × qFac).
Le dépôt ne vérifiait jusqu'ici que la syntaxe.

`SAVE_VERSION` 27 → 28 (le tampon change de sémantique de facturation).
Le smoke attendait 282 de recette : c'est 272, et les 10 de moins sont de la
marchandise qu'on ne donne plus. Commenté sur place pour la prochaine session.

**Reste ouvert** : `[DÉCISION REQUISE]` l'échelle d'appro est inversée — à
capital égal le petit pain rapporte **16 fois plus** (1 700 € → +4 800 en
8× Pain 100 contre +300 en 1× Pain 250). Elle punit littéralement « grossir et
s'étendre ». C'est de l'équilibrage structurant. Et le désync 3D du Gabarit
(« Plus de pain » devant une savonnette à 80 %) attend son tour.

---

## 2026-07-25 — Le Spot : la coupe devient une décision, payée en grammes

Retour de playtest sur `le-spot/` : *« ça marche vraiment bien, le sentiment est
là, mais la coupe est sans doute vraiment facile »*. Juste : c'était un minuteur.
On maintenait, les sachets tombaient, relâcher ne coûtait rien — R8 non servi.

**Ce qui est livré : « la lame s'émousse ».** Chaque COUPE émousse (pas chaque
seconde). Une lame qui force n'ouvre plus, elle écrase : le geste prend le sachet
*plus* ce qu'il broie, et ces grammes partent aux miettes — ils reviennent avec le
pain suivant. Rien n'est détruit (R1), mais rien n'est disponible aujourd'hui.
Lâcher `RELACHE_MIN` (0,35 s) laisse la lame reprendre. Mesuré PAR COUPE sur
100 g en 5 g : **continu 0,24 g écrasés, alterné 0,01 g**.

**Réglage après playtest** — retour : « ça fonctionne, c'est juste un peu trop
rapide ». Diagnostic chiffré : à `CUT_S_PAR_SACHET` 0,10 un pain de 100 g en 8 g
était fini en **1,3 s**, et la lame passait de neuve à visiblement émoussée en
**0,23 s** — la phase propre n'existait pas assez longtemps pour se voir. Passé à
**0,17 s/coupe** avec une usure ramenée de 0,035 à 0,026 : la fenêtre propre
double (0,52 s), la saturation passe de 2,0 s à 4,6 s, et le pain de 100 g en 8 g
dure 2,1 s au lieu de 1,3. *Au passage, le test du rythme comparait deux quantités
différentes (les deux gestes ne produisent pas le même nombre de sachets) : il
compare désormais l'écrasement PAR COUPE.*

Le geste se lit **dans la matière** et pas dans un cadran (étalon *Viridi* du
corpus plantation) : les barrettes sortent droites, puis penchées et rabougries.

**Et surtout ça alimente le dilemme du calibre au lieu de flotter à côté** :
l'usure se paie par coupe, donc 100 g en 2 g usent la lame 4× plus qu'en 8 g
(50 coupes contre 12,5). Le petit calibre paie un troisième prix, après le €/g et
la visibilité.

**Le pré-vol adverse a bloqué ma première version, et c'est la vraie leçon.**
J'avais conçu une prime de +15 % au gramme sur les lots nets, facturée en TEMPS
(couper propre demande d'alterner, donc prend 2× plus longtemps, donc le spot ne
vend pas pendant ce temps). Verdict : **BLOQUÉ**, sur trois motifs imparables.
- *Le temps ne coûte rien.* La journée est bornée par le STOCK, pas par le temps —
  je l'avais moi-même établi la veille en corrigeant `simJour()`. Couper lentement
  ne perd aucune vente : on vend les mêmes 100 g plus tard. Coût réel : zéro.
- *Pire, il est négatif.* Le temps à la planque est le seul état où la chaleur
  retombe vite : couper proprement REFROIDIT le point. La mécanique payait le
  joueur pour la respecter.
- *L'optimum était un cookie clicker.* Presser 0,10 s, lâcher 0,11 s, recommencer
  à ~4,76 Hz : à temps rigoureusement identique, le micro-tap dominait strictement
  le geste long. Le proto aurait enseigné « spamme », jamais « pose la main » —
  l'inverse exact de R3, sur un pouce de téléphone.

*Leçon transposable, et c'est la deuxième fois en deux jours que je me la prends :
une mécanique ne vaut que ce que vaut la MONNAIE de son coût. Facturer en secondes
un jeu borné par les grammes, c'est facturer en monnaie de singe.* Le garde-fou
`RELACHE_MIN` est là uniquement pour tuer le martèlement, et un invariant le
vérifie (tap à 5 Hz → netteté 0,58, plus 1,00).

**Vérifs** : 34 invariants (dont conservation stricte — 90 g de sachets + 10 g de
miettes + 0 reste = les 100 g du pain), 6/6 tailles d'écran, `node check.mjs` vert.

**Tuning ouvert** : `NETTETE_PAR_COUPE` 0,035 · `RELACHE_MIN` 0,35 s ·
`NETTETE_RECOVER` 0,55 · `PERTE_LAME_MAX` 0,22. Premier jet, à sentir au pouce.

---

## 2026-07-25 — Le Spot (Shelter P1) : le calibre devient le levier discrétion ↔ dominance

Nouveau proto `le-spot/`, un seul `index.html`, zéro dépendance (ni Three.js ni
CDN — il s'ouvre en `file://`, contrairement à `la-loupe/` et ses 5 modules).
C'est le **P1 « Le spot »** du découpage de `la-loupe/SHELTER.md` §14, écrit le
2026-07-22 et jamais construit.

**Le constat de départ.** « Petit format = €/g plus élevé » est une loi de tous
les protos et de la spec consolidée (§4.3) depuis un an — et c'est un **bonus
sec**, sans contrepartie. Couper petit n'a donc jamais été une décision. En
parallèle, D10 retient discrétion ↔ dominance comme spine et Q1 est ouverte
depuis le 04-07 : le cadran concurrence n'a **jamais été écrit** (dans tout le
dépôt, `rival` est une règle CSS pour un pin verrouillé). Une bascule à un bras
n'est pas un dilemme, c'est un plafond.

**La thèse du proto.** On donne sa contrepartie au petit calibre : **chaque
transaction se voit**. 100 g en sachets de 2 g = 50 mains qui passent ; en 8 g =
6 mains. Le €/g monte quand le calibre descend, la visibilité monte avec le
nombre de passages. Et le second bras (le coût de la discrétion) est porté par
le **loyer fixe** — `LOYER_FIXE` 220 €/jour, dû qu'on vende ou non (spec §4.7,
« tu paies pour EXISTER sur le block ») : vendre lentement coûte.

**Le dilemme est chiffré, pas affirmé.** `simJour()` est une fonction pure dans
le fichier, rejouée par le test, qui balaie l'espace calibre × fenêtre :

| Contexte | Meilleur plan | Recette nette | Visibilité |
|---|---|---|---|
| J1 — réservoir 40, grade C, pain de 100 g | **2 g, ouvert 24 h** | 550 €/j | **+47,8 /j** |
| Croisière — réservoir 85, 250 g/jour | **8 g, 16 h→2 h** | 878 €/j | **−7,3 /j** |

Les deux réponses diffèrent : à J1 on pousse (la jauge est à 0, le loyer tombe
ce soir) ; en croisière le réservoir a grossi, donc le même calibre ferait +107
de visibilité par jour — on se replie sur le rush. **R9 en action** : ce n'est
pas le geste qui durcit, c'est le système qui grossit sous le geste.

**Les autres décisions.** Le **tampon** (ce qu'on pose dehors se vend sans
rupture et c'est exactement ce qu'une descente emporte) ; la **navette** (voir
ci-dessous) ; la **qualité** du pain de Karim (marge contre satisfaction) ; le
**rideau** (l'accalmie volontaire de SHELTER §8, seul contre-feu à la chaleur :
gratuit, sauf que le loyer court).

**Au passage, l'arbitrage de présence est tranché.** Le 2026-07-23 on écrivait :
« le vrai arbitrage (à caler ensuite) : ta présence est unique → tenir le corner
⇄ vendre/livrer sur SnapShit », avec deux niveaux proposés, et la conclusion
**« Non tranché — prochaine étape design »**. Quatre sessions plus tard il ne
l'était toujours pas. La **navette** est exactement le « niveau fort » qui y
était décrit : *une absence coûte du temps pendant lequel le point ferme*. C'est
ce qui donne enfin une valeur au charbonneur — sans arbitrage de présence,
déléguer la présence rend un temps dont on ne ferait rien, et R6 n'a rien à
libérer. *À rapatrier dans La Loupe si le feel tient.*

**Le choix technique répond à la frustration n°2 du journal.** En relisant les
39 entrées, la première cause de friction en playtest n'est pas le design : c'est
**l'écran qui masque, coupe ou casse** — 6 occurrences en 5 jours (scène
tronquée, tiroir disparu, labels empilés, retour impossible), dont un « broken —
plus la possibilité de tester » quand Three.js n'a pas chargé sur mobile. D'où :
**zéro dépendance, zéro CDN, un seul fichier** (ça marche même sans réseau), et
un contrôle de mise en page automatisé — `tools/resp-spot.mjs` vérifie sur
**6 tailles d'écran** (320×568 → 768×1024) qu'aucun élément cliquable ne sort du
cadre, qu'il n'y a jamais de scroll horizontal et que le bas de la planque reste
atteignable sous le dock. 6/6 vert.

**Le geste encode le choix** : un maintien coupe le pain entier, et couper en
2 g prend physiquement 4× plus longtemps qu'en 8 g. On sent sa décision dans la
main plutôt que de la lire dans un menu.

**La revue adversariale a cassé la thèse avant qu'elle ne parte en playtest.**
Deux bloquants que ni la relecture ni la première batterie de tests n'ont vus :
- **`SEUIL_PILONNAGE` (78) était mathématiquement inatteignable.** La patrouille
  se déclenchait à 45 et clampait la jauge à 22 : elle oscillait 45 → 22 → 45, et
  le pilonnage — la SEULE conséquence qui saisit quoi que ce soit — n'arrivait
  jamais en partie réelle. Le tampon n'était donc jamais en jeu, le chouf et
  l'ARAH étaient du décor. *Et le test le masquait en écrivant `s.vis = 95` à la
  main.* Corrigé : la patrouille disperse, elle ne blanchit pas ; anti-récidive
  de 6 h ; et un invariant qui laisse la jauge monter TOUTE SEULE (elle atteint
  77, le raid tombe).
- **Le dilemme ne tenait pas dans le régime réel du jeu.** Le goulot est le
  STOCK (100/250 g), pas la demande (200-500 g/jour) : `servi` ne jouait donc que
  sur la vitesse. À produit égal, le 2 g rapportait +48 % ET faisait grossir la
  clientèle 4× plus vite (le réservoir était crédité *par transaction*), pour une
  chaleur qu'une journée de décroissance absorbait — dominant sur les deux axes.
  Corrigé : réservoir **par gramme**, chaleur qui ne retombe que si le point ne
  vend pas, `simJour()` borné par le stock. *Leçon : une preuve chiffrée vaut ce
  que vaut son régime — la première version prouvait un dilemme dans un monde
  où le stock était infini.*
- Plus : `tapCache()` **détruisait** 6 g par tap (l'évacuation créait la perte
  qu'elle prétend réduire — R1), les miettes « gardées de côté » étaient jetées,
  la boucle ne se mettait pas en pause derrière le rapport du soir, des ruptures
  frappaient un joueur présent, la paie ignorait la caisse exposée, et déléguer
  ne se regrettait jamais (s'absenter refroidissait pendant que le charbonneur
  vendait).

**Trois bugs de conception attrapés par la mesure, pas par la relecture :**
- *spirale de mort au J1* — un tampon vide attirait quand même des clients, qui
  repartaient les mains vides et creusaient le réservoir sans retour. Corrigé :
  pas de came, pas de file (le bouche-à-oreille va vite).
- *la jauge était un plafond* — au réservoir 85, **aucun** calibre n'était
  tenable en continu. Le test l'a dit noir sur blanc (« aucun plan ne tient »).
  D'où le rideau : la décision devient calibre **et** fenêtre d'ouverture.
- *l'amorçage bloquait la partie* — avec un lot d'entrée à 50 g, la simulation
  du ramp donne **+15 €/jour** : le joueur ne franchit jamais la marche vers le
  tier suivant (J1 275 → J4 320, le pneu à 340 reste hors d'atteinte). Passé en
  **100 g** (ce que D31 impose de toute façon : deux formats, 100 et 250 g) →
  J1 610, J2 960, J3 1 310. *Leçon transposable : une marche d'appro se vérifie
  en simulant 4 jours, pas en regardant le €/g.*

**Outillage ajouté** (utile au-delà de ce proto) :
- `tools/check.mjs` — extrait les modules d'un `index.html` et les passe à
  `node --check`, plus les `.mjs` voisins. `node check.mjs` balaie tout le dépôt
  (28 fichiers, tout vert). La convention de CLAUDE.md était jusqu'ici une
  manip à refaire à la main à chaque push.
- `tools/smoke-spot.mjs` — ne regarde pas si « ça s'affiche » : il **déroule une
  partie** (appro → coupe → poche → navette → ventes → descente → rapport) et
  vérifie **25 invariants**, dont le dilemme lui-même. Si un jour un seul plan
  domine partout, le test casse.

**R1 rendu mécanique.** L'audit du dépôt a trouvé R1 *cité en commentaire et
violé douze lignes plus bas* : `corner.mjs:7` annonce « rater une négo = jamais
de malus sec », `:24/:37/:38` ponctionnent relation (−2), réput (−1) et
réservoir (−6) sur un walk ; et `index.html:882` punit la **lenteur de la main**
(un client qui expire dans la file ponctionne le réservoir) — exactement ce que
R1 interdit. Ici l'invariant est **exécuté** : cinq clients, sept secondes sans
y toucher, zéro rupture. *Proposition : en faire un invariant du dépôt, testé
partout — une règle qu'on ne teste pas est une règle qu'on cite.*

**Écarts constatés ailleurs (à traiter séparément, hors périmètre de ce proto) :**
- `recolte/index.html:1338-1381` — **violation R4** : la composition d'un lot est
  tirée au sort (`sort(() => Math.random() - 0.5)`, poids `0.5 + Math.random()`,
  `leafFrac` aléatoire consommé en `:1446`). Le contenu marchand d'une récolte
  n'est pas reproductible.
- `la-loupe/index.html:837` — le prix est facturé sur les grammes **demandés**
  mais le stock est débité en **barrettes** via un `÷2` codé en dur puis clampé
  à 6 : Diego demande 24 g, paie 24 g, **reçoit 12 g**. Et à `cutSize` 1 g
  (autorisé, `CUT_MIN=1`) chaque barrette est payée au prix d'un 2 g — le €/g
  double.
- `la-loupe/index.html:414-416` — **l'échelle d'appro est inversée** : le Pain
  100 rend ×4,0 à réput 20 quand le Pain 250 rend ×1,18 et le Lot 500 ×1,25.
  Acheter plus gros est strictement perdant à tous les niveaux de standing.
- `la-loupe/scene3d.mjs:206` vs `index.html:393` — avec Gabarit 4, l'état vide le
  pain 5× plus vite que le visuel : on voit un pain plein et on lit « Plus de pain ».

**Backlog ouvert par ce proto**
1. `[DÉCISION REQUISE]` **le poids du liquide** (CADRE §6) — ici seul le produit
   pèse, la caisse rentre sans occuper de place. L'ajouter double la pression de
   navette : à sentir avant de trancher.
2. `[DÉCISION REQUISE]` **la Chute à `DOS_MAX`** — présente en version légère
   (fin de run + récap) parce qu'une session sans fin n'a pas de forme. SHELTER
   la place en P3 : à valider ou repousser.
3. **Tuning entièrement ouvert** — `DEMANDE_PIC` 45, `VIS_PAR_TX` 0,55,
   `LOYER_FIXE` 220, `PREAVIS_S` [0, 7, 13], table `PAINS`. Premier jet, pas des
   arbitrages : ils attendent le playtest.

---

## 2026-07-24 — Prix marché dynamique : la concurrence fait bouger la référence

Backlog n°1 du brief. Le marché n'est plus une constante dérivée de la réput :
il **bouge chaque matin** et ton prix module la demande **relative** — la négo,
elle, reste calée sur TON menu (décision du 2026-07-24 conservée).

- **Marché du jour** = `cornerFair(reput) × marketFac(jour)` (`corner.mjs`) —
  facteur **déterministe par hash du jour** (R4 : une météo *annoncée*, pas un
  bruit) dans **[0.8, 1.3]**, neutre avant J3 (démarrage sans parasite). Fonction
  pure (reput, jour) → **zéro état en save, pas de bump** `SAVE_VERSION`.
- **Annoncé chaque matin** (`advanceDay`) : toast « J5 — marché 12/g ▲ », entrée
  journal « Marché 12/g (+2) », et aux extrêmes (≥×1.18 / ≤×0.9) une **news qui
  explique le mouvement** (« 📦 Gros arrivage chez la concurrence — ils cassent
  les prix ») via la file de toasts.
- **Demande vraiment relative** : `attract = 0.8 − (prix/marché − 1) × 0.9`
  (avant : pente 0.5 sur le ratio brut). Baseline inchangée à prix=marché (0.8),
  mais suivre ou ignorer la concurrence se sent : marché qui plonge + menu
  inchangé → −28 % de passage ; marché qui flambe + menu inchangé → +26 %.
  Le levier joueur : coller au marché (volume) ou tenir son prix (marge) — R9,
  la tension est systémique.
- **UI** : chip **⚖ marché** au corner (patchée en live), référence
  « marché X/g ▲/▼ » + news dans le tiroir « Gérer », hint de prix recalculé sur
  le marché du jour. `snapMenuPrix` et le texte SnapShit suivent.
- **Vérifs** : unit-test node (neutralité J1-J2, déterminisme, bornes J3-J200,
  cohérence news/seuils, plancher) + smoke : l'affichage (tiroir + chip) doit
  égaler `marketPrice(reput, jour)` recalculé dans la page. Tout vert.

*Prochaine marche possible* : marché **réactif** au joueur (sous-couper des
jours d'affilée tire la référence vers le bas — la concurrence s'aligne), à
tester seulement si le marché exogène ne suffit pas à faire vivre la décision.

**Backlog ajouté (retour joueur)** — « va falloir revoir le carnet aussi » :
le « 🧾 Au carnet » actuel (une ligne dans le tiroir Gérer) est un embryon.
Périmètre à trancher : simple refonte de la partie ardoise/ledger (qui doit
quoi, pour quand, historique lisible) ou un **vrai carnet de contacts** —
une vue par tête connue : relation, tell, heures de passage, ardoise en cours
(le graphe social des personas devient consultable).

---

## 2026-07-24 — Personas étape 3-4 : traits (qualité/heat/heures) + ardoise + graphe social

Fin du plan personas (étapes 1-2 livrées plus tôt dans la journée). Tout est
**lisible sur la carte avant de décider** (R4) et **déterministe** ; refuser =
vente perdue, jamais de malus sec (R1).

- **`traits` par persona** (`corner.mjs`) — l'axe mécanique, plus seulement du texte :
  - **qual** (Inès, Lina) : le connaisseur renifle le tampon à l'arrivée et compare à
    son `exig` (enfin branché) — Q suffisante → tolérance ×1.12 **+ pourboire**
    (`TIP_QUAL` 12 %) + rel bonus ; Q < exig−12 → il **rogne** (tolérance ×0.85, son
    « dernier prix » baisse d'autant). 3 bandes lisibles, chip colorée sur la carte
    (« ✔ exige Q70 · tampon Q78 — paie mieux »). Le curseur d'achat : le Pain 250 (q78)
    pour la clientèle exigeante.
  - **heat** (Diego +6, Kenza +4) : les servir **chauffe le coin**, affiché avant de
    décider — la marge contre la température. Refuser = vente perdue, point.
  - **hours** (Lina 21h–4h, Diego 9h–19h, Nassim 19h–2h) : le **cycle 24h devient
    mécanique** (il ne pilotait que le ciel) — `cornerSpawn` filtre par heure, wrap
    minuit géré (`inHours`, fin > 24).
- **Ardoise (étape 4, Nassim `traits.credit`)** : certains soirs (hash jour/seq,
  gated rel ≥ 25), il est à sec → son habituel **à crédit** : le stock part maintenant,
  l'argent revient en **liquide à J+2 avec +25 %** (`ARDOISE_RATE`), réglé tout seul à
  la clôture de journée (`advanceDay`) — **jamais d'impayé** (R4 : la tension c'est
  l'argent immobilisé + le stock parti, pas une loterie). Une seule ardoise à la fois :
  il ne repasse pas tant qu'il doit. Tiroir « Gérer » : ligne **« 🧾 Au carnet »** +
  entrée ledger dédiée (🧾 → 🧾✓ au règlement). Touche la save → **`SAVE_VERSION` 26 → 27**.
- **Passe de revue adversariale (avant push)** — 3 vrais trous bouchés :
  - *« dernier prix » refusé par son auteur* : `t2=R(g·tol·0.97)` pouvait dépasser
    `tol` (arrondi), rendu atteignable par `qFac 0.85` → accepter le contre affiché
    finissait en walk avec malus (anti-R1/R4). Fix : `Math.floor` — le contre passe
    toujours son propre test (brute force rel×prix×qFac : 0 échec).
  - *ardoise exploitable / dominante* : la dette suivait TON menu sans borne (menu ×3
    juste avant d'accepter = crédit gonflé). Fix : **plafond poche** comme toute vente —
    `due = min(qty·menu·1.25, budget(kind,rel)·1.25)`.
  - *double ardoise* : deux cartes Nassim en file → la 2ᵉ écrasait la dette de la 1ʳᵉ
    (impayé). Fix : file **dédoublonnée par persona** au spawn + cumul en garde + purge
    des cartes restantes à l'accept ; les offres d'ardoise non prises meurent à la nuit.
  - Et la toilette UX : re-sniff du tampon par les connaisseurs en file à chaque ravito
    (chip + paiement = vraie qualité, le geste correctif vit) ; chip véridique par mode
    (ambigu ≠ offre, bande neutre « ≈ sans effet ») ; « Au carnet » patchée en live ;
    file de toasts pour les annonces de déblocage ; dette au prorata si rupture partielle.
- **Graphe social réparé** : `unlockedBy`/`UNLOCK_REL` étaient des données mortes
  (aucun code ne débloquait jamais Diego/Lina/Nassim/Kenza/Léa !). `checkUnlocks()`
  après chaque client servi : parrain à rel ≥ 40 → toast différé « X a parlé de toi —
  Y passera te voir ». Debug : bouton « Relations +15 » pour tester sur device.
- **Vérifs** : `node --check` ×2, unit-test node (inHours/qualCheck/wantsArdoise/
  makeArdoise/checkUnlocks/resolveOffer×qFac) tout vert, smoke Puppeteer étendu
  (ardoise → règlement J+2, pourboire qualité, heat, déblocage) tout vert, 0 erreur console.

**Backlog ajouté (retours joueur du jour)**
- **Sources d'appro à revoir** : sur les premières étapes on se fournit auprès de
  **Karim** ; l'app Appro (dark web) n'est **pas encore disponible** — à débloquer
  plus tard dans la progression.
- **Échelonnage des améliorations de l'Atelier**, sur les deux gestes :
  - *découpe* : vitesse +, couper de **plus gros morceaux**, et accepter de **plus
    gros pains** (> 100 g) ;
  - *ensachage* : **manuel → semi-auto → automatisé** (la vanne R6/R7 appliquée à la
    mise en sachet).

---

## 2026-07-24 — 🧾 Récap de session (brief) : la core loop directe prend forme

Synthèse haute de la session (détails par changement dans les entrées ci-dessous,
PR #182 → #190). État : **La Loupe** tourne en **indépendant (Phase B)** — couper un
pain à l'Atelier → tenir le corner (négo présentielle) → écouler en **liquide** →
racheter. Déployé sur GitHub Pages depuis `main`.

**Livré cette session**
- **Recentrage de la boucle** : suppression de la Phase A (charbonneur salarié) + de
  l'intro → démarrage **direct** dans la core loop, plaquette 100 g offerte, sans dette
  ni tuto. *Raison : Phase A auto-serve, rien à faire à la main → contre R3.*
- **Le corner (négo présentielle)** : prix **réglable à la main** (pilote la demande,
  marché = référence) ; **personas enrichis** (tells + banques de dialogue + gradient
  louche flic/pigeon) ; **PNJ anonymes = la norme** (85 %, personas nommés = le sel) ;
  **vente → liquide direct** (fini le bouton « Encaisser » ; bac réservé au futur
  charbonneur).
- **Ambiance** : scène du corner remplie ; **ciel en cycle 24h** (aube rosée ~6h30 →
  jour → couchant ~18h30 → nuit), lampadaire + fenêtres pilotés par `--night`.
- **UX tiroir « Gérer »** : panneau roulant + poignée persistante collée au dock ;
  **fix double-poignée** au 1er connect (tiroir fermé = `display:none`, indépendant du
  timing de layout iOS) — ✅ validé sur device.
- **Rythme** : **journée 2× plus longue** (`DAY_SEC_REAL` 90 → 180 s).
- **Reporté** : trieuse (liquide → propre) masquée (`SORTER_ENABLED=false`), en attente
  de la refonte inventaire.

**Décisions de design (rattachées aux règles)**
- Négo **déterministe** (R4) ; le skill module la récompense, ne punit pas (R1).
- **Auto-liquide** = R6/R7 : on délègue la répétition sans décision, on garde en main
  l'arbitrage (prix, à qui vendre).
- **Équilibrage systémique** (R9) : journée ralentie compensée par plus de volume clients.

**Backlog / prochaines pistes**
1. **Prix marché dynamique** : le marché varie avec la concurrence (le prix joueur module
   alors la demande *relative*).
2. **Refonte inventaire / trieuse** (réfs *Schedule I*, *Drug Dealer Simulator*) : sac à
   dos (poids + volume), slots, double monnaie cash/carte.
3. **Traits de personas** (étapes 3-4) : heat / qualité / temps d'activité, puis
   crédit-ardoise (Nassim).
4. **Embauche du charbonneur** : bac + « Encaisser » déjà câblés pour le corner qui
   tourne en ton absence.

---

## 2026-07-24 — Rythme du corner : journée 2× plus longue + vente → liquide direct + fix double-poignée

Retours de test : (1) la journée file trop vite pour les ~5-6 clients d'une session ;
(2) taper « Encaisser le bac ▸ liquide » est une friction sans décision ; (3) au 1er
connect au corner, une **double poignée** de tiroir apparaît, qui ne part qu'après avoir
rabattu le panneau une fois.

- **Journée 2× plus longue** : `DAY_SEC_REAL` **90 → 180 s**. Plus de temps pour souffler
  entre les clients, ~2× plus de clients servis par jour (le goulot reste `CORNER_MAX_QUEUE`
  + la vitesse du joueur, pas les arrivées), et le ciel 24h défile deux fois plus lentement.
  Chaleur observée basse (6-19/jour) → pas de risque de descente en doublant la durée.
- **Vente au corner → liquide direct (R6/R7)** : en présentiel (joueur au corner) `cornerSell`
  verse `total+tip` **direct dans `S.dirty`**, plus dans `P.bac`. Fini le « Encaisser » à taper :
  c'est de la friction sans décision. Le tiroir affiche « 💸 Tes ventes tombent direct en
  liquide » à la place. **Le bac + le bouton Encaisser ne s'affichent que si `P.bac>0`** —
  réservé au **charbonneur** embauché plus tard (corner qui tourne en ton absence → recette à
  ramasser). Le ledger + le HUD « liquide » donnent déjà le retour visuel.
- **Fix double-poignée (1er connect)** : la cause — le tiroir fermé était poussé par un
  `translateY(115%)` (% de sa **hauteur mesurée**), appliqué avant que le layout iOS ne soit
  stabilisé au 1er paint → il restait partiellement visible (2e poignée) jusqu'à la 1re
  interaction. Fix **structurel** : tiroir fermé = **`display:none`** (retiré du flux) → une 2e
  poignée devient *impossible*, zéro dépendance à une hauteur mesurée. Ouverture = `display:block`
  + reflow + slide-up (`.on`, `translateY(0)`) ; fermeture = slide-down puis `display:none` après
  l'anim. La poignée `.cpeek` reste seule visible quand c'est fermé. (Headless ne reproduisait pas
  le bug — spécifique au timing iOS — d'où le choix d'un fix qui ne dépend d'aucune mesure.)

Correction du retour joueur « mais le corner peut être tenu toute la journée » : le
ciel ne mappait que **20h → 04h** (soirée), donc il faisait *toujours* nuit. Refonte
en cycle jour. Première passe **08h → minuit** (16h éveillées) ; à la question « on ne
couvre pas minuit → 8h ? », arbitrage joueur = **vrai cycle 24h**.

- **Heure in-game** : `cornerHourN(t) = t·24` → la journée court de **00h à minuit** (24h,
  `t = S.dayAcc/DAY_SEC_REAL`). La journée ouvre en nuit profonde, aube ~6h30, etc.
- **Ciel par paliers** : `SKY_ANCHORS` (heure → top/mid/horizon rgb), interpolés selon
  l'heure. Ajout des paliers d'**aube** (5h nuit profonde, 6h30 horizon rosé/orangé =
  lever) pour que le matin ne soit pas un fondu linéaire depuis le noir. Midi = bleu
  clair ; 18h30 = horizon orangé (coucher) sur ciel violet ; 21h→minuit = nuit noire.
  `cornerSky(h)` prend une **heure** (0–24).
- **Facteur `--night`** (`cornerNight(h)` : 0 le jour, 1 la nuit ; rampe symétrique à
  l'aube 6h→8h et au couchant 16h→20h) posé en CSS var sur `#cScene`. Le **lampadaire**
  (cône `.ccone` + halo `.clamp::after`) et les **fenêtres allumées** (`cornerLitWindows`)
  s'éteignent le jour, se rallument la nuit → `opacity:var(--night,1)`. Label heure :
  🌤️ le jour, 🌙 la nuit.
- Vérif headless : nuit profonde 02h, aube rosée 06h30, midi bleu clair, crépuscule
  orangé 18h30, nuit lampe+fenêtres 22h.

---

## 2026-07-24 — Retours session : PNJ la norme, ciel jour/nuit, poignée collée

- **PNJ anonymes = la norme** : `ANON_SHARE` 0.62 → **0.85** (les archétypes nommés
  deviennent rares, le sel). Retour joueur : les random fonctionnent bien.
- **Ciel de la scène reflète l'heure in-game** : `#cScene` prend un dégradé calculé
  depuis l'avancée de la soirée (`S.dayAcc/DAY_SEC_REAL`) — crépuscule chaud
  (rosé/violet, 🌆 20h) → nuit noire (bleu sombre, 🌙 03h). Label heure en haut à
  droite (`.chour`). Le ciel avance en direct via `cornerSkyPatch()` dans `pdvPatch`.
- **Poignée collée au dock (fini l'espace vide)** : la vraie cause — `#stage` (absolute
  inset:0 dans `#main` flex:1) se termine **pile au-dessus du dock**, pas au bas de
  l'écran. Positionner à `bottom:dockH` sur-élevait d'une hauteur de dock (le trou).
  Corrigé : panneau + poignée à **`bottom:0`** (= haut du dock, collés) ; fermé =
  `translateY(115%)` **clippé par `#stage overflow:hidden`** → caché proprement (plus
  de mesure de dock, plus de « bout qui dépasse »). Carte client à `peek+8`.
  Vérif headless : gap poignée↔dock = 0px.

---

## 2026-07-24 — Tiroir corner → panneau roulant avec poignée persistante

Suite des retours tiroir : « il a disparu », « impossible de le dérouler, retour
auto ». Diag : (1) sur écran court, le bas du tiroir passait **derrière la barre
du bas** (fix : le tiroir repose sur le dock, `bottom=hauteur dock`) ; (2) une fois
replié (caché), **rien à attraper pour rouvrir** — le swipe ne gère que la fermeture,
d'où « retour auto ». Le « Gérer » rouvrait bien (vérifié) mais le geste de tirage
manquait.

Refonte en **panneau roulant robuste** :
- Une **poignée persistante `.cpeek`** (« ⌃ Le corner · gérer ») reste **toujours
  visible** au-dessus de la barre du bas quand le panneau est fermé — **tap OU
  glissement vers le haut** = ouvrir. Elle ne disparaît jamais.
- Panneau **ouvert** = plein (classe `.on`, `translateY(0)`) ; **fermé** = caché
  (`translateY(110%)`) + poignée visible. Glisser l'en-tête vers le bas = fermer.
- Ouverture/fermeture pilotées par **classe** (pas de mesure de hauteur fragile) ;
  la poignée est un élément **display-based** (peint partout de façon fiable).
- Carte client (`#cActive`) **remontée** au-dessus du dock + poignée (plus jamais
  cachée par la barre du bas non plus).
- Note test : en **headless**, `translateY(110%)` déclenché par un simple changement
  de classe ne se **repeint pas** de façon fiable (artefact puppeteer — un cas
  minimal identique, lui, se cache bien) ; sur **appareil réel** le masquage marche
  (c'est ce que le joueur voyait « disparaître »). Logique vérifiée : replié→tap/
  pull-up→ouvert→swipe-bas→replié, transitions correctes. Smoke vert.

---

## 2026-07-24 — Personas (étape 1+2 + PNJ anonymes) + trieuse masquée : FAIT

- **Personas enrichis (étape 1).** Chaque `CORNER_PERSONAS` porte un `tell` lisible
  (affiché sous le nom, œil 👁️) + sa propre `bank` (arrive[] + react{deal/nego/walk},
  fallback `TXT`/`REACT`). `makeOffer` renvoie `tell` et pioche la banque ; `reactLine`
  prend le persona en 3ᵉ arg. Fini le copier-coller entre momo/inès/bilal.
- **Louche en gradient (étape 2).** `LOUCHE` porte `cop` + `tell`. `makeLouche` renvoie
  les deux. cop:true = vrai flic (te sonde) → vendre `+heat`, refuser `+discrétion` ;
  cop:false = **pigeon légitime** (cite un contact / ne demande rien) → vendre = grosse
  vente propre **sans chaleur** (+reput), refuser = vente perdue **sans malus** (R1).
  Le flair devient une lecture apprenable (R4). Carte : le `tell` + « flic, ou client
  chelou ? ».
- **PNJ anonymes.** `kind:"anon"` (tables TOL/BUDGET/OFFER/PATIENCE + `ANON_SHARE:0.62`).
  `cornerSpawn` tire ~2/3 anonymes (nom/avatar génériques `PDV_NAMES`/`PDV_AV`, petite
  dose, ouvre au menu, réplique minimale `ANON`, tag PASSANT, « de passage », pas de
  relation) / ~1/3 personas nommés. Le volume vs le sel. `makeAnon` déterministe.
- **Trieuse masquée** (`SORTER_ENABLED=false`) : onglet Liquide + bouton carte +
  upgrade « Compteur » retirés, pill « propre » du HUD masquée, `pushBills` et l'auto-
  compteur neutralisés (sinon un `dirty→cash` fantôme). Le core loop reste 100 % liquide.
  À ressortir plus tard en **inventaire** (réfs Schedule I / DDS).
- Rétro-compatible (kind/usual intacts, nouveaux champs optionnels) → **pas de bump**
  `SAVE_VERSION`. `node --check` + unit-test node (makeOffer/makeAnon/makeLouche/reactLine)
  + smoke : tout vert. *Reste* : étape 3 (traits heat/qualité/temps) + étape 4 (crédit).

---

## 2026-07-24 — Retours de test : scène, tiroir, pricing, tri→inventaire, personas

Gros lot de feedback joueur (4 axes). État :

- **Scène corner « tronquée » → corrigé.** Bande de ciel morte en haut, immeubles
  qui flottaient (surtout tiroir ouvert). Horizon abaissé (34→28 %), immeubles
  montés (h 36/44 → 60/68 %) : la rue remplit le cadre, sol de premier plan gardé.
- **Tiroir « Gérer » : swipe-down pour cacher.** Ajout d'une poignée (`.cdrawer-grab`)
  + drag pointer : glisser le tiroir vers le bas le referme → la scène respire
  (idée joueur : « hide ce menu, plus de place à la scène »).
- **Gérer les prix → fait (v1).** Spec joueur : prix fixé **à la main** (€/g,
  steppers dans le tiroir), affiché sur le **menu du corner** + les **stories
  SnapShit**, avec le **prix du marché** (`cornerFair(reput)`) en référence. Le
  **prix pilote la demande** (R4 : `pdvDemande` = f(prix/marché) — cher → moins de
  clients). Décision clé : le marché ne pilote QUE la demande ; la **négo est calée
  sur TON menu** (offres, bande « juste », tolérance `cornerTol(base=prix)`), le
  **budget** reste la poche absolue du client. Sinon, prix > marché rendait la bande
  juste inatteignable. Menu réglable en place (patch, tiroir ne se ferme pas).
  *Reste* : prix par format indépendant (v2), marché variable selon concurrence (plus tard).
- **Tri de monnaie → à repousser (confirmé).** `buyPain`/`buyUp`/chouffes tournent
  au **liquide** ; depuis la coupe de la dette, le **propre** (sortie de la trieuse)
  n'a plus d'usage → billets bloqués (liasse = 5 identiques, le reste coince pour
  rien). Plan : masquer la trieuse tôt, la ressortir **plus tard en inventaire**.
  Réfs joueur (Schedule I / Drug Dealer Simulator) : sac à dos à **capacité
  poids + volume**, slots, drag'n'drop, badges de quantité, **deux poches d'argent**
  (cash/carte). Cible pour la refonte tri→inventaire.
- **Personas clients trop caricaturaux → refonte (copywriter).** Diagnostic : la
  « personnalité » = un `kind` (bucket de prix), le comportement n'est jamais par
  personne → momo/inès/bilal mécaniquement identiques ; un seul axe vit (le prix) ;
  louche = même gag ×3. Proposition livrée : roster de **11 archétypes** portant
  chacun un axe nommé (relation/qualité/temps/marge/heat/discrétion/crédit/lecture),
  `tell` lisible déterministe + banque de répliques propre, et **louche en gradient
  à 3 cas** (vrai flic `cop:true` / pigeon légitime `cop:false` / rôdeur rival) — le
  flair devient une lecture apprenable (R4), rater = frustration légère (R1). Intégra
  staged : (1) `tell`+`bank` par persona + afficher le tell [zéro risque moteur],
  (2) gradient louche, (3) axes heat/qualité/temps via `traits`, (4) mode crédit
  (touche la save → bump `SAVE_VERSION`). Tout rétro-compatible (kind/usual intacts).
  **Ajout demandé** : des **PNJ anonymes** (`kind:"anon"`, pas de `cid`/relation,
  nom+avatar génériques, petite dose, accepte vite au menu, réplique minimale) mêlés
  aux personas nommés — ~2/3 anonymes (le volume) / ~1/3 personnages, tirage
  déterministe (hash seq/jour). Les têtes connues = le sel, pas la totalité.

---

## 2026-07-23 — Coupe de la Phase A + intro : go direct à la core loop

Retour de test tranchant : en Phase A (charbonneur salarié), **on ne fait rien
à la main** — les silhouettes se font servir toutes seules pendant qu'on regarde.
Ça contredit frontalement **R3 (le tactile EST le plaisir)** : un onboarding en
pilote auto, c'est l'inverse du jeu. Décision joueur : **couper la Phase A et
l'intro, démarrer directement dans la core loop.**

Changements :

- **Départ en Phase B (indépendant), sans intro.** `shelterDefaults()` :
  `phase:"B"`, `introSeen:true`. `defaultState()` amorce **1 plaquette 100 g**
  dans la planque. Boucle dès J1 : **couper (Atelier) → écouler au corner (négo)
  → encaisser → racheter un pain**. Un simple toast d'amorce (« Une plaquette
  t'attend — coupe-la à l'Atelier, écoule au corner »), plus aucune carte/cinématique.
- **Pas de dette** (cohérent avec la ligne « salaire » suivie jusqu'ici et R1) :
  on garde la marge, on rachète quand on a le liquide. Le système de dette reste
  dormant dans le code (`grantOpeningFront`/`repayDebt`) pour un usage futur.
- **Suppressions** : carte d'intro Karim (`renderIntroCard`/`acceptFront`),
  bascule `buyPremierePlaquette` (#buyPlaq/#buyPlaq2), branche Phase A de
  `renderCorner` (bannière charbonneur, chip salaire, appro auto Karim dans
  `pdvTick`, salaire en fin de service dans `advanceDay`), CSS `.intro-card`.
  Constantes `PDV_KARIM_*` retirées ; `CHARB_WAGE` conservée (réservée : coût
  d'embauche d'un charbonneur plus tard). `renderPDV` → toujours la scène rue.
- **Débit auto conservé** mais réservé au *charbonneur embauché* (futur) : la
  vanne de délégation R6 (déléguer la répétition sans plaisir), pas l'onboarding.
- **SAVE_VERSION 25 → 26** (reset propre : nouveaux défauts phase/pain).
- **Debug** : boutons Phase A/tuto remplacés par « Kit test (stock + liquide) ».
- **Smoke** : les tests Phase A (salaire) et A→B (plaquette) remplacés par un test
  « départ direct » (boot sans save → 1 plaquette, phase B, zéro intro, corner qui
  s'ouvre direct en négo). Tout vert.

---

## 2026-07-23 — Le Corner : scène rue en Phase A + retour ↩ réparé

La mise en scène rue (Option B, plein écran) était **réservée à la Phase B**
(indépendant). Le joueur ne voyait donc **rien de la rue** pendant tout
l'onboarding charbonneur. Deux bugs remontés en test : *« c'est coupé comme
visuel »* et *« impossible de revenir à l'écran d'accueil »*.

Corrections :

- **Scène en Phase A aussi** (choix « Option b » du joueur). `renderPDV()`
  appelle **toujours** `renderCorner(P)` ; ce dernier branche sur `phase` : en A,
  bannière **charbonneur** (recette à Karim, salaire `${CHARB_WAGE}`/service, CTA
  1ère plaquette) + silhouettes **auto-servies** ; en B, négo au client + tampon.
  Les clients anonymes de la Phase A ont maintenant un **avatar** (`PDV_AV`) et
  peuplent la scène (`cornerLayoutPersos` appelé dans le tick auto).
- **Retour ↩ réparé** : le backdrop du tiroir (`.cdrawer-bk`, z19) couvrait la
  barre du haut (`.ctop`, z6) → le bouton retour était **inatteignable** tiroir
  ouvert. `.ctop` passe **z-index 22** (au-dessus du tiroir). Confirmé cliquable
  en diag headless.
- **Robustesse** : `.cscene{width/height:100%}` (plein cadre garanti) ;
  `cornerSilhouette` tolère un avatar manquant (`av||"👤"`) ; garde `chouffes||0`
  dans le calcul de heat (un save legacy sans `chouffes` ne casse plus le compteur
  → fini le `🔥 NaN`). `advanceDay` re-render la scène (salaire/plaquette à jour).

Le *« coupé »* venait du tiroir ouvert masquant le bas de la scène (pas d'une
scène tronquée) : la scène est bien pleine (immeubles à mi-hauteur, sol en bas,
tag CORNER). Smoke complet vert (scène A+B, négo, salaire, bascule A→B, modes 2b).

---

## 2026-07-23 — Le Corner 2b (suite) : louche, grimace, ambigu, hésitant

Les modes de client qui manquaient à la négo, portés du proto :

- **Louche** (Papers Please) : profil cramé qui **surpaie ×1.3 sans discuter**
  (un indice). Apparaît à partir de **J2** (déterministe, un seul à la fois,
  `LOUCHE_CHANCE`). Carte spéciale : **Vendre → chaleur +20** (`HEAT_LOUCHE`,
  pas de relation/combo) ; **Refuser → discrétion** (`FLAIR_BONUS` en liquide).
- **Grimace à mi-négo** (Recettear) : pendant la contre-offre, la **tête du
  client réagit en direct** au prix réglé (😍/😊/😏/😬/😤), déterministe
  (`corner.negoFace`). Le **louche ne réagit pas** (😐) — un tell de plus. Le
  skill = lire le visage.
- **Ambigu** (Good Pizza) : un régulier a parfois une demande **sans quantité**
  (« de quoi tenir le week-end »). Le joueur **compose** (steppers barrettes) ;
  **bien lu** (grammes == attendu) → pourboire + combo ; sinon **vendu quand
  même**, récompense réduite (R1, pas de punition).
- **Hésitant** (Moonlighter) : « je sais pas ce qu'il me faut » → **son habituel**
  (réponse perso, pourboire + relation) **ou** un petit ; toujours converti.

Détails :

- `corner.mjs` : `makeOffer` renvoie un **`mode`** (offer/hesit/ambig), +
  `makeLouche`, `negoFace`, templates AMBIG/LOUCHE, réactions lu/mouais.
  Logique pure testée en node (modes, faces, surpaie louche).
- `index.html` : `cornerSpawn` gère louche + modes ; `renderCornerActive`
  branche 6 cartes ; `cornerAct` route les nouvelles actions ;
  `cornerResolveLouche/Hesit/Ambig` + `cornerFlair` + `cornerSell` (débit tampon
  commun). Patience : gèle seulement pendant négo/dernier prix (les autres
  attendent et peuvent partir).
- `SAVE_VERSION` **24 → 25** (forme du client en file enrichie). Smoke étendu :
  louche→flair (+25), hésitant→vente+relation, ambigu bien lu→vente+combo. Vert.

**Reste** (fin de 2b / étape 3) : bilan de nuit fusionné (lignes ventes/JUSTE/
négo/lu/combo/passés/louches), graphe social (déblocage de contacts à rel ≥ 40),
puis SnapShit (grossistes → DM) + charbonneur embauché (spec §6).

---

## 2026-07-23 — Le Corner dans La Loupe : la mise en scène rue (Option B)

Retour de Sylvain : « pourquoi on a pas le background de corner du proto ? » —
je l'avais reporté à 2b. Choix **Option B** (scène plein écran, comme le proto,
vs bandeau). Porté :

- **Scène plein écran** en Phase B : `#stage.corner-mode` (plein cadre, sans
  scroll) → décor nuit (ciel dégradé, **deux barres avec fenêtres allumées
  déterministes**, **lampadaire + halo**, cône de lumière, sol, tag `CORNER`).
- **Silhouettes en file** (`.cperso`) = les clients de `P.queue` : l'actif
  s'avance sous le lampadaire (anneau bleu), la file s'étage dans des `SLOTS`,
  jauge de patience sous chaque silhouette. Entrent par la droite, sortent à
  gauche (servi) / droite (parti). `cornerLayoutPersos` positionne chaque frame
  (transitions CSS pour la fluidité), map runtime `client → DOM` (pas persistée).
- **Priorisation** (Overcooked) : **taper une silhouette de la file** la passe
  en tête (`cornerPrioritize`).
- **Carte du client actif** = slide-up en bas (`#cActive`) au lieu d'une carte
  dans le flux. **Contrôles rangés dans un tiroir « Gérer »** (`#cDrawer`) :
  menu, tampon, ravito, encaisser, chouffes, ledger — la rue reste lisible.
  Bandeau haut : retour, menu €/g, heat, combo.
- `renderPDV` **scindé** : Phase A = cartes (charbonneur salarié) ; Phase B =
  `renderCorner` (scène). `render()` retire `corner-mode` en sortant.
- **Aucun changement de save** (scène = pure UI, `SAVE_VERSION` reste 24). Smoke
  étendu : scène + **2 silhouettes** présentes, carte active, accepter → vente,
  contrer → JUSTE+combo, encaisser via le tiroir. Vert. Capture vérifiée à l'œil.

**Toujours reporté** (2b, suite) : louche (heat) + grimace à mi-négo, ambigu,
hésitant, bilan de nuit fusionné, graphe social. Puis étape 3 : SnapShit +
charbonneur embauché.

---

## 2026-07-23 — Intégration Le Corner → La Loupe : étape 2 (la négo présentielle)

Le cœur du branchement : en **Phase B présent**, la vente auto laisse place à la
**négo au client** (plan steps 3-4). Phase A (salarié) et auto (charbonneur
embauché) gardent le débit auto — le branchement se fait par `pdvTick`.

- **Nouveau module `la-loupe/corner.mjs`** (comme `shelter.mjs`/`snap.mjs`) :
  logique pure + tuning (`CORNER` déplacé ici depuis index.html, une seule
  source), personas, et surtout `resolveOffer()` — la **résolution déterministe
  des zones** (marge 😍 / JUSTE 🤝 / bien négocié 😏 / abus 😒 / contre / walk).
  Testé en `node` : counter→dernier prix, gouge, nego/marge, JUSTE+combo. Vert.
- **`pdvTick` branché** : `nego = (phase==="B" && held)` → `cornerNegoTick`
  (arrivées personas lentes, patience file/actif, carte active) au lieu de
  `pdvServe`. Le geste de vente auto (`pdvServe`) est **intact** pour les autres
  cas (respecte le périmètre convenu avec la session Le Corner).
- **UI carte client** dans `renderPDV` Phase B : offre vs menu (chip `offerQual`
  coloré), **Accepter / Contrer (steppers de prix) / Refuser**, jauge de
  patience mise à jour par frame sans reconstruire la carte. La vente **débite le
  tampon** (barrettes) → **bac** (liquide) ; relations (`S.clients`), réput,
  réservoir clients et **combo** ⚡ (pourboire JUSTE) suivent. Le slider de prix
  et le menu déception (advQ) sont retirés en Phase B : la négo porte le prix.
- **R1/R4 respectés** : refuser/rater = vente perdue, jamais de malus sec ;
  zéro `Math.random` (hash déterministe côté `corner.mjs`). Abus 2× → le client
  ne revient plus (`quit`).
- `SAVE_VERSION` **23 → 24** (client `P.queue` = personas ; `P.combo`, remis à 1
  à la clôture de soirée). Smoke étendu : carte affichée, **accepter → vente**
  (bac↑, tampon↓, relation↑), **contrer → JUSTE + combo + pourboire**, + Phase A
  salaire et bascule plaquette toujours verts.

**Reporté à l'étape 2b** (pas encore branché, `makeOffer` renvoie `null` pour
l'hésitant) : demandes ambiguës, hésitant, **louche** (heat), **grimace** à
mi-négo, **priorisation** (tap la file), mise en scène rue, bilan de nuit fusionné,
graphe social (déblocage de contacts). Puis étape 3 : entonnoir SnapShit +
charbonneur embauché (spec §6).

---

## 2026-07-23 — Intégration Le Corner → La Loupe : étape 1/… (fondations + menu)

Feu vert de Sylvain pour brancher le banc d'essai `le-corner/` dans La Loupe, en
suivant `le-corner/INTEGRATION.md`, **par étapes** (1 étape = 1 PR). Calages :

- **Arbitrage tranché** (friction plan ↔ code que j'ai remontée) : la **négo
  présentielle** (marge, pourboires, relations) est un **système de Phase B**
  (indépendant). En **Phase A** (charbonneur salarié de Karim) : pas de négo,
  tu écoules pour un salaire fixe (= leur spec §6 vécue de l'intérieur). Fidèle
  à *employé → patron*.
- **Coordination** : je pilote côté `la-loupe/` ; la session Le Corner reste sur
  `le-corner/` (banc d'essai **gardé intact** dans le hub, utile pour itérer la
  vente sans toucher au jeu). Évite la collision §9.
- **CFG transposé tel quel** : bloc `CORNER` en tête de module La Loupe (une seule
  source de tuning), + `CORNER_PERSONAS`, `CORNER_TAG`.

Livré cette étape (fondations, **aucun changement de gameplay** — plan steps 1-2) :

- **`SAVE_VERSION` 22 → 23** + table **`S.clients`** (relations/déblocages,
  seedée depuis les personas, migration douce).
- Helpers portés (dormants tant que la négo n'est pas branchée) : `cornerFair()`
  (= même formule que `snap.mjs`, un seul barème), `cornerTol`, `cornerBudget`,
  `offerQual` (écart % au menu). Sanity math OK (fair 6→8→10→14 selon réput).
- **Menu affiché** sur le corner Phase B : tes prix par format (2/5/8 g) dérivés
  de la réput — la future référence de la négo. Affichage seul.
- Piège corrigé en route : les `const CORNER*` étaient déclarés APRÈS
  `defaultState()` qui les utilise → TDZ. Bloc remonté avant `defaultState`.
- Smoke : check menu présent ; **la version de save est désormais lue depuis la
  source** (`SAVE_VER`) pour ne plus casser à chaque bump. Vert.

**Prochaine étape (2/…)** : file + carte client + patience à la place de la vente
auto quand présent (Phase B), puis la négo complète (zones, contre-offre, grimace).

---

## 2026-07-23 — La Loupe : onboarding charbonneur → indépendant (Phase A/B)

Gros recadrage de l'ouverture après test (retours de Sylvain). L'arc de départ
devient **employé → patron**, et le corner **demande la présence** du joueur
(l'autonomie « charbonneur » d'avant est l'état d'**après** embauche, pas le
défaut — gardée dormante derrière `S.upgrades.charbonneur`).

- **Phase A — charbonneur salarié** (`S.shelter.phase="A"`) : Karim **approvisionne
  le corner** (réappro auto du tampon en 2 g tant qu'on le tient), on **vend pour
  lui**, la recette est **à lui**. En **fin de service** (clôture de journée), la
  recette part chez Karim et il paie un **tarif jour** `CHARB_WAGE=80` en
  **liquide**. Pas de dette : c'est un **salaire**, pas un front. (Le front à
  crédit `grantOpeningFront`/`repayDebt` reste dans `shelter.mjs`, **dormant**,
  pour un futur achat de pain à crédit.)
- **Bascule A→B** : quand on a assez de liquide de côté, bouton **« T'offrir ta
  1ère plaquette (100 g) »** payée **en liquide** (`PAIN_100.price=200`) →
  `phase="B"`, Karim reprend ses barrettes (tampon remis à zéro), on a un pain à
  couper.
- **Phase B — indépendant** : corner à soi (tampon/ravito/encaisse/prix/menu),
  coupe manuelle, revente (marge à soi), **rachat de pain**.
- **Symétrie** : le tarif jour qu'on **encaisse** en A = ce qu'on **paiera** pour
  **embaucher** un charbonneur plus tard (hook `S.upgrades.charbonneur`).
- **Couteau (gatekeep coupe)** : nouvel upgrade `couteau` (`UPG.couteau`, max 4).
  `cutCap()` plafonne la taille de coupe par niveau — `CUT_CAPS=[2,5,8,12,20]` :
  au début **2 g only**, les paliers 5 g/8 g se débloquent (colle au canal
  SnapShit « grosses commandes 5 g+ »). Sélecteurs bornés + presets 🔒.
- **Tout en liquide en début de partie** (validé avec Sylvain, blanchiment plus
  tard) : `buyPain`, l'appro (overlay + 2D) et les **upgrades** (`buyUp`) passent
  de `S.cash` (propre) → `S.dirty` (liquide). `START_CASH=0` (charbonneur fauché).
  Le tri/propre reste pour le blanchiment tardif. ⚠ Extrapolation à surveiller.
- **Phrase Karim** « Crédit = je dors pas » supprimée (vestige de l'ancienne
  double tarif) ; l'intro devient le **pitch charbonnage**.
- **Swipe atelier inversé corrigé** : convention carrousel — **swipe ◂ = avancer
  au conditionnement**, **swipe ▸ = revenir couper** (2D + 3D `scene3d`, hook
  `onSwipeRight`→`onSwipeToBag`).
- `SAVE_VERSION` **21 → 22** (reset propre). Smoke `smoke-loupe-pdv` étendu :
  Phase B (présence/fermé/encaisse/déception) + Phase A (appro Karim + salaire) +
  bascule plaquette. Isolation localStorage par page (même origine). Vert.
- **Périmètre** (coordination autre agent) : je n'ai **pas touché au geste de
  vente** (`pdvServe`, la file) — l'autre agent gamifie ça. Le corner reste un
  joint : `pdvServe` remplit `P.bac`, et la Phase décide à qui appartient ce bac.

---

## 2026-07-23 — Le Corner : banc d'essai de la vente au DM (pré-intégration La Loupe)

Constat de Sylvain : dans le jeu de deal, la vente est automatique → zéro juice.
Analyse concurrentielle menée en session (jeux de deal / shopkeepers / jeux de
service, rapports détaillés en conversation) puis prototype **séparé**
(`le-corner/`) pour fine-tuner AVANT d'intégrer à La Loupe. Mécaniques testées,
chacune volée à un jeu précis :

- **Contre-offre** (Schedule I) : DM = qty + prix offert ; Accepter / Contre
  (compose les sachets + steppers de prix, « prix fair » affiché) / Refuser.
  Budget et tolérance €/g cachés par archétype × relation.
- **« Je te dis »** (TCG Card Shop Sim « Let Me Think ») : différer sans
  refuser — gel de patience 8 s puis fonte ×1.6.
- **Réactions emoji à paliers + « 2 abus d'affilée → il part »** (Moonlighter) :
  😍 marge laissée / 🤝 JUSTE / 😒 il paie mais relation− / 🤬 parti.
- **Prix JUSTE** (Recettear pin/just combo) : fair ±10 % accepté du premier
  coup → pourboire × combo ⚡ (reset si raté/expiré). Récompense la justesse,
  pas le max — R4-compatible (bonus, jamais malus).
- **Demandes ambiguës** (Good Pizza) : « de quoi tenir le week-end » → composer
  les grammes, prix auto au fair ; bien lu = pourboire, mal lu = vendu quand
  même (R1 : récompense réduite, pas de punition).
- **Hésitant** (Moonlighter « Indecisive ») : convertit toujours si on s'en
  occupe ; la réponse personnalisée (son grammage habituel) paie plus.
- **Louche** (Papers, Please) : indices déterministes (voussoiement, gros
  volume d'entrée, demande ton spot, surpaie ×1.3 sans discuter). Refuser =
  bonus discrétion ; vendre = chaleur +20 (décrue −8/soirée).
- **Clients persistants + graphe social** (Schedule I) : relation → budget ;
  relation ≥ 40 → « te présente un pote » (Diego/Lina/Nassim verrouillés).

Choix techniques : DOM pur (pas de Three.js — c'est une UI de messagerie),
`corner_*` + `SAVE_VERSION`, zéro Math.random sur l'état (hash jour/index),
temps réel non clampé (leçon La Loupe), tout le tuning dans un objet `CFG`
commenté en tête de module. Captures : `tools/shots-corner.mjs` (home → DMs →
contre-offre → réaction → rapport → soirée 2 avec louche).

Bug attrapé en capture : les louches spawnaient à qty 0 → accepter payait 0
(division NaN). Corrigé : qty par template + offre ×1.3 fair.

**v2 — retour de test tel (même jour)** : « la scène se passe sur un corner de
quartier de barre d'immeuble, pas sur le téléphone » + « on doit voir les prix
affichés (le menu) pour juger l'offre du client ». Deux réponses :

- **Mise en scène rue** : nuit, deux barres avec fenêtres allumées
  (déterministes par soirée), lampadaire + halo, tag CORNER. Les clients sont
  des silhouettes qui arrivent dans la rue et font la **queue** ; l'actif
  s'avance sous le lampadaire, sa demande s'affiche en carte en bas. **Taper un
  client de la file = le servir en premier** (priorisation à la Overcooked).
  « Je te dis » = il s'écarte physiquement (fond de file). Servi → part à
  gauche ; fâché/expiré → repart à droite. La file s'impatiente un peu moins
  vite que le client servi (`QUEUE_MELT` 0.8).
- **Le menu affiché** : barre permanente sous le HUD — TES prix par format
  (fair×f) + stock restant. L'offre du client porte son **écart vs menu**
  (« −39 % menu », « prix menu », « +30 % ») en couleur. L'info demandée :
  juger l'offre d'un coup d'œil, le skill se déplace du calcul mental vers la
  décision.

Bug réel attrapé au passage : les IDs de DM repartaient à 1 chaque soirée et
`removeDM` nettoie la file en setTimeout (1,4 s) → les timeouts d'expiration
de la soirée N tombaient au début de la soirée N+1 et **supprimaient les
homonymes de la nouvelle file** (silhouette zombie affichée, absente de la
file). Correctif : IDs `d<jour>_<i>` + garde `run === G` dans le timeout.

**v3 — décisions de Sylvain (« ça marche vraiment bien »)** : la récompense du
présentiel est actée comme centrale, et elle passe par la **négo à la hausse** ;
l'entonnoir client est validé, avec l'idée de **convertir les radins fidélisés
en charbonneurs** ; soirée trop courte, pas assez de monde. Implémenté :

- **Palier « bien négocié » 😏** : vendre au-dessus du menu jusqu'à ×1.35
  (`NEGO_MAX`) n'est plus un abus mais LA marge du présentiel — ni bonus ni
  malus de relation, la récompense EST la marge (l'auto vendra au menu, la main
  vend au-dessus). Tolérances relevées pour ouvrir l'espace de négo (réguliers
  1.12→1.35, accros 1.25→1.5, hésitants 1.05→1.2 ; radins/grossistes inchangés
  — leur identité est de payer sous le menu). L'abus (moue, streak « 2 → il
  part ») ne subsiste qu'au-delà de ×1.35, donc surtout en pressant les accros.
  Nouvelle ligne au rapport ; le choix marge (négo) vs pourboire×combo (JUSTE)
  devient un vrai arbitrage.
- **Radin fidélisé → charbonneur** (R6, le choix du joueur) : un lowball à
  rel ≥ 45 (`CHARBON_REL`) propose de charbonner. Au home : « Laisser Yaz tenir
  la soirée » → soirée **déléguée simulée** : il vend au prix que proposent les
  clients (zéro négo), commission 25 %, zéro pourboire/relation, et il sert
  les **louches sans sourciller** (chaleur). Le rapport comparé rend la marge
  du présentiel mesurable. Testé headless : proposition → bouton → rapport,
  net +283 vs brut 378, 1 louche servi, zéro erreur.
- **Soirée 120 → 180 s**, DM 7-13 (au lieu de 5-9), 3 ambiguës max, stock
  86 g (8×2 + 6×5 + 5×8). Trois personas de plus : Bilal (CLIENT, présent dès
  le début), Kenza (RADIN, présentée par Yaz — le réseau des radins), Léa
  (HESIT, présentée par Sofia). **Migration douce** de la save : les clients
  manquants sont backfillés au load, pas de bump.

**v4 — grimace, tolérance, et préparation du branchement** (retours suivants) :

- **Grimace à mi-négo (Recettear)** : pendant la contre-offre, la tête du
  client réagit EN DIRECT au prix réglé — 😍 belle affaire / 😊 prix menu /
  😏 il suit / 😬 il grimace (à 90 % de sa tolérance) / 😤 refus ou hors
  budget. Déterministe (R4) : le skill devient lire le visage, pas deviner le
  chiffre. Le **louche ne réagit pas** (😐 « Aucune réaction… bizarre ») — un
  indice de plus, listé au rappel.
- **Tolérances redescendues** (×1.35 jugé trop haut) : `NEGO_MAX` 1.35 → **1.2**,
  réguliers 1.35 → 1.2, accros 1.5 → 1.35, hésitants 1.2 → 1.15. La zone d'abus
  ne subsiste au-dessus de ×1.2 que chez accros/hésitants.
- **Recrutement retiré du proto** (charbonneur v3 : proposition, bouton, soirée
  déléguée) : ça sera porté par le système d'**embauche de La Loupe**
  (`S.upgrades.charbonneur`, hook posé au recentrage). La v3 reste la spec.
- **`le-corner/INTEGRATION.md`** : plan de branchement complet dans La Loupe —
  horloge unique (la soirée = le jour), remplacement de la vente auto du PDV
  par la file quand présent (hook « fermé hors présence »), menu sur l'éco
  réelle, zones de négo, clients persistants + entonnoir corner → SnapShit,
  spec charbonneur, liquide/heat/bilan fusionnés, ordre d'implémentation en
  7 étapes et points de vigilance (collision avec le loop minimal en chantier).

---

## 2026-07-23 — La Loupe : recentrage — présence au corner, loop minimal, dette 280/4j

Après coup, Sylvain recadre : « ça me va que le joueur fasse tout lui-même durant
les premières actions » — mais **le corner demande explicitement sa présence**.
L'autonomie notée juste avant est en fait l'état d'**après** embauche, pas le
défaut. On revient donc sur la direction :

- **Présence requise au corner** : au début, le charbonneur c'est **toi** — tu ne
  vends au corner que quand tu le **tiens** (écran corner). Le code d'autonomie
  reste, mais **dormant derrière un hook** `S.upgrades.charbonneur` (posé plus
  tard par l'embauche) ; sans lui, le corner est **fermé** quand tu n'y es pas.
- **Le vrai arbitrage (à caler ensuite)** : ta présence est unique → **tenir le
  corner** ⇄ **vendre/livrer sur SnapShit**. Deux niveaux discutés : *soft* (=
  quel écran tu regardes) ou *fort* (= une livraison **coûte du temps** pendant
  lequel le corner ferme). Non tranché — prochaine étape design.
- **Deux canaux qui se différencient** (idée, à confirmer) : le **corner** = détail
  au comptoir, **petites barrettes (2 g ≈ 20 €)**, présence requise, gros volume /
  petit ticket ; **SnapShit** = le canal des **grosses commandes** (min ~**50 € /
  5 g+**), sur DM + livraison, branché **plus tard**. C'est ce qui justifie de
  **parquer SnapShit** maintenant sans le jeter : on le rallumera pour le haut du
  panier, pas pour la vente à la barrette.
- **Loop minimal en cours** : barrettes **2 g** → **corner** → **rembourser
  Karim**. Tranche verticale qu'on veut solide avant d'élargir.
- **Dette Karim simplifiée** (demande directe) : **prix unique 280 propre**, plus
  de rabais « cash tôt » (**200 supprimé**), **4 jours** (front J1 → échéance J4).
  `SUPPLIER.cashPrice`/`creditPrice` → `SUPPLIER.price` ; `repayDebt`, `debtStrip`,
  `openRepay`, la carte d'intro et le rappel de nuit nettoyés en conséquence.
- **Smoke** `smoke-loupe-pdv.mjs` : bascule de « vend hors écran » à **« fermé
  hors présence »** (bac **et** `seq` gelés quand on quitte le corner). Vert.

L'entrée ci-dessous (autonomie « charbonneur implicite ») reste pour la trace :
elle décrit désormais l'état **post-embauche**, pas le comportement par défaut.

## 2026-07-23 — La Loupe : le corner vend tout seul (charbonneur implicite)

Remarque de Sylvain : « théoriquement on a déjà un charbonneur avec le premier
point de vente ». La fiction l'implique déjà — le corner ne devait donc pas se
figer dès qu'on quitte son écran.

- **Fin du présentiel** : `pdvTick` ne se coupe plus quand on n'est pas sur
  l'écran corner (l'ancien `if(!(tab==="shelter"&&shelterSub==="pdv")) return;`).
  Le charbonneur **tient le poste en fond** : la file, les ventes, le bac et la
  Heat tournent tant que l'app est ouverte. Hors-ligne toujours plafonné (rAF se
  met en pause onglet masqué ; `dt` plafonné à 0,05 s → pas de pic au réveil).
  Aligné CADRE (délégation, « puits infini ») et R6/R7 : on délègue la
  **répétition** (charbonner la file), pas la **décision** (prix, menu, ravito,
  chouffes, encaisse).
- **Le corner ne chauffe que s'il tourne** : arrivées clients **et** montée de
  Heat conditionnées à `tampon > 0`. À sec, le corner est « fermé » — plus de
  clients qui s'entassent, la Heat **redescend**. Corrige une punition muette
  qui apparaissait avec l'autonomie (un corner vide se serait cuit tout seul
  jusqu'à la descente, saisie d'un bac vide → interdit par R1).
- **Recette visible depuis la carte** : petit badge `€…` sur le pin corner qui
  suit le **bac de rue** en direct (`pdvBadge`), pour savoir qu'il y a à
  encaisser sans ouvrir l'écran. Caché quand le bac est vide.
- Smoke `tools/smoke-loupe-pdv.mjs` étendu : on quitte le corner, on vérifie que
  le **bac grossit hors écran** (`bgSold`) et que le badge s'affiche. Vert.
- Pas de bump `SAVE_VERSION` : schéma de save inchangé (état `pdv` identique),
  simple changement de comportement — inutile de wiper les sauvegardes.

---

## 2026-07-22 — La Loupe : efficience coupe, achats plus gros, horloge unique

Retours de test tel de Sylvain (session corner-PDV v2) :

- **Découpe répétitive** → **efficience par paliers avant l'auto** (choix de
  Sylvain : un massicot immédiat idle trop vite). Nouvel upgrade **Gabarit**
  (`UPG.gabarit`, max 4) : `cutBatch()=1+niveau` barrettes **par geste** (3D
  `onCut` boucle ; 2D « Couper ×N » / « ×5N »). Le geste reste, le débit monte
  avec l'investissement ; l'automatisation complète viendra plus tard (R2/R9).
- **Impossible d'acheter > 100 g** → gates de standing baissés : Pain 250 **sans
  gate** (dispo d'entrée), Lot 500 gate 65 → 30 (visible dès reput 25).
- **Temps incohérent** (corner temps réel vs SnapShit à la soirée) → **horloge
  UNIQUE** : `advanceDay()` extrait du bouton ; la soirée se clôture **toute
  seule** tous les `DAY_SEC_REAL=90 s` depuis `frame()` (nouvelle demande Snap,
  paie chouffes, dette, hit planque). « Clôturer » devient **⏭ Passer la nuit
  maintenant** (avancer plus vite). Jauge de progression de soirée sur la pill
  « J{n} » du HUD.
- **200+ clients/h** : gardé tel quel (Sylvain : pratique pour tester vite,
  fine-tuning plus tard).
- SAVE_VERSION 20 → 21. Vérifs : `node --check` ; smoke corner (vente/tri/
  déception) zéro erreur ; check features (gabarit acheté, jour 3→4 via bouton).

## 2026-07-22 — Corner PDV v2 : vente par client (file + ledger), barrettes, rush, fix tri

Retours de test tel de Sylvain sur le corner-PDV → refonte :

- **Débit trop lent → rush** : temps de jeu accéléré (`PDV_TIME_COMPRESS`) +
  pics cycliques (`pdvRush()` sinus, badge « RUSH ») + demande boostée par le
  **buzz** (`S.expo`, vitrine). Le corner vit (ex. 266 clients/h en rush).
- **Vente par CLIENT (file d'attente virtuelle)** : `P.queue` de clients
  nominatifs, chacun un panier de barrettes ; arrivées ∝ demande, service à
  `PDV_SERVE_RATE`, patience `PDV_MAX_WAIT` (sinon départ = rupture douce). Sert
  le **ledger** (`P.ledger`, dernières ventes affichées) — on en aura besoin
  pour la suite.
- **Vente par BARRETTE, plus au grammage** : tampon = sachets (unités)
  `P.tampon{taille:n}` ; chaque client débite N barrettes (petites d'abord) ;
  prix = grammes × €/g.
- **Choisir la quantité livrée** : ravitaillement +10 / +25 / Max barrettes
  (planque → tampon exposé).
- **Menu = vitrine SnapShit** : la carte « Menu · vitrine » (qualité annoncée =
  déception) + bouton **Poster la vitrine** (`snap.posterVitrine` → +buzz →
  +demande). Relie le PDV au moteur Snap existant.
- **Fix bug tri liquide** : `Encaisser` ajoutait à `S.dirty` sans créer les
  **billets** (`S.bills`) que la trieuse consomme → trémie vide. Ajout de
  `pushBills(v)` (comme le retour BeuherShit). Vérifié : après encaisse,
  `dirty>0` ET `bills>0`.
- État PDV étendu (`shelter.mjs` : tampon/queue/ledger/…), **SAVE_VERSION 19→20**
  (reset propre). Smoke `tools/smoke-loupe-pdv.mjs` mis à jour (Max, file,
  ledger, tri) : **zéro erreur console**.

## 2026-07-22 — Le corner devient le PDV à 3 curseurs (intégré DANS La Loupe)

Correction de cap : Sylvain attendait le proto **sur La Loupe**, pas dans un
dossier autonome. Le `le-bloc/` standalone est **fondu dans La Loupe puis
supprimé** (carte hub + `tools/smoke-bloc.mjs` retirés). Le **pin « corner »**
de la carte Quartier Nord devient le **point de vente jouable à 3 curseurs**
(Shelter P1) — bouton « Tenir le corner » depuis la fiche du pin.

- **`renderPDV()`** dans `la-loupe/index.html` : Demande / Satisfaction
  (déception annoncé vs livré) / Heat, en temps réel via `pdvTick(dt)` branché
  sur la boucle `frame()` (on tient le corner **en présence** — délégation plus
  tard). Réutilise les classes CSS existantes → rendu natif La Loupe.
- **Stock réel** : vend le **tampon** (sachets stagés au corner, exposés,
  débités de `S.sachets` au ravitaillement, en grammes) → **bac** (liquide de
  rue). **Encaisser** verse le bac dans `S.dirty` (à trier au Liquide). La
  **descente** (seuil de Heat) saisit tampon + bac ; la planque est sauve.
- **Qualité livrée = `S.sachetQ`** ; annoncée = sélecteur (Merdique/Correct/
  Bonne/Top). Prix €/g, chouffes (paie 60 €/soir à la clôture — sinon un part).
- **État** dans `S.shelter.pdv` (défauts dans `shelter.mjs`, migration douce) ;
  **SAVE_VERSION 18 → 19** (reset propre, convention).
- Vérif : `node --check` (module + shelter.mjs) OK ; smoke Puppeteer
  `tools/smoke-loupe-pdv.mjs` (sert en HTTP, seed sachets, carte → corner →
  ravitailler → vente → encaisser → déception) : **zéro erreur console**,
  déception vérifiée (annoncer Q78 en livrant Q62 → réservoir qui fuit).

Le `le-bloc/` reste consultable dans l'historique (commits d3a6e65 / PR #167).
Prochaines passes : rush horaire, charbonneur (délégation = vente sans présence),
2e PDV, puis les autres produits du catalogue VARIETES.

## 2026-07-22 — Le Bloc : 1er proto jouable (le-bloc/, PDV à 3 curseurs)

Premier proto du cadre décidé : **hash seul, 1 PDV, boucle complète**
(`le-bloc/index.html`, 2D DOM+canvas, portrait mobile, préfixe `bloc_`,
SAVE_VERSION 1). Zéro Three.js, zéro hasard d'état. Valide le **cœur du CADRE** :

- **3 curseurs** en temps réel : Demande (clients/h ← réservoir × attractivité
  prix), Satisfaction (contentement = livré vs annoncé, + pénalité prix > juste
  → cible du réservoir, convergence lente), Heat (∝ activité, amortie par les
  chouffes, **seuil déterministe** → descente qui saisit le stock + le bac
  exposés ; ce qui est en planque est sauf).
- **Déception jouable** : sélecteur « qualité annoncée » vs qualité livrée du
  stock ; annoncer plus haut que livré = vente OK mais réservoir qui fuit
  (ligne d'état verte/rouge en direct). Vérifié en headless.
- **Cash exposé/rangé** : les ventes tombent dans le **bac** (exposé, saisi à la
  descente) ; **Encaisser** le rentre en planque. **1er automatisme** : embaucher
  un **porteur** (400 €) qui auto-encaisse — la délégation du geste (R7).
- **Appro Karim** : plaquettes 100 g, 4 tiers de hash (Q12→Q72), 1re à crédit
  (dette 900 €, remboursable sans timer). **Charcler** : +30 % volume, −qualité
  (levier R10, descend l'échelle de VARIETES).
- **Paie** en fin de « jour » (100 s) : chouffes 60 €/j ; pas de cash → un
  chouffe part (pas de game over, R1).

Tous les nombres sont des **constantes nommées** en tête de fichier (à régler).
Outillage : `tools/smoke-bloc.mjs` (Puppeteer — charge, joue appro/charcler/
encaisse/chouffe, vérifie zéro erreur console + capture). Rééquilibrage initial
après 1er run (revenus trop lents) : panier 3 g, corner 150 clients/h.

Prochaines passes possibles : tampon/planque séparés (exposition réglable),
courbe de demande (rush), 2e PDV, pub SnapShit, puis les autres produits.

## 2026-07-22 — Le Bloc : CADRE recentré + VARIETES (catalogue 15 produits)

Longue session de design avec Sylvain (à partir du corpus de recherche qu'il a
réuni : org des réseaux FR, blanchiment, gestion du cash, RH, débit des PDV,
prix). On a **recentré** la proposition SHELTER (trop touffue) dans un cadre
jouable — `la-loupe/CADRE.md` — puis détaillé le système de variétés dans
`la-loupe/VARIETES.md`. SHELTER.md reste comme réserve d'idées.

**CADRE.md — le cœur.** Un PDV = **3 curseurs** : Demande (potentiel du lieu +
pub, segmentée par produit, zéro substitution entre produits), Satisfaction
(qualité du sourcing + prix → réservoir de clients fidélisés), Heat (**seuil
déterministe**, pas de proba — R4 ; repoussé par les chouffes). Prix ~fixé par
le marché → battre un rival coûte la marge (qualité↑ ou prix↓) OU la violence ;
la sortie = **intégration verticale** (posséder la chaîne : sourcer/produire/
distribuer) et **horizontale** (absorber les concurrents). Manuel → automatismes
(embauche + outils). Argent en 3 outils : liquide (paie auto le soir) → hawala
(dark web, services/prod étranger, **caisse noire = corruption qui baisse la
Heat d'un secteur**) → blanchiment (**plafonné par le CA plausible des
façades**). Violence feutrée. Poids = système à part. **Temps réel + hors-ligne
plafonné, actif sans limite** (garde-fou anti-idle). Principe directeur nommé :
**le puits infini** (jamais de mur en jeu actif ; le tactile est le puits).
Échelle **quartier → ville → monde** (la carte partagée = 1 quartier). Arc :
petit jobbeur → producteur-distributeur.

**VARIETES.md — variété = QUALITÉ, pas goût.** 15 produits, chacun une échelle
de tiers (hash, weed, coke, héro, crack, ecsta, MDMA, 3-MMC, kétamine, speed,
méth, tucibi/2C-B, LSD, GHB, champis). 4 stats par variété (qualité, prix,
coût, segment+sensibilité). **Mécanique de déception** (idée de Sylvain) :
annoncé vs livré — sous-livrer n'empêche pas la vente mais **déçoit** (érode le
réservoir ∝ écart × sensibilité), déterministe. Native sur les produits « à
arnaque » (écaille coke, 3-MMC/3-CMC, tucibi, LSD/NBOMe). Quatre ascenseurs de
qualité : production / sourcing d'import / cuisson / synthèse. Pipelines
weed→hash, coke→crack. Ancré sur sources OFDT/presse/Psychoactif.

**Décisions tranchées** (fondations + round 3, détaillées dans CADRE) : Heat
déterministe, échec = perte bornée (pas de game over), temps réel plafonné,
qualité = sourcing (coupe = format + charcler optionnel, R10 réconcilié), € assumé
(supersede le « neutre » du SCOPE), demande par emplacement+pub, automatismes
embauche+outils, corruption = anti-Heat, blanchiment plafonné par le CA façade.
**1er proto décidé : hash seul, 1 PDV, boucle complète.**

Deux artefacts visuels publiés (boucle éco ; catalogue des 15 échelles avec
rendus procéduraux + démo de déception jouable). Prochaine étape : prototyper le
1er proto.

## 2026-07-22 — Shelter : proposition GDD « Le Bloc » (la-loupe/SHELTER.md)

Demande de Sylvain (screenshot carte Quartier Nord) : améliorer la core loop
(achat gros → coupe → conditionnement → advertising → vente) en y ajoutant la
**gestion d'un bloc d'immeuble** à la française — four, appro, nourrice,
chouf, fournisseurs, clientèle, raids police, rivalités. Proposition écrite
dans `la-loupe/SHELTER.md`, ancrée dans le documenté (rôles/salaires réels,
pilonnage/place nette, guerres de points, jobbeurs — sources en fin de doc) :

- **Deux boucles imbriquées** : la boucle produit existante (tactile, à la
  minute) alimente une boucle bloc (gestion, à la session) : tenir le point →
  encaisser → payer → répartir → renforcer → encaisser la pression.
- **Triangle logistique** planque → nourrice → tampon du four ; règle d'or
  « tout ce qui est exposé peut être saisi, ce qui est rangé jamais » — la
  taille du tampon devient LA décision continue.
- **Police en deux jauges** (VISIBILITÉ qui redescend, DOSSIER qui ne se
  rembourse pas) et 4 paliers annoncés : patrouille → pilonnage → place nette
  → la Chute. Zéro dé : conforme R1/R4 (le chouf donne un préavis, le mini-jeu
  d'évacuation ne peut que SAUVER une perte déjà écrite).
- **Rivalité œil pour œil** déterministe : frictions déclenchées par la
  croissance du joueur, réponses graduées toutes chiffrées avant décision ;
  la violence rentable court terme mais DOSSIER à vie.
- **Actes 0→4** : planque + 100 g à crédit (front Karim P0) → location du
  spot 20 % CA → four + équipe → bloc/multi-PDV → devenir Karim (fournir à
  crédit aux petits nouveaux — la boucle se referme).
- **Méta « la Chute »** : roguelite doux, run de 15-25 h, réputation conservée.
- **Monétisation** : recommandation premium + web/PWA (le F2P à timers
  contredit R4/R7 ; stores hostiles au thème, cf. guideline Apple 1.4.3).

Questions ouvertes : la Chute (fin de run) est-elle acceptable pour Sylvain ou
faut-il une purge du DOSSIER plus généreuse ? Le corner P1 doit-il coexister
avec la vente DM dès le début (cannibalisation à régler) ?

## 2026-07-20 — La Loupe : pains discrets, réserve sélectionnable, fin du « couper dans le vide »

Retours de test tel (screenshot) sur l'écran de coupe : pas de restant visible
sur le pain, pas d'état du stock/barrettes, coupe « dans le vide » quand le
pain dépasse ce que la planche affiche, et demande d'afficher les savonnettes
en réserve, sélectionnables. Quatre réponses :

- **painG (pool de grammes) → S.pains (liste discrète {g, q})** : chaque pain
  garde SA qualité (elle part dans les barrettes à la coupe — avant, tout se
  moyennait dans painQ). **Migration douce** sans reset : painG>0 devient un
  pain unique, painG remis à 0 (garde anti double-migration). Pas de bump.
- **UI de coupe** : la barre du haut affiche « Pain : X g · réserve N pains
  (Y g) » + « Barrettes : … », mise à jour à chaque coupe.
- **Fin du « couper dans le vide »** : le visuel plafonne à LOAF_L (170 g) ;
  quand la planche est visuellement vide mais qu'il reste des grammes, elle se
  **recharge** (toast « La suite du pain / Pain suivant »). Vérifié : pain
  190 g, 9×20 g débités = conservation exacte.
- **Réserve au fond de l'établi** : un bloc par pain (taille ∝ grammes), le
  sélectionné surligné + surélevé ; **tap = le mettre sur la planche**
  (raycast ; garde : le relâcher d'un maintien-coupe ne compte pas comme tap).
  Équivalent chips dans la découpe 2D de secours.
- **Fix transversal déniché au passage** : le temps de presse était compté en
  dt simulé **clampé** (0.05/frame) → à bas fps (téléphone qui chauffe,
  headless à 4 fps), le maintien de 0.6 s réclamait 3 s+ de vrai temps. Le
  geste se mesure désormais en **temps réel** (la physique des tranches garde
  le dt clampé).
- **Réalisme (remarque de Sylvain)** : une savonnette = **250 g max**. Le
  « Lot 500 » livre donc **2×250 g** (champ `split` sur le produit), pas une
  plaque de 500 g — deux blocs dans la réserve, même prix, même total.

## 2026-07-20 — La Loupe : les labels 3D s'empilaient en haut (CSS max() invalide)

Screenshot de Sylvain : dans la coupe 3D, « Maintiens pour couper », l'indice
swipe et le sélecteur de taille se superposaient en haut, illisible. Cause :
`bottom:max(72px,env(safe-area-inset-bottom)+58px)` — en CSS, `+`/`-` dans
`max()`/`calc()` exigent des ESPACES autour, sinon la déclaration entière est
invalide → `bottom:auto` → les éléments retombaient à leur position statique,
en haut du HUD. Bug présent depuis l'origine du proto (5 occurrences : hint,
labels press/wrap, jauges, bouton sceller, overlay d'appro), révélé par le
texte d'indice rallongé en v17.

- Espaces ajoutés → tout est réellement ancré en bas, au-dessus du dock.
- Dédup : le hint de coupe ne répète plus « Maintiens » (déjà dit par le
  label de presse) — il ne dit que « Swipe ▸ conditionnement ».
- Vérifié en headless : sélecteur seul en haut, labels lisibles en bas.
- Leçon générique : `env()` dans un calcul sans espaces passe silencieusement
  à la trappe — à vérifier dans les autres protos si le symptôme réapparaît.

## 2026-07-20 — La Loupe : « Planque pleine » doit dire les chiffres

Retour de test tel : « je n'ai pas pu acheter, ça disait planque pleine alors
que je n'avais aucun pain ». Pas un bug : la planque compte TOUT le produit
(pain + barrettes + sachets, `finiG()+painG`), cap de base 250 g — donc un
Pain 250 exige une planque quasi vide tant qu'on n'a pas pris l'upgrade
Planque (+120 g/niveau, Réinvest). C'est la deuxième porte de scale voulue
(SCOPE §2), mais l'UI ne l'expliquait pas :

- le toast donne maintenant les chiffres : « Planque 130/250 g — pas la place
  pour +250 g. Vends, ou agrandis (Réinvest, Home) » ;
- l'overlay d'appro 3D et l'appro 2D affichent le remplissage et ce qui compte
  dedans (pain + barrettes + sachets).

Équilibrage inchangé (cap 250, gates standing 40/65) — question ouverte si la
friction se confirme en test : cap de base plus haut, ou sortir les sachets
du compte planque.

## 2026-07-20 — La Loupe : secours 2D pour la coupe et l'appro (retour de test tel)

Retour de Sylvain sur tel après la v17 : « broken — plus la possibilité de
tester avec Onion Market [l'appro] ou la coupe ». Diagnostic : les deux écrans
sont les vues 3D, et sur mobile unpkg (qui sert Three.js) peut être bloqué ou
traîner — problème déjà documenté (« Sur mobile, unpkg bloqué cassait TOUT le
proto », d'où le lazy-load v7). En faisant de la coupe 3D la scène PAR DÉFAUT
de l'atelier, la v17 a remis ce mur en entrée : import qui pend = écran noir
sans issue (le « Chargement 3D… » était rendu DERRIÈRE la vue 3D).

- **Timeout 8 s** sur le chargement 3D (Promise.race) → échec ou délai =
  bascule 2D, réessayable (`no3d` en mémoire session, pas persisté).
- **Indicateur visible + sortie de secours** : « Chargement 3D… » + bouton
  « Continuer en 2D ▸ » DANS la vue 3D — plus jamais d'écran noir muet.
- **Découpe 2D** (`renderCut2D`) : mêmes règles que la lame — taille décidée
  ici (− / + / chips), une coupe = une barrette (`applyCut` partagé avec le
  hook 3D). La boucle reste testable sans WebGL.
- **Appro 2D** (`renderBuy2D`) : la liste d'achat en pleine page ; et l'overlay
  d'achat s'affiche désormais IMMÉDIATEMENT en mode 3D (il est DOM-only),
  achetable même pendant que la visionneuse charge.
- Pas de bump de save (aucun changement d'état persisté).
- Vérifs headless : three coupé net → cut2d/buy2d + achat + 5 coupes + zip OK ;
  three qui pend → indicateur + skip OK, timeout 8 s → bascule auto ;
  chemin nominal 3D revalidé.

## 2026-07-20 — La Loupe : la taille se décide à la lame (anti-triche) + rail atelier

Retours de Sylvain sur la dernière build La Loupe — cinq changements, save
v16 → v17 :

- **Anti-triche conditionnement** : la taille de la barrette est fixée AU
  MOMENT DE LA COUPE. Le stock devient discret par taille (`S.bars{taille:n}`),
  plus un pool de grammes — impossible de couper large puis de « décider »
  des 8 g au zip.
- **Taille de coupe libre** : sélecteur au-dessus de la lame (− / +, chips
  2/5/8), défaut **2 g**. Le dernier morceau du pain peut sortir plus petit
  que la taille choisie — assumé (c'est un « morceau »).
- **Conditionnement** : le bac STOCK montre les TYPES de barrettes (une par
  taille, badge ×n) ; drag & drop vers le zip central → sachet de LA taille
  draguée. L'express suit le même modèle (par taille). `qtyToSachets` passe
  en DP exacte (le glouton ratait 10 = 5+5 quand un 8 traînait en stock).
- **Rail atelier** : la découpe est la scène par défaut de l'Atelier ;
  swipe ▸ dans la 3D → conditionnement ; swipe ◂ sur l'établi zip → découpe.
- **BeuherShit** : l'arrivée d'une tournée re-render immédiatement l'onglet —
  le retour de liquide apparaît sans quitter l'écran (avant, le throttle
  0.35 s pouvait sauter le dernier render et l'écran restait figé).
- **Fix réel déniché en test headless** : le `setPointerCapture` de la scène
  3D reciblait les clicks des contrôles HUD (#fmtBar/#buyOverlay/#seal) →
  boutons morts. Garde ajoutée dans `onPointerDown`.
- Outillage : `tools/shots-loupe.mjs` (serveur HTTP local — les modules .mjs
  de la-loupe ne chargent pas en file:// ; parcours complet appro → coupe →
  swipe → zip, état vérifié via `loupe_save`).

## 2026-07-04 — Plantation : l'arrachage (tap & hold + tirer vers le haut)

Le geste de récolte du plant change encore, sur retour de test : le swipe
au pied devient un ARRACHAGE — tap & hold sur le pied, puis TIRER vers le
haut. Objectif : une sensation de FORCE.

- La résistance se lit dans le mapping : levée = a² × PULL_LIFT — le plant
  bouge à peine au début puis cède ; tremblement et terre qui s'effrite
  proportionnels à l'effort ; grincement qui monte (WebAudio) ; micro-
  secousse caméra continue pendant la traction.
- À PULL_DIST (150 px vers le haut) : ça cède d'un coup — craquement grave
  + thump, gerbe de terre et de feuilles, grosse secousse, la tige vole au
  crochet. Lâcher trop tôt = le plant retombe en ressort, aucun malus (R1).
- Séchoir plein = la prise est refusée d'entrée (pas d'effort gaspillé).
- Désambiguïsation : le geste démarre SUR le pied (station) → jamais
  confondu avec la navigation verticale entre pots.
- Pilote headless adapté (press + drag up), capture « en plein effort »
  ajoutée (06b-arrachage.png).

## 2026-07-03 — Plantation : un plant = une tige, coupe au pied

Décision de Sylvain : chaque plante REPRÉSENTE une tige — elle part donc
ENTIÈRE au séchoir, et le fil (4 crochets) fait sécher jusqu'à 4 récoltes
en parallèle. Conséquences :

- **Plant plus grand** (PLANT_H 3.0) : c'est une tige à part entière, têtes
  sur toute la hauteur. Ampoules remontées (+4.3) — corrige au passage le
  chevauchement lampe/plante signalé en test à maturité.
- **La coupe change de geste** : plus de 4 swipes de branches — UN SEUL
  swipe vif AU PIED du plant (zone de hit au bas de la tige) tranche tout.
  Le pot se libère aussitôt, la tige vole au crochet libre.
- **Tige pendue** = longue cola courbée (2.15) à 10 têtes alternées +
  mains de chanvre tombantes, façon recolte/. Le frotté (lent = A, vif =
  trim) et l'arbitrage sec/humide sont inchangés ; en embed les comptes
  par tige (variety, sentG, qsum, trim) sont conservés tels quels.
- Fil rehaussé (LINE_Y 2.75), cadrage caméra ajusté (BASE_TY 1.35).
- Prépare le terrain aux fils d'étendage supplémentaires + bac de récolte
  sous le fil (cf. feuille de route).

## 2026-07-03 — Plantation : retours visuels + feuille de route outils

Retours de Sylvain sur le refresh visuel (« très chouette, j'aime beaucoup la
direction ») + corrections et cap :

- **Sac de terreau** : le « pot de terre » ambigu devient un vrai sac plastique
  imprimé (étiquette, gueule ouverte, terre qui déborde). Le geste
  maintenir-verser est inchangé. Les TYPES de terre ne sont pas tranchés —
  on garde la dynamique, le sac accueillera étiquette/couleur par qualité.
- **Bug graines** : plus de graines en stock = plus de graines visibles dans
  la caisse (visibilité pilotée par seedAvail(), embed compris).
- **Plants longs et fournis** (référence : les colas de recolte/) :
  tige 2.45, 14 têtes alternées sur toute la hauteur, 7 étages de feuillage ;
  branches du séchoir rallongées à 3 têtes.
- **Feuille de route OUTILS (prochaine passe)** — R2/R9 : chaque ressource a
  son échelle « moins laborieux » :
  · Terre : longue durée (re-terreauter moins souvent) et/ou meilleure
    qualité. · Graines : DISTRIBUTEUR (un tube fixé au mur — un tap suffit,
    plus de drag). · Pots : rendement/qualité. · Lampes : vitesse (+ paliers).
  Même schéma partout : plus de rendement, plus de qualité, plus vite.
- **À penser** : fils d'étendage SUPPLÉMENTAIRES au séchoir (extension de
  capacité) + un BAC DE RÉCOLTE sous le fil qui recueille les buds frottés
  (le panier de recolte/), au lieu du vol direct vers le bac STOCK.

## 2026-07-03 — Plantation : refresh visuel complet aligné sur recolte/

Le feeling validé, passe visuelle en reprenant le vocabulaire de `recolte/`
(le proto au meilleur niveau de détail) :

- **Textures procédurales en grain** (canvas 96×96, zéro fichier) sur TOUT :
  sol en terre battue, murs de pierre (3 teintes de moellons), pot en
  terre cuite, sac de jute (+ col roulé + terre affleurante), caisse à
  graines en bois (graines visibles), étagères, bacs.
- **Têtes = nugs** : icosaèdres bosselés (makeNugGeo) en grappes de 2-3,
  pistils dans la texture — sur la plante, sur les branches du séchoir,
  dans le bac STOCK (vraie pile de têtes au lieu d'un cône) et sur les
  objets qui volent vers les bacs.
- **Vraies lames de feuilles** (plans déformés : pointe, pli central,
  courbure) partout — feuillage d'étages, feuilles gourmandes (avec deux
  folioles), sugar leaves au cul des têtes, feuilles des branches sèches.
- **Tiges courbées** (CatmullRom + tube) : silhouette retirée à CHAQUE
  semis (dérive + cambrure), les têtes/feuilles suivent la courbe via
  st.cx/st.cz. Branches du séchoir en petit tube courbé aussi.
- **Bac TRIM** : déchet végétal (brindilles, lames sèches, miettes) façon
  recolte/. Fil du séchoir en métal (metalness), arrosoir métallisé + pomme.
- **Éclairage recalé** : après la première passe (trop claire, ambiance
  cave perdue), sol/murs/têtes assombris, pistils adoucis, halo de
  guidage plus discret.
- Boucle et navigation revalidées headless après chaque passe (32 g → 372 €,
  zéro erreur console).

## 2026-07-03 — Plantation : navigation au swipe + pots multiples en étagères

Retours de test sur le proto Plantation (le travelling entre scènes « super
smooth ») → deux évolutions demandées, plus un garde-fou :

- **Boutons → swipe (mobile natif)** : la navigation Culture ↔ Séchoir passe au
  **swipe horizontal**, l'alternance entre pots au **swipe vertical**. Les
  pastilles/points ne sont plus que des **indicateurs de position** (tappables
  en secours — utile aussi pour le pilote headless). Désambiguïsation
  jeu/navigation : un geste qui **commence sur une station** (sac, arrosoir…)
  ou qui **touche quelque chose** en route (feuille, plant, tête) est consommé
  par le jeu ; sinon, au relâcher, ample et directionnel = navigation. Aucun
  seuil de vélocité sur la nav : c'est la **distance + la dominance d'axe** qui
  décident (`NAV_DIST`, `NAV_RATIO`).
- **Pots multiples** : jusqu'à **3 étages** débloqués en boutique (800 / 2500 €),
  empilés en **rack vertical** — chaque étage est une **station complète**
  (pot, terreau, graines, arrosoir, booster, lampe) qui vit en continu hors
  écran. Refactor : les singletons plante/pot sont devenus une **factory de
  stations** ; les gestes ne visent que l'étage cadré (le raycast ne touche
  que ce qui est à l'écran — pas de verrou explicite).
- **Balance réalisme de la station** (rappel de Sylvain en cours de refactor) :
  le rack vertical avec lampe par étage EST la pratique réelle (vertical
  farming) ; l'espacement d'étage a été élargi (`LEVEL_H` 4.4 → 5.6) pour
  cadrer un étage net avec un simple **liseré** des voisins (contexte sans
  fouillis), et le **câble de l'ampoule s'attache à la planche du dessus**
  (rien ne flotte). Concessions assumées côté gameplay : outils dupliqués par
  étage (un seul arrosoir « qui suit » serait plus réaliste mais plus
  frictionnel), vol instantané des branches vers le séchoir.
- Question ouverte : le guidage multi-pots (« ⬆️ SWIPE — Pot 2 : 💧 soif »)
  suffit-il, ou faudra-t-il un mini-état par point (couleur des dots) quand on
  jouera longtemps avec 3 étages ?

## 2026-06-27 — Ecstasy : conformité aux règles mini-jeux (rythme = ressenti pur)

Relecture du proto à l'aune des règles (R1/R2 d'abord, confirmé ensuite par
R3→R10). Trois écarts corrigés :

- **R1 (pas un test d'adresse)** : la presse donnait un *bonus de rendement*
  indexé sur la précision → ça en faisait une épreuve d'adresse. Supprimé.
  **Qualité ET volume ne dépendent que de la coupe** (charge + taux de liant) ;
  le rythme est **100 % ressenti** (combo/feedback), zéro effet éco — ni bonus,
  ni malus. Manuelle et auto produisent le **même** lot : l'auto = *moins
  d'effort*, pas *plus de rendement*.
  *Nota R4* : le skill *pourrait* moduler la récompense (vers le haut, jamais
  punir) ; j'ai choisi le ressenti pur pour ce proto — un skill-reward non
  punitif reste réintroductible si on le souhaite.
- **R2 / R9 (les paliers allègent, la tension vit au niveau système)** : mes
  paliers manuels *durcissaient* le geste (fenêtre + étroite, curseur + rapide).
  Inversé : moins de frappes + fenêtre **plus large** à chaque palier
  (T1 8/0,22 → T2 5/0,32 → T3 3/0,44), puis T4 automatise, T5 externalise. C'est
  exactement R9 : ce n'est pas le geste qui se re-corse.
- **R1 ergonomie / R10** : bouton **« vider la cuve »** — le sur-versage de liant
  n'est plus verrouillé ; la coupe reste un **levier de décision réversible**.

`SAVE_VERSION` 1 → 2. Vérifs : `node --check` OK, capture headless + smoke test
(pour → presse → tri → rapport) sans erreur.

---

## 2026-06-27 — set de règles mini-jeux (R3→R10) + définition

Acté en session, formalisé dans `CLAUDE.md`. **Définition** posée en tête des
règles : un *mini-jeu* = toute action demandant l'**intervention manuelle** du
joueur, à commencer par un effet de **manipulation du produit** — avec trois
critères : **enjeu explicite**, **interaction simple**, **conséquence immédiate**
(impact **micro**, pas macro). Idées-forces :

- **Le tactile EST le plaisir** (R3) — leçon *Schedule I* : un crafting qui
  « ne suce pas ». La corvée de prod doit régaler par le **geste**.
- **Déterminisme** (R4) — *skill oui, hasard non*. Anti-exemple fondateur : la
  vente de *The Boss Gangster* (vol aléatoire, prix au jeu d'adresse,
  comportements imprévisibles) = frustration. Le résultat se relie au geste ;
  le skill module la récompense, il ne punit pas.
- **Cycle satisfaction → délégation** (R5/R6/R8) — le plaisir décroît avec la
  maîtrise ; quand il tombe à zéro, le joueur *choisit* de déléguer (jamais
  imposé). On délègue la **répétition sans plaisir**, jamais la décision : le
  cœur de jeu est la case « satisfaction haute + déterministe ».
- **Règle d'or** (R7) — automatise la satisfaction épuisée, jamais la décision
  vivante ; bannis le hasard.

Aller-retour assumé (proposées → annulées → **réécrites et réintroduites**) :

- « Paliers = re-corser » devient **R9** : l'équilibrage est **systémique**, pas
  local. Ce n'est pas l'activité qui se re-corse (ça contredirait R5), c'est le
  **jeu entier** qui tient sa tension — une friction réduite par un outil est
  compensée ailleurs (nouveau critère ou croissance des existants).
- « Qualité/pureté = levier de coupe » devient **R10** : la coupe n'est pas
  forcément un mini-jeu, mais reste un **facteur à la décision** (levier
  qualité/pureté ; manipulation manuelle possible, pas obligatoire). Cohérent
  avec le levier unique décrit en contexte dans l'entrée Ecstasy du 24/06.

Cohérence avec l'existant :

- R4 (skill oui) **ne contredit pas** R1 (« pas un test d'adresse *punitif* ») :
  le skill module la **récompense**, jamais un malus. R1 reste valable, non abrogée.

---

## 2026-06-24 — nouveau proto « Ecstasy — Presse Cadencée »

Core loop ecsta ajouté (`ecstasy-press/`), variation V1 d'un brief à 3 options
(presse cadencée / maître de cuve / chaîne & tri). Chaîne : cuve (coupe au
liant) → presse au rythme → tri/comptage au doigt → vente → rapport traçable.

Arbitrage de design important (réconciliation des règles) :

- La **coupe au liant** est l'arbitrage économique (cupidité vs prudence) et le
  **levier unique de qualité** (ADN CrimWorld : qualité → sell-through **et**
  chaleur de rue, deux co-effets **parallèles**, jamais une chaîne).
- Mais **R1 (proto)** interdit qu'un mini-jeu raté inflige un malus. Donc le
  **rythme de presse ne touche PAS la qualité** : il ne donne qu'un **bonus de
  rendement** (bien tapé = quelques pilules de plus ; rater = base, zéro malus).
  Les malformées (déterministes, issues de la coupe) sont **revendues aux
  schlags** → reward réduit, pas une perte sèche (comme les déchets Hash Slicer).
- **R2 (proto)** : les 5 niveaux d'outils allègent puis **automatisent**
  (semi-auto) et **externalisent** (embauche) le pressage manuel.
- Aucun `Math.random` sur l'état/les conséquences. La **saisie** (seuil de
  chaleur) est une conséquence **différée et traçable** des coupes passées — la
  « bascule » : on coupe sous la ligne de qualité, on encaisse quelques bons
  lots, puis ça s'effondre. Équilibre laissé en **constantes nommées**
  (placeholders), à régler humainement.

---

## 2026-06-22 — direction des mini-jeux : ressenti d'abord, jamais de punition

Réflexion de design (devenue **R1** et **R2** dans `CLAUDE.md`) :

- Le mini-jeu n'est **pas** une épreuve d'adresse pénalisée en cas d'échec
  (sauf cas unique où l'adresse est explicitement requise). Son but : faire
  **sentir** l'action au joueur en la faisant manuellement.
- **Rater n'apporte jamais de malus** — seulement une frustration *très
  légère*. La tâche manuelle doit être ludique, plaisante, et faire sentir la
  récompense une fois finie.
- Cette frustration doit s'**adoucir** au fil du développement : la progression
  débloque des outils qui facilitent les tâches manuelles, pour finalement les
  **automatiser et/ou externaliser** et laisser le joueur se concentrer sur la
  big picture.

Question ouverte / à surveiller :

- Hash Slicer envoie aujourd'hui les ratés de coupe au **bac DÉCHETS**
  (revendable). À garder compatible avec R1 : c'est une récompense *réduite*
  (frustration douce), pas un malus sec — vérifier que ça le reste aux
  rééquilibrages, et que les outils boutique réduisent bien la part déchets.

Périmètre : principe propre aux protos « à tâches manuelles » (famille Hash
Slicer). **Non répercuté dans CrimWorld**, dont l'invariant pose que la qualité
tactile de la boucle n'est *pas* le critère de succès.

---

## 2026-06-22 — mise en place du suivi notes & règles

- Rôle défini : une session dédiée tient les **prises de notes** et les
  **règles** du projet au fil de l'eau.
- Décision : les **règles** vont dans `CLAUDE.md` (recueil stable, relu à
  chaque session) ; les **notes** restent ici, dans `NOTES.md` (journal daté).
- Aucune règle nouvelle pour l'instant : les conventions existantes du
  `CLAUDE.md` font foi.
