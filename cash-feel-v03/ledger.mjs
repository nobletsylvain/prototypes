const HAND_CAPACITY = 100;
const LOOSE_SLOT_CAPACITY = 100;
const BUNDLE_SLOT_CAPACITY = 10;
const BUNDLE_SIZE = 100;
const BUNDLE_SIZES = Object.freeze([25, 50, 100]);
const LOCATIONS = new Set(['pouch', 'table', 'hand', 'input', 'reserve10', 'reserve20', 'binding10', 'binding20', 'output', 'slot0', 'slot1', 'slot2', 'slot3', 'slot4']);

const copyEntity = entity => ({ ...entity, noteIds: [...entity.noteIds] });
const freezeEntities = entities => Object.freeze(entities.map(entity => Object.freeze({ ...entity, noteIds: Object.freeze([...entity.noteIds]) })));
const refusal = reason => ({ ok: false, reason, moved: 0 });

/** Owns every note identity; visual animation never changes monetary state. */
export class CashLedger {
  constructor(mode = 'small') {
    if (!['small', 'large'].includes(mode)) throw new RangeError('Unknown cash scenario');
    this.mode = mode;
    Object.defineProperty(this, 'circuit', { value: 'integrated', enumerable: true });
    const scale = mode === 'large' ? 10 : 1;
    this.notes = Object.freeze(Array.from({ length: 120 * scale }, (_, index) => Object.freeze({
      id: `note-${String(index + 1).padStart(4, '0')}`,
      denomination: index < 100 * scale ? 20 : 10,
    })));
    this._original = new Map(this.notes.map(note => [note.id, note.denomination]));
    this._expectedValue = 2200 * scale;
    this._entities = freezeEntities(this.notes.map(note => ({ id: note.id, type: 'note', noteIds: [note.id], location: 'pouch' })));
    this._slots = Object.freeze(Array.from({ length: 5 }, () => Object.freeze({ form: null })));
    this._nextBundleId = 1;
    this._bundleSize = BUNDLE_SIZE;
  }

  get entities() { return this._entities; }
  get slots() { return this._slots; }
  get bundleSize() { return this._bundleSize; }
  get handObjects() { return this.getEntities('hand').length; }
  get totalValue() {
    return this._entities.reduce((sum, entity) => sum + entity.noteIds.reduce((value, id) => value + (this._original.get(id) ?? 0), 0), 0);
  }

  getEntities(location) { return this._entities.filter(entity => entity.location === location); }

  denomination(entity) {
    const resolved = typeof entity === 'string' ? this._entities.find(item => item.id === entity) : entity;
    if (!resolved?.noteIds?.length) return null;
    const first = this._original.get(resolved.noteIds[0]);
    return first !== undefined && resolved.noteIds.every(id => this._original.get(id) === first) ? first : null;
  }

  snapshot() {
    return {
      mode: this.mode,
      circuit: this.circuit,
      bundleSize: this.bundleSize,
      notes: this.notes.map(note => ({ ...note })),
      entities: this._entities.map(copyEntity),
      slots: this._slots.map(slot => ({ ...slot })),
      nextBundleId: this._nextBundleId,
      totalValue: this.totalValue,
      handObjects: this.handObjects,
    };
  }

  verify() { return this._audit(this._entities, this._slots, this._bundleSize); }

