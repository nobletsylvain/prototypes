import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { CashLedger } from '../ledger.mjs';

const [appSource, html, texts] = await Promise.all([
  readFile(new URL('../app.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../texts.json', import.meta.url), 'utf8').then(JSON.parse),
]);
const executable = appSource.replace(/^import\s+[^\n]+;\r?$/gm, '');
const clone = value => JSON.parse(JSON.stringify(value));

class EventTargetStub {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  async emit(type, values = {}) {
    const event = { type, target: this, pointerId: 1, repeat: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const listener of this.listeners.get(type) ?? []) await listener(event);
    return event;
  }
}

class ElementStub extends EventTargetStub {
  constructor(tagName = 'div', attributes = '') {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.textContent = '';
    this.innerHTML = '';
    this.hidden = /(?:^|\s)hidden(?:\s|$)/.test(attributes);
    this.disabled = /(?:^|\s)disabled(?:\s|$)/.test(attributes);
    this.checked = /(?:^|\s)checked(?:\s|$)/.test(attributes);
    this.value = attributes.match(/\bvalue="([^"]*)"/)?.[1] ?? '';
    const translationKey = attributes.match(/\bdata-i18n="([^"]*)"/)?.[1];
    if (translationKey) this.dataset.i18n = translationKey;
    const classes = new Set((attributes.match(/\bclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean));
    this.classList = {
      add: value => classes.add(value),
      remove: value => classes.delete(value),
      contains: value => classes.has(value),
      toggle(value, force) {
        const enabled = force ?? !classes.has(value);
        if (enabled) classes.add(value); else classes.delete(value);
        return enabled;
      },
    };
  }
  appendChild(child) { this.children.push(child); return child; }
  setPointerCapture(pointerId) { this.pointerCapture = pointerId; }
}

