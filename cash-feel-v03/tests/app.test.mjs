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
async function createHarness() {
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
  elements.get('withdrawal-quantity').value = '10';
  elements.get('bundle-size').value = '100';
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
    setMachineState(value) { this.machineState = clone(value); }
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
    fetch: async path => { assert.equal(path, 'texts.json?v=20261109-v3a'); return { ok: true, json: async () => texts }; },
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
  assert.equal(harness.snapshot().circuit, 'integrated');
  harness.initialResets = harness.scene.resets;
  return harness;
}
async function feedTable(h) {
  const ids = h.at('table').filter(e => e.type === 'note').slice(0,100).map(e => e.id);
  assert.ok(ids.length);
  assert.equal(h.touch({action:'handful',ids}),true);
  assert.equal(h.touch({action:'combined'}),true);
}
async function deliverAndCount(h) {
  await h.click('next-delivery');
  await feedTable(h);
  h.finishMachine();
}
function moneyIntact(h,value=2200) {
  const snap=h.snapshot();
  assert.equal(snap.totalValue,value);
  const ids=snap.entities.flatMap(e=>e.noteIds);
  assert.equal(new Set(ids).size,snap.notes.length);
  assert.deepEqual(ids.slice().sort(),snap.notes.map(n=>n.id).sort());
}

test('first delivery is counted into internal reserves and survives an idle interval',async()=>{
  const h=await createHarness(); await h.start();
  assert.equal(h.snapshot().bundleSize,100);
  await deliverAndCount(h);
  assert.equal(h.at('pouch').length,60);
  assert.equal(h.at('reserve20').length,50);
  assert.equal(h.at('reserve10').length,10);
  assert.equal(h.at('output').length,0);
  const before=h.snapshot(); h.advance(8000);
  assert.deepEqual(h.snapshot(),before);
  assert.equal(h.diagnostics().counted,60);
  moneyIntact(h);
});

test('specific cash withdrawal leaves reserves and later deliveries continue the same counters',async()=>{
  const h=await createHarness(); await h.start(); await deliverAndCount(h);
  const original=h.at('reserve20').map(e=>e.id);
  await h.click('take20');
  assert.equal(h.at('hand').length,10);
  assert.ok(h.at('hand').every(e=>original.includes(e.id)));
  assert.equal(h.at('reserve20').length,40);
  assert.equal(h.at('reserve10').length,10);
  await h.click('store');
  await deliverAndCount(h);
  assert.equal(h.at('reserve20').length,90);
  assert.equal(h.at('reserve10').length,20);
  assert.equal(h.at('output').length,0);
  await h.click('withdraw');
  assert.equal(h.touch({action:'combined'}),true);
  h.finishMachine();
  assert.equal(h.at('output').length,1);
  assert.equal(h.at('output')[0].noteIds.length,100);
  assert.equal(h.at('reserve10').length,20);
  assert.equal(h.diagnostics().counted,130);
  moneyIntact(h);
});

test('a completed batch remains internal for compression and only ejects after its deadline',async()=>{
  const h=await createHarness(); await h.start(); await deliverAndCount(h);
  await h.click('next-delivery'); await feedTable(h);
  while(!h.at('binding20').length) h.advance(10,10);
  assert.equal(h.at('binding20').length,1);
  assert.equal(h.at('output').length,0);
  const bundle=h.at('binding20')[0], before=h.snapshot();
  assert.equal(h.touch({action:'output',id:bundle.id}),false);
  assert.deepEqual(h.snapshot(),before);
  h.advance(850,10);
  assert.equal(h.at('output').length,0);
  h.advance(60,10);
  assert.equal(h.at('binding20').length,0);
  assert.equal(h.at('output')[0].id,bundle.id);
  assert.deepEqual(h.at('output')[0].noteIds,bundle.noteIds);
  const sounds=h.audio.metrics.contact;
  h.advance(550,10); assert.equal(h.audio.metrics.contact,sounds);
  h.advance(70,10); assert.equal(h.audio.metrics.contact,sounds+1);
  moneyIntact(h);
});

