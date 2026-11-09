import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStrainPortrait } from '../source/journal-portrait.mjs';

const publicEntry = overrides => ({
  known: true,
  id: 'strain:variety-004',
  color: '#789264',
  accent: { fr: 'Reflets mauves', en: 'Mauve glints' },
  rarity: 'rare',
  ...overrides,
});
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const references = svg => [...svg.matchAll(/url\(#([^\)]+)\)/g)].map(match => match[1]);

test('unknown portraits do not consult identity, phenotype or rarity getters', () => {
  const entry = { known: false };
  for (const key of ['id', 'color', 'accent', 'rarity', 'potentialIds', 'name']) {
    Object.defineProperty(entry, key, { get() { throw new Error(`Private field read: ${key}`); } });
  }
  const svg = renderStrainPortrait(entry, 'hidden-trial');
  assert.match(svg, /data-portrait-kind="sealed"/);
  assert.match(svg, />\?<\/text>/);
  assert.doesNotMatch(svg, /data-accent|data-body-color|mauve|gold|rare|exceptional/);
});

test('unknown appearance is identical regardless of private attributes', () => {
  const first = renderStrainPortrait(publicEntry({ known: false, color: '#ff0000', rarity: 'exceptional' }), 'same-occurrence');
  const second = renderStrainPortrait(publicEntry({ known: false, id: 'secret', color: '#0000ff', accent: 'Golden glints' }), 'same-occurrence');
  assert.equal(first, second);
  assert.equal(renderStrainPortrait(null, 'same-occurrence'), first);
});

test('public portraits use the inherited body color and documented mauve glints', () => {
  const svg = renderStrainPortrait(publicEntry({ color: '#6A9B79' }), 'mauve');
  assert.match(svg, /data-body-color="#6a9b79"/);
  assert.match(svg, /data-accent="mauve"/);
  assert.match(svg, /#c69ae7/);
  assert.ok((svg.match(/<path\b/g) || []).length > 70, 'Portrait should contain organic layered detail.');
  assert.ok((svg.match(/<circle\b/g) || []).length > 150, 'Portrait should contain fine surface detail.');
});

test('changing inherited color changes the botanical material', () => {
  const olive = renderStrainPortrait(publicEntry({ color: '#6a9b79' }), 'same');
  const violet = renderStrainPortrait(publicEntry({ color: '#aa8fbb' }), 'same');
  assert.notEqual(olive, violet);
  assert.match(violet, /data-body-color="#aa8fbb"/);
  assert.match(renderStrainPortrait(publicEntry({ color: '#AbC' })), /data-body-color="#aabbcc"/);
});

test('documented accents take precedence over the rarity fallback', () => {
  assert.match(renderStrainPortrait(publicEntry({ accent: { fr: 'Reflets dorés' }, rarity: 'common' })), /data-accent="gold"/);
  assert.match(renderStrainPortrait(publicEntry({ accent: 'Reflets doux', rarity: 'exceptional' })), /data-accent="soft"/);
  assert.match(renderStrainPortrait(publicEntry({ accent: 'Mauve glints', rarity: 'exceptional' })), /data-accent="mauve"/);
  assert.match(renderStrainPortrait(publicEntry({ accent: null, rarity: 'exceptional' })), /data-accent="gold"/);
  assert.match(renderStrainPortrait(publicEntry({ accent: null, rarity: 'common' })), /data-accent="soft"/);
});

test('same public input and occurrence prefix produce the same SVG without mutation', () => {
  const entry = publicEntry();
  Object.freeze(entry.accent); Object.freeze(entry);
  const first = renderStrainPortrait(entry, 'journal-node-4');
  assert.equal(renderStrainPortrait(entry, 'journal-node-4'), first);
  assert.equal(entry.color, '#789264');
});

test('identity variation affects the illustration without introducing new attributes', () => {
  const first = renderStrainPortrait(publicEntry({ id: 'strain:first' }), 'same');
  const second = renderStrainPortrait(publicEntry({ id: 'strain:second' }), 'same');
  const transform = svg => svg.match(/<g transform="translate\(([^\)]+)\) rotate\(([^\)]+)\)">/)?.[0];
  assert.ok(transform(first));
  assert.notEqual(transform(first), transform(second));
  assert.equal(first.match(/data-body-color="[^"]+"/)[0], second.match(/data-body-color="[^"]+"/)[0]);
  assert.equal(first.match(/data-accent="[^"]+"/)[0], second.match(/data-accent="[^"]+"/)[0]);
});

test('SVG IDs are local, valid and separated by occurrence prefix', () => {
  const first = renderStrainPortrait(publicEntry(), 'journal node 1');
  const second = renderStrainPortrait(publicEntry(), 'journal-node-1');
  const firstIds = ids(first), secondIds = ids(second);
  assert.equal(firstIds.length, new Set(firstIds).size);
  assert.ok(firstIds.every(id => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id)));
  assert.ok(firstIds.every(id => !secondIds.includes(id)), 'Sanitization collisions must be disambiguated.');
  assert.ok(references(first).every(id => firstIds.includes(id)));
  assert.ok(references(second).every(id => secondIds.includes(id)));
});

test('hostile public strings cannot inject SVG, links, handlers or CSS', () => {
  const attack = '\"><script>alert(1)</script><image href="https://invalid.example/x" onload="evil()">';
  const svg = renderStrainPortrait(publicEntry({ id: attack, color: attack, accent: { fr: attack }, rarity: attack }), attack);
  assert.doesNotMatch(svg, /<script|<image|foreignObject|\bhref=|\bon[a-z]+=|https:\/\/invalid|alert\(1\)/i);
  assert.match(svg, /data-body-color="#789264"/);
  assert.ok(ids(svg).every(id => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id)));
  assert.ok(references(svg).every(id => ids(svg).includes(id)));
});

test('both portrait states fit the shared transparent SVG contract', () => {
  for (const entry of [publicEntry(), { known: false }, undefined]) {
    const svg = renderStrainPortrait(entry);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 180 154"/);
    assert.match(svg, /aria-hidden="true" focusable="false"/);
    assert.match(svg, /<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|Infinity|<foreignObject|<iframe|<rect\b[^>]*width="180"/);
    assert.ok(references(svg).every(id => ids(svg).includes(id)));
  }
});
