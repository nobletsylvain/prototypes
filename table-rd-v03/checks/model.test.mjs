import test from 'node:test';
import assert from 'node:assert/strict';
import { PARENTS, TRAITS, createState, transition, validateState, restoreState, getStrains, getOdds, getConfiguration } from '../source/model.mjs';
import { getVisualPhenotype } from '../source/visual-genetics.mjs';

const SPACE = 2 ** 32;
const reload = state => restoreState(JSON.stringify(state));
function step(state, type, extra = {}) {
  const result = transition(state, { type, trialId: state.activeTrialId, ...extra }, 1000 + state.revision);
  assert.equal(result.ok, true, result.error);
  return result.state;
}
function seedFor(state, parents, predicate) {
  const outcome = getOdds(state, parents).outcomes.find(predicate);
  assert(outcome, 'Requested inheritance outcome exists');
  return outcome.seedStart + Math.floor(outcome.count / 2);
}
function start(state = createState(), parents = ['x', 'z'], predicate = outcome => outcome.rarity === 'rare', extra = {}) {
  return step(state, 'START', { parentIds: parents, seed: seedFor(state, parents, predicate), requestId: `request-${state.trials.length + 1}`, ...extra });
}
const reveal = state => ['ADVANCE', 'INSPECT', 'REVEAL'].reduce((current, type) => step(current, type), state);
const archive = state => step(state, 'ARCHIVE');
const keep = (state, name = 'Fictional variety') => step(state, 'KEEP', { name, signature: 'S.' });
const harvest = (state, varietyId) => step(state, 'HARVEST', { varietyId });
const activate = (state, varietyId, slotIndex, traitId) => step(state, 'ACTIVATE', { varietyId, slotIndex, traitId });
function refused(state, command, error) {
  const before = JSON.stringify(state), result = transition(state, command, 2000);
  assert.equal(result.ok, false); assert.equal(result.error, error);
  assert.equal(result.state, state); assert.equal(JSON.stringify(state), before);
}
function earn(state = createState(), parents = ['x', 'z']) { return archive(reveal(start(state, parents))); }
function allPotentialChild(state = createState(), parents = ['x', 'z']) {
  const union = new Set(getStrains(state).filter(strain => parents.includes(strain.id)).flatMap(strain => strain.potentialIds));
  return keep(reveal(start(state, parents, outcome => outcome.potentialIds.length === union.size)), 'Inherited specimen');
}

test('schema 4 fixture has authored potentials, variable slots and physical stock', () => {
  const state = createState();
  assert.equal(state.schema, 4); assert.equal(state.revision, 0);
  assert.deepEqual(PARENTS.map(({ id, slotCapacity, potentialIds }) => ({ id, slotCapacity, potentialIds })), [
    { id: 'x', slotCapacity: 3, potentialIds: ['citrus', 'floral', 'yield'] },
    { id: 'y', slotCapacity: 5, potentialIds: ['yield', 'quality'] },
    { id: 'z', slotCapacity: 3, potentialIds: ['b1', 'quality'] },
  ]);
  assert.equal(state.inventory.length, 9); assert.equal(new Set(state.inventory.map(c => c.id)).size, 9);
  assert(state.plants.every(plant => plant.capacity === 3 && plant.harvested === 0));
  assert.deepEqual(state.research.x, { earned: 0, spent: 0, choices: {} });
  assert.equal(validateState(state), state);
  assert.deepEqual(TRAITS.map(t => t.id), ['citrus', 'floral', 'yield', 'quality', 'b1']);
  assert(TRAITS.every(t => t.name.fr && t.name.en && t.description.fr && t.description.en));
  const copy = getStrains(state); copy[0].potentialIds.length = 0;
  assert.equal(PARENTS[0].potentialIds.length, 3);
});

