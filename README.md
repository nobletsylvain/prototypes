# prototypes

Petits prototypes jouables/testables directement dans le navigateur (mobile-first).

## 🟫 Hash Slicer 3D

Mini-jeu mobile en **3D** (HTML + [Three.js](https://threejs.org/) chargé via CDN, un seul fichier `index.html`). Reskin humoristique d'un jeu de découpe : on débite une **savonnette** posée sur une planche.

**But :** couper des **barrettes** dans une savonnette (pain pressé) posée sur une planche.
- Tu **glisses ton doigt en travers** : le tracé définit un plan de coupe.
- Au relâchement, la **barrette se détache** (côté bout libre) et **tombe sur la planche** (petite physique : chute + rebond).
- **Chaque coupe réussit toujours**, même imprécise : l'épaisseur et le biais varient et donnent un petit feedback (*Barrette nickel ✨*, *Grosse barrette 😏*, *Coupe bancale 😅*…).
- Chaque barrette est **pesée** (poids en g, calibré pour ~250 g la savonnette entière) et **notée** A/B/C selon la propreté de coupe ; une étiquette suit la barrette en 3D.
- **Emballage + vente** : tape une barrette posée → elle se met en avant, un film cellophane apparaît ; **glisse pour l'enrouler** (jauge de serrage, la barrette roule), puis **🔥 Sceller** au briquet → vente. **Prix = poids × grade × serrage** (plus tu emballes vite, plus c'est serré = plus de €).
- Le **cash (€)** est affiché et **sauvegardé** (localStorage) — socle de la future progression (machines / automatisation).
- **Feedback juteux** à chaque coupe : son synthétisé (WebAudio, zéro fichier), miettes de résine projetées, secousse de caméra, pop des étiquettes ; *cha-ching* + *fwoosh* de briquet à la vente.
- On **enchaîne les barrettes** jusqu'à épuiser la savonnette. Bouton **🔄 Nouvelle** pour recommencer.

> Prototype de jeu, habillage purement visuel/humoristique.

### Jouer

- En ligne : **https://nobletsylvain.github.io/prototypes/**
- En local : ouvrir `index.html` dans un navigateur (idéalement Safari iOS). Nécessite une connexion (Three.js est chargé depuis un CDN).

> ℹ️ L'aperçu de fichier intégré au chat/Files n'exécute pas le JavaScript (écran vide) — il faut une vraie URL (Pages) ou ouvrir le fichier dans un navigateur.
