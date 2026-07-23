/* Le Corner — vente présentielle (négo) : LOGIQUE PURE, portée du banc d'essai le-corner/.
   Système de PHASE B de La Loupe : quand tu tiens TON corner (indépendant), la vente auto
   laisse place à la négo au pied de la barre. L'UI + le tick vivent dans index.html ; ici,
   le tuning (CFG du proto transposé tel quel — une seule source) et la résolution
   DÉTERMINISTE des offres (zones de prix). En Phase A (salarié) et en auto (charbonneur
   embauché) : pas de négo, on garde le débit auto.
   R1 : rater une négo = vente perdue, jamais de malus sec. R4 : zéro hasard d'état (hash). */

export const CORNER = {
  PRIX_FAIR: 10,            // base €/g — MÊME valeur que snap.SC.PRIX_FAIR (un seul barème)
  FAIR_BAND: 0.10,          // fenêtre « prix juste » : menu ±10 %
  NEGO_MAX: 1.2,            // au-dessus du menu jusqu'à ×1.2 = bonne négo (marge du présentiel)
  TIP_JUSTE: 0.18, TIP_LU: 0.22,
  COMBO_STEP: 0.5, COMBO_MAX: 3,
  PATIENCE: { regulier:26, lowball:30, accro:15, grossiste:40, hesitant:32, louche:30 },
  QUEUE_MELT: 0.8, WAIT_FREEZE_S: 8, WAIT_MELT: 1.6,
  // tolérance €/g : plafond accepté ; l'écart (haut de zone juste ×1.1 → tol) = l'espace de négo
  TOL: { regulier:1.2, lowball:0.82, accro:1.35, grossiste:0.78, hesitant:1.15, louche:99 },
  TOL_PER_REL: 1/600,
  BUDGET: { regulier:70, lowball:110, accro:50, grossiste:260, hesitant:60, louche:999 },
  BUDGET_PER_REL: 1/100,
  OFFER: { regulier:[0.92,1.0], lowball:[0.55,0.62], accro:[1.0,1.05], grossiste:[0.68,0.74] },
  REL_DEAL:2, REL_JUSTE:2, REL_PERSO:3, REL_GOUGE:-2, REL_WALK:-2,
  UNLOCK_REL:40, GOUGE_STREAK_QUIT:2,
  HEAT_LOUCHE:20, FLAIR_BONUS:25,
  REP_DEAL:1, REP_JUSTE:1, REP_GOUGE:-2, REP_WALK:-1,
  RES_DEAL:3, RES_WALK:6,    // réservoir clients (satisfaction) : bon deal ↑, client fâché/parti ↓
};

// personas du corner (relation → budget/fréquence ; fidèle → présente un contact)
export const CORNER_PERSONAS = [
  { id:"momo",  nm:"Momo",  av:"🧢", kind:"regulier",  usual:5,  exig:55, start:true },
  { id:"ines",  nm:"Inès",  av:"🎧", kind:"regulier",  usual:2,  exig:70, start:true },
  { id:"riton", nm:"Riton", av:"🥀", kind:"accro",     usual:2,  exig:20, start:true },
  { id:"yaz",   nm:"Yaz",   av:"🛵", kind:"lowball",   usual:8,  exig:40, start:true },
  { id:"sofia", nm:"Sofia", av:"💅", kind:"hesitant",  usual:5,  exig:65, start:true },
  { id:"bilal", nm:"Bilal", av:"🎒", kind:"regulier",  usual:8,  exig:50, start:true },
  { id:"diego", nm:"Diego", av:"🏗️", kind:"grossiste", usual:16, exig:45, unlockedBy:"momo" },
  { id:"lina",  nm:"Lina",  av:"🌙", kind:"regulier",  usual:5,  exig:80, unlockedBy:"ines" },
  { id:"nassim",nm:"Nassim",av:"🎲", kind:"accro",     usual:8,  exig:25, unlockedBy:"riton" },
  { id:"kenza", nm:"Kenza", av:"👟", kind:"lowball",   usual:5,  exig:35, unlockedBy:"yaz" },
  { id:"lea",   nm:"Léa",   av:"🎀", kind:"hesitant",  usual:2,  exig:60, unlockedBy:"sofia" },
];
export const CORNER_TAG = { regulier:"CLIENT", lowball:"RADIN", accro:"ACCRO", grossiste:"GROS", hesitant:"HESIT", louche:"INCONNU" };
export const CORNER_FORMATS = [2,5,8];

