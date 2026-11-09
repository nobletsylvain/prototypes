// Controller integration checks with a small DOM and mocked scene/audio ports.
// These checks execute the real app controller and state model, not a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as model from './model.mjs';
import { texts } from './texts.mjs';
import { exportFilmSelection } from './film-interface.mjs';

class ClassList {
  constructor() { this.items = new Set(); }
  add(...names) { names.forEach(name => this.items.add(name)); }
  remove(...names) { names.forEach(name => this.items.delete(name)); }
  contains(name) { return this.items.has(name); }
  toggle(name, force) { const value = force ?? !this.items.has(name); value ? this.items.add(name) : this.items.delete(name); return value; }
}
class EventTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) { const list = this.listeners.get(type) ?? []; list.push(handler); this.listeners.set(type, list); }
  emit(type, init = {}) {
    const event = { type, target: this, currentTarget: this, preventDefault() {}, ...init };
    this[`on${type}`]?.(event);
    for (const handler of this.listeners.get(type) ?? []) handler(event);
    return event;
  }
}
class Element extends EventTarget {
  constructor(document, tag) { super(); this.ownerDocument = document; this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.style = {}; this.classList = new ClassList(); this.hidden = false; this.open = false; this.checked = false; this._value = ''; this._text = ''; this.parentElement = null; this.id = ''; }
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  detachChildren() { for (const child of this.children) { child.detachChildren(); this.ownerDocument.elements.delete(child); if (child.id) this.ownerDocument.ids.delete(child.id); } this.children = []; }
  replaceChildren(...children) { this.detachChildren(); children.forEach(child => this.appendChild(child)); }
  get textContent() { return this._text; }
  set textContent(value) { this._text = String(value); }
  set innerHTML(html) { this.detachChildren(); this.ownerDocument.parse(html, this); }
  get options() { return this.children.filter(child => child.tagName === 'OPTION'); }
  get value() { if (this.tagName === 'SELECT') return this.options.some(option => option.value === this._value) ? this._value : (this.options[0]?.value ?? ''); return this._value; }
  set value(value) { this._value = String(value); }
  setPointerCapture(id) { this.capture = id; }
  showModal() { this.open = true; }
  close() { this.open = false; this.ownerDocument.activeElement = this.ownerDocument.body; this.emit('close'); }
  click() { this.ownerDocument.activeElement = this; this.emit('click'); }
}
class Document extends EventTarget {
  constructor() { super(); this.elements = new Set(); this.ids = new Map(); this.hidden = false; this.documentElement = { lang: 'fr' }; this.body = this.createElement('body'); this.activeElement = this.body; }
  createElement(tag) { const element = new Element(this, tag); this.elements.add(element); return element; }
  getElementById(id) { return this.ids.get(id) ?? null; }
  querySelectorAll(selector) {
    const selectors = selector.split(',').map(value => value.trim());
    return [...this.elements].filter(element => selectors.some(query => {
      if (query.startsWith('.')) return element.classList.contains(query.slice(1));
      const data = /^\[data-([\w-]+)\]$/.exec(query);
      if (data) return data[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase()) in element.dataset;
      return element.tagName === query.toUpperCase();
    }));
  }
  parse(html, parent = this.body) {
    const stack = [parent];
    const voidTags = new Set(['INPUT', 'META', 'LINK', 'BR', 'HR', 'IMG']);
    const tokens = html.matchAll(/<\/?([a-z][\w-]*)([^>]*)>|([^<]+)/gi);
    for (const match of tokens) {
      if (!match[1]) { stack.at(-1)._text += match[3] ?? ''; continue; }
      const closing = match[0].startsWith('</');
      if (closing) { if (stack.length > 1) stack.pop(); continue; }
      const element = this.createElement(match[1]);
      for (const attr of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
        const name = attr[1], value = attr[2] ?? '';
        if (name === 'id') { element.id = value; this.ids.set(value, element); }
        else if (name === 'class') value.split(/\s+/).filter(Boolean).forEach(item => element.classList.add(item));
        else if (name.startsWith('data-')) element.dataset[name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
        else if (['hidden', 'checked'].includes(name)) element[name] = true;
        else if (name === 'value') element.value = value;
      }
      stack.at(-1).appendChild(element);
      if (!voidTags.has(element.tagName) && !match[0].endsWith('/>')) stack.push(element);
    }
  }
}

function harness() {
  const document = new Document();
  document.parse(fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8').replace(/<script[\s\S]*?<\/script>/g, ''));
  const window = new EventTarget(), errors = [], calls = { scenes: [], audio: [] };
  let now = 0, nextFrame = null, timerId = 0;
  const view = {
    setStation(station) { calls.scenes.push({ type: 'station', station }); },
    look(x, y) { calls.scenes.push({ type: 'look', x, y }); },
    move(x, y, dt) { calls.lastMove = { x, y, dt }; },
    update(dt, state) { calls.lastView = structuredClone(state); calls.viewFrames = (calls.viewFrames ?? 0) + 1; },
    resize() {}, dispose() { calls.disposed = (calls.disposed ?? 0) + 1; }, getMeasurements() { return { mock: true }; }
  };
  const sound = { unlock() {}, setEnabled(enabled) { calls.audioEnabled = enabled; }, play(...args) { calls.audio.push(args); }, update(dt, state) { calls.lastSound = { dt, ...state }; } };
  const context = vm.createContext({ ...model, texts, exportFilmSelection, document, window, createScene: () => view, createSound: () => sound, performance: { now: () => now }, requestAnimationFrame(callback) { nextFrame = callback; }, setTimeout() { return ++timerId; }, clearTimeout() {}, structuredClone, Blob, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, console: { error(...args) { errors.push(args); }, log() {} }, Math, Set, Map });
  const source = fs.readFileSync(new URL('./app.mjs', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  new vm.Script(source, { filename: 'app.mjs' }).runInContext(context);
  const element = id => { const item = document.getElementById(id); assert.ok(item, `Missing controller element ${id}`); return item; };
  const h = {
    document, window, calls, errors,
    el: element,
    state: () => window.productionDebug.getState(),
    report: () => window.productionDebug.audit(),
    measurements: () => window.productionDebug.measurements(),
    click(id) { element(id).click(); },
    change(id, value) { element(id).value = value; element(id).emit('change'); },
    station(station) { document.querySelectorAll('[data-station]').find(button => button.dataset.station === station).click(); },
    close() { element('modal').close(); },
    frames(count = 1) { for (let i = 0; i < count; i++) { now += 1000 / 60; const callback = nextFrame; nextFrame = null; assert.equal(typeof callback, 'function'); callback(now); } },
    seconds(seconds) { this.frames(Math.ceil(seconds * 60)); },
    pointer(id, type, values = {}) { element(id).emit(`pointer${type}`, { pointerId: 1, button: 0, clientX: 100, clientY: 150, ...values }); },
    drag(id, dx = 0, dy = -60) { this.pointer(id, 'down'); this.pointer(id, 'move', { clientX: 100 + dx, clientY: 150 + dy }); this.pointer(id, 'up', { clientX: 100 + dx, clientY: 150 + dy }); },
    key(type, code, extra = {}) { window.emit(`key${type}`, { code, repeat: false, ...extra }); },
    valid() { assert.deepEqual(errors, []); const report = this.report(); assert.equal(report.ok, true, report.errors.join('; ')); assert.equal(report.total, 10000); assert.equal(document.body.classList.contains('fatal'), false); }
  };
  h.valid(); h.click('start'); return h;
}
function extract(h, amount = 1000) {
  const before = h.state().counters.extracted;
  while (h.state().counters.extracted - before < amount) {
    h.station('drum'); h.drag('load');
    h.seconds(3.1);
    for (let i = 0; model.mass(h.state().drum.contents) && i < 1000; i++) { if (i % 5 === 0) h.click('impulse'); h.frames(6); }
    assert.equal(model.mass(h.state().drum.contents), 0);
  }
  h.valid();
}
function collect(h, seconds = 2) { h.station('drum'); h.pointer('take-jars', 'down'); h.seconds(seconds); h.pointer('take-jars', 'up'); }
function deposit(h, count = Infinity) {
  h.click('stock');
  const boxes = h.document.querySelectorAll('[data-jar]').slice(0, count);
  for (const box of boxes) { box.checked = true; box.emit('change'); }
  h.click('deposit-jars'); return boxes.map(box => box.dataset.jar);
}
function prepare(h, amount = 1000) { extract(h, amount); collect(h, amount / 1000 + 1); deposit(h); h.seconds(1); h.valid(); }
function produce(h) {
  h.station('press'); h.seconds(0.8); h.click('tray');
  h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 75 }); h.seconds(h.state().press.format / 155 + 0.2); h.pointer('pour', 'up');
  assert.equal(model.mass(h.state().press.mold), h.state().press.format);
  h.pointer('compress', 'down'); h.seconds(h.state().settings.pressSeconds + 0.9); h.pointer('compress', 'up'); h.valid();
}

test('controller starts, handles the array returned by tick and renders both ports', () => {
  const h = harness(); h.frames(90); h.valid(); assert.equal(h.calls.viewFrames, 90); assert.equal(h.calls.lastSound.drumSpeed, 0); assert.equal(h.document.documentElement.lang, 'fr');
});
test('touch loading and crank impulses create four accumulated visible jars', () => {
  const h = harness(); extract(h); const state = h.state(); assert.equal(state.jars.filter(jar => jar.location === 'stock').length, 4); assert.equal(h.calls.lastView.pots.filter(jar => jar.location === 'stock').length, 4); assert.ok(h.calls.audio.some(call => call[0] === 'load')); assert.ok(h.calls.audio.some(call => call[0] === 'crank'));
});
test('pickup hold ends at release without taking later jars', () => {
  const h = harness(); extract(h); collect(h, 0.1); assert.equal(h.state().jars.filter(jar => jar.location === 'stock').length, 3); h.seconds(2); assert.equal(h.state().jars.filter(jar => jar.location === 'stock').length, 3); h.valid();
});
test('checkbox deposit selects exact jars and an invalid total changes no model state', () => {
  const h = harness(); extract(h); collect(h); h.click('stock'); const box = h.document.querySelectorAll('[data-jar]')[0]; box.checked = true; box.emit('change');
  const before = h.state(); h.click('deposit-jars'); assert.deepEqual(h.state(), before); assert.equal(h.el('modal').open, true); assert.equal(h.measurements().refusals.at(-1).code, 'incomplete_deposit');
  const other = h.document.querySelectorAll('[data-jar]')[1]; other.checked = true; other.emit('change'); h.click('deposit-jars'); assert.equal(h.el('modal').open, false); assert.equal(h.state().jars.filter(jar => jar.location === 'press').length, 2); h.valid();
});
test('touch pour stops on lost capture and resumes the exact fill', () => {
  const h = harness(); prepare(h); h.click('tray'); h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 70 }); h.seconds(0.2); const partial = model.mass(h.state().press.mold); assert.ok(partial > 0 && partial < 100);
  h.el('pour').emit('lostpointercapture'); h.seconds(1); assert.equal(model.mass(h.state().press.mold), partial);
  h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 70 }); h.seconds(1); h.pointer('pour', 'up'); assert.equal(model.mass(h.state().press.mold), 100); assert.equal(h.state().press.trayHeld, false); h.valid();
});
test('press hold stops on pointer cancellation and preserves progress for resume', () => {
  const h = harness(); prepare(h); h.click('tray'); h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 70 }); h.seconds(1); h.pointer('pour', 'up');
  h.pointer('compress', 'down'); h.seconds(0.7); h.pointer('compress', 'cancel'); const progress = h.state().press.progress; h.seconds(1); assert.equal(h.state().press.progress, progress); assert.equal(h.state().plates.length, 0);
  h.pointer('compress', 'down'); h.seconds(3); h.pointer('compress', 'up'); assert.equal(h.state().plates.length, 1); h.valid();
});
test('keyboard Space press and E tray controls share the same exact model', () => {
  const h = harness(); prepare(h); h.key('down', 'KeyE'); h.key('up', 'KeyE'); assert.equal(h.state().press.trayHeld, true);
  h.pointer('world', 'down', { button: 2 }); h.pointer('world', 'move', { button: 2, clientY: 70 }); h.seconds(1); h.pointer('world', 'up', { button: 2 }); assert.equal(model.mass(h.state().press.mold), 100);
  h.key('down', 'Space'); h.seconds(0.5); h.key('up', 'Space'); const progress = h.state().press.progress; h.seconds(0.5); assert.equal(h.state().press.progress, progress); h.key('down', 'Space'); h.seconds(3.4); h.key('up', 'Space'); assert.equal(h.state().plates.length, 1); h.valid();
});
test('window blur releases press and prevents resumed work without a new hold', () => {
  const h = harness(); prepare(h); h.click('tray'); h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 70 }); h.seconds(1); h.pointer('pour', 'up'); h.key('down', 'Space'); h.seconds(0.5);
  h.window.emit('blur'); const progress = h.state().press.progress; h.seconds(4); assert.equal(h.state().press.progress, progress); assert.equal(h.state().plates.length, 0); h.valid();
});
test('hidden document stops simulation and releases held commands', () => {
  const h = harness(); prepare(h); h.click('tray'); h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 70 }); h.seconds(0.2); h.document.hidden = true; h.document.emit('visibilitychange'); const before = h.state(); h.seconds(3); assert.deepEqual(h.state(), before);
  h.document.hidden = false; h.document.emit('visibilitychange'); h.seconds(1); assert.equal(model.mass(h.state().press.mold), model.mass(before.press.mold)); h.valid();
});
test('touch drawer changes both formats and rejects a format change during fill', () => {
  const h = harness(); h.station('press'); h.drag('drawer', 70, 0); assert.equal(h.state().press.format, 250); h.drag('drawer', -70, 0); assert.equal(h.state().press.format, 100);
  prepare(h); h.click('tray'); h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 70 }); h.seconds(0.2); h.pointer('pour', 'up'); const before = h.state(); h.drag('drawer', 70, 0); assert.deepEqual(h.state(), before); h.valid();
});
test('controller makes more than ten slabs without mandatory pickup between cycles', () => {
  const h = harness(); prepare(h, 2000); for (let i = 0; i < 12; i++) produce(h);
  assert.equal(h.state().plates.length, 12); assert.equal(h.state().plates.every(plate => plate.location === 'floor'), true); assert.equal(h.el('made').textContent, '12'); assert.equal(h.measurements().events.filter(event => event.type === 'plateEjected').length, 12); h.valid();
});
test('selection correction, wrap, placement and reopening preserve IDs and contributions', () => {
  const h = harness(); prepare(h); for (let i = 0; i < 4; i++) produce(h); h.station('packing');
  h.pointer('take-plates', 'down'); h.seconds(1); h.pointer('take-plates', 'up'); assert.equal(h.state().plates.filter(plate => plate.location === 'hand').length, 4);
  h.click('selection'); const first = h.document.querySelectorAll('[data-plate]')[0]; first.click(); h.close(); const selected = h.state().plates.filter(plate => plate.location === 'hand').map(plate => ({ id: plate.id, contents: plate.contents })); assert.equal(selected.length, 3);
  h.click('radial'); h.click('wrap'); h.seconds(0.6); assert.equal(h.state().packages[0].location, 'hand'); h.click('drop'); assert.equal(h.state().packages[0].location, 'floor'); h.click('open');
  assert.equal(h.state().packages[0].location, 'opened'); assert.deepEqual(h.state().plates.filter(plate => selected.some(item => item.id === plate.id)).map(plate => ({ id: plate.id, contents: plate.contents })), selected); assert.equal(h.state().plates.every(plate => plate.location === 'floor'), true); h.valid();
});
test('settings apply the selected feel and English/French visible labels', () => {
  const h = harness(); h.click('settings'); h.change('feeling', 'weighty'); assert.equal(h.state().settings.pressSeconds, 3.3); h.change('feeling', 'snappy'); assert.equal(h.state().settings.pressSeconds, 2.6); h.close();
  h.click('language'); assert.equal(h.document.documentElement.lang, 'en'); assert.equal(h.el('tray').textContent, texts.en.tray); assert.equal(h.el('language').textContent, 'FR'); h.click('language'); assert.equal(h.document.documentElement.lang, 'fr'); assert.equal(h.el('tray').textContent, texts.fr.tray); h.valid();
});
test('recovery UI retrieves partial jars and preserves unpressed mold contents', () => {
  const h = harness(); prepare(h); h.click('tray'); h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 70 }); h.seconds(0.2); h.pointer('pour', 'up'); h.click('tray'); const amount = model.mass(h.state().press.mold);
  h.click('recover'); h.document.querySelectorAll('[data-recover]').find(button => button.dataset.recover === 'mold').click(); assert.equal(model.mass(h.state().press.mold), 0); assert.equal(model.mass(h.state().jars[0].contents), amount);
  const partial = h.state().jars.find(jar => jar.location === 'press' && model.mass(jar.contents) > 0 && model.mass(jar.contents) < 250); assert.ok(partial); h.document.querySelectorAll('[data-withdraw]').find(button => button.dataset.withdraw === partial.id).click(); assert.deepEqual(h.state().jars.find(jar => jar.id === partial.id).contents, partial.contents); h.valid();
});
test('restart requires the explicit second click and restores a clean exact trial', () => {
  const h = harness(); prepare(h); produce(h); h.click('settings'); h.click('restart'); assert.equal(h.state().plates.length, 1); h.click('restart'); assert.equal(h.state().plates.length, 0); assert.equal(h.state().counters.extracted, 0); assert.equal(h.calls.disposed, 1); h.frames(1); h.valid();
});

