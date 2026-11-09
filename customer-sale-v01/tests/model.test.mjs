import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, createSession, dispatch, tick, getView, snapshot, verify } from '../model.mjs';

const act = (state, type, values = {}) => dispatch(state, { type, ...values });
const accepted = (state, type, values = {}) => assert.equal(act(state, type, values).ok, true, type);
function payment(state = createSession()) {
  accepted(state, 'talk');
  const slot = CATALOG.findIndex(item => item.key === getView(state).current.request[0].sku);
  accepted(state, 'giveProduct', { slot });
  if (state.scenario === 'hesitation' && !state.sales.length) accepted(state, 'adjustPrice', { delta: -5 });
  accepted(state, 'propose');
  return state;
}
function settle(state) {
  let amount = getView(state).due;
  for (const denomination of [100, 50, 20, 10, 5]) {
    while (amount >= denomination) {
      const result = act(state, 'giveBill', { denomination });
      if (!result.ok) break;
      amount -= denomination;
    }
  }
  assert.equal(amount, 0);
  accepted(state, 'confirm');
}
function unchanged(state, type, values = {}) {
  const before = snapshot(state);
  assert.equal(act(state, type, values).ok, false);
  assert.equal(snapshot(state), before);
}

test('the five slots and deterministic demo inventories have exact identities and values', () => {
  const state = createSession();
  assert.equal(CATALOG.length, 5);
  assert.equal(state.objects.length, 78);
  assert.deepEqual(verify(state), { ok: true, objects: 78, money: 1510, grams: 168, sales: 0 });
  assert.equal(getView(state).fund.length, 30);
  assert.deepEqual(snapshot(createSession()), snapshot(state));
});

test('the request is hidden until the conversation starts', () => {
  const state = createSession();
  assert.equal(getView(state).request, null);
  unchanged(state, 'giveProduct', { slot: 0 });
  accepted(state, 'talk');
  assert.deepEqual(getView(state).request, [{ sku: 'hash8', count: 1 }]);
  assert.equal(state.phase, 'request');
  unchanged(state, 'talk');
});

test('normal sale retains both product and individual payment identities', () => {
  const state = payment();
  const productId = getView(state).tray[0].id;
  assert.deepEqual([getView(state).received, getView(state).due, getView(state).returned], [50, 5, 0]);
  const changeId = state.objects.find(item => item.location === 'fund' && item.denomination === 5).id;
  accepted(state, 'giveBill', { denomination: 5 });
  assert.equal(getView(state).canConfirm, true);
  assert.equal(act(state, 'confirm').event, 'sale-to-hand');
  assert.deepEqual(state.sales[0], { customerId: 'customer-1', price: 45, productIds: [productId], paymentIds: ['payment-1'], changeIds: [changeId] });
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'hand');
  assert.equal(state.objects.find(item => item.id === productId).location, 'client:customer-1');
  assert.equal(state.objects.find(item => item.id === changeId).location, 'client:customer-1');
});

test('underpayment is rejected without changing any field', () => {
  const state = payment();
  assert.equal(getView(state).exact, false);
  unchanged(state, 'confirm');
});

test('overpayment is also incorrect and a click recovers the exact note', () => {
  const state = payment();
  accepted(state, 'giveBill', { denomination: 10 });
  const bill = getView(state).change[0];
  assert.equal(getView(state).exact, false);
  unchanged(state, 'confirm');
  accepted(state, 'retake', { id: bill.id });
  assert.equal(bill.location, 'fund');
  assert.equal(getView(state).returned, 0);
});

test('a second confirmation cannot duplicate a sale or receipts', () => {
  const state = payment();
  settle(state);
  unchanged(state, 'confirm');
  assert.equal(state.sales.length, 1);
});

test('stowing moves original receipts into the cash compartment exactly once', () => {
  const state = payment();
  settle(state);
  accepted(state, 'stow');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
  unchanged(state, 'stow');
  assert.equal(getView(state).outstandingReceipts.length, 0);
});

test('the optional waiting comparison retains the next customer until receipts are stored', () => {
  const state = payment(createSession('normal', { waitForStow: true }));
  settle(state);
  tick(state, 20);
  assert.equal(state.phase, 'receipt');
  assert.equal(state.currentId, 'customer-1');
  assert.equal(state.queue.length, 5);
  accepted(state, 'stow');
  tick(state, 0.1);
  assert.equal(state.phase, 'departing');
  tick(state, 1.2);
  assert.equal(state.phase, 'approach');
  assert.equal(state.currentId, 'customer-2');
});