const TXT = {
  regulier: ["Je passais devant la barre. {q} g, je te mets {t} ?", "Propre et rapide comme d'hab. {q} g pour {t}.", "Tu m'avances {q} g ? J'ai {t} sur moi."],
  lowball:  ["{q} g à {t}, à prendre ou à laisser.", "Tout le monde brade. {q} g, {t}, dernier mot."],
  accro:    ["Là maintenant. {q} g. J'ai {t}. Réponds.", "Je tiens plus, {q} g direct, {t} cash."],
  grossiste:["On parle volume : {q} g d'un coup, {t}. Carré chaque semaine si t'es réglo.", "{q} g, {t}, et je vide ton bac tous les soirs."],
  hesitant: ["Je sais pas trop ce qu'il me faut… 🫤"],
};
const REACT = {
  marge: ["Frérot le prix 😍", "À ce prix je ramène tout le tieks !"],
  juste: ["PRIX JUSTE.", "Tu lis dans les pensées."],
  deal:  ["Carré.", "T'es fiable toi.", "Nickel, je repasse."],
  nego:  ["Tu sais vendre, toi…", "Ok ok, t'es un commerçant.", "Ça va, t'as le bagou."],
  gouge: ["Abusé… mais bon, vas-y.", "Tu t'es cru où ? Allez, donne."],
  walk:  ["C'est mort. Je passe ailleurs.", "Tu me reverras pas."],
};

// hash déterministe (R4 : pas de Math.random sur l'état)
function hh(a, b){ let x=(a*73856093)^(b*19349663); x=((x^(x>>13))*1274126177)|0; return (((x^(x>>16))>>>0)%100000)/100000; }
const pick = (arr, i) => arr[((i%arr.length)+arr.length)%arr.length];
const R = Math.round;

// barème présentiel — même formule que snap.mjs (prix « fair » dérivé de la réput)
export function cornerFair(reput){ return Math.max(4, R(CORNER.PRIX_FAIR*(0.6 + (reput||0)/120))); }
export function cornerTol(kind, rel, reput){ return cornerFair(reput)*(CORNER.TOL[kind] + (rel||0)*CORNER.TOL_PER_REL); }
export function cornerBudget(kind, rel){ return CORNER.BUDGET[kind]*(1 + (rel||0)*CORNER.BUDGET_PER_REL); }

// qualité d'une offre vs TON menu (l'info centrale : l'écart % au menu)
export function offerQual(ppu, reput){
  const r=ppu/cornerFair(reput), pct=R((r-1)*100);
  if(r>=1+CORNER.FAIR_BAND) return { cls:"q-good", lbl:"+"+pct+" % menu" };
  if(r>=1-CORNER.FAIR_BAND) return { cls:"q-fair", lbl:"prix menu" };
  if(r>=0.75) return { cls:"q-low", lbl:pct+" % menu" };
  return { cls:"q-scam", lbl:pct+" % menu" };
}

// table clients (relations, déblocages) — seedée depuis les personas
export function cornerClientsDefault(){
  const c={};
  for(const p of CORNER_PERSONAS) c[p.id]={ rel:10, unlocked:!!p.start, missed:0, gougeStreak:0, quit:false };
  return c;
}

export function personaById(id){ return CORNER_PERSONAS.find(p=>p.id===id) || null; }
export function patienceOf(kind){ return CORNER.PATIENCE[kind] || 26; }