/** Executes application logic, not browser layout, rendering or real audio. */
async function createHarness(circuit = 'combined') {
  let now = 1000, timerSerial = 0, nextFrame = null;
  const timers = new Map();
  const elements = new Map();
  const translatedElements = [];
  for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const element = new ElementStub(match[1], match[2]);
    const id = match[2].match(/\bid="([^"]+)"/)?.[1];
    if (id) elements.set(id, element);
    if (element.dataset.i18n) translatedElements.push(element);
  }
  const document = new EventTargetStub();
  document.hidden = false;
  document.documentElement = { lang: 'fr' };
  document.activeElement = new ElementStub('body');
  document.getElementById = id => {
    assert.ok(elements.has(id), `Application requested missing element ${id}`);
    return elements.get(id);
  };
  document.createElement = tag => new ElementStub(tag);
  document.querySelectorAll = selector => {
    assert.equal(selector, '[data-i18n]');
    return translatedElements;
  };
  const documentationLink = new ElementStub('a');
  document.querySelector = selector => {
    assert.equal(selector, '.toolbar a');
    return documentationLink;
  };
  elements.get('pace').value = html.match(/<select\b[^>]*id="pace"[^>]*>\s*<option\b[^>]*value="([^"]+)"/)?.[1];
  assert.ok(elements.get('pace').value);
  const window = new EventTargetStub();
  const instances = { scenes: [], audio: [] };

  class SceneStub {
    constructor(canvas, onSelect, options = {}) {
      this.canvas = canvas;
      this.onSelect = onSelect;
      this.look = false;
      this.effects = true;
      this.metrics = { frames: 0 };
      this.events = [];
      this.resets = 0;
      this.display = 0;
      this.sorterDisplay = 0;
      this.circuit = options.circuit;
      instances.scenes.push(this);
    }
    sync(ledger, event) { this.ledger = ledger; if (event) this.events.push(clone(event)); }
    reset() { this.resets++; this.display = 0; this.sorterDisplay = 0; }
    resetCamera() { this.cameraResets = (this.cameraResets ?? 0) + 1; }
    setEffects(value) { this.effects = value; }
    setLabels(value) { this.labels = clone(value); }
    setCircuit(value) { this.circuit = value; }
    getHotspots() {
      return {
        sorter: { x: 220, y: 210, visible: true },
        counter: { x: 620, y: 210, visible: true },
        combined: { x: 420, y: 210, visible: true },
      };
    }
    getInteractionState() { return { dragging: false, hoverTarget: null }; }
    updateDisplay(count, sortedCount = 0) { this.display = count; this.sorterDisplay = sortedCount; }
    step(dt, realDt) { this.metrics.frames++; this.lastStep = { dt, realDt }; }
  }

  class AudioStub {
    constructor() {
      this.metrics = { paper: 0, tick: 0, bundle: 0, contact: 0, refuse: 0, stops: 0 };
      this.contacts = [];
      this.enabled = true;
      instances.audio.push(this);
    }
    async unlock() { return true; }
    paper() { this.metrics.paper++; }
    tick() { this.metrics.tick++; }
    bundle() { this.metrics.bundle++; }
    contact(dense) { this.metrics.contact++; this.contacts.push(dense); }
    refuse() { this.metrics.refuse++; }
    stop() { this.metrics.stops++; }
    setVolume(value) { this.volume = value; }
    setEnabled(value) { this.enabled = value; }
  }

  function schedule(fn, delay, interval = null) {
    const id = ++timerSerial;
    timers.set(id, { fn, at: now + delay, interval });
    return id;
  }
  const context = vm.createContext({
    CashLedger, CashAudio: AudioStub, CashScene: SceneStub,
    document, window, Intl, performance: { now: () => now },
    fetch: async path => { assert.equal(path, 'texts.json?v=20261109-v2a'); return { ok: true, json: async () => texts }; },
    setTimeout: (fn, delay) => schedule(fn, delay),
    clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, delay),
    clearInterval: id => timers.delete(id),
    requestAnimationFrame: fn => { nextFrame = fn; },
  });
  await vm.runInContext(`(async () => {\n${executable}\n})()`, context, { filename: 'app.mjs', timeout: 5000 });
  assert.equal(instances.scenes.length, 1);
  assert.equal(instances.audio.length, 1);

  function advance(milliseconds, frameLength = 1000 / 60) {
    const end = now + milliseconds;
    while (now < end - 0.00001) {
      now = Math.min(end, now + frameLength);
      for (const [id, timer] of [...timers]) {
        if (timer.at > now + 0.00001) continue;
        if (timer.interval === null) timers.delete(id);
        else timer.at += timer.interval;
        timer.fn();
      }
      const callback = nextFrame;
      nextFrame = null;
      assert.equal(typeof callback, 'function', 'Application must maintain its frame loop');
      callback(now);
    }
  }

  function diagnostics() {
    const value = clone(window.cashDiagnostics());
    assert.equal(value.audit.ok, true, JSON.stringify(value.audit.errors));
    assert.deepEqual(value.errors, []);
    return value;
  }

  const harness = {
    elements, document, window, scene: instances.scenes[0], audio: instances.audio[0], advance, diagnostics,
    element(id) { return document.getElementById(id); },
    snapshot() { return diagnostics().snapshot; },
    at(location) { return this.snapshot().entities.filter(entity => entity.location === location); },
    async click(idOrElement) {
      const element = typeof idOrElement === 'string' ? document.getElementById(idOrElement) : idOrElement;
      if (element.disabled) return false;
      await element.emit('click');
      return true;
    },
    async selectSlot(index) { await this.click(elements.get('slots').children[index]); },
    async hold(milliseconds = 2000) {
      const element = elements.get('primary');
      assert.equal(element.disabled, false);
      await element.emit('pointerdown');
      advance(milliseconds);
      await element.emit('pointerup');
      advance(60);
    },
    touch(action) { return this.scene.onSelect(action); },
    async start() { assert.equal(await this.click('start'), true); assert.equal(elements.get('welcome').hidden, true); },
    finishMachine() {
      let iterations = 0;
      while (this.at('input').length) {
        assert.ok(iterations++ < 200, 'Machine must finish its finite input');
        advance(100);
      }
      advance(1000);
    },
    finishSorter() {
      let iterations = 0;
      while (this.at('sortInput').length) {
        assert.ok(iterations++ < 200, 'Sorter must finish its finite input');
        advance(100);
      }
    },
  };
  assert.equal(harness.snapshot().circuit, 'separate', 'The player starts with two distinct machines');
  if (circuit === 'combined') {
    await harness.click('combined');
    await harness.click('assist');
  }
  assert.equal(harness.snapshot().circuit, circuit);
  harness.initialResets = harness.scene.resets;
  return harness;
}