test('each odds table partitions all uint32 seeds exactly with at most 64 outcomes', () => {
  for (const parents of [['x', 'y'], ['x', 'z'], ['y', 'z']]) {
    const odds = getOdds(createState(), parents);
    assert(odds.outcomes.length <= 64); assert.equal(odds.sampleSpace, SPACE);
    assert.equal(Object.values(odds.counts).reduce((a, b) => a + b, 0), SPACE);
    assert.equal(odds.outcomes[0].seedStart, 0); assert.equal(odds.outcomes.at(-1).seedEnd, SPACE);
    for (let index = 0; index < odds.outcomes.length; index++) {
      const outcome = odds.outcomes[index];
      assert.equal(outcome.seedEnd - outcome.seedStart, outcome.count);
      assert(outcome.count > 0);
      if (index) assert.equal(outcome.seedStart, odds.outcomes[index - 1].seedEnd);
    }
    assert.equal(odds.common + odds.rare + odds.exceptional, 100);
    for (const rarity of ['common', 'rare', 'exceptional']) assert.equal(odds[rarity], odds.counts[rarity] * 100 / SPACE);
  }
});

test('first and last seed of every outcome select precisely that inherited identity', () => {
  const state = createState(), parents = ['x', 'y'];
  for (const outcome of getOdds(state, parents).outcomes) {
    for (const seed of [outcome.seedStart, outcome.seedEnd - 1]) {
      const result = start(state, parents, () => true, { seed }).trials[0].result;
      assert.deepEqual(result.potentialIds, outcome.potentialIds);
      assert.equal(result.slotCapacity, outcome.slotCapacity); assert.equal(result.rarity, outcome.rarity);
    }
  }
});

test('ordinary retention is 65 or 90 percent and capacity follows the parents', () => {
  const odds = getOdds(createState(), ['x', 'y']);
  for (const item of odds.potentialOdds) {
    const expected = item.traitId === 'yield' ? 90 : 65;
    assert.equal(item.nominalPercent, expected); assert(Math.abs(item.percent - expected) < odds.outcomes.length * 100 / SPACE);
    assert.equal(item.count, odds.outcomes.filter(o => o.potentialIds.includes(item.traitId)).reduce((sum, o) => sum + o.count, 0));
  }
  assert.deepEqual(odds.capacityOdds.map(c => c.nominalPercent), [50, 50]);
  for (const item of odds.capacityOdds) assert(Math.abs(item.percent - 50) < 64 * 100 / SPACE);
  assert.deepEqual(getOdds(createState(), ['x', 'z']).capacityOdds, [{ capacity: 3, percent: 100, count: SPACE, nominalPercent: 100 }]);
});

test('B1 retention is 35 percent from one parent and 65 from two', () => {
  const first = getOdds(createState(), ['x', 'z']).potentialOdds.find(item => item.traitId === 'b1');
  assert.equal(first.nominalPercent, 35); assert(Math.abs(first.percent - 35) < 64 * 100 / SPACE);
  const state = allPotentialChild(), child = state.varieties[0];
  const odds = getOdds(state, [child.id, 'z']);
  assert.equal(odds.potentialOdds.find(item => item.traitId === 'b1').nominalPercent, 65);
  assert.equal(odds.potentialOdds.find(item => item.traitId === 'quality').nominalPercent, 90);
  assert.equal(odds.generation, 2);
});

test('absent traits never appear, empty potentials are legal, and capacities cannot mutate', () => {
  const state = createState(), odds = getOdds(state, ['x', 'y']);
  assert(odds.outcomes.every(outcome => !outcome.potentialIds.includes('b1')));
  assert(odds.outcomes.every(outcome => [3, 5].includes(outcome.slotCapacity)));
  const empty = keep(reveal(start(state, ['x', 'y'], outcome => outcome.potentialIds.length === 0)));
  assert.deepEqual(empty.varieties[0].potentialIds, []);
  assert.deepEqual(getConfiguration(empty, empty.varieties[0].id).activeIds, []);
  refused(empty, { type: 'ACTIVATE', varietyId: empty.varieties[0].id, slotIndex: 0, traitId: 'citrus' }, 'potential-unavailable');
});

