# Snapshit — Brief de génération de contenu (profils & voix du block)

> **But du doc** : cadrer le travail d'une session/agent de **génération de contenu**
> pour peupler le hub social Snapshit de profils et de répliques **vivants**.
> Ce n'est PAS de la logique de jeu — c'est de la **présentation**. Le moteur
> (`snapshit/index.html`) décide *quand* et *à qui* une réplique sort ; le contenu
> généré remplit les *slots*. Lire d'abord `crimworld/FEATURES_HUB_SOCIAL.md`.
>
> 📌 **Contrat de données autoritatif** (archétypes + schéma par user + dico,
> calés sur le code) : [`ARCHETYPES_AND_USER_DATA.md`](./ARCHETYPES_AND_USER_DATA.md).
> Commence par lui si ta tâche porte sur les archétypes / les données d'un user.

---

## 0. Principe directeur

Chaque profil est un **personnage de quartier**, pas un username random. Le feed
doit donner l'impression d'une **communauté qui te connaît** : des gens qui
reviennent, qui se souviennent, qui ont une gueule et un registre de langue.

Deux populations :

| Population | Rôle | Persistance | Exemples |
|---|---|---|---|
| **La troupe** (voix nommées) | porteurs de mémoire, archétypes | récurrents, identité stable | Kévin 🧃, La Comtesse 👑, L'accro 😵, Sami 🧢… |
| **La foule** (anonymes) | volume, ambiance, masse | éphémères, générés à la volée | `KriloLi 🦊`, `Vex_ 🐍`… |

La génération doit produire **les deux** : un roster fini et soigné (la troupe) +
des **générateurs combinatoires** (la foule).

---

## 1. Schéma d'un PROFIL (la « carte » d'un NPC)

Champs demandés (ceux marqués ⚙️ sont déjà consommés par le moteur) :

```jsonc
{
  "id": "kevin",                    // ⚙️ slug stable (troupe only ; null pour la foule)
  "pseudo": "Kévin",                // ⚙️ nom affiché (nm)
  "handle": "@kev.du.91",           //   identifiant style réseau (optionnel, pour stories/DM header)
  "avatar": { "emoji": "🧃",        // ⚙️ fallback immédiat (av) — DOIT toujours exister
              "image_prompt": "…" },//   brief pour une vraie PdP générée (voir §3)
  "tag": "LOWBALLER",               //   étiquette de rôle courte (voir §1.1)
  "archetype": "lowballer",         //   famille de comportement (voir §1.2)
  "description": "Négocie même…",   //   bio d'une ligne (ton du perso)
  "registre": ["argot_jeune","radin"], // registres de langue à respecter (voir §4)
  "emoji_signature": ["👀","🤝","😏"], // 1-3 emojis récurrents qui « signent » le perso
  "relation_init": "neutre"         //   état de départ vis-à-vis du joueur
}
```

### 1.1 Tags (étiquette courte, affichable)
Liste ouverte, ~1 mot. Sert à colorer l'UI et orienter le ton.
`CLIENT FIDÈLE · LOWBALLER · CONNAISSEUR · ACCRO · CURIEUX · ANCIEN · FLAKE · GROSSISTE · TOURISTE`

### 1.2 Archétypes (familles de comportement — ancrent la mémoire)
Le moteur attache des **conséquences** à certains archétypes. Le contenu doit
fournir, **par archétype**, les variantes de répliques (voir §5). Archétypes
actuels et leur « mémoire » :

| archetype | visage | se souvient de… | besoin de contenu spécifique |
|---|---|---|---|
| `lowballer` | Kévin 🧃 | combien de fois tu as **bradé** | lignes de négo + escalade « encore toi le pigeon » |
| `connaisseur` | La Comtesse 👑 | tes **promesses premium** tenues/trahies | lignes de départ (déçue), de retour (validée), d'achat premium |
| `accro` | L'accro 😵 | son propre **manque** (streak) | escalade de dépendance (calme → désespéré) |
| `regular` | Sami 🧢 | rien encore (extensible) | DM d'achat « comme d'hab » |
| `jeune` | Le petit du 4 🧒 | — | curiosité, naïveté |
| `ancien` | L'ancien 🚬 | le long terme | commentaires secs, désabusés |
| `flake` | (foule) 🦗 | — | messages vagues, RDV jamais honorés |

