import test from 'node:test';
import assert from 'node:assert/strict';
import { VISUAL_AXES, VISUAL_PALETTE, founderVisual, inheritVisual, validateVisual, getVisualPhenotype } from '../source/visual-genetics.mjs';
import * as model from '../source/model.mjs';
import * as legacy from '../source/model-v3.mjs';

const parent = id => ({ id, visual: founderVisual(id) });
const reload = state => model.restoreState(JSON.stringify(state));
function action(api, state, type, extra = {}) {
  const outcome = api.transition(state, { type, trialId: state.activeTrialId, ...extra }, 1000 + state.revision);
  assert.equal(outcome.ok, true, outcome.error); return outcome.state;
}
function seedFor(api, state, parentIds, predicate) {
  const outcome = api.getOdds(state, parentIds).outcomes.find(predicate);
  assert(outcome); return outcome.seedStart + Math.floor(outcome.count / 2);
}
function nonvisual(state) {
  const copy = structuredClone(state); copy.schema = 3;
  for (const identity of [...copy.trials.map(trial => trial.result), ...copy.varieties]) {
    delete identity.visual; delete identity.color; delete identity.accent;
  }
  return copy;
}
function legacyCareer() {
  let state = legacy.createState();
  const states = [state], commands = [];
  const run = (type, extra = {}) => {
    const command = { type, trialId: state.activeTrialId, ...extra }, at = 1000 + state.revision;
    state = action(legacy, state, type, extra); states.push(state); commands.push({ command, at });
  };
  run('START', { parentIds: ['y', 'x'], seed: seedFor(legacy, state, ['y', 'x'], o => o.slotCapacity === 5 && o.potentialIds.length === 4), requestId: 'legacy-bridge' });
  run('ADVANCE'); run('INSPECT'); run('REVEAL'); run('KEEP', { name: 'Saved bridge', signature: 'Original signature' });
  run('ACTIVATE', { varietyId: 'x', slotIndex: 0, traitId: 'citrus' });
  run('HARVEST', { varietyId: 'variety-001' });
  run('START', { parentIds: ['variety-001', 'z'], seed: seedFor(legacy, state, ['variety-001', 'z'], o => o.rarity === 'exceptional'), requestId: 'legacy-child' });
  run('ADVANCE'); run('INSPECT'); run('REVEAL'); run('KEEP', { name: 'Saved descendant', signature: 'Second signature' });
  run('HARVEST', { varietyId: 'variety-002' });
  run('START', { parentIds: ['variety-002', 'x'], seed: seedFor(legacy, state, ['variety-002', 'x'], o => o.rarity === 'rare'), requestId: 'legacy-grandchild' });
  run('ADVANCE'); run('INSPECT'); run('REVEAL'); run('ARCHIVE');
  return { state, states, commands };
}

test('founders retain their central phenotype with two numeric alleles and stable family markers', () => {
  assert.deepEqual(VISUAL_PALETTE, { olive: '#1c4f24', lime: '#789629', mauve: '#6e387a' });
  const expected = {
    x: ['compact', 25, 75, 80, 70, 'olive', 35, 25],
    y: ['spire', 85, 35, 25, 30, 'lime', 65, 30],
    z: ['cluster', 50, 70, 55, 55, 'mauve', 50, 80],
  };
  for (const id of ['x', 'y', 'z']) {
    const visual = founderVisual(id);
    assert.equal(validateVisual(visual), visual); assert.equal(visual.version, 1);
    VISUAL_AXES.forEach((axis, index) => {
      const center = expected[id][index];
      const pair = typeof center === 'number' ? [Math.max(0, center - 15), Math.min(100, center + 15)] : [center, center];
      assert.deepEqual(visual.alleles[axis], pair);
      if (typeof center === 'number') assert.equal(getVisualPhenotype(visual)[axis], center / 100);
    });
    assert.deepEqual(model.PARENTS.find(p => p.id === id).visual, visual);
  }
  const mutable = founderVisual('x'); mutable.alleles.frost[0] = 99;
  assert.deepEqual(founderVisual('x').alleles.frost, [10, 40]);
});

test('every axis inherits strictly one existing allele from each canonical parent', () => {
  const parents = [parent('z'), parent('x')], before = structuredClone(parents);
  for (const seed of [0, 1, 17, 1073741824, 4294967295]) {
    const result = inheritVisual(parents, seed);
    for (const axis of VISUAL_AXES) {
      assert(parents[1].visual.alleles[axis].includes(result.alleles[axis][0]));
      assert(parents[0].visual.alleles[axis].includes(result.alleles[axis][1]));
    }
    assert.deepEqual(result, inheritVisual([...parents].reverse(), seed));
  }
  assert.deepEqual(parents, before);
});

