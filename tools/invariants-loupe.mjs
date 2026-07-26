// Invariants mécaniques de La Loupe — sans navigateur, sans DOM.
//
// Le dépôt ne vérifiait jusqu'ici que la SYNTAXE (`node --check`), ce qui ne dit
// rien de la conservation. Ces deux invariants-là auraient attrapé à eux seuls
// l'essentiel de l'audit du 2026-07-25 :
//
//   1. Grammes facturés == grammes livrés, sur tout chemin de vente.
//   2. L'offre spontanée d'un client passe TOUJOURS son propre test d'acceptation.
//
// R4 (déterminisme total) rend ces tests triviaux : il n'y a aucun aléa à
// neutraliser, il suffit de balayer jour × seq.
//
//   cd tools && node invariants-loupe.mjs

import {
  CORNER, CORNER_PERSONAS, makeOffer, makeAnon, makeLouche, makeArdoise,
  resolveOffer, cornerBudget, cornerTol, cornerFair, wantsArdoise, offerCap,
  qualFac, QUAL_REF, QUAL_TOL_MAX,
  anonQty, ruePartGros, rueCalibre, checkUnlocks, cornerClientsDefault, rueApres,
  RUE_MIN, RUE_PALIERS, RUE_PART_MAX, RUE_INERTIE, menuAt, rabaisVolume, RABAIS_FORMAT,
} from "../la-loupe/corner.mjs";
import { qtyToSachets, applySachetPlan, composables } from "../la-loupe/snap.mjs";
import { FRONT_ENABLED, grantOpeningFront, nightTick, shelterDefaults } from "../la-loupe/shelter.mjs";

const results = [];
const ok = (nom, pass, detail = "") => results.push({ nom, pass, detail });
const R = Math.round;

// La plage de qualité que le jeu produit réellement : pains q52/q70/q78, dégradés
// par la lame (×0,82 au couteau pourri) puis moyennés — donc ~40 au plancher, 100 au plafond.
const QUALITES = [40, 52, 55, 64, 70, 78, 90, 100];

// ── 1. Conservation : ce qu'on facture, on le livre ────────────────────────
// On rejoue le transfert réel du corner (qtyToSachets + applySachetPlan) sur
// des tampons variés, et on vérifie que les grammes sortis du tampon égalent
// exactement les grammes couverts — jamais plus, jamais moins.
{
  const tampons = [
    { 2: 30 }, { 5: 12 }, { 8: 8 }, { 2: 5, 5: 5, 8: 5 },
    { 2: 1 }, { 8: 2 }, { 5: 3, 20: 1 }, { 12: 4, 2: 2 },
  ];
  let pire = 0, cas = 0, fuite = 0;
  for (const base of tampons) {
    for (const demande of [1, 2, 3, 5, 8, 12, 16, 24, 40]) {
      const t = { ...base };
      const avant = Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0);
      const { plan, covered } = qtyToSachets(demande, t);
      applySachetPlan(t, plan);
      const apres = Object.entries(t).reduce((a, [f, n]) => a + +f * n, 0);
      cas++;
      // le tampon perd exactement ce qui est couvert
      if (Math.abs((avant - apres) - covered) > 1e-9) fuite++;
      // et on ne sur-livre JAMAIS
      pire = Math.max(pire, covered - demande);
    }
  }
  ok("Conservation · les grammes sortis du tampon == les grammes couverts",
     fuite === 0, `${cas} cas, ${fuite} fuite(s)`);
  ok("Conservation · jamais de sur-livraison (on ne donne pas plus que demandé)",
     pire <= 0, `dépassement max : ${pire} g`);
}

