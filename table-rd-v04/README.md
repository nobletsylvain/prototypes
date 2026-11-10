# Table de R&D — V04, qualité génétique et COA


## Comparer la généalogie — 10 novembre 2026

Après le retour du propriétaire sur l’illisibilité à 25 variétés, trois vues proposent des lectures du même journal : **Générations**, **Cercle** et **Famille**. Famille s’ouvre sur la variété conservée la plus récemment créée, avec ses parents et enfants directs, à 75 % minimum. **Tout voir** permet volontairement un cadrage plus éloigné. Le point de départ, les flèches de résultats et **Lire les noms** permettent d’explorer les branches. Les vues globales proposent **Liens ciblés** ou **Tous les liens** ; une recherche surligne l’ascendance complète de ses résultats. Les portraits ouvrent toujours les emplacements.

Format, point de départ, filtres et cadrage sont conservés en mémoire pendant les allers-retours aux slots, séparément pour les modes normal et test. Les données métier et sauvegardes restent inchangées. Ces trois formats sont des alternatives à essayer, sans choix d’interface finale adopté. Le Cercle exige du zoom à plusieurs générations ; les longues liaisons compactes peuvent traverser d’autres portraits. Liens ciblés et Famille permettent d’isoler une lecture.

Le propriétaire a autorisé la publication avant son essai : « Oui, publie la démo pour que je l’essaie ». Cette autorisation concerne cette comparaison autonome, sans exception au processus du jeu Unity. Les [PR 300](https://github.com/nobletsylvain/prototypes/pull/300), [302](https://github.com/nobletsylvain/prototypes/pull/302) et [304](https://github.com/nobletsylvain/prototypes/pull/304) sont fusionnées. Après l’ajustement du cadrage, la dernière corrige le texte des noms tronqué signalé dans la vue Famille.

**176 tests réussis, zéro échec sur les sources puis les sources exportées ; syntaxe et imports de 20 modules vérifiés.** Les contrôles couvrent notamment 25 et 60 entrées, géométrie sans chevauchement des portraits, filiations exactes, filtres et confidentialité des essais non révélés. Revue de code indépendante effectuée. Paquet final PR 304, commit `d9b97e54d58dab206f6119f5def8dec3edad595f`, SHA-256 `65bf4f3bbfc080007f5958c9fd6ba60aa547049053e52fc9c3a99be832ffd0ff`.

La [comparaison publiée](https://nobletsylvain.github.io/prototypes/table-rd-v04/?mode=test&views=3) retrouve les 25 entrées de la session test. Sur le paquet final, Tilleul clair, Velours mauve et Couronne ambrée présentent chacun 22 px de hauteur visible et de texte, sans rognage, sur ordinateur puis en vue 390 × 844 ; la page mobile mesure 375/375 px en largeurs cliente/défilante. Les captures `family-text-fixed.jpg`, `family-phone-fixed.jpg`, `circle-25.jpg` et `generations-25.jpg` ont été regardées. Cercle et Générations affichent les 25 nœuds ; le retour à Famille fonctionne. Le parcours a également vérifié cinq résultats pour « mauve », le retour des slots avec cercle et filtre conservés, les changements de format conservant les filtres et la navigation vers Z · B1. Console : zéro erreur, zéro avertissement. Après remise à la taille normale du navigateur, une transition a été effectuée au clavier, le clic automatisé n’ayant pas changé de vue ; les clics avaient fonctionné lors du parcours précédent.

Ces contrôles automatisés ne constituent ni un téléphone physique ni une validation du confort de lecture par le propriétaire. Les preuves de l’évolution des probabilités ci-dessous restent historiques. Aucun changement ni intégration Unity.

Évolution V04 du 10 novembre 2026, **publiée et vérifiée dans le navigateur** : chaque nouveau croisement peut atteindre tous les paliers, même avec des parents de faible qualité. Les parents continuent d’orienter l’essentiel du tirage. La qualité génétique reste distincte des goûts, emplacements, potentiels et apparence.

[Ouvrir V04](https://nobletsylvain.github.io/prototypes/table-rd-v04/) · [Mode test](https://nobletsylvain.github.io/prototypes/table-rd-v04/?mode=test) · [V03 conservée](https://nobletsylvain.github.io/prototypes/table-rd-v03/)

## Six paliers

La référence fournie le 10 novembre associe une qualité entière aux paliers suivants :

| Qualité génétique | Palier de référence | Couleur |
|---|---|---|
| 0–19 | Poor | Gris |
| 20–39 | Common | Vert |
| 40–59 | Uncommon | Bleu |
| 60–79 | Rare | Rouge |
| 80–99 | Epic | Violet |
| 100 | Legendary | Jaune |

**Qualité génétique, potentiel activable de qualité future et qualité réelle du lot restent distincts.** Le lot d’essai reste un spécimen de qualité standard. Un palier ne réécrit pas ce lot, ne mesure aucune puissance réelle et ne constitue pas une analyse chimique.

**Tous les paliers sont accessibles ; aucun plafond n’est imposé par les parents.** Le réglage d’essai mélange 90 % de la distribution héritée autour de la moyenne parentale et 10 % de surprise sur toute l’échelle. La partie héritée garde sa variation pondérée de −20 à +20 ; la surprise permet notamment Epic et Legendary à toute paire admissible.

| Palier | Contribution minimale nominale de la surprise |
|---|---:|
| Poor | 1 % |
| Common | 2 % |
| Uncommon | 2,5 % |
| Rare | 2,5 % |
| Epic | 1,5 % |
| Legendary | 0,5 % |

La partie héritée peut ajouter des chances à ces contributions ; les probabilités exactes de la paire sont affichées. La direction « tous accessibles » est confirmée. Le mélange 90/10, ces taux, les qualités fondatrices 24/54/84 et les gains de points restent des **paramètres proposés pour la démonstration**, pas un équilibrage final adopté.

## La boucle et le certificat

Choisir deux parents → engager deux boutures → examiner la vraie tête sous la loupe → révéler qualité, palier et possibilités → consulter le **COA de création** → conserver, nommer et signer → poursuivre la lignée.

Le COA rassemble identité, qualité génétique et palier, parents et provenance, potentiels hérités, profil activé, portrait et données du lot. Il reste une fiche de jeu partageable, sans certification de laboratoire, valeur chimique inventée ni import jouable.

À la révélation d’une qualité **Rare ou supérieure, soit 60 à 100**, chaque parent gagne un point une seule fois. Epic et Legendary ne donnent pas davantage dans cette version. Une activation coûte un point propre à la variété, occupe un emplacement libre et choisit un potentiel déjà hérité ; elle ne modifie ni score génétique, ni identité, ni apparence, ni lot existant.

| Parent de démonstration | Qualité | Emplacements | Potentiels |
|---|---:|---:|---|
| X · Aromatique | 24 · Common | 3 | Citronné, Floral, Ramification |
| Y · Réserve | 54 · Uncommon | 5 | Ramification, Qualité potentielle |
| Z · B1 | 84 · Epic | 3 | Effet fictif B1, Qualité potentielle |

Hériter n’active pas un potentiel ; un potentiel non activé reste transmissible. Points et activations ne sont pas hérités. Ramification affiche un aperçu futur de trois à cinq branches. Qualité potentielle prépare une configuration de production future, sans augmenter le score génétique ni simuler une culture.

## Objet, gestes et journal

La vue reste à la première personne. Poser les fiches avec les commandes assistées, engager l’essai, puis tourner et rapprocher la tête sous la loupe. Maintenir environ 2,1 secondes pour révéler ; relâcher met en pause sans perdre l’avancement de la séquence. Clavier et ouverture assistée donnent le même résultat. Aucune précision, vitesse ou pression ne change les chances ou les ressources.

**L’objet précède sa fiche :** la loupe montre sa géométrie héritée pendant l’examen. Jusqu’à la révélation finale, le journal garde une silhouette neutre ; score, palier, descriptions et COA du résultat restent cachés. Le maintien commence par des retours neutres puis présente des pulsations et indices progressifs, toujours bornés au palier final déjà fixé. Il ne fait pas monter les chances. La conclusion des sons/VFX suit la révélation acceptée, sans recolorer le patrimoine de la tête.

L’herbier conserve tous les essais et leur généalogie. Recherche et filtres surlignent correspondances et ancêtres sans retirer les autres branches. Utiliser +/−, Tout voir et Résultat précédent/suivant ; faire défiler au doigt, au clavier ou en glissant le fond à la souris. Cliquer une fondatrice ou une variété conservée ouvre ses emplacements. Une archive reste consultable sans redevenir un parent disponible.

Après révélation, comparer les deux parents et le descendant. **Transmis** présente les huit paires visuelles et leur provenance, **Exprimé** leur lecture visible. Loupe, portraits et export partagent les têtes V05 du jeu, leurs facettes parentales et leur teinte moyenne. Ces axes fictifs ne déterminent pas la qualité génétique. Le cycle et la morphologie d’une plante entière ne sont pas simulés.

Activer le son à la demande. Expressif/Discret, volume et replays comparent les retours sur le même état, sans gain ni nouveau tirage.

Les vidéos fournies [Opening Starr Drops](https://www.youtube.com/watch?v=G-sX12EClF4) et [All Starr Drop Sound Effects](https://www.youtube.com/watch?v=pjKabPIBgY4) servent de références de présentation. L’adaptation conserve le maintien demandé, la palette de la photo et des sons synthétisés originaux ; aucun asset ou son de ces vidéos n’est repris. Leur inspection visuelle, effectuée sans son, ne constitue pas une écoute validée.

## Mode test et ressources

Le mode test prépare directement l’un des six paliers avec des graines choisies ; il ne représente pas leurs chances naturelles. Legendary ne nécessite plus de parent relais : toute paire admissible possède une chance. Les anciens relais restent conservés dans le journal. Le résultat final attend sa vraie révélation avant de récompenser ses parents ; aucun point n’est injecté directement.

Deux boutures identifiées sont consommées une fois par essai ; le pot est réutilisé. Chaque fondatrice dispose de trois boutures initiales et trois prélèvements supplémentaires ; chaque descendant conservé dispose de huit prélèvements, sans bouture gratuite avant prélèvement. Ces budgets ne garantissent aucun palier et Ramification ne les augmente pas.

Cette évolution continue les **mêmes carrières V04**, avec les mêmes sauvegardes normale/test séparées. Seuls les nouveaux essais utilisent les probabilités de version 2. Un essai déjà engagé conserve sa version 1, ses chances, son résultat, ses points et ses débits, même après rechargement. Aucune migration des carrières V03 : leur adresse, fichiers et preuves restent conservés.

## Vérification et limites

**154 tests réussis, zéro échec sur les sources et sur les sources exportées ; 19 modules vérifiés.** La [PR 297](https://github.com/nobletsylvain/prototypes/pull/297) est déployée. Le navigateur a retrouvé le résultat normal 58 et révélé l’ancien essai test à 69 sans nouveau tirage. Avec X de qualité 24 et Y de qualité 54, les chances affichées incluent 1,5 % Epic et 0,5 % Legendary. Une préparation test directe a produit un Legendary 100 en première génération, sans relais ; ce résultat forcé ne mesure pas sa fréquence naturelle.

Les sept boutures du mode normal sont restées intactes pendant le parcours test. Au format 390 × 844, largeur cliente/défilante 375/375 px ; console sans erreur ni avertissement. Les anciennes tables de chances restent exactes : un affichage passé de 15 % à 14,97 % vient seulement de la précision d’affichage. Les 146 tests et le parcours de la V04 précédente restent historiques.

Aucun essai humain, téléphone physique, écoute validée ou intégration Unity n’est revendiqué. Les gestes, COA, patrimoine, emplacements, lot et retours restent indépendants du changement de probabilités. Recettes des autres produits, spécialisations et équilibrage définitifs restent ouverts.

[Passation Unity](handoff/PASSATION_UNITY.md) · [Têtes et provenance](handoff/HEAD_ASSETS.md) · [Sons provisoires](handoff/AUDIO.md)
