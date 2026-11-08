import test from 'node:test';
import assert from 'node:assert/strict';
import { PARENTS, UPGRADE_BRANCHES, createState, transition, validateState, restoreState, getStrains, getOdds } from '../source/model.mjs';

const pair = ['aube', 'lisiere'];
const start = (state = createState(), requestId = 'request-1', seed = 0, parentIds = pair, extra = {}) => transition(state, { type: 'START', parentIds, seed, requestId, ...extra }, 1000);
const action = (state, type, extra = {}) => transition(state, { type, trialId: state.activeTrialId, ...extra }, 2000);
const reveal = state => ['ADVANCE', 'INSPECT', 'REVEAL'].reduce((current, type) => action(current, type).state, state);
const keep = (state, name = 'My variety') => action(state, 'KEEP', { name, signature: 'S.' }).state;
const archive = state => action(state, 'ARCHIVE').state;
const harvest = (state, varietyId) => transition(state, { type: 'HARVEST', varietyId }, 3000);
const upgrade = (state, varietyId, branchId, optionId) => transition(state, { type: 'UPGRADE', varietyId, branchId, optionId }, 4000);
const reload = state => restoreState(JSON.stringify(state));
const storedIdentity = trial => structuredClone(trial.result);

function twoDescendants(seed = 0) {
  let state = keep(reveal(start().state), 'First');
  state = keep(reveal(start(state, 'request-2', seed).state), 'Second');
  return state;
}

test('schema 2 fixture has nine cuttings, three plants and no earned points', () => {
  const state = createState();
  assert.equal(state.schema, 2);
  assert.equal(state.inventory.length, 9);
  assert.equal(new Set(state.inventory.map(cutting => cutting.id)).size, 9);
  assert.equal(state.plants.length, 3);
  assert(state.plants.every(plant => plant.capacity === 3 && plant.harvested === 0));
  assert.deepEqual(state.research.aube, { earned: 0, spent: 0, choices: {} });
  assert.equal(validateState(state), state);
  assert.equal(getStrains(state).length, 3);
  assert.deepEqual(UPGRADE_BRANCHES.map(branch => branch.id), ['inheritance', 'lineage']);
});

test('all base pairs have nominal 75/20/5 odds and exact uint32 counts', () => {
  for (const parents of [pair, ['aube', 'velours'], ['lisiere', 'velours']]) {
    const odds = getOdds(createState(), parents);
    assert.deepEqual([odds.common, odds.rare, odds.exceptional], [75, 20, 5]);
    assert.equal(odds.affinity, .4);
    assert.equal(odds.generation, 1);
    assert.equal(Object.values(odds.counts).reduce((a, b) => a + b, 0), 2 ** 32);
    assert.equal(odds.counts.rare, odds.thresholds.rare - odds.thresholds.exceptional);
    for (const rarity of ['common', 'rare', 'exceptional']) assert(Math.abs(odds.exactPercent[rarity] - odds[rarity]) < 100 / (2 ** 32));
  }
  assert.equal(getOdds(createState(), ['aube', 'aube']), null);
  assert.equal(getOdds(createState(), ['aube', 'unknown']), null);
});

test('rarity thresholds include each exact boundary once', () => {
  const odds = getOdds(createState(), pair);
  const cases = [[0, 'exceptional'], [odds.thresholds.exceptional - 1, 'exceptional'], [odds.thresholds.exceptional, 'rare'], [odds.thresholds.rare - 1, 'rare'], [odds.thresholds.rare, 'common'], [0xffffffff, 'common']];
  for (const [seed, rarity] of cases) {
    const result = start(createState(), 'request-1', seed);
    assert.equal(result.ok, true);
    assert.equal(result.state.trials[0].result.rarity, rarity);
  }
});

test('start commits one seeded result and consumes exactly two physical cuttings', () => {
  const before = createState(), result = start(before, 's', 12345678);
  assert.equal(result.ok, true);
  assert.equal(before.inventory.length, 9);
  assert.equal(result.state.inventory.length, 7);
  assert.deepEqual(result.state.trials[0].cuttingIds, ['cutting-aube-1', 'cutting-lisiere-1']);
  assert.equal(result.state.pot.id, before.pot.id);
  assert.equal(result.state.pot.trialId, result.state.activeTrialId);
  assert.equal(result.state.trials[0].seed, 12345678);
  assert.equal(result.state.trials[0].pointsAwarded, false);
  assert.equal(result.state.research.aube.earned, 0);
  assert.equal('intent' in result.state.trials[0], false);
});

