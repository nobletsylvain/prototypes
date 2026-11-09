import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, createSession, dispatch, tick, getView, snapshot, verify } from '../model.mjs';

const act = (state, type, values = {}) => dispatch(state, { type, ...values });
const accepted = (state, type, values = {}) => {
  const result = act(state, type, values);
  assert.equal(result.ok, true, `${type}: ${result.reason || ''}`);
  return result;
};
const sumFund = state => getView(state).fund.reduce((total, bill) => total + bill.denomination, 0);
function unchanged(state, type, values = {}) {
  const before = snapshot(state);
  assert.equal(act(state, type, values).ok, false);
  assert.equal(snapshot(state), before);
}
function request(state = createSession()) { accepted(state, 'talk'); return state; }
function prepare(state = createSession()) {
  request(state);
  accepted(state, 'giveProduct', { slot: CATALOG.findIndex(item => item.key === getView(state).current.request[0].sku) });
  if (state.scenario === 'hesitation' && !state.sales.length) accepted(state, 'adjustPrice', { delta: -5 });
  return state;
}
function change(state) {
  let amount = getView(state).due - getView(state).returned;
  for (const denomination of [100, 50, 20, 10, 5]) {
    while (amount >= denomination) {
      const result = act(state, 'giveBill', { denomination });
      if (!result.ok) break;
      amount -= denomination;
    }
  }
  assert.equal(amount, 0);
}
function sell(state) { change(state); return accepted(state, 'confirm'); }
function advance(state) { tick(state, 4); tick(state, 2); }

test('initial money, material and object identities are deterministic', () => {
  const state = createSession();
  assert.equal(CATALOG.length, 5);
  assert.equal(getView(state).fund.length, 30);
  assert.deepEqual(verify(state), { ok: true, objects: 78, money: 1510, grams: 168, sales: 0 });
  assert.equal(snapshot(state), snapshot(createSession()));
});

test('the client owns the presented payment on arrival but reveals their request only on talk', () => {
  const state = createSession(), view = getView(state);
  assert.equal(view.request, null);
  assert.equal(view.received, 50);
  assert.equal(view.due, 25);
  assert.deepEqual(view.paymentBills.map(bill => [bill.id, bill.denomination, bill.location]), [['payment-1', 50, 'customer:customer-1']]);
  unchanged(state, 'take', { id: 'payment-1' });
  unchanged(state, 'giveProduct', { slot: 1 });
  unchanged(state, 'giveBill', { denomination: 5 });
  request(state);
  assert.deepEqual(getView(state).request, [{ sku: 'hash4', count: 1 }]);
  unchanged(state, 'talk');
});

test('one direct confirmation exchanges exact sachet and note identities without proposing first', () => {
  const state = prepare();
  assert.equal(state.phase, 'request');
  assert.equal(state.agreement, null);
  const productId = getView(state).tray[0].id;
  change(state);
  const changeIds = getView(state).change.map(bill => bill.id);
  assert.equal(getView(state).canConfirm, true);
  assert.equal(accepted(state, 'confirm').event, 'sale-to-fund');
  assert.deepEqual(state.sales[0], { customerId: 'customer-1', price: 25, productIds: [productId], paymentIds: ['payment-1'], changeIds });
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
  assert.equal(state.objects.find(item => item.id === productId).location, 'client:customer-1');
  assert.ok(changeIds.every(id => state.objects.find(item => item.id === id).location === 'client:customer-1'));
  assert.equal(sumFund(state), 1135);
  assert.equal(getView(state).outstandingReceipts.length, 0);
});

test('change can be prepared before the sachet without an intermediate agreement', () => {
  const state = request();
  change(state);
  assert.equal(getView(state).returned, 25);
  assert.equal(getView(state).exact, true);
  assert.equal(getView(state).canConfirm, false);
  unchanged(state, 'confirm');
  accepted(state, 'giveProduct', { slot: 1 });
  assert.equal(getView(state).returned, 25);
  accepted(state, 'confirm');
});

test('notes can be extracted and dropped during request and hesitation', () => {
  for (const scenario of ['normal', 'hesitation']) {
    const state = request(createSession(scenario));
    const bill = getView(state).fund.find(item => item.denomination === 20);
    accepted(state, 'take', { id: bill.id });
    assert.equal(bill.location, 'drag');
    accepted(state, 'drop', { target: 'tray' });
    assert.equal(bill.location, 'change');
    assert.equal(getView(state).returned, 20);
  }
});

