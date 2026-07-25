# NOTES — journal du projet (prototypes)

Journal chronologique des décisions, idées, écarts constatés et questions
ouvertes. On y écrit ce qui s'est passé et **pourquoi**. Les *règles* stables,
elles, vivent dans `CLAUDE.md` (section « Notes & règles vivantes »).

Format d'une entrée : `## AAAA-MM-JJ — titre court`, puis des puces.
Les entrées les plus récentes en haut.

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
  l'ARA étaient du décor. *Et le test le masquait en écrivant `s.vis = 95` à la
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
