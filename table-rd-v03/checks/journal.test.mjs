import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJournalEntries, filterJournalEntries, journalResultsHTML, focusJournalEntry, JOURNAL_STRINGS } from '../source/journal.mjs';

function fixture() {
  const founders = [
    { id: 'aube', name: { fr: 'Aube', en: 'Dawn' }, parents: [], generation: 0, potentialIds: ['citrus', 'yield'], slotCapacity: 2, rarity: 'common' },
    { id: 'lisiere', name: { fr: 'Lisière', en: 'Woodland' }, parents: [], generation: 0, potentialIds: ['floral'], slotCapacity: 1, rarity: 'common' },
  ];
  const kept = { id: 'variety-001', trialId: 'trial-001', name: 'Éclat du matin', signature: 'Zoé', parents: ['aube', 'lisiere'], generation: 1, potentialIds: ['citrus', 'quality'], slotCapacity: 2, rarity: 'rare' };
  const archived = { id: 'variety-002', name: '', parents: ['variety-001', 'aube'], generation: 2, potentialIds: ['floral', 'b1'], slotCapacity: 3, rarity: 'exceptional' };
  const revealed = { id: 'variety-004', parents: ['aube', 'lisiere'], generation: 1, potentialIds: ['yield'], slotCapacity: 1, rarity: 'common' };
  const state = { varieties: [kept], trials: [
    { id: 'trial-001', phase: 'kept', parentIds: kept.parents, createdAt: 100, result: kept },
    { id: 'trial-002', phase: 'archived', parentIds: archived.parents, createdAt: 200, result: archived },
    { id: 'trial-003', phase: 'inspected', parentIds: ['variety-001', 'lisiere'], createdAt: 300,
      result: { id: 'secret-variety', name: 'Secret Flower', signature: 'Secret Author', potentialIds: ['b1'], slotCapacity: 9, rarity: 'exceptional' } },
    { id: 'trial-004', phase: 'revealed', parentIds: revealed.parents, createdAt: 400, result: revealed },
  ] };
  const strains = [...founders, kept];
  const configuration = id => ({ activeIds: id === 'aube' ? ['yield'] : id === kept.id ? ['quality'] : [], slots: [] });
  return { state, strains, configuration };
}
const entriesFor = ({ state, strains, configuration } = fixture()) => buildJournalEntries(state, strains, configuration);
const matchedIds = (entries, filters) => filterJournalEntries(entries, filters).matches.map(entry => entry.id);

test('journal keeps founders and every trial without duplicating a kept variety', () => {
  const entries = entriesFor();
  assert.equal(entries.length, 6);
  assert.equal(entries.filter(entry => entry.strainId === 'variety-001').length, 1);
  assert.deepEqual(entries.map(entry => entry.generation), [0, 0, 1, 1, 2, 2]);
  assert.equal(entries.find(entry => entry.trialId === 'trial-003').generation, 2);
  assert.deepEqual(entries.find(entry => entry.trialId === 'trial-001').parentEntryIds, ['strain:aube', 'strain:lisiere']);
});

test('unrevealed entries never read the result or ask for its configuration', () => {
  for (const phase of ['growing', 'ready', 'inspected']) {
    const data = fixture();
    const trial = data.state.trials[2];
    trial.phase = phase;
    Object.defineProperty(trial, 'result', { get() { throw Error('Hidden result was read'); } });
    const called = [];
    const entries = buildJournalEntries(data.state, data.strains, id => { called.push(id); return data.configuration(id); });
    const hidden = entries.find(entry => entry.trialId === trial.id);
    assert.deepEqual(hidden.parentIds, ['variety-001', 'lisiere']);
    assert.deepEqual([hidden.strainId, hidden.rarity, hidden.slotCapacity], [null, null, null]);
    assert.deepEqual(hidden.potentialIds, []);
    assert.deepEqual(hidden.activeIds, []);
    assert.deepEqual(called.sort(), ['aube', 'lisiere', 'variety-001']);
  }
});

test('secret names, IDs, signature, rarity, slots and traits cannot match filters', () => {
  const entries = entriesFor();
  for (const filters of [{ query: 'secret' }, { query: 'secret-variety' }, { minSlots: 9 }]) {
    assert.deepEqual(matchedIds(entries, filters), []);
  }
  for (const filters of [{ potentialId: 'b1' }, { activeId: 'b1' }, { rarity: 'exceptional' }, { minSlots: 3 }]) {
    assert(!matchedIds(entries, filters).includes('trial:trial-003'));
  }
  const html = journalResultsHTML(filterJournalEntries(entries));
  assert(!html.includes('secret-variety'));
  assert(!html.includes('Secret Flower'));
  assert(!html.includes('Secret Author'));
  assert(!html.includes('9 emplacement'));
});