test('underpayment is rejected without changing any transaction field', () => {
  const state = prepare();
  accepted(state, 'giveBill', { denomination: 20 });
  assert.equal(getView(state).exact, false);
  unchanged(state, 'confirm');
});

test('overpayment is incorrect and a click returns the exact note', () => {
  const state = prepare();
  accepted(state, 'giveBill', { denomination: 50 });
  const bill = getView(state).change[0];
  assert.equal(getView(state).exact, false);
  unchanged(state, 'confirm');
  accepted(state, 'retake', { id: bill.id });
  assert.equal(bill.location, 'fund');
});

test('double confirmation cannot duplicate the automatic deposit', () => {
  const state = prepare(); sell(state);
  unchanged(state, 'confirm');
  unchanged(state, 'stow');
  unchanged(state, 'collect', { id: 'payment-1' });
  assert.equal(state.sales.length, 1);
  assert.equal(sumFund(state), 1135);
});

test('an occupied hand does not block automatic cash storage or displace the held prop', () => {
  const state = prepare(createSession('full-hand'));
  assert.equal(sell(state).event, 'sale-to-fund');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
  assert.equal(state.objects.find(item => item.id === 'demo-parcel').location, 'hand');
  assert.equal(getView(state).receipts.length, 0);
  assert.equal(getView(state).outstandingReceipts.length, 0);
  assert.equal(verify(state).objects, 79);
});

test('the next customer advances without R or collection even while the hand stays full', () => {
  const state = prepare(createSession('full-hand')); sell(state); advance(state);
  assert.equal(state.currentId, 'customer-2');
  assert.equal(state.phase, 'approach');
  assert.equal(state.objects.find(item => item.id === 'demo-parcel').location, 'hand');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
});

test('the legacy wait option cannot create a storage barrier after automatic payment', () => {
  const state = prepare(createSession('full-hand', { waitForStow: true })); sell(state); advance(state);
  assert.equal(state.currentId, 'customer-2');
  assert.equal(state.phase, 'approach');
});

test('another client payment cannot be taken, collected or returned', () => {
  const state = request();
  for (const type of ['take', 'collect', 'retake']) unchanged(state, type, { id: 'payment-2' });
  assert.equal(state.objects.find(item => item.id === 'payment-2').location, 'customer:customer-2');
});

test('successive sales retain distinct payments and store both automatically', () => {
  const state = prepare(); sell(state); advance(state); prepare(state); sell(state);
  assert.deepEqual(state.sales.map(sale => sale.paymentIds), [['payment-1'], ['payment-2']]);
  assert.deepEqual(state.sales.map(sale => sale.price), [25, 25]);
  assert.equal(sumFund(state), 1160);
  assert.ok(['payment-1', 'payment-2'].every(id => state.objects.find(item => item.id === id).location === 'fund'));
});

test('refusing a later client cannot undo an earlier automatic deposit', () => {
  const state = prepare(createSession('full-hand')); sell(state); advance(state); prepare(state); change(state);
  accepted(state, 'refuse');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
  assert.equal(state.objects.find(item => item.id === 'payment-2').location, 'customer:customer-2');
  assert.equal(state.sales.length, 1);
  assert.equal(sumFund(state), 1135);
});

test('note extraction has one owner and blocks confirmation until release', () => {
  const state = prepare();
  accepted(state, 'giveBill', { denomination: 20 });
  const bill = getView(state).fund.find(item => item.denomination === 5);
  accepted(state, 'take', { id: bill.id });
  unchanged(state, 'take', { id: bill.id });
  unchanged(state, 'confirm');
  unchanged(state, 'drop', { target: 'outside' });
  accepted(state, 'drop', { target: 'tray' });
  assert.equal(bill.location, 'change');
  assert.equal(getView(state).canConfirm, true);
});

test('cancelled note dragging restores its exact source', () => {
  const state = prepare();
  accepted(state, 'giveBill', { denomination: 20 });
  const bill = getView(state).change[0];
  accepted(state, 'take', { id: bill.id }); accepted(state, 'cancelDrag');
  assert.equal(bill.location, 'change');
  assert.equal(getView(state).returned, 20);
});

