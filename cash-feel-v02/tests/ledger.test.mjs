import test from 'node:test';
import assert from 'node:assert/strict';
import { CashLedger, CASH_LIMITS } from '../ledger.mjs';

function conserved(ledger) {
  const audit = ledger.verify();
  assert.equal(audit.ok, true, JSON.stringify(audit.errors));
  const original = ledger.notes.map(note => note.id).sort();
  const current = ledger.entities.flatMap(entity => entity.noteIds).sort();
  assert.deepEqual(current, original, 'Every original identity exists exactly once');
  assert.equal(new Set(current).size, original.length);
  assert.equal(audit.totalValue, ledger.mode === 'small' ? 2200 : 22000);
  for (const entity of ledger.entities) {
    const denominations = entity.noteIds.map(id => ledger.notes.find(note => note.id === id).denomination);
    if (entity.type === 'bundle') {
      assert.equal(denominations.length, 100);
      assert.equal(new Set(denominations).size, 1);
    }
  }
}

function accepted(ledger, operation) {
  const result = operation();
  assert.equal(result.ok, true, result.reason);
  conserved(ledger);
  return result;
}

function rejected(ledger, operation, reason) {
  const before = ledger.snapshot();
  const result = operation();
  assert.equal(result.ok, false);
  if (reason) assert.equal(result.reason, reason);
  assert.deepEqual(ledger.snapshot(), before, 'Refusal leaves all monetary and container state unchanged');
  conserved(ledger);
  return result;
}

function idsAt(ledger, location, count = Infinity) {
  return ledger.getEntities(location).slice(0, count).map(entity => entity.id);
}

function sendTableToOutput(ledger) {
  while (ledger.getEntities('table').length) {
    accepted(ledger, () => ledger.pickup(idsAt(ledger, 'table', 100)));
    accepted(ledger, () => ledger.feed());
    while (ledger.getEntities('input').length) {
      const result = ledger.tickMachine();
      assert.equal(result.ok, true);
      assert.equal(result.entity.location, 'output');
      assert.equal(result.entity.type, 'note');
    }
    conserved(ledger);
  }
}

function smallWithBundle() {
  const ledger = new CashLedger();
  accepted(ledger, () => ledger.dump());
  accepted(ledger, () => ledger.pickup(idsAt(ledger, 'table', 100)));
  accepted(ledger, () => ledger.feed());
  for (let index = 0; index < 100; index++) assert.equal(ledger.tickMachine().ok, true);
  accepted(ledger, () => ledger.bind(20));
  return ledger;
}

test('scenario identities, denominations, totals and all capacities are exact', () => {
  for (const mode of ['small', 'large']) {
    const ledger = new CashLedger(mode);
    conserved(ledger);
    const scale = mode === 'large' ? 10 : 1;
    assert.equal(ledger.notes.length, 120 * scale);
    assert.equal(ledger.notes.filter(note => note.denomination === 20).length, 100 * scale);
    assert.equal(ledger.notes.filter(note => note.denomination === 10).length, 20 * scale);
    assert.equal(ledger.getEntities('pouch').length, 120 * scale);
    assert.deepEqual(ledger.slots.map(slot => slot.form), [null, null, null, null, null]);
  }
  assert.deepEqual(CASH_LIMITS, { handObjects: 100, loosePerSlot: 100, bundlesPerSlot: 10, notesPerBundle: 100 });
  assert.throws(() => new CashLedger('unknown'), RangeError);
});

test('dump moves original notes and repeated dump refuses without changing state', () => {
  const ledger = new CashLedger();
  const result = accepted(ledger, () => ledger.dump());
  assert.equal(result.moved, 120);
  assert.equal(ledger.getEntities('pouch').length, 0);
  assert.equal(ledger.getEntities('table').length, 120);
  rejected(ledger, () => ledger.dump(), 'pouch-empty');
});

test('pickup is additive, reaches 100 and refuses 101 atomically', () => {
  const ledger = new CashLedger();
  ledger.dump();
  accepted(ledger, () => ledger.pickup(idsAt(ledger, 'table', 99)));
  assert.equal(ledger.handObjects, 99);
  accepted(ledger, () => ledger.pickup(idsAt(ledger, 'table', 1)));
  assert.equal(ledger.handObjects, 100);
  rejected(ledger, () => ledger.pickup(idsAt(ledger, 'table', 1)), 'hand-full');
  accepted(ledger, () => ledger.dropHand());
  assert.equal(ledger.getEntities('table').length, 120);
  rejected(ledger, () => ledger.pickup(idsAt(ledger, 'table', 101)), 'hand-full');
});

