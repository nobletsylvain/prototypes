import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJournalGraph, GRAPH_LAYOUT } from '../source/journal-graph.mjs';
import { buildJournalEntries } from '../source/journal.mjs';
import { createState, getStrains } from '../source/model.mjs';
import { createTestDiscovery } from '../source/test-session.mjs';

const entry = (id, generation, parentEntryIds = [], extra = {}) => ({ id, generation, parentEntryIds, createdAt: 0, ...extra });
const family = () => [
  entry('x', 0), entry('y', 0), entry('z', 0),
  entry('a', 1, ['x', 'y']), entry('b', 1, ['x', 'z']),
  entry('c', 2, ['a', 'b']), entry('d', 2, ['b', 'z']),
];
const geometry = graph => ({
  width: graph.width, height: graph.height,
  nodes: graph.nodes.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
  edges: graph.edges.map(({ id, from, to, path }) => ({ id, from, to, path })),
});
const edgePairs = edges => edges.map(edge => `${edge.from}>${edge.to}`).sort();
function points(path) {
  const tokens = path.match(/-?\d+(?:\.\d+)?/g).map(Number);
  return Array.from({ length: tokens.length / 2 }, (_, index) => ({ x: tokens[index * 2], y: tokens[index * 2 + 1] }));
}
function intersectsInterior(a, b, node) {
  if (a.x === b.x) return a.x > node.x && a.x < node.x + node.width && Math.max(a.y, b.y) > node.y && Math.min(a.y, b.y) < node.y + node.height;
  assert.equal(a.y, b.y, 'Routes remain orthogonal');
  return a.y > node.y && a.y < node.y + node.height && Math.max(a.x, b.x) > node.x && Math.min(a.x, b.x) < node.x + node.width;
}
function deepFreeze(value) {
  Object.values(value).forEach(child => { if (child && typeof child === 'object') deepFreeze(child); });
  return Object.freeze(value);
}

test('two-parent topology shares each ancestor card exactly once', () => {
  const graph = buildJournalGraph(family());
  assert.equal(graph.nodes.length, 7); assert.equal(new Set(graph.nodes.map(node => node.id)).size, 7);
  assert.deepEqual(edgePairs(graph.edges), ['a>c', 'b>c', 'b>d', 'x>a', 'x>b', 'y>a', 'z>b', 'z>d']);
  assert.equal(new Set(graph.edges.map(edge => edge.id)).size, 8);
  assert(graph.nodes.every(node => node.match && node.lineage)); assert(graph.edges.every(edge => edge.highlighted));
});

test('filters and zero matches never alter card positions, routes or graph extent', () => {
  const entries = family(), normal = buildJournalGraph(entries);
  for (const matches of [new Set(['c']), new Set(['x', 'd']), new Set(), new Set(['missing'])]) {
    assert.deepEqual(geometry(buildJournalGraph(entries, matches, true)), geometry(normal));
  }
});

test('a match highlights only its exact ancestors and upstream edges, retaining unrelated descendants', () => {
  const graph = buildJournalGraph(family(), new Set(['a']), true);
  assert.deepEqual(graph.nodes.filter(n => n.match).map(n => n.id), ['a']);
  assert.deepEqual(graph.nodes.filter(n => n.lineage).map(n => n.id).sort(), ['a', 'x', 'y']);
  assert.deepEqual(edgePairs(graph.edges.filter(e => e.highlighted)), ['x>a', 'y>a']);
  assert.equal(graph.nodes.length, 7); assert.equal(graph.edges.length, 8);
  assert(graph.nodes.filter(n => ['b', 'c', 'd', 'z'].includes(n.id)).every(n => !n.match && !n.lineage));
});

test('shared ancestry is traversed fully once with no unrelated branch highlighted', () => {
  const graph = buildJournalGraph(family(), new Set(['c']), true);
  assert.deepEqual(graph.nodes.filter(n => n.lineage).map(n => n.id).sort(), ['a', 'b', 'c', 'x', 'y', 'z']);
  assert.deepEqual(edgePairs(graph.edges.filter(e => e.highlighted)), ['a>c', 'b>c', 'x>a', 'x>b', 'y>a', 'z>b']);
  assert.equal(graph.nodes.find(n => n.id === 'd').lineage, false);
});

test('multiple matches include their full path union even when one match is an ancestor', () => {
  const graph = buildJournalGraph(family(), new Set(['a', 'd']), true);
  assert.deepEqual(graph.nodes.filter(n => n.match).map(n => n.id).sort(), ['a', 'd']);
  assert.deepEqual(edgePairs(graph.edges.filter(e => e.highlighted)), ['b>d', 'x>a', 'x>b', 'y>a', 'z>b', 'z>d']);
});

test('zero matches dim the complete graph and empty input returns finite dimensions', () => {
  const graph = buildJournalGraph(family(), new Set(), true);
  assert(graph.nodes.every(n => !n.match && !n.lineage)); assert(graph.edges.every(e => !e.highlighted));
  assert.equal(graph.nodes.length, 7); assert.equal(graph.edges.length, 8);
  assert.deepEqual(buildJournalGraph([]), { nodes: [], edges: [], width: 92, height: 64 });
});

