import { CashLedger } from './ledger.mjs';
import { CashAudio } from './audio.mjs';
import { CashScene } from './scene.mjs?v=20261109-v2a';

const $ = id => document.getElementById(id);
const texts = await fetch('texts.json?v=20261109-v2a').then(response => {
  if (!response.ok) throw new Error('Text table failed');
  return response.json();
});
let language = 'fr', mode = 'small', circuit = 'separate';
let ledger = new CashLedger(mode, circuit), audio = new CashAudio(), scene;
let started = false, muted = false, phase = 'dump', counted = 0, sortedCount = 0;
let tickClock = 0, sortClock = 0, selectedSlot = 0, elapsed = 0, bindingUntil = 0;
let toastTimer, gatherTimer, gatherStarted = 0, skipClick = false;
let handSorted = false, assistance = false, storageOpen = false, hoverTarget = null;
const events = [], errors = [];
let operations = 0;
const text = (key, args = {}) => Object.entries(args).reduce(
  (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
  texts[language][key] ?? key
);
const money = value => new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0
}).format(value);

function toast(key) {
  $('toast').textContent = text(key);
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2600);
}

function translate() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = text(element.dataset.i18n);
    if (element.dataset.i18n === 'welcomeTitle') element.innerHTML = value;
    else element.textContent = value;
  });
  $('language').textContent = language === 'fr' ? 'EN' : 'FR';
  $('look').textContent = text(scene?.look ? 'manipulate' : 'look');
  $('mute').textContent = text(muted ? 'unmute' : 'mute');
  $('scene').ariaLabel = text('fps');
  $('reframe').ariaLabel = text('reframe');
  $('settings').ariaLabel = text('compare');
  $('reset').ariaLabel = text('restartAction');
  document.querySelector('.toolbar a').ariaLabel = text('documentation');
  scene?.setLabels({ sorter: text('sorter'), counter: text('counter'), combined: text('combinedMachine'), inlet: text('inlet'), sorted: text('sorted'), output: text('output') });
  update();
}

function failure(reason) {
  const keys = {
    'incompatible-form': 'incompatible', 'slot-full': 'full', 'hand-full': 'needSpace',
    'open-bundle-first': 'needOpen', 'output-empty': 'noOutput', 'slot-not-empty': 'incompatible',
    'mixed-denominations': 'mixedCounter', 'input-denomination': 'incompatibleInput', 'sorted-empty': 'noOutput'
  };
  toast(keys[reason] ?? 'refused');
  audio.refuse();
}

function commit(result, type, options = {}) {
  if (!result.ok) { failure(result.reason); return false; }
  if (['output', 'withdraw', 'sorted'].includes(type)) { handSorted = true; lastTakeWasCounter = type !== 'sorted'; }
  if (['pickup', 'open', 'dump'].includes(type)) { handSorted = false; lastTakeWasCounter = false; }
  operations++;
  const audit = ledger.verify();
  if (!audit.ok) { errors.push(audit.errors); throw new Error('Money invariant failed'); }
  events.push({ type, ids: result.ids, moved: result.moved, time: elapsed, value: audit.totalValue });
  if (events.length > 200) events.shift();
  scene.sync(ledger, { type, ids: result.ids, ...options });
  if (['pickup', 'dump', 'open', 'sorted'].includes(type)) audio.paper(type === 'dump' ? 1.3 : .7);
  if (['drop', 'store', 'withdraw', 'output'].includes(type)) {
    const dense = options.dense ?? (result.ids ?? []).some(id => ledger.entities.find(entity => entity.id === id)?.type === 'bundle');
    audio.contact(dense);
  }
  if (['feed', 'sort-feed'].includes(type)) audio.paper(1.1);
  if (type === 'bind') { audio.bundle(); bindingUntil = elapsed + .9; }
  update();
  return true;
}

function phaseOf() {
  const hand = ledger.getEntities('hand');
  if (ledger.getEntities('pouch').length) return 'dump';
  if (hand.length) {
    if (hand.some(entity => entity.type === 'bundle')) return 'store';
    if (handSorted) return lastTakeWasCounter ? 'store' : 'feed';
    return circuit === 'separate' ? 'sort' : 'feed';
  }
  if (ledger.getEntities('output').length && !ledger.getEntities('input').length) return 'output';
  if (circuit === 'separate' && (ledger.getEntities('sorted20').length || ledger.getEntities('sorted10').length)) return 'sorted';
  if (ledger.getEntities('table').length) return 'pick';
  if (ledger.getEntities('sortInput').length) return 'sortWait';
  if (ledger.getEntities('input').length) return 'wait';
  return 'done';
}
let lastTakeWasCounter = false;