test('rarity is the explicit potential/capacity classification, not lot quality', () => {
  let state = keep(reveal(start(createState(), ['y', 'x'], o => o.slotCapacity === 5 && o.potentialIds.length === 4)));
  const odds = getOdds(state, [state.varieties[0].id, 'z']);
  assert.equal(odds.outcomes.length, 64);
  for (const outcome of odds.outcomes) {
    const tastes = outcome.potentialIds.includes('citrus') && outcome.potentialIds.includes('floral');
    const expected = outcome.slotCapacity === 5 && tastes && outcome.potentialIds.includes('b1') ? 'exceptional' : outcome.potentialIds.includes('b1') || outcome.slotCapacity === 5 && tastes ? 'rare' : 'common';
    assert.equal(outcome.rarity, expected);
  }
  state = harvest(state, state.varieties[0].id);
  state = start(state, [state.varieties[0].id, 'z'], o => o.rarity === 'exceptional');
  const trial = state.trials.at(-1);
  assert.equal(trial.result.rarity, 'exceptional');
  assert.deepEqual(trial.result.accent, getVisualPhenotype(trial.result.visual).accent);
  assert.deepEqual(trial.batch, { id: 'batch-002', quality: 'demo-standard', quantity: 1, unit: 'specimen' });
  const rare = start().trials[0].result;
  assert.deepEqual(rare.accent, getVisualPhenotype(rare.visual).accent);
});

test('parent order is immaterial to the exact inheritance odds', () => {
  assert.deepEqual(getOdds(createState(), ['x', 'y']), getOdds(createState(), ['y', 'x']));
  for (const pair of [['x', 'x'], ['x', 'unknown'], [], null]) assert.equal(getOdds(createState(), pair), null);
});

test('START consumes precisely one distinct physical cutting per parent and locks the pot', () => {
  const before = createState(), state = start(before), trial = state.trials[0];
  assert.equal(before.inventory.length, 9); assert.equal(state.inventory.length, 7);
  assert.deepEqual(trial.cuttingIds, ['cutting-x-1', 'cutting-z-1']);
  assert.deepEqual(trial.result.parents, ['x', 'z']); assert.equal(state.pot.trialId, trial.id);
  assert.equal(state.activeTrialId, trial.id); assert.equal(trial.phase, 'growing');
  refused(state, { type: 'START', parentIds: ['x', 'y'], seed: 0, requestId: 'another' }, 'trial-in-progress');
  const advanced = step(state, 'ADVANCE'); assert.equal(advanced.pot.trialId, null);
  refused(advanced, { type: 'START', parentIds: ['x', 'y'], seed: 0, requestId: 'another' }, 'trial-in-progress');
});

test('duplicate request remains idempotent before and after reload, including changed seed', () => {
  let state = start();
  for (const phase of ['growing', 'ready', 'inspected', 'revealed', 'kept']) {
    assert.equal(state.trials[0].phase, phase);
    state = reload(state);
    const result = transition(state, { type: 'START', requestId: 'request-1', parentIds: ['y', 'z'], seed: SPACE - 1 });
    assert.equal(result.ok, true); assert.equal(result.state, state); assert.equal(result.event, 'request-already-committed');
    if (phase === 'growing') state = step(state, 'ADVANCE');
    else if (phase === 'ready') state = step(state, 'INSPECT');
    else if (phase === 'inspected') state = step(state, 'REVEAL');
    else if (phase === 'revealed') state = keep(state);
  }
  assert.equal(state.trials.length, 1); assert.equal(state.inventory.length, 7);
});

test('seed alone chooses the outcome independently of gesture, time, coordinates or precision', () => {
  const command = { type: 'START', parentIds: ['x', 'z'], seed: 3312313, requestId: 'same' };
  const first = transition(createState(), { ...command, pressure: 0, x: 0, y: 0, elapsed: 0 }, 1).state;
  const second = transition(createState(), { ...command, pressure: 1, x: 99999, y: -99999, elapsed: 999999 }, 900000).state;
  assert.deepEqual(first.trials[0].result, second.trials[0].result);
  assert.deepEqual(first.trials[0].odds, second.trials[0].odds);
  assert.deepEqual(first.history[0].command, second.history[0].command);
});