async function firstBundle(harness) {
  await harness.start();
  await harness.click('primary');
  assert.equal(harness.at('table').length, 120);
  await harness.hold();
  assert.equal(harness.at('hand').length, 100);
  await harness.click('primary');
  assert.equal(harness.at('input').length, 100);
  harness.finishMachine();
  assert.equal(harness.at('output').length, 1);
  assert.equal(harness.at('output')[0].type, 'bundle');
}

async function completeSmall(harness) {
  await firstBundle(harness);
  await harness.click('primary');
  assert.equal(harness.at('hand')[0].type, 'bundle');
  await harness.click('primary');
  assert.equal(harness.at('slot0').length, 1);
  await harness.hold();
  assert.equal(harness.at('hand').length, 20);
  await harness.click('primary');
  harness.finishMachine();
  assert.equal(harness.at('output').length, 20);
  await harness.click('primary');
  assert.equal(harness.element('primary').textContent, texts.fr.storeAction, 'The incomplete sorted pile must be offered storage, not another count');
  await harness.selectSlot(1);
  await harness.click('primary');
}

test('real app handlers complete the small lot as one bundle plus twenty loose notes in separate slots', async () => {
  const harness = await createHarness();
  await completeSmall(harness);
  const snapshot = harness.snapshot();
  assert.equal(snapshot.totalValue, 2200);
  assert.equal(snapshot.handObjects, 0);
  assert.equal(harness.at('slot0').length, 1);
  assert.equal(harness.at('slot1').length, 20);
  assert.deepEqual(snapshot.slots.map(slot => slot.form), ['bundle', 'note', null, null, null]);
  assert.equal(harness.element('instruction-title').textContent, texts.fr.doneTitle);
  assert.equal(harness.element('machine-count').textContent, '120');
  assert.equal(harness.scene.display, 120);
  assert.equal(harness.audio.metrics.tick, 120);
  assert.equal(harness.audio.metrics.bundle, 1);
  assert.ok(harness.audio.metrics.paper > 0);
  assert.equal(snapshot.entities.flatMap(entity => entity.noteIds).length, 120);
});

test('opening through actual controls preserves identities and slot memory until explicitly cleared', async () => {
  const harness = await createHarness();
  await completeSmall(harness);
  const ids = harness.at('slot0')[0].noteIds.sort();
  await harness.selectSlot(0);
  await harness.click('withdraw');
  assert.equal(harness.snapshot().slots[0].form, 'bundle');
  await harness.click('open');
  assert.equal(harness.at('hand').length, 100);
  assert.deepEqual(harness.at('hand').flatMap(entity => entity.noteIds).sort(), ids);
  const before = harness.snapshot();
  await harness.click('store');
  assert.deepEqual(harness.snapshot(), before, 'Incompatible storage refuses without mutation');
  assert.equal(harness.element('toast').textContent, texts.fr.incompatible);
  assert.equal(harness.audio.metrics.refuse, 1);
  await harness.click('clear');
  assert.equal(harness.snapshot().slots[0].form, null);
  await harness.click('store');
  assert.equal(harness.snapshot().slots[0].form, 'note');
  assert.equal(harness.at('slot0').length, 100);
  assert.equal(harness.element('clear').disabled, true);
  assert.equal(harness.snapshot().totalValue, 2200);
});

test('opening a bundle alongside loose notes refuses without changing the real application state', async () => {
  const harness = await createHarness();
  await completeSmall(harness);
  await harness.selectSlot(0);
  await harness.click('withdraw');
  await harness.selectSlot(1);
  await harness.click('withdraw');
  assert.equal(harness.at('hand').length, 21);
  const before = harness.snapshot();
  await harness.click('open');
  assert.deepEqual(harness.snapshot(), before);
  assert.equal(harness.element('toast').textContent, texts.fr.needSpace);
});

