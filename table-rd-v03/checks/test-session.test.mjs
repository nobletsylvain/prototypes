import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, getOdds, getConfiguration, transition, restoreState, validateState } from '../source/model.mjs';
import { NORMAL_SAVE_KEY, TEST_SAVE_KEY, getTestSeed, createTestDiscovery } from '../source/test-session.mjs';

const reload = state => restoreState(JSON.stringify(state));
function step(state, type, extra = {}) {
  const result = transition(state, { type, trialId: state.activeTrialId, ...extra }, 1000 + state.revision);
  assert.equal(result.ok, true, result.error); return result.state;
}
function discover(tier = 'rare', state = null, parentId = null) {
  const result = createTestDiscovery(tier, state, parentId);
  assert.equal(result.ok, true, result.error); return result;
}
const finish = (state, keep = false) => step(step(state, 'REVEAL'), keep ? 'KEEP' : 'ARCHIVE', keep ? { name: 'Known test descendant', signature: 'Test' } : {});
function refused(state, tier, parentId, error) {
  const before = JSON.stringify(state), result = createTestDiscovery(tier, state, parentId);
  assert.equal(result.ok, false); assert.equal(result.error, error);
  assert.equal(result.state, state); assert.equal(JSON.stringify(state), before);
}

test('V03 normal and test saves have separate keys and no helper storage side effects', () => {
  assert.equal(NORMAL_SAVE_KEY, 'botanical-table-v03'); assert.equal(TEST_SAVE_KEY, 'botanical-table-v03-test');
  assert.notEqual(NORMAL_SAVE_KEY, TEST_SAVE_KEY);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('Storage accessed'); } });
  try { assert.equal(createTestDiscovery().ok, true); }
  finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; }
});

test('default rare fixture is a normal X by Z trial inspected without early points', () => {
  const original = createState(), before = structuredClone(original), result = discover('rare', original);
  const state = result.state, trial = state.trials[0];
  assert.deepEqual(original, before); assert.notEqual(state, original);
  assert.deepEqual(trial.parentIds, ['x', 'z']); assert.equal(trial.phase, 'inspected'); assert.equal(trial.result.rarity, 'rare');
  assert.equal(trial.pointsAwarded, false); assert.equal(state.pot.trialId, null);
  assert.deepEqual(state.history.map(entry => entry.command.type), ['START', 'ADVANCE', 'INSPECT']);
  assert.deepEqual(Object.values(state.research).map(research => research.earned), [0, 0, 0]);
  assert.equal(state.inventory.length, 7); assert.deepEqual(result.setupTrialIds, []); assert.deepEqual(result.setupLabels, []);
  assert.equal(validateState(state), state); assert.deepEqual(reload(state), state);
});

test('test seed is inside a real weighted outcome and leaves normal odds unchanged', () => {
  const state = createState(), odds = getOdds(state, ['x', 'z']), before = structuredClone(odds);
  const seed = getTestSeed(odds, 'rare');
  assert(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32);
  assert.equal(odds.outcomes.find(o => seed >= o.seedStart && seed < o.seedEnd).rarity, 'rare');
  assert.deepEqual(odds, before); assert.deepEqual(discover().state.trials[0].odds, odds);
  const normal = step(state, 'START', { parentIds: ['x', 'z'], requestId: 'independent', seed });
  assert.deepEqual(normal.trials[0].result, discover().state.trials[0].result);
});

test('unavailable tiers return null without fallback probabilities', () => {
  for (const pair of [['x', 'y'], ['x', 'z'], ['y', 'z']]) assert.equal(getTestSeed(getOdds(createState(), pair), 'exceptional'), null);
  assert.equal(getTestSeed(getOdds(createState(), ['x', 'y']), 'common'), null);
  assert.equal(getTestSeed(null, 'rare'), null); assert.equal(getTestSeed({}, 'rare'), null);
  const state = createState(); refused(state, 'exceptional', 'x', 'test-tier-unavailable');
});

