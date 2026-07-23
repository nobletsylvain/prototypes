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
  LOUCHE_FROM_DAY:2, LOUCHE_CHANCE:0.14, // un profil cramé apparaît à partir de J2 (déterministe)
  AMBIG_CHANCE:0.38,                     // part des réguliers avec une demande ambiguë (à interpréter)
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
// demandes ambiguës (Good Pizza) : le client ne dit pas la quantité, à toi de composer
const AMBIG = [
  { tx:"Faut que je tienne le week-end là…", g:8 },
  { tx:"Un petit truc léger pour ce soir 🙏", g:2 },
  { tx:"On est deux ce soir 👀", g:4 },
  { tx:"Grosse soirée, toute la bande débarque.", g:16 },
];
// profils cramés (Papers Please) : trop polis / gros volume / surpaient sans discuter
const LOUCHE = [
  { nm:"Tête inconnue", av:"🕶️", g:20, tx:"Bonjour. Auriez-vous de la marchandise ? Je souhaiterais 20 g, le prix importe peu." },
  { nm:"Kevin B.",      av:"🧔", g:16, tx:"slt, on se connaît pas. c'est toi qui tiens le spot ? je prends 16 g, peu importe le prix" },
  { nm:"Le trop poli",  av:"👤", g:12, tx:"Bonsoir, on m'a indiqué cet endroit. Il me faudrait 12 g. Quel que soit votre tarif, je paierai." },
];
const REACT = {
  marge: ["Frérot le prix 😍", "À ce prix je ramène tout le tieks !"],
  juste: ["PRIX JUSTE.", "Tu lis dans les pensées."],
  deal:  ["Carré.", "T'es fiable toi.", "Nickel, je repasse."],
  nego:  ["Tu sais vendre, toi…", "Ok ok, t'es un commerçant.", "Ça va, t'as le bagou."],
  gouge: ["Abusé… mais bon, vas-y.", "Tu t'es cru où ? Allez, donne."],
  walk:  ["C'est mort. Je passe ailleurs.", "Tu me reverras pas."],
  lu:    ["C'est EXACTEMENT ça.", "Tu lis dans les pensées toi."],
  mouais:["Mouais, ça fera l'affaire.", "Bon, ok, si tu le dis."],
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

/* Génère la demande d'un client — déterministe (persona/jour/seq). Renvoie un objet avec `mode` :
   - "hesit" : hésitant, à convertir à la main (son habituel paie mieux)
   - "ambig" : demande ambiguë, à interpréter (bien lu = pourboire, sinon vendu quand même)
   - "offer" : offre explicite (qty + prix) → accepter / contrer / refuser */
export function makeOffer(persona, rel, reput, day, seq){
  const kind = persona.kind;
  if(kind==="hesitant") return { mode:"hesit", qty:0, offer:0, usual:persona.usual, tx:pick(TXT.hesitant, day+seq) };
  if(kind==="regulier" && hh(day*7, seq) > 1-CORNER.AMBIG_CHANCE){
    const A = pick(AMBIG, day*2+seq);
    return { mode:"ambig", qty:0, offer:0, expect:A.g, tx:A.tx };
  }
  const qty = kind==="grossiste" ? (16 + (hh(day, seq)>0.6 ? 8 : 0)) : persona.usual;
  const off = CORNER.OFFER[kind] || [0.9, 1.0];
  const m = off[0] + (off.length>1 ? hh(day*5, seq)*(off[1]-off[0]) : 0);
  const offer = Math.max(1, R(qty*cornerFair(reput)*m));
  const tx = pick(TXT[kind]||TXT.regulier, day+seq).replace("{q}", qty).replace("{t}", offer);
  return { mode:"offer", qty, offer, tx };
}

// profil cramé (louche) — il surpaie ×1.3 sans discuter (un indice). Vendre → chaleur ; refuser → discrétion.
export function makeLouche(day, seq, reput){
  const L = pick(LOUCHE, day+seq);
  return { kind:"louche", mode:"louche", nm:L.nm, av:L.av, tx:L.tx, qty:L.g, offer:R(L.g*cornerFair(reput)*1.3) };
}

// grimace à mi-négo (Recettear) : lecture DÉTERMINISTE de la tête du client pendant qu'on règle le prix.
export function negoFace(client, total, reput){
  const g = client.g || client.qty || 0, fair = cornerFair(reput);
  if(client.kind==="louche") return { emo:"😐", tx:"Aucune réaction… bizarre." };
  if(!g || !total) return { emo:"🤨", tx:"Il attend de voir…" };
  const ppu = total/g, tol = cornerTol(client.kind, client.rel, reput), bud = cornerBudget(client.kind, client.rel);
  if(total>bud) return { emo:"😤", tx:"Au-dessus de sa poche." };
  if(ppu>tol) return { emo:"😤", tx:"À ce prix, c'est mort pour lui." };
  if(ppu>tol*0.9) return { emo:"😬", tx:"Il grimace — t'es à la limite." };
  if(ppu<=fair*0.9) return { emo:"😍", tx:"Belle affaire… pour lui." };
  if(ppu<=fair*1.1) return { emo:"😊", tx:"Prix menu, ça lui va." };
  return { emo:"😏", tx:"Il suit… y a de la marge." };
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
