# CrimWorld — Sandbox 24h (mini-spec, à valider AVANT tout code)

> Statut : **validé (2026-06-21) — décisions §8 tranchées**. Le lot 1 (cœur de
> sim, JS pur, inspectable en console) peut démarrer ; on STOPpe AVANT l'UI
> (checkpoint 2 de la DNA CrimWorld).
> Suite logique de la slice scriptée « La Bascule » (FTUE sur rails) : la
> sandbox laisse le joueur **rejouer la boucle SANS script**.

---

## 0. Ce que la sandbox doit prouver

La slice prouvait deux choses sur rails. La sandbox doit prouver qu'elles
**tiennent sans rails** :

1. **La boucle survit sans script.** Sortie de la FTUE, le joueur continue à
   arbitrer (cupidité ↔ prudence) jour après jour, de lui-même.
2. **La trace tient dans la durée.** Le problème d'aujourd'hui se lit jusqu'à
   une décision d'un jour PASSÉ, sans explication — le rapport de fin de jour
   reste la pièce maîtresse, mais devient **récurrent et cumulatif**.

Critère d'échec : si le joueur « optimise » mécaniquement sans ressentir
d'arbitrage, ou si une conséquence semble tomber « par malchance », c'est raté.

---

## 1. La boucle revue — le cycle 24h

Une journée = une **horloge TEMPS RÉEL** (cœur `tick(dt)`, testable) qui avance ; des événements tombent à des heures
précises ; à minuit, le **rapport de jour**. Phases d'une journée (non
strictement séquentielles — elles se chevauchent via l'horloge) :

| Phase | Action joueur | App / écran | Levier |
|---|---|---|---|
| **S'approvisionner** | commander la matière | 🧅 Marché darkweb + 🚗 Ubeur | tier/rating fournisseur |
| **Couper** | mini-jeu de coupe | 🔪 Établi (hash-slicer 3D) | **qualité (levier UNIQUE)** |
| **Vitriner** | poster la vitrine | ⚡ Snapshit (story) | exposition |
| **Vendre** | répondre aux DM des acheteurs générés | Snapshit (fils) | accepter/refuser |
| **Subir** | la heat de rue monte, la réput bouge | HUD + commentaires | (co-effets) |
| **Minuit** | bilan + dette/loyer qui tourne | 📊 Rapport de jour | la trace |

Réemploi maximal de l'existant : établi, messagerie, stories+commentaires
(brique posée au lot « respiration »), écran de rapport. Nouveautés : horloge,
acheteurs générés, marché darkweb + Ubeur, heat en moteur, rapport cumulatif.

---

## 2. Le moteur de tension — la concurrence pour le corner

**Prémisse (tension primaire, validée).** Le joueur a fait disparaître Momo pour
sortir du piège — mais le corner du dealer est la position la PLUS convoitée du
block, jamais vacante longtemps. « L'argent facile attire les plus mauvaises
intentions » : plus le joueur réussit *visiblement*, plus vite et plus fort **la
concurrence** vient lui disputer le corner. Le succès est l'appât ; on ne se
relâche jamais parce qu'on EST devenu la cible. La dette/loyer reste un compteur
de fond, pas l'antagoniste.

Deux jauges, **co-effets PARALLÈLES** du levier unique (qualité), jamais en
chaîne — l'invariant le plus délicat à coder :

### 2a. Réputation conso (la demande)
- Pilote **qui** et **combien** d'acheteurs te DM (la courbe demande↔qualité).
- Coupe propre → réput monte → bassin d'acheteurs plus large et plus fiable.
  Arrache → réput baisse → flakes, lowballers, moins de monde.
- **Affichée OPAQUE** (brouillage de présentation autorisé : `🔥 ••• `, comme
  les vues de la vitrine). Le joueur sent la tendance, ne lit pas un chiffre.

### 2b. Concurrence / pression sur le corner (l'attention)
- Monte comme **co-effet** de la **visibilité du succès** : exposition (vitrine),
  volume écoulé, coupe à l'arrache. Chaque contribution est **traçable** (cause).
- ⚠️ JAMAIS « moins de ventes → pression ». Volume et pression sont deux sorties
  parallèles de la même cause, pas une chaîne.
- Conséquences (déterministes, traçables) : un **rival** se pointe sur ton
  corner, tague ton spot, casse tes prix, débauche un acheteur. À pression
  haute le corner devient **contesté** → tenir/défendre ou bouger. **Tout trace
  à une décision** (trop exposé, trop écoulé, coupé sale).

### 2c. Garde-fou périmètre
La heat reste **rue** (rivaux, block, Momo). La **heat autorités est HORS
périmètre** — à ne pas coder. Le risque de transit darkweb (§3) doit donc être
cadré côté **rue/rival**, jamais police, sous peine de sortir du périmètre.

---

## 3. La couche darkweb + Ubeur (sourcing & logistique)

L'idée : l'appro et la logistique vivent dans deux apps de l'OS du téléphone.

