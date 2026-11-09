import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// These controller tests use the real app and ledger with a minimal DOM and
// simulated scene/audio adapters. They are not browser, rendering or audio QA.
const appURL = new URL('../app.mjs', import.meta.url);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const texts = JSON.parse(await readFile(new URL('../texts.json', import.meta.url), 'utf8'));
let moduleSerial = 0;

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.title = '';
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.listeners = new Map();
    this.captures = new Set();
    this.replacements = 0;
    this.classes = new Set();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
      contains: name => this.classes.has(name)
    };
  }
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(callback);
  }
  emit(name, values = {}) {
    const event = { target: this, button: 0, pointerId: 1, clientX: 10, clientY: 10, repeat: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const listener of this.listeners.get(name) || []) listener(event);
    return event;
  }
  append(node) { this.children.push(node); }
  replaceChildren(...nodes) { this.replacements++; this.children = nodes; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  click() { if (!this.disabled) return this.onclick?.({ target: this }); }
}

const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const sceneURL = moduleURL(`
export class SaleScene {
  constructor() { this.nextPick = null; this.target = 'tray'; this.pulses = []; this.updates = 0; globalThis.__saleTestScene = this; }
  pick() { return this.nextPick; }
  dropTarget() { return this.target; }
  pulse(event) { this.pulses.push(event); }
  setDrag(x,y) { this.drag = [x,y]; }
  setEnhanced(value) { this.enhanced = value; }
  update() { this.updates++; }
  resize() {}
  async loadGameModels() { return {loaded: ['products', 'customers'], failed: globalThis.__failLoading ? [{key:'Leah',message:'Missing fixture'}] : []}; }
}`);
const audioURL = moduleURL(`
export class SaleAudio {
  constructor() { this.events = []; globalThis.__saleTestAudio = this; }
  async unlock() { return true; }
  play(event) { this.events.push(event); return true; }
  setMuted(value) { this.muted = value; }
  setEnhanced(value) { this.enhanced = value; }
}`);

