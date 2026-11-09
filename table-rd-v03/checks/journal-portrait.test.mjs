import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStrainPortrait } from '../source/journal-portrait.mjs';
import { founderVisual } from '../source/visual-genetics.mjs';
import { createHeadGeometry, projectHeadGeometry } from '../source/head-geometry.mjs';
const entry = (visual = founderVisual('x')) => ({ known: true, visual });
const changed = (key, value) => { const visual = structuredClone(founderVisual('x')); visual.alleles[key] = [value, value]; return visual; };
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const refs = svg => [...svg.matchAll(/url\(#([^\)]+)\)/g)].map(match => match[1]);

test('unknown silhouette never reads visual, identity or secret metadata', () => {
  const value = { known: false };
  for (const key of ['visual', 'id', 'color', 'accent', 'rarity', 'name', 'potentialIds'])
    Object.defineProperty(value, key, { get() { throw Error(`Private field read: ${key}`); } });
  const svg = renderStrainPortrait(value, 'hidden');
  assert.match(svg, /data-portrait-kind="sealed"/); assert.match(svg, />\?<\/text>/);
  assert.doesNotMatch(svg, /data-shape|data-body-color|data-facet/);
  assert.equal(svg, renderStrainPortrait(null, 'hidden'));
});
test('known portrait reads only its visual genotype', () => {
  const value = entry();
  for (const key of ['id', 'color', 'accent', 'rarity', 'name', 'potentialIds'])
    Object.defineProperty(value, key, { get() { throw Error(`Unrelated field read: ${key}`); } });
  assert.match(renderStrainPortrait(value), /data-portrait-kind="strain"/);
});
test('journal faces are exactly the projected shared loupe mesh', () => {
  const value = entry(), faces = projectHeadGeometry(createHeadGeometry(value.visual));
  const svg = renderStrainPortrait(value);
  assert.equal((svg.match(/data-facet=/g) || []).length, faces.length); assert.ok(faces.length > 60);
  for (const face of faces) assert(svg.includes(`data-facet="${face.index}"`));
});
test('inherited shape and proportions visibly change the projected head', () => {
  assert.notEqual(renderStrainPortrait(entry(changed('shape', 'compact'))), renderStrainPortrait(entry(changed('shape', 'spire'))));
  for (const key of ['elongation', 'fullness', 'leafWidth', 'foliage'])
    assert.notEqual(renderStrainPortrait(entry(changed(key, 0))), renderStrainPortrait(entry(changed(key, 100))));
});
test('pigment and surface alter facets independently of unrelated rarity metadata', () => {
  const olive = entry(changed('pigment', 'olive')), mauve = entry(changed('pigment', 'mauve'));
  assert.notEqual(renderStrainPortrait(olive), renderStrainPortrait(mauve));
  assert.match(renderStrainPortrait(mauve), /data-body-color="#6e387a"/);
  assert.equal(renderStrainPortrait({ ...olive, id: 'a', rarity: 'exceptional', color: '#ffffff' }), renderStrainPortrait({ ...olive, id: 'b', rarity: 'common', color: '#000000' }));
  assert.notEqual(renderStrainPortrait(entry(changed('frost', 0))), renderStrainPortrait(entry(changed('frost', 100))));
});
test('identical genotype and prefix reproduce the SVG without mutation', () => {
  const visual = founderVisual('z'), before = JSON.stringify(visual);
  assert.equal(renderStrainPortrait(entry(visual), 'n4'), renderStrainPortrait(entry(visual), 'n4'));
  assert.equal(JSON.stringify(visual), before);
});
test('local SVG IDs are unique across sanitized occurrence prefixes', () => {
  for (const value of [entry(), { known: false }]) {
    const a = renderStrainPortrait(value, 'node 1'), b = renderStrainPortrait(value, 'node-1');
    assert.equal(ids(a).length, new Set(ids(a)).size);
    assert(ids(a).every(id => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id) && !ids(b).includes(id)));
    assert(refs(a).every(id => ids(a).includes(id)));
  }
});
test('hostile prefix and unused strings cannot inject SVG content', () => {
  const attack = '\"><script>alert(1)</script><image href="https://invalid.example/x" onload="evil()">';
  const svg = renderStrainPortrait({ ...entry(), id: attack, color: attack, accent: attack }, attack);
  assert.doesNotMatch(svg, /<script|<image|foreignObject|\bhref=|\bon[a-z]+=|https:\/\/invalid|alert\(1\)/i);
  assert(ids(svg).every(id => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id)));
});
test('missing visual data has a bounded explicit display fallback', () => {
  assert.equal(renderStrainPortrait({ known: true }), renderStrainPortrait({ known: true, visual: { version: -1 } }));
});
test('both states preserve the transparent accessible SVG envelope', () => {
  for (const value of [entry(), { known: false }, undefined]) {
    const svg = renderStrainPortrait(value);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 180 154"/);
    assert.match(svg, /aria-hidden="true" focusable="false"/); assert.match(svg, /<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|Infinity|<foreignObject|<iframe|<rect\b[^>]*width="180"/);
    assert(refs(svg).every(id => ids(svg).includes(id)));
  }
});
