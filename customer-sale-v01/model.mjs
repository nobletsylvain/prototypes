export const CATALOG = Object.freeze([
  { key: 'hash8', nameKey: 'hash', grams: 8, price: 45, color: '#a38158' },
  { key: 'hash4', nameKey: 'hash', grams: 4, price: 25, color: '#b89a6a' },
  { key: 'flower2', nameKey: 'flower', grams: 2, price: 20, color: '#739569' },
  { key: 'flower5', nameKey: 'flower', grams: 5, price: 40, color: '#899d59' },
  { key: 'premium2', nameKey: 'premium', grams: 2, price: 30, color: '#b3a1bd' }
].map(Object.freeze));

const catalog = Object.fromEntries(CATALOG.map(item => [item.key, item]));
const phases = new Set(['approach', 'request', 'hesitation', 'payment', 'receipt', 'departing', 'waiting', 'closed']);
const editablePhases = new Set(['request', 'hesitation', 'payment']);
const identity = item => JSON.stringify([item.id, item.kind, item.denomination ?? null, item.sku ?? null, item.grams ?? null]);
const sum = items => items.reduce((total, item) => total + (item.denomination || 0), 0);
const located = (state, location) => state.objects.filter(item => item.location === location);
const fail = reason => ({ ok: false, reason });
const success = event => ({ ok: true, event });
export const snapshot = state => JSON.stringify(state);

export function createSession(scenario = 'normal', options = {}) {
  if (!['normal', 'hesitation', 'full-hand'].includes(scenario)) throw new Error('Unknown scenario');
  const config = { waitForStow: false, arrivalSeconds: 4, serviceSeconds: 300, departureSeconds: 1.1, receiptSeconds: 0.7, ...options };
  for (const key of ['arrivalSeconds', 'serviceSeconds', 'departureSeconds', 'receiptSeconds']) {
    if (!Number.isFinite(config[key]) || config[key] <= 0) throw new Error(`Invalid ${key}`);
  }
  const orders = ['hash4', 'hash4', 'flower2', 'flower5', 'premium2', 'hash8', 'hash4', 'flower2'];
  if (scenario === 'hesitation') orders[0] = 'hash4';
  const names = ['Julien', 'Inès', 'Sofiane', 'Camille', 'Nora', 'Malik', 'Léa', 'Yann'];
  const clients = orders.map((sku, index) => ({
    id: `customer-${index + 1}`, name: names[index], request: [{ sku, count: 1 }],
    budget: scenario === 'hesitation' && index === 0 ? 20 : catalog[sku].price,
    concern: scenario === 'hesitation' && index === 0 ? 'price' : null,
    paymentIds: [`payment-${index + 1}`], status: index === 0 ? 'active' : 'pending'
  }));
  const objects = [];
  for (const item of CATALOG) for (let index = 0; index < 8; index++) objects.push({
    id: `${item.key}-${index + 1}`, kind: 'product', sku: item.key, grams: item.grams, location: `slot:${item.key}`
  });
  for (const denomination of [5, 10, 20, 50, 100]) for (let index = 0; index < 6; index++) objects.push({
    id: `fund-${denomination}-${index + 1}`, kind: 'bill', denomination, location: 'fund'
  });
  for (const client of clients) objects.push({ id: client.paymentIds[0], kind: 'bill', denomination: 50, location: `customer:${client.id}` });
  if (scenario === 'full-hand') objects.push({ id: 'demo-parcel', kind: 'prop', location: 'hand' });
  const state = {
    version: 1, scenario, config, objects, clients, phase: 'approach', currentId: clients[0].id,
    queue: [], nextArrivalIndex: 1, arrivalClock: 0, elapsed: 0, closing: false,
    offerPrice: 0, agreement: null, hesitationLeft: 5, hesitationFrozen: false,
    dragId: null, dragOrigin: null, receiptAge: 0, departureAge: 0, sales: [],
    baseline: objects.map(identity).sort(), initialMoney: sum(objects), initialGrams: objects.reduce((total, item) => total + (item.grams || 0), 0)
  };
  verify(state);
  return state;
}

