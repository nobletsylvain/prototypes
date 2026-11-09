import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJournalEntries, filterJournalEntries, journalResultsHTML, journalGraphHTML, focusJournalEntry, renderJournal, JOURNAL_STRINGS } from '../source/journal.mjs';
import { buildJournalGraph } from '../source/journal-graph.mjs';
import { QUALITY_TIERS } from '../source/model.mjs';

function fixture() {
  const founders = [
    { id: 'aube', name: { fr: 'Aube', en: 'Dawn' }, parents: [], generation: 0, potentialIds: ['citrus', 'yield'], slotCapacity: 2, rarity: 'common', geneticQuality: 30 },
    { id: 'lisiere', name: { fr: 'Lisière', en: 'Woodland' }, parents: [], generation: 0, potentialIds: ['floral'], slotCapacity: 1, rarity: 'common', geneticQuality: 30 },
  ];
  const kept = { id: 'variety-001', trialId: 'trial-001', name: 'Éclat du matin', signature: 'Zoé', parents: ['aube', 'lisiere'], generation: 1, potentialIds: ['citrus', 'quality'], slotCapacity: 2, rarity: 'rare', geneticQuality: 69 };
  const archived = { id: 'variety-002', name: '', parents: ['variety-001', 'aube'], generation: 2, potentialIds: ['floral', 'b1'], slotCapacity: 3, rarity: 'legendary', geneticQuality: 100 };
  const revealed = { id: 'variety-004', parents: ['aube', 'lisiere'], generation: 1, potentialIds: ['yield'], slotCapacity: 1, rarity: 'common', geneticQuality: 30 };
  const state = { varieties: [kept], trials: [
    { id: 'trial-001', phase: 'kept', parentIds: kept.parents, createdAt: 100, result: kept },
    { id: 'trial-002', phase: 'archived', parentIds: archived.parents, createdAt: 200, result: archived },
    { id: 'trial-003', phase: 'inspected', parentIds: ['variety-001', 'lisiere'], createdAt: 300,
      result: { id: 'secret-variety', name: 'Secret Flower', signature: 'Secret Author', potentialIds: ['b1'], slotCapacity: 9, rarity: 'legendary', geneticQuality: 100 } },
    { id: 'trial-004', phase: 'revealed', parentIds: revealed.parents, createdAt: 400, result: revealed },
  ] };
  const strains = [...founders, kept];
  const configuration = id => ({ activeIds: id === 'aube' ? ['yield'] : id === kept.id ? ['quality'] : [], slots: [] });
  return { state, strains, configuration };
}
const entriesFor = ({ state, strains, configuration } = fixture()) => buildJournalEntries(state, strains, configuration);
const matchedIds = (entries, filters) => filterJournalEntries(entries, filters).matches.map(entry => entry.id);

test('documented colour and visual signature are projected only for revealed strains and can be searched', () => {
  const data = fixture(); data.strains[0].color = '#aabbcc'; data.strains[0].accent = {fr:'Reflets mauves',en:'Mauve glints'};
  Object.defineProperty(data.state.trials[2], 'result', {get(){throw Error('Hidden appearance accessed');}});
  const entries = entriesFor(data), founder = entries.find(entry => entry.strainId === 'aube'), hidden = entries.find(entry => !entry.known);
  assert.equal(founder.color, '#aabbcc'); assert.equal(founder.accent.fr, 'Reflets mauves');
  assert.equal(hidden.color, null); assert.equal(hidden.accent, null);
  assert.deepEqual(matchedIds(entries, {query:'reflets mauves'}), ['strain:aube']);
  assert.deepEqual(matchedIds(entries, {query:'mauve glints'}), ['strain:aube']);
  const html = journalGraphHTML(buildJournalGraph(entries));
  assert(html.includes('Reflets mauves')); assert(html.includes('journal-portrait')); assert(!html.includes('secret-variety'));
});

test('unsafe colour is replaced and visual signature remains escaped', () => {
  const data=fixture(); data.strains[0].color='red;position:fixed'; data.strains[0].accent={fr:'<img onerror="bad">'};
  const entries=entriesFor(data), html=journalGraphHTML(buildJournalGraph(entries));
  assert.equal(entries.find(entry=>entry.strainId==='aube').color,'#7d9b76');
  assert(!html.includes('position:fixed')); assert(!html.includes('<img')); assert(html.includes('&lt;img'));
});