  _audit(entities, slots, bundleSize) {
    const errors = [];
    if (!BUNDLE_SIZES.includes(bundleSize)) errors.push('invalid-bundle-target');
    const entityIds = new Set();
    const seen = new Set();
    let totalValue = 0;
    for (const entity of entities) {
      if (!entity.id || entityIds.has(entity.id)) errors.push('duplicate-entity');
      entityIds.add(entity.id);
      if (!LOCATIONS.has(entity.location)) errors.push('invalid-location');
      if (!['note', 'bundle'].includes(entity.type)) errors.push('invalid-type');
      if (entity.type === 'note' && (entity.noteIds.length !== 1 || entity.id !== entity.noteIds[0])) errors.push('invalid-note-entity');
      if (entity.type === 'bundle' && (!BUNDLE_SIZES.includes(entity.bundleSize) || entity.noteIds.length !== entity.bundleSize || entity.noteCount !== entity.bundleSize)) errors.push('invalid-bundle-size');
      const values = new Set();
      for (const id of entity.noteIds) {
        if (!this._original.has(id)) errors.push('unknown-note');
        if (seen.has(id)) errors.push('duplicate-note');
        seen.add(id);
        const value = this._original.get(id) ?? 0;
        totalValue += value;
        values.add(value);
      }
      if (entity.type === 'bundle' && values.size !== 1) errors.push('mixed-bundle');
      if (['input', 'reserve10', 'reserve20'].includes(entity.location) && entity.type !== 'note') errors.push('bundle-in-loose-location');
      if (['output', 'binding10', 'binding20'].includes(entity.location) && entity.type !== 'bundle') errors.push('loose-note-outside-reserve');
      for (const denomination of [10, 20]) {
        if ([`reserve${denomination}`, `binding${denomination}`].includes(entity.location) && this.denomination(entity) !== denomination) errors.push('reserve-denomination');
      }
    }
    for (const denomination of [10, 20]) if (entities.filter(entity => entity.location === `binding${denomination}`).length > 1) errors.push('binding-capacity');
    if (seen.size !== this._original.size || [...this._original.keys()].some(id => !seen.has(id))) errors.push('identity-conservation');
    if (totalValue !== this._expectedValue) errors.push('value-conservation');
    if (entities.filter(entity => entity.location === 'hand').length > HAND_CAPACITY) errors.push('hand-capacity');
    if (slots.length !== 5) errors.push('slot-count');
    for (let index = 0; index < slots.length; index++) {
      const form = slots[index].form;
      const contents = entities.filter(entity => entity.location === `slot${index}`);
      if (![null, 'note', 'bundle'].includes(form)) errors.push('invalid-slot-form');
      if (contents.some(entity => entity.type !== form)) errors.push('slot-form-mismatch');
      const capacity = form === 'bundle' ? BUNDLE_SLOT_CAPACITY : LOOSE_SLOT_CAPACITY;
      if (contents.length > capacity) errors.push('slot-capacity');
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)], totalValue, noteCount: seen.size, entityCount: entities.length };
  }

  _transact(operation) {
    if (!this.verify().ok) return refusal('invalid-state');
    const draft = {
      entities: this._entities.map(copyEntity),
      slots: this._slots.map(slot => ({ ...slot })),
      nextBundleId: this._nextBundleId,
      bundleSize: this._bundleSize,
    };
    const result = operation(draft);
    if (!result.ok) return result;
    const audit = this._audit(draft.entities, draft.slots, draft.bundleSize);
    if (!audit.ok) return { ...refusal('invariant-failed'), errors: audit.errors };
    this._entities = freezeEntities(draft.entities);
    this._slots = Object.freeze(draft.slots.map(slot => Object.freeze({ ...slot })));
    this._nextBundleId = draft.nextBundleId;
    this._bundleSize = draft.bundleSize;
    return {
      ...result,
      ...(result.entity ? { entity: copyEntity(result.entity) } : {}),
      ...(result.ids ? { ids: [...result.ids] } : {}),
    };
  }

  dump() {
    return this._transact(draft => {
      const contents = draft.entities.filter(entity => entity.location === 'pouch');
      if (!contents.length) return refusal('pouch-empty');
      for (const entity of contents) entity.location = 'table';
      return { ok: true, moved: contents.length, ids: contents.map(entity => entity.id) };
    });
  }

  dumpDelivery() {
    return this._transact(draft => {
      const pouch = draft.entities.filter(entity => entity.location === 'pouch');
      const selected = [
        ...pouch.filter(entity => this.denomination(entity) === 20).slice(0, 50),
        ...pouch.filter(entity => this.denomination(entity) === 10).slice(0, 10),
      ];
      if (!selected.length) return refusal('pouch-empty');
      for (const entity of selected) entity.location = 'table';
      return { ok: true, moved: selected.length, ids: selected.map(entity => entity.id) };
    });
  }

  setBundleSize(size) {
    if (!Number.isInteger(size) || !BUNDLE_SIZES.includes(size)) return refusal('invalid-bundle-size');
    return this._transact(draft => {
      draft.bundleSize = size;
      return { ok: true, moved: 0, bundleSize: size };
    });
  }

  pickup(ids) {
    if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string')) return refusal('invalid-selection');
    if (new Set(ids).size !== ids.length) return refusal('duplicate-selection');
    return this._transact(draft => {
      const selected = ids.map(id => draft.entities.find(entity => entity.id === id));
      if (selected.some(entity => !entity || entity.location !== 'table')) return refusal('not-on-table');
      const held = draft.entities.filter(entity => entity.location === 'hand').length;
      if (held + selected.length > HAND_CAPACITY) return refusal('hand-full');
      for (const entity of selected) entity.location = 'hand';
      return { ok: true, moved: selected.length, ids };
    });
  }

  dropHand() {
    return this._transact(draft => {
      const held = draft.entities.filter(entity => entity.location === 'hand');
      if (!held.length) return refusal('hand-empty');
      for (const entity of held) entity.location = 'table';
      return { ok: true, moved: held.length, ids: held.map(entity => entity.id) };
    });
  }

  feed() {
    return this._transact(draft => {
      const held = draft.entities.filter(entity => entity.location === 'hand');
      if (!held.length) return refusal('hand-empty');
      if (held.some(entity => entity.type !== 'note')) return refusal('open-bundle-first');
      for (const entity of held) entity.location = 'input';
      return { ok: true, moved: held.length, ids: held.map(entity => entity.id) };
    });
  }

  feedSorter() { return this.feed(); }

  takeReserve(denomination, limit = 25) {
    if (!Number.isInteger(denomination) || ![10, 20].includes(denomination)) return refusal('invalid-denomination');
    if (!Number.isInteger(limit) || limit <= 0) return refusal('invalid-limit');
    return this._transact(draft => {
      const capacity = HAND_CAPACITY - draft.entities.filter(entity => entity.location === 'hand').length;
      if (!capacity) return refusal('hand-full');
      const selected = draft.entities.filter(entity => entity.location === `reserve${denomination}`).slice(0, Math.min(limit, capacity));
      if (!selected.length) return refusal('reserve-empty');
      for (const entity of selected) entity.location = 'hand';
      return { ok: true, moved: selected.length, ids: selected.map(entity => entity.id), ...(selected.length === 1 ? { entity: selected[0] } : {}) };
    });
  }

  tickMachine() {
    return this._transact(draft => {
      const entity = draft.entities.find(item => item.location === 'input');
      if (!entity) return refusal('input-empty');
      entity.location = `reserve${this.denomination(entity)}`;
      return { ok: true, moved: 1, entity, ids: [entity.id] };
    });
  }

  bind(denomination) {
    if (!Number.isInteger(denomination) || ![10, 20].includes(denomination)) return refusal('invalid-denomination');
    return this._transact(draft => {
      if (draft.entities.some(entity => entity.location === `binding${denomination}`)) return refusal('binding-busy');
      const notes = draft.entities.filter(entity => entity.location === `reserve${denomination}`).slice(0, draft.bundleSize);
      if (notes.length !== draft.bundleSize) return refusal('need-matching-notes');
      const selected = new Set(notes.map(entity => entity.id));
      const entity = {
        id: `bundle-${String(draft.nextBundleId++).padStart(4, '0')}`,
        type: 'bundle',
        noteIds: notes.flatMap(note => note.noteIds),
        noteCount: draft.bundleSize,
        bundleSize: draft.bundleSize,
        location: `binding${denomination}`,
      };
      draft.entities = draft.entities.filter(item => !selected.has(item.id));
      draft.entities.push(entity);
      return { ok: true, moved: draft.bundleSize, entity, ids: [...selected] };
    });
  }

  eject(denomination) {
    if (!Number.isInteger(denomination) || ![10, 20].includes(denomination)) return refusal('invalid-denomination');
    return this._transact(draft => {
      const entity = draft.entities.find(item => item.location === `binding${denomination}`);
      if (!entity) return refusal('binding-empty');
      entity.location = 'output';
      return { ok: true, moved: 1, entity, ids: [entity.id] };
    });
  }

  takeOutput(id) {
    if (id !== undefined && (typeof id !== 'string' || !id)) return refusal('invalid-selection');
    return this._transact(draft => {
      if (draft.entities.filter(entity => entity.location === 'hand').length >= HAND_CAPACITY) return refusal('hand-full');
      const entity = draft.entities.find(item => item.location === 'output' && (id === undefined || item.id === id));
      if (!entity) return refusal('output-empty');
      entity.location = 'hand';
      return { ok: true, moved: 1, entity, ids: [entity.id] };
    });
  }

  _take(draft, location) {
    const capacity = HAND_CAPACITY - draft.entities.filter(entity => entity.location === 'hand').length;
    if (!capacity) return refusal('hand-full');
    const contents = draft.entities.filter(entity => entity.location === location);
    if (!contents.length) return refusal(location === 'output' ? 'output-empty' : 'slot-empty');
    const bundle = contents.find(entity => entity.type === 'bundle');
    const selected = bundle ? [bundle] : contents.slice(0, capacity);
    for (const entity of selected) entity.location = 'hand';
    return { ok: true, moved: selected.length, ids: selected.map(entity => entity.id), ...(selected.length === 1 ? { entity: selected[0] } : {}) };
  }

  openHand() {
    return this._transact(draft => {
      const held = draft.entities.filter(entity => entity.location === 'hand');
      const bundle = held.find(entity => entity.type === 'bundle');
      if (!bundle) return refusal('no-held-bundle');
      if (held.length - 1 + bundle.noteIds.length > HAND_CAPACITY) return refusal('hand-full');
      draft.entities = draft.entities.filter(entity => entity.id !== bundle.id);
      const notes = bundle.noteIds.map(id => ({ id, type: 'note', noteIds: [id], location: 'hand' }));
      draft.entities.push(...notes);
      return { ok: true, moved: notes.length, ids: notes.map(entity => entity.id), openedBundleId: bundle.id };
    });
  }

  store(index) {
    if (!Number.isInteger(index) || index < 0 || index >= 5) return refusal('invalid-slot');
    return this._transact(draft => {
      const held = draft.entities.filter(entity => entity.location === 'hand');
      if (!held.length) return refusal('hand-empty');
      const slot = draft.slots[index];
      const form = slot.form ?? held[0].type;
      const compatible = held.filter(entity => entity.type === form);
      if (!compatible.length) return refusal('incompatible-form');
      const current = draft.entities.filter(entity => entity.location === `slot${index}`).length;
      const available = (form === 'bundle' ? BUNDLE_SLOT_CAPACITY : LOOSE_SLOT_CAPACITY) - current;
      if (available <= 0) return refusal('slot-full');
      const selected = compatible.slice(0, available);
      slot.form = form;
      for (const entity of selected) entity.location = `slot${index}`;
      return { ok: true, moved: selected.length, ids: selected.map(entity => entity.id), remaining: held.length - selected.length };
    });
  }

  withdraw(index) {
    if (!Number.isInteger(index) || index < 0 || index >= 5) return refusal('invalid-slot');
    return this._transact(draft => this._take(draft, `slot${index}`));
  }

  clearSlot(index) {
    if (!Number.isInteger(index) || index < 0 || index >= 5) return refusal('invalid-slot');
    return this._transact(draft => {
      if (draft.entities.some(entity => entity.location === `slot${index}`)) return refusal('slot-not-empty');
      if (draft.slots[index].form === null) return refusal('slot-unassigned');
      draft.slots[index].form = null;
      return { ok: true, moved: 0 };
    });
  }
}

export const CASH_LIMITS = Object.freeze({ handObjects: HAND_CAPACITY, loosePerSlot: LOOSE_SLOT_CAPACITY, bundlesPerSlot: BUNDLE_SLOT_CAPACITY, notesPerBundle: BUNDLE_SIZE });