/* Génère la demande d'un client (qty g + prix offert + phrase) — déterministe (persona/jour/seq).
   Renvoie null pour les kinds sans offre explicite (hésitant) — gérés plus tard (étape 2b). */
export function makeOffer(persona, rel, reput, day, seq){
  const kind = persona.kind;
  if(kind==="hesitant") return null; // mode « à interpréter » : reporté à l'étape suivante
  const qty = kind==="grossiste" ? (16 + (hh(day, seq)>0.6 ? 8 : 0)) : persona.usual;
  const off = CORNER.OFFER[kind] || [0.9, 1.0];
  const m = off[0] + (off.length>1 ? hh(day*5, seq)*(off[1]-off[0]) : 0);
  const offer = Math.max(1, R(qty*cornerFair(reput)*m));
  const tx = pick(TXT[kind]||TXT.regulier, day+seq).replace("{q}", qty).replace("{t}", offer);
  return { qty, offer, tx };
}

export function reactLine(outcome, i){ return pick(REACT[outcome]||REACT.deal, i); }

/* Cœur du système : résout une offre (g grammes, total €) — DÉTERMINISTE.
   Renvoie un VERDICT ; le caller applique les deltas (rel/reput/heat/res), débite le tampon,
   remplit le bac. `firstTry` = 1re résolution (pour le bonus JUSTE) ; `isClientOffer` = on
   accepte l'offre du client (vs on a réglé un prix). */
export function resolveOffer(client, g, total, firstTry, isClientOffer, reput){
  const fair = cornerFair(reput), ppu = total/g;
  const tol = cornerTol(client.kind, client.rel, reput), bud = cornerBudget(client.kind, client.rel);
  const accepted = ppu <= tol && total <= bud;
  if(accepted){
    const band = ppu >= fair*(1-CORNER.FAIR_BAND) && ppu <= fair*(1+CORNER.FAIR_BAND);
    if(ppu < fair*(1-CORNER.FAIR_BAND))
      return { outcome:"marge", accepted:true, emo:"😍", rel:CORNER.REL_DEAL+2, reput:CORNER.REP_DEAL, res:CORNER.RES_DEAL, tip:0, resetGouge:true };
    if(band){
      const juste = firstTry && !isClientOffer;
      if(juste) return { outcome:"juste", accepted:true, emo:"🤝", rel:CORNER.REL_DEAL+CORNER.REL_JUSTE, reput:CORNER.REP_DEAL+CORNER.REP_JUSTE, res:CORNER.RES_DEAL, tipRate:CORNER.TIP_JUSTE, combo:true, resetGouge:true };
      return { outcome:"deal", accepted:true, emo:"😊", rel:CORNER.REL_DEAL, reput:CORNER.REP_DEAL, res:CORNER.RES_DEAL, tip:0, resetGouge:true };
    }
    if(ppu <= fair*CORNER.NEGO_MAX)
      return { outcome:"nego", accepted:true, emo:"😏", rel:0, reput:CORNER.REP_DEAL, res:CORNER.RES_DEAL, tip:0, marge:R(total-g*fair) };
    // abus (au-delà de ×1.2, mais il paie) : relation −, 2 d'affilée → il ne revient plus
    return { outcome:"gouge", accepted:true, emo:"😒", rel:CORNER.REL_GOUGE, reput:CORNER.REP_GOUGE, res:0, tip:0, gouge:true };
  }
  // refusé par le client
  if(!isClientOffer && firstTry){
    const t2 = Math.max(1, Math.min(R(g*tol*0.97), Math.floor(bud)));
    return { outcome:"counter", accepted:false, counterTotal:t2 }; // son « dernier prix »
  }
  return { outcome:"walk", accepted:false, emo:"🤬", rel:CORNER.REL_WALK, reput:CORNER.REP_WALK, res:-CORNER.RES_WALK };
}