test('formation can pause while sorting continues and all cash stays available inside',async()=>{
  const h=await createHarness(); await h.start();
  h.element('auto-bundle').checked=false; await h.element('auto-bundle').emit('change');
  await deliverAndCount(h); await deliverAndCount(h);
  assert.equal(h.at('reserve20').length,100); assert.equal(h.at('reserve10').length,20);
  assert.equal(h.at('output').length,0); assert.equal(h.at('binding20').length,0);
  const before=h.snapshot(); h.advance(5000); assert.deepEqual(h.snapshot(),before);
  h.element('withdrawal-quantity').value='1'; await h.element('withdrawal-quantity').emit('change'); await h.click('take10');
  assert.equal(h.at('hand').length,1); assert.equal(h.at('reserve10').length,19);
  h.element('auto-bundle').checked=true; await h.element('auto-bundle').emit('change'); h.advance(20);
  assert.equal(h.at('binding20').length,1);
  assert.equal(h.at('hand').length,1);
  h.advance(1600); assert.equal(h.at('output')[0].noteIds.length,100);
  moneyIntact(h);
});

test('changing the target preserves the size and identities of a batch already forming',async()=>{
  const h=await createHarness(); await h.start();
  h.element('auto-bundle').checked=false; await h.element('auto-bundle').emit('change');
  await deliverAndCount(h); await deliverAndCount(h);
  h.element('bundle-size').value='50'; await h.element('bundle-size').emit('change');
  h.element('auto-bundle').checked=true; await h.element('auto-bundle').emit('change'); h.advance(20);
  const bundle=h.at('binding20')[0]; assert.equal(bundle.bundleSize,50);
  h.element('bundle-size').value='25'; await h.element('bundle-size').emit('change');
  assert.deepEqual(h.at('binding20')[0],bundle);
  h.advance(3000);
  assert.deepEqual(h.at('output').filter(e=>e.noteIds[0].startsWith('note')).map(e=>e.noteIds.length).sort((a,b)=>a-b),[25,25,50]);
  assert.equal(h.at('reserve10').length,20); moneyIntact(h);
});

test('reset during formation clears deadlines without reviving old bundles',async()=>{
  const h=await createHarness(); await h.start(); await deliverAndCount(h);
  await h.click('next-delivery'); await feedTable(h);
  while(h.at('input').length) h.advance(10,10);
  assert.equal(h.at('binding20').length,1);
  await h.click('reset'); h.advance(6000);
  assert.equal(h.at('pouch').length,120); assert.equal(h.at('output').length,0);
  assert.equal(h.at('binding20').length,0); assert.equal(h.diagnostics().counted,0);
  assert.equal(h.snapshot().bundleSize,100); moneyIntact(h);
});

test('hidden pages pause processing and forming time without a catch-up burst',async()=>{
  const h=await createHarness(); await h.start(); await h.click('next-delivery'); await feedTable(h);
  h.advance(300); const before=h.snapshot();
  h.document.hidden=true; await h.document.emit('visibilitychange'); h.advance(5000);
  assert.deepEqual(h.snapshot(),before);
  h.document.hidden=false; await h.document.emit('visibilitychange'); h.advance(17);
  assert.ok(h.at('input').length >= before.entities.filter(e=>e.location==='input').length-1);
  h.finishMachine(); assert.equal(h.at('reserve20').length,50); moneyIntact(h);
});

test('look mode prevents direct withdrawals and feeds while the machine keeps working',async()=>{
  const h=await createHarness(); await h.start(); await h.click('next-delivery'); await feedTable(h);
  await h.click('look'); assert.equal(h.scene.look,true);
  assert.equal(h.touch({action:'reserve',denomination:20}),false);
  assert.equal(h.touch({action:'combined'}),false);
  h.finishMachine();
  assert.equal(h.at('reserve20').length,50); assert.equal(h.at('hand').length,0);
  assert.equal(h.element('take20').disabled,true);
  await h.click('look'); await h.click('take20'); assert.equal(h.at('hand').length,10);
});

