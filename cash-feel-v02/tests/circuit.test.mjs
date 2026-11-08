import test from 'node:test';
import assert from 'node:assert/strict';
import { CashLedger } from '../ledger.mjs';

const idsAt = (ledger, location, limit = Infinity) => ledger.getEntities(location).slice(0, limit).map(entity => entity.id);

function conserved(ledger) {
  assert.deepEqual(ledger.verify().errors, []);
  assert.equal(ledger.totalValue, ledger.mode === 'large' ? 22000 : 2200);
  const members = ledger.entities.flatMap(entity => entity.noteIds).sort();
  assert.deepEqual(members, ledger.notes.map(note => note.id).sort());
  for (const entity of ledger.entities) {
    assert.ok(entity.noteIds.every(id => ledger.notes.some(note => note.id === id)));
    if (entity.location.startsWith('sorted')) assert.equal(ledger.denomination(entity), Number(entity.location.slice(6)));
  }
}

function accept(ledger, result) {
  assert.equal(result.ok, true, result.reason);
  conserved(ledger);
  return result;
}

function refuse(ledger, operation, reason) {
  const before = ledger.snapshot();
  const result = operation();
  assert.equal(result.ok, false);
  assert.equal(result.reason, reason);
  assert.deepEqual(ledger.snapshot(), before, 'Refusal preserves every note, owner and association');
  conserved(ledger);
}

function processCounter(ledger) {
  while (ledger.getEntities('input').length) {
    const result = ledger.tickMachine();
    assert.equal(result.ok, true);
    const denomination = ledger.denomination(result.entity);
    const loose = ledger.getEntities('output').filter(entity => entity.type === 'note' && ledger.denomination(entity) === denomination);
    if (loose.length >= 100) assert.equal(ledger.bind(denomination).ok, true);
  }
  conserved(ledger);
}

function mixedTableHandful(ledger) {
  const notes = ledger.getEntities('table');
  const tens = notes.filter(entity => ledger.denomination(entity) === 10).slice(0, 20);
  const twenties = notes.filter(entity => ledger.denomination(entity) === 20).slice(0, 100 - tens.length);
  return [...tens, ...twenties].map(entity => entity.id);
}

test('circuit selection is explicit, immutable and independent of monetary scenario', () => {
  assert.equal(new CashLedger().circuit, 'combined');
  for (const circuit of ['combined', 'separate']) {
    const ledger = new CashLedger('large', circuit);
    assert.equal(ledger.snapshot().circuit, circuit);
    assert.throws(() => { ledger.circuit = circuit === 'combined' ? 'separate' : 'combined'; }, TypeError);
    conserved(ledger);
  }
  assert.throws(() => new CashLedger('small', 'unknown'), RangeError);
});

test('sorter routes each original note into its own denomination bin without making bundles', () => {
  const ledger = new CashLedger('small', 'separate');
  accept(ledger, ledger.dump());
  const selection = ['note-0001', 'note-0101', 'note-0002', 'note-0102'];
  accept(ledger, ledger.pickup(selection));
  accept(ledger, ledger.feedSorter());
  assert.deepEqual(idsAt(ledger, 'sortInput').sort(), selection.sort());
  for (let remaining = 3; remaining >= 0; remaining--) {
    const result = accept(ledger, ledger.tickSorter());
    assert.equal(result.moved, 1);
    assert.equal(result.entity.location, `sorted${ledger.denomination(result.entity)}`);
    assert.equal(ledger.getEntities('sortInput').length, remaining);
  }
  assert.deepEqual(idsAt(ledger, 'sorted20'), ['note-0001', 'note-0002']);
  assert.deepEqual(idsAt(ledger, 'sorted10'), ['note-0101', 'note-0102']);
  assert.equal(ledger.entities.some(entity => entity.type === 'bundle'), false);
  assert.equal(ledger.getEntities('input').length, 0);
  refuse(ledger, () => ledger.tickSorter(), 'sorter-empty');
});

test('separate counter refuses a mixed handful atomically while the combined machine accepts it', () => {
  for (const circuit of ['separate', 'combined']) {
    const ledger = new CashLedger('small', circuit);
    ledger.dump();
    ledger.pickup(['note-0001', 'note-0101']);
    refuse(ledger, () => ledger.feedCounter(), 'mixed-denominations');
    if (circuit === 'separate') refuse(ledger, () => ledger.feed(), 'mixed-denominations');
    else {
      accept(ledger, ledger.feed());
      processCounter(ledger);
      assert.equal(ledger.getEntities('output').length, 2);
    }
  }
});

