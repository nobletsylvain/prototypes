import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, getOdds, transition, restoreState, validateState } from '../source/model.mjs';
import { NORMAL_SAVE_KEY, TEST_SAVE_KEY, getTestSeed, createTestDiscovery } from '../source/test-session.mjs';

const pair = ['aube', 'lisiere'];
const active = state => state.trials.find(trial => trial.id === state.activeTrialId);
const action = (state, type, extra = {}) => transition(state, { type, trialId: state.activeTrialId, ...extra });
const reveal = state => action(state, 'REVEAL').state;
const archive = state => action(state, 'ARCHIVE').state;
const keep = state => action(state, 'KEEP', { name: `Trial ${state.trials.length}`, signature: 'Test' }).state;
const reload = state => restoreState(JSON.stringify(state));

test('normal and test persistence keys are distinct and stable', () => {
  assert.equal(NORMAL_SAVE_KEY, 'botanical-table-v02');
  assert.equal(TEST_SAVE_KEY, 'botanical-table-v02-test');
  assert.notEqual(NORMAL_SAVE_KEY, TEST_SAVE_KEY);
});

test('test seeds are exact interval midpoints for rare and exceptional tiers', () => {
  const odds = getOdds(createState(), pair);
  const rareSeed = getTestSeed(odds, 'rare'), exceptionalSeed = getTestSeed(odds, 'exceptional');
  assert.equal(rareSeed, odds.thresholds.exceptional + Math.floor((odds.thresholds.rare - odds.thresholds.exceptional) / 2));
  assert.equal(exceptionalSeed, Math.floor(odds.thresholds.exceptional / 2));
  assert(rareSeed >= odds.thresholds.exceptional && rareSeed < odds.thresholds.rare);
  assert(exceptionalSeed >= 0 && exceptionalSeed < odds.thresholds.exceptional);
  assert.throws(() => getTestSeed(odds, 'common'), /Unsupported/);
  assert.throws(() => getTestSeed(null, 'rare'), /thresholds/);
  assert.throws(() => getTestSeed({ thresholds: { exceptional: 10, rare: 10 } }, 'rare'), /thresholds/);
});

test('rare is the default fixture, already inspected but never revealed or rewarded', () => {
  const result = createTestDiscovery();
  assert.equal(result.ok, true);
  assert.equal(active(result.state).result.rarity, 'rare');
  assert.equal(active(result.state).phase, 'inspected');
  assert.equal(active(result.state).pointsAwarded, false);
  assert.equal(result.state.research.aube.earned, 0);
  assert.equal(result.state.research.lisiere.earned, 0);
  assert.equal(result.state.inventory.length, 7);
  assert.equal(result.state.pot.trialId, null);
  assert.deepEqual(result.state.history.map(entry => entry.command.type), ['START', 'ADVANCE', 'INSPECT']);
  assert.equal(validateState(result.state), result.state);
});

test('both fixture tiers use ordinary odds and require actual REVEAL for normal rewards', () => {
  for (const tier of ['rare', 'exceptional']) {
    const prepared = createTestDiscovery(tier).state;
    const trial = active(prepared);
    assert.equal(trial.result.rarity, tier);
    assert.deepEqual([trial.odds.common, trial.odds.rare, trial.odds.exceptional], [75, 20, 5]);
    assert.deepEqual(trial.odds, getOdds(createState(), pair));
    assert.equal(prepared.research.aube.earned, 0);
    const revealed = reveal(prepared);
    assert.equal(revealed.research.aube.earned, 1);
    assert.equal(revealed.research.lisiere.earned, 1);
    assert.equal(revealed.research.velours.earned, 0);
    assert.equal(active(revealed).pointsAwarded, true);
    assert.equal(active(revealed).batch.quality, 'demo-standard');
    assert.equal(active(revealed).batch.quantity, 1);
    assert.equal(action(revealed, 'REVEAL').ok, false);
  }
});

