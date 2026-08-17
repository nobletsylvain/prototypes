# La Loupe — scope complet

**Statut :** vertical slice HTML jouable (v18) · hash live · **Shelter P0** (carte)  
**Produit :** hash d’abord, weed ensuite. Rien d’autre.  
**Ton :** français, humour caustique. Pas d’argot importé.  
**Argent :** neutre (aucune devise). On adopte €/$ plus tard.

### Shelter P0 (sur La Loupe)

- Carte **Quartier Nord** (onglet Quartier) : pins planque · corner · rival (locked) · voies (locked)
- Front d’ouverture Karim : +100 g à crédit, cash tôt moins cher
- **Hit planque** = f(stock, valeur) → chaleur douce en fin de soirée si brûlant
- Hors P0 (plus tard) : chouff, onion/crypto, multi-PDV, soldats, nourrices
- **Design de la suite (P1+)** : voir `SHELTER.md` — « Le Bloc » (four, équipe,
  jauges police, rivalités, la Chute)

---

## 1. Fantasy

Tu tiens un téléphone. Tu achètes en (semi) gros, tu transformes pour le retail, tu délègues la rue, tu ranges le liquide, tu rachètes plus gros. Le plaisir = sentir la cadence monter sans que le geste reste une corvée.

---

## 2. Boucle (toujours la même, plus intense)

```
APPRO (propre) → COUPE → DOSE (sachets)
      → VENTE (DM) → LIVREUR → LIQUIDE → LIASSES → PROPRE → réinvest / plus gros
```

| Étape | Décision | Scale |
|---|---|---|
| Appro | calibre 100 / 250 / 500 | lots plus gros gate standing |
| Coupe | timing → grade | cadence ×N (upgrade) |
| Dose | format 2/5/8 | multi-ensachage selon palier |
| Vente | accepter / ignorer | multi-qty, plus de DM |
| Livreur | dispatch / batch | +scooters, seuil discrétion |
| Liquide | classer billets → liasses | compteur auto (délégation) |
| Réinvest | tools qui changent la boucle | gabarit, cadence, planque, scoot, compteur |

---

## 3. Liquide (refonte v2)

- **Propre** : achetable (appro, fees, upgrades).
- **Liquide** : retour de rue. Ne paie rien tant que non rangé.
- **Tri** : empiler 5 billets identiques → 1 liasse → encaisser en propre (100 %).
- **Pression** : liquide non rangé > seuil → chaleur passive (soft puis hard).
- **Délégation** : upgrade Compteur convertit le reste pendant que tu joues.

Anti-pattern évité : « −8 % si pas tri » (punition plate). Ici le tri est un levier de scale, pas une amende.

---

## 4. Paliers d’intensité (T0–T3)

| Palier | Feel | Déblocages typiques |
|---|---|---|
| T0 Coin de table | 1 coupe, 1 scoot, DM calmes | pain 100 |
| T1 Petite cadence | plus de DM | standing / volume |
| T2 Machine | batch dispatch, lot 500 | cadence coupe, multi-qty |
| T3 Quasi-four | pression permanente | max scooters, weed gate (futur) |

Le palier est **lisible** (HUD `T0`…`T3`). Grossir doit se sentir, pas seulement s’additionner.

---

## 5. Scope 3D (cible suivante)

Composer, ne pas réécrire :

| Surface | Source proto | Rôle 3D |
|---|---|---|
| Atelier coupe | `atelier-3d` (geste canon) | swipe rail, pain low-poly, tranche |
| Visionneuse appro | darkweb D12 | pain 100/250 en page produit |
| Sachets | atelier / hash-slicer feel | ensachage au drag |
| Livreur | `beuhereats` (logique) | carte 2D OK ; 3D optionnel plus tard |
| Liquide | nouveau | liasses / billets low-poly (tactile) |

**Ordre d’attaque 3D :**
1. Atelier coupe hash (geste atelier-3d + éco La Loupe)
2. Visionneuse pain à l’appro
3. Table de tri liquide (billets → liasses)
4. Weed mid : plantation racks + récolte (déjà prototypés)

Shell téléphone = `le-bigo` (bus, causes, apps). La Loupe = boucle économique + feel ; le Bigo = OS.

---

## 6. Hors scope (verrouillé)

- Neige, candy, crack, LSD, meth
- Devises (€, $, crypto)
- Hasard d’état / de conséquence
- Punition sèche sur raté de mini-jeu (R1)

---

## 7. Critères « scope complete » jouable

- [x] Boucle fermée hash sur téléphone
- [x] Argent neutre + liquide à liasses
- [x] Paliers T0–T3 visibles
- [x] Réinvest qui change le gameplay
- [x] Geste coupe 3D (atelier-3d → `scene3d.mjs`)
- [x] Dosage express (tap) — wrap 3D écarté (trop fastidieux, R5/R6)
- [x] Appro visionneuse 3D
- [x] SnapShit intégré (story / drop / DM → file livraison)
- [x] BeuherShit (coursiers, risque cumul, saisie)
- [x] Tri billets manuel (table + liasses)
- [x] Red-team P0/High patchés (v5) : bills exacts, caps coursiers, stock exact, fees, promesse
- [ ] Weed mid débloqué (pas stub)
- [ ] Embed bus-compatible Bigo
- [x] Shelter P0 : carte + front + hit planque (save v18)
- [ ] Save version bumpée à chaque rééquilibrage

---

## 8. Playtest tel

Pages : `https://nobletsylvain.github.io/prototypes/la-loupe/`  
Local : `references/prototypes/la-loupe/`