test('branches are the default visual input and switching to buds changes no material', () => {
  const h = harness(); h.frames(1); assert.equal(h.el('input-mode').value, 'branches'); assert.equal(h.calls.lastView.inputMode, 'branches');
  const before = h.state(); h.change('input-mode', 'buds'); assert.deepEqual(h.state(), before); h.frames(1); assert.equal(h.calls.lastView.inputMode, 'buds'); h.valid();
});
test('three-second loading defers the single exact material transfer until animation completion', () => {
  const h = harness(); const before = h.state(); h.drag('load'); assert.deepEqual(h.state(), before); assert.equal(h.el('source').disabled, true);
  h.seconds(1); assert.equal(model.mass(h.state().drum.contents), 0); assert.deepEqual(h.state().source, before.source); assert.equal(h.calls.lastView.loading, true); assert.ok(h.calls.lastView.loadingProgress > 0 && h.calls.lastView.loadingProgress < 1); assert.equal(h.calls.lastView.loadingGrams, 1000); assert.equal(h.calls.lastView.sourceGrams, before.source[0].grams - 1000);
  h.seconds(1.9); assert.equal(model.mass(h.state().drum.contents), 0); assert.equal(h.measurements().events.filter(event => event.type === 'loaded').length, 0);
  h.seconds(0.2); assert.equal(model.mass(h.state().drum.contents), 1000); assert.equal(h.state().source[0].grams, before.source[0].grams - 1000); assert.equal(h.measurements().events.filter(event => event.type === 'loaded').length, 1); assert.equal(h.calls.lastView.loading, false); h.seconds(2); assert.equal(h.measurements().events.filter(event => event.type === 'loaded').length, 1); h.valid();
});
test('repeated touch and mouse load attempts cannot duplicate a pending load', () => {
  const h = harness(); h.drag('load'); h.seconds(0.3); const loadId = h.calls.lastView.loadId;
  for (let i = 0; i < 4; i++) {
    h.drag('load'); h.pointer('world', 'down', { button: 2 }); h.pointer('world', 'move', { button: 2, clientY: 70 }); h.pointer('world', 'up', { button: 2 }); h.seconds(0.1);
  }
  assert.equal(h.calls.lastView.loadId, loadId); assert.equal(model.mass(h.state().drum.contents), 0); h.seconds(3); assert.equal(model.mass(h.state().drum.contents), 1000); assert.equal(h.state().source[0].grams, 3250); assert.equal(h.measurements().events.filter(event => event.type === 'loaded').length, 1); h.valid();
});
test('both crank button and Space are blocked while the source tray is loading', () => {
  const h = harness(); h.drag('load');
  for (let i = 0; i < 12; i++) { h.click('impulse'); h.key('down', 'Space'); h.key('up', 'Space'); h.seconds(0.2); }
  assert.equal(h.state().drum.speed, 0); assert.equal(h.state().drum.work, 0); assert.equal(model.mass(h.state().drum.contents), 0); assert.equal(h.measurements().events.filter(event => event.type === 'impulse').length, 0); assert.equal(h.measurements().events.filter(event => event.type === 'jarProduced').length, 0);
  h.seconds(0.8); h.click('impulse'); assert.ok(h.state().drum.speed > 0); assert.equal(h.measurements().events.filter(event => event.type === 'impulse').length, 1); h.valid();
});
test('visual input mode is locked during loading and while the drum holds material', () => {
  const h = harness(); h.drag('load'); h.change('input-mode', 'buds'); assert.equal(h.el('input-mode').value, 'branches'); h.seconds(3.1); assert.equal(model.mass(h.state().drum.contents), 1000); h.change('input-mode', 'buds'); assert.equal(h.el('input-mode').value, 'branches');
  for (let i = 0; model.mass(h.state().drum.contents) && i < 1000; i++) { if (i % 5 === 0) h.click('impulse'); h.frames(6); }
  h.change('input-mode', 'buds'); assert.equal(h.el('input-mode').value, 'buds'); h.frames(1); assert.equal(h.calls.lastView.inputMode, 'buds'); h.valid();
});
test('branches and buds follow identical abstract quantities and lot contributions', () => {
  const branches = harness(), buds = harness(); buds.change('input-mode', 'buds'); prepare(branches); prepare(buds); produce(branches); produce(buds);
  const ledger = h => { const state = h.state(); return { source: state.source, drum: state.drum.contents, jars: state.jars, press: state.press, plates: state.plates, counters: state.counters }; };
  assert.deepEqual(ledger(branches), ledger(buds)); assert.equal(branches.calls.lastView.inputMode, 'branches'); assert.equal(buds.calls.lastView.inputMode, 'buds'); branches.valid(); buds.valid();
});
test('blur and lost capture preserve the pending animation without a second transfer', () => {
  const h = harness(); h.drag('load'); h.seconds(0.5); h.el('load').emit('lostpointercapture'); h.window.emit('blur'); h.seconds(3); assert.equal(model.mass(h.state().drum.contents), 1000); assert.equal(h.state().source[0].grams, 3250); assert.equal(h.measurements().events.filter(event => event.type === 'loaded').length, 1); h.valid();
});
test('hidden document suspends a pending load and resumes its remaining animation', () => {
  const h = harness(); h.drag('load'); h.seconds(1); h.document.hidden = true; h.document.emit('visibilitychange'); const before = h.state(); h.seconds(10); assert.deepEqual(h.state(), before);
  h.document.hidden = false; h.document.emit('visibilitychange'); h.seconds(1); assert.equal(model.mass(h.state().drum.contents), 0); h.seconds(1.1); assert.equal(model.mass(h.state().drum.contents), 1000); assert.equal(h.measurements().events.filter(event => event.type === 'loaded').length, 1); h.valid();
});
test('reset cancels pending loading and restores branches without a delayed debit', () => {
  const h = harness(); h.change('input-mode', 'buds'); h.drag('load'); h.seconds(1); h.click('settings'); h.click('restart'); h.click('restart'); h.seconds(5);
  assert.equal(h.el('input-mode').value, 'branches'); assert.equal(h.calls.lastView.inputMode, 'branches'); assert.equal(h.calls.lastView.loading, false); assert.equal(model.mass(h.state().drum.contents), 0); assert.equal(h.state().source[0].grams, 4250); assert.equal(h.state().counters.extracted, 0); assert.equal(h.measurements().events.filter(event => event.type === 'loaded').length, 0); h.valid();
});

