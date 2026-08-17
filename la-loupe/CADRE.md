# CADRE — Le Bloc (version recentrée)

**Statut :** cadre de design resserré, à côté de `SHELTER.md` (qui reste
l'exploration large). Ici on ne garde que ce qui est **gamifiable simplement**.
Règle de ce doc : *tout est un curseur ou un geste ; pas de sur-système.*
**Aucun chiffre n'est figé** — placeholders à régler humainement.

Décidé en session (2026-07-22) : poids = **système à part entière** ;
Acte 0 = **coupe/conditionnement d'abord** (l'entrée actuelle de La Loupe) ;
carte = le schéma annoté de Sylvain (légende ci-dessous).

Fondations tranchées (même session) :
- **Heat = seuil déterministe** (pas de proba — R4). Chouffes = repoussent le
  seuil + préavis.
- **Échec = perte bornée, jamais de game over** (saisie du stock/cash exposé,
  GAV temporaire d'un employé). Pas de « Chute » (diverge de SHELTER). R1 tenu.
- **Temps = réel + hors-ligne plafonné, actif sans limite** : four en continu
  (rush 17-20h), progression en absence capée (pas de FOMO) — mais **en jeu
  actif, jamais de mur** : toujours une action manuelle plus rémunératrice que
  d'attendre. Zéro énergie, zéro timer bloquant. On joue aussi longtemps qu'on
  veut. **Garde-fou anti-idle** : le passif reste un filet, l'actif domine
  largement (build actuelle OK, ratio à fine-tuner — §3).
- **Qualité = du sourcing** ; la coupe fait le **format**, + *charcler* = levier
  **optionnel** volume↑/qualité↓ (R10 tient — note en §1).
- **Devise = € assumé** (supersede le « neutre » du SCOPE) → on s'appuie sur les
  vrais ordres de grandeur (panier 40-50 €, plaquette 2-4 k€/kg, four 15-20 k€/j).
- **Échelle = quartier → ville → monde** : la carte partagée est UN quartier de
  la ville fictive ; le jeu monte en échelle (voir §2, Échelles).
- **Demande d'un PDV = emplacement (potentiel) + ta pub** (modulation).

Round 3 — paramètres mineurs (même session) :
- **Automatismes = embauche (gestes humains) + outils achetés (automatisation
  matérielle)**. Deux leviers de scale.
- **Corruption (caisse noire) = baisse durable la Heat d'un secteur** (payer un
  ripou relève le seuil de saisie / donne un préavis ; coût récurrent, R4).
- **Blanchiment plafonné par le CA plausible de la façade** ; dépasser = risque
  de contrôle fiscal (DOSSIER). Scale = plus / plus gros commerces.
