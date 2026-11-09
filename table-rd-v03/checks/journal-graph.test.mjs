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
function sample(segment, t) {
  const inverse = 1 - t;
  const axis = key => segment.type === 'C'
    ? inverse ** 3 * segment.from[key] + 3 * inverse ** 2 * t * segment.control1[key] + 3 * inverse * t ** 2 * segment.control2[key] + t ** 3 * segment.to[key]
    : segment.type === 'Q' ? inverse ** 2 * segment.from[key] + 2 * inverse * t * segment.control[key] + t ** 2 * segment.to[key]
      : inverse * segment.from[key] + t * segment.to[key];
  return { x: axis('x'), y: axis('y') };
}
function hullTouchesInterior(segment, node) {
  const points = [segment.from, segment.to, segment.control, segment.control1, segment.control2].filter(Boolean);
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
  return maxX > node.x && minX < node.x + node.width && maxY > node.y && minY < node.y + node.height;
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
  assert.deepEqual(buildJournalGraph([]), { nodes: [], edges: [], width: 96, height: 96 });
});

test('portrait cards have fixed dimensions, no overlap, generation columns and enough interior margin', () => {
  const graph = buildJournalGraph(family());
  for (const node of graph.nodes) {
    assert.equal(node.width, 208); assert.equal(node.height, 228);
    assert.equal(node.x, 48 + node.entry.generation * (208 + 110));
    assert(node.x >= 48 && node.x + node.width <= graph.width - 48);
    assert(node.y >= 48 && node.y + node.height <= graph.height - 48);
    for (const other of graph.nodes) {
      if (node.id === other.id) continue;
      assert(node.x + node.width <= other.x || other.x + other.width <= node.x || node.y + node.height <= other.y || other.y + other.height <= node.y);
    }
  }
  const column = graph.nodes.filter(n => n.entry.generation === 0).sort((a, b) => a.y - b.y);
  assert.equal(column[1].y - column[0].y - column[0].height, GRAPH_LAYOUT.gapY);
});

test('long-generation routes stay outside every intermediate card and inside the graph', () => {
  const entries = [entry('x', 0), entry('y', 0), entry('z', 0)];
  for (let generation = 1; generation <= 4; generation++) {
    entries.push(entry(`a${generation}`, generation, generation === 1 ? ['x', 'y'] : [`a${generation - 1}`, 'x']));
    entries.push(entry(`b${generation}`, generation, generation === 1 ? ['y', 'z'] : [`b${generation - 1}`, 'z']));
    entries.push(entry(`c${generation}`, generation, [`a${generation - 1}`]));
  }
  const graph = buildJournalGraph(entries);
  assert(graph.edges.some(e => e.route.kind === 'outer'));
  for (const edge of graph.edges) {
    const segments = edge.route.segments, from = graph.nodes.find(n => n.id === edge.from), to = graph.nodes.find(n => n.id === edge.to);
    assert.equal(segments[0].from.x, from.x + from.width);
    assert.equal(segments.at(-1).to.x, to.x);
    assert(segments[0].from.y > from.y && segments[0].from.y < from.y + from.height);
    assert(segments.at(-1).to.y > to.y && segments.at(-1).to.y < to.y + to.height);
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      if (index) assert.deepEqual(segment.from, segments[index - 1].to);
      // A Bezier stays inside its control hull: disjoint bounding hulls prove card avoidance.
      for (const node of graph.nodes) assert.equal(hullTouchesInterior(segment, node), false, `${edge.from}>${edge.to} control hull intersects ${node.id}`);
      for (let tick = 0; tick <= 40; tick++) {
        const p = sample(segment, tick / 40);
        assert(p.x >= 0 && p.y >= 0 && p.x <= graph.width && p.y <= graph.height);
      }
    }
    assert(edge.path.includes(edge.route.kind === 'outer' ? ' Q ' : ' C '));
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


test('adjacent relations use independent cubic curves and separate card ports without a common bus', () => {
  const graph = buildJournalGraph(family());
  const adjacent = graph.edges.filter(edge => edge.route.kind === 'adjacent');
  assert(adjacent.length > 1);
  for (const edge of adjacent) {
    assert.equal(edge.route.segments.length, 1); assert.equal(edge.route.segments[0].type, 'C');
    assert(!edge.path.includes(' L ')); assert(!edge.path.includes(' Q '));
  }
  assert.equal(new Set(adjacent.map(edge => edge.path)).size, adjacent.length);
  for (const node of graph.nodes) {
    const outgoing = graph.edges.filter(edge => edge.from === node.id).map(edge => edge.route.segments[0].from.y);
    const incoming = graph.edges.filter(edge => edge.to === node.id).map(edge => edge.route.segments.at(-1).to.y);
    assert.equal(new Set(outgoing).size, outgoing.length);
    assert.equal(new Set(incoming).size, incoming.length);
  }
});

test('unrelated long relations never merge into shared vertical corridor segments', () => {
  const entries = [entry('x', 0), entry('y', 0), entry('z', 0), entry('a', 1, ['x', 'y']), entry('b', 2, ['a', 'x']), entry('c', 2, ['a', 'y']), entry('d', 3, ['b', 'x']), entry('e', 3, ['c', 'z'])];
  const graph = buildJournalGraph(entries);
  const verticals = graph.edges.flatMap(edge => edge.route.segments.filter(s => s.type === 'L' && s.from.x === s.to.x).map(segment => ({ edge, segment })));
  for (let a = 0; a < verticals.length; a++) {
    for (let b = a + 1; b < verticals.length; b++) {
      const first = verticals[a], second = verticals[b];
      if (first.edge.id === second.edge.id) continue;
      assert.notEqual(first.segment.from.x, second.segment.from.x, 'Every long link owns its corridor lane');
    }
  }
});

test('sibling ordering follows parent positions independently of input name order', () => {
  const graph = buildJournalGraph([entry('x', 0), entry('y', 0), entry('z', 0), entry('a-bottom', 1, ['y', 'z']), entry('z-top', 1, ['x', 'y'])]);
  assert(graph.nodes.find(n => n.id === 'z-top').y < graph.nodes.find(n => n.id === 'a-bottom').y);
});
