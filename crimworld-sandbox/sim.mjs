/* =======================================================================
   CrimWorld — Sandbox 24h · CŒUR DE SIMULATION (LOT 1)
   JS pur, sans dépendance, sans DOM. Inspectable en console (node OU
   navigateur). Suite de la slice « La Bascule » : la boucle SANS rails.

   INVARIANTS (cf. crimworld/SANDBOX_24H_SPEC.md & CLAUDE.md) :
   - AUCUN Math.random ne pilote l'ÉTAT ou une CONSÉQUENCE. Tout est
     déterministe et trace à une décision. (L'aléatoire de PRÉSENTATION —
     pseudo, avatar du rival… — vivra dans l'UI, jamais ici.)
   - QUALITÉ = levier UNIQUE. Réput conso (la demande) et pression concurrence
     sont des CO-EFFETS PARALLÈLES de la qualité/visibilité, JAMAIS une chaîne.
   - Chaque conséquence porte un champ `cause` lisible (contrat de données) ;
     l'UI le RENDRA tel quel, n'inventera aucune cause.
   - Horloge TEMPS RÉEL pilotée par tick(dtMs) → en jeu : boucle d'animation ;
     en test : dt contrôlé, donc reproductible.

   Périmètre lot 1 : horloge + cycle de jour + rapport récurrent + squelette
   du moteur de tension (pression → corner contesté). Acheteurs générés (lot 2),
   moteur complet (lot 3), darkweb/Ubeur + dispatch (lot 4) viennent ensuite.
   ======================================================================= */

// ---- Constantes nommées (PLACEHOLDERS — NON réglées ; réglage humain plus tard)
export const C = {
  HOUR_MS: 2000,          // 1 heure de jeu = 2 s réelles (horloge temps réel)
  DAY_HOURS: 24,
  LOYER_JOUR: 40,         // loyer du corner / jour (compteur de FOND, pas l'antagoniste)
  PRIX_DOSE: 10,          // € / dose (placeholder)
  // --- pression concurrence : CO-EFFETS PARALLÈLES de la qualité/visibilité ---
  PRESS_EXPO: 8,          // par post de vitrine (exposition)
  PRESS_VOLUME: 1.5,      // par dose écoulée (volume visible)
  PRESS_ARRACHE: 12,      // surcoût d'une coupe à l'arrache (qualité basse)
  PRESS_DECAY: 20,        // retombée passive en fin de jour SI on lève le pied
  SEUIL_CONTESTE: 100,    // au-delà : un rival vient disputer le corner
  // --- réputation conso (la demande) — affichée OPAQUE ---
  REPUT_PROPRE: 6,        // gain réput d'une coupe propre
  REPUT_ARRACHE: -25,     // perte réput d'une coupe à l'arrache
};

// ---- Affichage OPAQUE (présentation déterministe : pas de chiffre brut) ----
export function jaugeOpaque(v, max, sym = "•", plein = "🔥"){
  const n = Math.max(0, Math.min(5, Math.round((v / max) * 5)));
  return plein.repeat(Math.max(1, Math.ceil(n / 2))) + " " + sym.repeat(n);
}