// ── 2. L'offre d'un client passe son propre test ───────────────────────────
// C'est le bug le plus grave trouvé à l'audit : accepter le montant que le
// client vient d'annoncer pouvait le faire partir furieux, avec malus, sans
// aucun avertissement. Nassim : 100 % de ses visites. Bilal : 42 %.
{
  const menus = [6, 8, 10, 14, 20];
  const rels = [0, 10, 40, 80];
  let bad = 0, tot = 0;
  const coupables = new Map();
  for (const p of CORNER_PERSONAS) {
    for (const menu of menus) for (const rel of rels) {
      for (let day = 1; day <= 12; day++) for (let seq = 0; seq < 12; seq++) {
        const o = makeOffer(p, rel, 20, day, seq, menu);
        if (o.mode !== "offer") continue;
        tot++;
        // Depuis le 2026-07-25 la qualité donne un qFac à TOUT LE MONDE (elle achète
        // de la tolérance, pas du prix) : on balaye donc la vraie plage produite par
        // le jeu — qualFac(q) pour q de 40 à 100 — composée, chez les connaisseurs,
        // avec leur propre jugement. Balayer {1, 1.12, 0.85} ne testait plus rien.
        const gFacs = QUALITES.map(qualFac);
        const qFacs = p.traits && p.traits.qual
          ? gFacs.flatMap((g) => [g, g * CORNER.QUAL_TOL_UP, g * CORNER.QUAL_TOL_DOWN])
          : gFacs;
        for (const qFac of qFacs) {
          const cl = { kind: p.kind, rel, g: o.qty, qFac };
          const v = resolveOffer(cl, o.qty, o.offer, true, true, 20, menu);
          if (!v.accepted) {
            bad++;
            coupables.set(p.nm, (coupables.get(p.nm) || 0) + 1);
            break;
          }
        }
      }
    }
  }
  ok("R1/R4 · l'offre spontanée d'un persona passe toujours son propre test",
     bad === 0,
     bad ? `${bad}/${tot} — ${[...coupables].map(([n, c]) => n + "×" + c).join(", ")}`
         : `${tot} offres × qualité ${QUALITES[0]}..${QUALITES[QUALITES.length - 1]} (menus ${menus.join("/")}, rel ${rels.join("/")})`);
}

// ── 2 bis. Idem pour les PNJ anonymes, qui font 85 % du volume ─────────────
{
  let bad = 0, tot = 0;
  for (const menu of [6, 8, 10, 14, 20]) {
    for (let day = 1; day <= 30; day++) for (let seq = 0; seq < 30; seq++) {
      const a = makeAnon(day, seq, 20, menu);
      tot++;
      for (const q of QUALITES) {
        const v = resolveOffer({ kind: "anon", rel: 0, g: a.qty, qFac: qualFac(q) }, a.qty, a.offer, true, true, 20, menu);
        if (!v.accepted) { bad++; break; }
      }
    }
  }
  ok("R1/R4 · idem pour les PNJ anonymes (85 % du volume)", bad === 0, `${bad}/${tot}`);
}

// ── 2 ter. La tolérance gagnée par la qualité est UTILISABLE ───────────────
// C'est LA garantie de l'arbitrage « la qualité achète de la tolérance », et elle
// ne se teste pas à prix fixe : à prix fixe, monter en qualité n'a jamais pu nuire
// (un test formulé ainsi passe avant ET après le correctif — il ne prouve rien).
//
// Le mal apparaît quand le joueur SE SERT de ce qu'il a acheté. Les prix débloqués
// par la qualité — ceux que le client refusait à q55 et accepte à q100 — tombaient
// tous au-delà de `NEGO_MAX × menu`, donc en `gouge` : −2 relation, −2 réput, et il
// ne revient plus après deux fois. Le seuil d'abus était resté fixe pendant que
// `tol` devenait élastique : avoir du bon produit devenait une punition (R1).
// Un client TRÈS lié tolère déjà plus que la ligne d'abus (facteur relation ×1,254
// à rel 80 contre NEGO_MAX ×1,2) : ça, c'est voulu — il avale et il s'en souvient.
// L'invariant n'est donc pas « aucun prix puni », mais : **monter en qualité ne doit
// pas augmenter la PART punie** de ce qu'il accepte. Sinon le bon produit n'achète
// que du ressentiment, et l'arbitrage « la qualité achète de la tolérance » est mort.
{
  let pires = 0, cas = 0, exemple = null;
  // Mesure EXACTE, par bissection sur les bornes — pas par comptage sur une grille.
  // Une grille, même à 20 000 pas, laisse un bruit d'échantillonnage (0,006 pt) du
  // même ordre que ce qu'on veut détecter : le test échouait alors sur des cas où
  // les deux valeurs s'affichaient identiques (« 4 % → 4 % »). Ici on cherche les
  // deux frontières réelles — le plus haut prix accepté, le plus haut prix non
  // puni — et la part d'abus est leur écart relatif. Zéro bruit.
  const bisect = (pred, lo, hi) => {
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (pred(m)) lo = m; else hi = m; }
    return lo;
  };
  const partPunie = (kind, rel, g, menu, q) => {
    const qFac = qualFac(q), hi = g * menu * 8, bas = 1e-9;
    const juge = (t) => resolveOffer({ kind, rel, g, qFac }, g, t, false, false, 20, menu);
    const accepte = (t) => juge(t).accepted;
    const sansAbus = (t) => { const v = juge(t); return v.accepted && v.outcome !== "gouge"; };
    if (!accepte(bas)) return { part: 0 };
    const maxAccepte = bisect(accepte, bas, hi);
    const maxSain = sansAbus(bas) ? bisect(sansAbus, bas, hi) : 0;
    return { part: maxAccepte > 0 ? Math.max(0, maxAccepte - maxSain) / maxAccepte : 0 };
  };
  for (const kind of ["anon", "regulier", "accro", "lowball", "hesitant", "grossiste"]) {
    for (const rel of [0, 10, 40, 80]) for (const menu of [8, 10, 14]) for (const g of [2, 5, 8]) {
      const bas = partPunie(kind, rel, g, menu, QUAL_REF);
      const haut = partPunie(kind, rel, g, menu, 100);
      cas++;
      if (haut.part > bas.part + 1e-6) {   // mesure exacte : plus besoin de tolérer un pas de grille
        pires++;
        if (!exemple) exemple = `${kind} rel${rel} ${g} g menu ${menu} : ${(100 * bas.part).toFixed(0)} % → ${(100 * haut.part).toFixed(0)} % d'abus`;
      }
    }
  }
  ok("R1 · monter en qualité n'augmente jamais la part de prix punis (tolérance utilisable)",
     pires === 0,
     pires ? `${pires}/${cas} cas aggravés — ex. ${exemple}` : `${cas} cas, la part d'abus ne monte jamais avec la qualité`);
}

