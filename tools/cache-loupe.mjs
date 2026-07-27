// Le cache-busting des modules de La Loupe, vérifié mécaniquement.
//
// Symptôme observé en playtest (2026-07-27) : « je viens d'avoir une descente mais
// aucun message ni aucune alerte ». Cause : les imports portaient une version FIGÉE
// (`?v=18` / `?v=3`) alors que corner/snap/shelter avaient été réécrits de fond en
// comble. Le navigateur servait un `index.html` à jour avec des modules vieux de
// plusieurs jours — le jeu tournait sur un mélange des deux versions.
//
// Deux règles, toutes deux vérifiables sans navigateur :
//   1. TOUS les imports de .mjs portent le MÊME suffixe de version — y compris les
//      imports croisés entre modules. Deux URL distinctes = deux instances chargées.
//   2. Le suffixe doit changer quand un .mjs change. On le mesure par rapport à git :
//      si un module a été modifié depuis le dernier bump, on refuse.
//
//   cd tools && node cache-loupe.mjs
import { readFileSync, readdirSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, "..", "la-loupe");

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });

// tous les fichiers qui importent un .mjs local : index.html + les modules eux-mêmes
const fichiers = ["index.html", ...readdirSync(DIR).filter((f) => f.endsWith(".mjs"))];
// DEUX formes d'import, et il a fallu se faire avoir pour s'en souvenir :
//   statique  : import … from "./x.mjs?v=N"
//   dynamique : import("./x.mjs?v=N")        ← pas de `from`
// La règle ne regardait que la première. `scene3d.mjs` — la scène 3D de la coupe, donc
// le geste central — est chargée dynamiquement : elle est restée figée à ?v=19 du
// 20 juillet pendant que le module était corrigé le 25 (désync du gabarit). Cinq jours
// durant, tout navigateur au cache chaud a joué l'ANCIENNE scène, et le garde-fou écrit
// exprès pour ça affichait 3/3. Un garde qui ne couvre pas toutes les formes du danger
// ne garde que celles auxquelles on avait déjà pensé.
const RE_STATIQUE = /from\s+["']\.\/([\w-]+\.mjs)(\?v=(\d+))?["']/g;
const RE_DYNAMIQUE = /\bimport\s*\(\s*["']\.\/([\w-]+\.mjs)(\?v=(\d+))?["']\s*\)/g;

const imports = [];
for (const f of fichiers) {
  const src = readFileSync(path.join(DIR, f), "utf8");
  for (const re of [RE_STATIQUE, RE_DYNAMIQUE]) {
    re.lastIndex = 0;
    for (const m of src.matchAll(re)) imports.push({ dans: f, module: m[1], v: m[3] || null });
  }
}

// ── 1. aucun import sans version ───────────────────────────────────────────
const nus = imports.filter((i) => i.v === null);
ok("Aucun import de module sans suffixe de version",
   nus.length === 0,
   nus.length ? nus.map((i) => `${i.dans} → ${i.module}`).join(", ")
              : `${imports.length} import(s) versionné(s)`);

// ── 2. une seule version dans tout le dossier ──────────────────────────────
const versions = [...new Set(imports.map((i) => i.v).filter(Boolean))];
ok("Tous les imports partagent la MÊME version (sinon : modules chargés en double)",
   versions.length <= 1,
   versions.length > 1
     ? `versions divergentes : ${imports.filter((i) => i.v).map((i) => `${i.dans}→${i.module}?v=${i.v}`).join(", ")}`
     : `?v=${versions[0] || "—"}`);

// ── 3. le suffixe a bougé depuis la dernière modification d'un module ──────
// On compare le commit qui a touché chaque .mjs à celui qui a touché la ligne
// d'import. Si un module est plus récent que le bump, le cache servira du périmé.
{
  const gitDate = (f, extra = "") => {
    try {
      return execSync(`git -C ${JSON.stringify(path.resolve(__dirname, ".."))} log -1 --format=%ct ${extra} -- ${JSON.stringify(f)}`,
        { encoding: "utf8" }).trim();
    } catch { return ""; }
  };
  const modules = readdirSync(DIR).filter((f) => f.endsWith(".mjs"));
  const dateBump = +gitDate("la-loupe/index.html") || 0;   // le bump vit dans index.html
  const enRetard = [];
  for (const m of modules) {
    const d = +gitDate("la-loupe/" + m) || 0;
    if (d > dateBump) enRetard.push(`${m} (modifié après le dernier commit d'index.html)`);
  }
  ok("Le suffixe de version est au moins aussi récent que chaque module",
     enRetard.length === 0,
     enRetard.length ? enRetard.join(", ") : `${modules.length} module(s) vérifié(s) contre le bump`);
}

console.log("\n─── cache-busting · La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} OK.`);
process.exit(bad ? 1 : 0);
