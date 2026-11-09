# Table de R&D V04 — Sons et retours provisoires

10 novembre 2026. Les retours accompagnent les six paliers de qualité génétique, puis l’activation choisie et la conservation. Les synthèses et paramètres restent des essais de ressenti avant intégration Unity ; aucune écoute humaine validée n’est déclarée.

## Ce que les retours confirment

| Usage | Déclenchement | Limite |
|---|---|---|
| Parent posé | Pose acceptée | Papier/contact, sans récompense de précision |
| Bouture prélevée | `HARVEST` enregistré | Une bouture réelle et son débit |
| Essai engagé | `START` enregistré | Deux boutures consommées, résultat et qualité déjà fixés |
| Loupe | `INSPECT` accepté | Vraie tête avant sa fiche |
| Maintien | Début/reprise de la séquence | Départ neutre, puis indices progressifs bornés au palier final |
| Étape de palier | `tier-step-{tier}` commandé pendant le maintien | Ponctuation de présentation, sans point ni nouvelle découverte |
| Révélation finale | `REVEAL` accepté | Score, palier, potentiels et COA deviennent publics |
| Points parentaux | Gain inscrit pour qualité ≥60 | Un point à chacun des deux parents une seule fois |
| Emplacement/aperçu | Consultation | Aucun débit |
| Activation | `ACTIVATE` accepté | Potentiel hérité activé, point débité, emplacement occupé |
| Conservation | `KEEP` accepté | Nom/signature et lignée conservés |
| Refus | Commande rejetée | Aucune mutation, cause lisible et signal discret |

Rare, Epic et Legendary donnent le même point par parent dans cette démo. Aucune étape intermédiaire ni aucun replay ne récompense. Découvrir un potentiel ne l’active pas ; activer ne crée ni hérédité, ni bouture, ni lot. Le score génétique et la qualité réelle du lot restent distincts.

## Maintien et étapes

La séquence dure environ **2,1 secondes cumulées**. Relâcher arrête la montée sonore et conserve l’avancement ; clavier et ouverture assistée conduisent au même résultat. Aucun timing parfait, bonus d’adresse ou nouveau tirage.

La séquence démarre neutre puis ponctue les paliers traversés, sans dépasser le palier final enregistré à `START`. Cette présentation remplace la charge entièrement neutre de V03. Seule la séquence expose ces indices : journal, portraits et COA restent cachés jusqu’à la révélation finale. La couleur d’un palier ne recolore pas le patrimoine de la tête.

`setRevealCharge(progress,active)` conserve un fond synthétique continu à deux oscillateurs. Les événements `tier-step-poor/common/uncommon/rare/epic/legendary` ajoutent leurs ponctuations. Leur profil visuel dure 0,28 seconde, sans particules, sans soulèvement de l’objet ni voile de couleur ; leurs tons courts montent de 220 à 987,77 Hz suivant le palier. Le contrôleur décide des étapes atteintes : le module de retour ne lit pas le résultat caché.

Pause, désactivation du son, volume nul, révélation et destruction du système arrêtent la voix de charge. Le mode Discret atténue cette couche. Ces coefficients ne sont pas un mixage final.

## Six conclusions distinctes

`tier-feedback.js` centralise les profils. Les couleurs viennent de `QUALITY_TIERS` et de la photo fournie, notamment **Rare rouge**, indépendamment des références vidéo.

| Palier | Couleur | Durée du profil VFX | Particules en Expressif | Tons de conclusion en Expressif |
|---|---|---:|---:|---:|
| Poor | Gris | 0,78 s | 6 | 1 |
| Common | Vert | 1,05 s | 18 | 2 |
| Uncommon | Bleu | 1,40 s | 34 | 3 |
| Rare | Rouge | 1,75 s | 52 | 3 |
| Epic | Violet | 2,12 s | 74 | 4 |
| Legendary | Jaune | 2,60 s | 96 | 5 |

Ces durées décrivent les profils visuels de conclusion, pas la durée du maintien ni celle de lecture du COA. L’audio combine contact grave, bruit filtré, notes étagées et souffle selon le profil. Une enveloppe douce accompagne le VFX. Discret réduit l’intensité et les notes intermédiaires ; la réduction des mouvements limite les effets mobiles et supprime les particules. Aucun paramètre de retour n’agit sur la qualité, les chances ou les ressources.

## Événements et provenance

Événements sonores : `paper`, `select`, `start`, `ready`, `harvest`, `point`, `upgrade`, `sign`, `refuse`, les six `reveal-{tier}` et les six `tier-step-{tier}`. Un contact générique, `charge-step` neutre et un alias `reveal` vers Common restent disponibles. `upgrade` désigne l’activation d’un potentiel, sans bonus probabiliste.

Les sons sont des **synthèses originales WebAudio**, sans sample tiers. Un compresseur réduit les écarts ; un événement identique répété dans les 75 ms est ignoré. L’activation explicite du son et le volume sont séparés des réglages de jeu. Chaque confirmation garde un équivalent visuel.

Références fournies : [Opening Starr Drops — Chicotinha](https://www.youtube.com/watch?v=G-sX12EClF4) et [All Starr Drop Sound Effects — Starfer713](https://www.youtube.com/watch?v=pjKabPIBgY4). Elles ont été inspectées **muettes** pour les coques, pulsations, anneaux et changements de présentation : aucune écoute de leurs SFX n’est revendiquée. Aucun son ou asset n’en est repris. L’adaptation conserve le maintien demandé et la palette de la photo, sans copier leurs probabilités.

## Mode test, rejeux et validation

Le mode test et le mode normal restent séparés. Les replays d’une révélation acquise ou d’une activation acquise répètent uniquement les retours, sans commande métier, nouveau tirage ou gain. Le mode normal garde ses distributions.

Préparer Legendary peut créer un relais Y × Z de qualité 89, réellement révélé/conservé, puis le croiser avec Z pour préparer une qualité 100. Ses ressources et points sont tracés dans le carnet ; la cible finale attend sa révélation. Ce montage annoncé ne représente pas une fréquence naturelle.

**Contrôles finaux des sources V04 : 146 tests réussis, zéro échec, puis 146/146 sur les sources exportées ; syntaxe et imports des 19 modules du paquet vérifiés.** Ce total ne constitue pas une écoute ou une preuve de ressenti sonore. La revue navigateur V04 reste à faire après publication ; portage Unity et anciennes preuves V03 sont distincts.

À éprouver : distinction des six conclusions, clarté du passage des indices à la découverte, audibilité des gestes, arrêt lors des interruptions, répétition et fatigue. Comparer le même état en Expressif/Discret, avec réduction des mouvements et sans son. Aucun téléphone physique ni essai humain déclaré. Une future banque devra conserver licence, originaux, variantes et verdict d’écoute. Le portage utilise les interfaces publiques du système de retours du projet, sans modifier les sources fournisseur.