- **1er proto = hash seul, 1 PDV, boucle complète** (valider le cœur avant
  d'ajouter produits/PDV/logistique).

Schéma de la boucle économique (visuel) :
https://claude.ai/code/artifact/741ac816-5b52-4229-979d-32e3ab1b2620

---

## 0. L'histoire

Un **petit jobbeur** qui a du **flair** et du **talent commercial** remonte les
échelons de la chaîne de valeur — en affrontant **ennemis, faux amis, justice
et violence**. Le moteur (§1) est le même à chaque étage ; il grossit avec lui.
Plus on avance, plus on glisse du **détaillant** vers le
**producteur-distributeur** : à la fin, tu fabriques *et* tu distribues — tu es
devenu ton Karim.

---

## Principe directeur — le puits infini

**En jeu actif, jamais de mur.** À tout moment, il existe une action manuelle
disponible et **plus rémunératrice que d'attendre** : couper, trier le cash,
livrer soi-même, repérer un rival, optimiser un PDV, planifier une expansion.
La couche tactile (R3) est le **puits infini** — on joue aussi longtemps qu'on
veut. Le temps réel donne le *rythme de fond* ; la main donne le *rythme du
joueur*, et la main n'a pas de plafond.

**Lentille de design** (à passer sur chaque système, existant ou nouveau) :
*à cet instant, le joueur a-t-il une action à la main plus rentable que de
patienter ?* Si non → il manque du contenu tactile, ou le passif est trop
généreux (garde-fou anti-idle, §3). C'est le critère qui garde le jeu **actif**
et hors de l'idle.

---

## 1. Le cœur : un PDV = trois curseurs

Chaque **Point de Vente** se pilote par trois nombres :

- **Demande** (clients/h) → la **quantité vendue par heure**. Elle est
  **segmentée par type de produit** : chaque produit (hash, weed, coke…) a son
  **propre réservoir de clients**, **sans substitution** entre produits — un
  acheteur de coke ne prend pas de shit (rupture de coke = ces clients partent
  ou vont chez un rival, ils ne se rabattent pas sur ton hash). Le potentiel de
  base d'un réservoir dépend de l'**emplacement** (passage, quartier), **modulé
  par ta pub** (stories, rabatteurs).
- **Satisfaction** (qualité + prix) → **remplit ou vide le réservoir de ce
  produit**, lentement. Haute → il grossit ; basse (produit médiocre, ruptures,
  prix hors marché) → il se vide. **Lent à construire, lent à perdre : récompense la
  régularité.** La **qualité de base vient du sourcing** (tier fournisseur ou ta
  prod) ; tu peux la **dégrader en charclant** pour gonfler le volume
  (optionnel, voir note R10).
- **Heat** (chaleur du PDV) → monte avec ton activité (débit, promos, cash non
  rangé) ; au-delà d'un **seuil annoncé**, la **saisie tombe** — jamais un dé
  (R4). Les **chouffes repoussent le seuil** et donnent un **préavis**. Chaque
  chouffe est un salaire fixe : **plus de sécurité = marge plus serrée**, voire
  **nulle si la Demande ne couvre pas la main-d'œuvre**. *Se faire prendre =
  perte bornée (stock/cash exposé, GAV temporaire), jamais game over (R1).*

> **Note R10 — tranché.** La coupe a **deux rôles distincts** : *découper*
> (portionner en doses = **format**, le geste tactile de La Loupe) et
> *couper/charcler* (allonger au produit de coupe = **volume ↑ / qualité ↓**,
> levier **optionnel**). La **qualité de base vient du sourcing** ; charcler
> permet de la **dégrader volontairement** pour gonfler le volume — arbitrage
> cupidité/rétention à chaque lot. R10 tient : la coupe reste un levier qualité
> *volontaire*, séparé du portionnage.

**Portée des curseurs** : la **Heat est par PDV** (le spot physique et sa
chaleur police), mais la **Demande et la Satisfaction sont par produit** — un
PDV qui vend hash + coke a **une seule Heat**, mais **deux clientèles
distinctes** qui ne se substituent pas.

### Produits : des marchés séparés, des variétés à venir
Chaque type de produit = un **marché indépendant** (Demande + Satisfaction
propres, zéro substitution). L'arbre produit (hash → weed → coke → héro)
n'empile donc pas « plus du même » : chaque palier **ouvre une nouvelle
clientèle**, avec sa chaîne et ses variétés.

**À définir (prochaine étape)** : les **variétés au sein de chaque produit** —
d'abord le **hash** et la **weed**, puis la **coke**. Chaque variété jouera sur
la **qualité de base** (donc la Satisfaction), le **prix de marché**, et le
**segment de clients** visé. La substitution *entre variétés d'un même produit*
reste à trancher (sans doute **partielle** : un client accepte une autre
variété du même produit, mais préfère la sienne — à l'inverse du zéro entre
produits).

### Le prix est (presque) fixé par le marché
Le prix de détail **doit rester stable** pour maintenir la Demande : ce n'est
**pas** un robinet qu'on monte pour gagner plus — dévier au-dessus fait fuir le
réservoir. Le prix n'est donc pas le levier de profit, c'est une donnée du
marché.

### Battre la concurrence sans violence : au prix de sa marge
Pour prendre des clients à un rival, deux leviers — **qui mangent tous deux la
marge** :

- **Qualité ↑** : acheter un meilleur produit (souvent plus cher) →
  Satisfaction ↑ → réservoir qui se remplit plus vite… mais marge/vente ↓.
- **Prix ↓** : casser le prix sur un produit équivalent → tu prends la Demande
  du rival… mais tu manges ta marge.

C'est **l'alternative non-violente à la guerre de territoire** : tu t'exposes
en **marge** pour être agressif, plutôt qu'en **Heat/risque** pour être violent.

### Deux façons de desserrer l'étau (les deux prévues, elles se combinent)

- **Intégration verticale — posséder la chaîne de valeur** (amont → aval) :
  **sourcer** soi-même (meilleur fournisseur → go-fasts → contact direct),
  **produire** soi-même (weed → hash → coca, SHELTER §2), **distribuer**
  soi-même (ta flotte, ton call center). → baisse le **coût de revient**, donc
  tu gagnes la guerre de marge (qualité/prix) **sans t'y saigner**. *Karim n'est
  qu'un tremplin qu'on dépasse dès ses premiers go-fasts.*
- **Intégration horizontale — absorber les concurrents** (même niveau) :
  racheter ou absorber un PDV / un réseau rival, par le **rachat** ou par la
  **force** (§7). → supprime le concurrent, **son réservoir devient le tien**,
  plus de guerre de marge sur ce secteur.

L'intégration est **la vraie récompense de progression** : elle change un
avantage concurrentiel *coûteux* en avantage *structurel*, et pousse le joueur
vers le **producteur-distributeur**.

> Prix ~fixe · Qualité et Prix↓ = leviers qui coûtent la marge · Chouffes =
> sécurité qui coûte la marge · **Verticale = baisser son coût · Horizontale =
> supprimer le concurrent. Les deux desserrent l'étau, autrement.**

---

## 2. La carte : des points logistiques à débloquer

Pas de placement de tuiles au pixel. Sur la carte (Quartier Nord), des **spots
fixes** qu'on **débloque au fil de la progression**. Légende (schéma Sylvain) :

| Icône | Élément | Rôle |
|---|---|---|
| ★ jaune | **Point de Deal (PDV)** | vente ; porte les 3 curseurs |
| ■ sombre | **Nourrice Produit** | stock de produit déporté (ravitaille les PDV) |
| ■ cyan | **Nourrice Argent** | stock de cash déporté (reçoit la collecte) |
| ● rouge | **Chouffe** | poste de guet ; baisse la Heat des PDV proches |
| ⬡ vert | **Call Center** | dispatch livraison (débloqué tard, §4) |

Deux flux **séparés** (le cloisonnement, rendu spatial) :

```
Nourrice Produit  ──ravitaille──▶  PDV  ──collecte──▶  Nourrice Argent
                    (produit)              (cash)
        ▲ chouffes autour = Heat basse sur ce secteur ▲
```

Le produit et le cash **ne dorment jamais au même endroit** et **ne voyagent
pas ensemble**. Une saisie ne frappe que ce qui est exposé sur *un* flux.

### Échelles : quartier → ville → monde

La carte partagée (pins PDV / nourrices / chouffes / call center) est **UN
quartier** de la ville fictive. Le jeu **monte en échelle** :

- **Quartier** (le Bloc) — tenir ses PDV, ses nourrices, son call center ;
  rivaux = les **blocs voisins**.
- **Ville** — plusieurs quartiers ; rivaux = d'autres réseaux ; l'intégration
  **horizontale** (absorber) et **verticale** (produire/importer) prend tout
  son sens.
- **Monde** (si tout va bien) — sourcing international (go-fasts, ports, contact
  direct), **producteur-distributeur** qui alimente plusieurs villes.

*Pour plus tard — mais ça oriente les systèmes dès maintenant : **tout doit
pouvoir se répliquer d'un cran au-dessus** (un PDV, puis un quartier, puis une
ville se pilotent avec les mêmes curseurs + automatismes). C'est le principe de
conception qui garde l'ensemble cohérent quand on scale.*

