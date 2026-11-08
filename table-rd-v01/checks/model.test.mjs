import test from 'node:test';
import assert from 'node:assert/strict';
import { PARENTS, createState, transition, validateState, restoreState } from '../source/model.mjs';

const pair = [PARENTS[0].id, PARENTS[1].id];
const start = (state = createState(), requestId = 'request-1', extra = {}) => transition(state, { type: 'START', parentIds: pair, intent: 'aroma', requestId, ...extra }, 1000);
const command = (state, type, extra = {}) => transition(state, { type, trialId: state.activeTrialId, ...extra }, 2000);
const reveal = state => ['ADVANCE', 'INSPECT', 'REVEAL'].reduce((current, type) => command(current, type).state, state);

test('fixture contains nine physical cuttings from three identifiable plants', () => {
  const state = createState();
  assert.equal(state.inventory.length, 9);
  assert.equal(new Set(state.inventory.map(cutting => cutting.id)).size, 9);
  assert.equal(new Set(state.inventory.map(cutting => cutting.sourcePlantId)).size, 3);
  assert.equal(validateState(state), state);
});

test('start consumes exactly the selected pair once and reserves the same pot', () => {
  const before = createState();
  const result = start(before);
  assert.equal(result.ok, true);
  assert.equal(before.inventory.length, 9);
  assert.equal(result.state.inventory.length, 7);
  assert.deepEqual(result.state.trials[0].cuttingIds, ['cutting-aube-1', 'cutting-lisiere-1']);
  assert.equal(result.state.pot.id, before.pot.id);
  assert.equal(result.state.pot.trialId, result.state.activeTrialId);
  assert.deepEqual(result.state.trials[0].parentIds, pair);
});

test('same request is idempotent even after reload or terminal completion', () => {
  let state = restoreState(JSON.stringify(start().state));
  const duplicate = start(state);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.state, state);
  state = command(reveal(state), 'KEEP', { name: 'Création', signature: 'S' }).state;
  assert.equal(start(restoreState(JSON.stringify(state))).state.inventory.length, 7);
  assert.equal(start(state).state, state);
  assert.equal(start(state).state.trials.length, 1);
});

test('uncommitted request is blocked during an existing trial without mutation', () => {
  const state = start().state;
  const encoded = JSON.stringify(state);
  const result = start(state, 'request-2');
  assert.equal(result.error, 'trial-in-progress');
  assert.equal(result.state, state);
  assert.equal(JSON.stringify(state), encoded);
});

test('invalid parent selection, intention and request leave resources unchanged', () => {
  const state = createState();
  for (const extra of [{ parentIds: [] }, { parentIds: ['unknown', pair[1]] }, { parentIds: [pair[0], pair[0]] }, { intent: 'precision' }, { requestId: '' }]) {
    const result = start(state, 'request-1', extra);
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
    assert.deepEqual(state, createState());
  }
});

test('result is persisted at engagement and never affected by motion, timing or reload', () => {
  const one = start(createState(), 'a', { pointerX: 0, pointerY: 0, duration: 1, precision: 0 });
  const two = transition(createState(), { type: 'START', parentIds: pair, intent: 'aroma', requestId: 'b', pointerX: 1e9, duration: 9999, precision: 1 }, 50000);
  assert.deepEqual(one.state.trials[0].result, two.state.trials[0].result);
  let state = one.state;
  const identity = structuredClone(state.trials[0].result);
  for (const type of ['ADVANCE', 'INSPECT', 'REVEAL', 'KEEP']) {
    state = restoreState(JSON.stringify(state));
    state = command(state, type, { name: 'Aube personnelle', signature: 'S.' }).state;
    assert.deepEqual(state.trials[0].result, identity);
    assert.equal(state.inventory.length, 7);
  }
  assert.equal(state.varieties[0].id, identity.id);
  assert.equal(restoreState(JSON.stringify(state)).varieties[0].id, identity.id);
});

test('object must become ready and be inspected before its record can be revealed', () => {
  let state = start().state;
  assert.equal(command(state, 'REVEAL').ok, false);
  assert.equal(command(state, 'INSPECT').ok, false);
  state = command(state, 'ADVANCE').state;
  assert.equal(state.pot.trialId, null);
  assert.equal(command(state, 'REVEAL').ok, false);
  assert.equal(command(state, 'KEEP', { name: 'Too early' }).ok, false);
  state = command(state, 'INSPECT').state;
  assert.equal(command(state, 'REVEAL').ok, true);
});

