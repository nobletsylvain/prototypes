import { TRAITS, getConfiguration, QUALITY_TIERS, tierForScore } from './model.mjs';
import { buildJournalGraph } from './journal-graph.mjs';
import { buildJournalLayout } from './journal-layouts.mjs';
import { renderStrainPortrait } from './journal-portrait.mjs';
import { visualFeatures,visualSearchText,shortVisualName } from './visual-ui.mjs';

// The journal is a projection of public information, never a game transaction.
export const JOURNAL_STRINGS = {
  fr: {
    views: 'Comparer les vues', generations: 'Générations', circle: 'Cercle', family: 'Famille',
    generationsHint: 'De gauche à droite, chaque colonne réunit une génération. Les portraits restent à leur place pendant la recherche.',
    circleHint: 'Du centre vers l’extérieur, les générations se succèdent en anneaux. Une vue d’ensemble à explorer au zoom.',
    familyHint: 'Une variété, ses parents et ses enfants directs. Changez de point de départ pour parcourir toute la famille.',
    focus: 'Point de départ', focusStrain: 'Variété observée', links: 'Liens affichés', allLinks: 'Tous les liens', focusLinks: 'Liens ciblés',
    focusLinksHint: 'Liens ciblés : parents et enfants du point de départ. Une recherche montre l’ascendance de tous ses résultats.',
    familyScope: '{visible} variétés visibles sur {total} · famille directe uniquement', focusCurrent: 'Voir sa famille',
    readable: 'Lire les noms', selected: 'Point de départ',
    title: 'L’arbre de vos découvertes', intro: 'Suivez les croisements de génération en génération. Touchez une variété conservée pour ouvrir ses slots.',
    visualSignature: 'Signature visuelle', unseen: 'À découvrir', collection: 'Votre herbier', portraitHint: 'Couleurs, reflets, filiations. Chaque découverte laisse sa trace.',
    filters: 'Filtres de l’arbre', tree: 'Arbre généalogique', treeHint: 'Faites défiler l’arbre au doigt ou avec les flèches. Sur ordinateur, glissez le fond pour déplacer la vue.',
    zoomIn: 'Agrandir l’arbre', zoomOut: 'Réduire l’arbre', fit: 'Tout voir', previous: 'Résultat précédent', next: 'Résultat suivant',
    resultLegend: 'Résultat', lineageLegend: 'Ascendance du résultat', otherLegend: 'Autres branches', cards: 'Fiches et actions',
    noMatchTree: 'Aucun résultat. Votre arbre reste visible ; modifiez ou effacez les filtres.', allTree: 'L’arbre complet reste visible.', viewEntry: 'Consulter cet essai', compactSlots: '{active}/{capacity} slots activés',
    search: 'Nom, forme, couleur ou tier', searchHint: 'Un nom, mauve, légendaire, 100…', potential: 'Potentiel hérité', active: 'Trait activé',
    slots: 'Emplacements minimum', rarity: 'Tier génétique', geneticQuality: 'Qualité génétique', qualityNote: 'La qualité génétique est distincte de l’apparence et de la qualité du lot.', ancestor: 'Descendants de', status: 'Statut', all: 'Tous', any: 'Indifférent',
    reset: 'Effacer les filtres', matches: '{count} résultat(s) sur {total}', contextCount: '{count} ancêtre(s) de contexte',
    matchingResults: 'Résultats correspondants', ancestorDisclosure: 'Ancêtres de contexte ({count})',
    empty: 'Aucun résultat pour ces filtres. Les essais restent dans le journal ; modifiez ou effacez les filtres.',
    generation: 'Génération', parents: 'Parents', children: 'Descendants directs', founder: 'Fondatrice', kept: 'Conservée', archived: 'Archivée', pending: 'En attente',
    hidden: 'Essai non révélé', unnamed: 'Découverte sans nom', hiddenInfo: 'Potentiel, qualité génétique et emplacements restent cachés jusqu’à la révélation.',
    revealedPending: 'Révélée · à conserver ou archiver', match: 'Correspondance', context: 'Ancêtre · contexte',
    available: 'Potentiels disponibles', activated: 'Activés', noneActive: 'Aucun trait activé', noPotentials: 'Aucun potentiel documenté',
    slotCount: '{active} activé(s) / {capacity} emplacement(s)', signature: 'Signature', inspect: 'Voir les emplacements', use: 'Utiliser comme parent', download: 'Exporter le certificat (COA)',
    archiveNote: 'Essai archivé : consultable, sans plante réutilisable.', poor: 'Pauvre', common: 'Commun', uncommon: 'Peu commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire',
    unknownParent: 'Parent', contextHelp: 'Les cartes de contexte ne satisfont pas nécessairement les filtres.',
  },
  en: {
    views: 'Compare views', generations: 'Generations', circle: 'Circle', family: 'Family',
    generationsHint: 'Left to right, each column groups a generation. Portraits stay in place while searching.',
    circleHint: 'From the centre outward, generations form rings. An overview to explore with zoom.',
    familyHint: 'One variety, its parents and direct children. Change the starting point to explore the whole family.',
    focus: 'Starting point', focusStrain: 'Observed variety', links: 'Visible links', allLinks: 'All links', focusLinks: 'Focused links',
    focusLinksHint: 'Focused links show parents and children of the starting point. Search shows the ancestry of all matches.',
    familyScope: '{visible} of {total} varieties visible · direct family only', focusCurrent: 'View its family',
    readable: 'Read names', selected: 'Starting point',
    title: 'Your discovery tree', intro: 'Follow crosses from one generation to the next. Tap a kept variety to open its slots.',
    visualSignature: 'Visual signature', unseen: 'Yet to discover', collection: 'Your herbarium', portraitHint: 'Colour, glints, lineage. Each discovery leaves a trace.',
    filters: 'Tree filters', tree: 'Genealogy tree', treeHint: 'Scroll the tree with touch or arrow keys. On desktop, drag the background to pan.',
    zoomIn: 'Zoom in on the tree', zoomOut: 'Zoom out of the tree', fit: 'Fit tree', previous: 'Previous result', next: 'Next result',
    resultLegend: 'Match', lineageLegend: 'Match ancestry', otherLegend: 'Other branches', cards: 'Records and actions',
    noMatchTree: 'No results. Your tree stays visible; change or clear the filters.', allTree: 'The complete tree stays visible.', viewEntry: 'View this trial', compactSlots: '{active}/{capacity} active slots',
    search: 'Name, shape, colour or tier', searchHint: 'A name, mauve, legendary, 100…', potential: 'Inherited potential', active: 'Activated trait',
    slots: 'Minimum slots', rarity: 'Genetic tier', geneticQuality: 'Genetic quality', qualityNote: 'Genetic quality is separate from appearance and batch quality.', ancestor: 'Descendants of', status: 'Status', all: 'All', any: 'Any',
    reset: 'Clear filters', matches: '{count} result(s) of {total}', contextCount: '{count} ancestor(s) for context',
    matchingResults: 'Matching results', ancestorDisclosure: 'Ancestors for context ({count})',
    empty: 'No results match these filters. Trials remain in the journal; change or clear the filters.',
    generation: 'Generation', parents: 'Parents', children: 'Direct descendants', founder: 'Founder', kept: 'Kept', archived: 'Archived', pending: 'Pending',
    hidden: 'Unrevealed trial', unnamed: 'Unnamed discovery', hiddenInfo: 'Potential, genetic quality and slots stay hidden until the reveal.',
    revealedPending: 'Revealed · awaiting keeping or archiving', match: 'Match', context: 'Ancestor · context',
    available: 'Available potentials', activated: 'Activated', noneActive: 'No active trait', noPotentials: 'No documented potential',
    slotCount: '{active} active / {capacity} slot(s)', signature: 'Signature', inspect: 'View slots', use: 'Use as parent', download: 'Export certificate (COA)',
    archiveNote: 'Archived trial: readable, with no reusable plant.', poor: 'Poor', common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
    unknownParent: 'Parent', contextHelp: 'Context cards do not necessarily match the filters.',
  },
};

