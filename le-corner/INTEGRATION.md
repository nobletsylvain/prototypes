# Le Corner → La Loupe : plan de branchement

Préparé le 2026-07-23, à exécuter quand le **loop minimal** de La Loupe
(barrettes 2 g → corner → dette Karim) sera jugé solide. Chaque section mappe
un système du banc d'essai sur son point d'accroche dans `la-loupe/`.

Principe directeur (validé en session) : **la soirée du proto EST le jour de
La Loupe**. Le Corner ne s'ajoute pas comme un mode — il remplace la vente
automatique du PDV quand le joueur est présent. La récompense du présentiel :
**négo au-dessus du menu (marge) + pourboires JUSTE + relations qui montent** ;
l'auto (plus tard : charbonneur embauché) vendra au menu, sans rien de tout ça.

---

## 1. Horloge — une seule, celle de La Loupe

- La Loupe : `DAY_SEC_REAL = 90 s`, la soirée se clôture seule depuis `frame()`
  (note du 2026-07-22). Le proto tourne à 180 s.
- **À faire** : monter `DAY_SEC_REAL` vers 150–180 s **ou** garder 90 s et ne
  faire du rush qu'une fenêtre (~40 s) — c'est le cœur de l'arbitrage
  « tenir le corner ⇄ atelier/SnapShit ». Trancher en test.
- Les `PHASES` du proto (CALME 22 % / RUSH 58 % / FIN 20 %) deviennent la
  **courbe de demande du corner sur la journée** — à caler sur l'horloge unique.

## 2. Écran corner — remplacer la vente auto par la file