test('invalid selections, duplicate ids and stale ids cannot partially move notes', () => {
  const ledger = new CashLedger();
  rejected(ledger, () => ledger.pickup(['note-0001']), 'not-on-table');
  ledger.dump();
  for (const selection of [[], null, ['note-0001', 1]]) rejected(ledger, () => ledger.pickup(selection), 'invalid-selection');
  rejected(ledger, () => ledger.pickup(['note-0001', 'note-0001']), 'duplicate-selection');
  rejected(ledger, () => ledger.pickup(['note-0001', 'missing']), 'not-on-table');
  accepted(ledger, () => ledger.pickup(['note-0001']));
  rejected(ledger, () => ledger.pickup(['note-0002', 'note-0001']), 'not-on-table');
});

test('machine transfers one real note per tick without converting denominations', () => {
  const ledger = new CashLedger();
  ledger.dump();
  accepted(ledger, () => ledger.pickup(['note-0001', 'note-0101', 'note-0002']));
  accepted(ledger, () => ledger.feed());
  assert.equal(ledger.handObjects, 0);
  for (let index = 0; index < 3; index++) {
    const result = accepted(ledger, () => ledger.tickMachine());
    assert.equal(result.moved, 1);
    assert.equal(ledger.getEntities('input').length, 2 - index);
    assert.equal(ledger.getEntities('output').length, index + 1);
    assert.equal(ledger.denomination(result.entity), ledger.notes.find(note => note.id === result.entity.id).denomination);
  }
  rejected(ledger, () => ledger.tickMachine(), 'input-empty');
});

test('binding requires 100 notes of the requested denomination in output', () => {
  const ledger = new CashLedger();
  ledger.dump();
  const mixed = [...idsAt(ledger, 'table', 99), 'note-0101'];
  ledger.pickup(mixed);
  ledger.feed();
  while (ledger.getEntities('input').length) ledger.tickMachine();
  rejected(ledger, () => ledger.bind(20), 'need-100-matching-notes');
  rejected(ledger, () => ledger.bind(10), 'need-100-matching-notes');
  rejected(ledger, () => ledger.bind('20'), 'invalid-denomination');
  rejected(ledger, () => ledger.bind(50), 'invalid-denomination');
  ledger.pickup(['note-0100']);
  ledger.feed();
  ledger.tickMachine();
  const bound = accepted(ledger, () => ledger.bind(20));
  assert.equal(bound.entity.noteIds.length, 100);
  assert.equal(ledger.getEntities('output').length, 2);
  assert.equal(ledger.denomination(bound.entity), 20);
  rejected(ledger, () => ledger.bind(20), 'need-100-matching-notes');
});

test('output prioritizes one bundle and an opened bundle restores all original notes in hand', () => {
  const ledger = smallWithBundle();
  ledger.pickup(idsAt(ledger, 'table', 20));
  ledger.feed();
  while (ledger.getEntities('input').length) ledger.tickMachine();
  const bundleIds = ledger.getEntities('output').find(entity => entity.type === 'bundle').noteIds;
  const take = accepted(ledger, () => ledger.takeOutput());
  assert.equal(take.moved, 1);
  assert.equal(take.entity.type, 'bundle');
  assert.equal(ledger.handObjects, 1);
  assert.equal(ledger.getEntities('output').length, 20);
  accepted(ledger, () => ledger.openHand());
  assert.equal(ledger.handObjects, 100);
  assert.deepEqual(idsAt(ledger, 'hand').sort(), [...bundleIds].sort());
  assert.equal(ledger.getEntities('table').length, 0, 'Opening alone does not disperse notes onto the table');
  accepted(ledger, () => ledger.dropHand());
  assert.equal(ledger.getEntities('table').length, 100);
});