test('invalid parent, seed, direct trait choice and unknown commands preserve the original reference', () => {
  const state = createState(), command = { type: 'START', parentIds: ['x', 'y'], seed: 0, requestId: 'a' };
  refused(state, { ...command, parentIds: ['x', 'x'] }, 'distinct-parents-required');
  refused(state, { ...command, parentIds: ['x', 'missing'] }, 'parents-required');
  for (const seed of [-1, SPACE, 1.5, undefined, NaN]) refused(state, { ...command, seed }, 'seed-required');
  for (const key of ['intent', 'taste', 'effect', 'potentialIds', 'slotCapacity', 'visual']) refused(state, { ...command, [key]: 'chosen' }, 'direct-trait-selection-removed');
  refused(state, { type: 'UPGRADE' }, 'unknown-command');
});

test('inspection precedes reveal and configuration does not inspect hidden result data', () => {
  let state = start();
  refused(state, { type: 'REVEAL', trialId: state.activeTrialId }, 'wrong-phase');
  assert.equal(getConfiguration(state, 'variety-001'), null);
  const protectedView = { ...state, trials: [{ phase: 'growing', get result() { throw Error('Hidden result read'); } }] };
  assert.equal(getConfiguration(protectedView, 'variety-001'), null);
  state = step(state, 'ADVANCE'); refused(state, { type: 'REVEAL', trialId: state.activeTrialId }, 'wrong-phase');
  state = step(state, 'INSPECT'); assert.equal(getConfiguration(state, 'variety-001'), null);
  state = step(state, 'REVEAL'); assert.deepEqual(getConfiguration(state, 'variety-001').activeIds, []);
  refused(state, { type: 'ACTIVATE', varietyId: 'variety-001', slotIndex: 0, traitId: 'b1' }, 'variety-not-found');
});

test('rare and exceptional discoveries award each actual parent once, only at reveal', () => {
  let state = start();
  assert.equal(state.research.x.earned, 0); assert.equal(state.research.z.earned, 0);
  state = step(step(state, 'ADVANCE'), 'INSPECT'); assert.equal(state.research.x.earned, 0);
  state = step(state, 'REVEAL'); assert.equal(state.research.x.earned, 1); assert.equal(state.research.z.earned, 1); assert.equal(state.research.y.earned, 0);
  assert.equal(state.trials[0].pointsAwarded, true);
  state = reload(state); refused(state, { type: 'REVEAL', trialId: state.activeTrialId }, 'wrong-phase');
  const common = reveal(start(createState(), ['x', 'y'], outcome => outcome.rarity === 'common'));
  assert.equal(common.trials[0].pointsAwarded, false); assert.equal(common.research.x.earned, 0);
});

test('kept identity has its own empty research, a finite source plant and no automatic cutting', () => {
  const revealed = reveal(start()), state = keep(revealed), child = state.varieties[0];
  assert.deepEqual(state.research[child.id], { earned: 0, spent: 0, choices: {} });
  assert.deepEqual(state.inventory, revealed.inventory);
  assert.deepEqual(state.plants.at(-1), { id: 'plant-variety-001', varietyId: child.id, capacity: 8, harvested: 0, createdByTrialId: 'trial-001' });
  assert.deepEqual(child.parents, ['x', 'z']); assert.equal(child.trialId, 'trial-001');
  const { name, signature, trialId, ...identity } = child; assert.deepEqual(identity, state.trials[0].result);
  refused(state, { type: 'START', parentIds: [child.id, 'x'], seed: 0, requestId: 'needs-cutting' }, 'insufficient-cuttings');
});

test('kept descendants earn their own points from a later rare descendant', () => {
  let state = allPotentialChild(), child = state.varieties[0];
  state = harvest(state, child.id); state = start(state, [child.id, 'z']);
  assert.equal(state.research[child.id].earned, 0);
  state = reveal(state); assert.equal(state.research[child.id].earned, 1);
  assert.deepEqual(state.trials.at(-1).result.parents, [child.id, 'z']);
  assert.equal(state.trials.at(-1).result.generation, 2);
});

