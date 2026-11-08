import { CashLedger } from './ledger.mjs';
import { CashAudio } from './audio.mjs';
import { CashScene } from './scene.mjs?v=20261109-v3a';
const $ = id => document.getElementById(id);
const texts = await fetch('texts.json?v=20261109-v3a').then(r => { if (!r.ok) throw new Error('Text table failed'); return r.json(); });
let language = 'fr', mode = 'small', ledger = new CashLedger(mode), audio = new CashAudio(), scene;
let started = false, muted = false, phase = 'dump', counted = 0, elapsed = 0, tickClock = 0, selectedSlot = 0;
let assistance = false, storageOpen = false, hoverTarget = null, heldCash = false, toastTimer, gatherTimer, gatherStarted = 0, skipClick = false;
const bindingDeadlines = { 10: 0, 20: 0 }, landingSounds = [], events = [], errors = [];
let operations = 0;
const text = (key, args = {}) => Object.entries(args).reduce((value, [name, replacement]) => value.replaceAll('{' + name + '}', String(replacement)), texts[language][key] ?? key);
const money = value => new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const reserveCount = d => ledger.getEntities('reserve' + d).length;
const bindingEntity = d => ledger.getEntities('binding' + d)[0];
const autoBundle = () => $('auto-bundle').checked;
const withdrawalQuantity = () => Number($('withdrawal-quantity').value) || 10;