test('search matches names in both languages, identity and signature without accent sensitivity', () => {
  const entries = entriesFor();
  assert.deepEqual(matchedIds(entries, { query: ' eclat   matin ' }), ['trial:trial-001']);
  assert.deepEqual(matchedIds(entries, { query: 'zoe' }), ['trial:trial-001']);
  assert.deepEqual(matchedIds(entries, { query: 'WOODLAND' }), ['strain:lisiere']);
  assert.deepEqual(matchedIds(entries, { query: 'trial-003' }), ['trial:trial-003']);
  assert.deepEqual(matchedIds(entries, { query: 'variety-001' }), ['trial:trial-001']);
});

test('potential is independent of active and currently unused potential', () => {
  const entries = entriesFor();
  assert.deepEqual(matchedIds(entries, { potentialId: 'citrus' }), ['strain:aube', 'trial:trial-001']);
  assert.deepEqual(matchedIds(entries, { activeId: 'citrus' }), []);
  assert.deepEqual(matchedIds(entries, { activeId: 'quality' }), ['trial:trial-001']);
  assert.deepEqual(matchedIds(entries, { availableId: 'quality' }), []);
  assert.deepEqual(matchedIds(entries, { availableId: 'citrus' }), ['strain:aube', 'trial:trial-001']);
});

test('filters combine with AND and unknown capacity never passes a minimum', () => {
  const entries = entriesFor();
  assert.deepEqual(matchedIds(entries, { potentialId: 'floral', rarity: 'exceptional', minSlots: 3, status: 'archived' }), ['trial:trial-002']);
  assert.deepEqual(matchedIds(entries, { activeId: 'quality', rarity: 'common' }), []);
  assert.deepEqual(matchedIds(entries, { minSlots: 1, status: 'pending' }), ['trial:trial-004']);
});

test('status includes revealed and unrevealed pending trials while preserving terminal entries', () => {
  const entries = entriesFor();
  assert.deepEqual(matchedIds(entries, { status: 'pending' }), ['trial:trial-004', 'trial:trial-003']);
  assert.deepEqual(matchedIds(entries, { status: 'kept' }), ['trial:trial-001']);
  assert.deepEqual(matchedIds(entries, { status: 'archived' }), ['trial:trial-002']);
  assert.deepEqual(matchedIds(entries, { status: 'founder' }), ['strain:aube', 'strain:lisiere']);
});

test('ancestor filter follows multiple generations and does not count the ancestor itself', () => {
  const entries = entriesFor();
  assert.deepEqual(matchedIds(entries, { ancestorId: 'lisiere' }), ['trial:trial-001', 'trial:trial-004', 'trial:trial-002', 'trial:trial-003']);
  assert.deepEqual(matchedIds(entries, { parentId: 'lisiere' }), ['trial:trial-001', 'trial:trial-004', 'trial:trial-003']);
  assert.deepEqual(matchedIds(entries, { ancestorId: 'variety-001' }), ['trial:trial-002', 'trial:trial-003']);
});

test('filtered results retain ancestors as context, never siblings or extra matches', () => {
  const result = filterJournalEntries(entriesFor(), { query: 'trial-002' });
  assert.equal(result.totalMatches, 1);
  assert.equal(result.totalEntries, 6);
  assert.deepEqual([...result.matchIds], ['trial:trial-002']);
  assert.deepEqual([...result.contextIds].sort(), ['strain:aube', 'strain:lisiere', 'trial:trial-001']);
  assert(!result.entries.some(entry => entry.trialId === 'trial-003' || entry.trialId === 'trial-004'));
  const html = journalResultsHTML(result);
  assert(html.includes('Ancêtre · contexte'));
  assert(html.includes('Descendants directs'));
  assert(html.includes('href="#journal-trial%3Atrial-002"'));
});