test('successive crosses preserve grandparent alleles and can express either inherited side', () => {
  const intermediate = { id: 'xy', visual: inheritVisual([parent('x'), parent('y')], 25) };
  const observed = Object.fromEntries(VISUAL_AXES.map(axis => [axis, new Set()]));
  for (let seed = 0; seed < 96; seed++) {
    const child = inheritVisual([intermediate, parent('z')], seed);
    for (const axis of VISUAL_AXES) {
      assert(intermediate.visual.alleles[axis].includes(child.alleles[axis][0]));
      assert(founderVisual('z').alleles[axis].includes(child.alleles[axis][1]));
      observed[axis].add(child.alleles[axis][0]);
    }
  }
  for (const axis of VISUAL_AXES) assert.equal(observed[axis].size, new Set(intermediate.visual.alleles[axis]).size, `Every retained grandparent allele transmitted for ${axis}`);
});

test('phenotype normalizes means, chooses an inherited shape and blends pigment RGB only', () => {
  const visual = inheritVisual([parent('x'), parent('y')], 123);
  Object.assign(visual.alleles, { elongation: [25, 85], fullness: [75, 35], leafWidth: [80, 25], foliage: [70, 30], pistil: [35, 65], frost: [25, 30] });
  const before = structuredClone(visual);
  const phenotype = getVisualPhenotype(visual);
  assert.equal(phenotype.elongation, .55); assert.equal(phenotype.fullness, .55);
  assert.equal(phenotype.leafWidth, .525); assert.equal(phenotype.foliage, .5);
  assert.equal(phenotype.pistil, .5); assert.equal(phenotype.frost, .275);
  assert(visual.alleles.shape.includes(phenotype.shape));
  assert.deepEqual(phenotype.pigmentBlend, ['lime', 'olive']); assert.equal(phenotype.color, '#4a7327');
  assert(phenotype.accent.fr && phenotype.accent.en && phenotype.signature.fr && phenotype.signature.en);
  assert.deepEqual(visual, before); assert.deepEqual(getVisualPhenotype(visual), phenotype);
});

test('visual draws are deterministic and do not call Math.random or read UI or rarity', () => {
  const parents = [parent('x'), parent('z')];
  for (const p of parents) Object.defineProperties(p, {
    rarity: { get() { throw Error('Rarity was consulted'); } },
    points: { get() { throw Error('Research was consulted'); } },
    coordinates: { get() { throw Error('UI was consulted'); } },
  });
  const oldRandom = Math.random;
  Math.random = () => { throw Error('Nondeterministic random was called'); };
  try {
    const first = inheritVisual(parents, 3737844653);
    assert.deepEqual(first, inheritVisual(parents, 3737844653));
    assert.deepEqual(getVisualPhenotype(first), getVisualPhenotype(structuredClone(first)));
  } finally { Math.random = oldRandom; }
});

test('version 1 has a fixed saved-seed reference independent of future rendering changes', () => {
  const visual = inheritVisual([parent('x'), parent('z')], 0);
  assert.deepEqual(visual, {
    version: 1,
    alleles: { shape: ['compact', 'cluster'], elongation: [10, 35], fullness: [60, 55], leafWidth: [65, 70], foliage: [85, 40], pigment: ['olive', 'mauve'], pistil: [20, 65], frost: [10, 65] },
    expressionSeed: 26488715,
  });
  const phenotype = getVisualPhenotype(visual);
  assert.equal(phenotype.shape, 'compact'); assert.equal(phenotype.color, '#45444f');
});

test('visual validation refuses missing axes, unknown alleles, unsupported fields and seeds', () => {
  const mutations = [
    v => { v.version = 2; }, v => { v.expressionSeed = -1; }, v => { v.expressionSeed = 2 ** 32; },
    v => { v.expressionSeed = 1.5; }, v => { delete v.alleles.frost; },
    v => { v.alleles.pigment[0] = 'gold'; }, v => { v.alleles.shape[1] = 'unknown'; },
    v => { v.alleles.foliage = [50]; }, v => { v.alleles.frost[1] = 101; },
    v => { v.alleles.pistil[0] = .5; }, v => { v.alleles.leafWidth[1] = NaN; },
    v => { v.alleles.elongation = Array(2); }, v => { v.alleles.elongation = Object.assign([20, ,], { extra: 30 }); },
    v => { v.potency = 90; }, v => { v.alleles.cycle = [1, 1]; },
  ];
  for (const mutate of mutations) { const visual = founderVisual('x'); mutate(visual); assert.throws(() => validateVisual(visual), /Invalid visual genetics/); }
  for (const visual of [null, undefined, {}, []]) assert.throws(() => getVisualPhenotype(visual), /Invalid visual genetics/);
  assert.throws(() => founderVisual('missing'), /unknown founder/);
  assert.throws(() => inheritVisual([parent('x'), parent('x')], 1), /distinct parents/);
  assert.throws(() => inheritVisual([parent('x'), parent('z')], -1), /inheritance seed/);
});