test('product drag back to its slot preserves stock and prepared money', () => {
  const state = request(); change(state);
  accepted(state, 'take', { id: 'hash4-1' }); accepted(state, 'drop', { target: 'bag' });
  assert.equal(getView(state).slots[1].length, 8);
  assert.equal(getView(state).returned, 25);
  assert.equal(getView(state).due, 25);
});

test('retaking a product invalidates an optional agreement but leaves prepared notes on the stall', () => {
  const state = prepare(); change(state); accepted(state, 'propose');
  const changeIds = getView(state).change.map(bill => bill.id);
  accepted(state, 'retake', { id: 'hash4-1' });
  assert.equal(state.phase, 'request');
  assert.equal(state.agreement, null);
  assert.deepEqual(getView(state).change.map(bill => bill.id), changeIds);
  assert.equal(getView(state).canConfirm, false);
  accepted(state, 'giveProduct', { slot: 1 }); accepted(state, 'confirm');
});

test('changing products updates the price without removing prepared change', () => {
  const state = prepare(); change(state);
  accepted(state, 'giveProduct', { slot: 2 });
  assert.equal(state.offerPrice, 45);
  assert.equal(getView(state).due, 5);
  assert.equal(getView(state).returned, 25);
  assert.equal(getView(state).exact, false);
  unchanged(state, 'confirm');
  accepted(state, 'retake', { id: 'flower2-1' });
  assert.equal(getView(state).canConfirm, true);
});

test('cancellation restores products and money without receiving payment', () => {
  const state = prepare(); change(state); accepted(state, 'cancel');
  assert.equal(state.phase, 'departing');
  assert.equal(getView(state).fund.length, 30);
  assert.equal(getView(state).slots[1].length, 8);
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'customer:customer-1');
  assert.equal(state.sales.length, 0);
});

test('cancellation also restores a note currently being extracted', () => {
  const state = request(); accepted(state, 'take', { id: 'fund-20-1' }); accepted(state, 'cancel');
  assert.equal(state.dragId, null);
  assert.equal(state.objects.find(item => item.id === 'fund-20-1').location, 'fund');
});

test('cancellation after a completed sale cannot undo objects', () => {
  const state = prepare(); sell(state);
  unchanged(state, 'cancel');
  unchanged(state, 'retake', { id: state.sales[0].productIds[0] });
});

test('hesitation begins on talk and preparing money alone does not freeze it', () => {
  const state = createSession('hesitation'); tick(state, 20);
  assert.equal(state.hesitationLeft, 5);
  request(state); accepted(state, 'giveBill', { denomination: 20 }); tick(state, 1.25);
  assert.equal(state.hesitationLeft, 3.75);
  assert.equal(state.hesitationFrozen, false);
});

test('first product extraction freezes hesitation before release', () => {
  const state = request(createSession('hesitation')); tick(state, 2);
  accepted(state, 'take', { id: 'hash4-1' }); tick(state, 15);
  assert.equal(state.hesitationLeft, 3);
  accepted(state, 'cancelDrag'); tick(state, 15);
  assert.equal(state.hesitationLeft, 3);
});

test('keyboard preparation freezes hesitation too', () => {
  const state = request(createSession('hesitation'));
  accepted(state, 'giveProduct', { slot: 1 }); tick(state, 20);
  assert.equal(state.hesitationLeft, 5);
});

test('hesitation timeout returns money prepared before any product', () => {
  const state = request(createSession('hesitation')); change(state); tick(state, 5);
  assert.equal(state.phase, 'departing');
  assert.equal(state.clients[0].exitReason, 'timeout');
  assert.equal(sumFund(state), 1110);
  assert.equal(getView(state).change.length, 0);
  assert.equal(state.sales.length, 0);
});

test('a player can solve the budget concern and directly confirm the new price', () => {
  const state = prepare(createSession('hesitation'));
  assert.equal(state.offerPrice, 20);
  assert.equal(getView(state).due, 30);
  assert.equal(state.agreement, null);
  assert.equal(sell(state).event, 'sale-to-fund');
  assert.equal(state.sales[0].price, 20);
  assert.equal(sumFund(state), 1130);
});