test('matching cards precede a closed ancestor disclosure without losing context or links', () => {
  const result = filterJournalEntries(entriesFor(), { potentialId: 'b1', minSlots: 3 });
  assert.equal(result.totalMatches, 1);
  assert.equal(result.contextIds.size, 3);
  const html = journalResultsHTML(result);
  const disclosureIndex = html.indexOf('<details class="journal-ancestors">');
  assert(disclosureIndex > html.indexOf('<article id="journal-trial%3Atrial-002"'));
  assert(!html.slice(disclosureIndex, html.indexOf('>', disclosureIndex)).includes(' open'));
  assert(html.includes('Ancêtres de contexte (3)'));
  for (const id of result.contextIds) {
    const anchor = `journal-${encodeURIComponent(id)}`;
    assert(html.indexOf(`<article id="${anchor}"`) > disclosureIndex);
    assert.equal(html.split(`<article id="${anchor}"`).length - 1, 1);
    assert(html.includes(`href="#${anchor}"`));
  }
  assert(journalResultsHTML(result, { lang: 'en' }).includes('Ancestors for context (3)'));
});

test('unfiltered journal keeps the complete generation tree without a disclosure', () => {
  const entries = entriesFor();
  const result = filterJournalEntries(entries);
  const html = journalResultsHTML(result);
  assert.equal(result.contextIds.size, 0);
  assert(!html.includes('<details'));
  assert.equal((html.match(/<article /g) || []).length, entries.length);
  assert(html.indexOf('<h3>Génération 0</h3>') < html.indexOf('<h3>Génération 1</h3>'));
  assert(html.indexOf('<h3>Génération 1</h3>') < html.indexOf('<h3>Génération 2</h3>'));
});

test('following an ancestor link opens its disclosure before scrolling and focusing', () => {
  const disclosure = { open: false }, calls = [];
  const target = {
    closest(selector) { assert.equal(selector, '.journal-ancestors'); return disclosure; },
    scrollIntoView(options) { assert(disclosure.open); assert.equal(options.block, 'nearest'); calls.push('scroll'); },
    focus(options) { assert(disclosure.open); assert.equal(options.preventScroll, true); calls.push('focus'); },
  };
  assert.equal(focusJournalEntry(target), true);
  assert.deepEqual(calls, ['scroll', 'focus']);
  assert.equal(focusJournalEntry(null), false);
});

test('archived entries are readable but have no reuse, research or export action', () => {
  const entry = entriesFor().find(item => item.status === 'archived');
  const result = { entries: [entry], contextIds: new Set() };
  const html = journalResultsHTML(result, { canUse: true });
  assert(html.includes('Exceptionnelle'));
  assert(!html.includes('data-journal-use'));
  assert(!html.includes('data-journal-research'));
  assert(!html.includes('data-journal-download'));
});

test('kept actions respect canUse while slot consultation and export remain available', () => {
  const entry = entriesFor().find(item => item.status === 'kept');
  const result = { entries: [entry], contextIds: new Set() };
  const disabled = journalResultsHTML(result, { canUse: false });
  assert(!disabled.includes('data-journal-use'));
  assert(disabled.includes('data-journal-research="variety-001"'));
  assert(disabled.includes('data-journal-download="trial-001"'));
  const enabled = journalResultsHTML(result, { canUse: id => id === 'variety-001' });
  assert(enabled.includes('data-journal-use="variety-001"'));
});

test('HTML escapes user text and has equivalent translation keys', () => {
  const data = fixture();
  data.state.varieties[0].name = '<img src=x onerror=alert(1)>';
  data.state.varieties[0].signature = '<script>attack</script>';
  const html = journalResultsHTML(filterJournalEntries(entriesFor(data)), { lang: 'en' });
  assert(!html.includes('<img'));
  assert(!html.includes('<script>'));
  assert(html.includes('&lt;img'));
  assert.deepEqual(Object.keys(JOURNAL_STRINGS.fr).sort(), Object.keys(JOURNAL_STRINGS.en).sort());
});

test('empty results communicate that filtering did not delete the journal', () => {
  const entries = entriesFor();
  const result = filterJournalEntries(entries, { query: 'no-such-entry' });
  assert.equal(result.entries.length, 0);
  assert.equal(result.totalEntries, 6);
  assert(journalResultsHTML(result).includes('Les essais restent dans le journal'));
  assert.equal(filterJournalEntries(entries, {}).totalMatches, 6);
});

test('building and filtering never modify state, strain data or configuration', () => {
  const data = fixture();
  const before = JSON.stringify({ state: data.state, strains: data.strains });
  const config = { activeIds: ['quality'], slots: [{ id: 'slot-0', traitId: 'quality' }] };
  const entries = buildJournalEntries(data.state, data.strains, () => config);
  entries.find(entry => entry.strainId === 'variety-001').activeIds.push('citrus');
  filterJournalEntries(entries, { ancestorId: 'aube', activeId: 'quality' });
  assert.equal(JSON.stringify({ state: data.state, strains: data.strains }), before);
  assert.deepEqual(config.activeIds, ['quality']);
});