test('the next customer advances while receipts remain recoverable by default', () => {
  const state = payment();
  settle(state);
  tick(state, 5);
  tick(state, 1.2);
  assert.equal(state.currentId, 'customer-2');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'hand');
  accepted(state, 'stow');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
});

test('a full hand sends incoming money to the stall and preserves the held prop', () => {
  const state = payment(createSession('full-hand'));
  accepted(state, 'giveBill', { denomination: 5 });
  assert.equal(act(state, 'confirm').event, 'sale-to-tray');
  assert.equal(state.objects.find(item => item.id === 'demo-parcel').location, 'hand');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'receipt');
  unchanged(state, 'collect', { id: 'payment-1' });
  tick(state, 10);
  assert.equal(state.phase, 'departing');
  accepted(state, 'stow');
  assert.equal(state.objects.find(item => item.id === 'demo-parcel').location, 'demo-home');
  accepted(state, 'collect', { id: 'payment-1' });
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'hand');
  accepted(state, 'stow');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
});

test('receipt collection cannot steal another customer payment', () => {
  const state = createSession();
  unchanged(state, 'collect', { id: 'payment-2' });
  unchanged(state, 'take', { id: 'payment-2' });
  unchanged(state, 'retake', { id: 'payment-2' });
});

test('older hand receipts send the next sale receipts to the stall without mixing sales', () => {
  const state = payment();
  settle(state);
  tick(state, 5);
  tick(state, 1.2);
  payment(state);
  settle(state);
  assert.equal(state.sales.length, 2);
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'hand');
  assert.equal(state.objects.find(item => item.id === 'payment-2').location, 'receipt');
  assert.deepEqual(state.sales.map(sale => sale.price), [45, 25]);
  assert.deepEqual(state.sales.map(sale => sale.paymentIds), [['payment-1'], ['payment-2']]);
  tick(state, 5);
  tick(state, 1.2);
  assert.equal(state.currentId, 'customer-3');
  accepted(state, 'stow');
  accepted(state, 'collect', { id: 'payment-2' });
  accepted(state, 'talk');
  accepted(state, 'stow');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
  assert.equal(state.objects.find(item => item.id === 'payment-2').location, 'fund');
});

test('stall receipts remain collectible while a later payment is being prepared', () => {
  const state = payment(createSession('full-hand'));
  settle(state);
  tick(state, 5);
  tick(state, 1.2);
  payment(state);
  assert.equal(state.phase, 'payment');
  accepted(state, 'stow');
  accepted(state, 'collect', { id: 'payment-1' });
  assert.equal(state.phase, 'payment');
  assert.equal(getView(state).due, 25);
  accepted(state, 'stow');
  settle(state);
  assert.equal(state.sales[1].price, 25);
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'fund');
  assert.equal(state.objects.find(item => item.id === 'payment-2').location, 'hand');
});

test('refusing a later customer cannot remove earlier uncollected receipts', () => {
  const state = payment(createSession('full-hand'));
  settle(state);
  tick(state, 5);
  tick(state, 1.2);
  accepted(state, 'talk');
  accepted(state, 'giveProduct', { slot: 1 });
  accepted(state, 'refuse');
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'receipt');
  assert.equal(state.objects.find(item => item.id === 'demo-parcel').location, 'hand');
  assert.equal(state.sales.length, 1);
  assert.equal(state.objects.find(item => item.id === 'payment-2').location, 'customer:customer-2');
});

test('a note extraction has one owner throughout drag and release', () => {
  const state = payment();
  const bill = state.objects.find(item => item.location === 'fund' && item.denomination === 5);
  accepted(state, 'take', { id: bill.id });
  assert.equal(state.dragId, bill.id);
  assert.equal(bill.location, 'drag');
  unchanged(state, 'take', { id: bill.id });
  unchanged(state, 'confirm');
  unchanged(state, 'drop', { target: 'outside' });
  assert.equal(bill.location, 'drag');
  accepted(state, 'drop', { target: 'tray' });
  assert.equal(bill.location, 'change');
  assert.equal(state.dragId, null);
  assert.equal(getView(state).exact, true);
});