---

## 3. Faire soi-même → poser des automatismes

**Au début, tout est manuel** (c'est la règle d'entrée) :
- tu **ravitailles** un PDV en produit depuis la nourrice/planque ;
- tu **récoltes** le cash du PDV ;
- tu ressens les 3 curseurs sur un seul spot.

**Ensuite, tu débloques la délégation** : tu ne fais plus le geste, tu poses
une **règle** —
- « **Récupère le cash de PDV1 toutes les 2 h** » ;
- « **Livre le produit X (format Y) sur PDV2 toutes les 4 h** » (avec gestion
  du stock, du type de produit, du conditionnement) ;
- un porteur/ravitailleur exécute ; toi tu passes à la décision suivante.

**Deux voies de déblocage** : les gestes **humains** se délèguent par
l'**embauche** (porteur → auto-collecte, ravitailleur → auto-ravitaillement,
charbonneur → vente sans toi) ; l'automatisation **matérielle** (compter le
cash, rentrer le tampon) par des **outils achetés** (compteuse, cache
aménagée). Deux leviers de scale distincts.

*C'est R7 : on délègue le geste répétitif, jamais l'arbitrage.* Le poids (§6)
est **ce que l'automatisme soulage** — payer un porteur, c'est ne plus subir
les allers-retours.