function updateGestureHint() {
  let key = 'gesturePick';
  const held = ledger.getEntities('hand');
  if (scene?.look) key = 'lookActive';
  else if (held.some(entity => entity.type === 'bundle') || (held.length && lastTakeWasCounter)) key = 'chooseSlot';
  else if (held.length) key = hoverTarget === 'sorter' ? 'gestureSorter' : hoverTarget === 'counter' ? 'gestureCounter' : hoverTarget === 'combined' ? 'gestureCombined' : 'gestureCarry';
  else if (phase === 'sorted') key = 'gestureSorted';
  else if (phase === 'output') key = 'gestureOutput';
  else if (phase === 'dump') key = 'dumpDetail';
  else if (phase === 'wait' || phase === 'sortWait') key = phase + 'Detail';
  else if (phase === 'done') key = 'doneDetail';
  $('gesture-hint').textContent = text(key);
  $('hint').textContent = text(scene?.look ? 'lookActive' : 'canvasHint');
}

function update() {
  phase = phaseOf();
  const hand = ledger.getEntities('hand');
  $('total').textContent = money(ledger.totalValue);
  $('integrity').textContent = text('integrity', { count: ledger.notes.length });
  $('hand').textContent = hand.length ? text('handSummary', {
    objects: hand.length,
    notes: hand.reduce((sum, entity) => sum + entity.noteIds.length, 0),
    value: money(hand.reduce((sum, entity) => sum + ledger.denomination(entity) * entity.noteIds.length, 0))
  }) : text('emptyHand');
  const sequence = { dump: '01', pick: '02', sort: '03', sortWait: '03', sorted: '04', feed: '04', wait: '04', output: '05', store: '06', done: '06' };
  $('step').textContent = sequence[phase];
  const instruction = phase === 'output' && !ledger.getEntities('output').some(entity => entity.type === 'bundle') ? 'outputLoose' : phase;
  $('instruction-title').textContent = text(instruction + 'Title');
  $('instruction-detail').textContent = text(instruction + 'Detail');
  const action = phase === 'done' ? 'restartAction' : phase === 'sort' ? 'feedSorterAction' : phase === 'sorted' ? 'takeSortedAction' : phase + 'Action';
  $('primary').textContent = text(action);
  $('primary').disabled = scene.look || ['wait', 'sortWait'].includes(phase) || (phase === 'output' && elapsed < bindingUntil);
  $('drop').disabled = scene.look || !hand.length;
  $('open').disabled = scene.look || !hand.some(entity => entity.type === 'bundle');
  $('assist-panel').hidden = !assistance && phase !== 'dump';
  $('assist').classList.toggle('active', assistance);
  $('storage-panel').hidden = !storageOpen;
  $('storage-toggle').classList.toggle('active', storageOpen);
  $('machine-count').textContent = String(counted).padStart(3, '0');
  const running = ledger.getEntities('input').length > 0;
  $('machine-state').textContent = text(running ? 'counting' : counted ? 'complete' : 'ready');
  $('machine-light').classList.toggle('running', running);
  $('progress').style.width = `${(counted % 100) || (counted ? 100 : 0)}%`;
  $('sorter-count').textContent = String(sortedCount).padStart(3, '0');
  $('sorter-state').textContent = text(ledger.getEntities('sortInput').length ? 'sorting' : sortedCount ? 'sortedReady' : 'sorterReady');
  $('sorter-readout').hidden = circuit !== 'separate';
  $('separate').ariaPressed = String(circuit === 'separate');
  $('combined').ariaPressed = String(circuit === 'combined');
  $('assist').ariaExpanded = String(assistance || phase === 'dump');
  $('storage-toggle').ariaExpanded = String(storageOpen);
  $('separate').classList.toggle('active', circuit === 'separate');
  $('combined').classList.toggle('active', circuit === 'combined');
  for (let index = 0; index < 5; index++) {
    const contents = ledger.getEntities('slot' + index), form = ledger.slots[index].form;
    const button = $('slots').children[index];
    button.innerHTML = `<span>${index + 1}</span><small>${contents.length ? contents.length + '/' + (form === 'bundle' ? 10 : 100) : form ? text(form === 'bundle' ? 'slotBundle' : 'slotNote') : text('empty')}</small>`;
    button.classList.toggle('active', index === selectedSlot);
    button.ariaLabel = `${index + 1} · ${form ? text(form === 'bundle' ? 'slotBundle' : 'slotNote') : text('empty')} · ${contents.length}`;
  }
  $('store').disabled = scene.look || !hand.length;
  $('withdraw').disabled = scene.look || !ledger.getEntities('slot' + selectedSlot).length;
  $('clear').disabled = scene.look || ledger.getEntities('slot' + selectedSlot).length > 0 || ledger.slots[selectedSlot].form === null;
  updateGestureHint();
  updateHotspots();
}