test('cancelled note dragging restores the exact source', () => {
  const state = payment();
  accepted(state, 'giveBill', { denomination: 5 });
  const bill = getView(state).change[0];
  accepted(state, 'take', { id: bill.id });
  accepted(state, 'cancelDrag');
  assert.equal(bill.location, 'change');
  assert.equal(getView(state).returned, 5);
});

test('product drag then bag drop conserves stock', () => {
  const state = createSession();
  accepted(state, 'talk');
  const product = state.objects.find(item => item.sku === 'hash8');
  accepted(state, 'take', { id: product.id });
  accepted(state, 'drop', { target: 'bag' });
  assert.equal(product.location, 'slot:hash8');
  assert.equal(getView(state).slots[0].length, 8);
  assert.equal(state.offerPrice, 0);
});

test('taking back a product invalidates the agreement and restores prepared change', () => {
  const state = payment();
  accepted(state, 'giveBill', { denomination: 5 });
  const product = getView(state).tray[0];
  accepted(state, 'retake', { id: product.id });
  assert.equal(state.phase, 'request');
  assert.equal(state.agreement, null);
  assert.equal(getView(state).change.length, 0);
  assert.equal(getView(state).fund.length, 30);
  assert.equal(getView(state).slots[0].length, 8);
  assert.equal(state.sales.length, 0);
});

test('modifying products after agreement never retains stale prices', () => {
  const state = payment();
  accepted(state, 'giveProduct', { slot: 1 });
  assert.equal(state.phase, 'request');
  assert.equal(state.offerPrice, 70);
  unchanged(state, 'confirm');
  assert.equal(act(state, 'propose').event, 'declined');
  assert.equal(state.clients[0].exitReason, 'wrong-products');
  assert.equal(getView(state).slots[0].length, 8);
  assert.equal(getView(state).slots[1].length, 8);
});

test('cancellation restores prepared objects without receiving customer money', () => {
  const state = payment();
  accepted(state, 'giveBill', { denomination: 5 });
  accepted(state, 'cancel');
  assert.equal(state.phase, 'departing');
  assert.equal(getView(state).fund.length, 30);
  assert.equal(getView(state).slots[0].length, 8);
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'customer:customer-1');
  assert.equal(state.sales.length, 0);
});

test('cancellation also restores an object held in a drag', () => {
  const state = createSession();
  accepted(state, 'talk');
  accepted(state, 'take', { id: 'hash8-1' });
  accepted(state, 'cancel');
  assert.equal(state.dragId, null);
  assert.equal(state.objects.find(item => item.id === 'hash8-1').location, 'slot:hash8');
});

test('cancellation after a completed sale cannot undo money or products', () => {
  const state = payment();
  settle(state);
  unchanged(state, 'cancel');
  unchanged(state, 'retake', { id: state.sales[0].productIds[0] });
});

test('the hesitation clock begins only after talking', () => {
  const state = createSession('hesitation');
  tick(state, 20);
  assert.equal(state.hesitationLeft, 5);
  accepted(state, 'talk');
  tick(state, 1.25);
  assert.equal(state.hesitationLeft, 3.75);
  assert.equal(state.phase, 'hesitation');
});

test('the first picked product freezes hesitation before it is dropped', () => {
  const state = createSession('hesitation');
  accepted(state, 'talk');
  tick(state, 2);
  accepted(state, 'take', { id: 'hash4-1' });
  assert.equal(state.hesitationFrozen, true);
  tick(state, 15);
  assert.equal(state.hesitationLeft, 3);
  assert.equal(state.phase, 'hesitation');
  accepted(state, 'cancelDrag');
  tick(state, 20);
  assert.equal(state.hesitationLeft, 3);
});

test('keyboard product preparation freezes hesitation too', () => {
  const state = createSession('hesitation');
  accepted(state, 'talk');
  accepted(state, 'giveProduct', { slot: 1 });
  tick(state, 20);
  assert.equal(state.hesitationLeft, 5);
});

test('five seconds without a proposal lets the customer leave without stock loss', () => {
  const state = createSession('hesitation');
  accepted(state, 'talk');
  tick(state, 5);
  assert.equal(state.phase, 'departing');
  assert.equal(state.clients[0].exitReason, 'timeout');
  assert.equal(state.sales.length, 0);
  assert.equal(getView(state).slots[1].length, 8);
});