test('look mode keeps all object controls disabled while actual machine frames continue updating', async () => {
  const harness = await createHarness();
  await harness.start();
  await harness.click('primary');
  await harness.hold();
  await harness.click('primary');
  harness.touch({ action: 'note', id: harness.at('table')[0].id, sweep: false });
  assert.equal(harness.at('hand').length, 1);
  await harness.click('look');
  assert.equal(harness.scene.look, true);
  const before = harness.snapshot();
  for (const id of ['primary', 'drop', 'open', 'store', 'withdraw', 'clear']) {
    assert.equal(harness.element(id).disabled, true, `${id} is disabled in look mode`);
    assert.equal(await harness.click(id), false);
  }
  assert.deepEqual(harness.snapshot(), before);
  harness.advance(500);
  assert.ok(harness.at('output').length > 0);
  assert.equal(harness.at('hand').length, 1);
  for (const id of ['primary', 'drop', 'open', 'store', 'withdraw', 'clear']) assert.equal(harness.element(id).disabled, true, `${id} remains disabled after frame update`);
  const afterTick = harness.snapshot();
  harness.touch({ action: 'note', id: harness.at('table')[0].id });
  await harness.window.emit('keydown', { code: 'KeyT' });
  assert.deepEqual(harness.snapshot(), afterTick);
  await harness.click('look');
  assert.equal(harness.element('drop').disabled, false);
  await harness.click('drop');
  assert.equal(harness.at('hand').length, 0);
});

test('reset during counting replaces the ledger and future real frames cannot revive the old input', async () => {
  const harness = await createHarness();
  await harness.start();
  await harness.click('primary');
  await harness.hold();
  await harness.click('primary');
  harness.advance(500);
  assert.ok(harness.at('input').length > 0 && harness.at('input').length < 100);
  const oldLedger = harness.scene.ledger;
  const oldSnapshot = oldLedger.snapshot();
  await harness.click('large');
  assert.equal(harness.diagnostics().scenario, 'large');
  assert.equal(harness.at('pouch').length, 1200);
  assert.equal(harness.scene.resets, harness.initialResets + 1);
  const afterReset = harness.snapshot();
  const ticks = harness.audio.metrics.tick;
  harness.advance(10000);
  assert.deepEqual(harness.snapshot(), afterReset);
  assert.deepEqual(oldLedger.snapshot(), oldSnapshot);
  assert.equal(harness.audio.metrics.tick, ticks);
  assert.equal(harness.element('machine-count').textContent, '000');
  assert.equal(harness.scene.display, 0);
  assert.ok(harness.audio.metrics.stops > 0);
});

test('reset during held gathering cancels the timer and preserves every note in the new pouch', async () => {
  const harness = await createHarness();
  await harness.start();
  await harness.click('primary');
  await harness.element('primary').emit('pointerdown');
  harness.advance(250);
  assert.ok(harness.at('hand').length > 0);
  await harness.click('reset');
  const afterReset = harness.snapshot();
  harness.advance(3000);
  assert.deepEqual(harness.snapshot(), afterReset);
  assert.equal(harness.at('pouch').length, 120);
});

test('scene-selection callbacks can take, place and retake a bundle with dense contact audio requests', async () => {
  const harness = await createHarness();
  await firstBundle(harness);
  const id = harness.at('output')[0].id;
  harness.touch({ action: 'output', id });
  assert.equal(harness.at('hand')[0].id, id);
  await harness.click('drop');
  assert.equal(harness.at('table').find(entity => entity.id === id)?.type, 'bundle');
  assert.equal(harness.audio.contacts.at(-1), true);
  harness.touch({ action: 'output', id });
  assert.equal(harness.at('hand')[0].id, id);
  harness.touch({ action: 'slot', index: 2 });
  assert.equal(harness.at('slot2')[0].id, id);
  assert.equal(harness.audio.contacts.at(-1), true);
  harness.touch({ action: 'output', id });
  assert.equal(harness.at('hand')[0].id, id);
});

