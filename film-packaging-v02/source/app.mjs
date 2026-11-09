import {Workshop} from './model.mjs';
import {WorkshopView} from './scene.mjs';
import {WorkshopAudio} from './audio.mjs';
import {strings} from './strings.mjs';
const $=id=>document.getElementById(id);
const model=new Workshop();const audio=new WorkshopAudio();audio.setVolume(.35);
let lang='fr',slot=0,view,hold=null,ready=false,moving=false,holding=false,targetPackageId=null,targetItemId=null;
const t=key=>strings[lang][key]??key;
const toast=key=>{$('toast').textContent=t(key);};
const fmtMass=mg=>`${new Intl.NumberFormat(lang,{maximumFractionDigits:2}).format(mg/1000)} g`;
const fmtMoney=cents=>new Intl.NumberFormat(lang,{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(cents/100);
const packageSlot=p=>{const body=view?.physics?.get(`package:${p.id}`);if(!body)return p.slot;const {x,y,z}=body.position;if(y<-.1||Math.abs(x)>1.25||z<-.81||z>.89)return 'ground';return typeof p.slot==='number'?p.slot:Math.max(0,Math.min(2,Math.round((z+.42)/.42)));};
const topPackage=()=>model.state.packages.find(p=>p.id===targetPackageId&&!p.held)??model.state.packages.filter(p=>!p.held&&packageSlot(p)===slot).at(-1);
function refreshPackageControls(){
  const s=model.state,busy=s.phase!=='idle'||moving||!ready;
  $('pick').disabled=busy||!!s.handIds.length||!!s.heldPackageId||!topPackage();
  $('open').disabled=busy||!!s.handIds.length||!(s.heldPackageId||topPackage());
  document.querySelectorAll('[data-slot]').forEach(b=>{const value=b.dataset.slot==='ground'?'ground':Number(b.dataset.slot);b.classList.toggle('active',value===slot);b.disabled=busy;const n=s.packages.filter(p=>!p.held&&packageSlot(p)===value).length;$(`slot-${b.dataset.slot}`).textContent=n?`${n} ◇`:'—';});
}
function check(result){if(result.ok)return true;$('toast').textContent=strings[lang].reason[result.reason]??result.reason;audio.play('refuse');return false;}
function cashDetails(bills){const counts=new Map();for(const bill of bills)counts.set(bill.cents,(counts.get(bill.cents)??0)+1);return [...counts].map(([cents,count])=>`${count} × ${fmtMoney(cents)}`).join(' + ');}
function sync(){
  const s=model.state;const busy=s.phase!=='idle'||moving||!ready;if(ready)view?.sync(s,slot);
  const held=s.heldPackageId?s.packages.find(p=>p.id===s.heldPackageId).itemIds:s.handIds;
  $('held-count').textContent=held.length;
  $('held-mass').textContent=s.scenario==='liasses'?fmtMoney(held.reduce((n,id)=>n+s.items[id].cents,0)):fmtMass(held.reduce((n,id)=>n+s.items[id].mg,0));
  $('held-state').textContent=t(s.heldPackageId?'wrapped':'loose');
  const firstHeld=s.items[held[0]],stackSummary=$('stack-summary');
  stackSummary.hidden=!(firstHeld?.kind==='cashBundle'||(firstHeld?.kind==='slab'&&firstHeld.formatMg===100000));
  if(!stackSummary.hidden){const full=Math.floor(held.length/5),partial=held.length%5;stackSummary.textContent=(full?t(full===1?'oneFullStack':'fullStacks').replace('{count}',full):'')+(partial?(full?' + ':'')+t('partialStack').replace('{count}',partial):'');}

  $('rule').textContent=t(s.scenario==='plaquettes'?'ruleSlabs':s.scenario==='liasses'?'ruleCash':'ruleDemo');
  $('pile').replaceChildren(...s.piles.map(p=>{const el=document.createElement('option');el.value=p.id;el.textContent=`${t(p.label)} · ${p.itemIds.length}`;return el;}));$('pile').value=s.targetPileId;
  $('pile').disabled=busy||!!s.heldPackageId;
  $('take').disabled=!ready||busy||!!s.heldPackageId||view?.look;
  $('return').disabled=busy||!s.handIds.length;
  $('wrap').disabled=!ready||busy||!s.handIds.length||!!s.heldPackageId||view?.look;
  $('place').disabled=busy||!s.heldPackageId;
  $('pick').disabled=busy||!!held.length||!topPackage();
  $('open').disabled=busy||!!s.handIds.length||!(s.heldPackageId||topPackage());
  $('drop').disabled=busy||!held.length;
  $('ground-view').textContent=t(view?.groundView?'tableView':'groundView');
  for(const id of ['reset','speed','film','enhanced','language','look','reframe','zoom-in','zoom-out','ground-view'])$(id).disabled=busy;
  document.querySelectorAll('[data-scenario]').forEach(b=>{b.classList.toggle('active',b.dataset.scenario===s.scenario);b.disabled=busy;});
  refreshPackageControls();
  ['step1','step2','step3'].forEach((id,i)=>$(id).classList.toggle('current',s.heldPackageId?i===2:busy?i===1:i===0));
  const contents=$('contents');contents.replaceChildren();
  const displayed=held.length?held:(topPackage()?.itemIds??s.piles.find(p=>p.id===s.targetPileId)?.itemIds??[]);
  for(const id of displayed){const item=s.items[id];const row=document.createElement('div');row.className='content-item';const label=document.createElement('span');label.textContent=`${t(item.label)} ${id.split('-').at(-1)} · ${item.kind==='cashBundle'?fmtMoney(item.cents):fmtMass(item.mg)}`;const small=document.createElement('small');small.textContent=item.kind==='cashBundle'?cashDetails(item.bills):`${item.variety} · ${t(item.quality)} · ${item.provenance.map(p=>`${p.lotId}: ${fmtMass(p.mg)}`).join(' + ')}`;label.append(small);row.append(label);if(s.handIds.includes(id)){const b=document.createElement('button');b.textContent=t('remove');b.disabled=busy;b.onclick=()=>returnItems([id]);row.append(b);}contents.append(row);}
  if(s.handIds.length>1){const b=document.createElement('button');b.textContent=t('allBack');b.disabled=busy;b.onclick=()=>returnItems([...s.handIds]);contents.append(b);}
  const audit=model.audit();$('audit').textContent=t(audit.ok?'audit':'auditFail');document.body.classList.toggle('failed',!audit.ok);
  if(!audit.ok){console.error('Conservation error',audit.errors);ready=false;}
}
function take(){if(!ready||moving||view.look)return false;const r=model.takeOne(targetItemId);targetItemId=null;if(!check(r)){stopHold();return false;}audio.play('pickup');sync();view.pulse('pickup');toast('takeSuccess');return true;}
let holdTaken=0;
function repeatHold(){
  if(!holding)return;
  if(!take()){stopHold();return;}
  holdTaken++;
  const first=model.state.items[model.state.handIds[0]];
  const stackBoundary=(first?.kind==='cashBundle'||(first?.kind==='slab'&&first.formatMg===100000))&&model.state.handIds.length%5===0;
  const interval=Math.max(160,210-2*(holdTaken-2));
  hold=setTimeout(repeatHold,interval+(stackBoundary?110:0));
}
function startHold(){if(holding||$('take').disabled)return;holding=true;holdTaken=0;if(take()){holdTaken=1;hold=setTimeout(repeatHold,280);}else stopHold();}
function stopHold(){clearTimeout(hold);hold=null;holding=false;holdTaken=0;}
function returnItems(ids){if(check(model.returnItems(ids))){if(!view.physics)audio.play('place');sync();toast('returnFinish');}}
function wrap(){stopHold();if(!ready||moving||view.look)return;if(!check(model.startWrap()))return;const duration=Number($('speed').value);sync();toast('wrapStart');audio.play('wrapStart',duration*.8);view.animate('wrap',duration,()=>{if(check(model.finishWrap())){audio.play('wrapFinish');sync();toast('wrapFinish');}});}
function place(){if(!ready||moving)return;const id=model.state.heldPackageId,from=view.held?.position.toArray();if(check(model.placePackage(slot))){moving=true;sync();view.animateMove(id,from,.20,()=>{moving=false;if(!view.physics)audio.play('place');sync();toast('placeFinish');});}}
function pick(){if(!ready||moving)return;const p=topPackage(),from=p?view.packageViews[p.id]?.position.toArray():null;if(check(model.pickPackage(p?.id))){moving=true;sync();audio.play('pickup');view.animateMove(p.id,from,.18,()=>{moving=false;sync();view.pulse('pickup');toast('pickFinish');});}}
function open(){stopHold();if(!ready||moving)return;const p=model.state.packages.find(p=>p.id===model.state.heldPackageId)??topPackage();if(!p){check({ok:false,reason:'unknown-package'});return;}if(check(model.startOpen(p.id))){sync();toast('openStart');audio.play('openStart');view.animate('open',.38,()=>{if(check(model.finishOpen())){targetPackageId=null;targetItemId=null;audio.play('openFinish');sync();toast('openFinish');}},p.id);}}
function drop(){stopHold();if(!ready||moving||view.look)return;if(check(model.dropSelection())){targetPackageId=null;targetItemId=null;slot='ground';sync();toast('dropFinish');}}
function applyLanguage(){document.documentElement.lang=lang;document.querySelectorAll('[data-t]').forEach(el=>{el.textContent=t(el.dataset.t);});$('language').textContent=lang==='fr'?'EN':'FR';$('language').setAttribute('aria-label',lang==='fr'?'English':'Français');for(const [id,key] of [['reframe','reframe'],['zoom-out','zoomOut'],['zoom-in','zoomIn'],['return','putLast'],['scene','sceneAria']]){$(id).setAttribute('aria-label',t(key));$(id).title=t(key);}document.querySelector('.scenario-tabs').setAttribute('aria-label',t('examplesAria'));document.querySelector('.slots').setAttribute('aria-label',t('slotAria'));$('look').textContent=t(view?.look?'manipulate':'look');$('sound').textContent=t(audio.enabled?'soundOff':'sound');sync();toast('welcome');}
$('language').onclick=()=>{lang=lang==='fr'?'en':'fr';applyLanguage();};
$('pile').onchange=()=>{if(check(model.selectPile($('pile').value))){targetItemId=null;targetPackageId=null;sync();toast('aimed');}};
$('take').onpointerdown=e=>{e.preventDefault();$('take').setPointerCapture(e.pointerId);startHold();};
$('take').onpointerup=stopHold;$('take').onpointercancel=stopHold;$('take').onlostpointercapture=stopHold;
$('take').onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();startHold();}};$('take').onkeyup=stopHold;
$('return').onclick=()=>returnItems([model.state.handIds.at(-1)]);$('wrap').onclick=wrap;$('place').onclick=place;$('pick').onclick=pick;$('open').onclick=open;$('drop').onclick=drop;
document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{slot=b.dataset.slot==='ground'?'ground':Number(b.dataset.slot);targetPackageId=null;sync();});
document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{stopHold();audio.stopAll();model.reset(b.dataset.scenario);slot=0;targetPackageId=null;targetItemId=null;sync();toast('welcome');});
$('reset').onclick=()=>{stopHold();audio.stopAll();model.reset(model.state.scenario);slot=0;targetPackageId=null;targetItemId=null;sync();$('progress').style.width='0%';toast('welcome');};
$('sound').onclick=async()=>{try{if(audio.enabled)audio.setEnabled(false);else await audio.enable();$('sound').textContent=t(audio.enabled?'soundOff':'sound');if(audio.enabled)audio.play('pickup');}catch{toast('audioFailed');}};
$('volume').oninput=()=>audio.setVolume(Number($('volume').value));$('enhanced').onchange=()=>{view.enhanced=$('enhanced').checked;audio.setEnhanced(view.enhanced);view.setFilm(Number($('film').value));};
$('film').oninput=()=>view.setFilm(Number($('film').value));$('look').onclick=()=>{stopHold();view.look=!view.look;$('look').classList.toggle('active',view.look);$('look').textContent=t(view.look?'manipulate':'look');sync();toast(view.look?'looking':'welcome');};
$('ground-view').onclick=()=>{stopHold();view.toggleGround();sync();};$('reframe').onclick=()=>{view.reframe();sync();};$('zoom-in').onclick=()=>{view.zoom=Math.max(.68,view.zoom-.12);view.updateCamera();};$('zoom-out').onclick=()=>{view.zoom=Math.min(1.5,view.zoom+.12);view.updateCamera();};
window.addEventListener('blur',stopHold);document.addEventListener('visibilitychange',()=>{if(document.hidden){stopHold();audio.stopAll();}});
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)||e.repeat)return;if(e.code==='Space'){e.preventDefault();startHold();}if(e.code==='KeyF')wrap();if(e.code==='KeyE')model.state.heldPackageId?place():pick();if(e.code==='KeyX')open();});window.addEventListener('keyup',e=>{if(e.code==='Space')stopHold();});
sync();
try{view=new WorkshopView($('scene'),action=>{if(!ready||moving||model.state.phase!=='idle')return;if(action.type==='pile'){if(check(model.selectPile(action.id))){targetItemId=action.itemId??null;targetPackageId=null;sync();toast('aimed');}}else if(action.type==='package'&&action.slot!==null){const packet=model.state.packages.find(p=>p.id===action.id);slot=packet?packageSlot(packet):action.slot;targetPackageId=action.id;sync();}});await view.init();view.physics.onContact=()=>audio.play('place');ready=true;$('loading').hidden=true;applyLanguage();setInterval(refreshPackageControls,250);}catch(e){console.error('Workshop initialization failed',e);$('loading').textContent=t('error');}