// ── 2 quater. Le facteur qualité est up-only et borné ──────────────────────
// `offerCap` prend min(budget, qty × tol) : un facteur < 1 rognerait le plafond
// que le client s'impose APRÈS avoir annoncé son offre, et re-créerait le bug
// Nassim/Bilal. La garantie doit être structurelle, pas de tuning.
{
  let hors = 0, monotone = true, prev = 0;
  for (let q = 0; q <= 100; q++) {
    const f = qualFac(q);
    if (f < 1 || f > QUAL_TOL_MAX + 1e-9) hors++;
    if (f < prev - 1e-9) monotone = false;
    prev = f;
  }
  ok("R1 · le facteur qualité est up-only (≥ 1), borné et monotone",
     hors === 0 && monotone && Math.abs(qualFac(QUAL_REF) - 1) < 1e-9,
     `q${QUAL_REF}→${qualFac(QUAL_REF).toFixed(2)} · q78→${qualFac(78).toFixed(2)} · q100→${qualFac(100).toFixed(2)}`);
}

// ── 2 quinquies. La dette dormante ne peut ni s'armer ni enfler ────────────
// `repayDebt` exige du PROPRE, dont aucune source in-game n'existe (trieuse coupée).
// Une dette armée serait donc impayable, et `nightTick` la fait enfler sans fin :
// +8 chaleur, −6 standing, ×1,15 tous les 2 jours. Boucle de punition sans sortie.
{
  const S = { day: 1, heat: 10, reput: 50, cash: 0, dirty: 0, pains: [], sachets: {}, bars: {}, shelter: shelterDefaults() };
  const armé = grantOpeningFront(S);
  ok("R1 · la dette ne peut plus s'armer (aucun circuit de remboursement)",
     FRONT_ENABLED === false && armé.ok === false && !S.shelter.frontActive, armé.reason || "armée !");

  // save « infecté » par une version antérieure : l'escalade doit cesser, l'état être conservé
  const T = { day: 10, heat: 10, reput: 50, cash: 0, dirty: 0, pains: [], sachets: {}, bars: {},
    shelter: { ...shelterDefaults(), frontActive: true, debtDue: 280, debtDueDay: 2 } };
  for (let i = 0; i < 30; i++) { nightTick(T, 250); T.day++; }
  ok("R1 · sur un save déjà porteur d'une dette, l'escalade s'arrête (état conservé)",
     T.shelter.debtDue === 280 && T.heat === 10 && T.reput === 50,
     `dette ${T.shelter.debtDue} (280 attendu) · chaleur ${T.heat} · réput ${T.reput} après 30 nuits`);
}