export function getView(state) {
  const current = state.clients.find(client => client.id === state.currentId) || null;
  const tray = located(state, 'tray');
  const normalPrice = tray.reduce((total, item) => total + catalog[item.sku].price, 0);
  const paymentBills = current ? state.objects.filter(item => current.paymentIds.includes(item.id)) : [];
  const received = sum(paymentBills);
  const requestPrice = current ? current.request.reduce((total, line) => total + catalog[line.sku].price * line.count, 0) : 0;
  const effectivePrice = tray.length ? state.offerPrice : requestPrice;
  const due = current ? received - effectivePrice : 0;
  const returned = sum(located(state, 'change'));
  const outstandingReceipts = state.objects.filter(item => item.kind === 'bill' && ['hand', 'receipt'].includes(item.location));
  const exact = editablePhases.has(state.phase) && due >= 0 && returned === due;
  const matches = !!current && matchesRequest(tray, current.request);
  const budgetAccepted = !!current && effectivePrice > 0 && effectivePrice <= current.budget;
  const paymentAvailable = !!paymentBills.length && paymentBills.every(bill => bill.location === `customer:${current.id}`);
  return {
    current, request: state.phase === 'approach' ? null : current?.request || null,
    normalPrice, requestPrice, effectivePrice, paymentBills, received, due, returned, exact, matches, budgetAccepted,
    handFull: located(state, 'hand').length > 0,
    queueCount: state.queue.length,
    outstandingReceipts,
    canConfirm: exact && matches && budgetAccepted && effectivePrice <= normalPrice && !state.dragId && paymentAvailable && current.status === 'active',
    slots: CATALOG.map(item => located(state, `slot:${item.key}`)),
    fund: located(state, 'fund'), tray, change: located(state, 'change'),
    hand: located(state, 'hand'), receipts: located(state, 'receipt'),
    drag: state.objects.find(item => item.id === state.dragId) || null
  };
}

function matchesRequest(tray, request) {
  return request.every(line => tray.filter(product => product.sku === line.sku).length === line.count)
    && tray.length === request.reduce((total, line) => total + line.count, 0);
}

function prepare(state) {
  if (state.phase === 'payment') {
    state.agreement = null;
    state.phase = state.clients.find(client => client.id === state.currentId).concern ? 'hesitation' : 'request';
  }
}

function refreshPrice(state) {
  state.offerPrice = located(state, 'tray').reduce((total, item) => total + catalog[item.sku].price, 0);
}

function restorePreparation(state) {
  for (const item of state.objects) {
    if (['tray', 'change', 'drag'].includes(item.location)) {
      item.location = item.kind === 'product' ? `slot:${item.sku}` : 'fund';
    }
  }
  state.dragId = null;
  state.dragOrigin = null;
  state.agreement = null;
  state.offerPrice = 0;
}

function leave(state, reason) {
  restorePreparation(state);
  const current = state.clients.find(client => client.id === state.currentId);
  if (current) { current.status = 'left'; current.exitReason = reason; }
  state.phase = 'departing';
  state.departureAge = 0;
}

function activateNext(state) {
  if (state.config.waitForStow && getView(state).outstandingReceipts.length) return;
  if (state.closing) { state.currentId = null; state.phase = 'closed'; return; }
  const next = state.queue.shift();
  if (!next) {
    state.currentId = null;
    state.phase = state.nextArrivalIndex >= state.clients.length ? 'closed' : 'waiting';
    return;
  }
  state.currentId = next;
  state.clients.find(client => client.id === next).status = 'active';
  state.phase = 'approach';
  state.hesitationLeft = 5;
  state.hesitationFrozen = false;
  state.offerPrice = 0;
  state.agreement = null;
  state.receiptAge = 0;
  state.departureAge = 0;
}

