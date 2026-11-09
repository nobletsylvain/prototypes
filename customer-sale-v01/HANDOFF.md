# Passation de la démo de vente face au client

Date : 9 novembre 2026. État : première réalisation autonome préparée. Les noms d’événements ci-dessous sont un contrat proposé pour l’intégration ; ils ne prétendent pas décrire une API Unity déjà créée. 76 contrôles automatiques réussissent, sans échec : 44 sur le registre, 16 sur le contrôleur avec présentation simulée et 16 sur l’audio avec contexte simulé. Sept ressources réemployées sont identiques aux sources. La version publiée a été parcourue à 1280 × 720, 390 × 844, 360 × 740 et 844 × 390 ; les trois situations sont passées dans le navigateur, sans erreur ni avertissement de console. Une recette masquée en portrait a conduit au déplacement de sa zone vers le fond gauche. Voir verification/browser-review.json pour le périmètre exact et la version observée. Aucun essai humain, écoute ou téléphone physique validé.

## Ce que le prototype doit transmettre

Une vente lisible en vue FPS : interaction avec le client, découverte de la demande, proposition préparée depuis la sacoche, billets sortis de leur compartiment, objets posés et repris sur un carton bas, monnaie exacte, confirmation unique, réaction, recettes reçues puis rangées et client suivant.

Cinq cases de produits, une sacoche à compartiments, un fonds de caisse aux billets visibles, L’ÉTAL bas et le cadre Reçu / À rendre / Rendu structurent ce geste. Les contrôles PC 1–5 et Espace restent en plus du glisser. Le lien mobile sert à l’essai ; le projet demeure PC solo.

Les amplitudes, sons et durées du prototype servent à comparer un ressenti. Leur copie dans Unity ne constitue pas une validation du plaisir.

## Séparer le registre et la présentation

Le registre est l’autorité sur chaque objet. La présentation observe des transitions acceptées et anime les mêmes identités ; elle ne compte pas les billets à partir des sprites et n’ajoute pas d’argent à la fin d’un effet.

Pour un billet, conserver au minimum une identité stable, une coupure, une valeur entière, un propriétaire et un emplacement exclusif. Pour un sachet, conserver une identité stable, le produit, la quantité, la composition, le lot pertinent et un emplacement exclusif. Les données réelles de Unity restent l’autorité ; ces champs ne doivent pas produire un registre concurrent.

Emplacements conceptuels à rapprocher des emplacements existants du jeu : fonds de caisse, sélection en déplacement, monnaie sur l’étal, main du joueur, recettes sur l’étal, portefeuille du client et produits vendus. Un objet n’occupe jamais deux emplacements à la fois, y compris pendant son trajet visuel.

Un transfert comporte validation, mutation atomique puis événement visuel. Le registre valide notamment l’état courant, le propriétaire, l’identité, la quantité et la destination. Si le transfert est refusé, le registre reste strictement inchangé. Un curseur ou une animation peut revenir à la source sans qu’un deuxième transfert compensatoire crée une copie.

## États de vente proposés

| État conceptuel | Données et commandes admises | Sortie |
|---|---|---|
| `AwaitingConversation` | Client présent, demande non révélée ; parler ou refuser | Révélation de la demande |
| `PreparingOffer` | Préparer/reprendre des sachets, lire le prix normal | Proposition conforme ou explicitement soumise |
| `Hesitating` | Raison visible et 5 s restantes ; refus libre | Premier sachet gèle le timer, expiration ou refus fait partir |
| `ComposingOffer` | Produit, quantité et prix proposés par le joueur ; timer figé | Acceptation si le souci est résolu, sinon départ |
| `PreparingChange` | Billets sortis du fonds et posés/repris ; cadre calculé depuis le registre | Confirmation lorsque produits, prix et monnaie sont conformes |
| `Completed` | Vente déjà engagée une seule fois ; recettes dans la main ou sur l’étal | Réaction brève puis progression de file |
| `AdvancingQueue` | Réaction brève terminée ; le rangement peut se poursuivre en parallèle | Arrivée effective du suivant |
| `Closed` | Plus de nouvelle vente ; recettes persistantes et récupérables | Fin ou nouveau scénario de démonstration |