// ── 3. Le « dernier prix » du client passe son propre test ─────────────────
// Régression déjà corrigée une fois (NOTES 2026-07-24) : le contre affiché
// doit rester atteignable, sinon accepter le prix qu'il vient d'annoncer
// finit en walk avec malus.
{
  let bad = 0, tot = 0;
  for (const p of CORNER_PERSONAS) {
    for (const menu of [8, 10, 14]) for (const rel of [0, 10, 40]) {
      for (const qFac of [1, CORNER.QUAL_TOL_UP, CORNER.QUAL_TOL_DOWN]) {
        const cl = { kind: p.kind, rel, g: p.usual, qFac };
        // on pousse un prix absurde pour déclencher le contre
        const v = resolveOffer(cl, p.usual, p.usual * menu * 9, true, false, 20, menu);
        if (v.outcome !== "counter") continue;
        tot++;
        const v2 = resolveOffer(cl, p.usual, v.counterTotal, false, true, 20, menu);
        if (!v2.accepted) bad++;
      }
    }
  }
  ok("R4 · le « dernier prix » annoncé par le client reste acceptable par lui",
     bad === 0, `${bad}/${tot}`);
}

// ── 4. Bornes : aucune jauge ne sort de 0..100 sur une séquence de ventes ──
{
  let hors = 0;
  let reput = 20, res = 50;
  const clamp = (v) => Math.max(0, Math.min(100, v));
  for (const p of CORNER_PERSONAS) {
    for (let day = 1; day <= 40; day++) {
      const o = makeOffer(p, 10, reput, day, day % 7, 10);
      if (o.mode !== "offer") continue;
      const v = resolveOffer({ kind: p.kind, rel: 10, g: o.qty, qFac: 1 }, o.qty, o.offer, true, true, reput, 10);
      reput = clamp(reput + (v.reput || 0));
      res = clamp(res + (v.res || 0));
      if (reput < 0 || reput > 100 || res < 0 || res > 100) hors++;
    }
  }
  ok("Bornes · réput et réservoir restent dans 0..100", hors === 0,
     `réput ${reput.toFixed(0)} · réservoir ${res.toFixed(0)}`);
}

// ── 5. R4 : le hash de présentation est déterministe et borné ──────────────
{
  const a = [], b = [];
  for (let day = 1; day <= 50; day++) for (let seq = 0; seq < 10; seq++) {
    a.push(makeAnon(day, seq, 20, 10).offer);
  }
  for (let day = 1; day <= 50; day++) for (let seq = 0; seq < 10; seq++) {
    b.push(makeAnon(day, seq, 20, 10).offer);
  }
  ok("R4 · mêmes entrées, mêmes offres (déterminisme)",
     a.every((v, i) => v === b[i]), `${a.length} tirages`);
}

// ── 5 bis. Le rabais volume : la portion généreuse est moins chère au gramme ─
// Arbitrage Sylvain : « le prix au gramme d'un 8 g doit être plus attractif que
// celui pour un 2 g ». La FORME compte autant que la courbe : exprimé comme un
// facteur sur la tolérance, le rabais rognerait le plafond que le client s'impose
// APRÈS avoir annoncé son offre — le bug Nassim/Bilal, que l'invariant §2 quater
// interdit explicitement. Exprimé comme un menu par format, il déplace le plafond
// ET l'offre ensemble, donc la classe de bugs est évitée par construction.
{
  let hors = 0, croissant = 0, prev = Infinity;
  for (let q = 0; q <= 40; q += 0.25) {
    const f = rabaisVolume(q);
    if (f > 1 + 1e-9 || f < RABAIS_FORMAT[RABAIS_FORMAT.length - 1][1] - 1e-9) hors++;
    if (f > prev + 1e-9) croissant++;
    prev = f;
  }
  ok("R4 · le rabais volume est down-only, borné et monotone décroissant",
     hors === 0 && croissant === 0,
     RABAIS_FORMAT.map(([g, f]) => `${g}g ×${f.toFixed(2)}`).join(" · "));

  // la demande de Sylvain, vérifiée sur le prix réellement payé, pas sur le facteur
  const menu = 10;
  const ppu = (q) => menuAt(menu, q);
  const paires = [[2, 5], [5, 8], [8, 12], [12, 20]];
  const rate = paires.filter(([a, b]) => !(ppu(b) < ppu(a)));
  ok("R9 · une portion plus généreuse coûte STRICTEMENT moins cher au gramme",
     rate.length === 0,
     rate.length ? `${rate.length} paire(s) en échec` : paires.map(([a, b]) => `${a}→${b} g : ${ppu(a).toFixed(2)}→${ppu(b).toFixed(2)} €/g`).join(" · "));

  // et la contrepartie doit exister : un client qui demande gros paie MOINS au gramme,
  // donc son offre spontanée doit rester acceptable (sinon on a cassé §2 en douce)
  let bad = 0, tot = 0;
  for (const m of [6, 10, 20]) for (let day = 1; day <= 20; day++) for (let seq = 0; seq < 20; seq++) {
    for (const rue of [2, 8, 20]) {
      const a = makeAnon(day, seq, 20, m, rue, rue);
      tot++;
      if (!resolveOffer({ kind: "anon", rel: 0, g: a.qty, qFac: 1 }, a.qty, a.offer, true, true, 20, m).accepted) bad++;
    }
  }
  ok("R1 · avec le rabais, l'offre d'un gros panier passe toujours son propre test",
     bad === 0, `${bad}/${tot} (paniers jusqu'à ${rueCalibre(20)} g)`);
}

