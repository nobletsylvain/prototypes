// Le lexique du projet, vérifié mécaniquement.
//
// Certains mots ont une orthographe ARBITRÉE par Sylvain. Ils ne se devinent pas, et
// une fois corrigés ils re-dérivent : on les relit, on « normalise » sans y penser, et
// le mot juste redevient le mot plausible. Ce fichier fige les arbitrages.
//
// Une règle = un terme fautif, son remplacement, et la raison. On n'efface pas une
// règle : la dette d'orthographe est une dette de vocabulaire de design.
//
//   cd tools && node lexique.mjs
import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const REGLES = [
  {
    // Corrigé deux fois par Sylvain (2026-07-27) : d'abord le titre de l'écran
    // d'évacuation, puis « l'expression exacte est ARAH pas Ara ». C'est un CRI —
    // le guetteur qui hurle — pas un sigle, donc il n'y a pas de forme courte.
    // Le `H` final est le son ; l'enlever change le mot.
    // Trois formes, parce que la dérive est passée par les trois : le mot seul
    // (texte, commentaires), le préfixe de constante (`ARA_LOT`) et le camelCase
    // d'identifiant (`araState`) — c'est ce dernier qui avait survécu au premier
    // correctif et d'où le mot est remonté.
    faux: /\b(?:ARA|Ara|ara)\b|\bARA_|\bara(?=[A-Z])/g,
    terme: "ARA / Ara",
    juste: "ARAH",
    raison: "c'est le cri du guetteur, pas un sigle — le H fait partie du mot",
  },
];

// on lit tout le dépôt sauf le bruit
const IGNORE = new Set(["node_modules", ".git", "shots", "vendor", "package-lock.json"]);
const EXT = new Set([".html", ".mjs", ".js", ".md", ".css"]);
const fichiers = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (IGNORE.has(e)) continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.has(path.extname(e))) fichiers.push(p);
  }
})(ROOT);

// Ce fichier CITE les formes fautives pour pouvoir les interdire : il ne se juge pas.
const MOI = path.resolve(__dirname, "lexique.mjs");

/* L'échappatoire. Certaines lignes DOIVENT porter la forme fautive : le journal cite le
   bug tel qu'il était, et il cite les messages de Sylvain mot pour mot. Réécrire ça
   effacerait ce que la note raconte. Marquer `lexique-exempt` sur la ligne ou juste
   au-dessus lève la règle — et l'exemption reste visible en relecture, ce qu'un
   contournement silencieux ne serait pas.

   `lexique-exempt-bloc` étend la levée jusqu'au prochain séparateur `---`, pour une
   entrée de journal qui PORTE sur l'orthographe : elle cite forcément l'ancienne forme
   d'un bout à l'autre. La portée reste bornée à l'entrée — jamais au fichier. */
const EXEMPT = /lexique-exempt/;
const EXEMPT_BLOC = /lexique-exempt-bloc/;

let bad = 0;
console.log("\n─── lexique du projet ───");
for (const r of REGLES) {
  const hits = [];
  for (const f of fichiers) {
    if (f === MOI) continue;
    const src = readFileSync(f, "utf8");
    const lignes = src.split("\n");
    let bloc = false;
    lignes.forEach((ligne, i) => {
      if (EXEMPT_BLOC.test(ligne)) bloc = true;
      else if (bloc && ligne.trim() === "---") bloc = false;
      if (bloc) return;
      if (EXEMPT.test(ligne) || (i > 0 && EXEMPT.test(lignes[i - 1]))) return;
      r.faux.lastIndex = 0;
      if (r.faux.test(ligne)) hits.push(`${path.relative(ROOT, f)}:${i + 1}`);
    });
  }
  const pass = hits.length === 0;
  if (!pass) bad++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  « ${r.terme} » s'écrit « ${r.juste} » — ${r.raison}` +
    (pass ? `  (${fichiers.length} fichier(s) relus)` : `\n        ${hits.slice(0, 12).join("\n        ")}` +
      (hits.length > 12 ? `\n        … et ${hits.length - 12} autre(s)` : "")));
}
console.log(`\n${REGLES.length - bad}/${REGLES.length} règle(s) de lexique OK.`);
process.exit(bad ? 1 : 0);
