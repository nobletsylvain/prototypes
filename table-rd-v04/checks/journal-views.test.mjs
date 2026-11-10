import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJournalEntries, filterJournalEntries, journalGraphHTML, renderJournal } from '../source/journal.mjs';
import { buildJournalLayout, JOURNAL_LAYOUTS } from '../source/journal-layouts.mjs';

function fixture() {
  const make = (id, parents = [], generation = 0) => ({
    id, name: id, parents, generation, potentialIds: ['citrus'], slotCapacity: 3,
    geneticQuality: 45, color: '#6d8c41', accent: 'Reflets olive',
  });
  const founders = ['a', 'b', 'c'].map(id => make(id));
  const first = { ...make('branch-one', ['a', 'b'], 1), trialId: 'one' };
  const second = { ...make('branch-two', ['branch-one', 'c'], 2), trialId: 'two' };
  const archived = make('archived-branch', ['a', 'c'], 1);
  const hidden = { id: 'sealed', phase: 'inspected', parentIds: ['branch-two', 'b'], createdAt: 4 };
  Object.defineProperty(hidden, 'result', { get() { throw Error('Hidden result accessed'); } });
  const state = { varieties: [first, second], trials: [
    { id: 'one', phase: 'kept', parentIds: first.parents, createdAt: 1, result: first },
    { id: 'two', phase: 'kept', parentIds: second.parents, createdAt: 2, result: second },
    { id: 'archive', phase: 'archived', parentIds: archived.parents, createdAt: 3, result: archived },
    hidden,
  ] };
  const strains = [...founders, first, second];
  const configurationFn = () => ({ activeIds: [], slots: [] });
  return { state, strains, configurationFn, entries: buildJournalEntries(state, strains, configurationFn) };
}
const renderedEdges = html => [...html.matchAll(/data-from="([^"]+)" data-to="([^"]+)"/g)].map(match => `${match[1]}>${match[2]}`).sort();
const edgePairs = edges => edges.map(edge => `${edge.from}>${edge.to}`).sort();
const renderedIds = html => [...html.matchAll(/data-entry="([^"]+)"/g)].map(match => match[1]).sort();

for (const layout of JOURNAL_LAYOUTS) test(`${layout} HTML retains the graph's exact visible topology and node identities`, () => {
  const { entries } = fixture();
  const graph = buildJournalLayout(entries, new Set(), false, { layout, focusId: 'trial:one' });
  const html = journalGraphHTML(graph, { focusId: 'trial:one', links: 'all' });
  assert.deepEqual(renderedEdges(html), edgePairs(graph.edges));
  assert.deepEqual(renderedIds(html), graph.nodes.map(node => node.id).sort());
  for (const node of graph.nodes) {
    const nodeHTML = html.match(new RegExp(`<button[^>]*data-entry="${node.id}"[^>]*>`))?.[0];
    assert(nodeHTML, node.id);
    assert(nodeHTML.includes(`data-tree-action="${node.entry.configurable ? 'research' : 'inspect'}"`), node.id);
  }
});

test('focused links preserve both parents and direct children without displaying unrelated edges', () => {
  const { entries } = fixture(), focusId = 'trial:one';
  for (const layout of ['generations', 'circle']) {
    const graph = buildJournalLayout(entries, new Set(), false, { layout, focusId });
    const html = journalGraphHTML(graph, { focusId, links: 'focus' });
    assert.deepEqual(renderedEdges(html), ['strain:a>trial:one', 'strain:b>trial:one', 'trial:one>trial:two'].sort());
    assert.equal(renderedIds(html).length, entries.length);
    assert(html.includes('journal-node is-current'));
  }
});

test('search-focused links display exact complete result ancestry instead of the unrelated starting point', () => {
  const { entries } = fixture(), result = filterJournalEntries(entries, { query: 'branch-two' });
  for (const layout of ['generations', 'circle']) {
    const graph = buildJournalLayout(entries, result.matchIds, true, { layout, focusId: 'trial:archive' });
    const html = journalGraphHTML(graph, { filtered: true, focusId: 'trial:archive', links: 'focus' });
    assert.deepEqual(renderedEdges(html), ['strain:a>trial:one', 'strain:b>trial:one', 'strain:c>trial:two', 'trial:one>trial:two'].sort());
    assert.equal(renderedIds(html).length, entries.length);
    assert.equal((html.match(/class="journal-edge is-highlighted"/g) || []).length, 4);
  }
});

test('no-match focused views retain every public node and reveal no spurious relationship', () => {
  const { entries } = fixture();
  for (const layout of ['generations', 'circle']) {
    const graph = buildJournalLayout(entries, new Set(), true, { layout, focusId: 'trial:one' });
    const html = journalGraphHTML(graph, { filtered: true, focusId: 'trial:one', links: 'focus' });
    assert.equal(renderedEdges(html).length, 0);
    assert.equal(renderedIds(html).length, entries.length);
    assert(!html.includes('journal-node is-match'));
  }
});

test('every layout can focus a sealed trial without reading or disclosing its outcome', () => {
  const { entries } = fixture();
  for (const layout of JOURNAL_LAYOUTS) {
    const graph = buildJournalLayout(entries, new Set(['trial:sealed']), true, { layout, focusId: 'trial:sealed' });
    const html = journalGraphHTML(graph, { filtered: true, focusId: 'trial:sealed', links: 'focus' });
    const nodeHTML = html.match(/<button[^>]*data-entry="trial:sealed"[\s\S]*?<\/button>/)?.[0];
    assert(nodeHTML);
    assert(nodeHTML.includes('data-known="false"'));
    assert(nodeHTML.includes('data-strain=""'));
    assert(nodeHTML.includes('data-tree-action="inspect"'));
    assert(!nodeHTML.includes('journal-quality-badge'));
    assert(!nodeHTML.includes('Reflets olive'));
    assert(!nodeHTML.includes('citrus'));
  }
});

test('view controls and starting-point options are drawn solely from the public journal', () => {
  const data = fixture(), boundary = new Error('Mount boundary');
  let html = '';
  const host = { set innerHTML(value) { html = value; }, querySelector() { throw boundary; } };
  assert.throws(() => renderJournal(host, data), error => error === boundary);
  for (const layout of JOURNAL_LAYOUTS) assert(html.includes(`data-layout="${layout}"`));
  const options = html.match(/class="journal-focus-select">([\s\S]*?)<\/select>/)?.[1];
  assert(options);
  assert.equal((options.match(/<option /g) || []).length, data.entries.length);
  assert(options.includes('value="trial:sealed"'));
  assert(options.includes('Essai non révélé'));
  assert(!options.includes('100/100'));
});