test('same request remains idempotent with a different supplied seed and after reveal/reload', () => {
  let state = reload(start().state);
  const duplicate = start(state, 'request-1', 0xffffffff);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.state, state);
  state = keep(reveal(state));
  const completed = start(reload(state), 'request-1', 0xffffffff).state;
  assert.equal(completed.trials.length, 1);
  assert.equal(completed.inventory.length, 7);
  assert.equal(completed.research.aube.earned, 1);
  assert.equal(completed.research.lisiere.earned, 1);
});

test('invalid seeds and removed direct trait choices refuse without mutation', () => {
  const state = createState();
  for (const seed of [undefined, null, -1, 2 ** 32, .5, NaN, Infinity, '0']) {
    const result = start(state, 'r', seed);
    if (seed === undefined) continue;
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
  }
  assert.equal(transition(state, { type: 'START', parentIds: pair, requestId: 'r' }).error, 'seed-required');
  for (const extra of [{ intent: 'aroma' }, { taste: 'Citrus' }, { effect: 'Calm' }]) {
    const result = start(state, 'r', 0, pair, extra);
    assert.equal(result.error, 'direct-trait-selection-removed');
    assert.equal(result.state, state);
  }
});

test('seed determinism is independent of movement, precision and wall-clock time', () => {
  const one = start(createState(), 'one', 987654321, pair, { pointerX: 0, precision: 0, duration: 1 }).state;
  const two = transition(createState(), { type: 'START', parentIds: pair, requestId: 'two', seed: 987654321, pointerX: 10000, precision: 1, duration: 9999 }, 900000).state;
  assert.deepEqual(one.trials[0].result, two.trials[0].result);
  assert.deepEqual(one.trials[0].odds, two.trials[0].odds);
});

test('genetics is symmetric in parent ordering and distributions always total 100', () => {
  for (const seed of [0, 1, 123, 1234567, 0x80000000, 0xffffffff]) {
    const first = start(createState(), 'x', seed).state.trials[0].result;
    const reversed = start(createState(), 'x', seed, [...pair].reverse()).state.trials[0].result;
    assert.deepEqual(first.genes, reversed.genes);
    assert.deepEqual(first.taste, reversed.taste);
    assert.deepEqual(first.effect, reversed.effect);
    for (const weights of Object.values(first.genes)) {
      assert(weights.every(value => Number.isInteger(value) && value >= 0 && value <= 100));
      assert.equal(weights.reduce((a, b) => a + b, 0), 100);
    }
  }
});

test('reloading every phase preserves seed, odds, identity and exact stock', () => {
  let state = start().state;
  const identity = storedIdentity(state.trials[0]);
  const odds = structuredClone(state.trials[0].odds);
  for (const type of ['ADVANCE', 'INSPECT', 'REVEAL', 'KEEP']) {
    state = action(reload(state), type, { name: 'Identity', signature: 'S' }).state;
    assert.deepEqual(state.trials[0].result, identity);
    assert.deepEqual(state.trials[0].odds, odds);
    assert.equal(state.inventory.length, 7);
  }
  assert.equal(reload(state).varieties[0].id, identity.id);
});

test('object inspection is mandatory before reveal and no points arrive earlier', () => {
  let state = start().state;
  assert.equal(action(state, 'REVEAL').ok, false);
  assert.equal(action(state, 'INSPECT').ok, false);
  assert.equal(state.research.aube.earned, 0);
  state = action(state, 'ADVANCE').state;
  assert.equal(state.pot.trialId, null);
  assert.equal(action(state, 'REVEAL').ok, false);
  state = action(state, 'INSPECT').state;
  assert.equal(state.research.aube.earned, 0);
  state = action(state, 'REVEAL').state;
  assert.equal(state.research.aube.earned, 1);
  assert.equal(state.research.lisiere.earned, 1);
});