test('normal odds and every base inheritance outcome remain exactly equal to schema 3', () => {
  for (const parentIds of [['x', 'y'], ['x', 'z'], ['y', 'z']]) {
    const current = model.createState(), old = legacy.createState();
    assert.deepEqual(model.getOdds(current, parentIds), legacy.getOdds(old, parentIds));
    for (const outcome of legacy.getOdds(old, parentIds).outcomes) {
      const command = { type: 'START', parentIds, seed: outcome.seedStart, requestId: 'same' };
      const next = model.transition(current, command, 0).state, previous = legacy.transition(old, command, 0).state;
      assert.deepEqual(nonvisual(next), nonvisual(previous));
    }
  }
});

test('visual identity has no dependence on trial sequence, time or gesture precision', () => {
  const command = { type: 'START', parentIds: ['x', 'z'], seed: 650000000, requestId: 'first' };
  let first = model.transition(model.createState(), { ...command, pressure: 0, x: -99, elapsed: 0 }, 1).state;
  const saved = structuredClone(first.trials[0].result.visual);
  for (const type of ['ADVANCE', 'INSPECT', 'REVEAL', 'ARCHIVE']) first = action(model, first, type);
  const second = model.transition(first, { ...command, requestId: 'second', pressure: 1, x: 50000, elapsed: 900000 }, 999999).state;
  assert.notEqual(second.trials[0].result.id, second.trials[1].result.id);
  assert.deepEqual(second.trials[1].result.visual, saved);
  const swapped = model.transition(model.createState(), { ...command, parentIds: ['z', 'x'] }, 90).state;
  assert.deepEqual(swapped.trials[0].result.visual, saved);
});

test('pigment and surface are independent of rarity and never change batch quality', () => {
  const state = model.createState(), parents = ['x', 'z'];
  const commonSeed = seedFor(model, state, parents, outcome => outcome.rarity === 'common');
  const rareSeed = seedFor(model, state, parents, outcome => outcome.rarity === 'rare');
  const common = action(model, state, 'START', { parentIds: parents, seed: commonSeed, requestId: 'common' }).trials[0];
  const rare = action(model, state, 'START', { parentIds: parents, seed: rareSeed, requestId: 'rare' }).trials[0];
  assert.notEqual(common.result.rarity, rare.result.rarity);
  assert.deepEqual(common.result.visual.alleles.pigment, rare.result.visual.alleles.pigment);
  assert.equal(common.result.color, rare.result.color); assert.deepEqual(common.result.accent, rare.result.accent);
  for (const trial of [common, rare]) assert.deepEqual(trial.result.visual, inheritVisual(parents.map(id => model.PARENTS.find(parent => parent.id === id)), trial.seed));
  assert.equal(common.batch.quality, 'demo-standard'); assert.deepEqual(common.batch, rare.batch);
});

test('schema 3 replay preserves resources, names, points, genealogy, outcomes and odds at every phase', () => {
  const career = legacyCareer();
  let current = model.createState();
  assert.deepEqual(nonvisual(current), nonvisual(career.states[0]));
  for (let index = 0; index < career.commands.length; index++) {
    const { command, at } = career.commands[index];
    const applied = model.transition(current, command, at); assert.equal(applied.ok, true, applied.error); current = applied.state;
    const old = career.states[index + 1], before = JSON.stringify(old), migrated = model.restoreState(old);
    assert.equal(migrated.schema, 4); assert.equal(JSON.stringify(old), before);
    assert.deepEqual(nonvisual(migrated), nonvisual(old)); assert.deepEqual(migrated, current);
    assert.deepEqual(migrated.history, old.history); assert.equal(migrated.revision, old.revision);
    for (const trial of migrated.trials) assert.equal(validateVisual(trial.result.visual), trial.result.visual);
    assert.deepEqual(reload(migrated), migrated);
  }
  for (const parents of [['variety-001', 'z'], ['variety-002', 'x']]) assert.deepEqual(model.getOdds(current, parents), legacy.getOdds(career.state, parents));
});

test('legacy state is validated exactly before any appearance initialization', () => {
  const old = legacyCareer().state;
  for (const mutate of [s => { s.trials[0].result.color = '#ffffff'; }, s => { s.inventory.pop(); }, s => { s.research.x.earned++; }, s => { s.trials[0].seed++; }, s => { s.history[0].command.visual = founderVisual('z'); }]) {
    const damaged = structuredClone(old); mutate(damaged); const before = JSON.stringify(damaged);
    assert.throws(() => model.restoreState(damaged), /Invalid research state/); assert.equal(JSON.stringify(damaged), before);
  }
  assert.throws(() => model.validateState(old), /unsupported schema/);
  assert.throws(() => model.restoreState({ schema: 3, history: [] }), /Invalid research state/);
});