test('an ejected bundle can be moved, placed, retaken, opened and stored with the original identities',async()=>{
  const h=await createHarness(); await h.start(); await deliverAndCount(h); await deliverAndCount(h);
  const bundle=h.at('output')[0], ids=[...bundle.noteIds];
  assert.equal(h.touch({action:'output',id:bundle.id}),true); assert.equal(h.at('hand').length,1);
  assert.equal(h.touch({action:'drop',position:{x:.2,z:.3}}),true);
  assert.deepEqual(h.scene.events.at(-1).position,{x:.2,z:.3});
  assert.equal(h.touch({action:'output',id:bundle.id}),true);
  await h.click('open'); assert.equal(h.at('hand').length,100);
  assert.deepEqual(h.at('hand').map(e=>e.id).sort(),ids.sort());
  await h.click('store'); assert.equal(h.at('slot0').length,100);
  assert.equal(h.snapshot().slots[0].form,'note'); moneyIntact(h);
});

test('failed bundle intake and full-hand withdrawal preserve the monetary state',async()=>{
  const h=await createHarness(); await h.start(); await deliverAndCount(h); await deliverAndCount(h);
  h.touch({action:'output',id:h.at('output')[0].id}); const before=h.snapshot();
  assert.equal(h.touch({action:'combined'}),false); assert.deepEqual(h.snapshot(),before);
  await h.click('open'); const full=h.snapshot();
  assert.equal(h.element('take10').disabled,true);
  assert.equal(h.touch({action:'reserve',denomination:10}),false); assert.deepEqual(h.snapshot(),full);
});

test('language and feel controls do not mutate retained cash or switch machine architecture',async()=>{
  const h=await createHarness(); await h.start(); await deliverAndCount(h); const before=h.snapshot();
  await h.click('language'); h.element('effects').checked=false; await h.element('effects').emit('change');
  h.element('volume').value='.2'; await h.element('volume').emit('input'); await h.click('mute'); h.advance(1000);
  assert.deepEqual(h.snapshot(),before); assert.equal(h.document.documentElement.lang,'en');
  assert.equal(h.scene.effects,false); assert.equal(h.snapshot().circuit,'integrated');
  for(const e of h.elements.values()) if(e.dataset.i18n) assert.ok(texts.en[e.dataset.i18n]);
});

test('panels stay exclusive before delivery and reset while retaining the initial help',async()=>{
  const h=await createHarness(); await h.start(); assert.equal(h.element('assist-panel').hidden,false);
  await h.click('storage-toggle'); assert.equal(h.element('assist-panel').hidden,true);
  await h.click('settings'); assert.equal(h.element('storage-panel').hidden,true); assert.equal(h.element('assist-panel').hidden,true);
  await h.click('settings'); assert.equal(h.element('assist-panel').hidden,false);
  await h.click('storage-toggle'); await h.click('large'); h.advance(1000);
  assert.equal(h.element('storage-panel').hidden,true); assert.equal(h.element('assist-panel').hidden,false);
  assert.equal(h.at('pouch').length,1200); moneyIntact(h,22000);
});

test('withdrawn cash table drops preserve all identities and the T shortcut still operates',async()=>{
  const h=await createHarness(); await h.start(); await deliverAndCount(h); await h.click('take10');
  const ids=h.at('hand').map(e=>e.id);
  h.document.activeElement=h.element('take10'); await h.window.emit('keydown',{code:'KeyT'});
  assert.equal(h.at('hand').length,0); assert.deepEqual(h.at('table').map(e=>e.id).sort(),ids.sort()); moneyIntact(h);
});