test('exceptional fixture discloses a real kept bridge and an inspected exceptional target', () => {
  const result = discover('exceptional'), state = result.state, [bridgeTrial, target] = state.trials;
  assert.equal(state.trials.length, 2); assert.equal(bridgeTrial.phase, 'kept'); assert.equal(target.phase, 'inspected');
  assert.equal(bridgeTrial.result.rarity, 'rare'); assert.equal(target.result.rarity, 'exceptional');
  assert.equal(bridgeTrial.result.slotCapacity, 5); assert.equal(target.result.slotCapacity, 5);
  assert(target.result.potentialIds.includes('citrus') && target.result.potentialIds.includes('floral') && target.result.potentialIds.includes('b1'));
  assert.deepEqual(result.setupTrialIds, [bridgeTrial.id]); assert.deepEqual(result.setupLabels, [state.varieties[0].name]);
  assert(state.varieties[0].name.includes('Y × X')); assert.deepEqual(bridgeTrial.parentIds, ['y', 'x']);
  assert.deepEqual(target.parentIds, [state.varieties[0].id, 'z']); assert.equal(target.result.generation, 2);
  assert.equal(state.research.x.earned, 1); assert.equal(state.research.y.earned, 1);
  assert.equal(state.research.z.earned, 0); assert.equal(state.research[state.varieties[0].id].earned, 0);
  assert.deepEqual(state.history.map(entry => entry.command.type), ['START', 'ADVANCE', 'INSPECT', 'REVEAL', 'KEEP', 'HARVEST', 'START', 'ADVANCE', 'INSPECT']);
  assert.equal(state.harvests.length, 1); assert.equal(state.plants.at(-1).harvested, 1);
  assert.equal(target.pointsAwarded, false); assert.equal(target.batch.quality, 'demo-standard');
  assert.deepEqual(reload(state), state);
});

test('actual REVEAL alone awards one point per target parent for both fixture tiers', () => {
  for (const tier of ['rare', 'exceptional']) {
    const inspected = discover(tier).state, target = inspected.trials.at(-1), state = step(inspected, 'REVEAL');
    for (const id of target.parentIds) assert.equal(state.research[id].earned, inspected.research[id].earned + 1);
    for (const id of Object.keys(state.research).filter(id => !target.parentIds.includes(id))) assert.equal(state.research[id].earned, inspected.research[id].earned);
    assert.equal(state.trials.at(-1).pointsAwarded, true);
    const again = transition(reload(state), { type: 'REVEAL', trialId: target.id });
    assert.equal(again.ok, false); assert.equal(again.error, 'wrong-phase');
    assert.deepEqual(again.state.research, state.research);
  }
});

test('two completed rare fixtures award two points to the same bases and retain all history', () => {
  let state = finish(discover().state);
  state = finish(discover('rare', reload(state)).state);
  assert.equal(state.research.x.earned, 2); assert.equal(state.research.z.earned, 2); assert.equal(state.research.y.earned, 0);
  assert.equal(state.trials.length, 2); assert.equal(state.inventory.length, 5);
  assert(state.trials.every(t => t.phase === 'archived'));
});

test('repeat keeps acquired activations and known lineage without granting fixture points', () => {
  let state = finish(discover().state, true), childId = state.varieties[0].id;
  state = step(state, 'ACTIVATE', { varietyId: 'x', slotIndex: 0, traitId: 'citrus' });
  const before = structuredClone(state), result = discover('rare', reload(state));
  assert.deepEqual(result.state.research, before.research); assert.deepEqual(result.state.varieties, before.varieties);
  assert.deepEqual(result.state.activations, before.activations); assert.deepEqual(getConfiguration(result.state, 'x').activeIds, ['citrus']);
  assert.equal(result.state.research[childId].earned, 0);
});

test('a fixture targeted at a kept descendant prepares a real child which can earn its first slot point', () => {
  let state = finish(discover().state, true), parentId = state.varieties[0].id;
  assert.equal(state.research[parentId].earned, 0);
  const prepared = discover('rare', state, parentId).state, trial = prepared.trials.at(-1);
  assert(trial.parentIds.includes(parentId)); assert.equal(new Set(trial.parentIds).size, 2);
  assert.equal(prepared.research[parentId].earned, 0); assert.equal(trial.phase, 'inspected');
  assert.equal(prepared.harvests[0].varietyId, parentId);
  state = step(prepared, 'REVEAL'); assert.equal(state.research[parentId].earned, 1);
  const identity = structuredClone(state.varieties[0]);
  state = step(state, 'ACTIVATE', { varietyId: parentId, slotIndex: 0, traitId: state.varieties[0].potentialIds[0] });
  assert.equal(state.research[parentId].spent, 1); assert.deepEqual(state.varieties[0], identity);
});

