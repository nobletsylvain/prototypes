import test from 'node:test';
import assert from 'node:assert/strict';
import { VISUAL_AXES, VISUAL_PALETTE, founderVisual, inheritVisual, validateVisual, getVisualPhenotype } from '../source/visual-genetics.mjs';
import * as model from '../source/model.mjs';
import * as legacy from '../source/model-v3.mjs';
import { createTestDiscovery } from '../source/test-session.mjs';

const parent = id => ({ id, visual: founderVisual(id) });
const reload = state => model.restoreState(JSON.stringify(state));
function action(api, state, type, extra = {}) {
  const outcome = api.transition(state, { type, trialId: state.activeTrialId, ...(type === 'START' ? {qualitySeed:0} : {}), ...extra }, 1000 + state.revision);
  assert.equal(outcome.ok, true, outcome.error); return outcome.state;
}
function seedFor(api, state, parentIds, predicate) {
  const outcome = api.getOdds(state, parentIds).outcomes.find(predicate);
  assert(outcome); return outcome.seedStart + Math.floor(outcome.count / 2);
}
function currentCareer() {
  let prepared=createTestDiscovery('legendary');assert(prepared.ok,prepared.error);
  let state=action(model,prepared.state,'REVEAL');state=action(model,state,'KEEP',{name:'Saved legendary',signature:'Original signature'});
  const child=state.varieties.at(-1);
  prepared=createTestDiscovery('rare',state,child.id);assert(prepared.ok,prepared.error);
  state=action(model,prepared.state,'REVEAL');return action(model,state,'ARCHIVE');
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

test('potential and capacity inheritance remains identical to the original model for every base outcome', () => {
  for(const parentIds of [['x','y'],['x','z'],['y','z']]){
    const current=model.createState(),old=legacy.createState(),before=legacy.getOdds(old,parentIds),after=model.getOdds(current,parentIds);
    for(const field of ['outcomes','potentialOdds','capacityOdds','affinity','generation'])assert.deepEqual(after[field],before[field]);
    for(const outcome of before.outcomes){
      const command={type:'START',parentIds,seed:outcome.seedStart,qualitySeed:0,requestId:'same'};
      const next=model.transition(current,command,0).state,previous=legacy.transition(old,command,0).state;
      for(const field of ['id','potentialIds','slotCapacity','taste','effect','parents','generation'])assert.deepEqual(next.trials[0].result[field],previous.trials[0].result[field]);
      assert.deepEqual(next.inventory,previous.inventory);assert.deepEqual(next.trials[0].batch,previous.trials[0].batch);
    }
  }
});

test('visual identity has no dependence on trial sequence, time or gesture precision', () => {
  const command = { type: 'START', qualitySeed: 0, parentIds: ['x', 'z'], seed: 650000000, requestId: 'first' };
  let first = model.transition(model.createState(), { ...command, pressure: 0, x: -99, elapsed: 0 }, 1).state;
  const saved = structuredClone(first.trials[0].result.visual);
  for (const type of ['ADVANCE', 'INSPECT', 'REVEAL', 'ARCHIVE']) first = action(model, first, type);
  const second = model.transition(first, { ...command, requestId: 'second', pressure: 1, x: 50000, elapsed: 900000 }, 999999).state;
  assert.notEqual(second.trials[0].result.id, second.trials[1].result.id);
  assert.deepEqual(second.trials[1].result.visual, saved);
  const swapped = model.transition(model.createState(), { ...command, parentIds: ['z', 'x'] }, 90).state;
  assert.deepEqual(swapped.trials[0].result.visual, saved);
});

test('changing only the independent quality seed never changes pigment, surface or batch quality', () => {
  const state=model.createState(),parentIds=['x','z'],odds=model.getOdds(state,parentIds).qualityOdds;
  const command={type:'START',parentIds,seed:1704791872,requestId:'same'};
  const low=model.transition(state,{...command,qualitySeed:odds.outcomes.find(o=>o.score===34).seedStart},0).state.trials[0];
  const high=model.transition(state,{...command,qualitySeed:odds.outcomes.find(o=>o.score===74).seedStart},0).state.trials[0];
  assert.notEqual(low.result.rarity,high.result.rarity);assert.deepEqual(low.result.visual,high.result.visual);
  assert.equal(low.result.color,high.result.color);assert.deepEqual(low.result.accent,high.result.accent);
  assert.equal(low.batch.quality,'demo-standard');assert.deepEqual(low.batch,high.batch);
});

test('old schema 3 and 4 archives are rejected without rewriting resources or visual history', () => {
  const old=legacy.createState(),before=JSON.stringify(old);
  assert.throws(()=>model.restoreState(old),/unsupported schema/);assert.equal(JSON.stringify(old),before);
  const historical={...model.createState(),schema:4},saved=JSON.stringify(historical);
  assert.throws(()=>model.restoreState(historical),/unsupported schema/);assert.equal(JSON.stringify(historical),saved);
});

test('schema 5 reload preserves complete saved identity and visual provenance', () => {
  const state=currentCareer(),before=JSON.stringify(state);assert.deepEqual(reload(state),state);assert.equal(JSON.stringify(state),before);
  assert.equal(state.schema,5);assert(state.trials.every(t=>validateVisual(t.result.visual)));
});

test('saved history establishes exact parental visual provenance across all generations', () => {
  const state = currentCareer(), strains = model.getStrains(state);
  for (const trial of state.trials) {
    const parents = trial.parentIds.map(id => strains.find(strain => strain.id === id));
    assert.deepEqual(trial.result.visual, inheritVisual(parents, trial.seed));
    const phenotype = getVisualPhenotype(trial.result.visual);
    assert.equal(trial.result.color, phenotype.color); assert.deepEqual(trial.result.accent, phenotype.accent);
    const kept = state.varieties.find(variety => variety.trialId === trial.id);
    if (kept) assert.deepEqual(kept.visual, trial.result.visual);
  }
});

test('duplicate requests after reload do not redraw appearance, consume stock or award points', () => {
  const migrated = currentCareer(), target = migrated.trials.at(-1);
  const repeated = model.transition(migrated, { type: 'START', requestId: target.requestId, parentIds: ['x', 'z'], seed: 0 });
  assert.equal(repeated.ok, true); assert.equal(repeated.state, migrated);
  assert.equal(repeated.event, 'request-already-committed'); assert.deepEqual(reload(repeated.state), migrated);
});

test('activating traits and harvesting preserve every saved visual identity', () => {
  const migrated = currentCareer();
  const visuals = migrated.trials.map(t => structuredClone(t.result.visual));
  let state = action(model, migrated, 'ACTIVATE', { varietyId: 'variety-002', slotIndex: 0, traitId: migrated.varieties.find(v=>v.id==='variety-002').potentialIds[0] });
  state = action(model, state, 'HARVEST', { varietyId: 'variety-001' });
  assert.deepEqual(state.trials.map(t => t.result.visual), visuals);
  assert.deepEqual(state.varieties.map(v => v.visual), migrated.varieties.map(v => v.visual));
});

test('saved appearance tampering is rejected even when all fields remain structurally valid', () => {
  const state = currentCareer();
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