async function boot(context, scenario = 'normal', failLoading = false) {
  const elements = new Map();
  const translated = [];
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const element = new Element(match[1]);
    const attributes = match[2];
    const id = attributes.match(/\bid="([^"]+)"/)?.[1];
    const key = attributes.match(/\bdata-text="([^"]+)"/)?.[1];
    element.hidden = /(?:^|\s)hidden(?:\s|$)/.test(attributes);
    if (id) { element.id = id; elements.set(id, element); }
    if (key) { element.dataset.text = key; translated.push(element); }
  }
  const document = new Element('document');
  document.hidden = false;
  document.hasFocus = () => true;
  document.documentElement = { lang: 'fr' };
  document.getElementById = id => {
    assert.ok(elements.has(id), `The application references a missing DOM element: ${id}`);
    return elements.get(id);
  };
  document.querySelectorAll = selector => selector === '[data-text]' ? translated : [];
  document.createElement = tag => new Element(tag);
  const window = new Element('window');
  const frames = [];
  let now = 0;
  const values = {
    __failLoading: failLoading,
    document, window, location: { search: '?debug' }, performance: { now: () => now },
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
    fetch: async url => { assert.equal(url, './texts.json'); return { ok: true, json: async () => texts }; }
  };
  const originals = new Map(Object.keys(values).concat(['__saleTestScene', '__saleTestAudio']).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  context.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const source = (await readFile(appURL, 'utf8'))
    .replace(/\?v=[a-zA-Z0-9-]+(?=['"])/g, '')
    .replace("from './model.mjs'", `from '${new URL('../model.mjs', import.meta.url).href}'`)
    .replace("from './scene.mjs'", `from '${sceneURL}'`)
    .replace("from './audio.mjs'", `from '${audioURL}'`);
  await import(moduleURL(`${source}\n// Test instance ${moduleSerial++}`));
  elements.get('scenario').value = scenario;
  await elements.get('start').click();
  const harness = {
    elements, window, document, scene: globalThis.__saleTestScene, audio: globalThis.__saleTestAudio,
    get state() { return window.SALE.state; },
    get view() { return window.SALE.view; },
    key(key, target = new Element('body'), extra = {}) { return window.emit('keydown', { key, target, ...extra }); },
    click(id) { return elements.get(id).click(); },
    action(action) { return window.SALE.dispatch(action); },
    frames(duration, step = 20) {
      for (let remaining = duration; remaining > 0; remaining -= step) {
        const elapsed = Math.min(remaining, step);
        now += elapsed;
        const callback = frames.shift();
        assert.equal(typeof callback, 'function');
        callback(now);
      }
    },
    pointer(name, item = undefined, values = {}) {
      if (item !== undefined) this.scene.nextPick = item;
      return elements.get('world').emit(name, values);
    },
    hidden(value) { document.hidden = value; document.emit('visibilitychange'); },
    snapshot() { return JSON.stringify(window.SALE.state); }
  };
  assert.equal(harness.state.phase, 'approach');
  assert.equal(elements.get('intro').hidden, !failLoading);
  return harness;
}

function prepare(harness) {
  harness.key('e');
  harness.key('2');
  assert.equal(harness.state.phase, 'request');
}

test('a missing game model prevents opening the stall and keeps a localized explanation', async context => {
  context.mock.method(console, 'error', () => {});
  const app = await boot(context, 'normal', true);
  assert.equal(app.elements.get('start').disabled, true);
  assert.equal(app.elements.get('start').textContent, texts.fr.modelsUnavailable);
  app.click('start');
  assert.equal(app.elements.get('intro').hidden, false);
  app.click('language');
  assert.equal(app.elements.get('start').textContent, texts.en.modelsUnavailable);
  assert.equal(app.state.sales.length, 0);
});

function addChangeWithHelper(harness, denominations = [20, 5]) {
  harness.click('helpButton');
  for (const denomination of denominations) {
    const button = harness.elements.get('billButtons').children[[5,10,20,50,100].indexOf(denomination)];
    assert.equal(button.disabled, false);
    button.click();
  }
  harness.click('closeHelp');
}

test('keyboard and helper controls complete a real sale and store its original note', async context => {
  const app = await boot(context);
  assert.equal(app.elements.get('request').textContent, '');
  prepare(app);
  assert.equal(app.elements.get('received').textContent, '50 €');
  assert.equal(app.elements.get('due').textContent, '25 €');
  assert.equal(app.elements.get('primary').disabled, true);
  addChangeWithHelper(app);
  assert.equal(app.elements.get('returned').classList.contains('exact'), true);
  app.key(' ');
  assert.equal(app.state.sales.length, 1);
  assert.equal(app.elements.get('toast').textContent, 'Vente +25 €');
  assert.equal(app.elements.get('reaction').textContent, texts.fr.thanks);
  assert.equal(app.state.objects.find(item => item.id === 'payment-1').location, 'fund');
  assert.equal(app.view.hand.length, 0);
  assert.equal(app.view.receipts.length, 0);
  assert.equal(app.elements.get('receiptHint').hidden, true);
});

test('repeated keys and rapid double confirmation cannot produce duplicate receipts', async context => {
  const app = await boot(context);
  app.key('e');
  app.key('2');
  const stock = app.view.slots[1].length;
  app.key('2', new Element('body'), { repeat: true });
  assert.equal(app.view.slots[1].length, stock);
  addChangeWithHelper(app);
  app.click('primary');
  const before = app.snapshot();
  app.click('primary');
  app.key(' ');
  assert.equal(app.snapshot(), before);
  assert.equal(app.state.sales.length, 1);
  assert.equal(app.view.hand.length, 0);
  assert.equal(app.state.objects.find(item => item.id === 'payment-1').location, 'fund');
});

test('input fields and selectors consume typing without running game shortcuts', async context => {
  const app = await boot(context);
  const before = app.snapshot();
  for (const tag of ['textarea', 'select', 'input']) {
    for (const key of ['e', '1', ' ', 'r']) {
      const event = app.key(key, new Element(tag));
      assert.notEqual(event.defaultPrevented, true);
      assert.equal(app.snapshot(), before);
    }
  }
});

test('pointer cancellation returns the exact selected product and freezes hesitation at selection', async context => {
  const app = await boot(context, 'hesitation');
  app.key('e');
  app.frames(800);
  const remaining = app.state.hesitationLeft;
  const product = app.state.objects.find(item => item.id === 'hash4-1');
  app.pointer('pointerdown', { ...product });
  assert.equal(product.location, 'drag');
  assert.equal(app.state.hesitationFrozen, true);
  app.frames(400);
  assert.equal(app.state.hesitationLeft, remaining);
  app.pointer('pointercancel');
  assert.equal(product.location, 'slot:hash4');
  assert.equal(app.state.dragId, null);
  assert.equal(app.view.slots[1].length, 8);
  app.window.SALE.verify();
});

test('a drag released outside any target restores the original banknote', async context => {
  const app = await boot(context);
  prepare(app);
  const bill = app.view.fund.find(item => item.denomination === 5);
  app.pointer('pointerdown', { ...bill });
  app.pointer('pointermove', undefined, { clientX: 80, clientY: 90 });
  app.scene.target = null;
  app.pointer('pointerup', undefined, { clientX: 80, clientY: 90 });
  assert.equal(bill.location, 'fund');
  assert.equal(app.view.returned, 0);
  assert.equal(app.state.dragId, null);
});

test('tap then tap can extract and place one banknote without copying it', async context => {
  const app = await boot(context);
  prepare(app);
  const bill = app.view.fund.find(item => item.denomination === 5);
  app.pointer('pointerdown', { ...bill });
  app.pointer('pointerup');
  assert.equal(app.state.dragId, bill.id);
  app.pointer('pointerdown', null, { clientX: 200, clientY: 200 });
  app.pointer('pointerup', undefined, { clientX: 200, clientY: 200 });
  assert.equal(bill.location, 'change');
  assert.equal(app.view.returned, 5);
  assert.equal(app.state.objects.filter(item => item.id === bill.id).length, 1);
  assert.equal(app.elements.get('primary').disabled, true);
});

test('helper buttons retain their identity between frames and rebuild after a genuine change', async context => {
  const app = await boot(context);
  app.key('e');
  app.click('helpButton');
  const container = app.elements.get('productButtons');
  const button = container.children[0];
  const replacements = container.replacements;
  app.frames(1500);
  assert.equal(container.children[0], button);
  assert.equal(container.replacements, replacements);
  button.click();
  assert.equal(app.view.tray.length, 1);
  assert.equal(container.replacements, replacements + 1);
  assert.notEqual(container.children[0], button);
  app.frames(300);
  assert.equal(container.replacements, replacements + 1);
});

test('help and background visibility pause the real hesitation and service clocks', async context => {
  const app = await boot(context, 'hesitation');
  app.key('e');
  app.frames(500);
  const beforeHelp = [app.state.elapsed, app.state.hesitationLeft];
  app.click('helpButton');
  app.frames(1000);
  assert.deepEqual([app.state.elapsed, app.state.hesitationLeft], beforeHelp);
  app.click('closeHelp');
  app.hidden(true);
  app.frames(2000);
  assert.deepEqual([app.state.elapsed, app.state.hesitationLeft], beforeHelp);
  app.hidden(false);
  app.frames(500);
  assert.ok(app.state.hesitationLeft < beforeHelp[1]);
  assert.equal(app.state.phase, 'hesitation');
});

test('an occupied hand permits automatic collection and the next customer advances without a stow action', async context => {
  const app = await boot(context, 'full-hand');
  prepare(app);
  addChangeWithHelper(app);
  app.key(' ');
  assert.equal(app.state.objects.find(item => item.id === 'payment-1').location, 'fund');
  assert.equal(app.state.objects.find(item => item.id === 'demo-parcel').location, 'hand');
  assert.equal(app.elements.get('collect').hidden, true);
  assert.equal(app.view.receipts.length, 0);
  app.frames(4400);
  assert.equal(app.state.currentId, 'customer-2');
  assert.equal(app.state.phase, 'approach');
  app.key('e');
  app.key('2');
  assert.equal(app.state.phase, 'request');
  assert.equal(app.view.due, 25);
  addChangeWithHelper(app);
  app.key(' ');
  assert.equal(app.state.sales.length, 2);
  assert.equal(app.state.objects.find(item => item.id === 'payment-2').location, 'fund');
  assert.equal(app.state.objects.find(item => item.id === 'demo-parcel').location, 'hand');
  app.click('stow');
  assert.equal(app.state.objects.find(item => item.id === 'payment-1').location, 'fund');
  assert.equal(app.elements.get('receiptHint').hidden, true);
});

test('wrong change maps to its specific explanation and error audio without changing the ledger', async context => {
  const app = await boot(context);
  prepare(app);
  const before = app.snapshot();
  app.key(' ');
  assert.equal(app.snapshot(), before);
  assert.equal(app.elements.get('toast').textContent, texts.fr['wrong-change']);
  assert.equal(app.audio.events.at(-1), 'error');
  assert.equal(app.elements.get('returned').classList.contains('exact'), false);
});

test('hand and price refusal aliases provide their specific explanations', async context => {
  const app = await boot(context, 'full-hand');
  app.key('e');
  app.key('2');
  const beforePrice = app.snapshot();
  app.action({ type: 'adjustPrice', delta: 5 });
  assert.equal(app.snapshot(), beforePrice);
  assert.equal(app.elements.get('toast').textContent, texts.fr['invalid-price']);
  addChangeWithHelper(app);
  app.key(' ');
  const beforeCollect = app.snapshot();
  app.action({ type: 'collect', id: 'payment-1' });
  assert.equal(app.snapshot(), beforeCollect);
  assert.equal(app.elements.get('toast').textContent, texts.fr['hand-full']);
  assert.equal(app.audio.events.at(-1), 'error');
});

test('excess change is marked as extra and can still be taken back before confirmation', async context => {
  const app = await boot(context);
  prepare(app);
  app.click('helpButton');
  app.elements.get('billButtons').children[3].click();
  app.click('closeHelp');
  assert.equal(app.view.returned, 50);
  assert.equal(app.elements.get('returned').classList.contains('exact'), false);
  assert.equal(app.elements.get('primary').disabled, false);
  assert.equal(app.elements.get('returned').classList.contains('extra'), true);
  assert.equal(app.elements.get('changeNotice').textContent, 'Vous allez rendre 25 € en trop.');
  const bill = app.view.change[0];
  app.pointer('pointerdown', { ...bill });
  app.pointer('pointerup');
  assert.equal(app.view.returned, 0);
  assert.equal(bill.location, 'fund');
});

test('confirmed excess change reports its real cost and an extra service and loyalty benefit', async context => {
  const app = await boot(context);
  prepare(app);
  addChangeWithHelper(app, [20, 10]);
  app.click('primary');
  assert.equal(app.state.sales[0].agreedPrice, 25);
  assert.equal(app.state.sales[0].actualRevenue, 20);
  assert.equal(app.elements.get('toast').textContent, 'Erreur de monnaie : 5 € rendus en trop.');
  assert.equal(app.elements.get('saleFeedback').hidden, false);
  assert.equal(app.elements.get('feedbackTitle').textContent, `Julien · ${texts.fr.veryHappy}`);
  assert.equal(app.elements.get('productImpact').textContent, '↑');
  assert.equal(app.elements.get('serviceImpact').textContent, '↑↑');
  assert.equal(app.elements.get('loyaltyImpact').textContent, '↑↑');
  assert.equal(app.elements.get('actualRevenue').textContent, 'Recette réelle : 20 €');
  assert.equal(app.scene.pulses.at(-1), 'sale-happy');
  app.frames(300);
  assert.equal(app.elements.get('saleFeedback').hidden, false);
  app.frames(4400);
  assert.equal(app.state.currentId, 'customer-2');
  assert.equal(app.elements.get('saleFeedback').hidden, true);
  app.key('e');
  assert.equal(app.elements.get('saleFeedback').hidden, true);
});

test('transient sale feedback pauses with help and disappears without another interaction', async context => {
  const app = await boot(context);
  prepare(app);
  addChangeWithHelper(app);
  app.click('primary');
  app.frames(200);
  assert.equal(app.elements.get('saleFeedback').hidden, false);
  app.click('helpButton');
  assert.equal(app.elements.get('saleFeedback').hidden, true);
  app.frames(5000);
  app.click('closeHelp');
  assert.equal(app.elements.get('saleFeedback').hidden, false);
  app.window.emit('blur');
  app.frames(5000);
  app.window.emit('focus');
  assert.equal(app.elements.get('saleFeedback').hidden, false);
  app.frames(3000);
  assert.equal(app.elements.get('saleFeedback').hidden, true);
  assert.equal(app.state.sales.length, 1);
});

test('the outcome translates without changing its ledger and distinguishes a cash loss', async context => {
  const app = await boot(context);
  prepare(app);
  addChangeWithHelper(app, [100]);
  app.click('primary');
  assert.equal(app.elements.get('actualRevenue').textContent, 'Recette réelle : -50 €');
  const before = app.snapshot();
  app.click('language');
  assert.equal(app.snapshot(), before);
  assert.equal(app.elements.get('feedbackTitle').textContent, `Julien · ${texts.en.veryHappy}`);
  assert.equal(app.elements.get('feedbackError').textContent, 'Change error: 75 € given too much.');
  assert.equal(app.elements.get('actualRevenue').textContent, 'Actual revenue: -50 €');
});

test('the request reveals presented money and permits change before the product', async context => {
  const app = await boot(context);
  assert.equal(app.elements.get('payment').hidden, true);
  app.key('e');
  assert.equal(app.elements.get('payment').hidden, false);
  assert.equal(app.elements.get('request').textContent, 'Bonjour, HASHISH 4 g, s’il vous plaît.');
  assert.equal(app.elements.get('due').textContent, '25 €');
  addChangeWithHelper(app);
  assert.equal(app.elements.get('primary').disabled, true);
  app.key('2');
  assert.equal(app.view.returned, 25);
  assert.equal(app.elements.get('primary').disabled, false);
  app.click('primary');
  assert.equal(app.state.sales.length, 1);
  assert.equal(app.state.objects.find(item => item.id === 'payment-1').location, 'fund');
});

test('a mismatched product reports the product problem without claiming missing change', async context => {
  const app = await boot(context);
  app.key('e');
  app.key('1');
  addChangeWithHelper(app, [5]);
  assert.equal(app.view.returned, app.view.due);
  const before = app.snapshot();
  app.key(' ');
  assert.equal(app.snapshot(), before);
  assert.equal(app.elements.get('toast').textContent, texts.fr['wrong-products']);
});

test('language and feedback controls do not change any owned object or sale', async context => {
  const app = await boot(context);
  prepare(app);
  const before = app.snapshot();
  app.click('language');
  app.click('feel');
  await app.click('sound');
  assert.equal(app.snapshot(), before);
  assert.equal(app.document.documentElement.lang, 'en');
  assert.equal(app.elements.get('primary').textContent, texts.en.confirm);
  assert.equal(app.scene.enhanced, false);
  assert.equal(app.audio.enhanced, false);
  assert.equal(app.audio.muted, true);
});

test('hiding the document cancels an active extraction without losing the object', async context => {
  const app = await boot(context);
  app.key('e');
  const product = app.state.objects.find(item => item.id === 'hash8-1');
  app.pointer('pointerdown', { ...product });
  app.hidden(true);
  assert.equal(product.location, 'slot:hash8');
  assert.equal(app.state.dragId, null);
  app.window.SALE.verify();
});

test('a visible window without focus pauses clocks and resumes without a time jump', async context => {
  const app = await boot(context, 'hesitation');
  app.key('e');
  app.frames(600);
  const before = [app.state.elapsed, app.state.hesitationLeft];
  app.window.emit('blur');
  assert.equal(app.document.hidden, false);
  app.frames(1500);
  assert.deepEqual([app.state.elapsed, app.state.hesitationLeft], before);
  app.window.emit('focus');
  app.frames(20);
  assert.ok(app.state.elapsed > before[0]);
  assert.ok(app.state.elapsed - before[0] < 0.03);
});

test('returning from a hidden document permits a fresh pointer gesture', async context => {
  const app = await boot(context);
  app.key('e');
  const first = app.state.objects.find(item => item.id === 'hash8-1');
  app.pointer('pointerdown', { ...first }, { pointerId: 1 });
  app.hidden(true);
  app.hidden(false);
  const second = app.state.objects.find(item => item.id === 'hash8-2');
  app.pointer('pointerdown', { ...second }, { pointerId: 2 });
  assert.equal(app.state.dragId, second.id);
  assert.equal(first.location, 'slot:hash8');
  app.pointer('pointercancel');
});
