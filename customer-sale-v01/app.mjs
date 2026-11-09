import { CATALOG, createSession, dispatch, tick, getView, verify } from './model.mjs?v=20261109b';
import { SaleScene } from './scene.mjs?v=20261109b';
import { SaleAudio } from './audio.mjs?v=20261109b';

const $ = id => document.getElementById(id);
const dictionaries = await fetch('./texts.json?v=20261109b').then(response => { if (!response.ok) throw new Error('Text table unavailable'); return response.json(); });
let language = 'fr', enhanced = true, muted = false, running = false;
let focused = document.hasFocus ? document.hasFocus() : true;
let state = createSession('normal'), toastUntil = 0, lastFrame = performance.now(), pointer = null, controlsStamp = '';
const audio = new SaleAudio();
const scene = new SaleScene($('world'), { onContact: event => audio.play(event.type) });
const t = key => dictionaries[language][key] || dictionaries[language]['no-action'];
const money = value => `${value} €`;
const label = item => item.kind === 'bill' ? money(item.denomination) : `${t(CATALOG.find(product => product.key === item.sku)?.nameKey || 'bag')} ${item.grams || ''} g`;
function showToast(message) { $('toast').textContent = message; toastUntil = performance.now() + 1700; $('toast').classList.add('show'); }

function act(action, silent = false) {
  const result = dispatch(state, action);
  if (result.ok) {
    verify(state);
    scene.pulse(result.event);
    if (!['drop', 'giveProduct', 'giveBill', 'confirm'].includes(action.type)) audio.play(result.event);
    if (action.type === 'confirm') showToast(`${t('sale')} +${money(state.sales.at(-1).price)}`);
    else if (result.event === 'declined') showToast(t('declined'));
    else if (action.type === 'cancel') showToast(t('cancelled'));
  } else if (!silent) { const aliases = {'payment-not-exact':'wrong-change','hand-occupied':'hand-full','price-out-of-range':'invalid-price'}; showToast(t(aliases[result.reason] || result.reason)); audio.play('error'); }
  render();
  return result;
}

function primaryAction() {
  if (!running || !$('intro').hidden) return;
  if (state.phase === 'approach') act({ type: 'talk' });
  else if (['request', 'hesitation', 'payment'].includes(state.phase)) act({ type: 'confirm' });
  else if (state.phase === 'closed') { running = false; $('intro').hidden = false; }
}

function updateLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-text]').forEach(node => node.textContent = t(node.dataset.text));
  $('language').textContent = language === 'fr' ? 'EN' : 'FR';
  $('feel').textContent = t(enhanced ? 'feel' : 'plain');
  $('sound').title = t(muted ? 'muted' : 'soundOn');
  scene.setLabels?.({bag:t('bag')});
  render();
}