test('bundle opening and feed refuse atomically when held contents are incompatible', () => {
  const ledger = smallWithBundle();
  ledger.takeOutput();
  ledger.pickup(idsAt(ledger, 'table', 1));
  assert.equal(ledger.handObjects, 2);
  rejected(ledger, () => ledger.openHand(), 'hand-full');
  rejected(ledger, () => ledger.feed(), 'open-bundle-first');
  ledger.dropHand();
  const bundle = ledger.getEntities('table').find(entity => entity.type === 'bundle');
  ledger.pickup([bundle.id]);
  accepted(ledger, () => ledger.openHand());
  assert.equal(ledger.handObjects, 100);
  rejected(ledger, () => ledger.openHand(), 'no-held-bundle');
});

test('loose slot accepts mixed denominations, fills partially and retains the remainder in hand', () => {
  const ledger = new CashLedger();
  ledger.dump();
  ledger.pickup(idsAt(ledger, 'table', 90));
  accepted(ledger, () => ledger.store(0));
  ledger.pickup(idsAt(ledger, 'table', 30));
  const result = accepted(ledger, () => ledger.store(0));
  assert.equal(result.moved, 10);
  assert.equal(result.remaining, 20);
  assert.equal(ledger.getEntities('slot0').length, 100);
  assert.equal(ledger.handObjects, 20);
  rejected(ledger, () => ledger.store(0), 'slot-full');
  accepted(ledger, () => ledger.store(1));
  assert.equal(ledger.getEntities('slot1').length, 20);
  assert.equal(ledger.slots[0].form, 'note');
  assert.equal(ledger.slots[1].form, 'note');
  ledger.withdraw(0);
  ledger.dropHand();
  ledger.withdraw(1);
  ledger.dropHand();
  ledger.pickup(['note-0001', 'note-0101']);
  accepted(ledger, () => ledger.store(0));
  assert.deepEqual(ledger.getEntities('slot0').map(entity => ledger.denomination(entity)).sort((a, b) => a - b), [10, 20]);
});

test('slot assignment survives withdrawal; reassignment requires emptying and explicit clearing', () => {
  const ledger = smallWithBundle();
  ledger.pickup(['note-0101']);
  ledger.store(0);
  rejected(ledger, () => ledger.clearSlot(0), 'slot-not-empty');
  ledger.withdraw(0);
  ledger.dropHand();
  assert.equal(ledger.slots[0].form, 'note');
  ledger.takeOutput();
  rejected(ledger, () => ledger.store(0), 'incompatible-form');
  accepted(ledger, () => ledger.clearSlot(0));
  accepted(ledger, () => ledger.store(0));
  assert.equal(ledger.slots[0].form, 'bundle');
  rejected(ledger, () => ledger.clearSlot(0), 'slot-not-empty');
  accepted(ledger, () => ledger.withdraw(0));
  assert.equal(ledger.slots[0].form, 'bundle');
  assert.equal(ledger.handObjects, 1);
  accepted(ledger, () => ledger.clearSlot(0));
  assert.equal(ledger.slots[0].form, null);
});

test('large scenario creates twelve real bundles; a bundle slot accepts ten and leaves two held', () => {
  const ledger = new CashLedger('large');
  ledger.dump();
  sendTableToOutput(ledger);
  for (let index = 0; index < 10; index++) accepted(ledger, () => ledger.bind(20));
  for (let index = 0; index < 2; index++) accepted(ledger, () => ledger.bind(10));
  assert.equal(ledger.entities.length, 12);
  for (let index = 0; index < 12; index++) accepted(ledger, () => ledger.takeOutput());
  assert.equal(ledger.handObjects, 12);
  const stored = accepted(ledger, () => ledger.store(0));
  assert.equal(stored.moved, 10);
  assert.equal(ledger.getEntities('slot0').length, 10);
  assert.equal(ledger.handObjects, 2);
  rejected(ledger, () => ledger.store(0), 'slot-full');
  accepted(ledger, () => ledger.store(1));
  ledger.withdraw(0);
  ledger.withdraw(1);
  assert.equal(ledger.handObjects, 2);
  accepted(ledger, () => ledger.store(2));
  assert.deepEqual(ledger.getEntities('slot2').map(entity => ledger.denomination(entity)).sort((a, b) => a - b), [10, 20]);
  assert.equal(ledger.totalValue, 22000);
});