test('the player can solve a budget concern by lowering their own price', () => {
  const state = payment(createSession('hesitation'));
  assert.equal(state.agreement.price, 20);
  assert.equal(getView(state).due, 30);
  settle(state);
  assert.equal(state.sales[0].price, 20);
});

test('no automatic customer counteroffer appears', () => {
  const state = createSession('hesitation');
  accepted(state, 'talk');
  accepted(state, 'giveProduct', { slot: 1 });
  assert.equal(state.offerPrice, 25);
  tick(state, 30);
  assert.equal(state.offerPrice, 25);
  assert.equal(state.sales.length, 0);
});

test('a proposed price above budget is declined and all preparations return', () => {
  const state = createSession('hesitation');
  accepted(state, 'talk');
  accepted(state, 'giveProduct', { slot: 1 });
  assert.equal(act(state, 'propose').event, 'declined');
  assert.equal(state.phase, 'departing');
  assert.equal(state.clients[0].exitReason, 'budget');
  assert.equal(getView(state).slots[1].length, 8);
  assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'customer:customer-1');
});

test('price changes are exact five-euro steps below the normal ceiling', () => {
  const state = createSession();
  accepted(state, 'talk');
  accepted(state, 'giveProduct', { slot: 0 });
  unchanged(state, 'adjustPrice', { delta: 5 });
  unchanged(state, 'adjustPrice', { delta: -1 });
  accepted(state, 'adjustPrice', { delta: -5 });
  assert.equal(state.offerPrice, 40);
  accepted(state, 'adjustPrice', { delta: 5 });
  assert.equal(state.offerPrice, 45);
  for (let index = 0; index < 8; index++) accepted(state, 'adjustPrice', { delta: -5 });
  unchanged(state, 'adjustPrice', { delta: -5 });
});

test('wrong or excessive proposals are declined with every product returned', () => {
  for (const slots of [[1], [0, 0]]) {
    const state = createSession();
    accepted(state, 'talk');
    for (const slot of slots) accepted(state, 'giveProduct', { slot });
    assert.equal(act(state, 'propose').event, 'declined');
    assert.equal(state.phase, 'departing');
    assert.equal(state.clients[0].exitReason, 'wrong-products');
    assert.equal(state.agreement, null);
    assert.equal(getView(state).slots[0].length, 8);
    assert.equal(getView(state).slots[1].length, 8);
    assert.equal(state.sales.length, 0);
    assert.equal(state.objects.find(item => item.id === 'payment-1').location, 'customer:customer-1');
  }
});

test('an empty or unfinished proposal cannot become a sale', () => {
  const state = createSession();
  accepted(state, 'talk');
  unchanged(state, 'propose');
  accepted(state, 'take', { id: 'hash8-1' });
  unchanged(state, 'propose');
});

test('stock exhaustion cannot create a ninth sachet', () => {
  const state = createSession();
  accepted(state, 'talk');
  for (let index = 0; index < 8; index++) accepted(state, 'giveProduct', { slot: 0 });
  unchanged(state, 'giveProduct', { slot: 0 });
  assert.equal(getView(state).tray.length, 8);
});

test('cash exhaustion and unsupported denominations never manufacture notes', () => {
  const state = payment();
  for (let index = 0; index < 6; index++) accepted(state, 'giveBill', { denomination: 5 });
  unchanged(state, 'giveBill', { denomination: 5 });
  unchanged(state, 'giveBill', { denomination: 2 });
  unchanged(state, 'giveBill', { denomination: '10' });
});

test('the queue fills quickly to five and uses unique customers', () => {
  const state = createSession();
  tick(state, 3.99);
  assert.equal(state.queue.length, 0);
  tick(state, 0.01);
  assert.equal(state.queue.length, 1);
  tick(state, 100);
  assert.equal(state.queue.length, 5);
  assert.equal(new Set(state.queue).size, 5);
  assert.equal(state.clients.filter(client => client.status === 'pending').length, 2);
});

test('closing clears the waiting queue but lets the current transaction finish', () => {
  const state = payment(createSession('normal', { serviceSeconds: 10 }));
  tick(state, 10);
  assert.equal(state.closing, true);
  assert.equal(state.phase, 'payment');
  assert.equal(state.queue.length, 0);
  settle(state);
  accepted(state, 'stow');
  tick(state, 1);
  tick(state, 2);
  assert.equal(state.phase, 'closed');
  assert.equal(state.sales.length, 1);
});