test('exact change does not authorize a price exceeding the client budget', () => {
  const state = request(createSession('hesitation'));
  accepted(state, 'giveProduct', { slot: 1 }); change(state);
  assert.equal(getView(state).exact, true);
  assert.equal(getView(state).budgetAccepted, false);
  unchanged(state, 'confirm'); tick(state, 10);
  assert.equal(state.offerPrice, 25);
  assert.equal(state.sales.length, 0);
});

test('price changes preserve placed notes and immediately recalculate change', () => {
  const state = prepare(); change(state); accepted(state, 'adjustPrice', { delta: -5 });
  assert.equal(getView(state).due, 30);
  assert.equal(getView(state).returned, 25);
  assert.equal(getView(state).canConfirm, false);
  accepted(state, 'giveBill', { denomination: 5 }); accepted(state, 'confirm');
  assert.equal(state.sales[0].price, 20);
});

test('optional proposal agreement moves no money or products', () => {
  const state = prepare(); change(state);
  const before = state.objects.map(item => [item.id, item.location]);
  accepted(state, 'propose');
  assert.equal(state.phase, 'payment');
  assert.deepEqual(state.objects.map(item => [item.id, item.location]), before);
  assert.equal(accepted(state, 'confirm').event, 'sale-to-fund');
});

test('changing an optional agreement price preserves money and requires the new correct change', () => {
  const state = prepare(); change(state); accepted(state, 'propose');
  accepted(state, 'adjustPrice', { delta: -5 });
  assert.equal(state.phase, 'request');
  assert.equal(state.agreement, null);
  assert.equal(getView(state).returned, 25);
  unchanged(state, 'confirm');
  accepted(state, 'giveBill', { denomination: 5 }); accepted(state, 'confirm');
});

test('a legacy proposal above budget restores products and notes when declined', () => {
  const state = request(createSession('hesitation'));
  accepted(state, 'giveProduct', { slot: 1 }); change(state);
  assert.equal(accepted(state, 'propose').event, 'declined');
  assert.equal(state.clients[0].exitReason, 'budget');
  assert.equal(sumFund(state), 1110);
  assert.equal(getView(state).slots[1].length, 8);
});

test('wrong legacy proposals restore all objects and let the client leave', () => {
  for (const slots of [[0], [1, 1]]) {
    const state = request(); accepted(state, 'giveBill', { denomination: 20 });
    for (const slot of slots) accepted(state, 'giveProduct', { slot });
    assert.equal(accepted(state, 'propose').event, 'declined');
    assert.equal(state.phase, 'departing');
    assert.equal(state.clients[0].exitReason, 'wrong-products');
    assert.equal(sumFund(state), 1110);
    assert.equal(getView(state).slots[0].length, 8);
    assert.equal(getView(state).slots[1].length, 8);
  }
});

test('empty or unfinished proposals cannot exchange objects', () => {
  const state = request(); unchanged(state, 'propose'); unchanged(state, 'confirm');
  accepted(state, 'take', { id: 'hash4-1' });
  unchanged(state, 'propose'); unchanged(state, 'confirm');
});

test('price adjustments stay in five-euro steps below the normal price', () => {
  const state = prepare();
  unchanged(state, 'adjustPrice', { delta: 5 }); unchanged(state, 'adjustPrice', { delta: -1 });
  for (let index = 0; index < 4; index++) accepted(state, 'adjustPrice', { delta: -5 });
  assert.equal(state.offerPrice, 5);
  unchanged(state, 'adjustPrice', { delta: -5 });
  accepted(state, 'adjustPrice', { delta: 5 });
  assert.equal(state.offerPrice, 10);
});

test('stock or cash exhaustion cannot manufacture replacement objects', () => {
  const state = request();
  for (let index = 0; index < 8; index++) accepted(state, 'giveProduct', { slot: 1 });
  unchanged(state, 'giveProduct', { slot: 1 });
  for (let index = 0; index < 6; index++) accepted(state, 'giveBill', { denomination: 5 });
  unchanged(state, 'giveBill', { denomination: 5 });
  unchanged(state, 'giveBill', { denomination: 2 });
  unchanged(state, 'giveBill', { denomination: '10' }); verify(state);
});

test('the queue fills to five unique clients at the demo cadence', () => {
  const state = createSession(); tick(state, 3.99);
  assert.equal(state.queue.length, 0); tick(state, 0.01);
  assert.equal(state.queue.length, 1); tick(state, 100);
  assert.equal(state.queue.length, 5);
  assert.equal(new Set(state.queue).size, 5);
  assert.equal(state.clients.filter(client => client.status === 'pending').length, 2);
});