test('reload preserves the fixed inspected discovery without early points or another draw', () => {
  for (const tier of ['rare', 'exceptional']) {
    const state = createTestDiscovery(tier).state, restored = reload(state);
    assert.deepEqual(restored, state);
    assert.equal(active(restored).phase, 'inspected');
    assert.equal(restored.research.aube.earned, 0);
    const refused = createTestDiscovery(tier, restored);
    assert.equal(refused.ok, false);
    assert.equal(refused.error, 'test-trial-in-progress');
    assert.equal(refused.state, restored);
  }
});

test('preparation refuses each unfinished phase without modifying its input', () => {
  let state = transition(createState(), { type: 'START', parentIds: pair, requestId: 'ordinary', seed: 0 }).state;
  for (const next of [null, 'ADVANCE', 'INSPECT', 'REVEAL']) {
    if (next) state = action(state, next).state;
    const before = JSON.stringify(state), result = createTestDiscovery('rare', state);
    assert.equal(result.error, 'test-trial-in-progress');
    assert.equal(result.state, state);
    assert.equal(JSON.stringify(state), before);
  }
});

test('two rare discoveries reward each same base parent twice, only after two reveals', () => {
  let state = archive(reveal(createTestDiscovery('rare').state));
  state = createTestDiscovery('rare', state).state;
  assert.equal(state.research.aube.earned, 1);
  assert.equal(state.research.lisiere.earned, 1);
  assert.equal(active(state).pointsAwarded, false);
  state = reveal(state);
  assert.equal(state.research.aube.earned, 2);
  assert.equal(state.research.lisiere.earned, 2);
  assert.equal(state.inventory.length, 5);
  assert.deepEqual(state.trials.map(trial => trial.parentIds), [pair, pair]);
});

test('known descendants, existing choices and spent points survive test preparation', () => {
  let state = keep(reveal(createTestDiscovery('rare').state));
  state = transition(state, { type: 'UPGRADE', varietyId: 'aube', branchId: 'inheritance', optionId: 'exploration' }).state;
  const before = structuredClone(state), identity = structuredClone(state.varieties[0]);
  const result = createTestDiscovery('exceptional', state);
  assert.equal(result.ok, true);
  assert.deepEqual(state, before);
  assert.deepEqual(result.state.varieties[0], identity);
  assert.deepEqual(result.state.research.aube, { earned: 1, spent: 1, choices: { inheritance: 'exploration' } });
  assert.equal(active(result.state).odds.exceptional, 9);
  assert.equal(active(result.state).result.rarity, 'exceptional');
  assert.equal(result.state.research.aube.earned, 1);
});

test('test fixtures do not bypass exclusive branches or refund points', () => {
  let state = archive(reveal(createTestDiscovery().state));
  state = transition(state, { type: 'UPGRADE', varietyId: 'aube', branchId: 'inheritance', optionId: 'convergence' }).state;
  state = archive(reveal(createTestDiscovery('rare', state).state));
  const alternative = transition(state, { type: 'UPGRADE', varietyId: 'aube', branchId: 'inheritance', optionId: 'exploration' });
  assert.equal(alternative.error, 'branch-already-chosen');
  assert.equal(alternative.state, state);
  assert.equal(state.research.aube.earned, 2);
  assert.equal(state.research.aube.spent, 1);
  const fresh = createTestDiscovery().state;
  assert.deepEqual(fresh.research.aube, { earned: 0, spent: 0, choices: {} });
  const opposite = transition(reveal(fresh), { type: 'UPGRADE', varietyId: 'aube', branchId: 'inheritance', optionId: 'exploration' });
  assert.equal(opposite.ok, true);
  assert.equal(opposite.state.research.aube.choices.inheritance, 'exploration');
});