test('cards have fixed dimensions, no overlap, generation rows and enough interior margin', () => {
  const graph = buildJournalGraph(family());
  for (const node of graph.nodes) {
    assert.equal(node.width, 196); assert.equal(node.height, 118);
    assert.equal(node.y, 32 + node.entry.generation * (118 + 96));
    assert(node.x >= 32 && node.x + node.width <= graph.width - 32);
    assert(node.y >= 32 && node.y + node.height <= graph.height - 32);
    for (const other of graph.nodes) {
      if (node.id === other.id) continue;
      assert(node.x + node.width <= other.x || other.x + other.width <= node.x || node.y + node.height <= other.y || other.y + other.height <= node.y);
    }
  }
  const row = graph.nodes.filter(n => n.entry.generation === 0).sort((a, b) => a.x - b.x);
  assert.equal(row[1].x - row[0].x - row[0].width, GRAPH_LAYOUT.gapX);
});

test('long-generation routes stay outside every intermediate card and inside the graph', () => {
  const entries = [entry('x', 0), entry('y', 0), entry('z', 0)];
  for (let generation = 1; generation <= 4; generation++) {
    entries.push(entry(`a${generation}`, generation, generation === 1 ? ['x', 'y'] : [`a${generation - 1}`, 'x']));
    entries.push(entry(`b${generation}`, generation, generation === 1 ? ['y', 'z'] : [`b${generation - 1}`, 'z']));
    entries.push(entry(`c${generation}`, generation, [`a${generation - 1}`]));
  }
  const graph = buildJournalGraph(entries);
  assert(graph.edges.some(e => points(e.path).length === 6));
  for (const edge of graph.edges) {
    const route = points(edge.path), from = graph.nodes.find(n => n.id === edge.from), to = graph.nodes.find(n => n.id === edge.to);
    assert.deepEqual(route[0], { x: from.x + from.width / 2, y: from.y + from.height });
    assert.deepEqual(route.at(-1), { x: to.x + to.width / 2, y: to.y });
    assert(route.every(p => p.x >= 0 && p.y >= 0 && p.x <= graph.width && p.y <= graph.height));
    for (let index = 1; index < route.length; index++) {
      for (const node of graph.nodes) assert.equal(intersectsInterior(route[index - 1], route[index], node), false, `${edge.from}>${edge.to} intersects ${node.id}`);
    }
  }
});

test('input order and filter order do not affect deterministic geometry', () => {
  const entries = family();
  assert.deepEqual(geometry(buildJournalGraph([...entries].reverse())), geometry(buildJournalGraph(entries)));
  assert.deepEqual(buildJournalGraph(entries, new Set(['a', 'd']), true), buildJournalGraph(entries, new Set(['d', 'a']), true));
});

test('public entry data and input sets remain unmodified and hidden properties are never read', () => {
  const entries = family().map(item => deepFreeze(item));
  Object.freeze(entries);
  const matches = new Set(['c']), before = JSON.stringify(entries);
  const graph = buildJournalGraph(entries, matches, true);
  assert.equal(JSON.stringify(entries), before); assert.deepEqual([...matches], ['c']);
  graph.nodes.forEach(node => assert.equal(node.entry, entries.find(item => item.id === node.id)));
  const hidden = entry('hidden', 1, ['x'], { known: false });
  Object.defineProperties(hidden, {
    result: { get() { throw Error('Private result read'); } },
    potentialIds: { get() { throw Error('Potential read by layout'); } },
    rarity: { get() { throw Error('Rarity read by layout'); } },
  });
  assert.equal(buildJournalGraph([entry('x', 0), hidden]).nodes.length, 2);
});

test('missing parents are not invented and duplicate parent IDs do not duplicate links', () => {
  const graph = buildJournalGraph([entry('x', 0), entry('a', 1, ['x', 'x', 'missing', 'a'])]);
  assert.equal(graph.nodes.length, 2); assert.deepEqual(edgePairs(graph.edges), ['x>a']);
});

test('real public journal projection retains an unrevealed trial without exposing its outcome', () => {
  const state = createTestDiscovery('exceptional').state;
  const entries = buildJournalEntries(state, getStrains(state));
  const target = entries.find(item => item.trialId === state.activeTrialId);
  assert.equal(target.known, false); assert.equal(target.rarity, null); assert.deepEqual(target.potentialIds, []);
  const graph = buildJournalGraph(entries, new Set([target.id]), true);
  assert.equal(graph.nodes.length, 5); assert.equal(graph.edges.length, 4);
  assert.equal(graph.nodes.find(node => node.id === target.id).entry, target);
  assert(graph.edges.every(edge => edge.highlighted));
  assert.equal(buildJournalGraph(buildJournalEntries(createState(), getStrains(createState()))).nodes.length, 3);
});