test('ACTIVATE spends one point per unique inherited potential in a free valid slot', () => {
  let state = earn();
  state = activate(state, 'x', 2, 'citrus');
  assert.deepEqual(state.research.x, { earned: 1, spent: 1, choices: { 'slot-2': 'citrus' } });
  assert.deepEqual(getConfiguration(state, 'x').slots, [{ id: 'slot-0', index: 0, traitId: null }, { id: 'slot-1', index: 1, traitId: null }, { id: 'slot-2', index: 2, traitId: 'citrus' }]);
  assert.deepEqual(state.activations[0], { id: 'activation-001', varietyId: 'x', slotIndex: 2, traitId: 'citrus', cost: 1 });
  refused(state, { type: 'ACTIVATE', varietyId: 'x', slotIndex: 2, traitId: 'floral' }, 'slot-occupied');
  refused(state, { type: 'ACTIVATE', varietyId: 'x', slotIndex: 0, traitId: 'citrus' }, 'trait-already-active');
  refused(state, { type: 'ACTIVATE', varietyId: 'x', slotIndex: 0, traitId: 'floral' }, 'research-point-required');
  refused(state, { type: 'ACTIVATE', varietyId: 'x', slotIndex: 0, traitId: 'b1' }, 'potential-unavailable');
  for (const slotIndex of [-1, 3, 1.5, undefined]) refused(state, { type: 'ACTIVATE', varietyId: 'x', slotIndex, traitId: 'floral' }, 'slot-unavailable');
  refused(state, { type: 'ACTIVATE', varietyId: 'unknown', slotIndex: 0, traitId: 'floral' }, 'variety-not-found');
});

test('production and quality activations alter only configuration indicators', () => {
  let state = earn(), before = structuredClone(state);
  state = activate(state, 'x', 0, 'yield'); state = activate(state, 'z', 0, 'quality');
  assert.equal(getConfiguration(state, 'x').productionBranches, 5); assert.equal(getConfiguration(state, 'z').qualityPotential, true);
  assert.deepEqual(state.inventory, before.inventory); assert.deepEqual(state.plants, before.plants);
  assert.deepEqual(state.trials, before.trials); assert.deepEqual(getStrains(state), getStrains(before));
  assert.deepEqual(getOdds(state, ['x', 'z']), getOdds(before, ['x', 'z']));
  assert.equal(state.trials[0].batch.quality, 'demo-standard');
});

test('activated choices and earned points never pass to a descendant or replace inherited potentials', () => {
  let state = activate(earn(), 'x', 0, 'citrus');
  const initialOdds = getOdds(state, ['x', 'z']);
  state = allPotentialChild(state); const child = state.varieties[0];
  assert(child.potentialIds.includes('citrus')); assert(child.potentialIds.includes('floral'));
  assert.deepEqual(getConfiguration(state, child.id).activeIds, []);
  assert.deepEqual(state.research[child.id], { earned: 0, spent: 0, choices: {} });
  assert.deepEqual(state.trials.at(-1).odds, initialOdds);
});

test('archive retains genealogy and result without resource refund or a source plant', () => {
  const revealed = reveal(start()), state = archive(revealed);
  assert.equal(state.trials[0].phase, 'archived'); assert.deepEqual(state.trials[0].result, revealed.trials[0].result);
  assert.deepEqual(state.inventory, revealed.inventory); assert.equal(state.varieties.length, 0); assert.equal(state.plants.length, 3);
  assert.deepEqual(getConfiguration(state, 'variety-001').activeIds, []);
  assert.deepEqual(reload(state), state);
});