// ── 5 ter. Proposer une AUTRE quantité que celle demandée ──────────────────
// Arbitrage Sylvain : « dans la négociation, on devrait pouvoir proposer plus ou
// moins ». C'est le seul moyen de servir quelqu'un quand le tampon ne compose pas
// sa demande — une barrette ne se casse pas, 8 g en stock ne font pas 5 g.
//
// Aucune pénalité n'a été ajoutée, et c'est délibéré : `cornerBudget` ne dépend PAS
// de la quantité. Vendre plus que sa poche ne peut pas encaisser plus — ça encaisse
// la même somme sur plus de grammes, et le €/g s'effondre tout seul. L'arbitrage
// « écouler du stock bâtard vs tenir son prix » est donc porté par l'économie
// existante, pas par un malus (R1, R8).
{
  const menu = 10;
  // 1. la contrepartie existe : proposer plus fait BAISSER le €/g encaissable
  const maxPPU = (kind, rel, g) => {
    const fair = menuAt(menu, g);
    return Math.min(cornerTol(kind, rel, fair), cornerBudget(kind, rel) / g);
  };
  const serie = [2, 3, 5, 8, 12, 20].map((g) => ({ g, ppu: maxPPU("anon", 0, g) }));
  let monotone = true;
  for (let i = 1; i < serie.length; i++) if (serie[i].ppu > serie[i - 1].ppu + 1e-9) monotone = false;
  ok("R8 · proposer plus fait baisser le €/g encaissable (l'arbitrage est dans l'économie)",
     monotone, serie.map((s) => `${s.g}g ${s.ppu.toFixed(2)}`).join(" · ") + " €/g");

  // 2. R1 : proposer une autre quantité ne doit jamais être un PIÈGE — il doit
  //    toujours exister un prix acceptable pour la quantité proposée, sinon le
  //    joueur ouvrirait un écran dont aucune sortie n'est vendable.
  let sansIssue = 0, cas = 0, exemple = null;
  for (const kind of ["anon", "regulier", "accro", "lowball", "grossiste"]) {
    for (const rel of [0, 20, 60]) for (const g of [1, 2, 3, 5, 8, 12, 20, 24]) {
      cas++;
      // le prix que l'UI propose par défaut quand on change la quantité
      const propose = Math.max(1, Math.round(g * menuAt(menu, g)));
      const v = resolveOffer({ kind, rel, g, qFac: 1 }, g, propose, false, false, 20, menu);
      // il peut refuser ce prix-là (c'est une négo), mais un prix acceptable doit exister
      const plancher = resolveOffer({ kind, rel, g, qFac: 1 }, g, 1, false, false, 20, menu);
      if (!plancher.accepted) {
        sansIssue++;
        if (!exemple) exemple = `${kind} rel${rel} ${g} g : aucun prix acceptable`;
      }
      void v;
    }
  }
  ok("R1 · quelle que soit la quantité proposée, un prix acceptable existe (jamais d'impasse)",
     sansIssue === 0, exemple || `${cas} combinaisons (kind × rel × quantité 1..24 g)`);

  // 3. LE point dur : toute quantité atteignable par le stepper est EXACTEMENT
  //    composable depuis le tampon. C'est la contrainte qui tue la classe de bug
  //    « 0 % de servable » par construction — pas un avertissement à l'écran.
  {
    const tampons = [
      { 2: 10 }, { 5: 6 }, { 8: 5 }, { 2: 1, 8: 3 }, { 5: 4 },
      { 2: 3, 5: 2, 8: 2 }, { 12: 3 }, { 20: 2, 2: 1 },
    ];
    let inservable = 0, tot = 0, exemple = null;
    for (const t of tampons) {
      for (const cap of [6, 12, 34]) {
        for (const g of composables(t, cap)) {
          tot++;
          const { exact } = qtyToSachets(g, { ...t });
          if (!exact) { inservable++; if (!exemple) exemple = `tampon ${JSON.stringify(t)} propose ${g} g, non composable`; }
        }
      }
    }
    ok("R1 · toute quantité proposable est exactement composable depuis le tampon",
       inservable === 0, exemple || `${tot} quantités sur ${tampons.length} tampons`);

    // et la contre-épreuve : le pas naïf (plus petite barrette) en produit, lui
    let naifs = 0;
    for (const t of tampons) {
      const petite = Math.min(...Object.keys(t).map(Number));
      for (let g = petite; g <= 24; g += petite) if (!qtyToSachets(g, { ...t }).exact) naifs++;
    }
    ok("Contre-épreuve · le pas naïf (plus petite barrette) produirait des quantités inservables",
       naifs > 0, `${naifs} quantités inservables évitées par l'énumération des composables`);
  }

  // 4. R4 : le prix par défaut suit bien le barème volume, pas celui de la demande
  const paires = [[2, 8], [5, 12], [8, 20]];
  const suit = paires.every(([a, b]) => menuAt(menu, b) < menuAt(menu, a));
  ok("R4 · le prix par défaut d'une quantité proposée suit SON format, pas celui demandé",
     suit, paires.map(([a, b]) => `${a}→${b} g : ${menuAt(menu, a).toFixed(2)}→${menuAt(menu, b).toFixed(2)} €/g`).join(" · "));
}