function render() {
  const view = getView(state), edit = ['request', 'hesitation'].includes(state.phase), payment = edit || state.phase === 'payment';
  $('queue').textContent = `${view.queueCount} / 5 ${t('queue')}`;
  const remaining = Math.max(0, Math.ceil(state.config.serviceSeconds - state.elapsed));
  $('clock').textContent = !running || !focused || !$('help').hidden ? t('paused') : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  $('bubble').hidden = !view.current || !running;
  $('name').textContent = view.current?.name || '';
  $('request').textContent = view.request && !['receipt', 'departing'].includes(state.phase) ? t('requestSentence').replace('{items}', view.request.map(line => { const item = CATALOG.find(product => product.key === line.sku); return `${t(item.nameKey)} ${item.grams * line.count} g`; }).join(' + ')) : '';
  $('reaction').textContent = t(state.phase === 'approach' ? 'welcome' : state.phase === 'hesitation' ? 'hesitationReason' : payment ? 'accepted' : state.phase === 'receipt' || state.phase === 'departing' ? (view.current?.status === 'served' ? 'thanks' : 'declined') : 'requestHint');
  if (state.phase === 'request') $('reaction').textContent = '';
  $('hesitation').hidden = state.phase !== 'hesitation';
  $('timerFill').style.width = `${state.hesitationLeft / 5 * 100}%`;
  $('timerText').textContent = state.hesitationFrozen ? t('timerFrozen') : `${state.hesitationLeft.toFixed(1)} s · ${t('timerRunning')}`;
  $('payment').hidden = !payment;
  $('received').textContent = money(view.received); $('due').textContent = money(view.due); $('returned').textContent = money(view.returned);
  $('returned').classList.toggle('exact', view.exact);
  $('price').hidden = !edit || !view.tray.length;
  $('priceValue').textContent = money(state.offerPrice);
  $('minus').disabled = state.offerPrice <= 5 || !!state.dragId;
  $('plus').disabled = state.offerPrice >= view.normalPrice || !!state.dragId;
  $('primary').textContent = t(state.phase === 'approach' ? 'talk' : payment ? 'confirm' : state.phase === 'closed' ? 'closed' : 'wait');
  $('primary').disabled = payment ? !view.canConfirm : !['approach', 'closed'].includes(state.phase);
  $('cancel').hidden = !['request', 'hesitation', 'payment'].includes(state.phase);
  $('hint').textContent = t(state.dragId ? 'dragHint' : state.phase === 'approach' ? 'approachHint' : edit ? 'requestHint' : payment ? 'paymentHint' : state.phase === 'closed' ? 'closedHint' : view.outstandingReceipts.length ? 'receiptHint' : 'waitingHint');
  const parcelHeld = view.hand.some(item => item.kind === 'prop');
  $('receiptHint').hidden = !parcelHeld;
  $('receiptMessage').textContent = t('parcelInHand');
  $('collect').hidden = true;
  $('stow').hidden = !parcelHeld;
  if (!$('help').hidden) updateAccessibleControls(view);
}

function makeButton(container, title, action, disabled = false) {
  const button = document.createElement('button'); button.textContent = title; button.disabled = disabled; button.onclick = () => act(action); container.append(button);
}
function updateAccessibleControls(view) {
  const stamp = JSON.stringify([language,state.phase,state.dragId,state.objects.map(item=>[item.id,item.location])]);
  if (stamp === controlsStamp) return;
  controlsStamp = stamp;
  $('productButtons').replaceChildren(); $('billButtons').replaceChildren(); $('retakeButtons').replaceChildren();
  CATALOG.forEach((item, slot) => makeButton($('productButtons'), `${slot + 1} · ${t(item.nameKey)} ${item.grams} g ×${view.slots[slot].length}`, {type:'giveProduct',slot}, !['request','hesitation','payment'].includes(state.phase) || !view.slots[slot].length || !!state.dragId));
  [5,10,20,50,100].forEach(denomination => makeButton($('billButtons'), `${denomination} € ×${view.fund.filter(item => item.denomination === denomination).length}`, {type:'giveBill',denomination}, !['request','hesitation','payment'].includes(state.phase) || !!state.dragId));
  [...view.tray, ...view.change].forEach(item => makeButton($('retakeButtons'), `${t('retake')} ${label(item)}`, {type:'retake',id:item.id}));
  view.receipts.forEach(item => makeButton($('retakeButtons'), `${t('collect')} ${label(item)}`, {type:'collect',id:item.id}, view.handFull));
  if (state.dragId) { makeButton($('retakeButtons'), t('layHeld'), {type:'drop',target:'tray'}); makeButton($('retakeButtons'), t('returnHeld'), {type:'cancelDrag'}); }
}

$('primary').onclick = primaryAction;
$('cancel').onclick = () => act({ type: 'cancel' });
$('minus').onclick = () => act({ type: 'adjustPrice', delta: -5 });
$('plus').onclick = () => act({ type: 'adjustPrice', delta: 5 });
$('collect').onclick = () => { const item = getView(state).receipts[0]; if (item) act({type:'collect',id:item.id}); };
$('stow').onclick = () => act({type:'stow'});
$('start').onclick = async () => { await audio.unlock(); state = createSession($('scenario').value); running = true; $('intro').hidden = true; $('help').hidden = true; pointer = null; lastFrame = performance.now(); scene.pulse('reset'); render(); };
$('sound').onclick = async () => { await audio.unlock(); muted = !muted; audio.setMuted(muted); $('sound').textContent = muted ? '♪ ×' : '♪'; $('sound').title = t(muted ? 'muted' : 'soundOn'); };
$('feel').onclick = () => { enhanced = !enhanced; audio.setEnhanced(enhanced); scene.setEnhanced(enhanced); $('feel').textContent = t(enhanced ? 'feel' : 'plain'); };
$('language').onclick = () => { language = language === 'fr' ? 'en' : 'fr'; updateLanguage(); };
$('helpButton').onclick = () => { $('help').hidden = !$('help').hidden; render(); };
$('closeHelp').onclick = () => { $('help').hidden = true; render(); };
$('newSession').onclick = () => { running = false; $('help').hidden = true; $('intro').hidden = false; render(); };

