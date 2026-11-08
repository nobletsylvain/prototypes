# Table de R&D — Passation vers Unity

Version de démonstration : V01, préparée les 8 et 9 novembre 2026. Ce document décrit le contrat de la démo web et une proposition de raccordement. Aucun composant, import ou build Unity n’est livré par cette passation.

[Démo](../index.html) · [Vérifications et limites](../README.md) · [Sons provisoires](AUDIO.md)

## Décisions conservées

- Les gestes accompagnent les choix : fiches et calques se calent généreusement, rotation et loupe restent stables. Position précise, vitesse du geste et adresse ne modifient jamais le résultat.
- Les calques montrent une intention ou un potentiel. Une petite production visible précède la découverte. Le joueur examine l’objet avant de demander sa fiche et sa comparaison avec les parents.
- La recherche est personnelle. Chaque essai consomme une bouture physique de chacune des deux variétés parentes, provenant de plantes cultivées du joueur. Ces deux boutures remplacent les graines ; le pot est mobilisé, pas détruit.
- Une variété conservée garde son identité, ses parents, son profil et son apparence. Son nom ne crée pas une nouvelle identité. Sa reproduction future part d’une bouture de cette variété sans refaire le croisement.
- Identité de variété, quantité/qualité du lot et adéquation à une clientèle sont distinctes. Rareté, force et volume visible ne deviennent pas une qualité implicite.
- La fiche peut être montrée et téléchargée. Elle ne transfère pas une création jouable vers une autre carrière et ne déclenche aucun partage externe automatique.

## Objets et données

| Objet logique | Contrat à préserver | Présentation |
|---|---|---|
| Variété parente | Identifiant, nom, profil et apparence | Fiche et spécimen de référence |
| Bouture | Identifiant physique unique, variété, `sourcePlantId`, disponibilité | Objet identifiable lié à sa variété |
| Pot | Identifiant et réservation par essai | Pot occupé pendant la production puis disponible |
| Essai | Identifiant, deux `cuttingIds`, parents, intention, résultat fixé et état | Dossier puis entrée de journal |
| Variété créée | Identifiant, profil, apparence, parents, essai d’origine, nom et signature | Spécimen, fiche et généalogie |
| Lot | Identifiant, quantité, unité et qualité propres au lot | Relevé séparé du profil de variété |
| Connaissance | Examen commencé, fiche révélée | Affichage progressif ; une inconnue n’est pas zéro |
| Ressenti | Mode sensible/discret, volume, réduction des mouvements | Présentation uniquement, hors calcul du résultat |

Le spécimen est une unité de présentation, sans masse réelle ni formule de rendement. Une intégration à des lots mesurés devra raccorder les quantités aux règles exactes du jeu ; les grammes ne se déduisent pas du volume du modèle 3D.

## États et commandes

| Commande | Transition | Effet matériel et présentation |
|---|---|---|
| `START` | Préparation valide → `growing` | Consommer une fois deux boutures disponibles, réserver le pot et fixer le résultat avant l’animation. |
| `ADVANCE` | `growing` → `ready` | Libérer le même pot et rendre le spécimen disponible ; ni nouveau calcul, ni restitution des boutures. |
| `INSPECT` | `ready` → `inspected` | Approcher le résultat sous la loupe et permettre rotation/zoom ; fiche encore masquée. |
| `REVEAL` | `inspected` → `revealed` | Montrer fiche, parents et résultat ; aucune mutation du profil ou des ressources. |
| `KEEP` | `revealed` → `kept` | Conserver la même identité avec un nom et une signature facultative. |
| `ARCHIVE` | `revealed` → `archived` | Garder l’essai non retenu dans le journal, sans rembourser les ressources. |

Le contrat exécutable est dans [model.mjs](../source/model.mjs), avec un schéma de sauvegarde `1`. Dossier, variété et lot portent respectivement les identifiants `trial-NNN`, `variety-NNN` et `batch-NNN`. `START` reçoit deux identifiants de parents et choisit pour chacun la première bouture physique disponible. Le dossier conserve leurs `cuttingIds` et la provenance reste vérifiable.

Un `requestId` déjà engagé ne redébite rien. Le délai de douze secondes est géré par l’interface ; `ADVANCE` représente le passage du temps de preview. Un refus laisse l’état strictement inchangé. Au chargement, reconstruire la scène depuis l’état sauvegardé, sans rappeler `START`.

## Transaction et sauvegarde

La démo écrit l’état complet dans le stockage local sous verrou inter-onglets et synchronise les onglets. Si ce verrou ou le stockage n’est pas disponible, l’engagement est bloqué. Le résultat est fixé et enregistré lors de l’engagement ; recharger n’est pas relancer.

Le stockage est propre à un navigateur sur un appareil. Ce n’est ni une sauvegarde cloud ni une synchronisation téléphone/ordinateur. Seule une réinitialisation explicite recrée le jeu d’essai. La nature jetable d’une carrière de test ne permet pas un double débit ou un nouveau calcul lors d’un rechargement.

Pour Unity, la proposition est une transaction unique : vérifier les ressources, consommer, réserver le pot et enregistrer le dossier avec son résultat fixé, puis émettre les événements de présentation. Chargement, examen, réglages de ressenti et nommage ne déclenchent jamais une nouvelle découverte. La libération du pot conserve son identité. Une future évolution doit versionner les règles et l’apparence sans transformer silencieusement les créations conservées.