const REVEALED_PHASES = new Set(['revealed', 'kept', 'archived']);
const uniqueIds = values => [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === 'string'))];
const cleanNumber = value => Number.isInteger(value) && value >= 0 ? value : 0;
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
const searchable = value => typeof value === 'string' ? value : value && typeof value === 'object' ? Object.values(value).filter(v => typeof v === 'string').join(' ') : '';
const local = (value, lang) => typeof value === 'string' ? value : value?.[lang] ?? value?.fr ?? value?.en ?? '';
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const anchorId = id => `journal-${encodeURIComponent(id)}`;
const interpolate = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
const publicTier = entry => entry.known && Number.isInteger(entry.geneticQuality) && entry.geneticQuality >= 0 && entry.geneticQuality <= 100 ? tierForScore(entry.geneticQuality) : null;
const qualityLabel = (entry, lang) => { const tier = publicTier(entry); return tier ? `${local(tier.name, lang)} · ${entry.geneticQuality}/100` : ''; };
const qualityBadge = (entry, lang, text) => { const tier = publicTier(entry); return tier ? `<span class="journal-quality-badge" style="--tier-color:${tier.color}" aria-label="${escape(text.geneticQuality + ' · ' + qualityLabel(entry, lang))}">${escape(qualityLabel(entry, lang))}</span>` : ''; };
const downloadAction = (entry, text) => entry.known && entry.trialId ? `<button type="button" data-journal-download="${escape(entry.trialId)}">↓ ${text.download}</button>` : '';
const traitList = () => Array.isArray(TRAITS) ? TRAITS : Object.entries(TRAITS).map(([id, trait]) => ({ id, ...trait }));