test('both rare tiers reward each parent exactly once, common gives none', () => {
  const odds = getOdds(createState(), pair);
  for (const [seed, expected] of [[0, 1], [odds.thresholds.exceptional, 1], [0xffffffff, 0]]) {
    const state = reveal(start(createState(), 'r', seed).state);
    assert.equal(state.research.aube.earned, expected);
    assert.equal(state.research.lisiere.earned, expected);
    assert.equal(state.research.velours.earned, 0);
    const repeated = action(reload(state), 'REVEAL');
    assert.equal(repeated.ok, false);
    assert.equal(repeated.state.research.aube.earned, expected);
    assert.equal(archive(state).research.aube.earned, expected);
  }
});

test('no points or choices are inherited by a kept child', () => {
  let state = reveal(start().state);
  state = upgrade(state, 'aube', 'inheritance', 'exploration').state;
  state = keep(state);
  const child = state.varieties[0];
  assert.deepEqual(state.research[child.id], { earned: 0, spent: 0, choices: {} });
  assert.deepEqual(state.research.aube, { earned: 1, spent: 1, choices: { inheritance: 'exploration' } });
  assert.equal(child.research, undefined);
});

test('each branch costs one point and permanently excludes its alternative', () => {
  const initial = createState();
  const unavailable = upgrade(initial, 'aube', 'inheritance', 'convergence');
  assert.equal(unavailable.error, 'research-point-required');
  assert.equal(unavailable.state, initial);
  let state = reveal(start().state);
  state = upgrade(state, 'aube', 'inheritance', 'convergence').state;
  assert.equal(state.research.aube.spent, 1);
  const alternative = upgrade(state, 'aube', 'inheritance', 'exploration');
  assert.equal(alternative.error, 'branch-already-chosen');
  assert.equal(alternative.state, state);
  assert.equal(upgrade(state, 'aube', 'lineage', 'memory').error, 'research-point-required');
  state = reveal(start(archive(state), 'r2').state);
  state = upgrade(state, 'aube', 'lineage', 'memory').state;
  assert.equal(state.research.aube.spent, 2);
  assert.equal(upgrade(state, 'aube', 'lineage', 'radiance').error, 'branch-already-chosen');
  assert.equal(state.upgrades.length, 2);
});

test('branch effects are transparent and limited to later trial probabilities', () => {
  const base = reveal(start().state), original = storedIdentity(base.trials[0]);
  const convergence = upgrade(base, 'aube', 'inheritance', 'convergence').state;
  const exploration = upgrade(base, 'aube', 'inheritance', 'exploration').state;
  const memory = upgrade(base, 'aube', 'lineage', 'memory').state;
  const radiance = upgrade(base, 'aube', 'lineage', 'radiance').state;
  assert.equal(getOdds(convergence, pair).rare, 22);
  assert.equal(getOdds(exploration, pair).exceptional, 9);
  assert.equal(getOdds(memory, pair).rare, 22);
  assert.equal(getOdds(radiance, pair).rare, 16);
  assert.equal(getOdds(radiance, pair).exceptional, 9);
  for (const state of [convergence, exploration, memory, radiance]) {
    assert.deepEqual(state.trials[0].result, original);
    assert.deepEqual(state.trials[0].batch, base.trials[0].batch);
    assert.equal(state.inventory.length, base.inventory.length);
    assert.equal(state.plants.length, base.plants.length);
  }
});

test('upgrading during a growing trial never recalculates its odds or outcome', () => {
  let state = archive(reveal(start().state));
  state = start(state, 'second', 250000000).state;
  const trialBefore = structuredClone(state.trials[1]);
  state = upgrade(state, 'aube', 'inheritance', 'exploration').state;
  assert.deepEqual(state.trials[1], trialBefore);
  assert.equal(getOdds(state, pair).exceptional, 9);
  assert.equal(state.trials[1].odds.exceptional, 5);
  assert.deepEqual(reload(state).trials[1], trialBefore);
});

test('keeping creates a source plant but never creates cuttings from a card or name', () => {
  let state = reveal(start().state);
  const beforeCount = state.inventory.length;
  state = keep(state);
  const child = state.varieties[0], plant = state.plants.find(plant => plant.varietyId === child.id);
  assert.equal(plant.capacity, 4);
  assert.equal(plant.harvested, 0);
  assert.equal(plant.createdByTrialId, state.trials[0].id);
  assert.equal(state.inventory.length, beforeCount);
  assert.equal(state.inventory.filter(cutting => cutting.varietyId === child.id).length, 0);
  assert.equal(start(state, 'child', 0, [child.id, 'velours']).error, 'insufficient-cuttings');
});