$('world').addEventListener('pointerdown', event => {
  if (!running || !$('help').hidden || pointer || event.button > 0) return;
  audio.unlock();
  const item = scene.pick(event.clientX, event.clientY);
  pointer = { id:event.pointerId, x:event.clientX, y:event.clientY, item, moved:false, existing:!!state.dragId };
  $('world').setPointerCapture(event.pointerId);
  if (!state.dragId && item && (item.location === 'fund' || item.location.startsWith('slot:'))) act({type:'take',id:item.id}, true);
  if (state.dragId) scene.setDrag(event.clientX, event.clientY);
});
$('world').addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 7) pointer.moved = true;
  if (state.dragId) scene.setDrag(event.clientX, event.clientY);
});
$('world').addEventListener('pointerup', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const start = pointer; pointer = null;
  if (state.dragId) {
    const target = scene.dropTarget(event.clientX,event.clientY);
    if (target && (start.moved || start.existing)) act({type:'drop',target});
    else if (start.moved) act({type:'cancelDrag'});
  } else if (start.item && !start.moved) {
    if (['tray','change'].includes(start.item.location)) act({type:'retake',id:start.item.id});
    else if (start.item.location === 'receipt') act({type:'collect',id:start.item.id});
    else if (start.item.location === 'hand') act({type:'stow'});
  }
  if ($('world').hasPointerCapture(event.pointerId)) $('world').releasePointerCapture(event.pointerId);
});
$('world').addEventListener('pointercancel', () => { pointer = null; if (state.dragId) act({type:'cancelDrag'},true); });
window.addEventListener('blur', () => { focused = false; pointer = null; if (state.dragId) act({type:'cancelDrag'},true); render(); });
window.addEventListener('focus', () => { focused = true; lastFrame = performance.now(); render(); });
document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now();
  if (document.hidden) {
    if (pointer && $('world').hasPointerCapture(pointer.id)) $('world').releasePointerCapture(pointer.id);
    pointer = null;
    if (state.dragId) act({type:'cancelDrag'},true);
  }
});
window.addEventListener('keydown', event => {
  if (!running || event.repeat || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if (key === 'escape') { if (!$('help').hidden) $('help').hidden = true; else if (state.dragId) act({type:'cancelDrag'}); return; }
  if (!$('help').hidden) return;
  if (/^[1-5]$/.test(key)) { event.preventDefault(); act({type:'giveProduct',slot:Number(key)-1}); }
  if (key === 'e' || key === ' ') { event.preventDefault(); primaryAction(); }
  if (key === 'r') { event.preventDefault(); act({type:'stow'}); }
});
window.addEventListener('resize', () => scene.resize());
function frame(now) {
  const dt = Math.min(.1, Math.max(0,(now-lastFrame)/1000)); lastFrame = now;
  const previous = state.phase;
  if (running && focused && !document.hidden && $('help').hidden && $('intro').hidden) tick(state, dt);
  if (previous === 'hesitation' && state.phase === 'departing') { showToast(t('hesitation-expired')); scene.pulse('declined'); }
  scene.update(state,getView(state),dt);
  render();
  if (now > toastUntil) $('toast').classList.remove('show');
  requestAnimationFrame(frame);
}
updateLanguage(); requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has('debug')) window.SALE = { get state(){return state;}, get view(){return getView(state);}, dispatch:act, verify:()=>verify(state), scene };