export function dispatch(state, action) {
  if (!action || typeof action.type !== 'string') return fail('invalid-action');
  const current = state.clients.find(client => client.id === state.currentId);
  const item = action.id ? state.objects.find(candidate => candidate.id === action.id) : null;
  let event = action.type;
  switch (action.type) {
    case 'talk':
      if (state.phase !== 'approach' || !current) return fail('not-ready');
      state.phase = current.concern ? 'hesitation' : 'request';
      break;
    case 'take': {
      if (!item || state.dragId || !editablePhases.has(state.phase)) return fail('cannot-take');
      const isProduct = item.kind === 'product' && [`slot:${item.sku}`, 'tray'].includes(item.location);
      const isBill = item.kind === 'bill' && ['fund', 'change'].includes(item.location);
      if (!isProduct && !isBill) return fail('cannot-take');
      if (isProduct) {
        prepare(state);
        state.hesitationFrozen = true;
      }
      state.dragId = item.id;
      state.dragOrigin = item.location;
      item.location = 'drag';
      if (isProduct) refreshPrice(state);
      break;
    }
    case 'drop': {
      const held = state.objects.find(candidate => candidate.id === state.dragId);
      if (!held || !['tray', 'bag'].includes(action.target)) return fail('invalid-drop');
      if (action.target === 'tray' && !editablePhases.has(state.phase)) return fail('not-payment');
      held.location = action.target === 'bag' ? (held.kind === 'product' ? `slot:${held.sku}` : 'fund') : (held.kind === 'product' ? 'tray' : 'change');
      state.dragId = null;
      state.dragOrigin = null;
      if (held.kind === 'product') refreshPrice(state);
      break;
    }
    case 'cancelDrag': {
      const held = state.objects.find(candidate => candidate.id === state.dragId);
      if (!held) return fail('nothing-held');
      held.location = state.dragOrigin;
      state.dragId = null;
      state.dragOrigin = null;
      if (held.kind === 'product') refreshPrice(state);
      break;
    }
    case 'giveProduct': {
      const sku = CATALOG[action.slot]?.key;
      const product = state.objects.find(candidate => candidate.location === `slot:${sku}`);
      if (!Number.isInteger(action.slot) || !product || state.dragId || !editablePhases.has(state.phase)) return fail('cannot-prepare');
      prepare(state);
      product.location = 'tray';
      state.hesitationFrozen = true;
      refreshPrice(state);
      break;
    }
    case 'giveBill': {
      const bill = state.objects.find(candidate => candidate.kind === 'bill' && candidate.location === 'fund' && candidate.denomination === action.denomination);
      if (!bill || state.dragId || !editablePhases.has(state.phase)) return fail('cannot-give-change');
      bill.location = 'change';
      break;
    }
    case 'retake':
      if (!item || state.dragId || !editablePhases.has(state.phase) || !['tray', 'change'].includes(item.location)) return fail('cannot-retake');
      if (item.kind === 'product') {
        prepare(state);
        item.location = `slot:${item.sku}`;
        refreshPrice(state);
      } else item.location = 'fund';
      break;
    case 'adjustPrice': {
      if (!editablePhases.has(state.phase) || state.dragId || ![-5, 5].includes(action.delta)) return fail('cannot-adjust-price');
      const next = state.offerPrice + action.delta;
      if (next < 5 || next > getView(state).normalPrice) return fail('price-out-of-range');
      prepare(state);
      state.offerPrice = next;
      break;
    }
    case 'propose': {
      if (!['request', 'hesitation'].includes(state.phase) || state.dragId || !current) return fail('cannot-propose');
      const tray = located(state, 'tray');
      if (!tray.length || state.offerPrice < 5) return fail('empty-proposal');
      const matches = matchesRequest(tray, current.request);
      if (!matches) {
        leave(state, 'wrong-products');
        event = 'declined';
        break;
      }
      if (state.offerPrice > current.budget) {
        leave(state, 'budget');
        event = 'declined';
        break;
      }
      state.agreement = { price: state.offerPrice, productIds: tray.map(product => product.id), customerId: current.id };
      state.phase = 'payment';
      break;
    }
    case 'confirm': {
      const view = getView(state);
      if (!view.canConfirm || !current || current.status !== 'active') return fail('payment-not-exact');
      const productIds = located(state, 'tray').map(product => product.id);
      if (state.agreement && (JSON.stringify(productIds) !== JSON.stringify(state.agreement.productIds) || state.agreement.price !== view.effectivePrice)) return fail('agreement-changed');
      const change = located(state, 'change');
      const incoming = state.objects.filter(candidate => current.paymentIds.includes(candidate.id));
      if (!incoming.length || incoming.some(bill => bill.location !== `customer:${current.id}`)) return fail('payment-already-received');
      state.agreement = { price: view.effectivePrice, productIds: [...productIds], customerId: current.id };
      for (const product of located(state, 'tray')) product.location = `client:${current.id}`;
      for (const bill of change) bill.location = `client:${current.id}`;
      for (const bill of incoming) bill.location = 'fund';
      state.sales.push({ customerId: current.id, price: state.agreement.price, productIds, paymentIds: [...current.paymentIds], changeIds: change.map(bill => bill.id) });
      current.status = 'served';
      state.phase = 'receipt';
      state.receiptAge = 0;
      event = 'sale-to-fund';
      break;
    }
    case 'collect':
      if (!item || item.kind !== 'bill' || item.location !== 'receipt' || located(state, 'hand').length || state.dragId) return fail('hand-occupied');
      item.location = 'hand';
      break;
    case 'stow': {
      const hand = located(state, 'hand');
      if (!hand.length || state.dragId) return fail('nothing-to-stow');
      for (const held of hand) held.location = held.kind === 'bill' ? 'fund' : 'demo-home';
      break;
    }
    case 'cancel':
    case 'refuse':
      if (!editablePhases.has(state.phase) || !current) return fail('cannot-cancel');
      leave(state, 'refused');
      break;
    default:
      return fail('unknown-action');
  }
  verify(state);
  return success(event);
}

