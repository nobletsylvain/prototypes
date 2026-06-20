# prototypes

Petits prototypes jouables/testables directement dans le navigateur (mobile-first).

## 🍰 Cake Slicer 3D

Mini-jeu mobile en **3D** (HTML + [Three.js](https://threejs.org/) chargé via CDN, un seul fichier `index.html`).

**But :** trancher un **quatre-quarts long** posé sur une planche.
- Tu **glisses ton doigt en travers du cake** : le tracé définit un plan de coupe.
- Au relâchement, la **tranche se détache** (côté bout libre) et **tombe sur la planche** (petite physique : chute + rebond).
- **Chaque coupe réussit toujours**, même imprécise : l'épaisseur et le biais varient et donnent un petit feedback (*Tranche parfaite ✨*, *Grosse part 😋*, *Tranche bancale 😅*…).
- On **enchaîne les tranches** jusqu'à ce qu'il ne reste plus de cake. Bouton **🔄 Nouveau cake** pour recommencer.

### Jouer

- En ligne : **https://nobletsylvain.github.io/prototypes/**
- En local : ouvrir `index.html` dans un navigateur (idéalement Safari iOS). Nécessite une connexion (Three.js est chargé depuis un CDN).

> ℹ️ L'aperçu de fichier intégré au chat/Files n'exécute pas le JavaScript (écran vide) — il faut une vraie URL (Pages) ou ouvrir le fichier dans un navigateur.
