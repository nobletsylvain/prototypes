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
  // marché du jour (concurrence) : facteur déterministe par jour — une météo ANNONCÉE (R4), pas un bruit.
  // Neutre avant J3 (démarrage propre) ; au-delà des seuils HI/LO, une « news » explique le mouvement.
  MARCHE_MIN:0.8, MARCHE_MAX:1.3, MARCHE_HI:1.18, MARCHE_LO:0.9, MARCHE_FROM_DAY:3,
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
  /* Diego ne vient PLUS au corner (arbitrage Sylvain, 2026-07-26) : un grossiste ne fait
     pas la queue au pied de la barre — il écrit, et il se fait livrer. `canal:"dm"` le
     retire du tirage de la rue tout en le gardant dans CORNER_PERSONAS : il garde son
     visage, ses répliques et ses deux portes de déblocage (relation avec Momo OU rumeur
     de calibre), qui servent maintenant à faire sonner le téléphone.
     Ses `hours` disparaissent — un DM n'a pas d'heure de passage — et son `traits.heat`
     aussi : la cause rendue était « le COIN chauffe », ce qui n'a plus de sens pour un
     deal livré. Le coût du gros passe désormais par la livraison et par le liquide
     qui dort. `TOL`/`BUDGET`/`OFFER.grossiste` restent définis, mais ATTENTION : ils ne
     bornent RIEN aujourd'hui. Le canal DM ne lit de ce module que `menuAt`,
     `personaById`, `rueCalibre` et `RUE_MIN` — jamais `BUDGET` ni `TOL`. Le prix du gros
     sort donc du barème volume commun (`menuAt`), comme tous les autres canaux, et sa
     poche de 260 est un vestige de l'époque où il faisait la queue au corner.
     On les garde pour que la persona reste bien formée et pour qu'un futur canal
     puisse s'en servir — pas parce qu'ils agissent. */
  { id:"diego", nm:"Diego", av:"🏗️", kind:"grossiste", usual:16, exig:45, unlockedBy:"momo", rueGate:5, canal:"dm",
    tell:"Ne traîne pas dans la rue : il écrit, il paie clean, il se fait livrer.",
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

/* ---- marché dynamique : la concurrence fait bouger la référence, ton prix module la demande RELATIVE ----
   Le marché ne pilote QUE la demande (combien de clients passent) ; la négo reste calée sur TON menu. */
export function marketFac(day){
  if((day||1)<CORNER.MARCHE_FROM_DAY) return 1; // les premiers jours, marché calme (démarrage sans parasite)
  return CORNER.MARCHE_MIN + hh(day*31, 17)*(CORNER.MARCHE_MAX-CORNER.MARCHE_MIN);
}
export function marketPrice(reput, day){ return Math.max(3, R(cornerFair(reput)*marketFac(day))); }
const MARCHE_HI_TX=[
  "🚨 Descente chez un gros — la rue est en manque, le marché flambe.",
  "📈 Week-end de paie — tout le quartier cherche, les prix montent.",
  "🔥 Un corner rival s'est fait ratisser — sa clientèle cherche un plan.",
];
const MARCHE_LO_TX=[
  "📦 Gros arrivage chez la concurrence — ils cassent les prix.",
  "🪓 Guerre des prix entre corners — le marché brade.",
  "🧊 Semaine morte, tout le monde liquide — les prix plongent.",
];
export function marketNews(day){
  const f=marketFac(day);
  if(f>=CORNER.MARCHE_HI) return { dir:1, tx:pick(MARCHE_HI_TX, day) };
  if(f<=CORNER.MARCHE_LO) return { dir:-1, tx:pick(MARCHE_LO_TX, day) };
  return null;
}
// tolérance €/g : base = TON menu affiché (prix) — le client négocie autour de ton prix, pas du marché.
// (le marché, lui, pilote la DEMANDE : combien de clients passent.) base peut être le prix joueur ou, à défaut, le marché.
export function cornerTol(kind, rel, base){ return base*(CORNER.TOL[kind] + (rel||0)*CORNER.TOL_PER_REL); }

/* ---- La qualité achète de la TOLÉRANCE, jamais du prix (arbitrage Sylvain, 2026-07-25) ----
   Le menu (`cornerFair`) reste fonction de la réput seule : du bon produit ne fait pas
   monter ton tarif affiché, il fait accepter ton tarif plus largement. C'est ce qui
   donne enfin une surface de gain au levier de coupe (R10) sans ajouter un
   multiplicateur de prix de plus.

   UP-ONLY par construction, et ce n'est pas un détail de tuning : `offerCap` calcule
   min(budget, qty × tol). Élargir `tol` ne peut donc qu'AUGMENTER le plafond que le
   client s'impose — l'invariant « une offre spontanée passe toujours son propre test »
   tient sans une ligne de plus. Un facteur descendant, lui, le casserait
   (cf. le bug Nassim/Bilal documenté au-dessus de `offerCap`).

   En dessous de QUAL_REF : facteur 1. Pas de bonus, mais AUCUN malus — un produit
   médiocre se vend normalement, il ne se vend simplement pas mieux (R1). */
/* QUAL_REF doit rester SOUS le pire produit que le joueur puisse poser sur la table,
   sinon le premier barreau de l'escalier ne montre rien : le pain de départ est à q52
   et la lame pourrie le ramène à 43 (52 × 0,82). Avec une référence à 55, monter le
   couteau de 0 à 4 laissait le facteur à 1,00 — l'outil que le joueur peut s'offrir en
   PREMIER (250 €) n'aurait eu aucun effet visible, et sa promesse aurait sonné faux.
   [PLACEHOLDERS — les deux valeurs attendent le tuning humain] */
export const QUAL_REF = 40;       // plancher : en dessous, facteur 1 (jamais de malus)
export const QUAL_TOL_MAX = 1.35; // tolérance à q100

/* ---- Le rabais au volume : la portion généreuse coûte moins cher au gramme ----
   Arbitrage Sylvain (2026-07-25) : « le prix au gramme d'un 8 g doit être plus
   attractif que celui pour un 2 g ».

   La FORME compte autant que la courbe. Un rabais exprimé comme un facteur sur la
   tolérance (`qFac < 1`) rognerait le plafond que le client s'impose APRÈS avoir
   annoncé son offre — c'est le bug Nassim/Bilal, et nos propres invariants
   l'interdisent explicitement. Ici c'est un MENU PAR FORMAT : on baisse la
   référence de prix elle-même. Comme `cornerTol(kind, rel, base)` prend cette
   référence en entrée, le plafond et l'offre bougent ENSEMBLE — la classe de bugs
   entière est évitée par construction, pas par tuning.

   Contrepartie systémique (R9) : le gros panier rapporte moins au gramme, mais la
   soirée est plafonnée par la CHALEUR, qui est un impôt sur les secondes
   d'ouverture — pas sur les grammes ni sur le nombre de ventes. Écouler 200 g en
   paniers de 2 g accumule 422 de chaleur (descente garantie, seuil 95) ; en paniers
   de 12 g, 70. Le rabais est le prix de la discrétion.
   [PLACEHOLDER — la courbe attend le tuning humain] */
export const RABAIS_FORMAT = [[2, 1.00], [5, 0.92], [8, 0.85], [12, 0.80], [20, 0.75]];
/** Référence de prix pour une portion donnée : décroissante, bornée aux deux bouts. */
export function rabaisVolume(qty){
  const q = Math.max(0, qty || 0);
  const F = RABAIS_FORMAT;
  if(q <= F[0][0]) return F[0][1];
  if(q >= F[F.length-1][0]) return F[F.length-1][1];
  for(let i = 1; i < F.length; i++){
    if(q <= F[i][0]){
      const [g0, f0] = F[i-1], [g1, f1] = F[i];
      return f0 + (f1 - f0) * (q - g0) / (g1 - g0);   // interpolation linéaire entre paliers
    }
  }
  return F[F.length-1][1];
}
/** LE point d'entrée du prix : toute formule €/g passe par ici quand la quantité est connue. */
export function menuAt(menu, qty){ return (menu || 0) * rabaisVolume(qty); }
export function qualFac(q){
  const x = (Math.max(QUAL_REF, Math.min(100, q || 0)) - QUAL_REF) / (100 - QUAL_REF);
  return 1 + x * (QUAL_TOL_MAX - 1);
}

/* Plafond que le client s'impose À LUI-MÊME : sa poche ET sa tolérance au €/g.
   Une offre spontanée doit TOUJOURS passer son propre test d'acceptation —
   sinon accepter le montant qu'il vient d'annoncer le fait partir furieux, avec
   malus, sans le moindre avertissement à l'écran (R1 ET R4 violés d'un coup).
   Mesuré avant correctif : Nassim (accro, 8 g, budget 50) partait fâché dans
   100 % de ses visites, Bilal (regulier, 8 g, budget 70) dans 42 %. */
export function offerCap(kind, rel, base, qty, qFac){
  const tol = cornerTol(kind, rel, base) * (qFac || 1);
  return Math.max(1, Math.floor(Math.min(cornerBudget(kind, rel), qty * tol)));
}
export function cornerBudget(kind, rel){ return CORNER.BUDGET[kind]*(1 + (rel||0)*CORNER.BUDGET_PER_REL); }

// qualité d'une offre vs TON menu (l'info centrale : l'écart % au menu que TU affiches)
/* L'écart au menu DE SA PORTION, pas au menu brut. Depuis le rabais au volume,
   comparer à la référence pleine faisait afficher « −15 % menu » à quelqu'un qui
   vend 8 g au tarif exact du 8 g. Sans réglage de quantité c'était cosmétique ;
   avec, c'est le message principal de la carte, et il mentirait au joueur sur le
   sens même de son geste. */
export function offerQual(ppu, reput, prix, qty){
  const menu = menuAt(prix || cornerFair(reput), qty==null ? 0 : qty);
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
  const menu=prix||cornerFair(reput), qty=p.usual, ref=menuAt(menu, qty); // même barème que le comptant
  // plafonné par sa poche (comme toute vente : budget = borne absolue) — sinon monter le menu
  // juste avant d'accepter gonflait le crédit sans limite ; l'intérêt s'applique aussi au plafond
  const cap=R(cornerBudget(p.kind, rel)*(1+CORNER.ARDOISE_RATE));
  const due=Math.max(1, Math.min(R(qty*ref*(1+CORNER.ARDOISE_RATE)), cap)), payday=day+CORNER.ARDOISE_DAYS;
  const tx=pick(ARDOISE_TX, day+seq).replace("{q}", qty).replace("{d}", "J"+payday).replace("{t}", due);
  return { mode:"ardoise", qty, due, payday, tx, tell:p.tell||"" };
}
/* Graphe social : la relation avec le parrain (unlockedBy) débloque le filleul.
   DEUXIÈME PORTE (2026-07-25) : le bouche-à-oreille de calibre. Un grossiste ne se
   présente pas parce que tu t'entends bien avec quelqu'un — il vient parce qu'on lui
   a dit que tu sers du volume. `rueGate` est donc une porte parallèle, jamais une
   condition supplémentaire : les deux chemins ouvrent, aucun ne ferme (R1).

   `rueMax` = le plus gros calibre que tu aies jamais sorti. C'est bien lui et pas la
   moyenne : un grossiste entend « il sort du 8 », pas « sa moyenne pondérée est à
   6,3 ». Le premier geste suffit à faire courir le bruit. */
export function checkUnlocks(clients, rueMax){
  const news=[];
  for(const p of CORNER_PERSONAS){
    if(!p.unlockedBy && !p.rueGate) continue;
    const c=clients[p.id]; if(!c||c.unlocked||c.quit) continue;
    const by=p.unlockedBy?clients[p.unlockedBy]:null;
    const parRelation = by && by.rel>=CORNER.UNLOCK_REL;
    const parRumeur = p.rueGate && (rueMax||RUE_MIN) >= p.rueGate;
    if(parRelation || parRumeur){
      c.unlocked=true;
      news.push({ p, by:parRelation?personaById(p.unlockedBy):null, rue:!parRelation });
    }
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
  // le client ouvre relatif à TON prix affiché POUR SA PORTION (rabais volume),
  // borné par ce qu'il peut réellement payer et accepter (offerCap, même référence)
  const ref = menuAt(menu, qty);
  const offer = Math.min(Math.max(1, R(qty*ref*m)), offerCap(kind, rel, ref, qty));
  const tx = (pickBank(persona, day+seq) || pick(TXT[kind]||TXT.regulier, day+seq)).replace("{q}", qty).replace("{t}", offer);
  return { mode:"offer", qty, offer, tell, tx };
}

/* ---- Le bouche-à-oreille : la rue t'envoie les clients que tu mérites ----
   Arbitrage Sylvain (2026-07-25) : « ça serait légitime de penser que le bouche à
   oreille puisse faire changer le type de clientèle ». Le signal est CE QUE TU
   COUPES (`S.rue`, moyenne du calibre débité) — pas ce que tu vends, et c'est
   délibéré : sur « ce que tu vends », le système se bloquerait en rond (pas de gros
   clients tant que tu n'as pas vendu gros, pas de vente gros tant qu'il n'y a pas de
   gros clients), et chaque barrette coupée trop gros serait du stock mort. Mesuré :
   à 25 % du tampon coupé en 8 g, 10 barrettes sur 40 dorment et ne repartent jamais.

   Sur « ce que tu coupes », la demande arrive AVEC la marchandise. Et le quartier ne
   disparaît jamais : la part de gros paniers plafonne, les petites doses restent le
   fond du trafic (R1 — on n'enlève rien, on ajoute). */
export const RUE_MIN = 2;         // le calibre de départ : personne ne te connaît encore
export const RUE_PART_MAX = 0.55; // [PLACEHOLDER] part maximale de gros paniers chez les anonymes
export const RUE_PENTE = 12;      // [PLACEHOLDER] à quelle vitesse la rumeur convertit le trafic
export const RUE_INERTIE = 0.08;  // [PLACEHOLDER] vitesse à laquelle la rue apprend ton calibre

/* La formule d'apprentissage vit ICI et nulle part ailleurs.
   Elle était recopiée dans `applyCut` ET dans les invariants (« même valeur que
   index.html ») : changer la règle d'un côté laissait les tests vérifier l'ancienne
   et passer au vert. Un test qui recopie ce qu'il teste ne teste rien. */
export function rueApres(rue, take){
  const r = Math.max(RUE_MIN, rue || RUE_MIN);
  return Math.max(RUE_MIN, r + (take - r) * RUE_INERTIE * Math.min(1, take / 8));
}

/** Part d'anonymes qui viennent pour du volume, vu ta réputation de calibre. */
export function ruePartGros(rue){
  return Math.max(0, Math.min(RUE_PART_MAX, ((rue || RUE_MIN) - RUE_MIN) / RUE_PENTE));
}
/* La rumeur porte un calibre NOMMÉ, pas une moyenne flottante : on ne dit pas « il
   vend du 6,8 », on dit « il vend du 8 ». Ce n'est pas cosmétique, c'est ce qui
   rend le système jouable — `qtyToSachets` ne casse pas une barrette, donc une
   demande de 7 g face à un tampon de 8 g ne se sert PAS. Mesuré sans l'accrochage :
   couper à 8 g amenait des paniers de 7 g, soit 0 % de servable. La demande tombait
   systématiquement un cran sous l'offre — le pire cas possible. */
export const RUE_PALIERS = [2, 5, 8, 12, 20]; // mêmes crans que CUT_CAPS : ce que la rue sait nommer
/** Le palier nommé le plus proche d'une taille de coupe. */
export function rueCalibre(rue){
  const r = Math.max(RUE_MIN, rue || RUE_MIN);
  return RUE_PALIERS.reduce((a, b) => Math.abs(b - r) < Math.abs(a - r) ? b : a);
}

/* Le calibre s'annonce à la PREMIÈRE coupe, la part se gagne à la longue.
   (Arbitrage Sylvain : « la demande de morceaux plus gros pourrait se déclencher au
   moment où le joueur coupe le morceau de taille la première fois. »)

   Ce n'est pas qu'une question de lisibilité, ça règle le décalage offre/demande.
   Avec la seule moyenne à inertie, il fallait débiter une trentaine de barrettes de
   8 g AVANT que la rue s'en aperçoive — donc trente barrettes invendables en
   attendant que la demande rattrape. En ouvrant la porte au premier geste, l'offre
   et la demande partent ENSEMBLE.

   Deux signaux distincts, et c'est délibéré :
   - `rueMax` (le plus gros calibre jamais coupé) dit CE QU'ON DEMANDE — immédiat ;
   - `rue` (moyenne à inertie) dit COMBIEN en demandent — progressif.
   Sinon une seule barrette de 8 g convertirait 46 % du trafic du jour au lendemain
   et assècherait la clientèle de petites doses (R1 : on n'enlève rien). */
export function anonQty(day, seq, rue, rueMax){
  const base = [2,2,3,5,2][((day+seq)%5+5)%5];           // le quartier, immuable
  const r = Math.max(RUE_MIN, rue || RUE_MIN);
  const gros = rueCalibre(Math.max(RUE_MIN, rueMax || r));
  if(gros <= RUE_MIN) return base;
  return hh(day*13, seq) < ruePartGros(r) ? Math.max(base, gros) : base;
}

// PNJ anonyme (le volume) : petite dose, ouvre proche du menu, accepte vite. Ni relation ni tell.
/* ── Les visages du quartier ──────────────────────────────────────────────
   Arbitrage de Sylvain (2026-07-28) : les anonymes doivent avoir des TÊTES RÉCURRENTES.
   Il veut un quartier peuplé, pas des statistiques — et il a raison : 85 % du trafic
   défilait sans qu'aucun de ces gens n'existe deux fois.

   Ce qu'un visage EST : quelqu'un qu'on reconnaît. Il revient, on se souvient de ce qu'il
   demande, on sait combien de fois on l'a laissé repartir les mains vides.
   Ce qu'un visage N'EST PAS : un persona. Pas d'ardoise, pas d'exigence de qualité, pas de
   graphe social, pas de relation qui monte. Les personas nommés restent la RÉCOMPENSE du
   bouche-à-oreille ; si un passant pouvait devenir aussi intéressant qu'eux, débloquer
   Lina ou Nassim ne voudrait plus rien dire. La frontière est nette et tient à une chose :
   un visage n'a pas de `cid`, donc `applyDeltas` continue de sauter sa branche persona.

   L'identité est DÉTERMINISTE (R4) : elle sort du même hash que le reste de la
   présentation, donc même seed = mêmes visages, dans le même ordre.

   Pourquoi 24 et pas 12 : à ~19 anonymes par soirée, une réserve de 12 ferait revenir
   chaque tête 1,6 fois par SOIRÉE — ce n'est pas un habitué, c'est un figurant en boucle.
   À 24, on croise la même tête une soirée sur deux environ : assez pour la reconnaître,
   assez rare pour que ça compte. */
/* AUCUN nom ne doit coïncider avec un persona ni avec Karim ou Tata Yamina — la première
   version reprenait `PDV_NAMES`, écrit avant que les personas comptent, et le Karnet
   affichait « Riton » à la fois dans « Tes connaissances » et dans « Les têtes du
   quartier ». Vu sur une capture, pas déduit : deux fois la même personne à l'écran, dans
   les deux blocs qu'on venait justement de séparer.
   Un invariant tient cette contrainte, parce que la prochaine tête ajoutée retombera dans
   le piège autrement. */
export const VISAGES = [
  { nm:"Sami",   av:"🎒" }, { nm:"Lou",    av:"👟" }, { nm:"Aya",    av:"🌙" }, { nm:"Zoé",    av:"🎀" },
  { nm:"Paul",   av:"👤" }, { nm:"Djibril",av:"🧣" }, { nm:"Naïma",  av:"🕶️" }, { nm:"Ryan",   av:"🎸" },
  { nm:"Fatou",  av:"🧶" }, { nm:"Théo",   av:"🛹" }, { nm:"Mila",   av:"📻" }, { nm:"Ousmane",av:"🥊" },
  { nm:"Jade",   av:"🪩" }, { nm:"Kevin",  av:"🚬" }, { nm:"Assia",  av:"🧵" }, { nm:"Bruno",  av:"⚙️" },
  { nm:"Manon",  av:"🎤" }, { nm:"Farid",  av:"🧤" }, { nm:"Soraya", av:"📿" }, { nm:"Enzo",   av:"🕹️" },
  { nm:"Awa",    av:"🪶" }, { nm:"Rachid", av:"🔧" }, { nm:"Chloé",  av:"🧃" }, { nm:"Malik",  av:"🎩" },
];
/** Le visage croisé à (jour, rang). Déterministe : même seed, même tête au même moment. */
export function visageDe(day, seq){
  const i = Math.floor(hh(day*29+7, seq*3+1) * VISAGES.length) % VISAGES.length;
  return { vid: i, ...VISAGES[i] };
}
/** Ce qu'on dit d'une tête déjà croisée. Rien avant la 2e fois : reconnaître quelqu'un
    qu'on voit pour la première fois serait un mensonge, et le jeu n'en fait pas. */
export function visageTell(v){
  if(!v || (v.vu||0) < 2) return "";
  const fmts = Object.entries(v.g||{}).sort((a,b)=>b[1]-a[1]);
  const habitue = fmts.length ? `${fmts[0][0]} g d'habitude` : "";
  const rate = (v.bredouille||0) > 0 ? ` · reparti bredouille ${v.bredouille}×` : "";
  return `Déjà vu ${v.vu}×${habitue?" · "+habitue:""}${rate}`;
}

export function makeAnon(day, seq, reput, prix, rue, rueMax){
  const menu = prix || cornerFair(reput);
  const qty = anonQty(day, seq, rue, rueMax);
  const ref = menuAt(menu, qty);   // rabais volume : la grosse portion s'ouvre moins cher au gramme
  const off = CORNER.OFFER.anon, m = off[0] + hh(day*5, seq)*(off[1]-off[0]);
  const offer = Math.min(Math.max(1, R(qty*ref*m)), offerCap("anon", 0, ref, qty));
  const tx = pick(ANON, day+seq).replace("{q}", qty).replace("{t}", offer);
  return { kind:"anon", mode:"offer", qty, offer, tx, tell:"" };
}

// profil louche — surpaie ×1.3 (un indice). cop:true = infiltré (vendre → chaleur) ; cop:false = pigeon (vente grasse).
export function makeLouche(day, seq, reput, prix){
  const L = pick(LOUCHE, day+seq), menu = prix || cornerFair(reput);
  return { kind:"louche", mode:"louche", nm:L.nm, av:L.av, tx:L.tx, tell:L.tell, cop:L.cop, qty:L.g, offer:R(L.g*menuAt(menu, L.g)*1.3) };
}

// grimace à mi-négo (Recettear) : lecture DÉTERMINISTE de la tête du client pendant qu'on règle le prix.
// bande de prix = TON menu (prix) ; plafonds tol/budget = marché (garde-fou).
export function negoFace(client, total, reput, prix){
  const g = client.g || client.qty || 0, menu = prix || cornerFair(reput);
  if(client.kind==="louche") return { emo:"😐", tx:"Aucune réaction… bizarre." };
  if(!g || !total) return { emo:"🤨", tx:"Il attend de voir…" };
  // connaisseur (traits.qual) : sa tolérance suit la qualité reniflée au spawn (qFac)
  // même référence que resolveOffer : la tête qu'il fait doit prédire son verdict
  const ref = menuAt(menu, g);
  const ppu = total/g, tol = cornerTol(client.kind, client.rel, ref)*(client.qFac||1), bud = cornerBudget(client.kind, client.rel);
  if(total>bud) return { emo:"😤", tx:"Au-dessus de sa poche." };
  if(ppu>tol) return { emo:"😤", tx:"À ce prix, c'est mort pour lui." };
  /* La frontière de l'ABUS, la même que `resolveOffer` — sans elle, la tête ne prédisait
     pas le verdict qu'elle promet de prédire. Mesuré : 63 cas où le visage annonçait
     « y a de la marge » alors que la vente partait en `gouge` (relation −, et deux fois
     d'affilée le client ne revient plus). Un tell qui ment sur la conséquence est pire
     que pas de tell : il invite au geste qui coûte. */
  const abus = ref * CORNER.NEGO_MAX * Math.max(1, client.qFac || 1);
  if(ppu>abus) return { emo:"😒", tx:"Il paiera… mais il retiendra." };
  if(ppu>tol*0.9) return { emo:"😬", tx:"Il grimace — t'es à la limite." };
  if(ppu<=ref*0.9) return { emo:"😍", tx:"Belle affaire… pour lui." };
  if(ppu<=ref*1.1) return { emo:"😊", tx:"Prix menu, ça lui va." };
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
  // `fair` = ton menu affiché POUR CETTE PORTION : le rabais volume entre ici, donc il
  // déplace la bande, la tolérance ET la frontière d'abus d'un seul mouvement. C'est ce
  // qui empêche la classe de bugs « le client refuse le montant qu'il vient d'annoncer ».
  const fair = menuAt(prix || cornerFair(reput), g), ppu = total/g;
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
    // La frontière de l'ABUS suit la qualité, sinon la tolérance gagnée est inutilisable :
    // avec un facteur qualité de 1,18, tout ce qui dépassait ×1,2 le menu basculait en
    // `gouge` (rel −2, réput −2, et il ne revient plus après deux fois). Autrement dit
    // le joueur au bon produit était PUNI d'en profiter — R1 violé par un seuil resté fixe
    // pendant que `tol` devenait élastique. max(1, …) : un connaisseur déçu (qFac 0.85)
    // ne déplace pas la ligne en ta faveur, il rogne seulement sa propre tolérance.
    const abus = fair * CORNER.NEGO_MAX * Math.max(1, client.qFac || 1);
    if(ppu <= abus)
      return { outcome:"nego", accepted:true, emo:"😏", rel:0, reput:CORNER.REP_DEAL, res:CORNER.RES_DEAL, tip:0, marge:R(total-g*fair) };
    // abus véritable (il paie quand même, mais il retient) : relation −, 2 d'affilée → il ne revient plus
    return { outcome:"gouge", accepted:true, emo:"😒", rel:CORNER.REL_GOUGE, reput:CORNER.REP_GOUGE, res:0, tip:0, gouge:true };
  }
  // refusé par le client
  if(!isClientOffer && firstTry){
    // floor (pas round) : son « dernier prix » doit TOUJOURS passer son propre test d'acceptation (R4) —
    // avec qFac 0.85 un arrondi au-dessus de tol faisait refuser au client le prix qu'il venait d'annoncer
    const t2 = Math.max(1, Math.min(Math.floor(g*tol*0.97), Math.floor(bud)));
    return { outcome:"counter", accepted:false, counterTotal:t2 }; // son « dernier prix »
  }
  /* `ceil` et `asked` : ce qu'il aurait payé au maximum, et ce qu'on lui a demandé. Les
     deux nombres existent DÉJÀ dans le scope (`tol`, `bud`, `total`) — on les rend au
     lieu de les jeter. Sans eux, un départ fâché ne peut être expliqué qu'en RESIMULANT
     le client après coup, c'est-à-dire en inventant un contrefactuel : le Karnet dirait
     « son plafond était 88 » sans que 88 ait jamais existé. Ici, 88 est le nombre qui a
     réellement décidé du refus. La fonction reste pure et déterministe. */
  return { outcome:"walk", accepted:false, emo:"🤬", rel:CORNER.REL_WALK, reput:CORNER.REP_WALK, res:-CORNER.RES_WALK,
           ceil:Math.max(1, Math.floor(Math.min(g*tol, bud))), asked:total };
}
