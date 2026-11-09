# Noyau exact de la démo de production V01

Implémentation autonome de jeu, sans procédé réel. Source : `Production hashish - Brief de prototype.md`, y compris les précisions des 27, 29 et 30 octobre 2026. L'appelant possède le rendu, les entrées, les sons et les trajectoires ; le noyau possède les quantités, contributions, objets et transitions.

## Appels

```js
import { createState, dispatch, tick, mass, audit, inventorySlots } from './model.mjs';
const state = createState();
const result = dispatch(state, { type: 'load', lotId: 'lot-amber-01', grams: 1000 });
const events = tick(state, elapsedSeconds, { press: false, pour: false });
```

`dispatch` modifie l'état sur succès et renvoie `{ok:true,code:'ok',events}`. Sur refus il renvoie `{ok:false,code,events:[]}` : **tout l'état sérialisé reste strictement inchangé**. Aucun journal de refus n'est écrit dans l'état. `tick` renvoie directement une liste d'événements. Un pas supérieur à 0,25 seconde est plafonné ; un temps invalide ou non positif ne change rien. Les maintiens sont fournis à chaque pas, pas mémorisés à l'intérieur du modèle. Une perte de focus doit remettre les entrées à `false` côté application.

## État

- `source`: contributions `{lotId,grams}` encore disponibles.
- `lots`: métadonnées d'origine : variété, récolte, qualité propre, couleur, granularité, rugosité. Il n'existe **aucune qualité moyenne de plaquette composite**.
- `drum`: `contents`, `speed`, `angle`, `work`. `work` est interne à la simulation et ne doit pas devenir une jauge de progression.
- `jars`: `{id,location,contents}`. Lieux `stock`, `inventory`, `press`, `reuse`. Les pots vides restent des objets. `reuse` signifie que le joueur a explicitement confié le pot vide au tambour. Aucune obligation de fournir ces pots n'est ajoutée au cycle.
- `press`: `format` (100 ou 250), `variety`, `queue` (IDs dans l'ordre du dépôt), `tray`, `mold`, `trayHeld`, `progress`, `phase` (`idle` ou `returning`), `returnTime`, `lever` (position visuelle normalisée). Le progrès reste acquis à la relâche ; le levier remonte indépendamment.
- `plates`: `{id,format,variety,contents,location,packageId?}`. Lieux `floor`, `hand`, `package`. Les contributions sont fixées à l'éjection et ne sont plus fusionnées ou modifiées.
- `packages`: `{id,plateIds,location,variety,format}`. Lieux `hand`, `floor`, `opened`. Les anciennes ouvertures conservent leur historique d'IDs ; seuls les paquets fermés possèdent actuellement leurs objets.
- `settings`: paramètres fictifs de l'essai. `ids`, `jarRecords`, `plateRecords`, `lotRecords`, `initialByLot`, `counters` sont des preuves internes, pas des commandes de jeu.

`mass(contents)` additionne les unités entières ; `inventorySlots(state)` renvoie des groupes de pots par variété, dix au maximum par case. Cela ne limite ni la presse ni le ramassage.

## Actions

| `type` | Champs | Effet |
|---|---|---|
| `load` | `lotId`, `grams` | Débit explicite de la source vers le tambour. Animation du versement à gérer par la vue. |
| `impulse` | — | Petit gain de vitesse plafonnée ; inertie puis ralentissement dans `tick`. |
| `takeJar` | `jarId` | Un pot précis de la sortie vers l'inventaire. Répéter à la cadence de maintien pour une prise choisie. |
| `depositJars` | `jarIds` | Contrôle atomique de tout le dépôt : IDs distincts disponibles, variété unique compatible, total multiple du format actuel. La liste définit l'ordre d'alimentation. |
| `withdrawJar` | `jarId` | Reprise d'un pot précis, vide ou entamé, avec exactement son reste. |
| `reuseJar` | `jarId` | Confie volontairement un pot vide de l'inventaire au prochain remplissage du tambour. |
| `takeTray` / `putTray` | — | Prise ou repose du bac. La repose au moule plein est automatique. |
| `pour` | `grams` | Transfert entier ponctuel depuis le bac tenu ; autorise un vrai débordement. Le maintien normal utilise plutôt `tick(...,{pour:true})`. |
| `press` | — | Vérifie explicitement le refus de démarrage, sans démarrer de maintien caché. Maintien réel : `tick(...,{press:true})`. |
| `setFormat` | `format` | 100 ou 250, moule vide et poste au repos. Stock insuffisant autorisé. La vue anime le tiroir. |
| `recover` | `source:'tray'|'mold'`, `jarId`, `grams?` | Récupération dans un pot existant en inventaire avant le début du pressage. Par défaut, prend le minimum de matière disponible et place dans le pot. Pas de pot créé implicitement. |
| `selectPlate` | `plateId` | Prend la plaquette visée ; sélection homogène variété/format, qualités libres, 30 maximum. |
| `deselectPlate` | `plateId` | Repose cette plaquette précise ; les autres restent en main. |
| `wrap` | — | Un paquet de toute la sélection, en main. Renvoie aussi `packageId`. Rouleau sans consommation. |
| `dropPackage` | `packageId` | Paquet posé. Position choisie gérée par la vue. |
| `openPackage` | `packageId` | Paquet posé ouvert ; mêmes objets remis au sol. Aucun passage automatique en main. |
| `setFeel` | `feeling:'snappy'|'weighty'` | Deux réglages de goût. Alias `setFeeling`, champ `preset` accepté. |

Les refus sont des clés anglaises que la table de textes de l'application traduit : `invalid_quantity`, `drum_full`, `different_variety`, `jar_unavailable`, `invalid_selection`, `incomplete_deposit`, `empty_jar_required`, `tray_unavailable`, `tray_empty`, `pour_unavailable`, `invalid_format`, `mold_busy`, `invalid_source`, `recovery_unavailable`, `mold_incomplete`, `plate_unavailable`, `hands_busy`, `selection_full`, `incompatible_plate`, `package_unavailable`, `invalid_package`, `invalid_feeling`, `unknown_action`.

## Événements pour le raccord SFX/VFX

`loaded`, `impulse`, `jarProduced`, `jarTaken`, `jarsDeposited`, `jarWithdrawn`, `jarReused`, `trayFed`, `trayTaken`, `trayRested`, `poured`, `overflowReturned`, `moldFull`, `pressReady`, `pressStarted`, `pressCompleted`, `plateEjected`, `formatChanged`, `recovered`, `plateTaken`, `plateDropped`, `wrapped`, `packageDropped`, `packageOpened`, `feelingChanged`.

Le débit matière des pots vers le bac ne s'effectue qu'avec des pots explicitement déposés, dans l'ordre `queue`, et lorsque le bac repose. Il n'automatise jamais le versement dans le moule ou le pressage.

`poured` expose `departed`, `accepted`, `overflow`, `neverPoured`. Le vrai débordement a quitté le bac, passe par le moule puis revient **au même bac** dans cette transaction ; la vue peut représenter son trajet. Le surplus jamais versé est distinct. `overflowReturned` contient les contributions exactes retournées. Les VFX ne possèdent pas une seconde copie comptable de cette matière.

L'éjection crée l'objet seulement après la remontée. `plateEjected` donne son ID, format et contributions ; sa trajectoire, ses contacts, son impact et sa pile sont indépendants des quantités. Une ouverture donne les IDs exacts à réafficher au lieu de créer de nouvelles plaquettes.

## Paramètres provisoires de jeu

Ce sont des nombres d'essai, sans prétention de fabrication réelle : bilan abstrait temporaire **1 unité entrée = 1 unité pollen**, stock initial 10 000 unités (4 250 / 4 250 de deux récoltes de la variété amber ; 1 500 d'une autre variété ochre), pot 250 unités, tambour 1 000, bac 300. L'interface peut les présenter comme grammes du jeu.