function updateHotspots() {
  const spots = scene.getHotspots();
  const held = ledger.getEntities('hand');
  const regions = {};
  const canvasRect = $('scene').getBoundingClientRect?.();
  for (const name of ['sorter', 'counter', 'combined']) {
    const button = $('target-' + name), spot = spots[name];
    button.hidden = !started || !spot?.visible || (name === 'combined' ? circuit !== 'combined' : circuit !== 'separate');
    if (spot) { button.style.left = `${spot.x}px`; button.style.top = `${spot.y}px`; }
    button.disabled = scene.look || !held.length;
    button.classList.toggle('ready', held.length > 0);
    button.classList.toggle('hot', hoverTarget === name);
    if (!button.hidden && canvasRect && button.getBoundingClientRect) {
      const rect = button.getBoundingClientRect();
      regions[name] = { left: rect.left - canvasRect.left, top: rect.top - canvasRect.top, right: rect.right - canvasRect.left, bottom: rect.bottom - canvasRect.top };
    }
  }
  scene.setIntakeRegions?.(regions);
}

function gather() {
  if (!started || scene.look) return;
  const room = 100 - ledger.handObjects;
  if (room <= 0) { stopGather(); return; }
  const amount = gatherStarted ? Math.min(16, 3 + Math.floor((performance.now() - gatherStarted) / 160)) : 24;
  const ids = ledger.getEntities('table').filter(entity => entity.type === 'note' || !ledger.handObjects).slice(0, Math.min(amount, room)).map(entity => entity.id);
  if (ids.length) { commit(ledger.pickup(ids), 'pickup'); }
  else stopGather();
}
function stopGather() { clearInterval(gatherTimer); gatherTimer = null; gatherStarted = 0; }
function feedSorter() { return commit(ledger.feedSorter(), 'sort-feed'); }
function feedCounter() { return commit(circuit === 'combined' ? ledger.feed() : ledger.feedCounter(), 'feed'); }
function takeSorted(denomination) { return commit(ledger.takeSorted(denomination), 'sorted'); }
function takeOutput() {
  if (elapsed < bindingUntil) return false;
  const result = ledger.takeOutput();
  return commit(result, 'output');
}
function perform() {
  if (!started || scene.look) return;
  switch (phase) {
    case 'dump': return commit(ledger.dump(), 'dump');
    case 'pick': return gather();
    case 'sort': return feedSorter();
    case 'sorted': return takeSorted(ledger.getEntities('sorted20').length ? 20 : 10);
    case 'feed': return feedCounter();
    case 'output': return takeOutput();
    case 'store': if (commit(ledger.store(selectedSlot), 'store')) toast('stored'); return;
    case 'done': return reset(mode, circuit);
  }
}
function reset(nextMode, nextCircuit = circuit) {
  stopGather(); audio.stop();
  const changedCircuit = nextCircuit !== circuit;
  mode = nextMode; circuit = nextCircuit;
  ledger = new CashLedger(mode, circuit);
  counted = 0; sortedCount = 0; tickClock = 0; sortClock = 0; bindingUntil = 0;
  handSorted = false; lastTakeWasCounter = false; hoverTarget = null;
  scene.reset(); scene.setCircuit(circuit); scene.sync(ledger);
  $('small').classList.toggle('active', mode === 'small');
  $('large').classList.toggle('active', mode === 'large');
  update(); toast(changedCircuit ? 'circuitReset' : 'lotReset');
}