Ces noms servent à expliquer les gardes. L’intégration peut suivre les états existants de Unity sans reproduire littéralement cette liste. Toute interruption doit conserver l’étape réelle de la transaction. Les recettes à récupérer ou ranger constituent un état indépendant de la vente active : leur présence ne bloque pas le client suivant.

## Confirmation unique et conservation

La confirmation vérifie la proposition acceptée, les produits exacts et la monnaie exacte. Elle transfère une seule fois les produits et billets concernés, puis marque la transaction comme terminée. L’état de transaction ou un identifiant de confirmation doit rendre la deuxième activation sans effet, y compris un double clic, Espace répété et un événement tactile reçu après son équivalent souris.

Ne pas remettre des produits puis attendre une animation avant de valider l’argent. Toute la mutation économique est atomique. Les trajets visuels peuvent se chevaucher après cette mutation ; ils ne changent plus son résultat.

Une reprise avant confirmation remet le même objet à sa source. Une annulation remet tous les objets préparés à leur emplacement cohérent, sans effacer un objet et en recréer un semblable. Une erreur de monnaie ne consomme rien. L’excès de monnaie est aussi incorrect qu’un manque.

Une vérification globale doit retrouver le même ensemble d’identités et la même valeur totale à travers tous les propriétaires et emplacements. Les produits vendus restent identifiables dans l’historique ou l’inventaire client au lieu de simplement disparaître des preuves.

## Événements de mouvement et de contact

| Événement proposé | Déclencheur réel | Présentation et son |
|---|---|---|
| `BillExtractionStarted` | Prise autorisée d’un billet identifié dans son compartiment | Le haut se soulève puis le billet sort ; froissement très bref |
| `BillClearedPocket` | Le billet visible a franchi l’ouverture | Petite flexion du papier, indépendante de sa valeur |
| `ItemDragMoved` | Déplacement du curseur ou du doigt | Inclinaison et flexion bornées ; aucun transfert économique supplémentaire |
| `ItemContactedStall` | Premier contact visuel ou physique avec le carton après une pose acceptée | Impact carton/papier et petite retombée synchronisés avec ce contact |
| `ItemReturnedToPocket` | Reprise validée du même objet | Trajet vers le compartiment, froissement au passage de l’ouverture |
| `OfferAccepted` | Proposition validée selon le motif du client | Visage ou tête réagissant brièvement ; court signal provisoire |
| `SaleCommitted` | Mutation atomique réussie | Confirmation unique et mot court du client |
| `RevenueReceivedInHand` | Billets transférés au joueur et main disponible | Arrivée visible des mêmes billets dans la main |
| `RevenuePlacedOnStall` | Billets transférés au joueur mais main incapable de les recevoir | Dépôt identifiable sur l’étal ; objets persistants et récupérables |
| `RevenuePickedUp` | Prise autorisée d’un billet ou groupe exact sur l’étal | Papier repris depuis sa pose réelle |
| `RevenueStored` | Rangement accepté par le registre et la capacité existante | Trajet de rangement ; aide supprimée quand plus rien ne reste à ranger |
| `CustomerDeparted` | Client réellement sorti de la phase de vente | Départ bref puis progression de file selon les gardes |

Éviter une temporisation fixe déclenchant un rebond après l’atterrissage. Le son et la réponse visuelle doivent concerner l’objet qui vient effectivement de toucher le carton. Un événement de contact n’apparaît qu’une fois par pose, sauf rebonds explicitement représentés. Les mouvements de papier ne déplacent pas arbitrairement les autres objets du décor.

L’animation peut être interrompue par changement d’onglet, redimensionnement ou perte de focus. À la reprise, reconstruire une pose cohérente depuis le registre. Ne jamais recommencer une transaction parce que son animation a été interrompue.

## Hésitation et file

Le timer de cinq secondes ne commence qu’après révélation de l’hésitation. Le premier sachet glissé pour préparer la proposition le fige. Reprendre ce sachet demeure libre et ne doit pas recréer un timer en cours sans décision explicite. Le client attend la proposition commencée, puis l’accepte si elle répond à son souci ou part.