test('the advertised T shortcut works after a desktop button click has focused the primary button', async () => {
  const harness = await createHarness();
  await firstBundle(harness);
  await harness.click('primary');
  const id = harness.at('hand')[0].id;
  harness.document.activeElement = harness.element('primary');
  await harness.window.emit('keydown', { code: 'KeyT' });
  assert.equal(harness.at('hand').length, 0, 'Button focus must not disable the advertised put-down shortcut');
  assert.equal(harness.at('table').find(entity => entity.id === id)?.type, 'bundle');
});

test('actual frame loop pauses monetary transfers while hidden and resumes without a catch-up burst', async () => {
  const harness = await createHarness();
  await harness.start();
  await harness.click('primary');
  await harness.hold();
  await harness.click('primary');
  harness.advance(500);
  harness.document.hidden = true;
  await harness.document.emit('visibilitychange');
  const before = harness.snapshot();
  const ticks = harness.audio.metrics.tick;
  harness.advance(10000);
  assert.deepEqual(harness.snapshot(), before);
  assert.equal(harness.audio.metrics.tick, ticks);
  harness.document.hidden = false;
  await harness.document.emit('visibilitychange');
  harness.advance(100);
  assert.ok(harness.audio.metrics.tick > ticks);
  assert.ok(harness.audio.metrics.tick <= ticks + 2, 'The 18-note cadence resumes without replaying hidden time');
});

test('comparison controls and language preserve the exact monetary state', async () => {
  const harness = await createHarness();
  await harness.start();
  await harness.click('primary');
  const before = harness.snapshot();
  await harness.click('settings');
  harness.element('effects').checked = false;
  await harness.element('effects').emit('change');
  assert.equal(harness.scene.effects, false);
  harness.element('pace').value = '26';
  await harness.element('pace').emit('change');
  harness.element('volume').value = '0.2';
  await harness.element('volume').emit('input');
  assert.equal(harness.audio.volume, 0.2);
  await harness.click('mute');
  assert.equal(harness.audio.enabled, false);
  await harness.click('language');
  assert.equal(harness.document.documentElement.lang, 'en');
  assert.equal(harness.element('primary').textContent, texts.en.pickAction);
  await harness.window.emit('keydown', { code: 'F7' });
  assert.equal(harness.scene.effects, true);
  assert.deepEqual(harness.snapshot(), before);
});

test('large lot uses twelve repeated real control cycles and fills ten bundles plus two with no loss', async () => {
  const harness = await createHarness();
  await harness.start();
  await harness.click('large');
  await harness.click('primary');
  for (let batch = 0; batch < 12; batch++) {
    assert.equal(harness.element('primary').textContent, texts.fr.pickAction);
    await harness.hold();
    assert.equal(harness.at('hand').length, 100);
    await harness.click('primary');
    harness.finishMachine();
    assert.equal(harness.at('output').length, 1);
    assert.equal(harness.at('output')[0].type, 'bundle');
    await harness.click('primary');
    await harness.selectSlot(batch < 10 ? 0 : 1);
    await harness.click('primary');
    assert.equal(harness.at('hand').length, 0);
  }
  const snapshot = harness.snapshot();
  assert.equal(snapshot.totalValue, 22000);
  assert.equal(harness.at('slot0').length, 10);
  assert.equal(harness.at('slot1').length, 2);
  assert.equal(snapshot.entities.length, 12);
  assert.equal(new Set(snapshot.entities.flatMap(entity => entity.noteIds)).size, 1200);
  assert.equal(harness.element('machine-count').textContent, '1200');
  assert.equal(harness.scene.display, 1200);
  assert.equal(harness.audio.metrics.tick, 1200);
  assert.equal(harness.audio.metrics.bundle, 12);
  assert.equal(harness.element('instruction-title').textContent, texts.fr.doneTitle);
});