function select(action) {
  if (action.action === 'hover-target') { hoverTarget = action.target; updateGestureHint(); return true; }
  if (!started || scene.look) return false;
  if (action.action === 'handful') {
    const candidates = new Set(action.ids ?? []);
    const ids = ledger.getEntities('table').filter(entity => candidates.has(entity.id)).slice(0, 100 - ledger.handObjects).map(entity => entity.id);
    if (!ids.length) return false;
    return commit(ledger.pickup(ids), 'pickup');
  }
  if (action.action === 'note') { return commit(ledger.pickup([action.id]), 'pickup'); }
  if (action.action === 'sorter') return circuit === 'separate' && feedSorter();
  if (['counter', 'combined', 'machine'].includes(action.action)) return feedCounter();
  if (action.action === 'sorted') return takeSorted(action.denomination);
  if (action.action === 'pouch') return ledger.getEntities('pouch').length > 0 && commit(ledger.dump(), 'dump');
  if (action.action === 'drop') return ledger.handObjects > 0 && commit(ledger.dropHand(), 'drop', { position: action.position });
  if (action.action === 'output') {
    const entity = action.id ? ledger.entities.find(item => item.id === action.id) : null;
    if (entity?.location === 'table') { return commit(ledger.pickup([entity.id]), 'pickup'); }
    if (entity?.location.startsWith('slot')) { selectedSlot = Number(entity.location.slice(4)); return commit(ledger.withdraw(selectedSlot), 'withdraw'); }
    return takeOutput();
  }
  if (action.action === 'slot') {
    selectedSlot = action.index;
    $('slot-actions').hidden = false;
    if (ledger.handObjects) return commit(ledger.store(selectedSlot), 'store');
    if (ledger.getEntities('slot' + selectedSlot).length) { return commit(ledger.withdraw(selectedSlot), 'withdraw'); }
    update();
  }
  return false;
}

for (let index = 0; index < 5; index++) {
  const button = document.createElement('button');
  button.addEventListener('click', () => { selectedSlot = index; $('slot-actions').hidden = false; update(); });
  $('slots').appendChild(button);
}
try {
  scene = new CashScene($('scene'), select, { circuit });
  scene.sync(ledger);
} catch (error) {
  errors.push(String(error)); $('start').disabled = true; $('start').textContent = text('error'); throw error;
}
$('start').addEventListener('click', async () => {
  const ok = await audio.unlock(); started = true; $('welcome').hidden = true;
  if (!ok) toast('audioUnavailable'); update();
});
$('primary').addEventListener('pointerdown', event => {
  if (phase !== 'pick' || scene.look || !started) return;
  event.preventDefault(); skipClick = true; $('primary').setPointerCapture(event.pointerId);
  gatherStarted = performance.now(); gather(); gatherTimer = setInterval(gather, 100);
});
$('primary').addEventListener('pointerup', () => { stopGather(); setTimeout(() => skipClick = false, 50); });
$('primary').addEventListener('pointercancel', () => { stopGather(); skipClick = false; });
$('primary').addEventListener('click', () => { if (!skipClick) perform(); });
$('drop').addEventListener('click', () => { if (commit(ledger.dropHand(), 'drop')) toast('dropped'); });
$('open').addEventListener('click', () => { if (commit(ledger.openHand(), 'open')) { lastTakeWasCounter = false; update(); toast('opened'); } });
$('store').addEventListener('click', () => { if (commit(ledger.store(selectedSlot), 'store')) toast('stored'); });
$('withdraw').addEventListener('click', () => { const result = ledger.withdraw(selectedSlot); if (commit(result, 'withdraw')) toast('withdrawn'); });
$('clear').addEventListener('click', () => { if (commit(ledger.clearSlot(selectedSlot), 'clear')) toast('cleared'); });
$('small').addEventListener('click', () => reset('small'));
$('large').addEventListener('click', () => reset('large'));
$('reset').addEventListener('click', () => reset(mode));
$('separate').addEventListener('click', () => { if (circuit !== 'separate') reset(mode, 'separate'); });
$('combined').addEventListener('click', () => { if (circuit !== 'combined') reset(mode, 'combined'); });
$('target-sorter').addEventListener('click', () => { if (started && !scene.look && circuit === 'separate') feedSorter(); });
$('target-counter').addEventListener('click', () => { if (started && !scene.look && circuit === 'separate') feedCounter(); });
$('target-combined').addEventListener('click', () => { if (started && !scene.look && circuit === 'combined') feedCounter(); });
$('assist').addEventListener('click', () => { assistance = !assistance; if (assistance) { storageOpen = false; $('comparison').hidden = true; } update(); });
$('storage-toggle').addEventListener('click', () => { storageOpen = !storageOpen; if (storageOpen) { assistance = false; $('comparison').hidden = true; } update(); });
$('settings').addEventListener('click', () => { $('comparison').hidden = !$('comparison').hidden; if (!$('comparison').hidden) { assistance = false; storageOpen = false; } update(); });
$('volume').addEventListener('input', event => audio.setVolume(Number(event.target.value)));
$('effects').addEventListener('change', event => scene.setEffects(event.target.checked));
$('mute').addEventListener('click', async () => { muted = !muted; audio.setEnabled(!muted); if (!muted) await audio.unlock(); $('mute').textContent = text(muted ? 'unmute' : 'mute'); });
$('look').addEventListener('click', () => {
  scene.look = !scene.look; stopGather(); hoverTarget = null;
  $('look').classList.toggle('active', scene.look); $('look').textContent = text(scene.look ? 'manipulate' : 'look'); update();
});
$('reframe').addEventListener('click', () => scene.resetCamera());
$('language').addEventListener('click', () => { language = language === 'fr' ? 'en' : 'fr'; translate(); });
window.addEventListener('keydown', event => {
  if (['INPUT', 'SELECT'].includes(document.activeElement?.tagName) && event.code !== 'F7') return;
  if (event.code === 'F7') { event.preventDefault(); $('effects').checked = !$('effects').checked; scene.setEffects($('effects').checked); }
  if (!started || scene.look || event.repeat) return;
  if (event.code === 'KeyE') perform();
  if (event.code === 'KeyT' && ledger.handObjects) commit(ledger.dropHand(), 'drop');
  if (event.code === 'KeyF') { gatherStarted = performance.now(); gather(); gatherTimer = setInterval(gather, 100); }
});
window.addEventListener('keyup', event => { if (event.code === 'KeyF') stopGather(); });
window.addEventListener('blur', stopGather);
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopGather(); audio.stop(); tickClock = 0; sortClock = 0; } });