test('harvest produces one identified cutting with finite plant provenance', () => {
  let state = createState();
  const sourceId = state.plants[0].id;
  for (let index = 1; index <= 3; index++) {
    state = harvest(state, 'aube').state;
    assert.equal(state.inventory.length, 9 + index);
    assert.equal(state.plants[0].harvested, index);
    assert.equal(state.inventory.at(-1).sourcePlantId, sourceId);
    assert.equal(state.inventory.at(-1).id, `cutting-harvest-00${index}`);
  }
  const result = harvest(reload(state), 'aube');
  assert.equal(result.error, 'plant-exhausted');
  assert.equal(result.state.inventory.length, 12);
  assert.equal(harvest(state, 'unknown').error, 'source-plant-required');
});

test('a kept child can be a parent only after explicit harvest from its actual plant', () => {
  let state = keep(reveal(start().state));
  const child = state.varieties[0];
  state = harvest(state, child.id).state;
  const cutting = state.inventory.at(-1);
  state = start(state, 'child-cross', 0, [child.id, 'velours']).state;
  assert.equal(state.trials[1].result.generation, 2);
  assert(state.trials[1].cuttingIds.includes(cutting.id));
  assert.deepEqual(state.trials[1].result.parents, [child.id, 'velours']);
  state = reveal(state);
  assert.equal(state.research[child.id].earned, 1);
  assert.equal(state.research.velours.earned, 1);
  assert.equal(state.research.aube.earned, 1);
});

test('compatible descendants carry inherited distributions and improve later rare odds', () => {
  let state = twoDescendants();
  const children = state.varieties.map(child => child.id);
  const odds = getOdds(state, children);
  assert.equal(odds.affinity, 1);
  assert.equal(odds.generation, 2);
  assert.equal(odds.rare, 37);
  assert.equal(odds.exceptional, 5);
  for (const id of children) state = harvest(state, id).state;
  state = start(state, 'grandchild', 0, children).state;
  assert.equal(state.trials[2].result.generation, 2);
  assert.deepEqual(state.trials[2].parentIds, children);
  assert.deepEqual(state.trials[2].odds, odds);
});

test('successive crosses do not exhaust identity or genealogy when a parent is itself a creation', () => {
  let state = keep(reveal(start().state));
  for (let generation = 2; generation <= 4; generation++) {
    const child = state.varieties.at(-1);
    state = harvest(state, child.id).state;
    if (!state.inventory.some(cutting => cutting.varietyId === 'velours')) state = harvest(state, 'velours').state;
    state = keep(reveal(start(state, `generation-${generation}`, 0, [child.id, 'velours']).state), `Generation ${generation}`);
    assert.equal(state.varieties.at(-1).generation, generation);
    assert.equal(state.varieties.at(-1).parents[0], child.id);
    state = reload(state);
  }
  assert.equal(state.trials.length, 4);
  assert.equal(state.varieties.length, 4);
  assert.equal(state.plants.length, 7);
});

test('archiving retains genealogy and earned points, with no child plant or refund', () => {
  const state = archive(reveal(start().state));
  assert.equal(state.trials[0].phase, 'archived');
  assert.deepEqual(state.trials[0].result.parents, pair);
  assert.equal(state.varieties.length, 0);
  assert.equal(state.plants.length, 3);
  assert.equal(state.inventory.length, 7);
  assert.equal(state.research.aube.earned, 1);
  assert.equal(state.pot.trialId, null);
});

test('batch quantity and quality stay separate from rarity, genes and upgrades', () => {
  const rare = reveal(start().state), common = reveal(start(createState(), 'r', 0xffffffff).state);
  assert.deepEqual(rare.trials[0].batch, common.trials[0].batch);
  assert.equal(rare.trials[0].batch.quality, 'demo-standard');
  assert.equal(rare.trials[0].batch.quantity, 1);
  assert.notEqual(rare.trials[0].result.rarity, common.trials[0].result.rarity);
});