function assertOriginalMoney(harness, expectedValue = 2200) {
  const snapshot = harness.snapshot();
  assert.equal(snapshot.totalValue, expectedValue);
  assert.deepEqual(snapshot.entities.flatMap(entity => entity.noteIds).sort(), snapshot.notes.map(note => note.id).sort());
  assert.equal(new Set(snapshot.entities.flatMap(entity => entity.noteIds)).size, snapshot.notes.length);
}

function directMixedHandful(harness, twenties = 20, tens = 4) {
  const table = harness.at('table');
  const values = new Map(harness.snapshot().notes.map(note => [note.id, note.denomination]));
  return [
    ...table.filter(entity => values.get(entity.id) === 20).slice(0, twenties),
    ...table.filter(entity => values.get(entity.id) === 10).slice(0, tens),
  ].map(entity => entity.id);
}

test('direct handful gestures complete the separate sorter and counter circuit without the gather button', async () => {
  const harness = await createHarness('separate');
  await harness.start();
  assert.equal(harness.touch({ action: 'pouch' }), true);
  assert.equal(harness.element('assist-panel').hidden, true);
  for (let trip = 0; trip < 5; trip++) {
    const ids = directMixedHandful(harness);
    assert.equal(ids.length, 24);
    assert.equal(harness.touch({ action: 'handful', ids }), true);
    assert.deepEqual(harness.at('hand').map(entity => entity.id).sort(), [...ids].sort());
    assert.equal(harness.touch({ action: 'sorter' }), true);
    assert.equal(harness.at('hand').length, 0);
    assert.equal(harness.at('sortInput').length, 24);
    harness.finishSorter();
    assert.equal(harness.at('sorted20').length, 20);
    assert.equal(harness.at('sorted10').length, 4);
    for (const denomination of [20, 10]) {
      assert.equal(harness.touch({ action: 'sorted', denomination }), true);
      const members = harness.at('hand').map(entity => entity.id).sort();
      assert.equal(harness.touch({ action: 'counter' }), true);
      assert.deepEqual(harness.at('input').map(entity => entity.id).sort(), members);
      harness.finishMachine();
      assertOriginalMoney(harness);
    }
  }
  assert.equal(harness.at('table').length, 0);
  assert.equal(harness.at('output').filter(entity => entity.type === 'bundle').length, 1);
  assert.equal(harness.at('output').filter(entity => entity.type === 'note').length, 20);
  assert.equal(harness.touch({ action: 'output' }), true);
  assert.equal(harness.touch({ action: 'slot', index: 0 }), true);
  assert.equal(harness.touch({ action: 'output' }), true);
  assert.equal(harness.touch({ action: 'slot', index: 1 }), true);
  assert.equal(harness.at('slot0').length, 1);
  assert.equal(harness.at('slot1').length, 20);
  assert.equal(harness.at('hand').length, 0);
  assert.equal(harness.diagnostics().sortedCount, 120);
  assert.equal(harness.diagnostics().counted, 120);
  assert.equal(harness.audio.metrics.tick, 240, 'Both machines sound only on their own real note transfers');
  assert.equal(harness.audio.metrics.bundle, 1);
  assert.equal(harness.scene.sorterDisplay, 120);
  assert.equal(harness.scene.display, 120);
  assertOriginalMoney(harness);
});

test('dropping a mixed handful into the separate counter refuses without routing it to another machine', async () => {
  const harness = await createHarness('separate');
  await harness.start();
  harness.touch({ action: 'pouch' });
  harness.touch({ action: 'handful', ids: directMixedHandful(harness) });
  const before = harness.snapshot();
  const transfers = harness.diagnostics().events;
  const paperSounds = harness.audio.metrics.paper;
  assert.equal(harness.touch({ action: 'counter' }), false);
  assert.deepEqual(harness.snapshot(), before);
  assert.deepEqual(harness.diagnostics().events, transfers);
  assert.equal(harness.at('sortInput').length, 0);
  assert.equal(harness.at('input').length, 0);
  assert.equal(harness.at('hand').length, 24);
  assert.equal(harness.audio.metrics.paper, paperSounds);
  assert.equal(harness.audio.metrics.refuse, 1);
  assert.equal(harness.element('toast').textContent, texts.fr.mixedCounter);
  assert.equal(harness.touch({ action: 'sorter' }), true, 'The player can move the same rejected handful to the sorter');
  assertOriginalMoney(harness);
});