La démonstration d’hésitation est volontairement bornée : hashish 4 g au tarif de 25 €, budget de démonstration de 20 €, baisse proposée par le joueur à 20 €. Elle n’établit pas les règles complètes de qualité, variété, quantité ou désirabilité.

La file de démo utilise 4 s entre arrivées, une limite de 5 clients et une séance de 300 s. Ces nombres ne sont pas à transposer comme réglages validés. Une arrivée annoncée doit produire effectivement un client ; ne pas reproduire le compteur qui recommence sans arrivée.

Les timers sont suspendus lorsque la page ou le jeu est en pause ou n’est plus actif. La reprise ne doit pas rattraper une longue durée cachée en faisant partir les clients d’un coup.

## Main pleine et rangement

Le client dépose les recettes sur l’étal si la main ne peut les recevoir. Le cas de démonstration utilise un objet occupant la main, sans modifier les capacités réelles du jeu. Le client a payé une seule fois ; les billets deviennent ceux du joueur et restent présents sur l’étal tant qu’ils n’ont pas été récupérés.

Prévoir une distinction visuelle et logique entre monnaie préparée pour le client et recettes déjà reçues. Une recette ne doit pas être interprétée comme un billet à reprendre dans le fonds d’une vente annulée. Le joueur doit pouvoir libérer sa main, prendre ces recettes puis les ranger. Une capacité de rangement insuffisante laisse les objets exactement à leur emplacement précédent et indique l’action utile.

**Le client suivant avance pendant le rangement**, même lorsque les recettes précédentes restent sur l’étal. Ces billets doivent rester récupérables pendant la nouvelle conversation, la préparation de sa proposition et sa monnaie. Le ramassage et le rangement restent deux gestes distincts. Associer chaque recette à sa transaction terminée pour ne pas la confondre avec la monnaie de la transaction active.

À la fin du temps, le coin se ferme automatiquement après le client en cours ; la file repart. Les recettes restent récupérables et rangeables après fermeture. Leur présence n’empêche pas la fermeture et celle-ci ne peut jamais les détruire ou les rendre inaccessibles.

## Paramètres à faire essayer

- Hauteur du carton et angle de vue ; place laissée au visage et à la file.
- Hauteur de billet dépassant de chaque compartiment ; taille des valeurs et zone de prise au doigt.
- Durée d’extraction, flexion en déplacement, amplitude du contact et de la retombée.
- Temps de réaction du client et arrivée du suivant pendant le rangement.
- Volume du papier, du contact carton et du signal d’acceptation.
- Réduction ou désactivation des retours renforcés pour comparer le confort.

Ne pas cumuler un effet de caméra, un effet sur la main et un effet sur le billet sans vérifier la lisibilité. Le papier doit rester localisable pendant le geste ; le cadre monétaire doit continuer à refléter le registre immédiatement.

Les sons proposés sont une synthèse originale provisoire. Conserver leur provenance et leurs paramètres si l’intégration les réutilise. L’écoute et le choix artistique restent à faire ; aucun modèle de client, sachet, sacoche ou billet de la démo ne vaut asset final du jeu.

## Textes et commandes

Les textes du jeu restent français et anglais dans des tables hors du code. Le cadre ne répète pas un prix total ni des pictogrammes de paiement. La bulle de demande ne révèle aucun prix et n’apparaît pas avant la conversation. Les raisons d’erreur doivent expliquer l’action utile, sans afficher les détails du registre au joueur.

Contrôles à conserver : parler, glisser vers l’étal, clic pour reprendre, 1–5 pour les cases sur PC, Espace pour confirmer une seule fois et R pour ranger lorsque cela est possible. Le toucher doit distinguer prise, déplacement, relâchement hors cible et annulation du geste. Une deuxième touche ou un second doigt ne peut prendre simultanément le même objet.

## Interdits de cette passation

