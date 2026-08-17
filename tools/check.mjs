// Vérification de syntaxe d'un proto — extrait chaque <script type="module">
// d'un index.html et le passe à `node --check`.
//
// Pourquoi : CLAUDE.md demande « extraire le module et le passer à node --check »
// avant chaque push, mais l'extraction se refaisait à la main à chaque fois.
// Ici c'est un script, et il vérifie AUSSI les .mjs voisins du proto.
//
// Usage :
//   node check.mjs                    # vérifie tous les protos du dépôt
//   node check.mjs la-loupe           # vérifie un proto
//   node check.mjs la-loupe le-corner # plusieurs
//
// Sortie : une ligne par fichier, code de sortie 1 si au moins une erreur.

import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TMP = mkdtempSync(path.join(tmpdir(), "protocheck-"));

const RE_MODULE = /<script\b[^>]*\btype\s*=\s*["']module["'][^>]*>([\s\S]*?)<\/script>/gi;
const RE_SRC = /<script\b[^>]*\bsrc\s*=/i;

let failed = 0, checked = 0;

function check(label, code) {
  checked++;
  const f = path.join(TMP, "c" + checked + ".mjs");
  writeFileSync(f, code);
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
    console.log(`  ok    ${label}`);
  } catch (e) {
    failed++;
    const msg = String(e.stderr || e.message)
      .split("\n").filter((l) => l.trim() && !l.includes(TMP)).slice(0, 4).join("\n        ");
    console.log(`  FAIL  ${label}\n        ${msg}`);
  }
}

function checkProto(slug) {
  const dir = path.join(ROOT, slug);
  const page = path.join(dir, "index.html");
  let html;
  try { html = readFileSync(page, "utf8"); } catch { return false; }

  console.log(`\n${slug}/`);
  let n = 0;
  for (const m of html.matchAll(RE_MODULE)) {
    // <script type="module" src="..."> n'a pas de corps : le fichier est vérifié à part
    if (RE_SRC.test(m[0])) continue;
    n++;
    check(`index.html · module #${n}`, m[1]);
  }
  if (!n) console.log("  --    index.html · aucun module inline");

  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".mjs")) continue;
    check(f, readFileSync(path.join(dir, f), "utf8"));
  }
  return true;
}

const args = process.argv.slice(2);
const slugs = args.length
  ? args.map((a) => a.replace(/\/.*$/, ""))
  : readdirSync(ROOT).filter((f) => {
      if (f.startsWith(".") || f === "tools" || f === "node_modules") return false;
      try { return statSync(path.join(ROOT, f)).isDirectory(); } catch { return false; }
    });

for (const s of slugs) {
  if (!checkProto(s) && args.length) { console.log(`\n${s}/ : pas d'index.html`); failed++; }
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${checked} fichier(s) vérifié(s), ${failed} en échec.`);
process.exit(failed ? 1 : 0);