test('a direct table drop keeps every held identity and passes only a visual position to the scene', async () => {
  const harness = await createHarness('separate');
  await harness.start();
  harness.touch({ action: 'pouch' });
  harness.touch({ action: 'handful', ids: directMixedHandful(harness) });
  const held = harness.at('hand').map(entity => entity.id).sort();
  const notesBefore = harness.snapshot().notes;
  const position = { x: -.23, y: .75, z: .2 };
  assert.equal(harness.touch({ action: 'drop', position }), true);
  assert.equal(harness.at('hand').length, 0);
  assert.equal(harness.at('table').length, 120);
  assert.deepEqual(harness.at('table').filter(entity => held.includes(entity.id)).map(entity => entity.id).sort(), held);
  assert.deepEqual(harness.scene.events.at(-1).position, position);
  assert.deepEqual(harness.scene.events.at(-1).ids.sort(), held);
  assert.deepEqual(harness.snapshot().notes, notesBefore);
  assertOriginalMoney(harness);
  assert.equal(harness.touch({ action: 'handful', ids: held }), true, 'The deposited handful is still available for another gesture');
  assert.deepEqual(harness.at('hand').map(entity => entity.id).sort(), held);
});

test('hovering each inlet changes guidance but never transfers notes or schedules success audio', async () => {
  const harness = await createHarness('separate');
  await harness.start();
  harness.touch({ action: 'pouch' });
  harness.touch({ action: 'handful', ids: directMixedHandful(harness) });
  const before = harness.snapshot();
  const events = harness.diagnostics().events;
  const audioBefore = clone(harness.audio.metrics);
  for (const target of ['sorter', 'counter', 'combined', null]) {
    assert.equal(harness.touch({ action: 'hover-target', target }), true);
    assert.deepEqual(harness.snapshot(), before);
    assert.deepEqual(harness.diagnostics().events, events);
    assert.deepEqual(harness.audio.metrics, audioBefore);
  }
  assert.equal(harness.element('gesture-hint').textContent, texts.fr.gestureCarry);
  assertOriginalMoney(harness);
});

test('switching circuit during live sorting explicitly resets the scenario and cannot revive the old notes', async () => {
  const harness = await createHarness('separate');
  await harness.start();
  harness.touch({ action: 'pouch' });
  harness.touch({ action: 'handful', ids: directMixedHandful(harness) });
  harness.touch({ action: 'sorter' });
  harness.advance(300);
  assert.ok(harness.at('sortInput').length > 0);
  assert.ok(harness.diagnostics().sortedCount > 0);
  const oldLedger = harness.scene.ledger;
  const oldSnapshot = clone(oldLedger.snapshot());
  await harness.click('combined');
  assert.equal(harness.diagnostics().circuit, 'combined');
  assert.equal(harness.scene.circuit, 'combined');
  assert.equal(harness.at('pouch').length, 120);
  assert.equal(harness.at('sortInput').length + harness.at('sorted10').length + harness.at('sorted20').length, 0);
  assert.equal(harness.diagnostics().sortedCount, 0);
  assert.equal(harness.diagnostics().counted, 0);
  assert.equal(harness.element('toast').textContent, texts.fr.circuitReset);
  const resetSnapshot = harness.snapshot();
  const ticks = harness.audio.metrics.tick;
  harness.advance(8000);
  assert.deepEqual(harness.snapshot(), resetSnapshot);
  assert.deepEqual(clone(oldLedger.snapshot()), oldSnapshot);
  assert.equal(harness.audio.metrics.tick, ticks);
  assertOriginalMoney(harness);
});