- Aucune écriture ni compilation Unity pour cette session autonome.
- Aucun changement des capacités du jeu à partir des données de démonstration.
- Aucun changement de l’autre démo d’argent, de ses ressources ou de ses versions.
- Une intégration future utilise les interfaces publiques documentées des dépendances et respecte les licences des ressources.
- Aucun marchandage automatique du client, aucun maintien du prix qui contourne son motif de refus.
- Aucune création ou perte d’argent/produit par particule, animation, son, délai ou changement d’écran.
- Aucun pourboire, série ou pénalité implicite dans cette première démo. Les quatre secours sans monnaie et le sens de NÉGOCIER restent hors essai.
- Aucun résultat de simulation présenté comme essai humain.

## Contrôles proposés pour la version finale

Ces contrôles sont à exécuter et à rapporter ; ils ne sont pas déclarés réussis par ce document.

| Domaine | Cas utile | Attendu exact |
|---|---|---|
| Conservation | Déplacer chaque billet entre fonds, préparation, main, étal et rangement | Identités et coupures inchangées, total global constant |
| Produits | Préparer plusieurs cases, reprendre dans un autre ordre, annuler | Chaque sachet retrouve un emplacement unique ; produit, grammes, composition et identité conservés |
| Reprise | Cliquer plusieurs fois le même objet, y compris pendant le retour visuel | Un seul transfert accepté ; aucune copie |
| Glisser | Relâcher hors cible, annulation du pointeur, second doigt, perte de focus | Retour cohérent ; registre inchangé si le transfert est refusé |
| Erreur | Pas assez de monnaie puis trop de monnaie | Rouge dans les deux cas ; confirmation sans transfert |
| Vente simple | 8 g à 45 €, reçu 50 €, rendu 5 € | Une vente ; même sachet et mêmes billets transférés |
| Confirmation | Double clic, Espace maintenu, clic et Espace rapprochés | Une seule transaction |
| Hésitation | Attendre 5 s sans sachet ; recommencer et glisser avant terme | Départ dans le premier cas ; timer figé dans le second |
| Proposition | Baisser à 20 €, tenter de dépasser le tarif normal | 20 € accepté pour le cas prévu ; hausse au-dessus du tarif refusée |
| Main pleine | Confirmer avec un objet occupant ; libérer, prendre et ranger | Vente non bloquée ; mêmes recettes persistantes et récupérables |
| Recettes en parallèle | Laisser les recettes sur l’étal puis servir le suivant | Client avancé ; recettes récupérables ; aucune confusion avec la nouvelle monnaie |
| Rangement | Ranger deux fois, rangement refusé, interruption visuelle | Un seul transfert ou aucun ; rien perdu |
| File | Arrivées jusqu’à cinq, libération d’une place, fermeture à 0 s | Limite respectée ; aucun client invisible ni vente créée après fermeture |
| Fermeture et recettes | Terminer le dernier client, laisser ses billets sur l’étal, attendre la fermeture | File partie ; mêmes billets toujours récupérables et rangeables |
| Pause | Onglet masqué pendant une hésitation et une arrivée | Temps figé ; aucun départ caché ni arrivée en rafale |
| Interface | PC, écran étroit et toucher | Valeurs lisibles, client visible, aucune cible essentielle hors écran |
| Son et image | Extraction, premier contact, réception et rangement | Sons et mouvements correspondant aux objets réellement concernés |

Les identités, euros, grammes, contenus, refus sans mutation et erreurs de programme sont bloquants. Les durées visuelles, flexions et rebonds sont des mesures de ressenti, sauf limite explicitement demandée par le propriétaire.

## Preuves à joindre à la livraison

Consigner la version exacte, le lien réellement ouvert, les résultats des contrôles et leurs comptes, les captures réellement regardées et les défauts restants. Distinguer navigateur configuré en format mobile, téléphone physique, écoute et essai humain. Aucun contrôle automatique ne conclut que le geste est plaisant.

Avant une future livraison Unity, définir le périmètre d’intégration, réaliser une revue indépendante, construire le jeu et exécuter sa régression complète sur l’exécutable final. Les preuves de la démo ne remplacent pas ces étapes ni l’essai humain du résultat intégré.
