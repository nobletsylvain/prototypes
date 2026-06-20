# prototypes

Petits prototypes jouables/testables directement dans le navigateur (mobile-first).

## 🟫 Hash Slicer 3D

Mini-jeu mobile en **3D** (HTML + [Three.js](https://threejs.org/) chargé via CDN, un seul fichier `index.html`). Reskin humoristique d'un jeu de découpe : on débite une **savonnette** posée sur une planche.

**But :** couper des **barrettes** dans une savonnette (pain pressé) posée sur une planche.
- Tu **glisses ton doigt en travers** : le tracé définit un plan de coupe.
- Au relâchement, la **barrette se détache** (côté bout libre) et **tombe sur la planche** (petite physique : chute + rebond).
- **Chaque coupe réussit toujours**, même imprécise : l'épaisseur et le biais varient et donnent un petit feedback (*Barrette nickel ✨*, *Grosse barrette 😏*, *Coupe bancale 😅*…).
- On **enchaîne les barrettes** jusqu'à épuiser la savonnette. Bouton **🔄 Nouvelle** pour recommencer.

> Prototype de jeu, habillage purement visuel/humoristique.

### Jouer

- En ligne : **https://nobletsylvain.github.io/prototypes/**
- En local : ouvrir `index.html` dans un navigateur (idéalement Safari iOS). Nécessite une connexion (Three.js est chargé depuis un CDN).

> ℹ️ L'aperçu de fichier intégré au chat/Files n'exécute pas le JavaScript (écran vide) — il faut une vraie URL (Pages) ou ouvrir le fichier dans un navigateur.