test('preparation consumes real finite test cuttings and harvests only when required', () => {
  let state = createState();
  for (let index = 1; index <= 6; index++) {
    const result = createTestDiscovery(index % 2 ? 'rare' : 'exceptional', state);
    assert.equal(result.ok, true);
    state = result.state;
    assert.equal(state.harvests.length, Math.max(0, index - 3) * 2);
    assert.equal(state.inventory.filter(cutting => cutting.varietyId === 'aube').length, Math.max(0, 3 - index));
    assert.equal(state.plants.find(plant => plant.varietyId === 'aube').harvested, Math.max(0, index - 3));
    state = archive(reveal(state));
  }
  const before = JSON.stringify(state), exhausted = createTestDiscovery('rare', state);
  assert.equal(exhausted.error, 'test-cuttings-exhausted');
  assert.equal(exhausted.state, state);
  assert.equal(JSON.stringify(state), before);
  assert.equal(state.trials.length, 6);
  assert.equal(state.research.aube.earned, 6);
  assert.equal(state.research.lisiere.earned, 6);
  assert.equal(state.inventory.length, 3);
});

test('an asymmetric resource shortage refuses without a partial harvest', () => {
  let state = createState();
  for (let index = 1; index <= 6; index++) {
    if (!state.inventory.some(cutting => cutting.varietyId === 'lisiere')) state = transition(state, { type: 'HARVEST', varietyId: 'lisiere' }).state;
    if (!state.inventory.some(cutting => cutting.varietyId === 'velours')) state = transition(state, { type: 'HARVEST', varietyId: 'velours' }).state;
    state = transition(state, { type: 'START', parentIds: index <= 3 ? pair : ['lisiere', 'velours'], seed: 0xffffffff, requestId: `deplete-${index}` }).state;
    for (const type of ['ADVANCE', 'INSPECT', 'REVEAL', 'ARCHIVE']) state = action(state, type).state;
  }
  assert.equal(state.inventory.filter(cutting => cutting.varietyId === 'aube').length, 0);
  assert.equal(state.plants.find(plant => plant.varietyId === 'aube').capacity, 3);
  const before = JSON.stringify(state), result = createTestDiscovery('rare', state);
  assert.equal(result.error, 'test-cuttings-exhausted');
  assert.equal(result.state, state);
  assert.equal(JSON.stringify(state), before);
  assert.equal(state.plants.find(plant => plant.varietyId === 'aube').harvested, 0);
});

test('invalid tier and corrupted input refuse gracefully without reset', () => {
  const state = createState();
  for (const tier of ['common', '', null, 'RARE']) {
    const result = createTestDiscovery(tier, state);
    assert.equal(result.error, 'invalid-test-tier');
    assert.equal(result.state, state);
  }
  const corrupt = createState(); corrupt.inventory.pop();
  const result = createTestDiscovery('rare', corrupt);
  assert.equal(result.error, 'invalid-test-state');
  assert.equal(result.state, corrupt);
});

test('normal seed outcomes and base odds remain unchanged by preparing fixtures', () => {
  const original = createState(), odds = structuredClone(getOdds(original, pair));
  const normal = transition(original, { type: 'START', parentIds: pair, requestId: 'normal', seed: 0xffffffff }).state;
  const before = JSON.stringify(normal);
  createTestDiscovery('rare'); createTestDiscovery('exceptional');
  assert.equal(JSON.stringify(normal), before);
  assert.deepEqual(getOdds(original, pair), odds);
  assert.deepEqual([odds.common, odds.rare, odds.exceptional], [75, 20, 5]);
  assert.equal(active(normal).result.rarity, 'common');
  assert.equal(original.trials.length, 0);
});

test('input motor parameters do not enter the seed helper or fixture commands', () => {
  const state = createTestDiscovery('rare').state;
  const startCommand = state.history.find(entry => entry.command.type === 'START').command;
  assert.deepEqual(Object.keys(startCommand).sort(), ['parentIds', 'requestId', 'seed', 'type']);
  const same = transition(createState(), { ...startCommand, requestId: 'motor', precision: 0, holdDuration: 10000, pointerX: 999 }).state;
  assert.deepEqual(active(same).result, active(state).result);
});
