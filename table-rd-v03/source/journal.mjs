import { TRAITS, getConfiguration } from './model.mjs';

// The journal is a projection of public information, never a game transaction.
export const JOURNAL_STRINGS = {
  fr: {
    title: 'Journal de bord', intro: 'Retrouvez vos essais et les liens de leur lignée. Les ancêtres restent accessibles pour situer une recherche.',
    search: 'Nom, identité ou signature', searchHint: 'Rechercher dans le journal…', potential: 'Potentiel hérité', active: 'Trait activé',
    slots: 'Emplacements minimum', rarity: 'Rareté', ancestor: 'Descendants de', status: 'Statut', all: 'Tous', any: 'Indifférent',
    reset: 'Effacer les filtres', matches: '{count} résultat(s) sur {total}', contextCount: '{count} ancêtre(s) de contexte',
    matchingResults: 'Résultats correspondants', ancestorDisclosure: 'Ancêtres de contexte ({count})',
    empty: 'Aucun résultat pour ces filtres. Les essais restent dans le journal ; modifiez ou effacez les filtres.',
    generation: 'Génération', parents: 'Parents', children: 'Descendants directs', founder: 'Fondatrice', kept: 'Conservée', archived: 'Archivée', pending: 'En attente',
    hidden: 'Essai non révélé', unnamed: 'Découverte sans nom', hiddenInfo: 'Potentiel, rareté et emplacements restent cachés jusqu’à la révélation.',
    revealedPending: 'Révélée · à conserver ou archiver', match: 'Correspondance', context: 'Ancêtre · contexte',
    available: 'Potentiels disponibles', activated: 'Activés', noneActive: 'Aucun trait activé', noPotentials: 'Aucun potentiel documenté',
    slotCount: '{active} activé(s) / {capacity} emplacement(s)', signature: 'Signature', inspect: 'Voir les emplacements', use: 'Utiliser comme parent', download: 'Exporter la fiche',
    archiveNote: 'Essai archivé : consultable, sans plante réutilisable.', common: 'Ordinaire', rare: 'Rare', exceptional: 'Exceptionnelle',
    unknownParent: 'Parent', contextHelp: 'Les cartes de contexte ne satisfont pas nécessairement les filtres.',
  },
  en: {
    title: 'Research journal', intro: 'Find your trials and their lineage links. Ancestors remain accessible to place each search in context.',
    search: 'Name, identity or signature', searchHint: 'Search the journal…', potential: 'Inherited potential', active: 'Activated trait',
    slots: 'Minimum slots', rarity: 'Rarity', ancestor: 'Descendants of', status: 'Status', all: 'All', any: 'Any',
    reset: 'Clear filters', matches: '{count} result(s) of {total}', contextCount: '{count} ancestor(s) for context',
    matchingResults: 'Matching results', ancestorDisclosure: 'Ancestors for context ({count})',
    empty: 'No results match these filters. Trials remain in the journal; change or clear the filters.',
    generation: 'Generation', parents: 'Parents', children: 'Direct descendants', founder: 'Founder', kept: 'Kept', archived: 'Archived', pending: 'Pending',
    hidden: 'Unrevealed trial', unnamed: 'Unnamed discovery', hiddenInfo: 'Potential, rarity and slots stay hidden until the reveal.',
    revealedPending: 'Revealed · awaiting keeping or archiving', match: 'Match', context: 'Ancestor · context',
    available: 'Available potentials', activated: 'Activated', noneActive: 'No active trait', noPotentials: 'No documented potential',
    slotCount: '{active} active / {capacity} slot(s)', signature: 'Signature', inspect: 'View slots', use: 'Use as parent', download: 'Export card',
    archiveNote: 'Archived trial: readable, with no reusable plant.', common: 'Common', rare: 'Rare', exceptional: 'Exceptional',
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
    const configuration = configured ? configurationFn(strain.id) : null;
    const activeIds = uniqueIds(configuration?.activeIds).filter(id => potentialIds.includes(id));
    return {
      strainId: strain.id, name: typeof strain.name === 'object' && strain.name ? { ...strain.name } : strain.name ?? '',
      signature: typeof strain.signature === 'string' ? strain.signature : '', rarity: strain.rarity ?? null,
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
      strainId: null, name: '', signature: '', rarity: null, potentialIds: [], activeIds: [], availableIds: [], slotCapacity: null,
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
    const haystack = normalize([searchable(entry.name), entry.strainId, entry.trialId, entry.signature].join(' '));
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
      ${entry.signature ? `<p class="journal-signature">${text.signature} · ${escape(entry.signature)}</p>` : ''}
      ${entry.known ? `<p class="journal-profile"><span>${escape(text[entry.rarity] || entry.rarity || '')}</span><span>${interpolate(text.slotCount, { active: entry.activeIds.length, capacity: entry.slotCapacity })}</span></p>
      <dl class="journal-traits"><dt>${text.potential}</dt><dd>${traits(entry.potentialIds) || text.noPotentials}</dd><dt>${text.activated}</dt><dd>${traits(entry.activeIds) || text.noneActive}</dd></dl>` : `<p class="journal-hidden">${text.hiddenInfo}</p>`}
      ${entry.phase === 'revealed' ? `<p class="journal-note">${text.revealedPending}</p>` : ''}
      ${entry.status === 'archived' ? `<p class="journal-note">${text.archiveNote}</p>` : ''}
      <div class="journal-actions">${entry.configurable ? `<button type="button" data-journal-research="${escape(entry.strainId)}">${text.inspect}</button>` : ''}${allowed ? `<button type="button" data-journal-use="${escape(entry.strainId)}">${text.use}</button>` : ''}${entry.status === 'kept' && entry.trialId ? `<button type="button" data-journal-download="${escape(entry.trialId)}">↓ ${text.download}</button>` : ''}</div>
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

/** Mount inside an existing modal host. Callbacks receive strain IDs, except onDownload(trialId). */
export function renderJournal(host, { state, strains, lang = 'fr', onResearch, onUse, onDownload, canUse = false, configurationFn } = {}) {
  const text = JOURNAL_STRINGS[lang] || JOURNAL_STRINGS.fr;
  const entries = buildJournalEntries(state, strains, configurationFn);
  const option = (value, label) => `<option value="${escape(value)}">${escape(label)}</option>`;
  const traitOptions = option('', text.all) + traitList().map(trait => option(trait.id, traitName(trait.id, lang))).join('');
  const field = (label, name, options) => `<label>${label}<select name="${name}">${options}</select></label>`;
  host.innerHTML = `<section class="journal-board"><h2>${text.title}</h2><p>${text.intro}</p><form class="journal-filters" aria-label="${text.title}">
    <label class="journal-search">${text.search}<input name="query" type="search" autocomplete="off" placeholder="${text.searchHint}"></label>
    ${field(text.potential, 'potentialId', traitOptions)}${field(text.active, 'activeId', traitOptions)}
    ${field(text.slots, 'minSlots', option('', text.any) + [...new Set(entries.filter(entry => entry.known).map(entry => entry.slotCapacity).filter(value => value > 0))].sort((a, b) => a - b).map(value => option(value, `${value}+`)).join(''))}
    ${field(text.rarity, 'rarity', option('', text.all) + ['common', 'rare', 'exceptional'].map(id => option(id, text[id])).join(''))}
    ${field(text.ancestor, 'ancestorId', option('', text.all) + entries.filter(entry => entry.strainId && entry.childEntryIds.length).map(entry => option(entry.strainId, `${displayName(entry, lang, text)} · ${entry.strainId}`)).join(''))}
    ${field(text.status, 'status', option('', text.all) + ['founder', 'kept', 'archived', 'pending'].map(id => option(id, text[id])).join(''))}
    <button type="reset" class="journal-reset">${text.reset}</button></form><p class="journal-summary" role="status" aria-live="polite"></p><div class="journal-results"></div></section>`;
  const form = host.querySelector('.journal-filters'), results = host.querySelector('.journal-results'), summary = host.querySelector('.journal-summary');
  const filters = () => Object.fromEntries(new FormData(form));
  const update = () => {
    const result = filterJournalEntries(entries, filters());
    results.innerHTML = journalResultsHTML(result, { lang, canUse });
    summary.textContent = interpolate(text.matches, { count: result.totalMatches, total: result.totalEntries }) + (result.contextIds.size ? ` · ${interpolate(text.contextCount, { count: result.contextIds.size })}` : '');
  };
  const reset = event => { event.preventDefault(); for (const control of form.elements) if (control.name) control.value = ''; update(); };
  const click = event => {
    const button = event.target.closest('button');
    if (button?.dataset.journalResearch) onResearch?.(button.dataset.journalResearch);
    else if (button?.dataset.journalUse) onUse?.(button.dataset.journalUse);
    else if (button?.dataset.journalDownload) onDownload?.(button.dataset.journalDownload);
    const anchor = event.target.closest('a.journal-link');
    if (anchor) {
      event.preventDefault();
      const targetId = anchor.getAttribute('href').slice(1);
      const target = [...results.querySelectorAll('.journal-entry')].find(entry => entry.id === targetId);
      focusJournalEntry(target);
    }
  };
  form.addEventListener('input', update); form.addEventListener('change', update); form.addEventListener('reset', reset); form.addEventListener('submit', event => event.preventDefault());
  results.addEventListener('click', click); update();
  return {
    entries, getFilters: filters,
    setFilters(next = {}) { for (const control of form.elements) if (control.name) control.value = next[control.name] ?? ''; update(); },
    destroy() { form.removeEventListener('input', update); form.removeEventListener('change', update); form.removeEventListener('reset', reset); results.removeEventListener('click', click); },
  };
}