let last = performance.now();
function frame(now) {
  const realDt = (now - last) / 1000; last = now;
  const dt = document.hidden ? 0 : Math.min(realDt, .06); elapsed += dt;
  if (started && dt) {
    const rate = Number($('pace').value);
    sortClock += dt;
    let sortBudget = 3;
    while (circuit === 'separate' && sortClock >= 1 / rate && ledger.getEntities('sortInput').length && sortBudget-- > 0) {
      sortClock -= 1 / rate;
      if (commit(ledger.tickSorter(), 'sort-tick')) { sortedCount++; audio.tick(sortedCount); scene.updateDisplay(counted, sortedCount); update(); }
    }
    if (!ledger.getEntities('sortInput').length) sortClock = 0;
    tickClock += dt;
    let budget = 3;
    while (tickClock >= 1 / rate && ledger.getEntities('input').length && budget-- > 0) {
      tickClock -= 1 / rate;
      const result = ledger.tickMachine();
      if (commit(result, 'tick')) {
        counted++; audio.tick(counted); scene.updateDisplay(counted, sortedCount); update();
        const denomination = ledger.denomination(result.entity);
        const matching = ledger.getEntities('output').filter(entity => entity.type === 'note' && ledger.denomination(entity) === denomination);
        if (matching.length >= 100) commit(ledger.bind(denomination), 'bind');
      }
    }
    if (!ledger.getEntities('input').length) tickClock = 0;
    if (phase === 'output' && elapsed >= bindingUntil && $('primary').disabled) update();
  }
  scene.step(dt, realDt); updateHotspots(); requestAnimationFrame(frame);
}
translate(); requestAnimationFrame(frame);
window.addEventListener('error', event => errors.push(String(event.message)));
window.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));
window.cashDiagnostics = () => ({ version: 'v02', scenario: mode, circuit, operations, sortedCount, counted, audit: ledger.verify(), snapshot: ledger.snapshot(), audio: audio.metrics, render: scene.metrics, events: [...events], errors: [...errors], view: 'fps', effects: scene.effects });