### 3a. Marché darkweb (façon Silk Road / TOR)
- Listings de fournisseurs : **tier** (cheap/pneu ↔ premium) avec **ratings**
  → c'est le **levier qualité côté matière première**.
- Commande payée en cash. **Déterministe** : ce que tu commandes arrive.

### 3b. Ubeur (suivi de livraison)
- « Court instant d'attente » + **ETA qui tourne sur l'horloge du jour** = la
  texture temps réel du cycle 24h.
- **Présentation** : avatar/position du driver, animation. **Déterministe** :
  contenu et délai de livraison = f(tier/distance), pas un dé.
- **Surface de risque (où vit la tension d'appro)** : une livraison en transit
  = **exposition**. Une interception trace à une **décision** — sur-commander,
  fournisseur cheap mal noté, mauvais créneau du cycle, trop de mouvements —
  **jamais un tirage**. Contribution heat traçable. (Rue/rival, pas police.)

### 3c. Symétrie — INCLUSE en v1 (validé)
Même UI dans les deux sens. Acheteur : tu commandes + tu suis. Patron : tu
**dispatches des drivers vers tes points de deal** (même vue Ubeur, rôle
inversé). Les drivers en mouvement = **exposition supplémentaire** → nourrissent
la pression concurrence (§2b). Construit au lot 4 (avec darkweb/Ubeur).

---

## 4. Acheteurs générés

- **Génération = présentation** : `genProfile()` (déjà posé) fournit pseudo +
  avatar + flavor. Aléatoire de présentation **autorisé**.
- **Comportement = déterministe** : qu'un acheteur paie / revienne / lowball
  découle de **TON état** (ta qualité, ta réput, ton prix), pas d'un roll.
  - La **composition du bassin** = f(réputation) : réput haute → plus de
    fiables ; arrache → plus de flakes. Courbe déterministe.
  - « Revient-il demain ? » = f(qualité de la dose qu'il a reçue), pas hasard.
- Chaque vente/non-vente porte sa **cause** (contrat de données) pour le rapport.

---

## 5. Le rapport de jour (pièce maîtresse, récurrente)

- Même promesse que la slice : **nomme la cause**, ne narre pas.
- Nouveau : **trace inter-jours**. « Aujourd'hui : 3 acheteurs t'ont lâché ↩
  coupe à l'arrache d'avant-hier (réput) ». Le joueur relie son problème
  présent à une décision passée — sur plusieurs jours, sans explication.
- Dette Momo / loyer du corner qui **tourne chaque jour** (l'horloge de §1).

---

## 6. Invariants (rappel — la sandbox les respecte)

- **Aucun aléatoire pilotant l'ÉTAT ou les CONSÉQUENCES.** Seul l'aléatoire de
  **présentation** est permis (qui commente, pseudo/avatar, position du driver,
  brouillage de la réput).
- **Qualité = levier UNIQUE.** Heat de rue et volume écoulé = **co-effets
  parallèles**, jamais une chaîne.
- **Une seule courbe** (demande ↔ qualité) ; réglée par un humain au checkpoint,
  pas par le code ; nombres en constantes nommées.
- **Contrat `cause`** sur chaque conséquence ; l'UI rend le label, n'invente rien.
- **Périmètre** — DANS : dette/loyer, coupe, heat de rue, réput conso,
  délégation via exposition (+ sourcing/logistique = nouvelle exposition).
  HORS (ne pas coder, signaler) : heat autorités, pureté, réput de relation,
  violence, branding, blanchiment.

---

## 7. Ordre de construction (simulation d'abord, UI ensuite)

Chaque lot : sim JS pur testable en **console** → UI → **reviewer** → commit.

- **CP-1** ← *tu es ici* : valider CE document.
- **Lot 1 — Horloge & rapport récurrent.** Cycle 24h nu, avance de l'horloge,
  rapport de jour qui nomme les causes. Console-testable, sans UI.
- **Lot 2 — Bassin d'acheteurs.** Génération (présentation) + comportement
  déterministe piloté par la courbe réput/qualité.
- **Lot 3 — Moteur heat.** Co-effets parallèles + conséquences traçables (rue).
- **Lot 4 — Darkweb + Ubeur.** UI de présentation par-dessus une sim
  déterministe (commande → ETA → livraison).
- **Lot 5 — Intégration & trace inter-jours** dans le rapport.

---

## 8. Décisions (validées le 2026-06-21)

1. **Tension primaire** : **la concurrence pour le corner**. Le succès *visible*
   attire les rivaux (vacuum laissé par Momo) ; la dette/loyer n'est qu'un
   compteur de fond. → moteur §2.
2. **Horloge** : **temps réel** (cœur de sim `tick(dt)` pour rester déterministe
   et inspectable en console).
3. **Risque de transit darkweb** : **rue/rival** (dans le périmètre ; heat
   autorités = hors, on n'y touche pas).
4. **Opacité réput** : **totalement opaque** (comme les vues de la vitrine).
5. **Périmètre v1** : **inclut le dispatch** de drivers (l'inversion §3c, au
   lot 4).
