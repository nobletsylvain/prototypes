import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, dispatch, tick, mass, audit, inventorySlots, PARAMETERS } from './model.mjs';

const A = 'lot-amber-01', B = 'lot-amber-02', C = 'lot-ochre-01';
function valid(state) { const report = audit(state); assert.equal(report.ok, true, report.errors.join('; ')); assert.equal(report.total, 10000); }
function act(state, action) { const result = dispatch(state, action); assert.equal(result.ok, true, JSON.stringify({ action, result })); valid(state); return result; }
function denied(state, action, code) { const before = JSON.stringify(state); const result = dispatch(state, action); assert.equal(result.ok, false); if (code) assert.equal(result.code, code); assert.equal(JSON.stringify(state), before); valid(state); return result; }
function advance(state, seconds, input = {}) { const events = []; for (let i = 0; i < Math.ceil(seconds / 0.05); i++) events.push(...tick(state, 0.05, input)); valid(state); return events; }
function extract(state, lotId = A, grams = 1000) {
  let remaining = grams;
  const ids = [];
  while (remaining) {
    const amount = Math.min(1000, remaining);
    act(state, { type: 'load', lotId, grams: amount });
    for (let i = 0; mass(state.drum.contents) && i < 10000; i++) {
      if (i % 6 === 0) act(state, { type: 'impulse' });
      for (const event of tick(state, 0.05)) if (event.type === 'jarProduced') ids.push(event.jarId);
    }
    assert.equal(mass(state.drum.contents), 0);
    remaining -= amount;
  }
  valid(state); return ids;
}
function prepare(state, grams = 1000, lotId = A) {
  const ids = extract(state, lotId, grams);
  for (const jarId of ids) act(state, { type: 'takeJar', jarId });
  act(state, { type: 'depositJars', jarIds: ids });
  advance(state, 1); return ids;
}
function plate(state) {
  advance(state, 1);
  act(state, { type: 'takeTray' });
  act(state, { type: 'pour', grams: state.press.format - mass(state.press.mold) });
  const events = advance(state, state.settings.pressSeconds + 0.8, { press: true });
  assert.equal(events.filter(event => event.type === 'plateEjected').length, 1);
  return state.plates.at(-1);
}

