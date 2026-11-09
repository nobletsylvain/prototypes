import test from 'node:test';
import assert from 'node:assert/strict';
import { PARENTS } from '../source/model.mjs';
import { inheritVisual } from '../source/visual-genetics.mjs';
import { QUALITY_TIERS } from '../source/genetic-quality.mjs';
import { tierBadge, qualityLegend, buildCertificate, certificateHTML, certificateSVG } from '../source/quality-ui.mjs';

function fixture(phase = 'kept') {
  const result = { id: 'variety-014', geneticQuality: 68, name: 'Premier nom', signature: 'S.',
    potentialIds: ['citrus', 'b1'], slotCapacity: 3, parents: ['x', 'z'], generation: 2,
    visual: inheritVisual([PARENTS[0], PARENTS[2]], 12345) };
  const trial = { id: 'trial-014', phase, parentIds: ['x', 'z'], result,
    odds: { qualityOdds: { center: 54 } }, batch: { id: 'batch-014', quality: 'demo-standard', quantity: 1, unit: 'specimen' } };
  return { trials: [trial], varieties: phase === 'kept' ? [{ ...structuredClone(result), trialId: trial.id, name: 'Nom conservé' }] : [],
    research: { 'variety-014': { choices: { 'slot-0': 'citrus' } } } };
}

test('every hidden phase returns before result, varieties or research getters are read', () => {
  for (const phase of ['compose', 'growing', 'ready', 'inspected', 'unknown']) {
    const state = fixture(phase);
    Object.defineProperty(state.trials[0], 'result', { get() { throw Error('Hidden result read'); } });
    for (const key of ['varieties', 'research']) Object.defineProperty(state, key, { get() { throw Error(`Hidden ${key} read`); } });
    assert.equal(buildCertificate(state, 'trial-014'), null);
  }
  assert.equal(buildCertificate(null, 'missing'), null);
  assert.equal(buildCertificate(fixture(), 'missing'), null);
  assert.equal(certificateHTML(null), ''); assert.equal(certificateSVG(null), '');
});

test('kept variety supplies current name without consulting its old result', () => {
  const state = fixture(); Object.defineProperty(state.trials[0], 'result', { get() { throw Error('Unnecessary result read'); } });
  const certificate = buildCertificate(state, 'trial-014');
  assert.equal(certificate.name, 'Nom conservé'); assert.equal(certificate.id, 'COA-V04-variety-014');
  assert.equal(certificate.geneticQuality, 68); assert.equal(certificate.tier.id, 'rare');
  assert.equal(certificate.center, 54); assert.equal(certificate.delta, 14);
  assert.deepEqual(certificate.parents.map(parent => [parent.id, parent.geneticQuality]), [['x', 24], ['z', 84]]);
});

test('revealed and archived results do not query specialization configuration', () => {
  for (const phase of ['revealed', 'archived']) {
    const state = fixture(phase); Object.defineProperty(state, 'research', { get() { throw Error('Configuration must not be read'); } });
    const certificate = buildCertificate(state, 'trial-014');
    assert.equal(certificate.name, 'Premier nom'); assert.equal(certificate.configurable, false);
    assert.deepEqual(certificate.activated, []); assert.equal(certificate.features.length, 8);
  }
});

test('the certificate separates inherited potentials, activated traits and observed batch', () => {
  const certificate = buildCertificate(fixture(), 'trial-014');
  assert.deepEqual(certificate.inherited.map(item => item.id), ['citrus', 'b1']);
  assert.deepEqual(certificate.activated.map(item => item.id), ['citrus']);
  assert.deepEqual(certificate.batch, { id: 'batch-014', quality: 'demo-standard', quantity: 1, unit: 'specimen' });
  assert.equal(certificate.geneticQuality, 68); assert.equal(certificate.features.length, 8);
  const html = certificateHTML(certificate);
  assert(html.includes('Identité du lot')); assert(html.includes('Qualité du lot')); assert(html.includes('data-export-coa="trial-014"'));
  assert(html.includes('data-portrait-kind="strain"')); assert.doesNotMatch(html, /THC|CBD|mg\/g|% de/);
});