## Contacts, sons et VFX

Les noms ci-dessous proposent des événements de portage ; ce ne sont pas des APIs Unity déjà présentes.

| Événement proposé | Déclenchement | Retour |
|---|---|---|
| `ParentCardPlaced` | Fiche acceptée dans sa zone | Friction, contact doux et calage, sans score de précision |
| `IntentOverlayPlaced` | Intention choisie et calque posé | Superposition translucide ; potentiel clairement nommé |
| `TrialCommitted` | Engagement réellement accepté | Contact du dossier/pot, distinct de la découverte |
| `TrialReady` | Petite production terminée | Présence du spécimen, sans révéler sa fiche |
| `InspectionStarted` | Prise explicite sous la loupe | Rapprochement et rotation/zoom libres |
| `ResultRevealed` | Révélation demandée après examen | Fiche et ponctuation brève, sans longue interruption imposée |
| `CreationKept` | Conservation acceptée et enregistrée | Signature et branche du journal |
| `CommandRefused` | Commande refusée | Cause lisible, signal discret, aucune mutation |

Les contacts sont regroupés par geste. Une animation interrompue ne répète pas la transaction. Le mode discret désactive les retours renforcés et le mode sensible les réactive sur le même état ; aucun résultat ou coût n’en dépend. Le volume reste indépendant. La réduction des mouvements et les boutons de manipulation accompagnent les commandes par glissement.

Les sons WebAudio sont provisoires. L’écoute, la fatigue en répétition et le confort restent à juger. Lors du portage, les contacts peuvent être raccordés au système de retours existant par son interface publique, sans modifier ses sources tierces.

## Paramètres de démonstration

| Paramètre | Valeur de démo | Limite |
|---|---|---|
| Profils | Aube : citronné/élan ; Lisière : boisé/calme ; Velours : floral/rêverie | Profils de jeu fictifs, pas catalogue final |
| Stock | Trois boutures par profil et un pot | Ne fixe pas rendement ou geste de prélèvement |
| Essai | Un résultat et un spécimen de lot | Ne fixe pas candidats, masse récoltée ou qualité garantie |
| Durée | Douze secondes et avance de preview | Ne règle pas le temps du jeu |
| Profil | `aroma` : goût parent A + caractère parent B ; `character` : inverse | Exemple déterministe, pas moteur d’héritage final |
| Variation | Reflets dorés/mauves alternés par numéro d’essai | Ni hasard biologique ni probabilité finale |
| Qualité du lot | `demo-standard`, distinct du profil | Témoin constant, pas formule de qualité |
| Partage | Image SVG statique de la fiche | Pas d’import jouable, publication automatique ou unicité mondiale |

Les neuf boutures permettent au plus quatre essais entre parents distincts. Le journal ne réapprovisionne pas le stock. La reproduction ordinaire n’est pas jouable dans V01 : son principe d’identité stable est conservé sans inventer coûts, ressources ou délais. Les emplacements de spécialisation et les recettes des autres produits ne sont pas définis par cette démo.

## Spécimen et provenance technique

Un modèle de référence existant a été repris avec 526 triangles, une composante, un matériau et un pivot au bas de la tige. Ses dimensions de référence sont 41,264 × 67,733 × 37,279 mm ; la mise à l’échelle de présentation n’attribue aucune masse au spécimen.

Le dérivé web, embarqué dans [la démo autonome](../index.html), conserve la géométrie et les UV, avec normales plates recalculées. Sa texture est une conversion de couleur de 2048 à 512 pixels en JPEG qualité 90. Les couleurs et reflets de démonstration ne représentent pas des propriétés biologiques. Les contrôles de conversion ne constituent pas un test de performance téléphone ou une validation de rendu Unity.

La bibliothèque de rendu conserve sa [licence](../LICENSE-three.txt). Les sons sont synthétisés par le code audio embarqué dans la démo, sans sample tiers sélectionné.

## Vérifications et reprise Unity

Le modèle a passé **16 tests, 0 échec**. Ces tests couvrent consommation unique, refus sans mutation, identité, provenance, rechargement, ordre d’examen/révélation et rejet des états corrompus. La syntaxe JavaScript a été vérifiée. Aucune revue navigateur complète, écoute validée, validation tactile réelle ou essai humain n’est déclaré à ce stade.

Lors d’une intégration, reprendre au minimum : doubles commandes, stocks insuffisants, pot occupé, sauvegarde/rechargement à chaque état, même résultat malgré gestes et modes de ressenti différents, examen avant fiche, filiation correcte, export comme texte et erreurs de stockage visibles. Les contrôles automatisés ne valident ni le plaisir ni la reconnaissance d’une variété. Le portage exige ses propres contrôles, revue visuelle et essai humain.

## Cadre de conception résumé

Le brief du 8 novembre retient les gestes assistés et la découverte de l’objet avant sa fiche. Les décisions antérieures préservent la recherche personnelle, les deux boutures cultivées consommées, le pot durable, l’identité conservée et la reproduction future sans nouveau croisement. La fiche partageable montre la création sans la transférer dans une autre partie. La méthode de travail place cette démonstration autonome avant l’intégration Unity. Les valeurs et solutions d’interface de V01 restent des propositions à éprouver.