/** Build safe journal entries. configurationFn receives a known strain ID only. */
export function buildJournalEntries(state, strains = [], configurationFn = id => getConfiguration(state, id)) {
  const trials = Array.isArray(state?.trials) ? state.trials : [];
  const varieties = Array.isArray(state?.varieties) ? state.varieties : [];
  const knownStrains = Array.isArray(strains) ? strains : [];
  const trialIds = new Set(trials.map(trial => trial.id));
  const entries = [];
  const publicFields = (strain, configured) => {
    const potentialIds = uniqueIds(strain.potentialIds);
    const geneticQuality = Number.isInteger(strain.geneticQuality) && strain.geneticQuality >= 0 && strain.geneticQuality <= 100 ? strain.geneticQuality : null;
    const configuration = configured ? configurationFn(strain.id) : null;
    const activeIds = uniqueIds(configuration?.activeIds).filter(id => potentialIds.includes(id));
    return {
      strainId: strain.id, name: typeof strain.name === 'object' && strain.name ? { ...strain.name } : strain.name ?? '',
      signature: typeof strain.signature === 'string' ? strain.signature : '', geneticQuality, rarity: geneticQuality === null ? null : tierForScore(geneticQuality).id,
      color: typeof strain.color === 'string' && /^#[0-9a-f]{6}$/i.test(strain.color) ? strain.color : '#7d9b76',
      accent: typeof strain.accent === 'string' ? strain.accent : strain.accent && typeof strain.accent === 'object' ? Object.fromEntries(Object.entries(strain.accent).filter(([,value]) => typeof value === 'string')) : null,
      visual: strain.visual ? structuredClone(strain.visual) : null,
      potentialIds, activeIds, availableIds: potentialIds.filter(id => !activeIds.includes(id)),
      slotCapacity: cleanNumber(strain.slotCapacity),
    };
  };
  for (const strain of knownStrains) {
    if (strain.trialId && trialIds.has(strain.trialId)) continue;
    if (uniqueIds(strain.parents).length || cleanNumber(strain.generation) !== 0) continue;
    entries.push({
      id: `strain:${strain.id}`, trialId: null, ...publicFields(strain, true), parentIds: [], generation: 0,
      createdAt: 0, status: 'founder', phase: 'founder', known: true, configurable: true, reusable: true,
    });
  }
  const generationByStrain = new Map(knownStrains.map(strain => [strain.id, cleanNumber(strain.generation)]));
  for (const trial of trials) {
    const known = REVEALED_PHASES.has(trial.phase);
    const parentIds = uniqueIds(trial.parentIds);
    const entry = {
      id: `trial:${trial.id}`, trialId: trial.id, parentIds,
      generation: 1 + Math.max(0, ...parentIds.map(id => generationByStrain.get(id) ?? 0)),
      createdAt: Number.isFinite(trial.createdAt) ? trial.createdAt : 0,
      status: trial.phase === 'kept' ? 'kept' : trial.phase === 'archived' ? 'archived' : 'pending',
      phase: trial.phase, known, configurable: false, reusable: false,
      strainId: null, name: '', signature: '', geneticQuality: null, rarity: null, color: null, accent: null, visual: null, potentialIds: [], activeIds: [], availableIds: [], slotCapacity: null,
    };
    if (known) {
      const kept = varieties.find(strain => strain.trialId === trial.id || strain.id === trial.result?.id);
      const strain = kept || trial.result;
      if (strain) {
        Object.assign(entry, publicFields(strain, !!kept));
        entry.generation = cleanNumber(strain.generation);
        entry.configurable = !!kept;
        entry.reusable = !!kept && trial.phase === 'kept';
        generationByStrain.set(strain.id, entry.generation);
      }
    }
    entries.push(entry);
  }
  const byStrain = new Map(entries.filter(entry => entry.strainId).map(entry => [entry.strainId, entry]));
  for (const entry of entries) {
    entry.parentEntryIds = entry.parentIds.map(id => byStrain.get(id)?.id).filter(Boolean);
    entry.childEntryIds = entries.filter(child => entry.strainId && child.parentIds.includes(entry.strainId)).map(child => child.id);
  }
  return entries.sort((a, b) => a.generation - b.generation || a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/** Filters are ANDed; ancestor context is added after matching, without counting as a match. */
export function filterJournalEntries(entries, filters = {}) {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const byStrain = new Map(entries.filter(entry => entry.strainId).map(entry => [entry.strainId, entry]));
  const ancestry = entry => {
    const result = new Set(), pending = [...entry.parentIds];
    while (pending.length) {
      const id = pending.pop();
      if (result.has(id)) continue;
      result.add(id);
      const parent = byStrain.get(id);
      if (parent) pending.push(...parent.parentIds);
    }
    return result;
  };
  const query = normalize(filters.query);
  const terms = query.split(/\s+/).filter(Boolean);
  const minSlots = Number(filters.minSlots) || 0;
  const matches = entries.filter(entry => {
    const tier = publicTier(entry);
    const qualitySearch = tier ? `${searchable(tier.name)} ${tier.id} ${entry.geneticQuality}` : '';
    const haystack = normalize([qualitySearch, searchable(entry.name), entry.strainId, entry.trialId, entry.signature, entry.known ? searchable(entry.accent) + ' ' + visualSearchText(entry.visual) : ''].join(' '));
    return terms.every(term => haystack.includes(term))
      && (!filters.potentialId || entry.known && entry.potentialIds.includes(filters.potentialId))
      && (!filters.activeId || entry.known && entry.activeIds.includes(filters.activeId))
      && (!filters.availableId || entry.known && entry.availableIds.includes(filters.availableId))
      && (!minSlots || entry.known && entry.slotCapacity >= minSlots)
      && (!filters.rarity || entry.known && entry.rarity === filters.rarity)
      && (!filters.status || entry.status === filters.status)
      && (!filters.parentId || entry.parentIds.includes(filters.parentId))
      && (!filters.ancestorId || ancestry(entry).has(filters.ancestorId));
  });
  const matchIds = new Set(matches.map(entry => entry.id));
  const contextIds = new Set();
  const pending = matches.flatMap(entry => entry.parentEntryIds);
  while (pending.length) {
    const id = pending.pop();
    if (contextIds.has(id) || matchIds.has(id)) continue;
    const entry = byId.get(id);
    if (!entry) continue;
    contextIds.add(id);
    pending.push(...entry.parentEntryIds);
  }
  return {
    entries: entries.filter(entry => matchIds.has(entry.id) || contextIds.has(entry.id)), matches,
    matchIds, contextIds, totalMatches: matches.length, totalEntries: entries.length,
  };
}

const displayName = (entry, lang, text) => local(entry.name, lang) || (entry.known ? text.unnamed : text.hidden);
const traitName = (id, lang) => {
  const trait = traitList().find(item => item.id === id);
  return local(trait?.name ?? trait?.label, lang) || id;
};

/** Return only escaped public fields; this function is safe to exercise without a DOM. */
export function journalResultsHTML(result, { lang = 'fr', canUse = false } = {}) {
  const text = JOURNAL_STRINGS[lang] || JOURNAL_STRINGS.fr;
  if (!result.entries.length) return `<p class="journal-empty">${text.empty}</p>`;
  const byId = new Map(result.entries.map(entry => [entry.id, entry]));
  const byStrain = new Map(result.entries.filter(entry => entry.strainId).map(entry => [entry.strainId, entry]));
  const link = entry => `<a class="journal-link" href="#${escape(anchorId(entry.id))}">${escape(displayName(entry, lang, text))}</a>`;
  const traits = ids => ids.map(id => `<span class="journal-trait">${escape(traitName(id, lang))}</span>`).join('');
  const cards = entry => {
    const context = result.contextIds.has(entry.id);
    const allowed = entry.reusable && (typeof canUse === 'function' ? canUse(entry.strainId) : canUse);
    const parents = entry.parentIds.map(id => byStrain.has(id) ? link(byStrain.get(id)) : `<span>${escape(id)}</span>`).join('<span aria-hidden="true"> × </span>');
    const children = entry.childEntryIds.map(id => byId.get(id)).filter(Boolean);
    return `<article id="${escape(anchorId(entry.id))}" class="journal-entry${context ? ' journal-context' : ''}" tabindex="-1">
      <div class="journal-card-top"><span class="journal-status">${text[entry.status]}</span><span class="journal-match">${context ? text.context : text.match}</span></div>
      ${parents ? `<div class="journal-relatives"><small>${text.parents}</small><div>${parents}</div><span aria-hidden="true">↓</span></div>` : ''}
      <h3>${escape(displayName(entry, lang, text))}</h3><p class="journal-id">${escape(entry.strainId || entry.trialId)}</p>
      ${entry.visual ? `<p class="journal-visual-brief">${escape(visualFeatures(entry.visual,lang).map(f => f.value).join(' · '))}</p>` : ''}
      ${entry.signature ? `<p class="journal-signature">${text.signature} · ${escape(entry.signature)}</p>` : ''}
      ${entry.known ? `<p class="journal-profile">${qualityBadge(entry, lang, text)}<span>${interpolate(text.slotCount, { active: entry.activeIds.length, capacity: entry.slotCapacity })}</span></p>
      <dl class="journal-traits"><dt>${text.potential}</dt><dd>${traits(entry.potentialIds) || text.noPotentials}</dd><dt>${text.activated}</dt><dd>${traits(entry.activeIds) || text.noneActive}</dd></dl>` : `<p class="journal-hidden">${text.hiddenInfo}</p>`}
      ${entry.phase === 'revealed' ? `<p class="journal-note">${text.revealedPending}</p>` : ''}
      ${entry.status === 'archived' ? `<p class="journal-note">${text.archiveNote}</p>` : ''}
      <div class="journal-actions">${entry.configurable ? `<button type="button" data-journal-research="${escape(entry.strainId)}">${text.inspect}</button>` : ''}${allowed ? `<button type="button" data-journal-use="${escape(entry.strainId)}">${text.use}</button>` : ''}${downloadAction(entry, text)}</div>
      ${children.length ? `<div class="journal-children"><small>${text.children} ↓</small><div>${children.map(link).join(' ')}</div></div>` : ''}
    </article>`;
  };
  const generationsHTML = entries => [...new Set(entries.map(entry => entry.generation))].map(generation => `<section class="journal-generation"><h3>${text.generation} ${generation}</h3><div class="journal-generation-cards">${entries.filter(entry => entry.generation === generation).map(cards).join('')}</div></section>`).join('');
  if (!result.contextIds.size) return generationsHTML(result.entries);
  const matches = result.entries.filter(entry => !result.contextIds.has(entry.id));
  const ancestors = result.entries.filter(entry => result.contextIds.has(entry.id));
  return `<section class="journal-matches" aria-label="${text.matchingResults}">${generationsHTML(matches)}</section><details class="journal-ancestors"><summary>${interpolate(text.ancestorDisclosure, { count: ancestors.length })}</summary><p class="journal-context-help">${text.contextHelp}</p>${generationsHTML(ancestors)}</details>`;
}

/** Make a linked ancestor visible before moving the viewport or keyboard focus. */
export function focusJournalEntry(target) {
  if (!target) return false;
  const disclosure = target.closest('.journal-ancestors');
  if (disclosure) disclosure.open = true;
  target.scrollIntoView({ block: 'nearest' });
  target.focus({ preventScroll: true });
  return true;
}

/** Render only the safe public graph projection, keeping every branch in place. */
export function journalGraphHTML(graph, { lang = 'fr', filtered = false, focusId = null, links = 'all' } = {}) {
  const text = JOURNAL_STRINGS[lang] || JOURNAL_STRINGS.fr;
  const visibleEdges = links === 'focus' && graph.layout !== 'family' ? graph.edges.filter(edge => filtered ? edge.highlighted : edge.from === focusId || edge.to === focusId) : graph.edges;
  const edges = [...visibleEdges].sort((a,b)=>Number(a.highlighted)-Number(b.highlighted)).map(edge => `<path class="journal-edge${!filtered || edge.highlighted ? ' is-highlighted' : ''}" data-from="${escape(edge.from)}" data-to="${escape(edge.to)}" d="${escape(edge.path)}" marker-end="url(#journal-arrow)"></path>`).join('');
  const guideLabel = label => label === 'focus' ? text.focusStrain : text[label] || label;
  const generations = graph.guides ? graph.guides.map(guide => `<span class="journal-layout-guide" style="left:${guide.x}px;top:${guide.y}px">${escape(guideLabel(guide.label))}</span>`).join('') : [...new Set(graph.nodes.map(node => node.entry.generation))].map(generation => {
    const node = graph.nodes.find(item => item.entry.generation === generation);
    return `<span class="journal-generation-label" style="left:${node.x}px;top:12px">${text.generation} ${generation}</span>`;
  }).join('');
  const rings = (graph.rings || []).map(ring => `<circle class="journal-ring" cx="${ring.cx}" cy="${ring.cy}" r="${ring.r}"></circle><text class="journal-ring-label" x="${ring.cx+ring.r*.707}" y="${ring.cy-ring.r*.707-8}">${escape(ring.label)}</text>`).join('');
  const nodes = graph.nodes.map(node => {
    const entry = node.entry, name = displayName(entry, lang, text);
    const action = entry.configurable ? 'research' : 'inspect';
    const status = text[entry.status] + (filtered && node.match ? ` · ✦ ${text.resultLegend}` : '');
    const profile = entry.known ? interpolate(text.compactSlots, { active: entry.activeIds.length, capacity: entry.slotCapacity }) : text.hidden;
    const classification = (filtered ? node.match ? ' is-match' : node.lineage ? ' is-lineage' : ' is-muted' : '') + (node.id === focusId ? ' is-current' : '');
    const accent = entry.known ? [shortVisualName(entry.visual,lang), local(entry.accent, lang)].filter(Boolean).join(' · ') || text.visualSignature : text.unseen;
    const color = entry.known && /^#[0-9a-f]{6}$/i.test(entry.color || '') ? entry.color : '#829080';
    const glint = entry.known ? entry.visual?.alleles.pigment.includes('mauve') ? '#c6a1df' : '#bdcf9a' : '#829080';
    const slots = entry.known ? `<span class="journal-slot-dots" aria-label="${escape(profile)}">${Array.from({length:Math.min(12,entry.slotCapacity)},(_,i)=>`<i class="${i < entry.activeIds.length ? 'active' : ''}"></i>`).join('')}</span>` : `<span class="journal-sealed">${text.unseen}</span>`;
    return `<button type="button" class="journal-node${classification}" data-entry="${escape(entry.id)}" data-tree-action="${action}" data-strain="${escape(entry.strainId || '')}" data-known="${entry.known}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;--strain-color:${color};--glint-color:${glint}" aria-label="${escape(`${name} · ${entry.configurable ? text.inspect : text.viewEntry}`)}" title="${escape(`${name} · ${qualityLabel(entry, lang)} · ${text.visualSignature} · ${accent} · ${profile}`)}"><span class="journal-portrait">${renderStrainPortrait(entry, `portrait-${entry.id}`)}</span>${qualityBadge(entry, lang, text)}<span class="journal-node-status">${escape(status)}</span><strong class="journal-node-name">${escape(name)}</strong><span class="journal-node-accent">${escape(accent)}</span>${slots}</button>`;
  }).join('');
  return `<svg class="journal-edges" width="${graph.width}" height="${graph.height}" viewBox="0 0 ${graph.width} ${graph.height}" aria-hidden="true"><defs><marker id="journal-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="context-stroke"></path></marker></defs>${rings}${edges}</svg>${generations}${nodes}`;
}

/** Mount inside an existing modal host. Callbacks receive strain IDs, except onDownload(trialId). */
export function renderJournal(host, { state, strains, lang = 'fr', onResearch, onUse, onDownload, canUse = false, configurationFn } = {}) {
  const text = JOURNAL_STRINGS[lang] || JOURNAL_STRINGS.fr;
  const entries = buildJournalEntries(state, strains, configurationFn);
  const option = (value, label) => `<option value="${escape(value)}">${escape(label)}</option>`;
  const traitOptions = option('', text.all) + traitList().map(trait => option(trait.id, traitName(trait.id, lang))).join('');
  const field = (label, name, options) => `<label>${label}<select name="${name}">${options}</select></label>`;
  host.innerHTML = `<section class="journal-board" data-layout="family"><header class="journal-heading"><div><small>${text.collection}</small><h2>${text.title}</h2></div><p class="journal-intro">${text.portraitHint}<br><small>${text.qualityNote}</small></p></header>
    <div class="journal-view-switch" role="group" aria-label="${text.views}">${['generations','circle','family'].map(id=>`<button type="button" data-layout="${id}" aria-pressed="${id==='family'}">${text[id]}</button>`).join('')}</div>
    <p class="journal-view-description"></p><div class="journal-focus-controls"><label>${text.focus}<select class="journal-focus-select">${entries.map(entry=>option(entry.id,`${displayName(entry,lang,text)} · G${entry.generation}`)).join('')}</select></label><button type="button" data-tree-tool="focus-current">${text.focusCurrent}</button><div class="journal-link-switch" role="group" aria-label="${text.links}"><button type="button" data-links="focus" aria-pressed="true">${text.focusLinks}</button><button type="button" data-links="all" aria-pressed="false">${text.allLinks}</button></div></div>
    <form class="journal-form" aria-label="${text.title}">
    <label class="journal-search">${text.search}<input name="query" type="search" autocomplete="off" placeholder="${text.searchHint}"></label>
    <details class="journal-filter-toggle"><summary>${text.filters} <span class="journal-filter-count"></span></summary><div class="journal-filters">
    ${field(text.potential, 'potentialId', traitOptions)}${field(text.active, 'activeId', traitOptions)}
    ${field(text.slots, 'minSlots', option('', text.any) + [...new Set(entries.filter(entry => entry.known).map(entry => entry.slotCapacity).filter(value => value > 0))].sort((a, b) => a - b).map(value => option(value, `${value}+`)).join(''))}
    ${field(text.rarity, 'rarity', option('', text.all) + QUALITY_TIERS.map(tier => option(tier.id, local(tier.name, lang))).join(''))}
    ${field(text.ancestor, 'ancestorId', option('', text.all) + entries.filter(entry => entry.strainId && entry.childEntryIds.length).map(entry => option(entry.strainId, `${displayName(entry, lang, text)} · ${entry.strainId}`)).join(''))}
    ${field(text.status, 'status', option('', text.all) + ['founder', 'kept', 'archived', 'pending'].map(id => option(id, text[id])).join(''))}
    <button type="reset" class="journal-reset">${text.reset}</button></div></details></form><div class="journal-navigation"><p class="journal-summary" role="status" aria-live="polite"></p>
    <div class="journal-tree-toolbar"><button type="button" data-tree-tool="out" aria-label="${text.zoomOut}">−</button><output class="journal-zoom">100%</output><button type="button" data-tree-tool="in" aria-label="${text.zoomIn}">+</button><button type="button" data-tree-tool="fit">${text.fit}</button><button type="button" data-tree-tool="readable">${text.readable}</button><span class="journal-toolbar-spacer"></span><button type="button" data-tree-tool="previous" aria-label="${text.previous}">←</button><span class="journal-result-position"></span><button type="button" data-tree-tool="next" aria-label="${text.next}">→</button></div>
    </div><div class="journal-legend"><span class="legend-match">✦ ${text.resultLegend}</span><span class="legend-lineage">━ ${text.lineageLegend}</span><span class="legend-other">━ ${text.otherLegend}</span></div>
    <div class="journal-viewport" role="region" tabindex="0" aria-label="${text.tree}" aria-describedby="journal-tree-hint"><div class="journal-scaled-space"><div class="journal-canvas"></div></div></div>
    <p class="journal-tree-hint" id="journal-tree-hint">${text.treeHint}</p><div class="journal-selection"></div>
    <details class="journal-cards-toggle"><summary>${text.cards}</summary><div class="journal-results"></div></details></section>`;
  const form = host.querySelector('.journal-form'), results = host.querySelector('.journal-results'), summary = host.querySelector('.journal-summary');
  const viewport = host.querySelector('.journal-viewport'), space = host.querySelector('.journal-scaled-space'), canvas = host.querySelector('.journal-canvas');
  const selection = host.querySelector('.journal-selection'), position = host.querySelector('.journal-result-position');
  let graph, result, zoom = 1, resultIndex = -1, drag = null, layout = 'family', links = 'focus';
  let focusId = [...entries].filter(entry=>entry.status==='kept').sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0]?.id || entries[0]?.id || null;
  const board = host.querySelector('.journal-board'), focusSelect = host.querySelector('.journal-focus-select');
  const filters = () => Object.fromEntries(new FormData(form));
  const setZoom = (value, fitting = false) => {
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / zoom;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / zoom;
    zoom = Math.max(fitting ? Number.EPSILON : .25, Math.min(1.6, value));
    space.style.width = `${graph.width * zoom}px`; space.style.height = `${graph.height * zoom}px`;
    canvas.style.width = `${graph.width}px`; canvas.style.height = `${graph.height}px`; canvas.style.transform = `scale(${zoom})`;
    host.querySelector('.journal-zoom').textContent = `${Math.round(zoom * 100)}%`;
    viewport.scrollLeft = centerX * zoom - viewport.clientWidth / 2; viewport.scrollTop = centerY * zoom - viewport.clientHeight / 2;
  };
  const fit = () => { setZoom(Math.min(1, (viewport.clientWidth - 16) / graph.width, (viewport.clientHeight - 16) / graph.height), true); viewport.scrollLeft = 0; viewport.scrollTop = 0; };
  const centerNode = (id, focus = false) => {
    const node = graph.nodes.find(item => item.id === id); if (!node) return;
    viewport.scrollLeft = (node.x + node.width / 2) * zoom - viewport.clientWidth / 2;
    viewport.scrollTop = (node.y + node.height / 2) * zoom - viewport.clientHeight / 2;
    const button = [...canvas.querySelectorAll('.journal-node')].find(item => item.dataset.entry === id);
    canvas.querySelectorAll('.is-current').forEach(item => item.classList.remove('is-current'));
    button?.classList.add('is-current'); if (focus) button?.focus({ preventScroll: true });
  };
  const frameView = () => {fit();if(layout==='family' && zoom<.75){setZoom(.75);centerNode(focusId);}};
  const update = (resetPosition = true) => {
    const values = filters(), filtered = Object.values(values).some(value => String(value).trim());
    result = filterJournalEntries(entries, values); graph = buildJournalLayout(entries, result.matchIds, filtered, {layout,focusId});
    focusId = graph.focusId; focusSelect.value = focusId || ''; board.dataset.layout = layout;
    canvas.innerHTML = journalGraphHTML(graph, { lang, filtered, focusId, links });
    host.querySelectorAll('[data-layout]').forEach(button=>{if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.layout===layout));});
    host.querySelectorAll('[data-links]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.links===links)));
    host.querySelector('.journal-link-switch').hidden = layout === 'family';
    host.querySelector('.journal-view-description').textContent = text[layout+'Hint'] + (layout!=='family' && links==='focus' ? ' '+text.focusLinksHint : '');
    results.innerHTML = journalResultsHTML(result, { lang, canUse });
    summary.textContent = interpolate(text.matches, { count: result.totalMatches, total: result.totalEntries }) + ` · ${layout==='family' ? interpolate(text.familyScope,{visible:graph.nodes.length,total:entries.length}) : result.totalMatches ? text.allTree : text.noMatchTree}`;
    host.querySelector('.journal-filter-count').textContent = filtered ? `(${Object.values(values).filter(value => String(value).trim()).length})` : '';
    if(resetPosition) resultIndex = -1;
    position.textContent = resultIndex < 0 ? `${result.totalMatches}` : `${resultIndex+1}/${result.totalMatches}`; selection.innerHTML = '';
    host.querySelectorAll('[data-tree-tool="previous"],[data-tree-tool="next"]').forEach(button => { button.disabled = !result.totalMatches; });
    setZoom(zoom);
  };
  const reset = event => { event.preventDefault(); for (const control of form.elements) if (control.name) control.value = ''; update(); };
  const click = event => {
    const button = event.target.closest('button');
    const tool = button?.dataset.treeTool;
    if(button?.dataset.layout){layout=button.dataset.layout;update(false);frameView();}
    else if(button?.dataset.links){links=button.dataset.links;update(false);}
    else if(tool==='focus-current'){layout='family';update(false);frameView();}
    else if(tool==='readable'){setZoom(1);centerNode(focusId);}
    else if (tool === 'in' || tool === 'out') setZoom(zoom * (tool === 'in' ? 1.2 : 1 / 1.2));
    else if (tool === 'fit') fit();
    else if (tool === 'next' || tool === 'previous') {
      if (!result.matches.length) return;
      resultIndex = resultIndex < 0 ? (tool === 'next' ? 0 : result.matches.length - 1) : (resultIndex + (tool === 'next' ? 1 : -1) + result.matches.length) % result.matches.length;
      focusId = result.matches[resultIndex].id; update(false);
      position.textContent = `${resultIndex + 1}/${result.matches.length}`; if (zoom < .8) setZoom(.8); centerNode(result.matches[resultIndex].id, true);
    }
    else if (button?.dataset.treeAction === 'research') {focusId=button.dataset.entry;onResearch?.(button.dataset.strain);}
    else if (button?.dataset.treeAction === 'inspect') {
      const entry = entries.find(item => item.id === button.dataset.entry);
      if (!entry) return;
      focusId = entry.id; update(false);
      const note = entry.status === 'archived' ? text.archiveNote : entry.phase === 'revealed' ? text.revealedPending : '';
      selection.innerHTML = `<strong>${escape(displayName(entry, lang, text))}</strong><p>${entry.known ? `${escape(text[entry.status])} · ${escape(entry.potentialIds.map(id => traitName(id, lang)).join(' · '))}` : text.hiddenInfo}</p>${note ? `<small>${note}</small>` : ''}${qualityBadge(entry, lang, text)}${downloadAction(entry, text)}`;
    }
    else if (button?.dataset.journalResearch) onResearch?.(button.dataset.journalResearch);
    else if (button?.dataset.journalUse) onUse?.(button.dataset.journalUse);
    else if (button?.dataset.journalDownload) { const entry = entries.find(item => item.trialId === button.dataset.journalDownload); if (entry?.known) onDownload?.(entry.trialId); }
    const anchor = event.target.closest('a.journal-link');
    if (anchor) {
      event.preventDefault();
      const targetId = anchor.getAttribute('href').slice(1);
      const entry = entries.find(item => anchorId(item.id) === targetId);
      if (entry) { focusId=entry.id;update(false);host.querySelector('.journal-cards-toggle').open = false;setZoom(1);centerNode(entry.id, true); }
    }
  };
  const keydown = event => {
    if (event.target !== viewport) return;
    const directions = { ArrowLeft: [-72,0], ArrowRight: [72,0], ArrowUp: [0,-72], ArrowDown: [0,72] };
    const direction = directions[event.key]; if (!direction) return;
    event.preventDefault(); viewport.scrollLeft += direction[0]; viewport.scrollTop += direction[1];
  };
  const pointerdown = event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button')) return;
    drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId); viewport.classList.add('is-dragging'); event.preventDefault();
  };
  const pointermove = event => { if (drag) { viewport.scrollLeft = drag.left + drag.x - event.clientX; viewport.scrollTop = drag.top + drag.y - event.clientY; } };
  const pointerup = () => { drag = null; viewport.classList.remove('is-dragging'); };
  const submit = event => event.preventDefault();
  const filterChanged = () => {const previousFocus=focusId,next=filterJournalEntries(entries,filters());if(layout==='family' && next.matches.length && !next.matchIds.has(focusId))focusId=next.matches[0].id;update();if(focusId!==previousFocus)centerNode(focusId);};
  const focusChanged = () => {focusId=focusSelect.value;update(false);if(layout==='family')frameView();else centerNode(focusId);};
  form.addEventListener('input', filterChanged); form.addEventListener('change', filterChanged); form.addEventListener('reset', reset); form.addEventListener('submit', submit);focusSelect.addEventListener('change',focusChanged);
  host.addEventListener('click', click); viewport.addEventListener('keydown', keydown);
  viewport.addEventListener('pointerdown', pointerdown); viewport.addEventListener('pointermove', pointermove); viewport.addEventListener('pointerup', pointerup); viewport.addEventListener('pointercancel', pointerup);
  update();frameView();
  return {
    entries, getFilters: filters,
    getViewState(){return {layout,links,focusId,zoom,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop,resultIndex};},
    setViewState(next={}){if(['generations','circle','family'].includes(next.layout))layout=next.layout;if(['focus','all'].includes(next.links))links=next.links;if(entries.some(entry=>entry.id===next.focusId))focusId=next.focusId;update();if(Number.isInteger(next.resultIndex)&&next.resultIndex>=0&&next.resultIndex<result.matches.length)resultIndex=next.resultIndex;update(false);if(Number.isFinite(next.zoom)&&next.zoom>0)setZoom(next.zoom,true);else fit();if(Number.isFinite(next.scrollLeft))viewport.scrollLeft=next.scrollLeft;if(Number.isFinite(next.scrollTop))viewport.scrollTop=next.scrollTop;},
    setFilters(next = {}) { for (const control of form.elements) if (control.name) control.value = next[control.name] ?? ''; update(); },
    destroy() { form.removeEventListener('input', filterChanged); form.removeEventListener('change', filterChanged); form.removeEventListener('reset', reset); form.removeEventListener('submit', submit);focusSelect.removeEventListener('change',focusChanged); host.removeEventListener('click', click); viewport.removeEventListener('keydown', keydown); viewport.removeEventListener('pointerdown', pointerdown); viewport.removeEventListener('pointermove', pointermove); viewport.removeEventListener('pointerup', pointerup); viewport.removeEventListener('pointercancel', pointerup); },
  };
}