test('repeated advance never charges, duplicates or rerolls', () => {
  const state = command(start().state, 'ADVANCE').state;
  const result = command(state, 'ADVANCE');
  assert.equal(result.error, 'wrong-phase');
  assert.equal(result.state, state);
  assert.equal(state.trials.length, 1);
  assert.equal(state.inventory.length, 7);
});

test('keeping requires a name and stores normalized name, signature and genealogy', () => {
  const state = reveal(start().state);
  assert.equal(command(state, 'KEEP', { name: '   ' }).error, 'name-required');
  const result = command(state, 'KEEP', { name: '  <Aube>\u0000  ', signature: '  Mon atelier  ' });
  assert.equal(result.state.varieties[0].name, 'Aube');
  assert.equal(result.state.varieties[0].signature, 'Mon atelier');
  assert.deepEqual(result.state.varieties[0].parents, pair);
  assert.equal(result.state.varieties[0].trialId, state.activeTrialId);
  assert.equal(result.state.varieties.length, 1);
  assert.equal(command(result.state, 'KEEP', { name: 'Again' }).ok, false);
});

test('long Unicode name is bounded by code points and does not split emoji', () => {
  const state = command(reveal(start().state), 'KEEP', { name: '🌿'.repeat(60), signature: 'x'.repeat(60) }).state;
  assert.equal(Array.from(state.varieties[0].name).length, 48);
  assert.equal(state.varieties[0].signature.length, 48);
  assert.equal(validateState(state), state);
});

test('archiving preserves trial and parent identities without refund or retained variety', () => {
  const state = command(reveal(start().state), 'ARCHIVE').state;
  assert.equal(state.trials[0].phase, 'archived');
  assert.deepEqual(state.trials[0].result.parents, pair);
  assert.equal(state.varieties.length, 0);
  assert.equal(state.inventory.length, 7);
  assert.equal(state.pot.trialId, null);
  assert.equal(start(state, 'request-2').ok, true);
});

test('exhaustion refuses without generating cuttings, consuming other stock or changing the pot', () => {
  let state = createState();
  for (let index = 1; index <= 3; index++) state = command(reveal(start(state, `r-${index}`).state), 'ARCHIVE').state;
  assert.equal(state.inventory.length, 3);
  const result = start(state, 'r-4');
  assert.equal(result.error, 'insufficient-cuttings');
  assert.equal(result.state, state);
  assert.equal(state.pot.trialId, null);
});

test('each accepted engagement has a distinct specimen, trial and variety identity', () => {
  let state = command(reveal(start().state), 'KEEP', { name: 'First' }).state;
  state = start(state, 'request-2').state;
  assert.notEqual(state.trials[0].id, state.trials[1].id);
  assert.notEqual(state.trials[0].result.id, state.trials[1].result.id);
  assert.notEqual(state.trials[0].batch.id, state.trials[1].batch.id);
  assert.notDeepEqual(state.trials[0].cuttingIds, state.trials[1].cuttingIds);
});

test('batch quality is distinct from the stable variety identity', () => {
  const state = command(reveal(start().state), 'KEEP', { name: 'Stable' }).state;
  const identity = structuredClone(state.varieties[0]);
  state.trials[0].batch.quality = 'demo-comparison';
  const restored = restoreState(JSON.stringify(state));
  assert.deepEqual(restored.varieties[0], identity);
  assert.equal(restored.trials[0].batch.quality, 'demo-comparison');
});

test('reload validates provenance and refuses corruption instead of resetting', () => {
  const mutations = [
    state => state.inventory.push(structuredClone(state.inventory[0])),
    state => state.inventory.pop(),
    state => { state.inventory[0].sourcePlantId = 'other'; },
    state => { state.trials[0].result.id = 'rerolled'; },
    state => { state.trials[0].result.taste.fr = 'changed'; },
    state => { state.trials[0].cuttingIds[1] = state.trials[0].cuttingIds[0]; },
    state => { state.pot.trialId = null; },
    state => { state.activeTrialId = null; },
    state => { state.trials[0].batch.quantity = 10; },
  ];
  for (const mutate of mutations) {
    const state = start().state;
    mutate(state);
    assert.throws(() => restoreState(JSON.stringify(state)), /Invalid research state/);
  }
  assert.throws(() => restoreState('{bad json'));
  assert.throws(() => restoreState('{"schema":2}'), /unsupported schema/);
});

test('unknown and stale commands preserve the exact state object', () => {
  const state = start().state;
  for (const cmd of [null, {}, { type: 'UNKNOWN' }, { type: 'ADVANCE', trialId: 'missing' }]) {
    const result = transition(state, cmd);
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
  }
});