test('reloading stops residual inertia without extracting or debiting during the open-tray animation', () => {
  const h = harness(); h.drag('load'); h.seconds(3.1);
  for (let i = 0; h.state().counters.extracted < 250 && i < 1000; i++) { if (i % 5 === 0) h.click('impulse'); h.frames(6); }
  const before = h.state(); assert.equal(model.mass(before.drum.contents), 750); assert.ok(before.drum.speed > 0);
  h.drag('load'); const expected = structuredClone(before); expected.drum.speed = 0; assert.deepEqual(h.state(), expected);
  h.seconds(2.9); assert.equal(model.mass(h.state().drum.contents), 750); assert.equal(h.state().counters.extracted, 250); assert.deepEqual(h.state().source, before.source); assert.equal(h.state().drum.speed, 0); assert.equal(h.state().drum.work, before.drum.work);
  h.seconds(0.2); assert.equal(model.mass(h.state().drum.contents), 1000); assert.equal(h.state().source[0].grams, before.source[0].grams - 250); assert.equal(h.state().drum.speed, 0); h.seconds(3); assert.equal(h.state().counters.extracted, 250); assert.equal(model.mass(h.state().drum.contents), 1000); h.valid();
});
test('pending drum loading leaves a suspended press resumable through its normal controls', () => {
  const h = harness(); prepare(h); h.click('tray'); h.pointer('pour', 'down'); h.pointer('pour', 'move', { clientY: 70 }); h.seconds(1); h.pointer('pour', 'up');
  h.pointer('compress', 'down'); h.seconds(0.4); h.pointer('compress', 'up'); const progress = h.state().press.progress, contents = h.state().press.mold;
  h.station('drum'); h.drag('load'); assert.equal(h.state().press.progress, progress); assert.deepEqual(h.state().press.mold, contents);
  h.station('press'); h.pointer('compress', 'down'); h.seconds(3.5); h.pointer('compress', 'up'); assert.equal(h.state().plates.length, 1); assert.equal(h.state().plates[0].format, 100); assert.equal(model.mass(h.state().drum.contents), 1000); assert.equal(h.state().drum.speed, 0); h.valid();
});

test('an invalid reload leaves even the current drum inertia unchanged', () => {
  const h = harness(); h.drag('load'); h.seconds(3.1); h.click('impulse'); const before = h.state(); assert.equal(model.mass(before.drum.contents), 1000); assert.ok(before.drum.speed > 0);
  h.drag('load'); assert.deepEqual(h.state(), before); h.valid();
});

test('an empty source selector keeps rendering with zero visible source and no pending load', () => {
  const h = harness(); const before = h.state(); h.el('source').replaceChildren();
  h.frames(2); assert.equal(h.calls.lastView.sourceGrams, 0); assert.equal(h.calls.lastView.sourceFill, 0); assert.equal(h.calls.lastView.loading, false); assert.deepEqual(h.state().source, before.source); h.valid();
});
