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
  PATIENCE: { anon:22, regulier:26, lowball:30, accro:15, grossiste:40, hesitant:32, louche:30 },
  QUEUE_MELT: 0.8, WAIT_FREEZE_S: 8, WAIT_MELT: 1.6,
  // tolérance €/g : plafond accepté ; l'écart (haut de zone juste ×1.1 → tol) = l'espace de négo
  TOL: { anon:1.12, regulier:1.2, lowball:0.82, accro:1.35, grossiste:0.78, hesitant:1.15, louche:99 },
  TOL_PER_REL: 1/600,
  BUDGET: { anon:55, regulier:70, lowball:110, accro:50, grossiste:260, hesitant:60, louche:999 },
  BUDGET_PER_REL: 1/100,
  OFFER: { anon:[0.95,1.03], regulier:[0.92,1.0], lowball:[0.55,0.62], accro:[1.0,1.05], grossiste:[0.68,0.74] },
  ANON_SHARE: 0.85, // part de PNJ anonymes (la norme : gens qui viennent chercher leur dose) vs personas nommés (rares, le sel)
  REL_DEAL:2, REL_JUSTE:2, REL_PERSO:3, REL_GOUGE:-2, REL_WALK:-2,
  UNLOCK_REL:40, GOUGE_STREAK_QUIT:2,
  HEAT_LOUCHE:20, FLAIR_BONUS:25,
  // traits (étape 3-4) — connaisseur : au-dessus de son exigence il paie plus cher (+ pourboire),
  // loin en dessous il rogne ; l'écart QUAL_MISS = la bande neutre entre les deux
  TIP_QUAL:0.12, QUAL_TOL_UP:1.12, QUAL_TOL_DOWN:0.85, QUAL_MISS:12,
  // ardoise (crédit) : le stock part maintenant, l'argent revient à J+N avec intérêt — jamais d'impayé (R4)
  ARDOISE_RATE:0.25, ARDOISE_DAYS:2, ARDOISE_REL_MIN:25, ARDOISE_CHANCE:0.45,
  LOUCHE_FROM_DAY:2, LOUCHE_CHANCE:0.14, // un profil cramé apparaît à partir de J2 (déterministe)
  AMBIG_CHANCE:0.38,                     // part des réguliers avec une demande ambiguë (à interpréter)
  REP_DEAL:1, REP_JUSTE:1, REP_GOUGE:-2, REP_WALK:-1,
  RES_DEAL:3, RES_WALK:6,    // réservoir clients (satisfaction) : bon deal ↑, client fâché/parti ↓
};