// ── 6. Bouche-à-oreille : la rue envoie une clientèle SERVABLE ─────────────
// Le signal est ce que tu COUPES. Sur « ce que tu vends », le système se bloquerait
// en rond. Mais couper gros doit aussi amener une demande *composable* : qtyToSachets
// ne casse jamais une barrette, donc une demande de 7 g face à un tampon de 8 g ne se
// sert pas. Mesuré sans l'accrochage aux paliers : couper à 8 g amenait des paniers
// de 7 g → 0 % de servable. La demande tombait pile un cran sous l'offre.
// ON JOUE LA RAMPE, on ne la saute pas. La version précédente de ce test stabilisait
// `rue` sur 40 coupes, PUIS montait le tampon, PUIS vendait : coupe et vente n'étaient
// jamais entrelacées — c'est-à-dire que le scénario était incapable d'exhiber le seul
// moment où le stock mort se forme, la montée en calibre. Il certifiait « zéro stock
// mort » sur un cas qui n'en produit pas. Ici on alterne coupe et vente jour par jour,
// depuis rue = RUE_MIN, en annonçant le format comme le ferait le joueur.
{
  let exemple = null, pireCouv = 100;
  for (const cal of [5, 8, 12]) {
    let rue = RUE_MIN, rueMax = RUE_MIN;
    const tampon = {};
    let servis = 0, tot = 0;
    for (let day = 1; day <= 14; day++) {
      // la soirée : 12 coupes, moitié au gros calibre (le joueur suit le ratio affiché)
      for (let i = 0; i < 12; i++) {
        const t = i % 2 ? cal : 2;
        tampon[t] = (tampon[t] || 0) + 1;
        rue = rueApres(rue, t);
        // l'annonce : le joueur déclare son format dès qu'il en a coupé (geste explicite)
        if (rueCalibre(t) > rueCalibre(rueMax)) rueMax = t;
      }
      // puis 24 clients
      for (let seq = 0; seq < 24; seq++) {
        const q = anonQty(day, seq, rue, rueMax);
        const { plan, covered } = qtyToSachets(q, tampon);
        tot++;
        if (covered === q) { servis++; applySachetPlan(tampon, plan); }
      }
    }
    const dormantes = Object.entries(tampon).reduce((a, [f, n]) => a + (+f >= cal && n > 0 ? n : 0), 0);
    const couv = 100 * servis / tot;
    pireCouv = Math.min(pireCouv, couv);
    // le stock de gros calibre doit s'écouler : il peut rester un tampon de roulement,
    // pas une accumulation qui grossit sans fin (14 soirées × 6 grosses = 84 coupées)
    if (dormantes > 84 * 0.35 && !exemple) exemple = `coupe ${cal} g : ${dormantes} barrettes ≥ ${cal} g dorment sur 84 coupées`;
  }
  ok("R1 · en jouant la RAMPE (coupe et vente entrelacées), le gros calibre s'écoule",
     exemple === null, exemple || `couverture minimale ${pireCouv.toFixed(0)} % sur les trois calibres`);
}

