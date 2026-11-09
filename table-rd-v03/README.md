# Table de R&D — V03, héritage visuel

Une démo autonome d’**Au four, mon amour**, préparée le 9 novembre 2026 avant intégration Unity. Les croisements transmettent des possibilités et une apparence familiale ; les points permettent ensuite d’activer les potentiels de jeu hérités.

[Ouvrir V03](https://nobletsylvain.github.io/prototypes/table-rd-v03/) · [Essai rapide V03](https://nobletsylvain.github.io/prototypes/table-rd-v03/?mode=test) · [V02 conservée](https://nobletsylvain.github.io/prototypes/table-rd-v02/)

## La boucle à essayer

Choisir deux parents → engager deux boutures → examiner l’objet sous la loupe → révéler son potentiel et sa capacité → conserver, nommer et signer → le réutiliser comme parent → dépenser ses points pour activer des possibilités héritées.

Cette direction reprend la photo de référence et les choix précisés par le propriétaire le 9 novembre : une variété possède un patrimoine transmissible, des emplacements limités et un profil choisi par activation. **Hériter d’un trait ne l’active pas.** Un potentiel non activé reste transmissible ; un potentiel absent des deux parents ne peut pas apparaître. Les points et les activations ne sont pas hérités.

Une découverte rare ou exceptionnelle donne un point à chacun de ses deux parents, une seule fois. Chaque activation coûte un point propre à la variété, occupe un emplacement libre et choisit un potentiel qu’elle possède déjà. Elle ne modifie ni son identité, ni ses chances de transmission, ni le lot antérieur.

## Les parents de démonstration

| Parent | Capacité | Potentiels héritables |
|---|---:|---|
| X · Aromatique | 3 emplacements | Citronné, Floral, Ramification |
| Y · Réserve | 5 emplacements | Ramification, Qualité potentielle |
| Z · B1 | 3 emplacements | Effet fictif B1, Qualité potentielle |

Ces cinq traits, les capacités de 3/5 emplacements, les chances, le coût d’activation et les classes de rareté sont des **paramètres d’essai**. B1 désigne uniquement un effet fictif. La transmission détaillée est consultable avant engagement.

Ramification affiche un aperçu de production à 5 branches au lieu de 3. Qualité potentielle décrit une possibilité de production future. La démo ne simule pas cette culture : aucune bouture, quantité ni qualité de lot supplémentaire n’est créée par l’activation.

## Ressemblance entre parents et descendants

La nouvelle version remplace les variations décoratives indépendantes par huit axes visuels fictifs : forme de tête, élongation, ampleur, largeur et présence du feuillage, pigment, teinte des pistils, touches claires de surface. Chaque parent transmet une de ses deux valeurs par axe. L’expression combine ces valeurs : moyenne des dimensions, mélange des teintes et choix déterministe d’une forme parentale. Aucun caractère visuel extérieur aux parents n’est ajouté.

Les fondatrices possèdent deux valeurs différentes sur chacun des six axes numériques : le centre choisi moins/plus 15, dans les bornes 0–100. Une même paire de parents peut donc produire des variations dès la première génération, uniquement par transmission. Les paires de forme et de pigment restent identiques chez chaque fondatrice pour garder des familles reconnaissables.

Trois formes — compacte, élancée et en grappe — s’appuient sur les maîtres low poly V05. Facettes lisibles, palettes olive/citron vert/mauve et surfaces sobres visent la cohérence avec les assets employés dans Unity. Les hybrides conservent des plages de facettes aux pigments parentaux, accompagnées de leur teinte moyenne. L’objet sous la loupe et son portrait utilisent la même géométrie exprimée. Les dimensions apparentes ne créent ni masse, ni rendement, ni puissance.

Cet héritage fictif est fixé une fois au lancement de l’essai, indépendamment du tirage des potentiels et de la rareté. Un pigment mauve ou des facettes plus claires ne signifient pas « meilleure qualité » ou « plus puissant ». Le cycle n’est pas implémenté : toutes les têtes sont comparées au même stade, sans nouveau délai de production.

## Commandes et journal

La vue est à la première personne. Poser les parents avec les boutons, puis engager le petit essai. Sous la loupe, glisser pour tourner et utiliser les commandes de rapprochement. Les points blancs donnent accès aux emplacements ; Origine ouvre la généalogie.

Maintenir environ 1,5 seconde pour révéler. Relâcher met en pause sans perdre l’avancement de la séquence en cours. Espace/Entrée et l’ouverture assistée donnent accès au même résultat. Aucune précision, vitesse ou réussite motrice ne change le tirage ou les ressources.

**L’objet reste premier :** l’examen sous la loupe montre la vraie forme et les vraies couleurs obtenues avant la fiche. Le journal garde encore une silhouette neutre ; ses portraits, textes et filtres ne dévoilent pas le résultat avant sa révélation. Les effets de célébration de rareté restent distincts de la pigmentation héritée.

**Arbre & journal** conserve l’herbier sombre horizontal, ses portraits et ses liens entre générations. Après révélation, la même apparence se retrouve sur l’objet, dans l’arbre et dans la présentation de la variété.

Après révélation, la comparaison montre les deux parents et leur descendant côte à côte ; elle est aussi accessible depuis Origine. Les détails des huit axes distinguent **Transmis**, avec les deux valeurs et leurs parents, d’**Exprimé**, une lecture qualitative du résultat. La signature visuelle reste distincte de la signature choisie par l’auteur.

La recherche et les filtres se combinent sans masquer les autres branches. Les correspondances sont dorées, leur ascendance est accentuée et le reste est atténué. Ce surlignage indique un résultat de recherche, pas la rareté ou la qualité du lot. Les filtres sont gardés lors des allers-retours vers les emplacements, séparément pour chaque mode.

Rechercher un nom, une identité, une signature ou une description visuelle connue — forme, feuillage, couleur, par exemple **« reflets mauves »** — puis filtrer par potentiel hérité, trait activé, capacité minimale, rareté, ascendance ou statut. Utiliser **+ / −**, **Tout voir** et **Résultat précédent/suivant** pour parcourir les branches. Faire défiler au doigt ou avec les flèches du clavier lorsque l’arbre a le focus ; sur ordinateur, glisser son fond à la souris. Cliquer une fondatrice ou une variété conservée ouvre ses emplacements. Les autres essais restent en consultation seule.

Les fiches détaillées et leurs actions restent disponibles dans un volet replié sous l’arbre : consultation, réutilisation parentale lorsque le parcours l’autorise et export avec nom, signature, généalogie, portrait commun et signature visuelle. Une archive ne devient pas un parent disponible. Les fiches exportées sont des images partageables, sans import jouable.

Activer le son à la demande. **Expressif** et **Discret** comparent les retours sur le même état ; le volume est séparé. Les boutons de rejeu du mode test répètent uniquement les sons/VFX, sans gain supplémentaire.

Les huit axes sont des règles d’essai personnalisables pour le jeu, sans prétention de génétique réelle ni tableau de culture. L’architecture d’une plante entière et les variations de cycle restent à concevoir. Les touches claires sont un traitement de facettes, pas une mesure de trichomes ou de composition.

## Essai rapide séparé

Le mode test force une issue admissible pour essayer révélation, points et activation. Il possède sa propre sauvegarde ; rien ne passe vers le mode normal ou V02. Le premier accès prépare une rare X × Z sous la loupe.

Préparer une exceptionnelle peut créer un parent intermédiaire Y × X à cinq emplacements portant Citronné et Floral, puis le croiser avec Z. Cet intermédiaire est réellement révélé et conservé dans la session test : son essai, ses ressources et les points accordés à Y/X restent dans le journal. Le résultat final attend votre révélation.

La commande de test propre à une variété cherche un partenaire admissible pour lui faire gagner un point par un descendant rare. Elle respecte les ressources et refuse si aucun tirage compatible n’existe. Recommencer le test remet seulement cette session à zéro. Les issues forcées ne mesurent pas leurs chances normales.

## Limites et vérification

Identité, potentiel hérité, activation, rareté et qualité réelle du lot sont distincts. Le lot d’essai reste un spécimen de qualité standard. Deux boutures identifiées sont consommées une fois ; le pot est réutilisé. Chaque fondatrice dispose de trois boutures initiales et trois prélèvements supplémentaires. Chaque descendant conservé dispose de huit prélèvements, pour laisser essayer le remplissage de cinq emplacements puis poursuivre la lignée. Ce budget de démonstration ne garantit pas les découvertes rares ; Ramification ne l’augmente pas et ne crée aucune bouture.

Les liens et les deux sauvegardes V03 restent les mêmes ; leur format interne passe au schéma 4. Une sauvegarde du schéma 3 doit d’abord être validée strictement, puis son historique est rejoué pour initialiser l’héritage visuel. L’interface signale cette initialisation : les anciennes apparences décoratives peuvent changer, mais identités, noms, généalogie, points, ressources et résultats de jeu restent conservés. Une sauvegarde invalide n’est pas réinterprétée silencieusement. Le mode test reste séparé du mode normal et de V02.

**Vérifications automatisées : 120 tests réussis, zéro échec dans neuf fichiers ; les 15 modules publics et embarqués hors ligne passent les contrôles de syntaxe et d’imports.** Les tests couvrent notamment la transmission strictement parentale, la variation dès la première génération et la migration validée depuis V3, avec conservation des identités, de l’historique, des points et des ressources. La planche SVG de trois fondateurs et deux générations a été calculée puis regardée ; elle ne prouve pas le rendu WebGL.

**Revue navigateur réalisée sur la version publiée du 9 novembre :** migration V3 annoncée, neuf entrées existantes et leurs noms/emplacements retrouvés ; loupe, comparaison des trois portraits, filtres et retour depuis les emplacements vérifiés. Un nouveau descendant montre son vrai objet avant la fiche et reste scellé dans le journal. Sa révélation rare attribue un point à chaque parent ; son portrait reste identique après rechargement. La forme en grappe d’un grand-parent peut réapparaître malgré deux parents exprimés compacts.

Au format 390 × 844, aucun débordement horizontal constaté dans la page, la comparaison ou la fenêtre de détails ; console sans erreur ni avertissement. Ce contrôle de format n’est pas un essai sur téléphone physique. Le paquet final corrige seulement les libellés olive/citron vert FR/EN après ce parcours ; les deux empreintes sont consignées dans la passation. Aucun essai humain, écoute validée ou intégration Unity n’est revendiqué. Les recettes des autres produits, les emplacements définitifs de spécialisation et l’économie restent ouverts.

Les têtes utilisent des formes de référence communes, déclinées par le descripteur hérité ; les sons sont synthétisés localement. Three.js est fourni sous licence MIT, incluse dans ce dossier.

[Passation Unity](handoff/PASSATION_UNITY.md) · [Sons provisoires](handoff/AUDIO.md)
