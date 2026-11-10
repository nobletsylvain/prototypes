import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJournalLayout, JOURNAL_LAYOUTS } from '../source/journal-layouts.mjs';
import { buildJournalGraph } from '../source/journal-graph.mjs';

function entriesOfSize(size) {
  const entries = [0, 1, 2].map(index => ({ id: `founder-${index}`, generation: 0, createdAt: 0, parentEntryIds: [], status: 'founder', known: true }));
  for (let index = 3; index < size; index++) {
    const parents = [entries[Math.max(0, index - 4)], entries[index % 3]];
    entries.push({ id: `trial-${String(index).padStart(3, '0')}`, generation: Math.max(...parents.map(parent => parent.generation)) + 1, createdAt: index, parentEntryIds: [...new Set(parents.map(parent => parent.id))], status: 'kept', known: true });
  }
  return entries.slice(0, size);
}
const geometry = graph => ({ nodes: graph.nodes.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })), edges: graph.edges.map(({ id, path }) => ({ id, path })), width: graph.width, height: graph.height });
const pairs = edges => edges.map(edge => `${edge.from}>${edge.to}`).sort();
function assertGeometry(graph) {
  assert(Number.isFinite(graph.width) && graph.width > 0);
  assert(Number.isFinite(graph.height) && graph.height > 0);
  for (const node of graph.nodes) {
    for (const key of ['x', 'y', 'width', 'height']) assert(Number.isFinite(node[key]), `${node.id}.${key}`);
    assert(node.x >= 0 && node.y >= 0 && node.x + node.width <= graph.width + 1e-8 && node.y + node.height <= graph.height + 1e-8, node.id);
    for (const other of graph.nodes) if (node.id !== other.id) assert(node.x + node.width <= other.x || other.x + other.width <= node.x || node.y + node.height <= other.y || other.y + other.height <= node.y, `${node.id} overlaps ${other.id}`);
  }
  for (const edge of graph.edges) assert(!/NaN|Infinity/.test(edge.path), edge.id);
}

for (const count of [25, 60]) for (const layout of JOURNAL_LAYOUTS) test(`${layout}: ${count} entries have finite nonoverlapping geometry without state mutation`, () => {
  const entries = entriesOfSize(count), before = JSON.stringify(entries);
  const graph = buildJournalLayout(entries, new Set(), false, { layout, focusId: entries[10].id });
  assertGeometry(graph);
  assert.equal(JSON.stringify(entries), before);
  assert.equal(graph.totalCount, count);
  assert.equal(graph.visibleCount, graph.nodes.length);
  assert.equal(new Set(graph.nodes.map(node => node.id)).size, graph.nodes.length);
  if (layout !== 'family') {
    assert.equal(graph.nodes.length, count);
    assert.deepEqual(pairs(graph.edges), pairs(buildJournalGraph(entries).edges));
  }
});

for (const layout of JOURNAL_LAYOUTS) test(`${layout}: filter changes do not reposition nodes or reroute edges`, () => {
  const entries = entriesOfSize(25), options = { layout, focusId: entries[10].id };
  const unfiltered = buildJournalLayout(entries, new Set(), false, options);
  for (const matches of [new Set([entries[10].id]), new Set([entries[22].id]), new Set(), new Set(['missing'])]) {
    const filtered = buildJournalLayout(entries, matches, true, options);
    assert.deepEqual(geometry(filtered), geometry(unfiltered));
    const canonical = buildJournalGraph(entries, matches, true);
    for (const node of filtered.nodes) {
      const source = canonical.nodes.find(item => item.id === node.id);
      assert.equal(node.match, source.match); assert.equal(node.lineage, source.lineage);
    }
    for (const edge of filtered.edges) assert.equal(edge.highlighted, canonical.edges.find(item => item.id === edge.id).highlighted);
  }
});

test('circle rings are chronological, complete and upright', () => {
  const entries = entriesOfSize(25), graph = buildJournalLayout(entries, new Set(), false, { layout: 'circle' });
  assert.deepEqual(graph.rings.map(ring => ring.label), [...new Set(entries.map(entry => entry.generation))].map(generation => `G${generation}`));
  assert(graph.rings.every((ring, index) => !index || ring.r > graph.rings[index - 1].r));
  for (const node of graph.nodes) assert.equal(node.width, 150);
});

test('family shows only exact direct relationships with no duplicated ancestors', () => {
  const entries = entriesOfSize(25), focusId = entries[10].id;
  const graph = buildJournalLayout(entries, new Set(), false, { layout: 'family', focusId });
  const base = buildJournalGraph(entries);
  const exactEdges = base.edges.filter(edge => edge.from === focusId || edge.to === focusId);
  const exactIds = new Set([focusId, ...exactEdges.flatMap(edge => [edge.from, edge.to])]);
  assert.deepEqual(new Set(graph.nodes.map(node => node.id)), exactIds);
  assert.deepEqual(pairs(graph.edges), pairs(exactEdges));
  assert.equal(graph.focusId, focusId);
  assert(graph.nodes.length < entries.length);
});

test('a high-degree founder family lays its many children into a bounded-height grid', () => {
  const entries = [{ id: 'a', generation: 0 }, { id: 'b', generation: 0 }, ...Array.from({ length: 58 }, (_, index) => ({ id: `child-${index}`, generation: 1, parentEntryIds: ['a', 'b'] }))];
  const graph = buildJournalLayout(entries, new Set(), false, { layout: 'family', focusId: 'a' });
  assertGeometry(graph); assert(graph.height < 1200); assert.equal(graph.visibleCount, 59); assert.equal(graph.edges.length, 58);
});

test('unknown focus and unsupported layout fall back deterministically', () => {
  const entries = entriesOfSize(25);
  const graph = buildJournalLayout(entries, new Set(), false, { layout: 'family', focusId: 'missing' });
  assert.equal(graph.focusId, entries.at(-1).id);
  assert.deepEqual(buildJournalLayout(entries, new Set(), false, { layout: 'invalid' }), buildJournalLayout(entries));
  for (const layout of JOURNAL_LAYOUTS) {
    assertGeometry(buildJournalLayout([], new Set(), true, { layout }));
    assertGeometry(buildJournalLayout([{ id: 'single', generation: 0 }], new Set(), false, { layout }));
  }
});

test('input ordering and repeated calls preserve layout geometry and hidden public entries', () => {
  const entries = entriesOfSize(25); entries.at(-1).known = false; entries.at(-1).status = 'pending';
  for (const layout of JOURNAL_LAYOUTS) {
    const options = { layout, focusId: entries.at(-1).id }, graph = buildJournalLayout(entries, new Set(), false, options);
    assert.deepEqual(graph, buildJournalLayout(entries, new Set(), false, options));
    assert.deepEqual(geometry(graph), geometry(buildJournalLayout([...entries].reverse(), new Set(), false, options)));
    assert.equal(graph.nodes.find(node => node.id === entries.at(-1).id).entry.known, false);
    assert.equal(graph.nodes.find(node => node.id === entries.at(-1).id).entry.name, undefined);
  }
});
