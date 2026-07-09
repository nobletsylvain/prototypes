# App iOS (Capacitor) — hub + protos sur TestFlight

Coque native iOS qui embarque **le hub et les 10 core loops** du repo dans une
WKWebView, **hors-ligne** (Three.js servi en local, aucun CDN). Générée avec
[Capacitor](https://capacitorjs.com) en mode **Swift Package Manager** →
**pas besoin de CocoaPods** sur le Mac.

```
app/
├── build-www.mjs          ← assemble www/ depuis la racine du repo (voir en-tête)
├── capacitor.config.json  ← appId com.nobletsylvain.prototypes, appName "Prototypes"
├── package.json           ← @capacitor/{core,ios,cli}
├── www/                   ← bundle web généré (gitignoré)
└── ios/                   ← projet Xcode (committé ; Pods/public gitignorés)
```

## Prérequis (sur le Mac)

- Xcode 16+ (Capacitor 7), connecté au compte Apple Developer payant
- Node 20+
- C'est tout — le runtime Capacitor est résolu par Xcode via SPM au premier
  chargement du projet (depuis github.com/ionic-team/capacitor-swift-pm).

## Lancer sur ton iPhone

```bash
cd app
npm install
npm run build          # assemble www/ depuis les protos du repo
npx cap sync ios       # copie www/ dans le projet Xcode
npx cap open ios       # ouvre ios/App/App.xcodeproj
```

Dans Xcode : cible **App** → onglet **Signing & Capabilities** → choisir ton
**Team**. Brancher l'iPhone, le sélectionner comme destination, **Run** ▶.

## Pousser sur TestFlight sans Mac (GitHub Actions)

Le workflow **`.github/workflows/testflight.yml`** compile et téléverse le
build depuis un runner macOS de GitHub — aucun Mac ni Xcode nécessaire.
Mise en place, une seule fois, tout depuis un navigateur :

1. **App ID** : [developer.apple.com → Identifiers](https://developer.apple.com/account/resources/identifiers/list)
   → **+** → *App IDs* → type *App* → description libre, bundle ID **explicite**
   `com.nobletsylvain.prototypes`, aucune capability à cocher.
2. **Fiche app** : [App Store Connect → Apps](https://appstoreconnect.apple.com)
   → **+** → *Nouvelle app* : iOS, un nom (ex. « Prototypes core loops »),
   langue principale, le bundle ID ci-dessus, SKU libre (ex. `prototypes`).
3. **Clé API** : App Store Connect → *Utilisateurs et accès* → *Intégrations*
   → *App Store Connect API* → **Générer une clé**, rôle **App Manager**
   (avec accès aux certificats de distribution gérés dans le cloud).
   Noter le **Key ID**, l'**Issuer ID** (en haut de la page), et télécharger
   le fichier **`.p8`** (téléchargeable une seule fois).
4. **Secrets GitHub** : repo → *Settings* → *Secrets and variables* → *Actions*
   → *New repository secret*, créer :
   - `ASC_KEY_ID` — le Key ID ;
   - `ASC_ISSUER_ID` — l'Issuer ID ;
   - `ASC_PRIVATE_KEY` — le **contenu texte** du fichier `.p8`, collé tel quel ;
   - `APPLE_TEAM_ID` — le Team ID à 10 caractères
     ([developer.apple.com → Membership](https://developer.apple.com/account#MembershipDetailsCard)).

Ensuite : onglet **Actions** du repo → workflow **TestFlight** → **Run
workflow** (le bouton apparaît une fois le workflow mergé sur `main`).
~10-15 min plus tard le build est dans App Store Connect → TestFlight ;
ajouter les testeurs là-bas. Le numéro de build est le numéro de run du
workflow, pas de collision possible. La signature passe par les certificats
« cloud managed » d'Apple via la clé API : rien à exporter, rien qui expire
dans le repo.

## Pousser sur TestFlight depuis un Mac

1. Sur [App Store Connect](https://appstoreconnect.apple.com) → *Apps* → **+** →
   *Nouvelle app* : plateforme iOS, l'identifiant de bundle
   `com.nobletsylvain.prototypes` (à créer au préalable dans
   [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
   si Xcode ne l'a pas déjà enregistré via la signature automatique).
2. Dans Xcode : destination **Any iOS Device (arm64)** → menu **Product →
   Archive** → fenêtre Organizer → **Distribute App** → **App Store Connect**
   → Upload.
3. Sur App Store Connect, onglet **TestFlight** : le build apparaît après
   quelques minutes de traitement. Ajouter des **testeurs internes** (jusqu'à
   100, dispo immédiate) ; pour des testeurs *externes* (lien public), Apple
   fait une courte *Beta App Review* du premier build.
4. Builds suivants : **incrémenter le numéro de Build** (cible App → General →
   *Build*) avant chaque nouvelle archive, sinon l'upload est refusé.

## Ce que fait l'assemblage (`npm run build`)

`build-www.mjs` copie le hub + chaque dossier de proto dans `www/` et adapte
ce qui doit l'être pour le serveur interne de Capacitor :

- import-map `unpkg.com/three` → `vendor/three.module.js` (copie de
  `tools/vendor/`, l'app marche en avion) ;
- liens du hub `./proto/` → `./proto/index.html` (les chemins sans extension
  retombent sur l'index racine, fallback SPA de Capacitor) ;
- fichiers `.mjs` → `.js`, imports réécrits (iOS ne connaît pas le type MIME
  de `.mjs` et WKWebView refuse alors le module) ;
- injection d'un bouton flottant ⌂ (retour au hub) dans chaque proto — il n'y
  a ni barre d'URL ni bouton back dans l'app. Le geste iOS « glisser depuis le
  bord gauche » fait aussi retour (activé dans `AppDelegate.swift`).

**Un nouveau proto ajouté au repo est embarqué automatiquement** (tout dossier
racine contenant un `index.html`) — refaire `npm run build && npx cap sync ios`
et re-archiver.

## Notes

- Les sauvegardes `localStorage` (`hash_*`, …) persistent dans l'app entre les
  lancements et les mises à jour ; supprimer l'app les efface.
- Orientation verrouillée portrait, iPhone uniquement, barre de statut claire
  (fond sombre).
- L'icône et le splash sont dans
  `ios/App/App/Assets.xcassets` (fiole verte sur le dégradé violet du hub).