test('KEEP sanitizes names and signatures without altering identity', () => {
  const revealed = reveal(start());
  refused(revealed, { type: 'KEEP', trialId: revealed.activeTrialId, name: '\u0000<> ' }, 'name-required');
  const state = step(revealed, 'KEEP', { name: ' <Café>\u202e\n  ', signature: '🙂'.repeat(60) });
  assert.equal(state.varieties[0].name, 'Café'); assert.equal(Array.from(state.varieties[0].signature).length, 48);
  assert.deepEqual(state.trials[0].result, revealed.trials[0].result);
  assert.deepEqual(reload(state), state);
});

test('HARVEST creates one identifiable cutting from a bounded real plant and preserves conservation', () => {
  let state = allPotentialChild(), child = state.varieties[0];
  const initialInventory = state.inventory.length;
  for (let index = 1; index <= 8; index++) {
    state = harvest(state, child.id); const cutting = state.inventory.at(-1);
    assert.equal(cutting.id, `cutting-harvest-${String(index).padStart(3, '0')}`);
    assert.equal(cutting.sourcePlantId, `plant-${child.id}`); assert.equal(cutting.varietyId, child.id);
    assert.equal(state.plants.at(-1).harvested, index); assert.equal(state.inventory.length, initialInventory + index);
  }
  refused(state, { type: 'HARVEST', varietyId: child.id }, 'plant-exhausted');
  refused(state, { type: 'HARVEST', varietyId: 'absent' }, 'source-plant-required');
  assert.equal(state.inventory.length + state.trials.reduce((sum, t) => sum + t.cuttingIds.length, 0), 9 + state.harvests.length);
  assert.equal(validateState(reload(state)).inventory.length, initialInventory + 8);
});

test('initial stocks are finite and insufficient START does not consume its available partner', () => {
  let state = createState();
  for (let index = 0; index < 3; index++) state = earn(state);
  const before = state.inventory.length;
  refused(state, { type: 'START', parentIds: ['x', 'y'], seed: 0, requestId: 'no-x' }, 'insufficient-cuttings');
  assert.equal(state.inventory.length, before);
  for (let index = 0; index < 3; index++) state = harvest(state, 'x');
  refused(state, { type: 'HARVEST', varietyId: 'x' }, 'plant-exhausted');
});

test('save/reload replays every phase and preserves one immutable stored result', () => {
  let state = start(), identity = structuredClone(state.trials[0].result);
  for (const type of ['ADVANCE', 'INSPECT', 'REVEAL', 'KEEP']) {
    state = reload(state); assert.deepEqual(state.trials[0].result, identity);
    state = step(state, type, type === 'KEEP' ? { name: 'Saved' } : {});
  }
  state = activate(state, 'x', 0, 'yield'); state = harvest(state, state.varieties[0].id);
  assert.deepEqual(reload(state), state);
});

test('history validation rejects altered identity, lottery, rewards, slots, cost, resources and phase', () => {
  const valid = activate(allPotentialChild(), 'x', 0, 'citrus');
  const mutations = [
    state => { state.trials[0].seed++; },
    state => { state.trials[0].result.slotCapacity = 5; },
    state => { state.trials[0].result.potentialIds = []; },
    state => { state.trials[0].odds.counts.rare++; },
    state => { state.trials[0].result.parents.reverse(); },
    state => { state.research.x.earned++; },
    state => { state.research.x.spent = 0; },
    state => { state.research.x.choices['slot-0'] = 'b1'; },
    state => { state.activations[0].cost = 0; },
    state => { state.inventory.push(structuredClone(state.inventory[0])); },
    state => { state.plants.at(-1).capacity++; },
    state => { state.trials[0].batch.quality = 'premium'; },
    state => { state.trials[0].pointsAwarded = false; },
    state => { state.trials[0].phase = 'inspected'; },
    state => { state.pot.trialId = 'trial-001'; },
    state => { state.history.pop(); },
  ];
  for (const mutate of mutations) { const damaged = structuredClone(valid); mutate(damaged); assert.throws(() => restoreState(damaged), /Invalid research state/); }
  assert.throws(() => restoreState({ ...createState(), schema: 2 }), /unsupported schema/);
  assert.throws(() => restoreState('{invalid'), SyntaxError);
});