*Temps réel + hors-ligne plafonné : une fois délégués, les automatismes
tournent aussi en ton absence, dans la limite du plafond (pas de FOMO, pas de
punition d'absence). **Mais en jeu actif, jamais de mur** — reprendre un geste
à la main (couper, trier le cash, livrer, repérer, planifier une expansion) est
toujours possible et **plus rémunérateur que d'attendre**. La couche tactile
(R3) est le puits infini : la délégation enlève la corvée sans jamais fermer la
porte au jeu, on joue aussi longtemps qu'on veut. Zéro énergie, zéro timer
bloquant (conforte le choix premium). **Corollaire anti-idle** : le passif
(four qui tourne, hors-ligne) reste un **filet**, jamais la source principale —
sinon on glisse en idle game. Critère de tuning (la build actuelle feele déjà
bien, à affiner) : **attendre ne doit jamais être une stratégie viable**.*

---

## 4. Le Call Center (plus tard)

Arrive **après** la maîtrise des PDV. D'abord **manuel** : les DM tombent sur
**SnapShit**, tu **réponds** et tu **envoies un scooter** livrer (canal mobile,
en plus des PDV fixes). Puis **automatisable** comme le reste (dispatch auto
selon dispo/proximité). Non prioritaire pour le premier proto.

---

## 5. L'argent : trois outils débloqués progressivement

### Outil 1 — Argent liquide
- **Récolte** sur les PDV → **liquide en poche**, **limité en poids** (§6).
- **Conditionné + stocké à la planque**.
- **Paie des employés chaque soir** : un **meuble « paie »** à la planque
  **prélève automatiquement** le salaire du jour. **Si l'argent manque → les
  employés ne travaillent pas** (le lendemain, PDV à l'arrêt).
- **Dépôt crypto quotidien plafonné** (~< 1000/jour, à fine-tuner) : convertir
  un peu de liquide en crypto, chaque jour, sans éveiller les soupçons.

### Outil 2 — La Hawala (faire transiter l'argent vers l'extérieur)
- **Convertir en crypto** pour **acheter matos/produits sur app dark web**, ou
  alimenter une **caisse noire** → **pots-de-vin** : payer un ripou (flic, élu,
  bailleur) **relève durablement le seuil de saisie d'un secteur** ou donne un
  préavis systématique (coût **récurrent**, effet déterministe, R4). Levier de
  **protection** à arbitrer contre son coût.
- **Payer des services à l'étranger** : livraison de produit, matériel,
  voiture, armes…
- **Acheter des outils de production à l'étranger** : exploitation de hash,
  usine de coca, etc. → *c'est le levier d'intégration verticale (SHELTER §2).*

### Outil 3 — Le blanchiment (magasins vitrines)
- **Commerces de façade** + **hommes de paille** : transformer le cash en
  **argent propre**. **Plafond = le CA plausible de chaque façade/jour**
  (méthode du *commingling*) ; **dépasser = risque de contrôle fiscal**
  (DOSSIER). Scale = **ouvrir plus / de plus gros commerces** — le blanchiment
  devient un business à part entière.
- **À quoi sert le propre** (le blanchiment n'est pas un cul-de-sac) :
  **frais de justice** (défense face aux poursuites — l'arme légale contre la
  « justice »), **matériel**, et **immobilier dans des zones plus rentables**.
  → Le propre **finance l'ascension** : racheter du terrain là où ça rapporte
  le plus reboucle sur l'ouverture de nouveaux secteurs.

*Progression : liquide (tôt) → hawala (quand on veut acheter/produire à
l'étranger) → blanchiment (quand le cash propre devient le goulot).*

---

## 6. Le poids (système à part entière)

Le liquide et le produit **pèsent**. Une seule unité physique : **la place**
(encombrement). Chaque contenant a une capacité, chaque déplacement une charge.

- **Poche/porteur** : limité → r­­écolte et ravitaillement coûtent des trajets.
  C'est précisément ce que les **automatismes (§3)** soulagent.
- **Le cash s'accumule en place** en petites coupures ; il **ne paie rien tant
  qu'il n'est pas rangé/blanchi** → **timer naturel** vers l'argent (§5), sans
  timer artificiel.
- **Leviers** (déblocables, R2) : **compteuse** → **sous-vide** (−encombrement)
  → **grosse coupure** (plus de valeur par place) → **Nourrice Argent** (cash
  déporté, cloisonné).
- **Geste tactile** : **charger la planche** (packing des briques dans un
  volume contraint). Bien packé = plus de place utile ; mal packé = un trajet
  de plus. **Rater ne perd rien** (R1).

> Détail complet du modèle de poids : voir `SHELTER.md` (section Poids). Ici on
> retient qu'il **branche** la collecte/ravitaillement (§3) et l'argent (§5).

---

## 7. La violence (feutrée, en surface)

Présente mais **jamais graphique, jamais romancée**. Elle vit en **surface** :

- **Armes**, **attaques de PDV**, **concurrents** qui contestent un secteur.
- Recrutement de **soldats** / lancement d'un **contrat** via des **stories
  SnapShit** (le canal, pas la scène).
- Effet en jeu = **systémique et abstrait** : un secteur peut basculer, un PDV
  peut être attaqué (perte du stock exposé), une rivalité monte la Heat. On ne
  montre **aucun acte**, on en subit/pilote les **conséquences chiffrées**.

*Ligne rouge de ton : la violence est un levier de gestion, jamais un spectacle.*

---

## 8. Acte 0 — par quoi on commence

L'entrée **actuelle de La Loupe est conservée** : acheter à Karim (100 g à
crédit) → **couper** → **conditionner**. Le **premier PDV** n'arrive qu'une
fois qu'on a **du produit prêt**. La vente territoriale (les 3 curseurs) se
**greffe sur la boucle produit existante**, elle ne la remplace pas.

Ordre de découverte pressenti :
1. Coupe/conditionnement (existant) → premier stock.
2. **1 PDV à la main** : ressentir Demande / Satisfaction / Heat.
3. **Chouffes** : acheter de la couverture, sentir le coût sur la marge.
4. **Automatismes** : déléguer récolte + ravitaillement.
5. **Nourrices** (produit puis argent) : déporter et cloisonner.
6. **Argent** : liquide → hawala → blanchiment.
7. **Call Center** : livraison manuelle puis auto.
8. **Concurrence/rivalité** : un rival conteste un secteur → étau sur la marge
   (qualité ↑ ou prix ↓), ou escalade violente (§7).
9. **Intégration verticale** : posséder la chaîne — sourcer (go-fasts, contact
   direct), produire (weed → hash → coca), distribuer — via les outils/services
   achetés à l'étranger (hawala, §5). Baisse le coût → marge large ET
   compétitive. **La réponse structurelle à l'étau du point 8.**
10. **Intégration horizontale** : absorber les PDV/réseaux rivaux (par rachat ou
    par la force, §7). Supprime la concurrence, grossit le territoire d'un coup.
11. **Producteur-distributeur (sommet)** : tu possèdes la chaîne *et* le
    marché ; le propre blanchi rachète du terrain dans des zones plus rentables
    → la boucle se referme, tu es devenu ton Karim.

**Périmètre du 1er proto jouable (décidé)** : **hash seul, 1 PDV, la boucle
complète** — coupe → 3 curseurs (Demande/Satisfaction/Heat) → cash → paie →
premier automatisme. On valide le **cœur** (le PDV à 3 curseurs + la déception)
avant d'ajouter d'autres produits, d'autres PDV et la logistique. Les 15
produits (`VARIETES.md`) et la carte multi-PDV viennent **après** cette
validation.

---

## 9. Ce qu'on a volontairement écarté (garde-fous)

- Pas de placement de guet G1-G10 au pixel → **chouffes = points à débloquer**.
- Pas de multi-jauges police → **une seule Heat par PDV**.
- Pas de violence incarnée → **surface seulement** (§7).
- Pas de micro-gestion une fois délégué → **règles/politiques** (§3).
- La sur-complication de SHELTER.md reste **là-bas** comme réserve d'idées ;
  ici, le cadre jouable.