- Point d'accroche : l'écran PDV (`shelter`/`pdv`) et son `pdvTick`. Le
  recentrage du 2026-07-23 a déjà posé la règle **« fermé hors présence »**
  (bac et `seq` gelés quand on quitte l'écran) : c'est exactement le hook.
- **À faire** : quand l'écran corner est affiché, brancher la boucle du proto
  (file de silhouettes, client actif, carte, patience, `QUEUE_MELT`) à la place
  du tick auto. Hors écran : corner fermé, les clients passent → compteur
  « clients passés » au bilan de nuit (manque à gagner lisible, jamais de
  punition muette — R1).
- Les **3 curseurs** actuels (demande/satisfaction/heat + déception) ne sont
  plus pilotés en abstrait : ils **émergent** des interactions (JUSTE → 
  satisfaction, abus → déception, louche servi → heat, file expirée → demande).

## 3. Menu & prix

- Le menu du proto (prix par format + stock restant, affiché en permanence)
  se branche sur l'éco réelle : barrettes **2 g ≈ 20** (décision loop minimal),
  `fair` dérivé de la réput comme dans `snap.mjs` (`PRIX_FAIR × (0.6 + reput/120)`).
- L'**écart de l'offre client vs menu** (« −39 % menu », « prix menu »,
  « +30 % ») est l'info centrale à conserver telle quelle.

## 4. La négo — constantes à transposer

Zones (sur le `fair` du menu), version calibrée v4 du proto :

| Zone | Bornes | Effet |
|---|---|---|
| Marge laissée 😍 | < ×0.9 | relation ++, cash faible |
| **JUSTE** 🤝 | ×0.9 – ×1.1, accepté du 1er coup | pourboire × combo ⚡, relation +, réput + |
| **Bien négocié** 😏 | ×1.1 – ×1.2 (`NEGO_MAX`) | la marge du présentiel — ni bonus ni malus relationnel |
| Abus 😒 | > ×1.2 accepté (accros ×1.35, hésitants ×1.15) | il paie, relation −, **2 d'affilée → il ne revient plus** |

- **Grimace à mi-négo** (Recettear, v4) : pendant la contre-offre, la tête du
  client réagit en direct au prix réglé (😍/😊/😏/😬/😤), déterministe (R4).
  Le skill = lire le visage. Le **louche ne réagit pas** (😐) — un indice de
  plus. À transposer avec la carte de négo.
- « Je te dis » (différer sans refuser), le « dernier prix » du client, et le
  tap-sur-la-file pour prioriser se transposent tels quels.

## 5. Clients persistants & entonnoir

- Les personas du proto (relation, exigence, usual, archétypes CLIENT / RADIN /
  ACCRO / GROS / HESIT + louches génératifs) migrent dans la save `loupe_*`
  (nouvelle table `S.clients`), **bump `SAVE_VERSION` La Loupe** à l'intégration.
- Entonnoir à deux canaux (décision du 2026-07-23) :
  - **Corner** = réguliers, radins, accros, hésitants — petits formats, présentiel ;
  - **SnapShit** (au rebranchement) = le haut du panier : le **grossiste** du
    proto est le futur client DM (min ~50 / 5 g+), et un régulier fidélisé
    « monte » au canal DM — commandes à l'avance, livraison BeuherShit.
- **Graphe social** conservé : relation ≥ 40 → le client présente un contact
  (`unlockedBy`). C'est le moteur d'acquisition, il reste côté clientèle.

## 6. Recrutement — retiré du proto, à brancher sur l'embauche La Loupe

Le radin fidélisé → charbonneur (v3 du proto) est **retiré du banc d'essai** :
c'est le système d'embauche de La Loupe qui doit le porter, via le hook déjà
posé au recentrage (`S.upgrades.charbonneur`, dormant). La v3 sert de **spec**
de la vente déléguée :

- il vend **au prix que proposent les clients** (zéro négo, zéro pourboire,
  zéro relation qui monte) ;
- **commission** (25 % dans le proto) ;
- il sert les **louches sans sourciller** → chaleur ;
- candidats naturels : les **RADIN à relation haute** (Yaz, Kenza) — le profil
  volume/prix cassé est structurellement un revendeur.

Le rapport comparé présentiel vs délégué (v3) a validé l'incentive : à
implémenter comme bilan de nuit quand le charbonneur est embauché.

## 7. Cash, chaleur, bilan

- Ventes corner → **liquide** (billets vers la table de tri existante ; les
  pourboires en petites coupures — synergie gratuite avec le tri).
- Chaleur des louches → la **heat de rue / hit planque** existante ; le
  `FLAIR_BONUS` (louche refusé) reste un petit cash de discrétion.
- Le rapport de fin de soirée du proto **fusionne** dans la clôture de nuit
  de La Loupe (chouffes, dette, hit planque) : lignes ventes / JUSTE / négo /
  bien lues / combo / passés sans réponse / louches.

## 8. Ordre d'implémentation proposé

1. Bump `SAVE_VERSION` La Loupe + table `S.clients` (personas, relations).
2. Menu + prix fair sur l'écran corner (affichage seul, vente auto inchangée).
3. File + carte + patience à la place de la vente auto quand présent
   (le gel hors présence existe déjà).
4. Négo complète (zones, grimace, contre-offre, « je te dis », priorisation).
5. Bilan de nuit fusionné + clients passés hors présence.
6. Entonnoir SnapShit (grossistes → DM) au rebranchement de SnapShit.
7. Charbonneur via l'embauche (`S.upgrades.charbonneur`) avec la spec §6.

## 9. Points de vigilance

- **Collision de sessions** : le loop minimal (dette 280/4 j, corner 2 g) est
  en chantier dans une autre session — intégrer APRÈS stabilisation, sur sa
  base à elle.
- **R-rules** : rater une négo = vente perdue, jamais de malus sec (R1) ;
  zéro hasard d'état — hash jour/index comme dans le proto (R4) ; la
  délégation reste un choix (R6) ; l'équilibrage global compense la marge de
  négo (R9 : si le présentiel rapporte ×1.2, les objectifs/dette suivent).
- **Perf mobile** : la file du proto est DOM pur — sur l'écran 3D de La Loupe,
  soit rester en overlay DOM (recommandé), soit porter les silhouettes en
  sprites low-poly dans la scène.