// ── 6 bis. La rumeur porte un calibre NOMMÉ, et le quartier ne meurt pas ───
{
  let horsPalier = 0;
  for (let r = 0; r <= 30; r += 0.1) if (!RUE_PALIERS.includes(rueCalibre(r))) horsPalier++;
  ok("R4 · la rue nomme toujours un calibre du barème (jamais une moyenne flottante)",
     horsPalier === 0, `paliers ${RUE_PALIERS.join("/")} g`);

  // Plancher théorique : la part NON convertie vaut (1 − RUE_PART_MAX), et dans la
  // table de base [2,2,3,5,2] seules 4 entrées sur 5 sont des petites doses (≤ 3 g)
  // — la cinquième est un 5 g. Le plancher est donc 0,8 × (1 − RUE_PART_MAX), pas
  // (1 − RUE_PART_MAX) : c'est la table du quartier qui le fixe, pas la rumeur.
  const PART_BASE_PETITE = 4 / 5;
  const plancher = 100 * (1 - RUE_PART_MAX) * PART_BASE_PETITE;
  let minPetits = 100;
  for (const rue of [2, 5, 8, 12, 20, 40]) {
    let petits = 0, tot = 0;
    for (let d = 1; d <= 40; d++) for (let s = 0; s < 20; s++) { if (anonQty(d, s, rue) <= 3) petits++; tot++; }
    minPetits = Math.min(minPetits, 100 * petits / tot);
  }
  ok("R1 · le quartier ne disparaît jamais (les petites doses restent le fond du trafic)",
     minPetits >= plancher - 1,
     `au pire ${minPetits.toFixed(0)} % de petits paniers, jamais moins que le plancher ${plancher.toFixed(0)} %`);

  const a = [], b = [];
  for (let d = 1; d <= 40; d++) for (let s = 0; s < 12; s++) { a.push(anonQty(d, s, 7.3)); b.push(anonQty(d, s, 7.3)); }
  ok("R4 · le panier d'un anonyme est déterministe", a.every((v, i) => v === b[i]), `${a.length} tirages`);
}

// ── 6 quater. La première coupe d'un calibre l'annonce TOUT DE SUITE ───────
// Arbitrage Sylvain : « la demande de morceaux plus gros pourrait se déclencher au
// moment où le joueur coupe le morceau de taille la première fois ». Ce n'est pas
// qu'une question de lisibilité : avec la seule moyenne à inertie, il fallait 14 à
// 20 coupes AVANT que la rue demande ce calibre — soit autant de barrettes
// invendables en attendant que la demande rattrape l'offre.
// Deux propriétés à tenir ensemble, et elles se contredisent naïvement :
//   (a) une seule coupe suffit à faire apparaître la demande (pas de décalage) ;
//   (b) une seule coupe ne convertit PAS tout le trafic (le quartier survit, R1).
{
  let pireDelai = 0, exemple = null;
  for (const cal of [5, 8, 12]) {
    // une seule coupe : rueMax saute au calibre, rue bouge à peine
    const rue = rueApres(RUE_MIN, cal);
    let vu = false;
    for (let d = 1; d <= 8 && !vu; d++) for (let s = 0; s < 12; s++) {
      if (anonQty(d, s, rue, cal) >= cal) { vu = true; break; }
    }
    if (!vu) { pireDelai++; if (!exemple) exemple = `${cal} g jamais demandé après la 1re coupe`; }
  }
  ok("R2 · la 1re coupe d'un calibre suffit à faire apparaître la demande (aucun décalage)",
     pireDelai === 0, exemple || "5 g / 8 g / 12 g demandés dès la première barrette");

  // (b) une coupe isolée ne doit pas retourner le trafic
  const rue1 = rueApres(RUE_MIN, 8);
  let gros1 = 0, tot1 = 0;
  for (let d = 1; d <= 40; d++) for (let s = 0; s < 20; s++) { if (anonQty(d, s, rue1, 8) >= 8) gros1++; tot1++; }
  let rue40 = RUE_MIN;
  for (let i = 0; i < 40; i++) rue40 = rueApres(rue40, 8);
  let gros40 = 0, tot40 = 0;
  for (let d = 1; d <= 40; d++) for (let s = 0; s < 20; s++) { if (anonQty(d, s, rue40, 8) >= 8) gros40++; tot40++; }
  const p1 = 100 * gros1 / tot1, p40 = 100 * gros40 / tot40;
  ok("R1 · une coupe isolée ouvre la porte sans retourner le trafic (l'ampleur se gagne)",
     p1 <= 10 && p40 > p1 * 3, `1 coupe → ${p1.toFixed(0)} % de gros paniers · 40 coupes → ${p40.toFixed(0)} %`);
}

