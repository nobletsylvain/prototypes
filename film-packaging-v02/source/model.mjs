const SCENARIOS = new Set(['plaquettes', 'liasses', 'produits']);

const clone = value => JSON.parse(JSON.stringify(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = reason => ({ ok: false, reason });

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function validSlot(slot) {
  if (typeof slot === 'number') return Number.isFinite(slot);
  if (typeof slot === 'string') return slot.trim().length > 0;
  return slot !== null && typeof slot === 'object' && !Array.isArray(slot)
    && Number.isFinite(slot.x) && Number.isFinite(slot.z)
    && Object.keys(slot).every(key => key === 'x' || key === 'z');
}

function createScenario(scenario) {
  const items = {};
  const piles = [];
  const addPile = (id, label, entries, slot) => {
    for (const item of entries) items[item.id] = freeze(item);
    piles.push({ id, label, itemIds: entries.map(item => item.id), slot });
  };
  const slab = (variety, formatMg, index) => {
    const suffix = String(index).padStart(2, '0');
    const id = `slab-${variety.toLowerCase()}${formatMg / 1000}-${suffix}`;
    const lotId = `harvest-${variety.toLowerCase()}-${1 + (index % 3)}`;
    return {
      id, kind: 'slab', label: 'slab', variety, formatMg, mg: formatMg, cents: 0,
      quality: ['standard', 'fine', 'premium'][index % 3],
      provenance: index % 4 === 0
        ? [{ lotId, mg: formatMg * 3 / 5 }, { lotId: `harvest-${variety.toLowerCase()}-4`, mg: formatMg * 2 / 5 }]
        : [{ lotId, mg: formatMg }],
      bills: [],
    };
  };
  if (scenario === 'plaquettes') {
    const main = Array.from({ length: 36 }, (_, i) => slab('A', 100000, i + 1));
    addPile('pile-a100-main', 'slabsMain', main.slice(0, 32), 0);
    addPile('pile-a100-lots', 'slabsLots', main.slice(32), 1);
    addPile('pile-a250', 'slabsLarge', Array.from({ length: 4 }, (_, i) => slab('A', 250000, i + 1)), 2);
    addPile('pile-b100', 'slabsOther', Array.from({ length: 3 }, (_, i) => slab('B', 100000, i + 1)), 3);
  } else if (scenario === 'liasses') {
    const entries = Array.from({ length: 32 }, (_, index) => {
      const id = `cash-bundle-${String(index + 1).padStart(2, '0')}`;
      const denomination = [1000, 2000, 5000][index % 3];
      const bills = Array.from({ length: 10 }, (_, i) => ({
        id: `${id}-bill-${String(i + 1).padStart(2, '0')}`, cents: denomination,
      }));
      return {
        id, kind: 'cashBundle', label: 'cashBundle', variety: null, formatMg: null,
        mg: 0, cents: bills.reduce((total, bill) => total + bill.cents, 0),
        quality: null, provenance: [{ lotId: `cash-origin-${index + 1}`, mg: 0 }], bills,
      };
    });
    addPile('pile-cash', 'cashBundles', entries, 0);
  } else {
    const entries = Array.from({ length: 6 }, (_, index) => ({
      id: `flower-bag-${String(index + 1).padStart(2, '0')}`,
      kind: 'flowerBag', label: 'flowerBag', variety: 'A', formatMg: 5000,
      mg: 5000, cents: 0, quality: ['fine', 'premium'][index % 2],
      provenance: [{ lotId: `flower-harvest-${index + 1}`, mg: 5000 }], bills: [],
    }));
    addPile('pile-flowers', 'flowerBags', entries, 0);
  }
  return { scenario, items, piles, handIds: [], packages: [], heldPackageId: null,
    phase: 'idle', targetPileId: piles[0].id };
}

function totals(items) {
  return Object.values(items).reduce((result, item) => ({
    items: result.items + 1,
    mg: result.mg + item.mg,
    cents: result.cents + item.cents,
    bills: result.bills + item.bills.length,
  }), { items: 0, mg: 0, cents: 0, bills: 0 });
}

export class Workshop {
  #originalItems = {};
  #baseline = {};
  #sources = new Map();
  #pending = null;
  #packageSequence = 0;
  #pileSequence = 0;

  constructor(scenario = 'plaquettes') {
    if (!SCENARIOS.has(scenario)) throw new RangeError('Unknown demonstration scenario');
    this.reset(scenario);
  }

  reset(scenario = 'plaquettes') {
    if (!SCENARIOS.has(scenario)) return fail('unknown-scenario');
    this.state = createScenario(scenario);
    this.#originalItems = { ...this.state.items };
    this.#baseline = freeze(totals(this.state.items));
    this.#sources = new Map();
    this.#pending = null;
    this.#packageSequence = 0;
    this.#pileSequence = 0;
    return { ok: true, scenario };
  }

  snapshot() { return clone(this.state); }

  selectPile(id) {
    if (this.state.phase !== 'idle') return fail('busy');
    if (this.state.heldPackageId !== null) return fail('hand-occupied');
    if (!this.state.piles.some(pile => pile.id === id)) return fail('unknown-pile');
    this.state.targetPileId = id;
    return { ok: true, pileId: id };
  }

  #compatibility(candidate, selected) {
    if (!selected) return null;
    if (candidate.kind !== selected.kind) return 'incompatible-family';
    if (candidate.kind === 'slab') {
      if (candidate.formatMg !== selected.formatMg) return 'incompatible-format';
      if (candidate.variety !== selected.variety) return 'incompatible-variety';
    }
    return null;
  }

  takeOne() {
    const state = this.state;
    if (state.phase !== 'idle') return fail('busy');
    if (state.heldPackageId !== null) return fail('hand-occupied');
    const pile = state.piles.find(entry => entry.id === state.targetPileId);
    if (!pile) return fail('no-target-pile');
    if (!pile.itemIds.length) return fail('empty-pile');
    const first = state.items[state.handIds[0]];
    if (first?.kind === 'slab' && state.handIds.length >= 30) return fail('slab-limit');
    if (first?.kind === 'cashBundle' && state.handIds.length >= 30) return fail('cash-limit');
    const index = pile.itemIds.findIndex(id => !this.#compatibility(state.items[id], first));
    if (index < 0) return fail(this.#compatibility(state.items[pile.itemIds[0]], first));
    const itemId = pile.itemIds[index];
    pile.itemIds.splice(index, 1);
    state.handIds.push(itemId);
    this.#sources.set(itemId, pile.id);
    return { ok: true, itemId, pileId: pile.id, count: state.handIds.length };
  }

  returnItems(ids) {
    const state = this.state;
    if (state.phase !== 'idle') return fail('busy');
    if (state.heldPackageId !== null) return fail('hand-occupied');
    if (!Array.isArray(ids) || !ids.length) return fail('empty-selection');
    if (new Set(ids).size !== ids.length) return fail('duplicate-selection');
    if (ids.some(id => !state.handIds.includes(id))) return fail('item-not-held');
    const destinations = ids.map(id => state.piles.find(pile => pile.id === this.#sources.get(id)));
    if (destinations.some(pile => !pile)) return fail('missing-source-pile');
    const returned = new Set(ids);
    state.handIds = state.handIds.filter(id => !returned.has(id));
    ids.forEach((id, index) => {
      destinations[index].itemIds.push(id);
      this.#sources.delete(id);
    });
    return { ok: true, itemIds: [...ids], pileIds: destinations.map(pile => pile.id) };
  }

  startWrap() {
    const state = this.state;
    if (state.phase !== 'idle') return fail('busy');
    if (state.heldPackageId !== null) return fail('hand-occupied');
    if (!state.handIds.length) return fail('empty-selection');
    const first = state.items[state.handIds[0]];
    if (first.kind === 'slab' && state.handIds.length > 30) return fail('slab-limit');
    if (first.kind === 'cashBundle' && state.handIds.length > 30) return fail('cash-limit');
    for (const id of state.handIds) {
      const reason = this.#compatibility(state.items[id], first);
      if (reason) return fail(reason);
    }
    this.#pending = freeze({ type: 'wrap', itemIds: [...state.handIds] });
    state.phase = 'wrapping';
    return { ok: true, itemIds: [...state.handIds] };
  }

  finishWrap() {
    const state = this.state;
    if (state.phase !== 'wrapping' || this.#pending?.type !== 'wrap') return fail('not-wrapping');
    if (!same(this.#pending.itemIds, state.handIds)) return fail('selection-changed');
    const id = `package-${String(++this.#packageSequence).padStart(2, '0')}`;
    const itemIds = [...state.handIds];
    state.packages.push({ id, itemIds, slot: null, held: true });
    itemIds.forEach(itemId => this.#sources.delete(itemId));
    state.handIds = [];
    state.heldPackageId = id;
    state.phase = 'idle';
    this.#pending = null;
    return { ok: true, packageId: id, itemIds: [...itemIds] };
  }

  placePackage(slot) {
    const state = this.state;
    if (state.phase !== 'idle') return fail('busy');
    if (!validSlot(slot)) return fail('invalid-slot');
    const packet = state.packages.find(entry => entry.id === state.heldPackageId);
    if (!packet || !packet.held) return fail('no-held-package');
    packet.slot = clone(slot);
    packet.held = false;
    state.heldPackageId = null;
    return { ok: true, packageId: packet.id, slot: clone(slot) };
  }

  pickPackage(id) {
    const state = this.state;
    if (state.phase !== 'idle') return fail('busy');
    if (state.handIds.length || state.heldPackageId !== null) return fail('hand-occupied');
    const packet = state.packages.find(entry => entry.id === id);
    if (!packet) return fail('unknown-package');
    if (packet.held || packet.slot === null) return fail('package-not-placed');
    const fromSlot = clone(packet.slot);
    packet.slot = null;
    packet.held = true;
    state.heldPackageId = id;
    return { ok: true, packageId: id, fromSlot };
  }

  startOpen(id) {
    const state = this.state;
    if (state.phase !== 'idle') return fail('busy');
    if (state.handIds.length || state.heldPackageId !== null) return fail('hand-occupied');
    const packet = state.packages.find(entry => entry.id === id);
    if (!packet) return fail('unknown-package');
    if (packet.held || packet.slot === null) return fail('package-not-placed');
    this.#pending = freeze({ type: 'open', packageId: id, itemIds: [...packet.itemIds], slot: clone(packet.slot) });
    state.phase = 'opening';
    return { ok: true, packageId: id, itemIds: [...packet.itemIds], slot: clone(packet.slot) };
  }

  finishOpen() {
    const state = this.state;
    if (state.phase !== 'opening' || this.#pending?.type !== 'open') return fail('not-opening');
    const pending = this.#pending;
    const index = state.packages.findIndex(packet => packet.id === pending.packageId);
    const packet = state.packages[index];
    if (!packet || !same(packet.itemIds, pending.itemIds) || !same(packet.slot, pending.slot) || packet.held)
      return fail('package-changed');
    const id = `pile-opened-${String(++this.#pileSequence).padStart(2, '0')}`;
    const itemIds = [...packet.itemIds];
    state.piles.push({ id, label: 'openedPackage', itemIds, slot: clone(packet.slot) });
    state.packages.splice(index, 1);
    state.targetPileId = id;
    state.phase = 'idle';
    this.#pending = null;
    return { ok: true, packageId: packet.id, pileId: id, itemIds: [...itemIds], slot: clone(packet.slot) };
  }

  audit() {
    const state = this.state;
    const errors = [];
    const occurrences = new Map();
    const locate = (id, location) => {
      if (!state.items[id]) errors.push(`Unknown item ${id} in ${location}`);
      occurrences.set(id, (occurrences.get(id) || 0) + 1);
    };
    state.piles.forEach(pile => pile.itemIds.forEach(id => locate(id, pile.id)));
    state.handIds.forEach(id => locate(id, 'hand'));
    state.packages.forEach(packet => packet.itemIds.forEach(id => locate(id, packet.id)));
    const billIds = new Set();
    for (const [id, original] of Object.entries(this.#originalItems)) {
      if (state.items[id] !== original) errors.push(`Original item reference changed: ${id}`);
      if (occurrences.get(id) !== 1) errors.push(`Item occurrence count is ${occurrences.get(id) || 0}: ${id}`);
    }
    for (const [id, item] of Object.entries(state.items)) {
      if (!this.#originalItems[id]) errors.push(`Unexpected item: ${id}`);
      if (!Number.isSafeInteger(item.mg) || !Number.isSafeInteger(item.cents)) errors.push(`Non-integer accounting: ${id}`);
      if (item.provenance.reduce((sum, part) => sum + part.mg, 0) !== item.mg) errors.push(`Provenance mass mismatch: ${id}`);
      for (const bill of item.bills) {
        if (billIds.has(bill.id)) errors.push(`Duplicate bill identity: ${bill.id}`);
        billIds.add(bill.id);
      }
      if (item.kind === 'cashBundle' && item.bills.reduce((sum, bill) => sum + bill.cents, 0) !== item.cents)
        errors.push(`Cash value mismatch: ${id}`);
    }
    const current = totals(state.items);
    if (!same(current, this.#baseline)) errors.push('Accounting totals changed');
    const held = state.packages.filter(packet => packet.held);
    if (held.length > 1 || (held.length && state.handIds.length)) errors.push('More than one hand content');
    if ((held[0]?.id ?? null) !== state.heldPackageId) errors.push('Held package pointer mismatch');
    if (state.packages.some(packet => packet.held ? packet.slot !== null : packet.slot === null)) errors.push('Package placement mismatch');
    return { ok: !errors.length, errors, totals: current, baseline: clone(this.#baseline) };
  }
}