test('visual tree keeps unrelated branches and marks matches separately from their ancestry', () => {
  const entries = entriesFor(), result = filterJournalEntries(entries, { query: 'eclat' });
  const html = journalGraphHTML(buildJournalGraph(entries, result.matchIds, true), { filtered: true });
  assert.equal((html.match(/class="journal-node /g) || []).length, entries.length);
  assert.equal((html.match(/class="journal-node is-match"/g) || []).length, 1);
  assert.equal((html.match(/class="journal-node is-lineage"/g) || []).length, 2);
  assert.equal((html.match(/class="journal-edge is-highlighted"/g) || []).length, 2);
  assert(html.includes('data-tree-action="research"'));
  assert(html.includes('data-tree-action="inspect"'));
});

test('visual tree does not expose hidden traits and escapes strain names in text and attributes', () => {
  const data = fixture(); data.strains[0].name = '<img src=x onerror="attack">';
  const entries = entriesFor(data), html = journalGraphHTML(buildJournalGraph(entries));
  assert(!html.includes('Secret Flower')); assert(!html.includes('secret-variety')); assert(!html.includes('Secret Author'));
  assert(!html.includes('<img')); assert(html.includes('&lt;img')); assert(html.includes('&quot;attack'));
  assert.equal((html.match(/data-tree-action="research"/g) || []).length, 3);
});

test('empty filter highlights no branch while leaving every node and link visible', () => {
  const entries = entriesFor(), result = filterJournalEntries(entries, { query: 'absent' });
  const graph = buildJournalGraph(entries, result.matchIds, true);
  const html = journalGraphHTML(graph, { filtered: true });
  assert.equal((html.match(/class="journal-node is-muted"/g) || []).length, entries.length);
  assert(!html.includes('class="journal-edge is-highlighted"'));
  assert.equal((html.match(/data-from=/g) || []).length, graph.edges.length);
});

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
    assert.deepEqual([hidden.strainId, hidden.rarity, hidden.slotCapacity, hidden.geneticQuality], [null, null, null, null]);
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
  for (const filters of [{ potentialId: 'b1' }, { activeId: 'b1' }, { rarity: 'legendary' }, { minSlots: 3 }]) {
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
  assert.deepEqual(matchedIds(entries, { potentialId: 'floral', rarity: 'legendary', minSlots: 3, status: 'archived' }), ['trial:trial-002']);
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

test('archived entries retain their COA export but have no reuse or research action', () => {
  const entry = entriesFor().find(item => item.status === 'archived');
  const result = { entries: [entry], contextIds: new Set() };
  const html = journalResultsHTML(result, { canUse: true });
  assert(html.includes('Légendaire')); assert(html.includes('100/100'));
  assert(!html.includes('data-journal-use'));
  assert(!html.includes('data-journal-research'));
  assert(html.includes('data-journal-download="trial-002"'));
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


test('six genetic tiers and scores are projected from quality, rendered on nodes and cards, and searchable', () => {
  const strains=QUALITY_TIERS.map((tier,index)=>({id:`quality-${tier.id}`,name:`Specimen ${String.fromCharCode(65+index)}`,generation:0,parents:[],potentialIds:[],slotCapacity:3,geneticQuality:tier.min,rarity:'obsolete'}));
  const entries=buildJournalEntries({trials:[],varieties:[]},strains,()=>({activeIds:[]}));
  for(const tier of QUALITY_TIERS){
    const filtered=filterJournalEntries(entries,{rarity:tier.id});assert.equal(filtered.totalMatches,1);
    assert.equal(filtered.matches[0].geneticQuality,tier.min);assert.equal(filtered.matches[0].rarity,tier.id);
  }
  for(const query of ['légendaire','legendary','100'])assert.deepEqual(matchedIds(entries,{query}),['strain:quality-legendary']);
  assert.deepEqual(matchedIds(entries,{query:'épique'}),['strain:quality-epic']);
  const cards=journalResultsHTML(filterJournalEntries(entries)),graph=journalGraphHTML(buildJournalGraph(entries),{lang:'en'});
  for(const tier of QUALITY_TIERS){assert(cards.includes(`${tier.name.fr} · ${tier.min}/100`));assert(graph.includes(`${tier.name.en} · ${tier.min}/100`));assert(cards.includes(`--tier-color:${tier.color}`));}
  assert.equal((graph.match(/class="journal-quality-badge"/g)||[]).length,6);
});

test('six-tier filter menu uses the shared catalogue and describes genetic quality separately',()=>{
  const data=fixture(),boundary=new Error('Mount boundary reached');let html='';
  const host={set innerHTML(value){html=value;},querySelector(){throw boundary;}};
  assert.throws(()=>renderJournal(host,{state:data.state,strains:data.strains,configurationFn:data.configuration}),error=>error===boundary);
  const menu=html.match(/<select name="rarity">([\s\S]*?)<\/select>/)[1];
  for(const tier of QUALITY_TIERS)assert(menu.includes(`<option value="${tier.id}">${tier.name.fr}</option>`));
  assert(!menu.includes('exceptional'));assert.equal((menu.match(/<option /g)||[]).length,7);
  assert(html.includes('La qualité génétique est distincte'));
});

test('quality score and certificate remain inaccessible throughout all hidden phases',()=>{
  for(const phase of ['growing','ready','inspected']){
    const data=fixture(),trial=data.state.trials[2];trial.phase=phase;Object.defineProperty(trial,'result',{get(){throw Error('Secret quality read');}});
    const entry=entriesFor(data).find(e=>e.trialId===trial.id);assert.equal(entry.geneticQuality,null);assert.equal(entry.rarity,null);
    const result={entries:[entry],contextIds:new Set()},html=journalResultsHTML(result),graph=journalGraphHTML(buildJournalGraph([entry]));
    assert(!html.includes('journal-quality-badge'));assert(!html.includes('data-journal-download'));assert(!graph.includes('journal-quality-badge'));
    for(const query of ['legendary','légendaire','100'])assert.equal(filterJournalEntries([entry],{query}).totalMatches,0);
  }
});

test('all revealed trial phases offer COA export while founders do not',()=>{
  const entries=entriesFor();
  for(const phase of ['revealed','kept','archived']){
    const entry=entries.find(e=>e.phase===phase),html=journalResultsHTML({entries:[entry],contextIds:new Set()});
    assert(html.includes(`data-journal-download="${entry.trialId}"`));assert(html.includes('certificat (COA)'));
  }
  const founder=entries.find(e=>e.status==='founder');assert(!journalResultsHTML({entries:[founder],contextIds:new Set()}).includes('data-journal-download'));
});