test('closing clears the queue while the current direct exchange may finish', () => {
  const state = prepare(createSession('normal', { serviceSeconds: 10 })); tick(state, 10);
  assert.equal(state.closing, true);
  assert.equal(state.phase, 'request');
  assert.equal(state.queue.length, 0); sell(state); advance(state);
  assert.equal(state.phase, 'closed');
  assert.equal(state.sales.length, 1);
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
});

test('closing never starts another client after a refusal', () => {
  const state = request(createSession('normal', { serviceSeconds: 2 }));
  accepted(state, 'refuse'); tick(state, 3);
  assert.equal(state.phase, 'closed');
  assert.equal(state.currentId, null); unchanged(state, 'talk');
});

test('eight direct sales conserve every object and deposit all revenue without R', () => {
  const state = createSession();
  for (let index = 0; index < 8; index++) {
    prepare(state); assert.equal(state.agreement, null); sell(state); advance(state);
  }
  assert.equal(state.phase, 'closed');
  assert.equal(state.sales.length, 8);
  assert.equal(state.sales.reduce((total, sale) => total + sale.price, 0), 230);
  assert.equal(sumFund(state), 1340);
  assert.equal(getView(state).outstandingReceipts.length, 0);
  assert.equal(state.objects.filter(item => item.kind === 'product' && item.location.startsWith('client:')).length, 8);
  assert.equal(verify(state).money, 1510);
});

test('a full-hand service needs neither collection nor clearing the occupied hand', () => {
  const state = createSession('full-hand');
  for (let index = 0; index < 8; index++) { prepare(state); sell(state); advance(state); }
  assert.equal(state.phase, 'closed');
  assert.equal(state.objects.find(item => item.id === 'demo-parcel').location, 'hand');
  assert.equal(getView(state).receipts.length, 0);
  assert.equal(sumFund(state), 1340);
  assert.equal(verify(state).objects, 79);
});

test('invalid actions and time leave every state field unchanged', () => {
  const state = createSession();
  for (const action of [null, {}, { type: 'anything' }, { type: 'giveProduct', slot: -1 }, { type: 'giveProduct', slot: 5 }, { type: 'take', id: 'missing' }, { type: 'drop', target: 'tray' }, { type: 'cancelDrag' }, { type: 'stow' }]) {
    const before = snapshot(state);
    assert.equal(dispatch(state, action).ok, false);
    assert.equal(snapshot(state), before);
  }
  for (const delta of [-1, NaN, Infinity, '1']) {
    const before = snapshot(state);
    assert.equal(tick(state, delta).ok, false);
    assert.equal(snapshot(state), before);
  }
});

test('invariants detect denomination, material, identity and count corruption', () => {
  for (const corrupt of [state => { state.objects[0].grams++; }, state => { state.objects[40].denomination++; }, state => { state.objects.push({ ...state.objects[0] }); }, state => { state.objects[0].id = 'replaced'; }]) {
    const state = createSession(); corrupt(state); assert.throws(() => verify(state));
  }
});

test('mixed deterministic actions preserve objects and reject errors atomically', () => {
  const state = createSession('hesitation');
  let seed = 741;
  const random = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
  const types = ['talk', 'giveProduct', 'take', 'drop', 'retake', 'giveBill', 'adjustPrice', 'propose', 'confirm', 'stow', 'collect', 'cancelDrag'];
  for (let index = 0; index < 1000; index++) {
    const action = { type: types[random(types.length)], id: state.objects[random(state.objects.length)].id, slot: random(6), denomination: [5, 10, 20, 50, 100][random(5)], delta: random(2) ? 5 : -5, target: random(2) ? 'bag' : 'tray' };
    const before = snapshot(state), result = dispatch(state, action);
    if (!result.ok) assert.equal(snapshot(state), before);
    verify(state);
  }
});

test('creation rejects unsupported scenarios and invalid durations', () => {
  assert.throws(() => createSession('unknown'));
  assert.throws(() => createSession('normal', { arrivalSeconds: 0 }));
  assert.throws(() => createSession('normal', { serviceSeconds: NaN }));
});