// ---- Fabrique de simulation -------------------------------------------
export function createSim(){
  const state = {
    jour: 1,
    heure: 0,                 // heures écoulées dans le jour courant (0..24)
    cash: 0,
    loyerDu: 0,               // loyer cumulé à régler (compteur de fond)
    pression: 0,              // concurrence pour le corner
    reput: 50,                // réput conso (interne ; rendue opaque côté UI)
    corner: "tenu",           // "tenu" | "contesté"
    jourEnCours: nouveauJour(),
    historique: [],           // un résumé par jour clos → trace inter-jours
    dernierRapport: null,
  };

  function nouveauJour(){
    return { doses: 0, ventes: 0, posts: 0, grade: null, lignes: [], pressLog: [] };
  }

  // -- enregistre une contribution à la pression AVEC sa cause (traçable) --
  function addPression(montant, cause){
    state.pression += montant;
    state.jourEnCours.pressLog.push({ montant, cause });
    verifierContest();
  }

  // -- conséquence DÉTERMINISTE : pression ≥ seuil → un rival conteste le
  //    corner. La cause = les 2 plus grosses contributions du jour (traçable).
  function verifierContest(){
    if (state.corner === "contesté" || state.pression < C.SEUIL_CONTESTE) return;
    state.corner = "contesté";
    const top = [...state.jourEnCours.pressLog]
      .sort((a, b) => b.montant - a.montant).slice(0, 2)
      .map(p => p.cause).join(" + ");
    state.jourEnCours.lignes.push({
      ic: "⚔️", label: "Un rival conteste ton corner", montant: 0,
      cause: "ton succès est visible : " + (top || "exposition + volume"),
    });
  }

  // ---- Décisions du joueur (chacune feed cash/réput/pression + cause) ----
  const api = {
    state,

    couper(grade){            // 'A' = propre · 'C' = arrache (qualité = levier UNIQUE)
      state.jourEnCours.grade = grade;
      if (grade === "C"){
        state.reput += C.REPUT_ARRACHE;
        addPression(C.PRESS_ARRACHE, "coupe à l'arrache (jour " + state.jour + ")");
      } else {
        state.reput += C.REPUT_PROPRE;
      }
      state.reput = Math.max(0, Math.min(100, state.reput));
      return api;
    },

    posterVitrine(){          // exposition → co-effet pression (pas une chaîne via les ventes)
      state.jourEnCours.posts++;
      addPression(C.PRESS_EXPO, "vitrine postée (exposition)");
      return api;
    },

    vendre(doses){            // volume écoulé → cash + co-effet pression EN PARALLÈLE
      const d = Math.max(0, doses | 0);
      const montant = d * C.PRIX_DOSE;
      state.jourEnCours.doses += d;
      state.jourEnCours.ventes += montant;
      state.cash += montant;
      addPression(d * C.PRESS_VOLUME, d + " doses écoulées (volume visible)");
      // `cause` reste du TEXTE PUR (pas de symbole de présentation) : l'UI
      // rend le label tel quel et affiche la réput opaque via reputOpaque.
      state.jourEnCours.lignes.push({
        ic: "🤝", label: d + " doses vendues", montant,
        cause: "demande du jour (réput conso)",
      });
      return api;
    },

    // ---- Horloge TEMPS RÉEL : avance de dtMs ; clôt le jour à 24 h ----
    tick(dtMs){
      // `heure` est flottant : en temps réel continu (dt ~16 ms) une dérive
      // IEEE-754 lente est possible — tolérable au lot 1, à revoir au lot 3
      // (événements horodatés). Le `while` évite tout jour sauté.
      state.heure += dtMs / C.HOUR_MS;
      while (state.heure >= C.DAY_HOURS){
        state.heure -= C.DAY_HOURS;
        cloreJour();
      }
      return api;
    },

    rapport(){ return construireRapport(); },   // bilan à la volée (jour en cours)
  };

  // ---- Fin de jour : loyer, retombée pression, rapport, rollover --------
  function cloreJour(){
    state.loyerDu += C.LOYER_JOUR;
    state.jourEnCours.lignes.push({
      ic: "🏚️", label: "Loyer du corner", montant: -C.LOYER_JOUR,
      cause: "tu paies pour EXISTER sur le block (pas pour la came)",
    });
    // la pression retombe SI le corner n'est pas (déjà) contesté — lever le pied paie
    if (state.corner === "tenu"){
      state.pression = Math.max(0, state.pression - C.PRESS_DECAY);
    }
    const rap = construireRapport();
    // historique poussé APRÈS construireRapport (intentionnel) : la trace
    // inter-jours ne doit référencer que des jours PASSÉS, pas celui qui clôt.
    state.historique.push({
      jour: state.jour, grade: state.jourEnCours.grade,
      ventes: state.jourEnCours.ventes, corner: state.corner,
    });
    state.dernierRapport = rap;
    state.jour++;
    state.jourEnCours = nouveauJour();
    return rap;
  }

  // ---- Construit l'objet rapport (l'UI le RENDRA, n'inventera rien) -----
  function construireRapport(){
    const j = state.jourEnCours;
    // trace INTER-JOURS : un problème d'aujourd'hui ↩ une décision passée
    const trace = [];
    const arracheAvant = state.historique.find(h => h.grade === "C");
    if (state.reput < 40 && arracheAvant){
      trace.push({
        ic: "↩", label: "Réput basse → demande en berne",
        cause: "coupe à l'arrache du jour " + arracheAvant.jour,
      });
    }
    return {
      jour: state.jour,
      lignes: j.lignes.slice(),
      total: j.lignes.reduce((s, l) => s + (l.montant || 0), 0),
      cash: state.cash,
      loyerDu: state.loyerDu,
      reputOpaque: jaugeOpaque(state.reput, 100),
      pressionOpaque: jaugeOpaque(state.pression, C.SEUIL_CONTESTE, "•", "⚔️"),
      corner: state.corner,
      trace,
    };
  }

  return api;
}

/* =======================================================================
   DÉMO CONSOLE — 3 jours déterministes, on imprime les rapports.
   Lancer :  node crimworld-sandbox/sim.mjs
   ======================================================================= */
function imprimerRapport(r){
  console.log(`\n=== RAPPORT — JOUR ${r.jour} ===`);
  for (const l of r.lignes){
    const m = l.montant ? (l.montant > 0 ? ` +${l.montant}€` : ` ${l.montant}€`) : "";
    console.log(`  ${l.ic} ${l.label}${m}`);
    console.log(`       ↳ ${l.cause}`);
  }
  console.log(`  — total jour : ${r.total >= 0 ? "+" : ""}${r.total}€ · caisse ${r.cash}€ · loyer dû ${r.loyerDu}€`);
  console.log(`  — réput ${r.reputOpaque} · pression ${r.pressionOpaque} · corner : ${r.corner}`);
  for (const t of r.trace) console.log(`  ${t.ic} ${t.label}\n       ↳ ${t.cause}`);
}

export function demo(){
  const sim = createSim();
  const JOUR = C.HOUR_MS * C.DAY_HOURS;
  console.log("CrimWorld Sandbox — démo cœur de sim (lot 1)");
  console.log("Horloge temps réel (tick dt) · déterministe · aucune conséquence aléatoire.");

  // JOUR 1 — prudent : coupe propre, peu d'exposition.
  sim.couper("A").posterVitrine().vendre(12);
  sim.tick(JOUR);
  imprimerRapport(sim.state.dernierRapport);

  // JOUR 2 — cupide : arrache + spam vitrine + gros volume → corner contesté.
  sim.couper("C").posterVitrine().posterVitrine().posterVitrine().vendre(40);
  sim.tick(JOUR);
  imprimerRapport(sim.state.dernierRapport);

  // JOUR 3 — la note arrive : réput basse, demande en berne ↩ arrache jour 2.
  sim.couper("A").vendre(6);
  sim.tick(JOUR);
  imprimerRapport(sim.state.dernierRapport);
}

// auto-run quand exécuté directement par node (sans casser l'import navigateur)
if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].includes("sim.mjs")){
  demo();
}