> Étendre le roster est bienvenu, mais **chaque nouvel archétype doit dire à quoi
> il réagit** (sinon c'est juste un skin de la foule).

---

## 2. Génération de PSEUDONYMES

Deux moteurs distincts :

**A. La foule (combinatoire)** — déjà amorcé dans le code (`CM_PRE`/`CM_SUF`/`CM_AV`).
Besoin : **élargir les banques** et ajouter des **patterns** crédibles de pseudos
réseau (pas juste préfixe+suffixe) :
- `mot + chiffres` : `naps93`, `zko_`, `krilo45`
- `prénom.ville` : `yanis.91`, `dris.mrs`
- `mot collé argot` : `ftgang`, `nuitblanche`, `ssjbinks`
- `leet/typo` : `vyx`, `brth`, `0xnaps`
Fournir : **150-300 fragments** triés (préfixes, suffixes, mots entiers, séparateurs)
+ règles d'assemblage pondérées. Éviter doublons avec la troupe.

**B. La troupe (à la main)** — ~15-25 pseudos **écrits**, mémorables, cohérents
avec l'archétype et le registre. Le pseudo doit « sonner » le perso.

---

## 3. PHOTO DE PROFIL (avatar)

Niveau 1 (présent) : **emoji** — obligatoire, fallback universel, léger.
Niveau 2 (souhaité) : **vraie PdP générée**. Pour chaque profil, fournir un
`image_prompt` court, **style cohérent** (le proto a un grain « nuit / néon /
quartier »). Contraintes :
- Format carré, lisible en 44px (cropé en cercle).
- **Anonymat** : pas de visage net identifiable (capuche, dos, objet, animal,
  logo, plan serré texture) — colle au registre « clandé » du jeu.
- Palette sombre + 1 accent (jaune Snapshit `#FFFC00`, ou néon).
- Décliner par archétype : Comtesse = luxe froid, Accro = flou/cramé, Kévin =
  blingbling cheap, Ancien = fumée/sépia…
Livrable : un **prompt par profil de la troupe** + **5-8 prompts génériques par
archétype** pour la foule (réutilisables).

---

## 4. REGISTRES DE LANGUE (le liant)

Tout le texte passe par un **dictionnaire d'argot à concepts** : les gabarits
contiennent des `{CONCEPT}` substitués à l'exécution (présentation aléatoire).
Concepts déjà utilisés : `{SELL_POINT} {CUSTOMER} {CANNABIS_WEED} {QUALITY_GOOD}
{QUALITY_BAD} {MONEY}`. Source à centraliser : `slang/` (cf. spec).

**Besoin** : pour chaque concept, **étoffer les variantes** par **registre**
(jeune/quartier, vieux routier, bourgeois-connaisseur, etc.) pour que la Comtesse
et Kévin ne parlent **pas** pareil. Idéalement le dico devient :
`concept → registre → [termes]`.

> ⚠️ Ne jamais écrire un chiffre de réput/followers dans une réplique : la cote
> est **opaque**, elle se lit dans le **ton**. (voir §5)

---

## 5. PROMPTS DE GÉNÉRATION (par type de contenu)

Le moteur appelle le contenu par **(contexte × ton)** — parfois × archétype.
Le **ton** encode la réput opaque : `chaleureux · neutre · méfiant · hostile`.
Chaque prompt ci-dessous doit produire des **listes de variantes courtes**
(SMS/story, ≤ ~90 caractères), avec `{CONCEPT}`/`{QTY}` aux bons endroits.

### 5.1 RÉACTION / COMMENTAIRE (tombe sur ta story)
Contextes : `ambiant · drop · qualite_basse · qualite_haute · cry_wolf ·
mauvais_public · promesse_tenue`. Matrice **contexte × ton** (tous les tons ne
s'appliquent pas à tous les contextes — voir le code `LINES`).
> *Prompt type* : « Génère 6 commentaires de story Snapshit, contexte = `drop`,
> ton = `méfiant`, registre = quartier. Le block doute d'un dealer qui annonce un
> arrivage. ≤ 80 car., 1 emoji max, argot via `{QUALITY_GOOD}` quand pertinent.
> Pas de chiffre de popularité. »

### 5.2 OUVERTURE DE DM (un acheteur t'écrit)
Par **kind** : `genuine × ton`, `lowball`, `flake`, + spéciaux `comtesse`,
`accro`. Doit contenir `{QTY}` (quantité demandée).
> *Prompt type* : « 8 ouvertures de DM d'un lowballer qui veut négocier un gros
> volume `{QTY}`. Insistant, radin, un peu lourd. ≤ 70 car. »

### 5.3 RÉPLIQUE À UNE ACTION (réponse du PNJ à ton choix)
Actions du joueur : `vendre · refuser · brader · poser_rdv · bloquer`.
Besoin : 1 réplique entrante + éventuelle ligne « système » diégétique par action
et par archétype. Inclure les **escalades mémoire** (Kévin au 3e bradage ;
Comtesse départ/retour ; Accro selon streak).

### 5.4 POST / STORY (ta vitrine & celles des acteurs)
- **Légendes de vitrine** du joueur (`vcap`) selon la qualité coupée.
- **Stories d'acteurs** (Le Comptoir 🏪, Le Campus 🎓, La Ruelle 🚬, ● ARRIVAGE) :
  courtes légendes d'ambiance + 1-2 commentaires d'amorce.
> *Prompt type* : « 10 légendes de story pour une ‘vitrine’ de produit coupé
> ‘propre’, fier mais discret, argot via `{CANNABIS_WEED}`. ≤ 40 car. »

### 5.5 LIKES / VUES (réactions légères)
Le proto a une jauge de vues **opaque** (🔥 ●●◦). Besoin : petits **libellés de
réaction** (« 3 personnes ont capté ta story », emojis de like pondérés par ton)
— jamais de compteur chiffré exact.

### 5.6 HISTORIQUE / « SNAPS PASSÉS » d'un profil
Pour donner de la profondeur quand on ouvre un profil : une **timeline courte**
(3-6 entrées) de stories/achats passés, cohérente avec l'archétype.
> *Prompt type* : « Génère 5 entrées d'historique pour ‘La Comtesse’ : achats
> premium espacés, exigeante, 1 ligne chacune, avec un ‘il y a Xj’. »

---

## 6. Format de livraison attendu

- **JSON** (pas de prose) prêt à charger, clés stables. Suggestion d'arbo :
  `snapshit/content/profiles.json` (troupe), `…/crowd.json` (banques de la foule),
  `…/lines.json` (contexte→ton→variantes), `…/dico.json` (concept→registre→termes),
  `…/avatars/*` (prompts ou images).
- **Validation** : variantes ≤ longueur indiquée, placeholders bien formés
  (`{CONCEPT}` connus), aucun chiffre de cote/followers, 1 emoji max sauf story.
- **Déterminisme** : le contenu est un *pool* ; c'est le moteur qui pioche. Ne pas
  encoder de logique conditionnelle dans le texte.

---

## 7. Quantités cibles (premier lot)

| Élément | Cible v1 |
|---|---|
| Profils troupe (écrits) | 15-25 |
| Fragments de pseudo (foule) | 150-300 |
| Prompts avatar (troupe + génériques archétype) | ~25 + 8×archétype |
| Commentaires (contexte × ton) | 6-10 par case non vide |
| Ouvertures DM (kind × ton) | 6-8 par case |
| Répliques d'action (× archétype) | 2-4 par action |
| Légendes story (joueur + acteurs) | 10 par qualité / par acteur |
| Historiques profil | 3-6 par profil troupe |
| Dico : termes par concept × registre | 4-8 |

---

## 8. Garde-fous (invariants à NE PAS violer)

1. **Réput opaque** : zéro chiffre de popularité/followers dans le texte ; la cote
   vit dans le **ton**.
2. **Le texte ne décide rien** : pas de conséquence encodée dans une réplique
   (le moteur gère l'état). Le contenu est purement **présentation**.
3. **Cohérence registre×archétype** : un perso ne sort pas du ton de sa carte.
4. **Mémoire = continuité** : prévoir les variantes « callback » (le perso fait
   référence à un passé) pour les archétypes à mémoire.
5. **Anonymat visuel** sur les avatars (univers clandé).