test('a five-slot descendant earns five real descendant rewards and can fill its own five slots', () => {
  let state = finish(discover('exceptional').state, true), child = state.varieties.at(-1);
  assert.equal(child.slotCapacity, 5); assert.equal(child.potentialIds.length, 5);
  for (let index = 0; index < 5; index++) {
    state = discover('rare', state, child.id).state;
    assert.equal(state.research[child.id].earned, index);
    state = finish(state); assert.equal(state.research[child.id].earned, index + 1);
    state = step(state, 'ACTIVATE', { varietyId: child.id, slotIndex: index, traitId: child.potentialIds[index] });
  }
  assert.equal(state.plants.find(p => p.varietyId === child.id).capacity, 8);
  assert.equal(state.plants.find(p => p.varietyId === child.id).harvested, 5);
  assert.equal(state.research[child.id].spent, 5);
  assert.deepEqual(getConfiguration(state, child.id).activeIds, child.potentialIds);
  assert.equal(getConfiguration(state, child.id).productionBranches, 5);
  assert.equal(getConfiguration(state, child.id).qualityPotential, true);
  assert.equal(state.trials.find(t => t.result.id === child.id).batch.quality, 'demo-standard');
});

test('invalid fixture tier, missing parent and unfinished trials refuse without changing state', () => {
  const state = createState();
  refused(state, 'common', null, 'invalid-test-tier'); refused(state, 'rare', 'unknown', 'test-parent-unavailable');
  const inspected = discover().state;
  refused(inspected, 'rare', null, 'test-trial-in-progress');
  const revealed = step(inspected, 'REVEAL'); refused(revealed, 'exceptional', null, 'test-trial-in-progress');
  const damaged = structuredClone(state); damaged.inventory.pop(); refused(damaged, 'rare', null, 'invalid-test-state');
});

test('test cuttings exhaust after six base crosses, then refuse without hidden replenishment', () => {
  let state = createState();
  for (let index = 0; index < 6; index++) state = finish(discover('rare', state).state);
  assert.equal(state.research.x.earned, 6); assert.equal(state.research.z.earned, 6);
  assert.equal(state.trials.length, 6); assert.equal(state.harvests.length, 6);
  assert.equal(state.inventory.filter(c => ['x', 'z'].includes(c.varietyId)).length, 0);
  assert.equal(state.plants.find(p => p.varietyId === 'x').harvested, 3);
  refused(state, 'rare', null, 'test-cuttings-exhausted');
  refused(state, 'exceptional', null, 'test-cuttings-exhausted');
  assert.equal(state.inventory.length + state.trials.length * 2, 9 + state.harvests.length);
});

test('an exhausted target parent refuses atomically and never substitutes another parent', () => {
  let state = finish(discover().state, true), parentId = state.varieties[0].id;
  for (let index = 0; index < 8; index++) state = finish(discover('rare', state, parentId).state);
  assert.equal(state.plants.find(p => p.varietyId === parentId).harvested, 8);
  assert.equal(state.research[parentId].earned, 8);
  refused(state, 'rare', parentId, 'test-cuttings-exhausted');
});

test('exceptional retries reuse an available known bridge without replaying setup or points', () => {
  let state = finish(discover('exceptional').state), bridgeId = state.varieties[0].id;
  const before = structuredClone(state), result = discover('exceptional', state);
  assert.deepEqual(result.setupTrialIds, []); assert.deepEqual(result.setupLabels, []);
  assert.equal(result.state.varieties.length, 1); assert.deepEqual(result.state.trials.at(-1).parentIds, [bridgeId, 'z']);
  assert.deepEqual(result.state.research, before.research);
  assert.equal(result.state.plants.find(p => p.varietyId === bridgeId).harvested, 2);
});

test('explicit fresh test reset loses only supplied test state and cannot alter normal state', () => {
  const normal = createState(), before = JSON.stringify(normal);
  let testState = finish(discover().state); testState = step(testState, 'ACTIVATE', { varietyId: 'x', slotIndex: 0, traitId: 'floral' });
  const reset = discover().state;
  assert.equal(reset.research.x.earned, 0); assert.equal(reset.research.x.spent, 0);
  assert.deepEqual(reset.research.x.choices, {}); assert.equal(JSON.stringify(normal), before);
  assert.equal(testState.research.x.choices['slot-0'], 'floral');
});

test('fixture outcomes and replay remain independent of input precision and elapsed time', () => {
  const first = discover('exceptional').state, second = discover('exceptional').state;
  assert.deepEqual(first.trials.map(t => t.result), second.trials.map(t => t.result));
  assert.deepEqual(first.trials.map(t => t.seed), second.trials.map(t => t.seed));
  const target = first.trials.at(-1), replay = reload(first);
  const result = transition(replay, { type: 'START', requestId: target.requestId, seed: 0, parentIds: ['x', 'y'], x: 99999, precision: 0 });
  assert.equal(result.ok, true); assert.equal(result.state, replay); assert.equal(result.state.trials.at(-1).seed, target.seed);
});