test('counter preserves a waiting input on denomination conflict and accepts matching additions', () => {
  const ledger = new CashLedger('small', 'separate');
  ledger.dump();
  ledger.pickup(['note-0001']);
  accept(ledger, ledger.feedCounter());
  ledger.pickup(['note-0101']);
  refuse(ledger, () => ledger.feedCounter(), 'input-denomination');
  ledger.dropHand();
  ledger.pickup(['note-0002']);
  accept(ledger, ledger.feed());
  assert.deepEqual(idsAt(ledger, 'input'), ['note-0001', 'note-0002']);
  processCounter(ledger);
  ledger.pickup(['note-0101']);
  accept(ledger, ledger.feedCounter());
  processCounter(ledger);
  assert.equal(ledger.getEntities('output').length, 3, 'An earlier output does not impose an extra input capacity or denomination limit');
});

test('taking sorted notes respects the requested handful size and remaining hand capacity', () => {
  const ledger = new CashLedger('small', 'separate');
  ledger.dump();
  ledger.pickup(ledger.getEntities('table').filter(entity => ledger.denomination(entity) === 10).map(entity => entity.id));
  ledger.feedSorter();
  while (ledger.getEntities('sortInput').length) ledger.tickSorter();
  for (const invalid of [0, -1, 0.5, NaN, Infinity, '3', null]) refuse(ledger, () => ledger.takeSorted(10, invalid), 'invalid-limit');
  for (const invalid of [5, 50, '10', null]) refuse(ledger, () => ledger.takeSorted(invalid), 'invalid-denomination');
  accept(ledger, ledger.takeSorted(10, 3));
  assert.equal(ledger.handObjects, 3);
  assert.equal(ledger.getEntities('sorted10').length, 17);
  ledger.pickup(idsAt(ledger, 'table', 92));
  const result = accept(ledger, ledger.takeSorted(10, 1000));
  assert.equal(result.moved, 5);
  assert.equal(ledger.handObjects, 100);
  assert.equal(ledger.getEntities('sorted10').length, 12);
  refuse(ledger, () => ledger.takeSorted(10), 'hand-full');
  ledger.dropHand();
  accept(ledger, ledger.takeSorted(10));
  refuse(ledger, () => ledger.takeSorted(10), 'sorted-empty');
});

test('both separate machines refuse bundles without opening or changing their member notes', () => {
  const ledger = new CashLedger('small', 'separate');
  ledger.dump();
  ledger.pickup(idsAt(ledger, 'table', 100));
  ledger.feedCounter();
  processCounter(ledger);
  ledger.takeOutput();
  assert.equal(ledger.getEntities('hand')[0].type, 'bundle');
  refuse(ledger, () => ledger.feedSorter(), 'open-bundle-first');
  refuse(ledger, () => ledger.feedCounter(), 'open-bundle-first');
  accept(ledger, ledger.openHand());
  accept(ledger, ledger.feedSorter());
  while (ledger.getEntities('sortInput').length) ledger.tickSorter();
  assert.equal(ledger.getEntities('sorted20').length, 100);
  conserved(ledger);
});

for (const circuit of ['combined', 'separate']) {
  for (const mode of ['small', 'large']) {
    test(`${circuit} ${mode} circuit preserves every euro and bill through complete sorting, counting and storage`, () => {
      const ledger = new CashLedger(mode, circuit);
      ledger.dump();
      while (ledger.getEntities('table').length) {
        accept(ledger, ledger.pickup(mixedTableHandful(ledger)));
        if (circuit === 'separate') {
          accept(ledger, ledger.feedSorter());
          while (ledger.getEntities('sortInput').length) assert.equal(ledger.tickSorter().ok, true);
          conserved(ledger);
          for (const denomination of [20, 10]) {
            while (ledger.getEntities(`sorted${denomination}`).length) {
              accept(ledger, ledger.takeSorted(denomination, 100));
              assert.equal(new Set(ledger.getEntities('hand').map(entity => ledger.denomination(entity))).size, 1);
              accept(ledger, ledger.feedCounter());
              processCounter(ledger);
            }
          }
        } else {
          accept(ledger, ledger.feed());
          processCounter(ledger);
        }
      }
      assert.equal(ledger.getEntities('sortInput').length + ledger.getEntities('sorted10').length + ledger.getEntities('sorted20').length + ledger.getEntities('input').length, 0);
      const bundles = ledger.getEntities('output').filter(entity => entity.type === 'bundle');
      assert.equal(bundles.length, mode === 'small' ? 1 : 12);
      assert.equal(ledger.getEntities('output').filter(entity => entity.type === 'note').length, mode === 'small' ? 20 : 0);
      while (ledger.getEntities('output').length) {
        accept(ledger, ledger.takeOutput());
        const bundle = ledger.getEntities('hand')[0].type === 'bundle';
        const slot = bundle && ledger.getEntities('slot0').length < 10 ? 0 : 1;
        accept(ledger, ledger.store(slot));
      }
      assert.equal(ledger.handObjects, 0);
      assert.equal(ledger.entities.every(entity => entity.location.startsWith('slot')), true);
      assert.equal(ledger.getEntities('slot0').length, mode === 'small' ? 1 : 10);
      assert.equal(ledger.getEntities('slot1').length, mode === 'small' ? 20 : 2);
      conserved(ledger);
    });
  }
}
