# prototypes

Petits prototypes jouables/testables directement dans le navigateur (mobile-first, zéro dépendance).

## 🍰 Cake Slicer

Mini-jeu mobile en HTML + Canvas (vanilla JS, un seul fichier `index.html`).

**But :** poser le doigt sur le gâteau et suivre les pointillés pour couper une tranche.
- La **précision** n'est pas critique : chaque couteau a une marge latérale (tolérance).
- La **vitesse de coupe** dépend du couteau : 🧈 beurre (lent/strict), 🔪 chef (équilibré), ⚡ katana laser (rapide/indulgent).
- Couper **mal trop longtemps** (hors du trait *ou* plus vite que le couteau) fait chuter la jauge d'intégrité (+ tremblement d'écran). À 0 %, la tranche **se brise** en fragments physiques.
- Une coupe propre jusqu'en bas → la tranche **se détache et bascule**. Tap pour rejouer.

### Jouer

- En ligne (une fois GitHub Pages activé) : **https://nobletsylvain.github.io/prototypes/**
- En local : ouvrir `index.html` dans un navigateur (idéalement sur mobile / Safari iOS).

> ℹ️ L'aperçu de fichier intégré au chat/Files n'exécute pas le JavaScript (écran vide) — il faut une vraie URL (Pages) ou ouvrir le fichier dans un navigateur.