test('renaming updates the display name without altering identity, score or origin', () => {
  const state = fixture(), before = buildCertificate(state, 'trial-014');
  state.varieties[0].name = 'Un autre nom'; const after = buildCertificate(state, 'trial-014');
  assert.notEqual(before.name, after.name);
  for (const field of ['id', 'strainId', 'trialId', 'geneticQuality', 'tier', 'parents', 'center', 'delta', 'visual', 'batch']) assert.deepEqual(before[field], after[field]);
});

test('certificate construction neither mutates nor retains mutable state references', () => {
  const state = fixture(), before = JSON.stringify(state), certificate = buildCertificate(state, 'trial-014');
  assert.equal(JSON.stringify(state), before); assert(Object.isFrozen(certificate));
  assert(Object.isFrozen(certificate.visual.alleles)); assert(Object.isFrozen(certificate.parents));
  assert.notEqual(certificate.visual, state.varieties[0].visual);
  state.trials[0].batch.quality = 'changed'; assert.equal(certificate.batch.quality, 'demo-standard');
});

test('badges and legend use all six exact boundaries and both languages', () => {
  for (const tier of QUALITY_TIERS) for (const score of [tier.min, tier.max]) {
    const badge = tierBadge(score, 'en'); assert(badge.includes(tier.color)); assert(badge.includes(tier.name.en)); assert(badge.includes(`${score}<small>/100`));
  }
  assert(tierBadge(null).includes('Non révélé')); assert(tierBadge(101, 'en').includes('Unrevealed'));
  const legend = qualityLegend('fr'); assert.equal((legend.match(/role="listitem"/g) || []).length, 6);
  for (const range of ['0–19', '20–39', '40–59', '60–79', '80–99', '>100<']) assert(legend.includes(range));
});

test('English test certificate translates public labels without changing fixed data', () => {
  const fr = buildCertificate(fixture(), 'trial-014'), en = buildCertificate(fixture(), 'trial-014', 'en', true);
  assert.equal(en.id, fr.id); assert.equal(en.geneticQuality, fr.geneticQuality); assert.equal(en.testMode, true); assert.equal(en.demo, true);
  const html = certificateHTML(en), svg = certificateSVG(en);
  for (const label of ['Certificate of Analysis', 'Test mode', 'Inherited potentials', 'Batch quality']) { assert(html.includes(label)); assert(svg.includes(label)); }
});

test('all user text is escaped in both HTML and self-contained SVG', () => {
  const attack = '\"><script>alert(1)</script><image href="https://invalid.example/x" onload="evil()"> &';
  const state = fixture(); state.varieties[0].name = attack; state.varieties[0].signature = attack;
  state.trials[0].batch.id = attack; state.trials[0].batch.quality = attack;
  const certificate = buildCertificate(state, 'trial-014');
  for (const output of [certificateHTML(certificate), certificateSVG(certificate)]) {
    assert.doesNotMatch(output, /<script|<image\b|<foreignObject|<iframe|\shref="https:|\sonload="/i);
    assert(output.includes('&lt;script&gt;')); assert(output.includes('&amp;'));
  }
});

test('SVG export remains finite with long labels and resolves every local portrait reference', () => {
  const state = fixture(); state.varieties[0].name = 'Long name '.repeat(20); state.varieties[0].signature = 'Signature'.repeat(20);
  const svg = certificateSVG(buildCertificate(state, 'trial-014'));
  assert.match(svg, /^<svg [^>]*width="960" height="\d+"/); assert.match(svg, /<\/svg>$/); assert.doesNotMatch(svg, /NaN|Infinity/);
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert([...svg.matchAll(/url\(#([^\)]+)\)/g)].every(match => ids.includes(match[1])));
});