test('initial abstract inventory is exactly 10000 units with immutable lot metadata', () => {
  const state = createState(); valid(state);
  assert.deepEqual(audit(state).byLot, { [A]: 4250, [B]: 4250, [C]: 1500 });
  assert.equal(state.jars.length, 2); assert.equal(state.jars.every(jar => !mass(jar.contents)), true);
});
test('loading removes only the selected source contribution', () => {
  const state = createState(); act(state, { type: 'load', lotId: B, grams: 625 });
  assert.deepEqual(state.drum.contents, [{ lotId: B, grams: 625 }]);
  assert.equal(state.source.find(part => part.lotId === A).grams, 4250);
});
test('loading incompatible varieties is rejected without mutation', () => {
  const state = createState(); act(state, { type: 'load', lotId: A, grams: 250 }); denied(state, { type: 'load', lotId: C, grams: 250 }, 'different_variety');
});
test('same-variety lots may share the drum and remain traceable', () => {
  const state = createState(); act(state, { type: 'load', lotId: A, grams: 125 }); act(state, { type: 'load', lotId: B, grams: 125 });
  for (let i = 0; mass(state.drum.contents) && i < 1000; i++) { act(state, { type: 'impulse' }); tick(state, 0.1); }
  valid(state); assert.deepEqual(state.jars.find(jar => jar.location === 'stock').contents, [{ lotId: A, grams: 125 }, { lotId: B, grams: 125 }]);
});
test('capacity, invalid units and unavailable source are atomically rejected', () => {
  const state = createState(); for (const grams of [-10, 0, 0.1, Infinity, NaN, 1001, 5000]) denied(state, { type: 'load', lotId: A, grams });
  denied(state, { type: 'load', lotId: 'missing', grams: 100 });
});
test('drum does no work without an impulse', () => {
  const state = createState(); act(state, { type: 'load', lotId: A, grams: 1000 }); advance(state, 30);
  assert.equal(mass(state.drum.contents), 1000); assert.equal(state.jars.filter(jar => jar.location === 'stock').length, 0);
});
test('impulses cap speed and release preserves a decaying rotation', () => {
  const state = createState(); for (let i = 0; i < 100; i++) act(state, { type: 'impulse' });
  assert.equal(state.drum.speed, PARAMETERS.maxSpeed);
  tick(state, 0.1); assert.ok(state.drum.speed > 0 && state.drum.speed < PARAMETERS.maxSpeed); assert.ok(state.drum.angle > 0);
  advance(state, 60); assert.equal(state.drum.speed, 0);
});
test('four pots accumulate with one-to-one abstract conservation', () => {
  const state = createState(); extract(state);
  const jars = state.jars.filter(jar => jar.location === 'stock'); assert.equal(jars.length, 4); assert.equal(jars.every(jar => mass(jar.contents) === 250), true);
  assert.equal(state.counters.extracted, 1000); assert.equal(state.source.find(part => part.lotId === A).grams, 3250);
});
test('partial drum amount produces a partial pot without rounding', () => {
  const state = createState(); extract(state, A, 317);
  assert.deepEqual(state.jars.filter(jar => jar.location === 'stock').map(jar => mass(jar.contents)), [250, 67]);
});
test('explicit reuse fills the same empty jar identity', () => {
  const state = createState(), id = state.jars[0].id; act(state, { type: 'reuseJar', jarId: id }); extract(state, A, 250);
  assert.equal(state.jars.length, 2); assert.equal(state.jars[0].id, id); assert.equal(state.jars[0].location, 'stock'); assert.equal(mass(state.jars[0].contents), 250);
});
test('filled or unavailable jars cannot be sent for reuse', () => {
  const state = createState(), [id] = extract(state, A, 250); act(state, { type: 'takeJar', jarId: id }); denied(state, { type: 'reuseJar', jarId: id }); denied(state, { type: 'reuseJar', jarId: 'missing' });
});
test('a chosen subset of accumulated jars is taken without taking its neighbours', () => {
  const state = createState(), ids = extract(state); act(state, { type: 'takeJar', jarId: ids[1] });
  assert.equal(state.jars.find(jar => jar.id === ids[0]).location, 'stock'); assert.equal(state.jars.find(jar => jar.id === ids[1]).location, 'inventory');
});
test('taking an already held jar is rejected without mutation', () => {
  const state = createState(), [jarId] = extract(state, A, 250); act(state, { type: 'takeJar', jarId }); denied(state, { type: 'takeJar', jarId });
});
test('deposit validation is on the sum, not every jar', () => {
  const state = createState(), ids = extract(state, A, 500); for (const jarId of ids) act(state, { type: 'takeJar', jarId });
  denied(state, { type: 'depositJars', jarIds: [ids[0]] }, 'incomplete_deposit');
  act(state, { type: 'depositJars', jarIds: ids }); assert.equal(state.jars.filter(jar => jar.location === 'press').length, 2);
});
test('deposits never pull unselected inventory jars', () => {
  const state = createState(), ids = extract(state); for (const jarId of ids) act(state, { type: 'takeJar', jarId });
  act(state, { type: 'depositJars', jarIds: ids.slice(0, 2) }); advance(state, 10);
  assert.equal(state.jars.find(jar => jar.id === ids[2]).location, 'inventory'); assert.equal(mass(state.jars.find(jar => jar.id === ids[2]).contents), 250);
});
test('duplicate, empty, nonexistent and mixed deposits are all-or-nothing', () => {
  const state = createState(), ids = extract(state, A, 500), other = extract(state, C, 500);
  for (const jarId of [...ids, ...other]) act(state, { type: 'takeJar', jarId });
  for (const jarIds of [[], [ids[0], ids[0]], [ids[0], 'missing'], [state.jars[0].id], [ids[0], other[0]]]) denied(state, { type: 'depositJars', jarIds });
});
test('a different variety cannot be added to a prepared press', () => {
  const state = createState(); prepare(state, 500, A); const ids = extract(state, C, 500); for (const jarId of ids) act(state, { type: 'takeJar', jarId }); denied(state, { type: 'depositJars', jarIds: ids }, 'different_variety');
});
test('feed follows voluntary deposit order rather than jar creation order', () => {
  const state = createState(), a = extract(state, A, 250), b = extract(state, B, 250);
  for (const jarId of [...a, ...b]) act(state, { type: 'takeJar', jarId });
  act(state, { type: 'depositJars', jarIds: [...b, ...a] }); advance(state, 1);
  assert.deepEqual(state.press.queue, [...b, ...a]);
  assert.deepEqual(state.press.tray, [{ lotId: B, grams: 250 }, { lotId: A, grams: 50 }]);
});
test('withdrawing and redepositing a jar appends it to the queue', () => {
  const state = createState(); act(state, { type: 'setFormat', format: 250 }); const ids = extract(state, A, 750);
  for (const jarId of ids) act(state, { type: 'takeJar', jarId }); act(state, { type: 'depositJars', jarIds: ids });
  act(state, { type: 'withdrawJar', jarId: ids[0] }); act(state, { type: 'depositJars', jarIds: [ids[0]] }); assert.deepEqual(state.press.queue, [ids[1], ids[2], ids[0]]);
});
test('automatic feed leaves a recoverable partial jar and conserves empties', () => {
  const state = createState(), ids = prepare(state, 500); assert.equal(mass(state.press.tray), 300);
  const empty = state.jars.find(jar => jar.id === ids[0]), partial = state.jars.find(jar => jar.id === ids[1]);
  assert.equal(mass(empty.contents), 0); assert.equal(mass(partial.contents), 200);
  const before = structuredClone(partial.contents); act(state, { type: 'withdrawJar', jarId: partial.id }); assert.deepEqual(partial.contents, before); assert.equal(mass(state.press.tray), 300);
  act(state, { type: 'withdrawJar', jarId: empty.id }); assert.equal(empty.location, 'inventory');
});
test('no mold fill or press action happens just because jars are deposited', () => {
  const state = createState(); prepare(state); advance(state, 100); assert.equal(mass(state.press.mold), 0); assert.equal(state.plates.length, 0); assert.equal(mass(state.press.tray), 300);
});
test('pour requires picking up the tray and leaves exact partial contents', () => {
  const state = createState(); prepare(state); denied(state, { type: 'pour', grams: 25 });
  act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 37 }); assert.equal(mass(state.press.mold), 37); assert.equal(mass(state.press.tray), 263);
});
test('pour interruption and resume retain the same fill', () => {
  const state = createState(); prepare(state); act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 37 }); advance(state, 5);
  assert.equal(mass(state.press.mold), 37); assert.equal(mass(state.press.tray), 263);
  act(state, { type: 'pour', grams: 63 }); assert.equal(mass(state.press.mold), 100); assert.equal(state.press.trayHeld, false);
});
test('real overflow returns only departed excess, not never-poured surplus', () => {
  const state = createState(); prepare(state); act(state, { type: 'takeTray' }); const result = act(state, { type: 'pour', grams: 140 });
  assert.deepEqual(result.events[0], { type: 'poured', departed: 140, accepted: 100, overflow: 40, neverPoured: 160 });
  assert.equal(mass(state.press.tray), 200); assert.equal(mass(state.press.mold), 100); assert.equal(state.counters.overflowReturned, 40);
  assert.equal(state.counters.departed, state.counters.accepted + state.counters.overflowReturned);
});
test('overflow preserves exact contribution identities across lot boundaries', () => {
  const state = createState(); const a = extract(state, A, 250), b = extract(state, B, 250); for (const jarId of [...a, ...b]) act(state, { type: 'takeJar', jarId });
  act(state, { type: 'depositJars', jarIds: [...a, ...b] }); advance(state, 1); act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 300 });
  assert.deepEqual(state.press.mold, [{ lotId: A, grams: 100 }]); assert.deepEqual(state.press.tray, [{ lotId: A, grams: 150 }, { lotId: B, grams: 50 }]);
});
test('time-based pouring is interruptible and reaches only one mold', () => {
  const state = createState(); prepare(state); act(state, { type: 'takeTray' }); advance(state, 0.2, { pour: true }); const filled = mass(state.press.mold);
  assert.ok(filled > 0 && filled < 100); advance(state, 1); assert.equal(mass(state.press.mold), filled);
  advance(state, 10, { pour: true }); assert.equal(mass(state.press.mold), 100); assert.equal(state.plates.length, 0); assert.equal(state.press.trayHeld, false);
});
test('empty or incomplete mold press is atomically rejected', () => {
  const state = createState(); denied(state, { type: 'press' }, 'mold_incomplete'); prepare(state); act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 50 }); act(state, { type: 'putTray' }); denied(state, { type: 'press' }, 'mold_incomplete');
  advance(state, 10, { press: true }); assert.equal(state.press.progress, 0); assert.equal(state.plates.length, 0);
});
test('press interruption preserves progress and material while the lever returns', () => {
  const state = createState(); prepare(state); act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 100 }); advance(state, 1, { press: true });
  const progress = state.press.progress, contents = structuredClone(state.press.mold), lever = state.press.lever; advance(state, 2);
  assert.equal(state.press.progress, progress); assert.deepEqual(state.press.mold, contents); assert.ok(state.press.lever < lever);
  advance(state, 3, { press: true }); assert.equal(state.plates.length, 1); assert.equal(state.press.progress, 0);
});
test('release after completed compression still returns and ejects once', () => {
  const state = createState(); prepare(state); act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 100 }); advance(state, 2.7, { press: true }); advance(state, 2);
  assert.equal(state.plates.length, 1); advance(state, 20); assert.equal(state.plates.length, 1); assert.equal(mass(state.press.mold), 0);
});
test('format can change without sufficient stock but not during a fill', () => {
  const state = createState(); act(state, { type: 'setFormat', format: 250 }); denied(state, { type: 'press' }); act(state, { type: 'setFormat', format: 100 });
  prepare(state); act(state, { type: 'takeTray' }); denied(state, { type: 'setFormat', format: 250 }); act(state, { type: 'pour', grams: 37 }); act(state, { type: 'putTray' }); denied(state, { type: 'setFormat', format: 250 });
});
test('format change after a cycle preserves nonmultiples as usable material', () => {
  const state = createState(); prepare(state, 500); plate(state); const before = mass(state.press.tray) + state.jars.filter(jar => jar.location === 'press').reduce((sum, jar) => sum + mass(jar.contents), 0);
  act(state, { type: 'setFormat', format: 250 }); assert.equal(before, 400); plate(state);
  assert.equal(state.plates[0].format, 100); assert.equal(state.plates[1].format, 250); assert.equal(mass(state.press.tray), 150);
  act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 150 }); act(state, { type: 'putTray' }); denied(state, { type: 'press' });
});
test('unpressed tray material can enter an existing pot with exact capacity', () => {
  const state = createState(); prepare(state); const jar = state.jars[0]; act(state, { type: 'recover', source: 'tray', jarId: jar.id }); assert.equal(mass(jar.contents), 250); assert.equal(mass(state.press.tray), 50);
  denied(state, { type: 'recover', source: 'tray', jarId: jar.id });
});
test('unpressed mold material can be recovered without new containers', () => {
  const state = createState(); prepare(state); act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 65 }); act(state, { type: 'putTray' }); const count = state.jars.length;
  act(state, { type: 'recover', source: 'mold', jarId: state.jars[0].id }); assert.equal(mass(state.press.mold), 0); assert.equal(mass(state.jars[0].contents), 65); assert.equal(state.jars.length, count);
});
test('started compression cannot be dismantled into a pot', () => {
  const state = createState(); prepare(state); act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 100 }); advance(state, 0.5, { press: true });
  denied(state, { type: 'recover', source: 'mold', jarId: state.jars[0].id }); denied(state, { type: 'recover', source: 'tray', jarId: state.jars[0].id }); denied(state, { type: 'setFormat', format: 250 });
});
test('a composite plate retains each harvest contribution without averaging quality', () => {
  const state = createState(); const ids = [...extract(state, A, 250), ...extract(state, B, 250)]; for (const jarId of ids) act(state, { type: 'takeJar', jarId }); act(state, { type: 'depositJars', jarIds: ids }); advance(state, 1);
  plate(state); plate(state); const composite = plate(state);
  assert.deepEqual(composite.contents, [{ lotId: A, grams: 50 }, { lotId: B, grams: 50 }]); assert.equal('quality' in composite, false); assert.equal(state.lots[A].quality, 'soft'); assert.equal(state.lots[B].quality, 'dense');
});
test('ten repeated plates do not require picking up output', () => {
  const state = createState(); prepare(state); for (let i = 0; i < 10; i++) plate(state);
  assert.equal(state.plates.length, 10); assert.equal(state.plates.every(item => item.location === 'floor'), true); assert.equal(mass(state.press.tray), 0);
});
test('the series continues after ten when more stock was voluntarily deposited', () => {
  const state = createState(); prepare(state, 1500); for (let i = 0; i < 15; i++) plate(state); assert.equal(state.plates.length, 15);
});
test('250 format uses the same press and respects deposit multiples', () => {
  const state = createState(); act(state, { type: 'setFormat', format: 250 }); prepare(state); for (let i = 0; i < 4; i++) plate(state); assert.equal(state.plates.every(item => item.format === 250), true); assert.equal(state.plates.length, 4);
});
test('selection can be corrected and completed before wrapping', () => {
  const state = createState(); prepare(state, 500); const a = plate(state), b = plate(state), c = plate(state);
  act(state, { type: 'selectPlate', plateId: a.id }); act(state, { type: 'selectPlate', plateId: b.id }); act(state, { type: 'deselectPlate', plateId: a.id }); act(state, { type: 'selectPlate', plateId: c.id });
  assert.equal(a.location, 'floor'); assert.equal(b.location, 'hand'); assert.equal(c.location, 'hand');
});
test('package preserves exact plate IDs and contributions through repeated reopening', () => {
  const state = createState(); prepare(state, 500); const plates = [plate(state), plate(state), plate(state)]; const signatures = plates.map(item => JSON.stringify([item.id, item.contents]));
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const item of plates) act(state, { type: 'selectPlate', plateId: item.id }); const result = act(state, { type: 'wrap' }); denied(state, { type: 'openPackage', packageId: result.packageId }); act(state, { type: 'dropPackage', packageId: result.packageId }); act(state, { type: 'openPackage', packageId: result.packageId }); denied(state, { type: 'openPackage', packageId: result.packageId });
    assert.deepEqual(plates.map(item => JSON.stringify([item.id, item.contents])), signatures); assert.equal(plates.every(item => item.location === 'floor'), true);
  }
});
test('different qualities and harvests can share a homogeneous package', () => {
  const state = createState(); prepare(state, 500, A); const a = plate(state); for (let i = 0; i < 4; i++) plate(state); prepare(state, 500, B); const b = plate(state);
  act(state, { type: 'selectPlate', plateId: a.id }); act(state, { type: 'selectPlate', plateId: b.id }); const result = act(state, { type: 'wrap' }); assert.deepEqual(state.packages.find(pack => pack.id === result.packageId).plateIds, [a.id, b.id]);
});
test('different formats cannot enter the held selection', () => {
  const state = createState(); prepare(state, 500); const a = plate(state); act(state, { type: 'setFormat', format: 250 }); const b = plate(state); act(state, { type: 'selectPlate', plateId: a.id }); denied(state, { type: 'selectPlate', plateId: b.id }, 'incompatible_plate');
});
test('different varieties cannot enter the held selection', () => {
  const state = createState(); prepare(state, 500, A); const a = plate(state); for (let i = 0; i < 4; i++) plate(state); prepare(state, 500, C); const b = plate(state); act(state, { type: 'selectPlate', plateId: a.id }); denied(state, { type: 'selectPlate', plateId: b.id }, 'incompatible_plate');
});
test('selection accepts thirty and rejects a thirty-first plate atomically', () => {
  const state = createState(); prepare(state, 3500); for (let i = 0; i < 31; i++) plate(state);
  for (let i = 0; i < 30; i++) act(state, { type: 'selectPlate', plateId: state.plates[i].id }); denied(state, { type: 'selectPlate', plateId: state.plates[30].id }, 'selection_full');
  const result = act(state, { type: 'wrap' }); assert.equal(state.packages.find(pack => pack.id === result.packageId).plateIds.length, 30);
});
test('one plate is a valid package and empty hands are not', () => {
  const state = createState(); denied(state, { type: 'wrap' }); prepare(state, 500); const a = plate(state); act(state, { type: 'selectPlate', plateId: a.id }); act(state, { type: 'wrap' }); assert.equal(state.packages[0].plateIds.length, 1);
});
test('a held package prevents taking another plate or the tray', () => {
  const state = createState(); prepare(state); const a = plate(state), b = plate(state); act(state, { type: 'selectPlate', plateId: a.id }); act(state, { type: 'wrap' }); denied(state, { type: 'selectPlate', plateId: b.id }); denied(state, { type: 'takeTray' });
});
test('inventory slots group no more than ten jars without deleting identities', () => {
  const state = createState(); const ids = extract(state, A, 3250); for (const jarId of ids) act(state, { type: 'takeJar', jarId }); const slots = inventorySlots(state);
  assert.equal(slots.every(slot => slot.jarIds.length <= 10), true); assert.equal(new Set(slots.flatMap(slot => slot.jarIds)).size, 15); assert.equal(slots.filter(slot => slot.variety === 'amber').length, 2);
});
test('feel presets alter only fictional animation timing and inertia', () => {
  const state = createState(); const before = audit(state); act(state, { type: 'setFeel', feeling: 'weighty' }); assert.equal(state.settings.pressSeconds, 3.3); assert.deepEqual(audit(state), before); act(state, { type: 'setFeel', preset: 'snappy' }); assert.equal(state.settings.pressSeconds, 2.6); denied(state, { type: 'setFeel', feeling: 'unknown' });
});
test('serialization preserves resumable production and all identities', () => {
  let state = createState(); prepare(state); act(state, { type: 'takeTray' }); act(state, { type: 'pour', grams: 100 }); advance(state, 1, { press: true }); const snapshot = JSON.stringify(state); state = JSON.parse(snapshot); valid(state); advance(state, 3, { press: true }); assert.equal(state.plates.length, 1);
});
test('audit catches a duplicated contribution, changed metadata, lost jar and changed plate', () => {
  const state = createState(); prepare(state, 500); plate(state);
  const changes = [s => s.source[0].grams++, s => s.lots[A].quality = 'changed', s => s.jars.pop(), s => s.plates[0].contents[0].grams++];
  for (const change of changes) { const broken = structuredClone(state); change(broken); assert.equal(audit(broken).ok, false); }
});
test('unknown actions, invalid recovery and invalid time never mutate state', () => {
  const state = createState(); denied(state, { type: 'unknown' }); denied(state, { type: 'recover', source: 'other', jarId: state.jars[0].id }); const before = JSON.stringify(state); for (const dt of [0, -1, Infinity, NaN]) assert.deepEqual(tick(state, dt), []); assert.equal(JSON.stringify(state), before);
});
test('seeded mixed actions preserve per-lot mass and every refusal is atomic', () => {
  const state = createState(); prepare(state, 2000); let seed = 0x51a7;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 4000; i++) {
    const jar = state.jars[Math.floor(random() * state.jars.length)];
    const item = state.plates[Math.floor(random() * state.plates.length)];
    const pack = state.packages[Math.floor(random() * state.packages.length)];
    const options = [
      { type: 'takeTray' }, { type: 'putTray' }, { type: 'pour', grams: Math.floor(random() * 200) + 1 },
      { type: 'setFormat', format: random() < 0.5 ? 100 : 250 }, { type: 'press' },
      { type: 'withdrawJar', jarId: jar?.id }, { type: 'depositJars', jarIds: [jar?.id] },
      { type: 'recover', source: random() < 0.5 ? 'tray' : 'mold', jarId: jar?.id, grams: Math.floor(random() * 100) + 1 },
      { type: 'selectPlate', plateId: item?.id }, { type: 'deselectPlate', plateId: item?.id },
      { type: 'wrap' }, { type: 'dropPackage', packageId: pack?.id }, { type: 'openPackage', packageId: pack?.id }
    ];
    const before = JSON.stringify(state); const result = dispatch(state, options[Math.floor(random() * options.length)]);
    if (!result.ok) assert.equal(JSON.stringify(state), before);
    tick(state, 0.05, { press: random() < 0.6, pour: random() < 0.4 }); valid(state);
  }
});