// ── 6 ter. La porte « rumeur » ouvre, elle ne ferme rien ───────────────────
// Diego (grossiste) s'ouvrait uniquement par la relation avec Momo. Il a maintenant
// une seconde porte : la rue parle de ton calibre. Les deux chemins OUVRENT ;
// aucun ne doit devenir une condition supplémentaire (R1).
{
  const parRumeur = cornerClientsDefault();
  const nRue = checkUnlocks(parRumeur, 8).filter((u) => u.p.id === "diego");
  const parRelation = cornerClientsDefault();
  parRelation.momo.rel = 100;
  const nRel = checkUnlocks(parRelation, RUE_MIN).filter((u) => u.p.id === "diego");
  const ni = cornerClientsDefault();
  const nNi = checkUnlocks(ni, RUE_MIN).filter((u) => u.p.id === "diego");
  ok("R1 · le grossiste s'ouvre par la rumeur OU par la relation, jamais par les deux exigées",
     nRue.length === 1 && nRue[0].rue === true && nRel.length === 1 && nNi.length === 0,
     `rumeur ${nRue.length} · relation ${nRel.length} · ni l'un ni l'autre ${nNi.length}`);
}

// ── 7. Le grossiste ne fait plus la rue ────────────────────────────────────
// Arbitrage Sylvain (2026-07-26) : « le grossiste ne devrait pas passer par la rue,
// mais seulement par SnapShit en DM, puis avec une livraison via BeuherShit ».
// Il reste dans CORNER_PERSONAS (son visage, ses répliques, ses deux portes de
// déblocage servent au DM) — c'est `canal:"dm"` qui le sort du tirage de la rue.
{
  const dm = CORNER_PERSONAS.filter((p) => p.canal === "dm");
  ok("Le grossiste est marqué canal DM (il ne fait plus la queue au corner)",
     dm.length === 1 && dm[0].id === "diego" && dm[0].kind === "grossiste",
     dm.map((p) => `${p.nm} (${p.kind})`).join(", ") || "aucun");

  // il n'a plus d'heures de passage ni de chaleur de coin : un deal livré n'a pas de coin
  const d = CORNER_PERSONAS.find((p) => p.id === "diego");
  ok("Le grossiste n'a plus ni heures de passage ni chaleur de coin",
     d && !(d.traits && d.traits.hours) && !(d.traits && d.traits.heat),
     d ? JSON.stringify(d.traits || {}) : "absent");

  // les constantes de son kind restent définies : elles bornent le prix du DM et
  // sont balayées par les invariants §2 ter et §5 ter (les retirer donnerait NaN)
  const ok2 = ["TOL", "BUDGET", "PATIENCE"].every((k) => CORNER[k].grossiste != null);
  ok("Les bornes du kind grossiste restent définies (elles bornent le DM)",
     ok2, `TOL ${CORNER.TOL.grossiste} · BUDGET ${CORNER.BUDGET.grossiste} · PATIENCE ${CORNER.PATIENCE.grossiste}`);

  // sa porte de rumeur survit au déménagement : c'est ce que « annoncer son format » achète
  const cl = cornerClientsDefault();
  const n = checkUnlocks(cl, 8).filter((u) => u.p.id === "diego");
  ok("Sa porte de rumeur survit au déménagement (annoncer son calibre le fait écrire)",
     n.length === 1 && n[0].rue === true, `${n.length} ouverture(s) par la rumeur`);
}

console.log("\n─── invariants La Loupe ───");
let bad = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.nom}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.pass) bad++;
}
console.log(`\n${results.length - bad}/${results.length} invariants OK.`);
process.exit(bad ? 1 : 0);