test('closing never opens a new sale after a departure', () => {
  const state = createSession('normal', { serviceSeconds: 2 });
  accepted(state, 'talk');
  accepted(state, 'refuse');
  tick(state, 3);
  assert.equal(state.phase, 'closed');
  assert.equal(state.currentId, null);
  unchanged(state, 'talk');
});

test('all eight unique customers can be served with no duplication or loss', () => {
  const state = createSession();
  for (let index = 0; index < 8; index++) {
    payment(state);
    settle(state);
    accepted(state, 'stow');
    tick(state, 4);
    tick(state, 2);
  }
  assert.equal(state.phase, 'closed');
  assert.equal(state.sales.length, 8);
  assert.equal(state.objects.filter(item => item.kind === 'product' && item.location.startsWith('client:')).length, 8);
  assert.equal(state.sales.reduce((total, sale) => total + sale.price, 0), 250);
  assert.equal(sumFund(state), 1360);
  assert.equal(verify(state).money, 1510);
});

test('all receipts survive an entire service without any intermediate stowing', () => {
  const state = createSession();
  for (let index = 0; index < 8; index++) {
    payment(state);
    settle(state);
    tick(state, 4);
    tick(state, 2);
  }
  assert.equal(state.phase, 'closed');
  assert.equal(getView(state).hand.length, 1);
  assert.equal(getView(state).receipts.length, 7);
  assert.equal(getView(state).outstandingReceipts.length, 8);
  accepted(state, 'stow');
  for (const bill of [...getView(state).receipts]) {
    accepted(state, 'collect', { id: bill.id });
    accepted(state, 'stow');
  }
  assert.equal(getView(state).outstandingReceipts.length, 0);
  assert.equal(sumFund(state), 1360);
  assert.equal(state.sales.length, 8);
  verify(state);
});

function sumFund(state) { return getView(state).fund.reduce((total, item) => total + item.denomination, 0); }

test('invalid requests preserve every state field', () => {
  const state = createSession();
  for (const action of [null, {}, { type: 'anything' }, { type: 'giveProduct', slot: -1 }, { type: 'giveProduct', slot: 5 }, { type: 'take', id: 'missing' }, { type: 'drop', target: 'tray' }, { type: 'cancelDrag' }, { type: 'stow' }]) {
    const before = snapshot(state);
    assert.equal(dispatch(state, action).ok, false);
    assert.equal(snapshot(state), before);
  }
});

test('invalid time is rejected atomically', () => {
  const state = createSession();
  for (const delta of [-1, NaN, Infinity, '1']) {
    const before = snapshot(state);
    assert.equal(tick(state, delta).ok, false);
    assert.equal(snapshot(state), before);
  }
});

test('the invariant checker detects changed denomination, material and duplicated identities', () => {
  for (const corrupt of [state => { state.objects[0].grams++; }, state => { state.objects[40].denomination++; }, state => { state.objects.push({ ...state.objects[0] }); }, state => { state.objects[0].id = 'replaced'; }]) {
    const state = createSession();
    corrupt(state);
    assert.throws(() => verify(state));
  }
});

test('a deterministic mixed action stress sequence preserves exact objects', () => {
  const state = createSession('hesitation');
  let seed = 741;
  const random = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
  const types = ['talk', 'giveProduct', 'take', 'drop', 'retake', 'giveBill', 'adjustPrice', 'propose', 'confirm', 'stow', 'collect', 'cancelDrag'];
  for (let index = 0; index < 1000; index++) {
    const action = { type: types[random(types.length)], id: state.objects[random(state.objects.length)].id, slot: random(6), denomination: [5, 10, 20, 50, 100][random(5)], delta: random(2) ? 5 : -5, target: random(2) ? 'bag' : 'tray' };
    const before = snapshot(state);
    const result = dispatch(state, action);
    if (!result.ok) assert.equal(snapshot(state), before);
    verify(state);
  }
});

test('creation rejects unsupported scenarios and invalid durations', () => {
  assert.throws(() => createSession('unknown'));
  assert.throws(() => createSession('normal', { arrivalSeconds: 0 }));
  assert.throws(() => createSession('normal', { serviceSeconds: NaN }));
});