test('migrated history establishes exact parental visual provenance across all generations', () => {
  const state = model.restoreState(legacyCareer().state), strains = model.getStrains(state);
  for (const trial of state.trials) {
    const parents = trial.parentIds.map(id => strains.find(strain => strain.id === id));
    assert.deepEqual(trial.result.visual, inheritVisual(parents, trial.seed));
    const phenotype = getVisualPhenotype(trial.result.visual);
    assert.equal(trial.result.color, phenotype.color); assert.deepEqual(trial.result.accent, phenotype.accent);
    const kept = state.varieties.find(variety => variety.trialId === trial.id);
    if (kept) assert.deepEqual(kept.visual, trial.result.visual);
  }
});

test('duplicate requests after migration do not redraw appearance, consume stock or award points', () => {
  const migrated = model.restoreState(legacyCareer().state), target = migrated.trials.at(-1);
  const repeated = model.transition(migrated, { type: 'START', requestId: target.requestId, parentIds: ['x', 'z'], seed: 0 });
  assert.equal(repeated.ok, true); assert.equal(repeated.state, migrated);
  assert.equal(repeated.event, 'request-already-committed'); assert.deepEqual(reload(repeated.state), migrated);
});

test('activating traits and harvesting preserve every saved visual identity', () => {
  const migrated = model.restoreState(legacyCareer().state);
  const visuals = migrated.trials.map(t => structuredClone(t.result.visual));
  let state = action(model, migrated, 'ACTIVATE', { varietyId: 'variety-002', slotIndex: 0, traitId: 'b1' });
  state = action(model, state, 'HARVEST', { varietyId: 'variety-001' });
  assert.deepEqual(state.trials.map(t => t.result.visual), visuals);
  assert.deepEqual(state.varieties.map(v => v.visual), migrated.varieties.map(v => v.visual));
});

test('saved appearance tampering is rejected even when all fields remain structurally valid', () => {
  const state = model.restoreState(legacyCareer().state);
  const mutations = [
    s => { s.trials[0].result.visual.alleles.elongation[0] = 99; },
    s => { s.trials[0].result.visual.expressionSeed = (s.trials[0].result.visual.expressionSeed + 1) >>> 0; },
    s => { s.varieties[0].visual.alleles.pigment[0] = 'mauve'; },
    s => { s.trials[0].result.color = '#ffffff'; },
    s => { s.varieties[0].accent.fr = 'Changed'; },
    s => { delete s.trials[0].result.visual; },
  ];
  for (const mutate of mutations) {
    const damaged = structuredClone(state); mutate(damaged);
    assert.throws(() => model.restoreState(damaged), /Invalid (research state|visual genetics)/);
    assert.throws(() => model.transition(damaged, { type: 'HARVEST', varietyId: 'x' }), /Invalid (research state|visual genetics)/);
  }
});

test('different saved seeds produce measurable F1 dimensions using only parental numeric alleles', () => {
  const parents = [parent('x'), parent('y')];
  const numericAxes = VISUAL_AXES.filter(axis => !['shape', 'pigment'].includes(axis));
  const expressions = Object.fromEntries(numericAxes.map(axis => [axis, new Set()]));
  const signatures = new Set();
  for (let seed = 0; seed < 96; seed++) {
    const visual = inheritVisual(parents, seed), phenotype = getVisualPhenotype(visual);
    assert.deepEqual(visual, inheritVisual(parents, seed));
    for (const axis of numericAxes) {
      const [first, second] = visual.alleles[axis];
      assert(parents[0].visual.alleles[axis].includes(first)); assert(parents[1].visual.alleles[axis].includes(second));
      assert(first >= 0 && first <= 100 && second >= 0 && second <= 100);
      const lower = (Math.min(...parents[0].visual.alleles[axis]) + Math.min(...parents[1].visual.alleles[axis])) / 200;
      const upper = (Math.max(...parents[0].visual.alleles[axis]) + Math.max(...parents[1].visual.alleles[axis])) / 200;
      assert(phenotype[axis] >= lower && phenotype[axis] <= upper);
      expressions[axis].add(phenotype[axis]);
    }
    signatures.add(JSON.stringify(numericAxes.map(axis => phenotype[axis])));
  }
  for (const axis of numericAxes) {
    assert.equal(expressions[axis].size, 3, `${axis} exposes the three bounded inherited means`);
    assert(Math.max(...expressions[axis]) - Math.min(...expressions[axis]) >= .299999);
  }
  assert(signatures.size > 20, 'F1 draws have visibly distinct dimensional combinations without mutation');
});