test('names are normalized without replacing genotype or identity', () => {
  const ready = reveal(start().state), identity = storedIdentity(ready.trials[0]);
  assert.equal(action(ready, 'KEEP', { name: '  ' }).error, 'name-required');
  const state = action(ready, 'KEEP', { name: ' <Aube>\u0000 ', signature: '🌿'.repeat(60) }).state;
  assert.equal(state.varieties[0].name, 'Aube');
  assert.equal(Array.from(state.varieties[0].signature).length, 48);
  const { name, signature, trialId, ...keptIdentity } = state.varieties[0];
  assert.deepEqual(keptIdentity, identity);
});

test('all refused commands return the same reference and preserve the full history', () => {
  const state = start().state, encoded = JSON.stringify(state);
  const commands = [null, {}, { type: '__proto__' }, { type: 'UNKNOWN' }, { type: 'REVEAL', trialId: state.activeTrialId }, { type: 'KEEP', trialId: state.activeTrialId, name: 'Early' }, { type: 'ADVANCE', trialId: 'missing' }, { type: 'START', parentIds: pair, requestId: 'other', seed: 0 }, { type: 'UPGRADE', varietyId: 'aube', branchId: 'inheritance', optionId: 'wrong' }];
  for (const command of commands) {
    const result = transition(state, command);
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
    assert.equal(JSON.stringify(state), encoded);
  }
});

test('replay validation rejects changed outcomes, resource provenance, points, capacity and branch costs', () => {
  let base = keep(reveal(start().state));
  base = upgrade(base, 'aube', 'inheritance', 'exploration').state;
  base = harvest(base, base.varieties[0].id).state;
  const mutations = [
    state => state.inventory.push(structuredClone(state.inventory[0])),
    state => state.inventory.pop(),
    state => { state.inventory[0].sourcePlantId = 'other'; },
    state => { state.trials[0].result.id = 'rerolled'; },
    state => { state.trials[0].seed = 0xffffffff; },
    state => { state.trials[0].odds.rare = 99; },
    state => { state.trials[0].result.genes.taste[0]++; },
    state => { state.trials[0].result.rarity = 'common'; },
    state => { state.trials[0].pointsAwarded = false; },
    state => { state.research.aube.earned++; },
    state => { state.research.aube.spent = 0; },
    state => { state.research.aube.choices.inheritance = 'convergence'; },
    state => { state.plants.at(-1).capacity = 40; },
    state => { state.plants.at(-1).harvested = 0; },
    state => { state.harvests[0].plantId = 'other'; },
    state => { state.upgrades[0].cost = 0; },
    state => { state.trials[0].batch.quantity = 2; },
    state => { state.trials[0].batch.quality = 'exceptional'; },
    state => { state.history.pop(); state.revision--; },
    state => { [state.history[0], state.history[5]] = [state.history[5], state.history[0]]; },
  ];
  for (const mutate of mutations) {
    const state = structuredClone(base); mutate(state);
    assert.throws(() => restoreState(JSON.stringify(state)), /Invalid research state/);
  }
  assert.throws(() => restoreState('{broken'));
  assert.throws(() => restoreState('{"schema":1}'), /unsupported schema/);
});

test('direct validation rejects non-finite and missing JSON values', () => {
  const invalidNumber = createState(); invalidNumber.plants[0].createdByTrialId = NaN;
  assert.throws(() => validateState(invalidNumber), /non-JSON or non-finite/);
  const missingValue = createState(); missingValue.plants[0].createdByTrialId = undefined;
  assert.throws(() => validateState(missingValue), /non-JSON or non-finite/);
});

test('display rarity and accent match the VFX tier while every batch keeps standard quality', () => {
  const odds = getOdds(createState(), pair);
  const cases = [
    [0xffffffff, 'common', 'Soft glints'],
    [odds.thresholds.exceptional, 'rare', 'Mauve glints'],
    [0, 'exceptional', 'Golden glints'],
  ];
  for (const [seed, rarity, accent] of cases) {
    const state = reload(keep(reveal(start(createState(), 'display-tier', seed).state)));
    const trial = state.trials[0], displayed = getStrains(state).find(strain => strain.id === trial.result.id);
    assert.equal(displayed.rarity, rarity);
    assert.equal(displayed.accent.en, accent);
    assert.equal(trial.batch.quality, 'demo-standard');
    assert.equal(trial.batch.quantity, 1);
    assert.equal('quality' in displayed, false);
    assert.equal('rarity' in trial.batch, false);
  }
});