test('withdrawal takes only available loose capacity and preserves the slot remainder', () => {
  const ledger = new CashLedger();
  ledger.dump();
  ledger.pickup(idsAt(ledger, 'table', 100));
  ledger.store(0);
  ledger.pickup(idsAt(ledger, 'table', 20));
  const result = accepted(ledger, () => ledger.withdraw(0));
  assert.equal(result.moved, 80);
  assert.equal(ledger.handObjects, 100);
  assert.equal(ledger.getEntities('slot0').length, 20);
  rejected(ledger, () => ledger.withdraw(0), 'hand-full');
});

test('taking loose output respects available hand capacity', () => {
  const ledger = new CashLedger();
  ledger.dump();
  ledger.pickup(idsAt(ledger, 'table', 100));
  ledger.feed();
  while (ledger.getEntities('input').length) ledger.tickMachine();
  ledger.pickup(idsAt(ledger, 'table', 20));
  const result = accepted(ledger, () => ledger.takeOutput());
  assert.equal(result.moved, 80);
  assert.equal(ledger.getEntities('output').length, 20);
  rejected(ledger, () => ledger.takeOutput(), 'hand-full');
});

test('empty operations and invalid slots refuse without touching identities or associations', () => {
  const ledger = new CashLedger();
  for (const [operation, reason] of [
    [() => ledger.dropHand(), 'hand-empty'],
    [() => ledger.feed(), 'hand-empty'],
    [() => ledger.tickMachine(), 'input-empty'],
    [() => ledger.takeOutput(), 'output-empty'],
    [() => ledger.openHand(), 'no-held-bundle'],
    [() => ledger.store(0), 'hand-empty'],
    [() => ledger.withdraw(0), 'slot-empty'],
    [() => ledger.clearSlot(0), 'slot-unassigned'],
  ]) rejected(ledger, operation, reason);
  for (const index of [-1, 5, 1.5, null, '0']) {
    for (const method of ['store', 'withdraw', 'clearSlot']) rejected(ledger, () => ledger[method](index), 'invalid-slot');
  }
});

test('repeated sort, bind, take, open and drop never duplicate identities or bundle ids', () => {
  const ledger = smallWithBundle();
  const bundleIds = new Set();
  for (let cycle = 0; cycle < 8; cycle++) {
    const bundle = ledger.getEntities('output').find(entity => entity.type === 'bundle');
    assert.ok(bundle);
    assert.equal(bundleIds.has(bundle.id), false);
    bundleIds.add(bundle.id);
    accepted(ledger, () => ledger.takeOutput());
    accepted(ledger, () => ledger.openHand());
    accepted(ledger, () => ledger.dropHand());
    const notes = ledger.getEntities('table').filter(entity => ledger.denomination(entity) === 20).map(entity => entity.id);
    accepted(ledger, () => ledger.pickup(notes));
    accepted(ledger, () => ledger.feed());
    while (ledger.getEntities('input').length) ledger.tickMachine();
    accepted(ledger, () => ledger.bind(20));
  }
  assert.equal(bundleIds.size, 8);
  conserved(ledger);
});

test('snapshots and returned entities cannot mutate the ledger; immutable identities stay intact', () => {
  const ledger = smallWithBundle();
  const before = ledger.snapshot();
  const exported = ledger.snapshot();
  exported.entities[0].noteIds.length = 0;
  exported.slots[0].form = 'bundle';
  exported.notes[0].denomination = 200;
  assert.deepEqual(ledger.snapshot(), before);
  const taken = ledger.takeOutput();
  taken.entity.noteIds.length = 0;
  assert.equal(ledger.getEntities('hand')[0].noteIds.length, 100);
  assert.throws(() => { ledger.notes[0].denomination = 200; }, TypeError);
  assert.throws(() => { ledger.entities[0].location = 'missing'; }, TypeError);
  conserved(ledger);
});

test('a fresh scenario is independent of an earlier ledger and its in-flight input', () => {
  const earlier = new CashLedger('large');
  earlier.dump();
  earlier.pickup(idsAt(earlier, 'table', 100));
  earlier.feed();
  const fresh = new CashLedger();
  const before = fresh.snapshot();
  while (earlier.getEntities('input').length) earlier.tickMachine();
  assert.deepEqual(fresh.snapshot(), before);
  conserved(fresh);
  conserved(earlier);
});
