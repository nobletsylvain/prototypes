# Shelter — « Le Bloc » : gameplay & core loop (proposition P1+)

**Statut :** proposition de design (à valider) · suite directe de Shelter P0
(carte Quartier Nord, front Karim, hit planque).
**Objet :** ajouter à La Loupe la **gestion d'un bloc d'immeuble** — point de
vente (le four), approvisionnement, nourrice, chouf, fournisseurs, clientèle,
pression police (pilonnage → place nette → stups) et rivalités de quartier —
en restant fidèle aux règles du projet (R1–R10, zéro hasard d'état).
**Argent :** neutre (aucune devise), comme le SCOPE. Les chiffres ci-dessous
sont des **constantes nommées placeholder**, à régler humainement.

---

## 1. Fantasy

Aujourd'hui (P0) tu es un **artisan** : tu achètes, tu coupes, tu ensaches, tu
réponds aux DM. Le Bloc te fait devenir **gérant** : tu tiens un point de
vente physique qui débite tout seul, tu paies une équipe, tu répartis le
produit pour que rien d'important ne soit jamais exposé, tu encaisses la
pression — police d'un côté, bloc rival de l'autre. L'arc complet :

> **la planque → la dette → le spot → le four → le bloc → devenir Karim.**

---

## 2. Ancrage réel → mécanique (la table de correspondance)

Tout le design découle de l'organisation réelle des points de deal en France
(rôles, salaires, logistique, réponse policière — sources en §12) :

| Réel (documenté) | Mécanique |
|---|---|
| Le réseau n'expose presque rien sur le point ; le gros dort chez des **nourrices**, un **ravitailleur** fait la navette | **Triangle logistique** planque → nourrice → tampon du four. La police ne saisit que **l'exposé** |
| **Chouf** payé ~60–200/jour, cri d'alerte, la police trouve le point vide | Le chouf transforme un coup de pression en **préavis** → mini-jeu d'évacuation (on ne perd que ce qu'on n'a pas eu le temps de rentrer) |
| **Charbonneur** ~100–150/jour, shifts quasi 24/7 | Délégation de la vente : le four débite sans toi (R5) |
| **Jobbeurs** recrutés sur Snapchat, dettes fictives, sanctions internes | Recrutement via SnapShit ; **fiabilité à seuils visibles** : sous-payé / sur-exposé → il carotte ou il parle |
| Plaquette 100 g ~200–400 en gros, détail ~8–10/g | Déjà l'éco de La Loupe : la marge naît de la coupe + du détail |
| Points **loués / franchisés** par le réseau du dessus | Acte 1 : Karim te loue le corner contre une **part du CA** |
| **Pilonnage** : harcèlement policier, fermer le point coûte des dizaines de milliers par jour | Palier police 2 : fermeture forcée = **manque à gagner**, pas de game over |
| **Place nette XXL** : spectaculaire, saisies, mais réinstallation rapide | Palier 3 : grosse perte + réinstallation payante — le point survit |
| **Dossier stups** : enquête longue, scellés, écoutes → démantèlement | Jauge DOSSIER qui ne redescend (presque) pas → palier 4 = la Chute (méta-boucle) |
| Guerres de points (Marseille : DZ/Yoda/Blacks, Besançon : Planoise…) | Blocs rivaux simulés, escalade **œil pour œil** déterministe |
| Promos, cartes de fidélité, menus, livraison « Uber shit » | Advertising = **co-effets parallèles** : +débit ET +visibilité (ADN CrimWorld) |

---

## 3. Les deux boucles imbriquées

**Boucle produit** (existante, à la minute — inchangée, c'est le cœur tactile) :

```
APPRO → COUPE → DOSE → VENTE (DM/livreur) → LIQUIDE → LIASSES → réinvest
```

**Boucle bloc** (nouvelle, à la session — le méta qui donne un SENS à la première) :

```
TENIR LE POINT (débit clients au four)
   → ENCAISSER (la caisse tampon remonte en liquide)
   → PAYER (salaires jour, location du spot, échéance de dette)
   → RÉPARTIR (stock : planque / nourrices / tampon du four)
   → RENFORCER (recruter, upgrader, étendre)
   → ENCAISSER LA PRESSION (jauges police + frictions rivales)
   → arbitrer → plus gros
```

La boucle produit **alimente** la boucle bloc (ce que tu coupes part au four) ;
la boucle bloc **rachète** la boucle produit (calibres plus gros, standing,
outils). Quand le joueur délègue la vente, la boucle produit reste son plaisir
manuel (coupe, tri des liasses) — on délègue le geste, jamais la décision (R7).

---

## 4. La progression en actes

### Acte 0 — La planque (tutoriel, ~20 min)
Tu n'as **que ta planque** (le pin vert de la carte). Karim, le grand du
quartier, te confie **PLAQ_CREDIT = 100 g à crédit** : remboursement
**DEBT_TOTAL = 1,5× le prix cash**, échéancier affiché en jours de jeu
(**DEBT_DAYS = 6**, part fixe/jour). Tu coupes, tu ensaches, tu vends à la
sauvette près du corner : débit minuscule, clients méfiants, et le réseau en
place te **tolère** (tu es sous leur radar tant que tu restes petit).
La dette est le tutoriel de tension : pas un timer réel, des échéances
lisibles. Rater une échéance ne tue pas : Karim **re-taxe** (la dette enfle,
DEBT_LATE = +20 %) et le raconte (standing −). *La dette punit doucement et
traçablement, jamais sèchement (R1).*

### Acte 1 — Le spot
Dette soldée → Karim propose le **corner en location** : LOC_PART = 20 % du CA
du point, reversé chaque fin de journée. Tu gagnes : un débit piéton continu,
ta première embauche (**un chouf**), le droit d'afficher un menu. C'est le
moment « artisan → commerçant ».

### Acte 2 — Le four
Le corner devient un four qui tourne : **nourrice** (stock déporté),
**ravitailleur** (navette automatisée), **charbonneurs** en shifts (le point
vend sans toi). Karim passe semi-grossiste : calibres 250/500, cash moins cher
que crédit (déjà en P0). Les jauges police deviennent le centre du jeu.

### Acte 3 — Le bloc
Multi-PDV (prendre ou ouvrir un 2ᵉ point), rivalités ouvertes, soldats.
Option : **racheter ta liberté** — te fournir en direct (onion/crypto, déjà au
SCOPE) et couper Karim… qui le prend comme on peut l'imaginer.

### Acte 4 — Devenir Karim (horizon)
Tu deviens le fournisseur : tu avances des plaquettes **à crédit aux petits
nouveaux** du quartier, tu loues TES spots, tu prends 20 % sans toucher le
produit. La boucle se referme : le jeu t'a fait remonter toute la chaîne dont
tu étais la première victime consentante.

---

## 5. Le triangle logistique (le cœur du réalisme gamifié)

**Règle d'or du jeu : tout ce qui est exposé peut être saisi ; ce qui est
rangé ne l'est jamais.**

```
PLANQUE (gros stock + liasses)      cap. de base, upgrades — existant (hit planque P0)
   │  réappro manuelle (toi)
   ▼
NOURRICE(S) (stock déporté)         cap. NOUR_CAP = 300 g · coût NOUR_PAY/semaine
   │  navette (toi, puis ravitailleur)
   ▼
FOUR — TAMPON (stock exposé)        TAMP_MAX réglable par le joueur : 30–120 g
   │  vente au débit
   ▼
CAISSE TAMPON (liquide exposé)      vidée par la navette retour
```

- **Le tampon est LA décision continue** : gros tampon = débit max sans
  rupture, mais perte max en cas de coup ; petit tampon = sûr, mais ruptures
  (clients qui repartent = manque à gagner + réputation −).
- **La navette a un trajet** sur la carte : passer par la zone rivale =
  raccourci taxable (voir §9) ; le grand tour = plus lent. Choix affiché.
- La saisie frappe **là où c'est exposé** au moment du coup : tampon + caisse
  tampon (paliers 2–3), une nourrice ciblée (palier 3 : la plus chargée —
  incitation déterministe à répartir), la planque (palier 4 seulement).
- **Ne jamais tout mettre au même endroit** devient un geste de jeu : l'écran
  de répartition est un tap-drag de blocs de grammes entre les trois lieux.

---

## 6. L'équipe (rôles, salaires, fiabilité)

Recrutement via **SnapShit** : tu postes une annonce (« #QuartierNord — ça
recrute, viens vite »), un pool de candidats se présente — généré
**déterministe** depuis la seed du quartier + ton standing (pas de gacha).
Chaque candidat expose **deux stats lisibles** : *prix* et *fiabilité*.

| Rôle | Effet | Salaire/jour (placeholder) | Délégation (R5) |
|---|---|---|---|
| **Chouf** | préavis sur les coups (§8) ; 2ᵉ chouf = préavis long + couverture nuit | CHOUF_PAY = 60 | remplace TA vigilance |
| **Charbonneur** | le four débite sans toi (DEBIT_DELEG = 70 % de ton débit) | CHARB_PAY = 100 | remplace la vente manuelle |
| **Rabatteur** | +débit aux heures creuses | RABAT_PAY = 50 | remplace les stories manuelles |
| **Ravitailleur** | navette auto nourrice↔four (fréquence réglable) | RAVIT_PAY = 80 | remplace tes allers-retours |
| **Nourrice** | +NOUR_CAP de stock déporté, exposition quasi nulle | NOUR_PAY = 150/sem | étend la planque |
| **Soldat** (T3) | dissuasion / opérations (§9) | SOLD_PAY = 120 | remplace l'intimidation |
| **Gérant** (T4) | automatise les shifts d'un point entier | % du CA du point | pour le multi-PDV |

**Fiabilité à seuils visibles** (la gamification des « jobbeurs piégés », mais
c'est TOI qui choisis d'être réglo ou pas) :

- Chaque employé a une jauge **fiabilité** qui baisse quand : salaire en
  retard, GAV subie (palier 2–3), shift de nuit non relayé, salaire au rabais
  négocié à l'embauche.
- Sous **SEUIL_CAROTTE** : il ponctionne la caisse tampon (affiché dans le
  rapport du soir — tu SAIS qui, tu décides quoi faire).
- Sous **SEUIL_BALANCE** : en GAV, il parle → +DOSSIER (gros). Un employé bien
  payé et reposé ne parle jamais. Déterministe, jamais de dé (R4).
- Remèdes toujours disponibles : prime, repos, ou le sortir du réseau
  (indemnité de départ… ou pas — mais le virer sans indemnité = fiabilité de
  TOUTE l'équipe −, ça se sait).

---

## 7. La clientèle & l'advertising

**Débit du four** = f(heure, réputation qualité, prix, promos, état du point) —
zéro tirage : la même config produit toujours le même débit.

- **Courbe journalière** : creux le matin, montée l'aprem, **rush 18 h–2 h**.
  Les shifts d'équipe se planifient sur cette courbe (écran planning simple).
- **Segments** (hérités de l'éco existante) :
  - *habitués* — sensibles à la **qualité** (grade de coupe) et à la
    régularité (rupture = ils testent le bloc d'en face) ; les cartes de
    fidélité (10ᵉ sachet offert, FIDEL_N = 10) les verrouillent ;
  - *festifs* (week-end) — sensibles aux **promos** et aux stories ;
  - *schlags* — achètent les déchets/invendus, insensibles à tout, mais
    traînent devant le four : +visibilité (§8).
- **Advertising (SnapShit)** : chaque story/promo a **deux effets parallèles,
  jamais une chaîne** (ADN CrimWorld) : **+débit ET +VISIBILITÉ**. Le menu
  affiché au four, pareil. L'arbitrage est permanent et lisible.
- **BeuherShit (livraison)** reste le canal discret : zéro visibilité du four,
  mais risque coursier (existant). Les deux canaux se cannibalisent un peu
  (CANNIB = 15 %) : choisir son mix fait partie du jeu.

---

## 8. La police — deux jauges, quatre paliers (zéro hasard)

**La police ne surprend jamais : chaque coup est la conséquence d'une jauge
que le joueur a fait monter, et chaque cause est listée dans le HUD.**

### Jauge VISIBILITÉ (chaleur du point — redescend)
Monte avec : file de clients (débit), promos/stories publiques, schlags qui
stagnent, barricades installées, fermetures bruyantes récentes.
Descend avec : accalmie volontaire (baisser le tampon, couper les promos),
jours calmes.

### Jauge DOSSIER (chaleur réseau — ne redescend presque pas)
Monte avec : chaque **saisie** (scellés = preuves), chaque **GAV** d'un
employé sous SEUIL_BALANCE, liquide non rangé (pression P0 existante),
**violence** (§9 — gros contributeur).
Se purge seulement par sacrifices : fermer le point N jours, déménager la
planque (coûteux), lâcher un lieutenant (fiabilité équipe −−). *C'est « la
bascule » CrimWorld : on encaisse, on encaisse… et le sol se dérobe.*

### Les paliers (annoncés à l'avance dans le HUD, seuils visibles)

| Palier | Déclencheur | Ce qui se passe | Ce que ça coûte |
|---|---|---|---|
| **1. Patrouille BAC** | VISIB > S1 | le four ferme QQ minutes, clients dispersés | manque à gagner ; zéro saisie si tampon rentré |
| **2. Pilonnage** | VISIB > S2 (répété) | descente coup-de-poing : saisie tampon + caisse, GAV du charbonneur (indispo J+2, fiabilité −) | perte bornée = ton tampon. Le point rouvre après PILON_H heures |
| **3. Place nette XXL** | VISIB > S3 soutenu | grosse op : tampon + LA nourrice la plus chargée, arrestations, point fermé 1 jour | perte lourde + réinstallation payante (re-recruter, re-répartir). Le point survit — comme en vrai |
| **4. Descente stups** | DOSSIER = max | raid coordonné : planque + nourrices + toi. **La Chute** | fin de run (voir méta §11) |

### Le chouf en jeu (le mini-jeu du raid, R1-compliant)
Quand un palier 1–3 se déclenche : **préavis de ALERT_S secondes** (0 s sans
chouf ; 6 s avec un ; 12 s avec deux + couverture nuit). Cri « **ARA ! ARA !** »,
clients qui se dispersent, et un mini-jeu d'évacuation : **tap sur les caches**
(compteur EDF, faux plafond, cage d'escalier) pour rentrer les blocs de
grammes du tampon, un par un, avant l'arrivée.
*Conformité R1 : le coup lui-même était déterministe et annoncé (la jauge) ;
le geste ne peut que SAUVER une partie de la perte prévue — c'est un bonus,
jamais un malus de raté. À terme (R2), l'upgrade « cache aménagée » rentre le
tampon automatiquement : la corvée s'automatise, la tension reste systémique
(R9).*

---

## 9. Le bloc d'en face — rivalité, violence, contrôle du point

La carte a 1 puis 2 blocs rivaux (pins « rival » déjà posés en P0). Chaque
rival est simulé **simplement et observablement** : trois stats que tes choufs
peuvent relever (mission de repérage) — *débit, force (soldats), agressivité*.

### Les frictions (déterministes, déclenchées par TA croissance)
Chaque fois que tu franchis un palier de CA, le rival répond (dans l'ordre,
affiché quand tu as fait le repérage) :

1. **Guerre des prix** : promos chez eux → ton débit − tant que tu ne réponds
   pas (baisser tes prix OU monter ta qualité).
2. **Taxe de passage** : ta navette qui coupe par leur zone se fait ponctionner
   TAXE_PCT = 30 % — le grand tour devient payant en temps.
3. **Débauchage** : offre publique à ton meilleur employé (tu peux t'aligner —
   enchère visible — ou le laisser partir).
4. **Intimidation** : leurs soldats devant TON four → débit −40 % tant que ça
   dure.
5. **Le carottage** : ils montent d'un cran → ravitailleur braqué (perte de la
   navette en cours).

### Tes réponses (graduées, toutes chiffrées AVANT de décider)
- **Absorber** : perdre du débit, zéro chaleur. Toujours possible.
- **Négocier** (gate standing) : pacte de non-agression contre redevance, ou
  partage de fournisseur. Stable tant que tu ne grossis pas trop.
- **Montrer la force** : soldats en poste = fin de l'intimidation, coût
  salarial, VISIB légèrement +.
- **L'opération** (prise de point) : PAS un test d'adresse — une
  **préparation** : repérage (obligatoire), choix de l'heure (leur creux),
  effectif engagé. L'écran d'op affiche le résultat exact avant de lancer :
  « 3 soldats, 4 h du mat : prise du corner, 1 soldat blessé (indispo 4 j),
  **+40 DOSSIER**, vendetta niveau 1 ». Tu décides en connaissance (R4/R7 :
  le hasard n'existe pas, la décision reste vivante).
- **La vendetta** est œil pour œil et affichée : ils te rendent exactement la
  monnaie de ta pièce (niveau 1 : ton tampon brûlé ; niveau 2 : ton four
  fermé de force ; niveau 3 : un employé blessé). Elle s'éteint par
  négociation (chère) ou par victoire totale (leur bloc passe sous ton
  contrôle = 2ᵉ PDV, leur équipe à re-recruter).

**Le message systémique** — fidèle au réel : la violence est le levier le plus
rentable à court terme et le seul dont le coût (DOSSIER) **ne se rembourse
jamais**. Les guerres de points attirent les stups ; les réseaux qui tirent
finissent démantelés. Le jeu ne le dit pas dans un tutoriel : les jauges le
font vivre.

---

## 10. Les fournisseurs

- **Karim** (P0, front existant) : crédit facile, cash moins cher — et une
  **relation** : rembourser tôt = standing + calibres débloqués ; le couper
  (Acte 3) = il devient un rival d'un genre nouveau (il connaît tes nourrices
  d'avant).
- **Onion/crypto** (SCOPE, plus tard) : prix cassés, qualité **inspectable à
  la loupe** avant achat (le nom du jeu !), mais délai de livraison + risque
  douane sur les gros calibres (déterministe : au-delà de X g/commande, la
  jauge DOSSIER prend les miettes).
- **Le choix cash vs crédit** existe à tous les étages : le crédit préserve la
  trésorerie et hypothèque la liberté — c'est la même mécanique qui t'a fait
  entrer dans le jeu (Acte 0), tu la retrouves en face quand tu deviens
  fournisseur (Acte 4).

---

## 11. Méta-boucle : la Chute (et pourquoi c'est une bonne fin)

Palier 4 (DOSSIER max) = **la Chute** : raid coordonné, tu perds le réseau.
Plutôt qu'un game over sec : un **roguelite doux** —

- Tu repars d'une planque (nouvelle seed de quartier), avec ta **réputation**
  (méta-monnaie : standing de départ, Karim qui te fait confiance plus vite,
  1–2 contacts conservés).
- L'histoire du quartier est la somme des runs : le hub peut lister « tes »
  quartiers tombés, à la manière d'un tableau de chasse inversé.
- Ça résout aussi le problème de fin de jeu incrémental : la tension DOSSIER
  donne une **durée de vie naturelle** à chaque run (cible : 15–25 h pour la
  première Chute), et la méta donne une raison de recommencer plus grand.

---

## 12. Format, monétisation, distribution

**Sessions** : 3–8 min (un « jour » de jeu = une session type : planifier,
répartir, jouer la boucle produit, encaisser le rapport du soir).
**Hors session** : une fois délégué, le four tourne en absence à rendement
réduit et **plafonné** (OFFLINE_CAP = 2 jours) — pas de FOMO, pas de punition
d'absence.

**Recommandation : premium, distribution web/PWA d'abord.**

- **Premium** (achat unique ~6,99, ou gratuit jusqu'à T1 puis un seul unlock) :
  cohérent avec R4/R7 — le F2P à timers/boosters vit précisément des frictions
  artificielles et du hasard que le projet bannit. Un jeu dont la règle
  cardinale est « zéro dé » ne peut pas vendre des tirages.
- **Stores** : thème 18+ — l'App Store (guideline 1.4.3) est hostile aux jeux
  de drogue « encourageants » (précédent Weed Firm, retiré puis réédité
  expurgé) ; Google est plus tolérant en 18+. La voie **web/PWA** (déjà le
  mode de diffusion du repo, GitHub Pages) évite les stores pour les protos et
  le lancement ; un habillage store (« gestion de bloc », fiction assumée
  type *Drug Dealer Simulator*/*Schedule I* qui vivent très bien sur PC) se
  décide après validation du fun.
- **Si F2P quand même** : uniquement cosmétique (skins de planque, saisons =
  nouveaux quartiers), jamais sur la boucle, jamais de timer payant.

---

## 13. Les règles du Bloc (le « lot de règles », en une page)

1. **Tout ce qui est exposé peut être saisi ; ce qui est rangé, jamais.**
2. **La police ne surprend jamais** : chaque coup est la conséquence d'une
   jauge visible que tu as fait monter, cause par cause.
3. **Le hasard n'existe pas** : mêmes causes, mêmes effets (seed du quartier).
4. **On délègue le geste, jamais la décision** (R7).
5. **La pub fait venir les clients ET la BAC** — deux effets parallèles,
   toujours.
6. **Un employé, ça se paie et ça se repose — ou ça te carotte, puis ça
   parle.** À seuils visibles.
7. **Le crédit avance ta croissance et hypothèque ta liberté** — dans les
   deux sens de la chaîne.
8. **Ne jamais tout stocker au même endroit.**
9. **La violence paie tout de suite et coûte pour toujours** (le DOSSIER ne
   se rembourse pas).
10. **Rater un geste ne punit jamais** : la perte était déjà écrite par la
    jauge ; le geste ne peut que sauver (R1).
11. **Chaque outil enlève une corvée ; la tension revient par le système,
    jamais par le re-corsage du geste** (R2/R9).
12. **La Chute n'est pas la fin** : c'est le score.

---

## 14. Découpage protos (sur La Loupe / Shelter)

| Phase | Contenu | Ce qu'on valide |
|---|---|---|
| **P1 — Le spot** | corner jouable : location 20 % du CA, débit piéton (courbe journalière), tampon réglable, 1 chouf, palier police 1–2 (patrouille + pilonnage), mini-jeu d'évacuation | le triangle tampon/débit/saisie est-il un VRAI dilemme ? le préavis chouf est-il lisible ? |
| **P2 — Le four** | nourrice + ravitailleur (navette sur carte), charbonneur + planning de shifts, fiabilité à seuils, palier 3 (place nette), rapport du soir | la délégation libère-t-elle sans vider le jeu ? la répartition du stock est-elle un geste plaisant ? |
| **P3 — Le bloc d'en face** | 1 rival simulé (3 stats), frictions 1–4, repérage, négociation vs opération, vendetta œil pour œil, jauge DOSSIER + la Chute | la violence est-elle un vrai choix (rentable ET toxique) ? la Chute donne-t-elle envie de re-run ? |
| **P4 — Le quartier** | multi-PDV, gérant, onion/crypto, Acte 4 (fournir à crédit) | le retournement « devenir Karim » porte-t-il la méta ? |

Chaque phase = bump `SAVE_VERSION`, captures headless (`tools/shots-loupe.mjs`
à étendre : parcours corner → pilonnage → évacuation), entrée NOTES.md.

---

## 15. Sources (ancrage réel)

- Rôles, salaires (chouf 60–200/j selon villes, 1 800–4 500/mois), nourrices,
  ravitailleurs : [L'Essentiel de l'Éco — combien gagne un guetteur](https://lessentieldeleco.fr/4516-narcotrafic-combien-gagne-un-guetteur/),
  [L'Inspiration Politique — du baron au guetteur, les revenus du trafic](https://www.linspiration-politique.fr/2021/12/10/du-baron-au-guetteur-quels-sont-les-revenus-du-trafic%E2%80%89/),
  [point-de-deal.fr](https://point-de-deal.fr/),
  [Le Monde via Le Pélican — les petites mains du deal](https://www.le-pelican.org/retrouvez-lenquete-monde-petites-mains-deal-de-cannabis/)
- Structure gérant / semi-grossiste, réseau cloisonné, CA (~16,5 M/an pour
  5 points) : [France 3 PACA — réseau Marseille→Nice démantelé](https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/bouches-du-rhone/marseille/un-important-reseau-de-trafic-de-stupefiants-a-marseille-qui-alimentait-des-points-de-deal-jusqu-a-nice-a-ete-demantele-3328493.html)
- Pilonnage / place nette (harcèlement, préjudice en dizaines de milliers par
  fermeture, bilan mitigé, réinstallation) :
  [France 3 — au cœur des descentes « pilonnage » des stups](https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/bouches-du-rhone/marseille/trafics-de-drogue-a-marseille-au-coeur-des-descentes-pilonnage-de-la-brigade-des-stups-2047540.html),
  [Wikipédia — Opérations Place nette](https://fr.wikipedia.org/wiki/Op%C3%A9rations_Place_nette),
  [Sénat — rapport narcotrafic 2024](https://www.senat.fr/rap/r23-588-1/r23-588-133.html),
  [CIRC — bilan mitigé des opérations Place nette](https://www.circ-asso.net/narcotrafic-le-bilan-mitige-des-tres-mediatiques-operations-place-nette/)
- Guerres de points, prises de contrôle (DZ Mafia/Yoda/Blacks à Marseille,
  Planoise à Besançon, Aubiers à Bordeaux) :
  [France 3 — ce que l'on sait des gangs qui se font la guerre](https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/bouches-du-rhone/marseille/narcotrafic-a-marseille-blacks-dz-mafia-yoda-ce-que-l-on-sait-des-gangs-qui-se-font-la-guerre-3042654.html),
  [Le JDD — villes moyennes et points de deal](https://www.lejdd.fr/Societe/reims-cambrai-dijon-angers-nantes-ces-villes-moyennes-rongees-par-la-drogue-4138023)
- Jobbeurs, recrutement Snapchat, dettes fictives, sanctions internes :
  [France Bleu — les « jobbeurs », intermittents du trafic](https://www.francebleu.fr/infos/faits-divers-justice/les-jobbeurs-ces-intermittents-du-trafic-de-drogue-a-marseille-9371259),
  [Mediavivant — Marseille, dealer à tout prix](https://mediavivant.fr/les-djobeurs-ces-petites-mains-des-reseaux/non-classe/marseille-dealer-a-tout-prix/)
- Prix (plaquette 100 g ~200–400 en gros ; détail résine ~8/g, herbe ~10/g) :
  [Psychoactif — prix d'une plaquette](https://www.psychoactif.org/forum/t37738-p1-Prix-une-plaquette.html),
  [junglekush.fr — prix du gramme au 100 g](https://junglekush.fr/combien-coute-cannabis-1-gr-100-gr-prix/)
- Crédit fournisseur → dette (cas documenté) :
  [L'Avenir — le dealer, la dette et le fournisseur](https://www.lavenir.net/regions/luxembourg/arlon/2026/01/28/le-dealer-depose-plainte-contre-son-fournisseur-de-cannabis-au-commissariat-de-police-darlon-646IV7QTVNBNPBK5357XNAITI4/)