function toast(key) {
  $('toast').textContent = text(key); $('toast').classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2600);
}
function translate() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(e => { if (e.dataset.i18n === 'welcomeTitle') e.innerHTML = text(e.dataset.i18n); else e.textContent = text(e.dataset.i18n); });
  $('language').textContent = language === 'fr' ? 'EN' : 'FR';
  $('look').textContent = text(scene?.look ? 'manipulate' : 'look'); $('mute').textContent = text(muted ? 'unmute' : 'mute');
  $('scene').ariaLabel = text('fps'); $('reframe').ariaLabel = text('reframe'); $('settings').ariaLabel = text('compare'); $('reset').ariaLabel = text('restartAction');
  document.querySelector('.toolbar a').ariaLabel = text('documentation');
  scene?.setLabels({ combined: text('combinedMachine'), sorter: text('combinedMachine'), counter: text('counter'), inlet: text('inlet'), sorted: text('sorted'), output: text('output') });
  update();
}
function failure(reason) {
  const keys = { 'incompatible-form': 'incompatible', 'slot-full': 'full', 'hand-full': 'needSpace', 'open-bundle-first': 'needOpen', 'output-empty': 'noOutput', 'slot-not-empty': 'incompatible', 'reserve-empty': 'reserveEmpty', 'binding-busy': 'bundleBusy', 'pouch-empty': 'deliveryEmpty' };
  toast(keys[reason] ?? 'refused'); audio.refuse();
}
function commit(result, type, options = {}) {
  if (!result.ok) { failure(result.reason); return false; }
  if (['reserve', 'output', 'withdraw'].includes(type)) heldCash = true;
  if (['pickup', 'open', 'dump', 'feed', 'drop'].includes(type)) heldCash = false;
  operations++;
  const audit = ledger.verify();
  if (!audit.ok) { errors.push(audit.errors); throw new Error('Money invariant failed'); }
  const event = { type, ids: result.ids, moved: result.moved, time: elapsed, value: audit.totalValue, ...options };
  events.push(event); if (events.length > 240) events.shift();
  scene.sync(ledger, event);
  if (['pickup', 'dump', 'open', 'reserve', 'feed'].includes(type)) audio.paper(type === 'dump' ? 1.3 : .8);
  if (['drop', 'store', 'withdraw', 'output'].includes(type)) audio.contact((result.ids ?? []).some(id => ledger.entities.find(e => e.id === id)?.type === 'bundle'));
  if (type === 'bind') audio.bundle();
  if (type === 'eject') landingSounds.push({ at: elapsed + .6, id: result.entity?.id ?? result.ids?.[0] });
  update(); return true;
}
function phaseOf() {
  const hand = ledger.getEntities('hand');
  if (hand.length) return hand.some(e => e.type === 'bundle') || heldCash ? 'store' : 'feed';
  if (ledger.getEntities('table').length) return 'pick';
  if (ledger.getEntities('input').length) return 'wait';
  if (bindingEntity(10) || bindingEntity(20)) return 'bind';
  if (ledger.getEntities('output').length) return 'output';
  if (reserveCount(10) || reserveCount(20)) return 'reserve';
  if (ledger.getEntities('pouch').length) return counted ? 'delivery' : 'dump';
  return 'done';
}
function updateGestureHint() {
  const hand = ledger.getEntities('hand'); let key = 'gesturePick';
  if (scene?.look) key = 'lookActive';
  else if (hand.some(e => e.type === 'bundle')) key = 'chooseSlot';
  else if (hand.length) key = hoverTarget === 'combined' ? 'gestureCombined' : heldCash ? 'gestureHeldCash' : 'gestureCarry';
  else if (phase === 'reserve') key = 'gestureReserve';
  else if (['dump', 'delivery', 'wait', 'bind', 'done'].includes(phase)) key = phase + 'Detail';
  else if (phase === 'output') key = 'gestureOutput';
  $('gesture-hint').textContent = text(key);
  if ($('hint')) $('hint').textContent = text(scene?.look ? 'lookActive' : 'canvasHint');
}
function update() {
  phase = phaseOf(); const hand = ledger.getEntities('hand');
  $('total').textContent = money(ledger.totalValue); $('integrity').textContent = text('integrity', { count: ledger.notes.length });
  $('hand').textContent = hand.length ? text('handSummary', { objects: hand.length, notes: hand.reduce((n, e) => n + e.noteIds.length, 0), value: money(hand.reduce((n, e) => n + ledger.denomination(e) * e.noteIds.length, 0)) }) : text('emptyHand');
  $('step').textContent = ({ dump: '01', delivery: '01', pick: '02', feed: '03', wait: '03', reserve: '04', bind: '05', output: '06', store: '06', done: '06' })[phase];
  $('instruction-title').textContent = text(phase + 'Title'); $('instruction-detail').textContent = text(phase + 'Detail');
  $('primary').textContent = text(phase === 'done' ? 'restartAction' : phase + 'Action'); $('primary').disabled = scene.look || ['wait', 'bind', 'reserve'].includes(phase);
  $('drop').disabled = scene.look || !hand.length; $('open').disabled = scene.look || !hand.some(e => e.type === 'bundle');
  const showHelp = assistance || (phase === 'dump' && !storageOpen && $('comparison').hidden);
  $('assist-panel').hidden = !showHelp; $('assist').classList.toggle('active', showHelp); $('assist').ariaExpanded = String(showHelp);
  $('storage-panel').hidden = !storageOpen; $('storage-toggle').classList.toggle('active', storageOpen); $('storage-toggle').ariaExpanded = String(storageOpen);
  $('machine-count').textContent = String(counted).padStart(3, '0');
  $('machine-state').textContent = text(ledger.getEntities('input').length ? 'counting' : counted ? 'reserveIdle' : 'ready');
  const remaining = ledger.getEntities('pouch').length;
  $('next-delivery').textContent = text(remaining ? 'deliveryAction' : 'deliveryEmpty', { count: remaining });
  $('next-delivery').disabled = !started || scene.look || !remaining; $('bundle-size').value = String(ledger.bundleSize);
  for (const d of [10, 20]) {
    const count = reserveCount(d), binding = bindingEntity(d);
    $('reserve' + d + '-count').textContent = String(count); $('reserve' + d + '-value').textContent = money(count * d);
    $('reserve' + d + '-state').textContent = text(binding ? 'reserveBinding' : !autoBundle() ? 'reservePaused' : count ? 'reserveProgress' : 'reserveIdle', { count: binding?.noteIds.length ?? count, target: ledger.bundleSize });
    $('take' + d).textContent = text('withdrawalAction', { count: Math.min(withdrawalQuantity(), count, Math.max(0, 100 - ledger.handObjects)) });
    $('take' + d).ariaLabel = text('take' + d + 'Label');
    $('take' + d).disabled = !started || scene.look || !count || ledger.handObjects >= 100;
  }
  for (let i = 0; i < 5; i++) {
    const contents = ledger.getEntities('slot' + i), form = ledger.slots[i].form, button = $('slots').children[i];
    button.innerHTML = '<span>' + (i + 1) + '</span><small>' + (contents.length ? contents.length + '/' + (form === 'bundle' ? 10 : 100) : form ? text(form === 'bundle' ? 'slotBundle' : 'slotNote') : text('empty')) + '</small>';
    button.classList.toggle('active', i === selectedSlot); button.ariaLabel = (i + 1) + ' · ' + (form ? text(form === 'bundle' ? 'slotBundle' : 'slotNote') : text('empty')) + ' · ' + contents.length;
  }
  $('store').disabled = scene.look || !hand.length; $('withdraw').disabled = scene.look || !ledger.getEntities('slot' + selectedSlot).length;
  $('clear').disabled = scene.look || ledger.getEntities('slot' + selectedSlot).length > 0 || ledger.slots[selectedSlot].form === null;
  scene.setMachineState?.({ reserves: { 10: reserveCount(10), 20: reserveCount(20) }, target: ledger.bundleSize, autoBundle: autoBundle(), binding: { 10: !!bindingEntity(10), 20: !!bindingEntity(20) }, counted });
  updateGestureHint(); updateHotspots();
}
function updateHotspots() {
  const spot = scene.getHotspots().combined, button = $('target-combined'), held = ledger.handObjects > 0;
  button.hidden = !started || !spot?.visible;
  if (spot) { button.style.left = spot.x + 'px'; button.style.top = spot.y + 'px'; }
  button.disabled = scene.look || !held; button.classList.toggle('ready', held); button.classList.toggle('hot', hoverTarget === 'combined');
  const canvasRect = $('scene').getBoundingClientRect?.(), regions = {};
  if (!button.hidden && canvasRect && button.getBoundingClientRect) {
    const r = button.getBoundingClientRect(); regions.combined = { left: r.left - canvasRect.left, top: r.top - canvasRect.top, right: r.right - canvasRect.left, bottom: r.bottom - canvasRect.top };
  }
  scene.setIntakeRegions?.(regions);
}
function gather() {
  if (!started || scene.look) return;
  const room = 100 - ledger.handObjects;
  if (room <= 0) { stopGather(); return; }
  const amount = gatherStarted ? Math.min(16, 3 + Math.floor((performance.now() - gatherStarted) / 160)) : 24;
  const ids = ledger.getEntities('table').filter(e => e.type === 'note' || !ledger.handObjects).slice(0, Math.min(amount, room)).map(e => e.id);
  if (ids.length) commit(ledger.pickup(ids), 'pickup'); else stopGather();
}
function stopGather() { clearInterval(gatherTimer); gatherTimer = null; gatherStarted = 0; }
function deliver() { return commit(ledger.dumpDelivery(), 'dump'); }
function feed() { return commit(ledger.feed(), 'feed'); }
function takeReserve(d) { return commit(ledger.takeReserve(d, withdrawalQuantity()), 'reserve', { denomination: d }); }
function takeOutput(id) { return commit(ledger.takeOutput(id), 'output'); }
function perform() {
  if (!started || scene.look) return;
  switch (phase) {
    case 'dump': case 'delivery': return deliver();
    case 'pick': return gather();
    case 'feed': return feed();
    case 'output': return takeOutput();
    case 'store': if (commit(ledger.store(selectedSlot), 'store')) toast('stored'); return;
    case 'done': return reset(mode);
  }
}
function reset(nextMode) {
  stopGather(); audio.stop(); mode = nextMode; ledger = new CashLedger(mode); counted = 0; tickClock = 0;
  bindingDeadlines[10] = bindingDeadlines[20] = 0; landingSounds.length = 0;
  heldCash = false; hoverTarget = null; assistance = false; storageOpen = false; $('comparison').hidden = true;
  $('auto-bundle').checked = true; $('withdrawal-quantity').value = '10'; selectedSlot = 0; scene.reset(); scene.sync(ledger);
  $('small').classList.toggle('active', mode === 'small'); $('large').classList.toggle('active', mode === 'large'); update(); toast('lotReset');
}
function select(action) {
  if (action.action === 'hover-target') { hoverTarget = action.target; updateGestureHint(); return true; }
  if (!started || scene.look) return false;
  if (action.action === 'handful') {
    const candidates = new Set(action.ids ?? []), ids = ledger.getEntities('table').filter(e => candidates.has(e.id)).slice(0, 100 - ledger.handObjects).map(e => e.id);
    return ids.length > 0 && commit(ledger.pickup(ids), 'pickup');
  }
  if (action.action === 'note') return commit(ledger.pickup([action.id]), 'pickup');
  if (['combined', 'machine', 'sorter'].includes(action.action)) return feed();
  if (action.action === 'reserve') return takeReserve(action.denomination);
  if (action.action === 'pouch') return ledger.getEntities('pouch').length > 0 && deliver();
  if (action.action === 'drop') return ledger.handObjects > 0 && commit(ledger.dropHand(), 'drop', { position: action.position });
  if (action.action === 'output') {
    const e = action.id ? ledger.entities.find(item => item.id === action.id) : null;
    if (e?.location === 'table') return commit(ledger.pickup([e.id]), 'pickup');
    if (e?.location.startsWith('slot')) { selectedSlot = Number(e.location.slice(4)); return commit(ledger.withdraw(selectedSlot), 'withdraw'); }
    return takeOutput(action.id);
  }
  if (action.action === 'slot') {
    selectedSlot = action.index; $('slot-actions').hidden = false;
    if (ledger.handObjects) return commit(ledger.store(selectedSlot), 'store');
    if (ledger.getEntities('slot' + selectedSlot).length) return commit(ledger.withdraw(selectedSlot), 'withdraw');
    update();
  }
  return false;
}
for (let i = 0; i < 5; i++) { const b = document.createElement('button'); b.addEventListener('click', () => { selectedSlot = i; $('slot-actions').hidden = false; update(); }); $('slots').appendChild(b); }
try { scene = new CashScene($('scene'), select); scene.sync(ledger); }
catch (error) { errors.push(String(error)); $('start').disabled = true; $('start').textContent = text('error'); throw error; }
$('start').addEventListener('click', async () => { const ok = await audio.unlock(); started = true; $('welcome').hidden = true; if (!ok) toast('audioUnavailable'); update(); });
$('primary').addEventListener('pointerdown', e => { if (phase !== 'pick' || scene.look || !started) return; e.preventDefault(); skipClick = true; $('primary').setPointerCapture(e.pointerId); gatherStarted = performance.now(); gather(); gatherTimer = setInterval(gather, 100); });
$('primary').addEventListener('pointerup', () => { stopGather(); setTimeout(() => skipClick = false, 50); });
$('primary').addEventListener('pointercancel', () => { stopGather(); skipClick = false; });
$('primary').addEventListener('click', () => { if (!skipClick) perform(); });
$('next-delivery').addEventListener('click', () => { if (started && !scene.look) deliver(); });
$('target-combined').addEventListener('click', () => { if (started && !scene.look) feed(); });
for (const d of [10, 20]) $('take' + d).addEventListener('click', () => { if (started && !scene.look) takeReserve(d); });
$('withdrawal-quantity').addEventListener('change', update);
$('bundle-size').addEventListener('change', e => { if (commit(ledger.setBundleSize(Number(e.target.value)), 'target')) toast('targetChanged'); });
$('auto-bundle').addEventListener('change', () => { update(); toast(autoBundle() ? 'formingResumed' : 'formingPaused'); });
$('drop').addEventListener('click', () => { if (commit(ledger.dropHand(), 'drop')) toast('dropped'); });
$('open').addEventListener('click', () => { if (commit(ledger.openHand(), 'open')) toast('opened'); });
$('store').addEventListener('click', () => { if (commit(ledger.store(selectedSlot), 'store')) toast('stored'); });
$('withdraw').addEventListener('click', () => { if (commit(ledger.withdraw(selectedSlot), 'withdraw')) toast('withdrawn'); });
$('clear').addEventListener('click', () => { if (commit(ledger.clearSlot(selectedSlot), 'clear')) toast('cleared'); });
$('small').addEventListener('click', () => reset('small')); $('large').addEventListener('click', () => reset('large')); $('reset').addEventListener('click', () => reset(mode));
$('assist').addEventListener('click', () => { assistance = !assistance; if (assistance) { storageOpen = false; $('comparison').hidden = true; } update(); });
$('storage-toggle').addEventListener('click', () => { storageOpen = !storageOpen; if (storageOpen) { assistance = false; $('comparison').hidden = true; } update(); });
$('settings').addEventListener('click', () => { $('comparison').hidden = !$('comparison').hidden; if (!$('comparison').hidden) { assistance = false; storageOpen = false; } update(); });
$('volume').addEventListener('input', e => audio.setVolume(Number(e.target.value)));
$('effects').addEventListener('change', e => scene.setEffects(e.target.checked));
$('mute').addEventListener('click', async () => { muted = !muted; audio.setEnabled(!muted); if (!muted) await audio.unlock(); $('mute').textContent = text(muted ? 'unmute' : 'mute'); });
$('look').addEventListener('click', () => { scene.look = !scene.look; stopGather(); hoverTarget = null; $('look').classList.toggle('active', scene.look); $('look').textContent = text(scene.look ? 'manipulate' : 'look'); update(); });
$('reframe').addEventListener('click', () => scene.resetCamera()); $('language').addEventListener('click', () => { language = language === 'fr' ? 'en' : 'fr'; translate(); });
window.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT'].includes(document.activeElement?.tagName) && e.code !== 'F7') return;
  if (e.code === 'F7') { e.preventDefault(); $('effects').checked = !$('effects').checked; scene.setEffects($('effects').checked); }
  if (!started || scene.look || e.repeat) return;
  if (e.code === 'KeyE') perform();
  if (e.code === 'KeyT' && ledger.handObjects) commit(ledger.dropHand(), 'drop');
  if (e.code === 'KeyF') { gatherStarted = performance.now(); gather(); gatherTimer = setInterval(gather, 100); }
});
window.addEventListener('keyup', e => { if (e.code === 'KeyF') stopGather(); }); window.addEventListener('blur', stopGather);
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopGather(); audio.stop(); tickClock = 0; } });
let last = performance.now();
function frame(now) {
  const realDt = (now - last) / 1000; last = now; const dt = document.hidden ? 0 : Math.min(realDt, .06); elapsed += dt;
  if (started && dt) {
    const rate = Number($('pace').value); tickClock += dt; let budget = 3;
    while (tickClock >= 1 / rate && ledger.getEntities('input').length && budget-- > 0) {
      tickClock -= 1 / rate; const result = ledger.tickMachine();
      if (commit(result, 'tick', { denomination: ledger.denomination(result.entity) })) { counted++; audio.tick(counted); scene.updateDisplay?.(counted); update(); }
    }
    if (!ledger.getEntities('input').length) tickClock = 0;
    for (const d of [10, 20]) {
      if (bindingEntity(d) && elapsed + 1e-8 >= bindingDeadlines[d]) {
        const size = bindingEntity(d).noteIds.length; if (commit(ledger.eject(d), 'eject', { denomination: d, size })) bindingDeadlines[d] = 0;
      }
      if (autoBundle() && !bindingEntity(d) && reserveCount(d) >= ledger.bundleSize) {
        const result = ledger.bind(d);
        if (result.ok) { bindingDeadlines[d] = elapsed + .9; commit(result, 'bind', { denomination: d, size: result.entity.noteIds.length, bundleId: result.entity.id }); }
        else failure(result.reason);
      }
    }
    for (let i = landingSounds.length - 1; i >= 0; i--) {
      if (landingSounds[i].at > elapsed) continue;
      if (ledger.getEntities('output').some(e => e.id === landingSounds[i].id)) audio.contact(true);
      landingSounds.splice(i, 1);
    }
  }
  scene.step(dt, realDt); updateHotspots(); requestAnimationFrame(frame);
}
translate(); requestAnimationFrame(frame);
window.addEventListener('error', e => errors.push(String(e.message))); window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
window.cashDiagnostics = () => ({ version: 'v03', scenario: mode, circuit: 'integrated', operations, counted, autoBundle: autoBundle(), bindingDeadlines: { ...bindingDeadlines }, audit: ledger.verify(), snapshot: ledger.snapshot(), audio: audio.metrics, render: scene.metrics, events: [...events], errors: [...errors], view: 'fps', effects: scene.effects });

