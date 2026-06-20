# prototypes

Petits prototypes jouables/testables directement dans le navigateur (mobile-first).

## 🟫 Hash Slicer 3D

Mini-jeu mobile en **3D** (HTML + [Three.js](https://threejs.org/) chargé via CDN, un seul fichier `index.html`). Reskin humoristique d'un jeu de découpe : on débite une **savonnette** posée sur une planche.

**But :** couper des **barrettes** dans une savonnette (pain pressé) posée sur une planche.
- Tu **glisses ton doigt en travers** : le tracé définit un plan de coupe.
- Au relâchement, la **barrette se détache** (côté bout libre) et **tombe sur la planche** (petite physique : chute + rebond).
- **Chaque coupe réussit toujours**, même imprécise : l'épaisseur et le biais varient et donnent un petit feedback (*Barrette nickel ✨*, *Grosse barrette 😏*, *Coupe bancale 😅*…).
- Chaque barrette est **pesée** (poids en g, calibré pour ~250 g la savonnette entière) et **notée** A/B/C selon la propreté de coupe ; une étiquette suit la barrette en 3D.
- **Emballage + vente** : tape une barrette posée → elle se met en avant (rotation fluide), un film cellophane apparaît ; **glisse pour l'enrouler** (jauge de serrage qui se remplit en douceur, le film se resserre), puis **🔥 Sceller** au briquet → la barrette emballée file dans le **bac à vendre**. **Prix = poids × grade × serrage**.
- **Tri & déchets** : les miettes de coupe tombent dans le **bac déchets** (compteur en g) ; tape le bac (ou la pastille 🗑️) pour les **vendre aux schlags** à bas prix (≈0,5 €/g contre 2 €/g pour de l'emballé). Rien ne se perd.
- Le **cash (€)** est affiché et **sauvegardé** (localStorage).
- **Boutique 🛒 + progression** : achète l'**Auto-emballeuse** (1ʳᵉ machine semi-auto) qui emballe/vend les barrettes toute seule (serrage fixe, un peu moins rentable que l'emballage manuel soigné), puis **Cadence +** pour l'accélérer. Achats sauvegardés, prix croissants.
- **Feedback juteux** à chaque coupe : son synthétisé (WebAudio, zéro fichier), miettes de résine projetées, secousse de caméra, pop des étiquettes ; *cha-ching* + *fwoosh* de briquet à la vente.
- On **enchaîne les barrettes** jusqu'à épuiser la savonnette. Bouton **🔄 Nouvelle** pour recommencer.

> Prototype de jeu, habillage purement visuel/humoristique.

### Jouer

- **Caméra** : cadrage auto (portrait/paysage) + **pinch à deux doigts pour zoomer** (sauvegardé).
- En ligne : **https://nobletsylvain.github.io/prototypes/**
- En local : ouvrir `index.html` dans un navigateur (idéalement Safari iOS). Nécessite une connexion (Three.js est chargé depuis un CDN).

> ℹ️ L'aperçu de fichier intégré au chat/Files n'exécute pas le JavaScript (écran vide) — il faut une vraie URL (Pages) ou ouvrir le fichier dans un navigateur.