test('the two comparison configurations accept the same identities after explicit fresh starts', async () => {
  const harness = await createHarness('separate');
  await harness.start();
  harness.touch({ action: 'pouch' });
  const ids = directMixedHandful(harness);
  harness.touch({ action: 'handful', ids });
  assert.equal(harness.touch({ action: 'sorter' }), true);
  harness.finishSorter();
  assert.equal(harness.at('sorted10').length + harness.at('sorted20').length, ids.length);
  await harness.click('combined');
  harness.touch({ action: 'pouch' });
  harness.touch({ action: 'handful', ids });
  assert.equal(harness.touch({ action: 'combined' }), true);
  assert.deepEqual(harness.at('input').map(entity => entity.id).sort(), [...ids].sort());
  harness.finishMachine();
  assert.equal(harness.at('output').length, ids.length);
  assert.equal(harness.diagnostics().sortedCount, 0);
  assert.equal(harness.diagnostics().counted, ids.length);
  await harness.click('separate');
  assert.equal(harness.diagnostics().circuit, 'separate');
  assert.equal(harness.scene.circuit, 'separate');
  assert.equal(harness.at('pouch').length, 120);
  assertOriginalMoney(harness);
});

test('circuit and lot resets close the previous panels while leaving only the initial dump help open', async () => {
  const harness = await createHarness('separate');
  await harness.start();
  const assertHelpVisible = visible => {
    assert.equal(harness.element('assist-panel').hidden, !visible);
    assert.equal(harness.element('assist').ariaExpanded, String(visible));
    assert.equal(harness.element('assist').classList.contains('active'), visible);
  };
  assertHelpVisible(true);
  const unopenedPouch = harness.snapshot();
  for (const control of ['storage-toggle', 'settings']) {
    await harness.click(control);
    assertHelpVisible(false);
    assert.deepEqual(harness.snapshot(), unopenedPouch, 'Opening another panel must not manipulate the unopened lot');
    await harness.click(control);
    assertHelpVisible(true);
    assert.deepEqual(harness.snapshot(), unopenedPouch);
  }
  harness.touch({ action: 'pouch' });
  for (const [denomination, count, slot] of [[20, 100, 0], [10, 20, 1]]) {
    const ids = harness.at('table').slice(0, count).map(entity => entity.id);
    assert.equal(harness.touch({ action: 'handful', ids }), true);
    assert.equal(harness.touch({ action: 'sorter' }), true);
    harness.finishSorter();
    assert.equal(harness.touch({ action: 'sorted', denomination }), true);
    assert.equal(harness.touch({ action: 'counter' }), true);
    harness.finishMachine();
    assert.equal(harness.touch({ action: 'output' }), true);
    assert.equal(harness.touch({ action: 'slot', index: slot }), true);
  }
  assert.equal(harness.at('slot0').length, 1);
  assert.equal(harness.at('slot1').length, 20);
  await harness.click('storage-toggle');
  assert.equal(harness.element('storage-panel').hidden, false);
  await harness.click('combined');
  assert.equal(harness.element('storage-panel').hidden, true);
  assert.equal(harness.element('storage-toggle').ariaExpanded, 'false');
  assertHelpVisible(true);
  assert.equal(harness.element('assist-panel').hidden, false, 'The initial pouch action stays visible');
  assert.equal(harness.element('comparison').hidden, true);
  assert.equal(harness.at('pouch').length, 120);
  assert.equal(harness.at('slot0').length + harness.at('slot1').length, 0);
  assertOriginalMoney(harness);
  harness.touch({ action: 'pouch' });
  assert.equal(harness.element('assist-panel').hidden, true, 'Forced initial help closes once the pouch is emptied');

  for (const [panelControl, resetControl, count, value] of [
    ['assist', 'reset', 120, 2200],
    ['storage-toggle', 'large', 1200, 22000],
    ['settings', 'small', 120, 2200],
  ]) {
    await harness.click(panelControl);
    await harness.click(resetControl);
    assert.equal(harness.element('storage-panel').hidden, true);
    assert.equal(harness.element('storage-toggle').classList.contains('active'), false);
    assertHelpVisible(true);
    assert.equal(harness.element('comparison').hidden, true);
    assert.equal(harness.element('assist-panel').hidden, false);
    assert.equal(harness.at('pouch').length, count);
    assertOriginalMoney(harness, value);
    harness.touch({ action: 'pouch' });
    assert.equal(harness.element('assist-panel').hidden, true);
  }
});