Cadence interne : rotation maximale 8 radians/seconde, impulsion 3,1, friction exponentielle 0,52 ou 0,65, production abstraite liée au déplacement angulaire avec coefficient 20 ; chargement des pots vers le bac 350 unités/seconde ; versement 155 unités/seconde. Pressage « vif » 2,6 secondes ou « appuyé » 3,3 ; retour 0,65. Ces valeurs règlent le rythme d'une démonstration, sans température, pression, recette ni rendement réel.

Les dix plaquettes constituent le scénario d'essai. Aucun plafond de série n'est codé. Le format 250 est disponible par commande de démonstration ; aucun déblocage de campagne n'est simulé.

## Vérification

`audit(state)` retourne `{ok,errors,total,byLot,jars,plates,packages}`. Il vérifie les masses entières par lot sur tous les lieux comptables, les métadonnées des lots, capacités, variétés, file de dépôt, identités et compositions des objets, propriété des plaquettes/paquets, sélection tenue et comptage du débordement. Les coordonnées, rebonds et durées de contact ne sont pas des seuils bloquants du bilan.

Lancer `node --test model.test.mjs` depuis ce dossier. Les tests utilisent les actions publiques pour produire la matière ; aucune génération directe de plaquette n'est employée. Ils comprennent une série supérieure à dix, la sélection de trente, la répétition des ouvertures, l'audit après 4 000 actions pseudo-aléatoires et la comparaison intégrale de l'état avant/après chaque refus. Le navigateur, les sons et le confort humain restent des vérifications distinctes.

## V02 — présentation du chargement

`stopDrum` arrête uniquement la vitesse mécanique et émet `drumStopped`. Le contrôleur valide une future charge sur une copie de l’état, arrête le tambour, anime le chargement pendant trois secondes, puis exécute une seule action `load`. Aucun débit matière n’est exécuté avant la fin de ce geste. Un redémarrage de l’essai annule la charge en attente. Le reste du modèle, notamment toute la presse, reste celui de V01.

Les modes `branches` et `buds` présentent le même lot abstrait. Les branches séchées portent leurs têtes, sans étape de taille dans cet essai. Tiges et ramifications n’ont pas une seconde masse et ne modifient aucun rendement. Le choix reste verrouillé pendant le versement et tant que le tambour contient une charge. Les essais de séchage/effeuillage des autres parcours restent distincts.
