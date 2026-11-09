import test from 'node:test';
import assert from 'node:assert/strict';
import { HEAD_MASTERS } from '../source/head-masters.mjs';
import { createHeadGeometry, projectHeadGeometry } from '../source/head-geometry.mjs';
import { founderVisual } from '../source/visual-genetics.mjs';
const visualFor = (shape, values = {}) => {
  const visual = structuredClone(founderVisual('y')); visual.alleles.shape = [shape, shape];
  for (const [key, value] of Object.entries(values)) visual.alleles[key] = [value, value];
  return visual;
};
test('frozen V05 topologies retain every source facet and a common presentation height', () => {
  for (const [shape, vertices, triangles] of [['compact', 92, 180], ['spire', 122, 240], ['cluster', 162, 320]]) {
    const master = HEAD_MASTERS[shape];
    assert.equal(master.positions.length, vertices * 3); assert.equal(master.triangles.length, triangles * 3);
    assert.equal(master.groups.length, triangles);
    assert(master.triangles.every(i => Number.isInteger(i) && i >= 0 && i < vertices));
    const y = master.positions.filter((_, i) => i % 3 === 1);
    assert.equal(Math.min(...y), 0); assert.equal(Math.max(...y), 1);
    assert.deepEqual([...new Set(master.groups)].sort(), [0, 1, 2, 3]); assert(Object.isFrozen(master.positions));
  }
});
test('192 extreme gene combinations preserve usable facets and framed portraits', () => {
  const keys = ['elongation', 'fullness', 'leafWidth', 'foliage', 'pistil', 'frost'];
  for (const shape of Object.keys(HEAD_MASTERS)) for (let mask = 0; mask < 64; mask++) {
    const visual = visualFor(shape, Object.fromEntries(keys.map((key, i) => [key, (mask >> i & 1) * 100])));
    const geometry = createHeadGeometry(visual);
    assert.deepEqual(geometry.triangles, HEAD_MASTERS[shape].triangles);
    assert(geometry.positions.every(Number.isFinite));
    for (let i = 0; i < geometry.normals.length; i += 3) assert(Math.abs(Math.hypot(...geometry.normals.slice(i, i + 3)) - 1) < 1e-10);
    assert(geometry.colors.every(color => /^#[0-9a-f]{6}$/.test(color)));
    for (const face of projectHeadGeometry(geometry)) for (const [x, y] of face.points) {
      assert(x >= 14.9 && x <= 165.1, `${shape} x ${x}`); assert(y >= 5.9 && y <= 138.1, `${shape} y ${y}`);
    }
  }
});
test('each numeric axis changes geometry or facet material', () => {
  for (const key of ['elongation', 'fullness', 'leafWidth', 'foliage', 'pistil', 'frost']) {
    const low = createHeadGeometry(visualFor('spire', { [key]: 0 })), high = createHeadGeometry(visualFor('spire', { [key]: 100 }));
    assert.notDeepEqual([low.positions, low.colors], [high.positions, high.colors], key);
  }
});
test('geometry is deterministic without modifying source or genotype', () => {
  const visual = visualFor('cluster'), before = JSON.stringify(visual), sources = JSON.stringify(HEAD_MASTERS);
  assert.deepEqual(createHeadGeometry(visual), createHeadGeometry(structuredClone(visual)));
  assert.equal(JSON.stringify(visual), before); assert.equal(JSON.stringify(HEAD_MASTERS), sources);
});
test('pigment does not replace silhouette or imply product mass', () => {
  const olive = createHeadGeometry(visualFor('compact', { pigment: 'olive' })), mauve = createHeadGeometry(visualFor('compact', { pigment: 'mauve' }));
  assert.deepEqual(olive.positions, mauve.positions); assert.notDeepEqual(olive.colors, mauve.colors);
  assert.equal('mass' in olive, false); assert.equal('grams' in olive, false);
});
