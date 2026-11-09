// Assemble le bundle web de l'app iOS dans app/www/ a partir de la racine du repo.
//
// Ce que fait le script :
//  1. copie le hub (index.html racine) + chaque dossier de proto dans www/ ;
//  2. sert Three.js EN LOCAL : l'import-map unpkg est reecrit vers
//     ../vendor/three.module.js (copie depuis tools/vendor/) — l'app doit
//     marcher hors-ligne, aucun CDN ;
//  3. reecrit les liens du hub "./<slug>/" en "./<slug>/index.html" : le
//     serveur interne de Capacitor (WKURLSchemeHandler) renvoie l'index.html
//     RACINE pour tout chemin sans extension (fallback SPA), les URLs de
//     dossier ne marchent donc pas ;
//  4. injecte dans chaque proto un petit bouton flottant "retour au hub"
//     (dans l'app native il n'y a ni barre d'URL ni bouton back).
//
//  5. renomme les fichiers .mjs en .js (imports reecrits) : le serveur interne
//     de Capacitor s'appuie sur les UTI d'iOS, qui ne connaissent pas .mjs ->
//     servi en octet-stream, et WKWebView refuse le module ES.
//
// Usage : cd app && npm run build   (ou : node build-www.mjs)

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WWW = path.join(__dirname, "www");
const UNPKG_THREE = "https://unpkg.com/three@0.160.0/build/three.module.js";
const VENDOR_THREE = path.join(ROOT, "tools", "vendor", "three.module.js");

// Dossiers de la racine qui ne sont PAS des protos.
const EXCLUDE = new Set(["app", "tools", "node_modules", ".git", ".github"]);

// Bouton flottant "retour au hub", discret (s'estompe apres quelques secondes).
// Place sur le bord gauche SOUS les HUD des protos (qui occupent tous le haut
// de l'ecran) ; le geste natif "glisser depuis le bord gauche" marche aussi.
const HOME_BTN = `
<a id="cap-home" href="../index.html" aria-label="Retour au hub"
   style="position:fixed;top:calc(env(safe-area-inset-top,0px) + 150px);left:6px;z-index:2147483647;
   width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.38);color:rgba(255,255,255,.9);
   display:flex;align-items:center;justify-content:center;font:17px/1 -apple-system,sans-serif;
   text-decoration:none;-webkit-tap-highlight-color:transparent;opacity:.5;transition:opacity .4s">⌂</a>
<script>setTimeout(function(){var b=document.getElementById("cap-home");if(b)b.style.opacity=".22"},4000)</script>`;

if (existsSync(WWW)) rmSync(WWW, { recursive: true });
mkdirSync(WWW, { recursive: true });

const protos = readdirSync(ROOT).filter((d) =>
  !EXCLUDE.has(d) && !d.startsWith(".") &&
  statSync(path.join(ROOT, d)).isDirectory() &&
  existsSync(path.join(ROOT, d, "index.html"))
).sort();
if (!protos.length) { console.error("ERREUR: aucun proto trouve a la racine."); process.exit(1); }

// --- Hub : liens de dossier -> liens explicites vers index.html.
let hub = readFileSync(path.join(ROOT, "index.html"), "utf8");
for (const p of protos) hub = hub.replaceAll(`href="./${p}/"`, `href="./${p}/index.html"`);
writeFileSync(path.join(WWW, "index.html"), hub);

// --- Protos : copie + Three.js local + bouton hub.
const warnings = [];
for (const p of protos) {
  cpSync(path.join(ROOT, p), path.join(WWW, p), { recursive: true });
  const file = path.join(WWW, p, "index.html");
  let html = readFileSync(file, "utf8");
  html = html.replaceAll(UNPKG_THREE, "../vendor/three.module.js");

  // Toute autre URL distante casserait le mode hors-ligne -> on previent.
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>)]+/g)) warnings.push(`${p}: reference externe restante -> ${m[0]}`);

  html = html.includes("</body>") ? html.replace("</body>", `${HOME_BTN}\n</body>`) : html + HOME_BTN;
  writeFileSync(file, html);

  // .mjs -> .js (voir en-tete, point 5), references comprises.
  const dir = path.join(WWW, p);
  const all = readdirSync(dir, { recursive: true }).map(String);
  const mjs = all.filter((f) => f.endsWith(".mjs"));
  if (mjs.length) {
    for (const f of mjs) renameSync(path.join(dir, f), path.join(dir, f.slice(0, -4) + ".js"));
    for (const f of all.filter((f) => /\.(html|js|mjs)$/.test(f))) {
      const target = path.join(dir, f.endsWith(".mjs") ? f.slice(0, -4) + ".js" : f);
      let src = readFileSync(target, "utf8");
      for (const m of mjs) src = src.replaceAll(path.basename(m), path.basename(m).slice(0, -4) + ".js");
      writeFileSync(target, src);
    }
  }
}

// --- Dossiers de donnees partagees (sans index.html, ex. slang/) : copies
// tels quels — des protos les consomment en fetch relatif (../slang/...).
const dataDirs = readdirSync(ROOT).filter((d) =>
  !EXCLUDE.has(d) && !d.startsWith(".") &&
  statSync(path.join(ROOT, d)).isDirectory() &&
  !protos.includes(d)
).sort();
for (const d of dataDirs) cpSync(path.join(ROOT, d), path.join(WWW, d), { recursive: true });

// --- Three.js vendore (meme copie que l'outil de captures).
mkdirSync(path.join(WWW, "vendor"), { recursive: true });
cpSync(VENDOR_THREE, path.join(WWW, "vendor", "three.module.js"));

console.log(`www/ assemble : hub + ${protos.length} protos (${protos.join(", ")})`
  + (dataDirs.length ? ` + donnees : ${dataDirs.join(", ")}` : ""));
for (const w of warnings) console.warn("ATTENTION —", w);