// personas du corner — chacun porte UN axe de décision, un TELL lisible (R4) et sa propre banque
// de répliques (fini le copier-coller). {q}=grammes, {t}=total. bank.react : deal/nego/walk (le reste
// retombe sur REACT). Les têtes connues = le sel ; le volume, ce sont les PNJ anonymes (kind:"anon").
// traits (étape 3-4) — l'axe MÉCANIQUE, affiché sur la carte (R4, jamais caché) :
//   qual   : connaisseur — compare la qualité du tampon à `exig` (voir qualCheck)
//   heat   : le servir chauffe le coin (+N chaleur) — la marge contre la température
//   hours  : fenêtre de passage [début, fin) en heures (fin > 24 = déborde après minuit)
//   credit : peut demander une ardoise (étape 4) — stock maintenant, liquide à J+N (+intérêt)
export const CORNER_PERSONAS = [
  { id:"momo", nm:"Momo", av:"🧢", kind:"regulier", usual:5, exig:55, start:true,
    tell:"Toujours ~5 g au prix menu, jamais un mot sur le tarif.",
    bank:{ arrive:["Cinq grammes, comme hier, comme demain. {t}, ça marche ?","Pas besoin de causer, tu sais ce qu'il me faut. {q} g, {t}.","Toujours toi qui tiens, ça me rassure. Les {q} g habituels."],
      react:{ deal:["Comme d'hab. À demain.","Nickel, tu bouges jamais toi."], nego:["Bon, pour toi ça passe. M'y habitue pas."] } } },
  { id:"ines", nm:"Inès", av:"🎧", kind:"regulier", usual:2, exig:70, start:true, traits:{qual:true},
    tell:"Petite quantité, renifle la came — le propre, elle le paie plus cher.",
    bank:{ arrive:["Deux grammes, mais du propre. Je sens la paraffine à dix mètres.","Fais voir avant. Si c'est chargé je prends pas. {t} ?","Petite quantité, grosse exigence. Tu me connais. {q} g."],
      react:{ deal:["Là c'est du travail. Je reviens."], nego:["Ça passe. Reste propre, hein."] } } },
  { id:"riton", nm:"Riton", av:"🥀", kind:"accro", usual:2, exig:20, start:true,
    tell:"Paie sans regarder le prix, mais file si tu traînes.",
    bank:{ arrive:["Deux grammes, vite. J'ai l'oseille, discute pas. {t}.","Là tout de suite si tu peux. {t}, compte pas.","Je reste pas. Je prends et je disparais. {q} g."],
      react:{ deal:["Merci. Vraiment."], walk:["Laisse tomber, y'en a d'autres."] } } },
  { id:"yaz", nm:"Yaz", av:"🛵", kind:"lowball", usual:8, exig:40, start:true,
    tell:"Ouvre toujours très bas — du théâtre. Tiens ton prix, il plie.",
    bank:{ arrive:["{q} g à {t}. Je sais que c'est bas, commence pas à pleurer.","Partout c'est moins cher. {t}, sinon je bouge.","Allez, fais un effort. {t} et on n'en parle plus."],
      react:{ deal:["Radin toi aussi. Ça me va, à demain."], nego:["Ouais bon. T'as gagné cette fois."], walk:["Trop cher. …Garde-moi ça pour demain quand même."] } } },
  { id:"sofia", nm:"Sofia", av:"💅", kind:"hesitant", usual:5, exig:65, start:true,
    tell:"Ne dit jamais la quantité — la réponse est dans sa phrase.",
    bank:{ arrive:["Alors… c'est pour ce soir, on sera trois ou quatre, je sais pas trop.","J'hésite. Genre pas trop mais faut que ça tienne.","Tu me conseilles quoi ? J'y connais rien moi."], react:{} } },
  { id:"bilal", nm:"Bilal", av:"🎒", kind:"regulier", usual:8, exig:50, start:true,
    tell:"Toujours 8 g, et « tu me fais un prix si je reviens ? » — futur gros.",
    bank:{ arrive:["Huit grammes. Tu me fais un prix si je reviens chaque semaine ?","Je refourgue à ma bande, faut que je m'y retrouve. {t} ?","Si tu m'accroches maintenant, je te ramène du monde. {q} g, {t}."],
      react:{ deal:["Là on se comprend. Je te ramène la clientèle."], nego:["Bon, ça passe pour cette fois. On verra la prochaine."] } } },
  { id:"diego", nm:"Diego", av:"🏗️", kind:"grossiste", usual:16, exig:45, unlockedBy:"momo", traits:{heat:6, hours:[9,19]},
    tell:"Passe en journée, prend gros, paie clean — mais le servir chauffe le coin.",
    bank:{ arrive:["Seize grammes d'un coup. Chaque semaine si t'assures. {t} ?","Je prends gros, je paie clean, mais je traîne pas. {q} g, {t}.","Vingt grammes. Emballe vite, on nous regarde."],
      react:{ deal:["Carré. Même heure la semaine prochaine."], nego:["Ça monte, mais le volume est là. Vendu."] } } },
  { id:"lina", nm:"Lina", av:"🌙", kind:"regulier", usual:5, exig:80, unlockedBy:"ines", traits:{qual:true, hours:[21,28]},
    tell:"Ne passe que la nuit — exigeante, mais le travail propre, elle le paie très bien.",
    bank:{ arrive:["Tard, discret, comme j'aime. Tu me sers sans bruit ? {q} g, {t}.","Cinq grammes. Je paie bien ceux qui la ramènent pas.","Quelque chose de propre pour finir la nuit. {t}."],
      react:{ deal:["Merci d'avoir fait vite. Le quartier dort, gardons ça."], nego:["Ça me va. Discrètement."] } } },
  { id:"nassim", nm:"Nassim", av:"🎲", kind:"accro", usual:8, exig:25, unlockedBy:"riton", traits:{credit:true, hours:[19,26]},
    tell:"Rôde le soir. Les bons jours il claque plein pot ; à sec, il tape l'ardoise — il règle toujours.",
    bank:{ arrive:["Ce soir je claque ! Mets-m'en {q}, je paie rubis sur l'ongle. {t}.","Frérot, j'ai la niaque ce soir. {q} g, {t} cash.","Allez, {q} g, je régale. {t}."],
      react:{ deal:["Voilà voilà ! Ça c'est une soirée."], nego:["Ok ok, t'es dur mais j'aime ça."] } } },
  { id:"kenza", nm:"Kenza", av:"👟", kind:"lowball", usual:5, exig:35, unlockedBy:"yaz", traits:{heat:4},
    tell:"Jamais seule — sa bande fait du bruit (ça chauffe), mais le panier grimpe.",
    bank:{ arrive:["On est cinq, calcule pour tout le monde. Mais fais un prix. {t} ?","Jamais seule moi. La bande attend au coin, magne. {q} g.","Gros panier, petit prix, c'est ma came. {q} g pour {t} ?"],
      react:{ deal:["Vu le monde, t'es gagnant. À demain."], nego:["Ok va pour ça. Je te ramène la troupe."] } } },
  { id:"lea", nm:"Léa", av:"🎀", kind:"hesitant", usual:2, exig:60, unlockedBy:"sofia",
    tell:"Hésite parce qu'elle débute — un petit sans pression et elle revient.",
    bank:{ arrive:["C'est… la première fois que j'achète direct. Je sais pas comment on fait.","Un petit, le plus petit. J'ai un peu peur en fait.","On m'a dit de venir te voir, que t'étais réglo."], react:{} } },
];
export const CORNER_TAG = { anon:"PASSANT", regulier:"CLIENT", lowball:"RADIN", accro:"ACCRO", grossiste:"GROS", hesitant:"HESIT", louche:"INCONNU" };
// PNJ anonyme (le volume) : vient chercher sa dose, sans plus. Réplique minimale, pas de relation.
const ANON = ["Vas-y, file-moi {q} g. {t} ?","La même que d'hab, {q} g.","T'as de quoi ? {q} g, {t}.","Juste un p'tit truc, {q} g.","{q} g et je file. {t}.","Yo. {q} g steuplé."];
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
// profils louches (Papers Please) — GRADIENT lisible : le tell fait la différence, pas la politesse.
// cop:true = vrai infiltré (te sonde sur ta source/équipe → vendre = +chaleur, refuser = +discrétion).
// cop:false = pigeon légitime (a l'air louche mais cite un contact / ne demande rien → vente grasse, refuser = juste une vente perdue, R1).
const LOUCHE = [
  { nm:"Tête inconnue", av:"🕶️", g:20, cop:true,  tell:"Surpaie ET veut savoir d'où vient la came.",
    tx:"Bonsoir. On m'a parlé de vous. Vous fournissez en quelle quantité, d'habitude ?" },
  { nm:"L'envoyé de Momo", av:"👤", g:20, cop:false, tell:"Poli et surpaie, MAIS cite un contact que tu connais.",
    tx:"Excusez-moi… c'est Momo qui m'envoie. Il a dit que t'étais réglo. Vingt grammes ?" },
  { nm:"Le bourge perdu", av:"🧑‍💼", g:12, cop:false, tell:"Nerveux mais civil — ne pose aucune question sur toi.",
    tx:"Bon-bonsoir, je fais ça rarement. Le prix m'importe peu, je veux juste que ce soit propre." },
  { nm:"Kevin B.", av:"🧔", g:16, cop:true, tell:"Te tutoie mal, veut savoir avec qui tu bosses.",
    tx:"slt, on se connaît pas. c'est toi qui tiens le spot ? tu tournes avec qui ?" },
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
// tolérance €/g : base = TON menu affiché (prix) — le client négocie autour de ton prix, pas du marché.
// (le marché, lui, pilote la DEMANDE : combien de clients passent.) base peut être le prix joueur ou, à défaut, le marché.
export function cornerTol(kind, rel, base){ return base*(CORNER.TOL[kind] + (rel||0)*CORNER.TOL_PER_REL); }
export function cornerBudget(kind, rel){ return CORNER.BUDGET[kind]*(1 + (rel||0)*CORNER.BUDGET_PER_REL); }

// qualité d'une offre vs TON menu (l'info centrale : l'écart % au menu que TU affiches)
export function offerQual(ppu, reput, prix){
  const menu = prix || cornerFair(reput);
  const r=ppu/menu, pct=R((r-1)*100);
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

/* ---- traits (étape 3-4) : heures de passage, connaisseur, ardoise, graphe social ---- */
// fenêtre de passage : sans traits.hours le persona passe à toute heure ; fin > 24 = déborde après minuit
export function inHours(p, h){
  const w=p.traits&&p.traits.hours; if(!w) return true;
  h=((h%24)+24)%24;
  return w[1]<=24 ? (h>=w[0]&&h<w[1]) : (h>=w[0]||h<w[1]-24);
}
export function hoursLabel(p){
  const w=p.traits&&p.traits.hours; if(!w) return null;
  const f=x=>Math.round(x%24)+"h"; return f(w[0])+"–"+f(w[1]);
}
// connaisseur : compare la qualité du tampon (q) à son exigence — 3 bandes lisibles (R4).
// ok → tolérance ×QUAL_TOL_UP + pourboire ; raté large (q < exig−QUAL_MISS) → il rogne (×QUAL_TOL_DOWN).
export function qualCheck(p, q){
  if(!(p.traits&&p.traits.qual)) return null;
  const exig=p.exig||60;
  if(q>=exig) return { ok:true, miss:false, exig, q, fac:CORNER.QUAL_TOL_UP };
  if(q<exig-CORNER.QUAL_MISS) return { ok:false, miss:true, exig, q, fac:CORNER.QUAL_TOL_DOWN };
  return { ok:false, miss:false, exig, q, fac:1 };
}
// ardoise (étape 4) : certains soirs le client à crédit est à sec — déterministe (jour/seq), gated par la relation
export function wantsArdoise(p, rel, day, seq){
  return !!(p.traits&&p.traits.credit) && (rel||0)>=CORNER.ARDOISE_REL_MIN && hh(day*17, seq)<CORNER.ARDOISE_CHANCE;
}
const ARDOISE_TX=[
  "Frérot… ce soir je suis à sec. Mets-m'en {q} g, je te règle {t} à {d}, parole.",
  "Me regarde pas comme ça — la paie tombe {d}. {q} g sur l'ardoise, je rajoute pour la peine.",
  "T'inquiète, j'ai jamais planté personne. {q} g, et {d} t'as {t} cash.",
];
export function makeArdoise(p, rel, reput, day, seq, prix){
  const menu=prix||cornerFair(reput), qty=p.usual;
  // plafonné par sa poche (comme toute vente : budget = borne absolue) — sinon monter le menu
  // juste avant d'accepter gonflait le crédit sans limite ; l'intérêt s'applique aussi au plafond
  const cap=R(cornerBudget(p.kind, rel)*(1+CORNER.ARDOISE_RATE));
  const due=Math.max(1, Math.min(R(qty*menu*(1+CORNER.ARDOISE_RATE)), cap)), payday=day+CORNER.ARDOISE_DAYS;
  const tx=pick(ARDOISE_TX, day+seq).replace("{q}", qty).replace("{d}", "J"+payday).replace("{t}", due);
  return { mode:"ardoise", qty, due, payday, tx, tell:p.tell||"" };
}
// graphe social : la relation avec le parrain (unlockedBy) débloque le filleul — renvoie les nouveaux contacts
export function checkUnlocks(clients){
  const news=[];
  for(const p of CORNER_PERSONAS){
    if(!p.unlockedBy) continue;
    const c=clients[p.id]; if(!c||c.unlocked||c.quit) continue;
    const by=clients[p.unlockedBy];
    if(by&&by.rel>=CORNER.UNLOCK_REL){ c.unlocked=true; news.push({ p, by:personaById(p.unlockedBy) }); }
  }
  return news;
}

/* Génère la demande d'un client — déterministe (persona/jour/seq). Renvoie un objet avec `mode` :
   - "hesit" : hésitant, à convertir à la main (son habituel paie mieux)
   - "ambig" : demande ambiguë, à interpréter (bien lu = pourboire, sinon vendu quand même)
   - "offer" : offre explicite (qty + prix) → accepter / contrer / refuser */
const pickBank = (persona, i) => { const a=persona.bank&&persona.bank.arrive; return a&&a.length?pick(a,i):null; };
export function makeOffer(persona, rel, reput, day, seq, prix){
  const kind = persona.kind, menu = prix || cornerFair(reput), tell = persona.tell || "";
  if(kind==="hesitant") return { mode:"hesit", qty:0, offer:0, usual:persona.usual, tell, tx:pickBank(persona, day+seq) || pick(TXT.hesitant, day+seq) };
  if(kind==="regulier" && hh(day*7, seq) > 1-CORNER.AMBIG_CHANCE){
    const A = pick(AMBIG, day*2+seq);
    return { mode:"ambig", qty:0, offer:0, expect:A.g, tell, tx:A.tx };
  }
  const qty = kind==="grossiste" ? (16 + (hh(day, seq)>0.6 ? 8 : 0)) : persona.usual;
  const off = CORNER.OFFER[kind] || [0.9, 1.0];
  const m = off[0] + (off.length>1 ? hh(day*5, seq)*(off[1]-off[0]) : 0);
  // le client ouvre relatif à TON prix affiché (il négocie à partir de ton menu), plafonné plus loin par son budget
  const offer = Math.max(1, R(qty*menu*m));
  const tx = (pickBank(persona, day+seq) || pick(TXT[kind]||TXT.regulier, day+seq)).replace("{q}", qty).replace("{t}", offer);
  return { mode:"offer", qty, offer, tell, tx };
}

// PNJ anonyme (le volume) : petite dose, ouvre proche du menu, accepte vite. Ni relation ni tell.
export function makeAnon(day, seq, reput, prix){
  const menu = prix || cornerFair(reput);
  const qty = [2,2,3,5,2][((day+seq)%5+5)%5];            // petites doses déterministes
  const off = CORNER.OFFER.anon, m = off[0] + hh(day*5, seq)*(off[1]-off[0]);
  const offer = Math.max(1, R(qty*menu*m));
  const tx = pick(ANON, day+seq).replace("{q}", qty).replace("{t}", offer);
  return { kind:"anon", mode:"offer", qty, offer, tx, tell:"" };
}

// profil louche — surpaie ×1.3 (un indice). cop:true = infiltré (vendre → chaleur) ; cop:false = pigeon (vente grasse).
export function makeLouche(day, seq, reput, prix){
  const L = pick(LOUCHE, day+seq), menu = prix || cornerFair(reput);
  return { kind:"louche", mode:"louche", nm:L.nm, av:L.av, tx:L.tx, tell:L.tell, cop:L.cop, qty:L.g, offer:R(L.g*menu*1.3) };
}

// grimace à mi-négo (Recettear) : lecture DÉTERMINISTE de la tête du client pendant qu'on règle le prix.
// bande de prix = TON menu (prix) ; plafonds tol/budget = marché (garde-fou).
export function negoFace(client, total, reput, prix){
  const g = client.g || client.qty || 0, menu = prix || cornerFair(reput);
  if(client.kind==="louche") return { emo:"😐", tx:"Aucune réaction… bizarre." };
  if(!g || !total) return { emo:"🤨", tx:"Il attend de voir…" };
  // connaisseur (traits.qual) : sa tolérance suit la qualité reniflée au spawn (qFac)
  const ppu = total/g, tol = cornerTol(client.kind, client.rel, menu)*(client.qFac||1), bud = cornerBudget(client.kind, client.rel);
  if(total>bud) return { emo:"😤", tx:"Au-dessus de sa poche." };
  if(ppu>tol) return { emo:"😤", tx:"À ce prix, c'est mort pour lui." };
  if(ppu>tol*0.9) return { emo:"😬", tx:"Il grimace — t'es à la limite." };
  if(ppu<=menu*0.9) return { emo:"😍", tx:"Belle affaire… pour lui." };
  if(ppu<=menu*1.1) return { emo:"😊", tx:"Prix menu, ça lui va." };
  return { emo:"😏", tx:"Il suit… y a de la marge." };
}

export function reactLine(outcome, i, persona){
  const b = persona && persona.bank && persona.bank.react && persona.bank.react[outcome];
  if(b && b.length) return pick(b, i);
  return pick(REACT[outcome]||REACT.deal, i);
}

/* Cœur du système : résout une offre (g grammes, total €) — DÉTERMINISTE.
   Renvoie un VERDICT ; le caller applique les deltas (rel/reput/heat/res), débite le tampon,
   remplit le bac. `firstTry` = 1re résolution (pour le bonus JUSTE) ; `isClientOffer` = on
   accepte l'offre du client (vs on a réglé un prix). */
export function resolveOffer(client, g, total, firstTry, isClientOffer, reput, prix){
  const fair = prix || cornerFair(reput), ppu = total/g; // bande/marge/tolérance = TON menu affiché
  // connaisseur (traits.qual) : qFac (lu au spawn) élargit ou rogne la tolérance — le budget reste sa poche absolue
  const tol = cornerTol(client.kind, client.rel, fair)*(client.qFac||1), bud = cornerBudget(client.kind, client.rel);
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
    // floor (pas round) : son « dernier prix » doit TOUJOURS passer son propre test d'acceptation (R4) —
    // avec qFac 0.85 un arrondi au-dessus de tol faisait refuser au client le prix qu'il venait d'annoncer
    const t2 = Math.max(1, Math.min(Math.floor(g*tol*0.97), Math.floor(bud)));
    return { outcome:"counter", accepted:false, counterTotal:t2 }; // son « dernier prix »
  }
  return { outcome:"walk", accepted:false, emo:"🤬", rel:CORNER.REL_WALK, reput:CORNER.REP_WALK, res:-CORNER.RES_WALK };
}