export function tick(state, dt) {
  if (!Number.isFinite(dt) || dt < 0) return fail('invalid-time');
  if (dt === 0) return success('tick');
  state.elapsed += dt;
  if (!state.closing && state.elapsed >= state.config.serviceSeconds) {
    state.closing = true;
    for (const id of state.queue) state.clients.find(client => client.id === id).status = 'left';
    state.queue = [];
    if (['waiting', 'closed'].includes(state.phase)) { state.currentId = null; state.phase = 'closed'; }
  }
  if (!state.closing) {
    state.arrivalClock += dt;
    while (state.arrivalClock >= state.config.arrivalSeconds && state.queue.length < 5 && state.nextArrivalIndex < state.clients.length) {
      state.arrivalClock -= state.config.arrivalSeconds;
      const next = state.clients[state.nextArrivalIndex++];
      next.status = 'queued';
      state.queue.push(next.id);
    }
    if (state.queue.length === 5) state.arrivalClock = Math.min(state.arrivalClock, state.config.arrivalSeconds);
  }
  if (state.phase === 'hesitation' && !state.hesitationFrozen) {
    state.hesitationLeft = Math.max(0, state.hesitationLeft - dt);
    if (state.hesitationLeft === 0) leave(state, 'timeout');
  } else if (state.phase === 'receipt') {
    state.receiptAge += dt;
    const blocked = state.config.waitForStow && getView(state).outstandingReceipts.length > 0;
    if (state.receiptAge >= state.config.receiptSeconds && !blocked) {
      state.phase = 'departing';
      state.departureAge = 0;
    }
  } else if (state.phase === 'departing') {
    state.departureAge += dt;
    if (state.departureAge >= state.config.departureSeconds) activateNext(state);
  } else if (state.phase === 'waiting') activateNext(state);
  verify(state);
  return success('tick');
}

export function verify(state) {
  if (!phases.has(state.phase)) throw new Error('Invalid phase');
  const identities = state.objects.map(identity).sort();
  if (JSON.stringify(identities) !== JSON.stringify(state.baseline)) throw new Error('Object identity or substance changed');
  if (new Set(state.objects.map(item => item.id)).size !== state.objects.length) throw new Error('Duplicate object identity');
  if (sum(state.objects) !== state.initialMoney) throw new Error('Money conservation failed');
  if (state.objects.reduce((total, item) => total + (item.grams || 0), 0) !== state.initialGrams) throw new Error('Matter conservation failed');
  if (state.queue.length > 5 || new Set(state.queue).size !== state.queue.length) throw new Error('Invalid queue');
  if (new Set(state.sales.map(sale => sale.customerId)).size !== state.sales.length) throw new Error('Duplicate sale');
  const drag = located(state, 'drag');
  if (drag.length !== (state.dragId ? 1 : 0) || (drag[0] && drag[0].id !== state.dragId)) throw new Error('Invalid drag ownership');
  for (const item of state.objects) {
    const allowed = item.kind === 'product'
      ? [`slot:${item.sku}`, 'tray', 'drag']
      : item.kind === 'bill' ? ['fund', 'change', 'drag', 'hand', 'receipt'] : ['hand', 'demo-home'];
    const clientLocation = state.clients.some(client => item.location === `client:${client.id}`);
    const paymentLocation = item.kind === 'bill' && state.clients.some(client => item.location === `customer:${client.id}` && client.paymentIds.includes(item.id));
    if (!allowed.includes(item.location) && !clientLocation && !paymentLocation) throw new Error('Invalid object location');
  }
  for (const sale of state.sales) {
    const price = sum(state.objects.filter(item => sale.paymentIds.includes(item.id))) - sum(state.objects.filter(item => sale.changeIds.includes(item.id)));
    if (price !== sale.price) throw new Error('Sale value mismatch');
    if (sale.productIds.some(id => !state.objects.some(item => item.id === id && item.location === `client:${sale.customerId}`))) throw new Error('Sold product moved');
  }
  return { ok: true, objects: state.objects.length, money: state.initialMoney, grams: state.initialGrams, sales: state.sales.length };
}
