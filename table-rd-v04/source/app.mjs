import {PARENTS,createState,transition,restoreState,getStrains,getOdds,TRAITS,getConfiguration} from './model.mjs';
import {strings} from './strings.mjs';
import {createAudio} from './audio.mjs';
import {NORMAL_SAVE_KEY,TEST_SAVE_KEY,createTestDiscovery,getTestSeed} from './test-session.mjs';
import {createRevealCharge} from './reveal-charge.mjs';
import {QUALITY_TIERS,tierForScore} from './genetic-quality.mjs';
import {tierBadge,qualityLegend,buildCertificate,certificateHTML,certificateSVG} from './quality-ui.mjs';
import {getRevealStage} from './reveal-stage.mjs';
import {renderJournal} from './journal.mjs';
import {knownPortrait,visualFamilyHTML,shortVisualName,VISUAL_TEXT} from './visual-ui.mjs';

const $=id=>document.getElementById(id), SETTINGS='botanical-table-v04-settings';
let testMode=new URLSearchParams(location.search).get('mode')==='test';
let KEY=testMode?TEST_SAVE_KEY:NORMAL_SAVE_KEY,testTier='rare';
const audio=createAudio(), reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let lang='fr',state,selected=[],composing=false,busy=false,blocked='',scene,enhanced=true,volume=.45,toastTimer;
let requestId=crypto.randomUUID(),researchId=null,activeHotspot='slot-0',selectedOption=null;
let draftTrialKey=null,draftName='',draftSignature='';
const modeDrafts=new Map();
const journalFilters=new Map();
const journalViews=new Map();
let journalController=null,journalControllerKey=null;
let chargeStage=null;
const revealCharge=createRevealCharge(2100);
let chargeTrial=null,chargeFrame=0,chargeTime=0,chargeMilestone=0,chargeAssisted=false;
const t=key=>strings[lang][key]??key;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local=value=>typeof value==='object'&&value!==null?value[lang]:value;
const strains=()=>state?getStrains(state):PARENTS;
const strain=id=>strains().find(p=>p.id===id);
const current=()=>state?.trials.find(x=>x.id===state.activeTrialId);
const count=id=>state?.inventory.filter(c=>c.varietyId===id).length||0;
const plant=id=>state?.plants.find(p=>p.varietyId===id);
const remaining=id=>{const p=plant(id);return p?Math.max(0,p.capacity-p.harvested):0;};
const research=id=>state?.research[id]||{earned:0,spent:0,choices:{}};
const points=id=>research(id).earned-research(id).spent;
const trait=id=>TRAITS.find(item=>item.id===id);
const traitName=id=>local(trait(id)?.name)||id;
const potentialText=p=>(p.potentialIds||[]).map(traitName).join(' · ')||t('noPotentials');
const categoryText=(p,category)=>(p.potentialIds||[]).filter(id=>trait(id)?.category===category).map(traitName).join(' + ')||t('noneInherited');
const configuration=id=>getConfiguration(state,id);
const slotIds=p=>Array.from({length:p.slotCapacity},(_,i)=>'slot-'+i);
const pct=value=>new Intl.NumberFormat(lang,{maximumFractionDigits:2}).format(value);
const known=trial=>trial&&['revealed','kept','archived'].includes(trial.phase);
try{const settings=JSON.parse(localStorage.getItem(SETTINGS)||'{}');lang=settings.lang==='en'?'en':'fr';enhanced=settings.enhanced!==false;volume=Number.isFinite(settings.volume)?Math.max(0,Math.min(1,settings.volume)):.45;}catch{}
function saveSettings(){try{localStorage.setItem(SETTINGS,JSON.stringify({lang,enhanced,volume}));}catch{}audio.setEnhanced(enhanced);audio.setVolume(volume);}
function notify(message){clearTimeout(toastTimer);$('notice').textContent=message;$('notice').classList.add('show');toastTimer=setTimeout(()=>$('notice').classList.remove('show'),4200);}
function read(key=KEY){const raw=localStorage.getItem(key);if(!raw)return createState();return restoreState(JSON.parse(raw));}
function phase(){return composing?'compose':current()?.phase||'compose';}
function pulse(kind){audio.play(kind);scene?.pulse(kind);}
function modal(label,html){pauseReveal();if(journalController){journalFilters.set(journalControllerKey,journalController.getFilters());journalViews.set(journalControllerKey,journalController.getViewState());journalController.destroy();journalController=null;}$('modalLabel').textContent=testMode?`${t('testBadge')} · ${label}`:label;$('modalBody').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function updateChargeView(){
 const value=revealCharge.state,button=$('holdReveal');
 if(button){button.style.setProperty('--charge',`${value.progress*360}deg`);button.classList.toggle('charging',value.active);button.setAttribute('aria-label',t(value.progress?'holdContinue':'holdReveal'));}
 if($('chargePercent'))$('chargePercent').textContent=`${Math.floor(value.progress*100)} %`;
 if($('chargeLabel'))$('chargeLabel').textContent=t(value.completed?'holdComplete':value.active?'holdCharging':value.progress?'holdContinue':'holdReveal');
 if($('chargeStatus'))$('chargeStatus').textContent=t(value.completed?'holdComplete':value.active?'holdCharging':value.progress?'holdPaused':'holdHint');
 const stage=value.progress<1&&phase()==='inspected'?getRevealStage(current().result.rarity,value.progress):null;
 if(button){button.style.setProperty('--tier-color',stage?.color||'#d8dfca');button.dataset.stage=stage?.id||'sealed';}
 if($('chargeStage'))$('chargeStage').textContent=stage?stage.name[lang]:t('sealedResult');
 if($('chargePips'))$('chargePips').innerHTML=QUALITY_TIERS.map((tier,i)=>'<i style="--tier-color:'+tier.color+'" class="'+(stage&&i<=QUALITY_TIERS.findIndex(x=>x.id===stage.id)?'lit':'')+'"></i>').join('');
 scene?.setRevealCharge(value.progress,stage?.id||null);audio.setRevealCharge(value.progress,value.active);
}
function pauseReveal(){
 cancelAnimationFrame(chargeFrame);chargeFrame=0;chargeAssisted=false;revealCharge.pause();updateChargeView();
}
function clearReveal(){pauseReveal();revealCharge.reset();chargeMilestone=0;chargeStage=null;chargeTrial=null;updateChargeView();}
function startReveal(assisted=false){
 if(blocked||busy||researchId||phase()!=='inspected'||revealCharge.state.completed)return;
 if(revealCharge.state.active)return;
 chargeAssisted=assisted;chargeTime=performance.now();revealCharge.start();scene?.focus('specimen');updateChargeView();
 const {id:trialId,requestId:expectedRequestId,createdAt:expectedCreatedAt,seed:expectedSeed,qualitySeed:expectedQualitySeed}=current(),saveKey=KEY;
 const tick=now=>{
  if(KEY!==saveKey||current()?.id!==trialId||phase()!=='inspected'||researchId||document.hidden){pauseReveal();return;}
  const value=revealCharge.advance(Math.min(100,Math.max(0,now-chargeTime)));chargeTime=now;
  const nextMilestone=Math.min(3,Math.floor(value.progress*4));
  const stage=value.progress<1?getRevealStage(current().result.rarity,value.progress):null;
  if(stage&&stage.id!==chargeStage){chargeStage=stage.id;pulse('tier-step-'+stage.id);}
  else if(nextMilestone>chargeMilestone)pulse('charge-step');
  chargeMilestone=nextMilestone;
  updateChargeView();
  if(value.didComplete){chargeFrame=0;chargeAssisted=false;command({type:'REVEAL',trialId,expectedRequestId,expectedCreatedAt,expectedSeed,expectedQualitySeed});return;}
  if(value.active)chargeFrame=requestAnimationFrame(tick);
 };
 chargeFrame=requestAnimationFrame(tick);
}
function bindReveal(){
 const button=$('holdReveal');if(!button)return;
 button.onpointerdown=event=>{if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0))return;event.preventDefault();button.setPointerCapture(event.pointerId);startReveal();};
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{if(!chargeAssisted)pauseReveal();});
 button.onkeydown=event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)startReveal();}};
 button.onkeyup=event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(!chargeAssisted)pauseReveal();}};
 button.onclick=event=>event.preventDefault();button.oncontextmenu=event=>event.preventDefault();
 button.onblur=()=>{if(!chargeAssisted)pauseReveal();};
 $('assistReveal').onclick=()=>startReveal(true);
}
function testToolbar(){const ready=!current()||['revealed','kept','archived'].includes(current().phase);return `<section class="test-toolbar"><strong>⚗ ${t('testBadge')}</strong><p>${t('testIsolation')}</p><div class="test-tiers">${QUALITY_TIERS.map(tier=>'<button data-test-tier="'+tier.id+'" style="--tier-color:'+tier.color+'" '+(ready?'':'disabled')+'>'+tier.name[lang]+'</button>').join('')}</div><p class="fine">${t(ready?'testRepeatNote':'testFinishFirst')}</p>${known(current())?`<button id="replayDiscovery" class="full">↻ ${t('replayDiscovery')}</button>`:''}<button id="resetTest" class="quiet">${t('resetTest')}</button></section>`;}
async function prepareTest(tier='rare',fresh=false,rewardParentId=null){
 if(!testMode||busy||blocked)return;pauseReveal();busy=true;
 try{
  await navigator.locks.request(TEST_SAVE_KEY,()=>{
   let previous=fresh?null:read(TEST_SAVE_KEY);
   const trial=previous?.trials.at(-1);
   if(trial?.phase==='revealed')previous=transition(previous,{type:'ARCHIVE',trialId:trial.id}).state;
   if(trial&&!['revealed','kept','archived'].includes(trial.phase)&&!fresh){notify(t('testFinishFirst'));return;}
   const result=createTestDiscovery(tier,previous,rewardParentId);
   if(!result.ok){notify(t(result.error==='test-cuttings-exhausted'?'testStockEmpty':result.error==='test-tier-unavailable'?'testUnavailable':'testFinishFirst'));return;}
   localStorage.setItem(TEST_SAVE_KEY,JSON.stringify(result.state));state=result.state;testTier=tier;composing=false;researchId=null;selected=[];requestId=crypto.randomUUID();draftTrialKey=null;draftName='';draftSignature='';modeDrafts.delete(TEST_SAVE_KEY);$('panel').innerHTML='';clearReveal();$('modal').close();render();scene?.focus('specimen');pulse('ready');if(result.setupTrialIds.length)notify(t('testBridgeNotice')); 
  });
 }catch(error){console.error('Test preparation failed',error);notify(t('storageError'));}finally{busy=false;}
}
async function switchMode(){
 if(busy)return;pauseReveal();busy=true;
 rememberDraft();modeDrafts.set(KEY,{trialKey:draftTrialKey,name:draftName,signature:draftSignature});
 const nextTest=!testMode,nextKey=nextTest?TEST_SAVE_KEY:NORMAL_SAVE_KEY;
 try{
  await navigator.locks.request(nextKey,()=>{
   let next=read(nextKey);
   if(nextTest&&!localStorage.getItem(nextKey))next=createTestDiscovery('rare').state;
   localStorage.setItem(nextKey,JSON.stringify(next));
   KEY=nextKey;testMode=nextTest;state=next;blocked='';researchId=null;composing=false;selected=[];
   const draft=modeDrafts.get(nextKey);draftTrialKey=draft?.trialKey??null;draftName=draft?.name??'';draftSignature=draft?.signature??'';
   $('panel').innerHTML='';clearReveal();
   const url=new URL(location.href);if(testMode)url.searchParams.set('mode','test');else url.searchParams.delete('mode');history.replaceState(null,'',url);
   $('modal').close();render();scene?.focus(['inspected','revealed','kept','archived'].includes(phase())?'specimen':'table');
  });
 }catch(error){console.error('Mode switch failed',error);notify(t('storageError'));}finally{busy=false;}
}
function applyScene(){
 if(!state)return;
 scene?.setState({phase:phase()==='archived'?'kept':phase(),strains:strains(),parentIds:phase()==='compose'?selected:current()?.parentIds||[],result:phase()==='compose'?null:current()?.result,inventoryCounts:Object.fromEntries(strains().map(p=>[p.id,count(p.id)])),researchMode:!!researchId,researchTarget:strain(researchId)||null,researchChoices:research(researchId).choices,researchPoints:points(researchId),hotspotLabels:{...Object.fromEntries(Array.from({length:5},(_,i)=>['slot-'+i,t('slot')+' '+(i+1)])),origin:t('origin')},activeHotspot,enhanced,reducedMotion,lang});
}
async function command(action){
 if(blocked||busy)return false;busy=true;
 const actionKey=KEY;
 try{
  if(!navigator.locks)throw Error('unsupportedLock');
  return await navigator.locks.request(actionKey,async()=>{
   const latest=read(actionKey);
   if(action.type==='REVEAL'){
    const pending=latest.trials.find(trial=>trial.id===action.trialId);
    if(KEY!==actionKey||!pending||pending.requestId!==action.expectedRequestId||pending.createdAt!==action.expectedCreatedAt||pending.seed!==action.expectedSeed||pending.qualitySeed!==action.expectedQualitySeed){state=latest;render();notify(t('refused'));return false;}
   }
   if(testMode&&action.type==='START'){
    const qualitySeed=getTestSeed(getOdds(latest,action.parentIds),testTier);
    if(qualitySeed===null){notify(t('testUnavailable'));return false;}
    action={...action,qualitySeed};
   }
   const result=transition(latest,action);
   if(!result.ok){state=latest;render();notify(t(result.error==='name-required'?'nameRequired':result.error==='insufficient-cuttings'?'stockEmpty':'refused'));pulse('refuse');return false;}
   localStorage.setItem(actionKey,JSON.stringify(result.state));state=result.state;
   if(!['HARVEST','ACTIVATE'].includes(action.type))composing=false;
   render();
   if(result.event==='request-already-committed')return true;
   const kinds={START:'start',ADVANCE:'ready',INSPECT:'paper',KEEP:'sign',ARCHIVE:'paper',HARVEST:'harvest',ACTIVATE:'upgrade'};
   pulse(action.type==='REVEAL'?`reveal-${current().result.rarity}`:kinds[action.type]||'contact');
   if(action.type==='START')scene?.focus('pot');
   if(action.type==='INSPECT')scene?.focus('specimen');
   if(action.type==='REVEAL'&&current().result.geneticQuality>=60){notify(t('discoveryNotice'));setTimeout(()=>{if(KEY===actionKey&&current()?.id===action.trialId&&known(current()))pulse('point');},900);}
   if(action.type==='KEEP')notify(t('saved'));
   if(action.type==='HARVEST')notify(t('harvested'));
   if(action.type==='ACTIVATE')notify(t('upgradeSaved'));
   return true;
  });
 }catch(error){console.error('Research action failed',error);blocked=error.message==='unsupportedLock'?'unsupportedLock':(error.message?.startsWith('Invalid research state')||error.message?.startsWith('Invalid visual genetics')||error.message?.startsWith('Invalid genetic quality'))||error instanceof SyntaxError?'corrupt':'storageError';render();notify(t(blocked));return false;}
 finally{busy=false;}
}
function skeleton(title,intro,content,step=0){return `<div class="panel-step"><span>${t('trial')} ${current()&&!composing?esc(current().id.slice(-3)):String((state?.trials.length||0)+1).padStart(3,'0')}</span><b>0${step+1} / 04</b></div><h2>${title}</h2><p class="intro">${intro}</p>${content}`;}
function leaf(color){return `<svg class="leaf-sketch" style="--plant:${esc(color)}" viewBox="0 0 36 48" aria-hidden="true"><path d="M18 45V5M18 33C5 32 4 19 4 19s15 0 14 14Zm0-8C31 25 32 11 32 11s-14 1-14 14Zm0-9C9 13 11 2 11 2s10 3 7 14ZM5 20l13 13m13-21L18 25"/></svg>`;}
function rarityBadge(value){return `<span class="rarity ${value}">◇ ${t(value)}</span>`;}
function oddsView(odds){
 if(!odds)return '<p class="potential">'+t('potentialEmpty')+'</p>';
 return '<div class="odds-box"><span class="field-label">'+t('odds')+'</span><div class="odds-track" aria-hidden="true">'+QUALITY_TIERS.map(tier=>'<i style="background:'+tier.color+';width:'+odds[tier.id]+'%"></i>').join('')+'</div><div class="odds-values quality-odds">'+QUALITY_TIERS.map(tier=>'<span style="--tier-color:'+tier.color+'"><b>'+pct(odds[tier.id])+' %</b>'+tier.name[lang]+'</span>').join('')+'</div><p class="fine">'+t('qualityCenter')+' '+odds.qualityOdds.center+'/100 · '+t('qualityVariation')+'</p><div class="universal-odds-note"><strong>'+t('universalOdds')+'</strong><p>'+t('surpriseFloors')+'</p></div><details class="inheritance-details"><summary>'+t('transmission')+'</summary><ul>'+odds.potentialOdds.map(item=>'<li><span>'+esc(traitName(item.traitId))+'</span><b>'+pct(item.percent)+' %</b></li>').join('')+odds.capacityOdds.map(item=>'<li><span>'+item.capacity+' '+t('slots')+'</span><b>'+pct(item.percent)+' %</b></li>').join('')+'</ul><p class="fine">'+t('transmissionNote')+'</p></details></div>'+(testMode?'<p class="demo-note">⚗ '+t('testForced')+' · '+t(testTier)+'. '+t('testOddsUnchanged')+'</p>':'');
}
function parentCards(){return strains().map(p=>'<div class="parent-row"><button class="parent-card" data-parent="'+esc(p.id)+'" aria-pressed="'+selected.includes(p.id)+'" '+(!count(p.id)?'disabled':'')+'>'+'<span class="parent-portrait">'+knownPortrait(p,'select-'+p.id)+'</span>'+'<span><strong>'+esc(local(p.name))+'</strong>'+tierBadge(p.geneticQuality,lang)+'<small><b>'+p.slotCapacity+' '+t('slots')+'</b> · '+esc(potentialText(p))+'<br>'+count(p.id)+' '+t('cuttings')+' · '+(selected.includes(p.id)?t('parent')+' '+(selected.indexOf(p.id)+1):'G'+p.generation)+'</small></span><span class="selection-mark">'+(selected.includes(p.id)?'✓':'＋')+'</span></button><div class="parent-actions"><button data-harvest="'+esc(p.id)+'" '+(remaining(p.id)?'':'disabled')+'>'+t('harvest')+' <small>('+remaining(p.id)+')</small></button><button data-research="'+esc(p.id)+'">◎ '+(points(p.id)>0?'<b>'+points(p.id)+'</b>':t('readResearch').replace(' ◎',''))+'</button></div></div>').join('');}
function renderCompose(){
 const odds=selected.length===2?getOdds(state,selected):null;
 return skeleton(t('choose'),t('chooseIntro'),`<div class="parent-list">${parentCards()}</div><p class="fine">${t('sourceBudget')} · ${t('reproduce')}</p><div class="stockline"><span>◌ ${t('potFree')}</span><span>▱ ${state.inventory.length} ${t('cuttings')}</span></div>${oddsView(odds)}<button id="startTrial" class="primary" ${selected.length===2&&selected.every(id=>count(id))?'':'disabled'}>${t('start')} <span>→</span></button><p class="fine">${t('cost')}<br>${t('oddsNote')}</p><p class="fine">${t('parentHint')}</p><p class="demo-note">${t('demoParams')}</p>`);
}
function rewardView(trial){return trial.result.geneticQuality<60?`<p class="fine">${t('noPoint')}</p>`:`<div class="reward"><span class="field-label">✦ ${t('pointsEarned')}</span><strong>${t('pointEach')}</strong><div class="actions">${trial.parentIds.map(id=>`<button data-research="${esc(id)}">${esc(local(strain(id).name))} ◎</button>`).join('')}</div></div>`;}
function profile(trial){
 const p=trial.result,saved=strain(p.id),active=saved?configuration(p.id).activeIds:[];
 return '<div class="discovery-banner '+p.rarity+'" style="--tier-color:'+tierForScore(p.geneticQuality).color+'">'+tierBadge(p.geneticQuality,lang)+'<h3>'+t(p.rarity+'Celebration')+'</h3><small>'+(testMode?t('testForced'):t('probability')+' · '+pct(trial.odds[p.rarity])+' %')+'</small><p class="fine">'+t('geneticNotBatch')+'</p><button data-coa="'+trial.id+'">'+t('openCoa')+' ↗</button></div><div class="capacity-banner"><b>'+p.slotCapacity+'</b><span>'+t('slots')+'<small>'+t('slotsInherited')+'</small></span></div><span class="field-label">'+t('inheritedPotential')+'</span><div class="potential-chips">'+(p.potentialIds.map(id=>'<span class="potential-chip '+(trait(id).rare?'rare':'')+'">'+esc(traitName(id))+'</span>').join('')||'<p>'+t('noPotentials')+'</p>')+'</div><p class="fine">'+t('potentialNotActive')+'</p><div class="active-profile"><span class="field-label">'+t('activeProfile')+'</span><strong>'+esc(active.map(traitName).join(' · ')||t('nothingActive'))+'</strong></div><div class="accent">'+t('surprise')+' · '+esc(local(p.accent))+'</div>'+visualFamilyHTML(p,trial.parentIds.map(strain),lang,'discovery')+rewardView(trial)+'<table class="comparison"><caption class="field-label">'+t('comparison')+'</caption><thead><tr><th>'+t('parent')+'</th><th>'+t('slots')+'</th><th>'+t('inheritedPotential')+'</th></tr></thead><tbody>'+trial.parentIds.map(id=>{const parent=strain(id);return '<tr><td>'+esc(local(parent.name))+'</td><td>'+parent.slotCapacity+'</td><td>'+esc(potentialText(parent))+'</td></tr>';}).join('')+'<tr><td>'+t('creation')+'</td><td>'+p.slotCapacity+'</td><td>'+esc(potentialText(p))+'</td></tr></tbody></table><span class="badge">'+t('batch')+'</span><p class="fine">'+t('batchDetail')+'<br>'+t('batchNote')+'</p>';
}
function lineageView(p){return `<div class="lineage-parents">${p.parents?.length?p.parents.map(id=>`<span>${esc(local(strain(id)?.name||id))}<small>${esc(id)}</small></span>`).join(''):`<span>${t('founder')}</span>`}</div><div class="lineage-child"><strong>${esc(local(p.name)||p.id)}</strong><small>${esc(p.id)} · G${p.generation||0}</small></div>`;}
function upgradePreview(optionId){
 const config=configuration(researchId),nextIds=[...config.activeIds,optionId];
 const before=config.activeIds.map(traitName).join(' · ')||t('nothingActive'),after=nextIds.map(traitName).join(' · ');
 return '<div class="upgrade-preview"><small>'+t('beforeAfter')+'</small><p>'+esc(before)+' → <strong>'+esc(after)+'</strong></p><div><span>'+t('occupiedSlots')+'</span><strong>'+config.activeIds.length+' → '+nextIds.length+' / '+strain(researchId).slotCapacity+'</strong></div>'+(optionId==='yield'?'<div><span>'+t('productionPotential')+'</span><strong>3 → 5 '+t('branches')+'</strong></div>':'')+(optionId==='quality'?'<p>'+t('qualityFuture')+'</p>':'')+'<p class="fine">'+t('activationNoReroll')+'</p></div>';
}
function renderResearch(){
 const p=strain(researchId),r=research(researchId);if(!p){researchId=null;return renderCompose();}
 const config=configuration(p.id),ids=slotIds(p),acquired=r.choices[activeHotspot],isOrigin=activeHotspot==='origin';
 if(!isOrigin&&!ids.includes(activeHotspot))activeHotspot=ids[0];
 const options=p.potentialIds.map(trait),choice=options.find(o=>o.id===selectedOption),available=choice&&!config.activeIds.includes(choice.id);
 const summary='<div class="active-profile"><span class="field-label">'+t('activeProfile')+'</span><strong>'+esc(config.activeIds.map(traitName).join(' · ')||t('nothingActive'))+'</strong><small>'+config.activeIds.length+' / '+p.slotCapacity+' '+t('occupiedSlots')+'</small></div>';
 return '<button id="backTrial" class="back-link">← '+t('back')+'</button><div class="panel-step"><span>'+t('branch')+'</span><span>G'+p.generation+'</span></div><h2>'+esc(local(p.name))+'</h2>'+tierBadge(p.geneticQuality,lang)+'<div class="point-balance"><b>'+points(p.id)+'</b><span>'+t('points')+'<small>'+r.earned+' '+t('totalEarned')+' · '+r.spent+' '+t('spent')+'</small></span></div>'+summary+'<p class="intro">'+t('upgradeIntro')+'</p><div class="node-tabs slot-tabs">'+[...ids,'origin'].map((id,i)=>'<button data-node="'+id+'" aria-pressed="'+(activeHotspot===id)+'"><i>'+(r.choices[id]?'✓':id==='origin'?'i':i+1)+'</i>'+(id==='origin'?t('origin'):t('slot')+' '+(i+1))+'</button>').join('')+'</div><div class="rule"></div>'+(isOrigin?(p.trialId?'<button class="full" data-coa="'+p.trialId+'">'+t('openCoa')+' ↗</button>':'')+lineageView(p)+visualFamilyHTML(p,(p.parents||[]).map(strain),lang,'origin')+'<p class="fine">'+t('originText')+'</p><span class="field-label">'+t('inheritedPotential')+'</span><p>'+esc(potentialText(p))+'</p><button id="openTree" class="full">'+t('openTree')+' ↗</button>':'<span class="field-label">'+t('slot')+' '+(Number(activeHotspot.split('-')[1])+1)+'</span><p class="fine">'+t('branchHelp')+'</p><div class="upgrade-options">'+(options.map(option=>{const used=config.activeIds.includes(option.id);return '<button class="upgrade-option '+(acquired===option.id?'acquired':'')+'" data-option="'+option.id+'" aria-pressed="'+(selectedOption===option.id)+'" '+(acquired&&acquired!==option.id||used&&acquired!==option.id?'disabled':'')+'><span class="option-dot">'+(acquired===option.id?'✓':used?'−':acquired?'×':'○')+'</span><span><strong>'+esc(local(option.name))+'</strong><small>'+esc(local(option.description))+'</small><em>'+(acquired===option.id?t('chosen'):used?t('alreadyActive'):acquired?t('excluded'):'1 ◇')+'</em></span></button>';}).join('')||'<p class="empty">'+t('noPotentials')+'</p>')+'</div>'+(choice&&!acquired&&available?'<div class="choice-detail"><strong>'+esc(local(choice.name))+'</strong><p>'+esc(local(choice.description))+'</p>'+upgradePreview(choice.id)+'<button id="applyUpgrade" class="primary" '+(points(p.id)>0?'':'disabled')+'>'+t('applyUpgrade')+'</button></div>':'<p class="fine">'+(acquired?t('identityPreserved'):t('previewChoice'))+'</p>'+(testMode&&acquired?'<button id="replayUpgrade" class="full">↻ '+t('replayUpgrade')+'</button>':''))+(!points(p.id)&&!acquired?'<p class="locked-note">◇ '+t('locked')+'</p>':''))+'<p class="fine">'+t('noPoint')+'</p><p class="demo-note">'+t('upgradeNote')+'</p><div class="actions"><button id="changeStrain">'+t('changeStrain')+'</button>'+(['compose','kept','archived'].includes(phase())?'<button data-use="'+esc(p.id)+'">'+t('useParent')+'</button>':'')+'</div>'+(testMode?'<button id="testForParent" class="full spaced" '+(current()&&!known(current())?'disabled':'')+'>'+t('testForParent')+'</button>':'');
}
function rememberDraft(){if($('varietyName')&&$('signature')){draftName=$('varietyName').value;draftSignature=$('signature').value;}}
function render(){
 pauseReveal();rememberDraft();document.documentElement.lang=lang;
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.innerHTML=t(el.dataset.i18n);});
 for(const id of ['settings','closeModal','rotateLeft','rotateRight','zoomIn','zoomOut'])$(id).setAttribute('aria-label',t(id==='closeModal'?'close':id));
 $('language').textContent=lang==='fr'?'EN':'FR';$('sound').textContent=t(audio.enabled?'soundOn':'soundOff');
 $('modeStrip').classList.toggle('test-active',testMode);$('modeStatus').textContent=t(testMode?'testBadge':'normalMode');$('testMode').textContent=t(testMode?'returnNormal':'enterTest');$('testMode').setAttribute('aria-pressed',String(testMode));
 const stage=phase(),trial=current(),step=stage==='compose'?0:stage==='growing'?1:['ready','inspected'].includes(stage)?2:3;
 const nextChargeTrial=stage==='inspected'?KEY+':'+trial.requestId+':'+trial.createdAt+':'+trial.seed+':'+trial.qualitySeed:null;
 if(nextChargeTrial!==chargeTrial){clearReveal();chargeTrial=nextChargeTrial;}
 $('workspace').classList.toggle('research-mode',!!researchId);document.querySelector('.scene-heading').classList.toggle('inspection',!!researchId||['inspected','revealed','kept','archived'].includes(stage));
 if(researchId){document.querySelector('.scene-heading h1').innerHTML=t('upgradeTitle');document.querySelector('.scene-heading p').textContent=t('identityPreserved');}
 const draftKey=trial?KEY+':'+trial.requestId+':'+trial.createdAt:null;
 if(stage==='revealed'&&draftTrialKey!==draftKey){draftTrialKey=draftKey;draftName='';draftSignature='';}
 $('steps').innerHTML=t('steps').map((name,i)=>`<span class="step ${i===step?'active':''}"><b>${i<step?'✓':i+1}</b>${name}</span>`).join('');
 if(blocked){$('panel').innerHTML=`<h2>${t('table')}</h2><p class="intro error">${t(blocked)}</p>${blocked==='corrupt'?`<button id="resetBroken" class="primary">${t('reset')}</button>`:''}`;$('resetBroken')?.addEventListener('click',resetPrompt);return;}
 if(researchId)$('panel').innerHTML=renderResearch();
 else if(stage==='compose')$('panel').innerHTML=renderCompose();
 else if(stage==='growing')$('panel').innerHTML=skeleton(t('growing'),t('growingIntro'),`<div class="centerpiece">⌁</div><ul class="resource-list">${trial.parentIds.map(id=>`<li><span>${esc(local(strain(id).name))}</span><span>1 ${t('consumed')}</span></li>`).join('')}<li><span>◌ ${t('potBusy')}</span><span>${esc(trial.id)}</span></li></ul><div class="progress"><i id="progressFill"></i></div><p class="fine" id="progressLabel">${t('previewTime')}</p><button id="skipTime" class="primary">${t('skip')} →</button><p class="fine">${t('timeNote')}</p>`,1);
 else if(stage==='ready')$('panel').innerHTML=skeleton(t('ready'),t('readyIntro'),`<div class="centerpiece">◎</div><div class="inspection-note">${t('hidden')}</div><button id="inspect" class="primary">${t('inspect')} →</button><p class="fine">${t('potFree')} · ${esc(trial.id)}</p>`,2);
 else if(stage==='inspected')$('panel').innerHTML=skeleton(t('inspected'),t('holdIntro'),`${testMode?`<p class="demo-note">${t('testForced')} · ${t(trial.result.rarity)}</p>`:''}<div class="actions"><button id="turnObject">↻ ${t('rotate')}</button><button id="closeObject">＋ ${t('closeup')}</button></div><div class="reveal-ritual"><button id="holdReveal" class="hold-reveal" aria-describedby="chargeStatus"><span class="charge-orbit" aria-hidden="true"><i>❧</i></span><span id="chargeStage" class="charge-stage">${t('sealedResult')}</span><span id="chargePips" class="charge-pips" aria-hidden="true"></span><strong id="chargeLabel">${t('holdReveal')}</strong><small id="chargePercent" aria-hidden="true">0 %</small></button><p id="chargeStatus" role="status">${t('holdHint')}</p><button id="assistReveal" class="quiet">${t('assistedReveal')} →</button></div><p class="fine">${t('holdNoOdds')}</p>`,2);
 else if(stage==='revealed')$('panel').innerHTML=skeleton(t('record'),`${t('identity')} · ${esc(trial.result.id)}`,`${profile(trial)}<form id="keepForm"><label class="form-label" for="varietyName">${t('name')}</label><input id="varietyName" type="text" maxlength="48" required autocomplete="off" value="${esc(draftName)}" placeholder="${esc(t('namePlaceholder'))}"><label class="form-label" for="signature">${t('signature')}</label><input id="signature" type="text" maxlength="48" autocomplete="off" value="${esc(draftSignature)}" placeholder="${esc(t('signaturePlaceholder'))}"><div class="rule"></div><button class="primary" type="submit">${t('keep')} ↗</button></form><button id="archive" class="quiet full">${t('archive')}</button>`,3);
 else{const p=state.varieties.find(v=>v.trialId===trial.id);$('panel').innerHTML=skeleton(t(stage==='kept'?'kept':'archived'),t(stage==='kept'?'keptIntro':'archivedIntro'),`${lineageView(p||trial.result)}${profile(trial)}${p?`<div class="actions"><button data-harvest="${p.id}" ${remaining(p.id)?'':'disabled'}>${t('harvest')} (${remaining(p.id)})</button><button id="downloadCard">↓ ${t('download')}</button></div><p class="fine">${t('reproduce')}</p><button class="full spaced" data-research="${p.id}">${t('readResearch')}</button><button class="primary spaced" data-use="${p.id}">${t('nextGeneration')} →</button>`:''}<button id="newTrial" class="full spaced">${t('again')}</button>`,3);}
 if(stage!=='compose'&&trial?.odds?.qualityOdds?.version===1)$('panel').insertAdjacentHTML('afterbegin','<p class="demo-note">'+t('legacyOdds')+'</p>');
 if(testMode)$('panel').insertAdjacentHTML('beforeend',testToolbar());
 $('panel').classList.toggle('paper-turn',enhanced&&!researchId);bindPanel();applyScene();updateChargeView();
 if($('modal').open&&$('genealogyHost'))showJournal();
}
function openResearch(id){if(blocked||!strain(id))return;rememberDraft();researchId=id;activeHotspot='slot-0';selectedOption=research(id).choices['slot-0']||null;$('modal').close();render();scene?.focus('specimen');pulse('select');}
function openNode(id){if(!researchId||![...slotIds(strain(researchId)),'origin'].includes(id))return;activeHotspot=id;selectedOption=research(researchId).choices[id]||null;render();pulse('select');}
function chooseParent(id){if(blocked||researchId||phase()!=='compose'||!strain(id))return;if(!count(id)){notify(t('noStock'));return;}selected=selected.includes(id)?selected.filter(x=>x!==id):selected.length<2?[...selected,id]:[selected[0],id];requestId=crypto.randomUUID();render();pulse('paper');}
function newTrial(id){if(!['compose','kept','archived'].includes(phase()))return;researchId=null;composing=true;selected=id&&count(id)?[id]:[];requestId=crypto.randomUUID();$('modal').close();render();scene?.focus('table');if(id&&!count(id))notify(t('noStock'));}
function bindCommon(root=document){
 root.querySelectorAll('[data-research]').forEach(el=>el.onclick=()=>openResearch(el.dataset.research));
 root.querySelectorAll('[data-harvest]').forEach(el=>el.onclick=()=>command({type:'HARVEST',varietyId:el.dataset.harvest}));
 root.querySelectorAll('[data-use]').forEach(el=>el.onclick=()=>newTrial(el.dataset.use));
 root.querySelectorAll('[data-download]').forEach(el=>el.onclick=()=>downloadCard(el.dataset.download));
}
function bindPanel(){
 document.querySelectorAll('[data-coa]').forEach(button=>button.onclick=()=>showCertificate(button.dataset.coa));
 bindCommon($('panel'));
 bindReveal();
 document.querySelectorAll('[data-test-tier]').forEach(el=>el.onclick=()=>prepareTest(el.dataset.testTier));
 $('resetTest')?.addEventListener('click',()=>prepareTest('rare',true));
 $('replayDiscovery')?.addEventListener('click',()=>{if(testMode&&known(current()))pulse(`reveal-${current().result.rarity}`);});
 $('replayUpgrade')?.addEventListener('click',()=>{if(testMode&&research(researchId).choices[activeHotspot])pulse('upgrade');});
 $('varietyName')?.addEventListener('input',rememberDraft);$('signature')?.addEventListener('input',rememberDraft);
 document.querySelectorAll('[data-parent]').forEach(el=>el.onclick=()=>chooseParent(el.dataset.parent));
 document.querySelectorAll('[data-node]').forEach(el=>el.onclick=()=>openNode(el.dataset.node));
 document.querySelectorAll('[data-option]').forEach(el=>el.onclick=()=>{selectedOption=el.dataset.option;render();pulse('select');});
 $('applyUpgrade')?.addEventListener('click',()=>command({type:'ACTIVATE',varietyId:researchId,slotIndex:Number(activeHotspot.split('-')[1]),traitId:selectedOption}));
 $('backTrial')?.addEventListener('click',()=>{researchId=null;render();scene?.focus(phase()==='compose'?'table':['growing','ready'].includes(phase())?'pot':'specimen');});
 $('changeStrain')?.addEventListener('click',showCollection);
 $('openTree')?.addEventListener('click',showJournal);
 $('testForParent')?.addEventListener('click',()=>prepareTest('rare',false,researchId));
 $('startTrial')?.addEventListener('click',()=>command({type:'START',parentIds:[...selected],requestId,seed:crypto.getRandomValues(new Uint32Array(1))[0],qualitySeed:crypto.getRandomValues(new Uint32Array(1))[0]}));
 $('skipTime')?.addEventListener('click',()=>command({type:'ADVANCE',trialId:current().id}));
 $('inspect')?.addEventListener('click',()=>command({type:'INSPECT',trialId:current().id}));
 $('turnObject')?.addEventListener('click',()=>scene?.rotate(80,0));$('closeObject')?.addEventListener('click',()=>scene?.zoom(-120));
 $('archive')?.addEventListener('click',()=>command({type:'ARCHIVE',trialId:current().id}));
 $('keepForm')?.addEventListener('submit',event=>{event.preventDefault();command({type:'KEEP',trialId:current().id,name:$('varietyName').value,signature:$('signature').value});});
 $('downloadCard')?.addEventListener('click',()=>downloadCard(current().id));$('newTrial')?.addEventListener('click',()=>newTrial());
}
function showCollection(){if(!state||blocked)return;modal(t('research'),`<h2>${t('collection')}</h2><p>${t('collectionIntro')}</p><div class="collection-grid">${strains().map(p=>`<button class="collection-card" data-research="${p.id}">${'<span class="parent-portrait">'+knownPortrait(p,'select-'+p.id)+'</span>'}<span><strong>${esc(local(p.name))}</strong>${tierBadge(p.geneticQuality,lang)}<small>G${p.generation||0} · ${esc(p.id)}</small><small>${p.slotCapacity} ${t('slots')} · ${points(p.id)} ◇ ${t('points')}</small><small>${esc(potentialText(p))}</small></span><span>↗</span></button>`).join('')}</div><p class="fine">${t('noCuttingResearch')}</p>`);bindCommon($('modalBody'));}
function showJournal(){
 if(!state||blocked)return;
 modal(t('journal'),'<div id="genealogyHost"></div>');
 journalController=renderJournal($('genealogyHost'),{state,strains:strains(),lang,onResearch:openResearch,onUse:newTrial,onDownload:downloadCard,canUse:['compose','kept','archived'].includes(phase())});
 journalControllerKey=KEY;journalController.setFilters(journalFilters.get(KEY)||{});
 if(journalViews.has(KEY))journalController.setViewState(journalViews.get(KEY));
}
function showSettings(){
 modal(t('demo'),`<h2>${t('settingsTitle')}</h2><p>${t('soundHelp')}</p><div class="setting-row"><span>${t('feel')}<small>${t('feelNote')}</small></span></div><div class="intents"><button id="feelOn" class="${enhanced?'selected':''}" aria-pressed="${enhanced}">${t('sensitive')}</button><button id="feelOff" class="${enhanced?'':'selected'}" aria-pressed="${!enhanced}">${t('discreet')}</button></div><p class="fine">${t('sessionNote')}</p><div class="setting-row"><span>${t('volume')}</span><span id="volumeValue">${Math.round(volume*100)} %</span></div><input aria-label="${esc(t('volume'))}" id="volume" type="range" min="0" max="100" value="${volume*100}"><p class="fine">${reducedMotion?t('reduced'):''}</p><div class="rule"></div><h3>${t('rulesTitle')}</h3><p>${t('rules')}</p>${qualityLegend(lang)}<p class="fine">${t('geneticNotBatch')}</p><h3>${t('paramsTitle')}</h3><p>${t('params')}</p><p>${t('openRules')}</p><p class="fine">${t('saving')}</p><a class="download-link" href="../table-rd-v03/">${t('previousVersion')} ↗</a><a class="download-link" href="handoff/PASSATION_UNITY.md" target="_blank" rel="noopener">${t('help')} ↗</a><div class="rule"></div><button id="resetDemo">${t('reset')}</button>`);
 $('feelOn').onclick=()=>{enhanced=true;saveSettings();applyScene();pulse('contact');showSettings();};$('feelOff').onclick=()=>{enhanced=false;saveSettings();applyScene();pulse('contact');showSettings();};
 $('volume').oninput=event=>{volume=Number(event.target.value)/100;saveSettings();$('volumeValue').textContent=Math.round(volume*100)+' %';};$('volume').onchange=()=>pulse('paper');$('resetDemo').onclick=resetPrompt;
}
function resetPrompt(){
 modal(t('demo'),`<h2>${t('resetTitle')}</h2><p>${t('resetText')}</p><div class="actions"><button id="cancelReset">${t('cancel')}</button><button id="confirmReset">${t('resetConfirm')}</button></div>`);
 $('cancelReset').onclick=()=>$('modal').close();
 $('confirmReset').onclick=async()=>{
  if(busy)return;busy=true;const resetKey=KEY;
  try{
   await navigator.locks.request(resetKey,()=>{const next=createState();localStorage.setItem(resetKey,JSON.stringify(next));if(KEY===resetKey)state=next;});
   if(KEY!==resetKey)return;
   blocked='';researchId=null;selected=[];composing=true;requestId=crypto.randomUUID();draftTrialKey=null;draftName='';draftSignature='';modeDrafts.delete(resetKey);clearReveal();$('modal').close();render();scene?.focus('table');notify(t('newSessionNotice'));
  }catch{notify(t('storageError'));}finally{busy=false;}
 };
}
function showCertificate(trialId){const certificate=buildCertificate(state,trialId,lang,testMode);if(!certificate)return;modal(t('openCoa'),certificateHTML(certificate));$('modalBody').querySelectorAll('[data-export-coa]').forEach(button=>button.onclick=()=>downloadCard(button.dataset.exportCoa));pulse('paper');}
function downloadCard(trialId){
 const certificate=buildCertificate(state,trialId,lang,testMode);if(!certificate)return;
 const url=URL.createObjectURL(new Blob([certificateSVG(certificate)],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='COA-'+(testMode?'test-':'')+trialId+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);pulse('paper');
}

$('testMode').onclick=switchMode;$('research').onclick=showCollection;$('journal').onclick=showJournal;$('settings').onclick=showSettings;$('closeModal').onclick=()=>$('modal').close();
$('modal').addEventListener('click',event=>{if(event.target===$('modal')){const r=$('modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('modal').close();}});
$('language').onclick=()=>{lang=lang==='fr'?'en':'fr';saveSettings();render();};
$('sound').onclick=async()=>{try{if(!audio.enabled)await audio.unlock();else audio.setEnabled(false);$('sound').textContent=t(audio.enabled?'soundOn':'soundOff');pulse('paper');}catch{notify(t('soundUnavailable'));}};
$('viewTable').onclick=()=>{if(researchId){researchId=null;render();}scene?.focus('table');};
$('viewSpecimen').onclick=()=>{if(researchId||['inspected','revealed','kept','archived'].includes(phase()))scene?.focus('specimen');else notify(t('inspectFirst'));};
$('rotateLeft').onclick=()=>scene?.rotate(-80,0);$('rotateRight').onclick=()=>scene?.rotate(80,0);$('zoomIn').onclick=()=>scene?.zoom(-120);$('zoomOut').onclick=()=>scene?.zoom(120);
window.addEventListener('storage',event=>{if(event.key===KEY){try{state=read();composing=false;selected=[];if(!strain(researchId))researchId=null;render();}catch{blocked='corrupt';render();}}});
try{if(!navigator.locks)blocked='unsupportedLock';else await navigator.locks.request(KEY,()=>{state=read();if(testMode&&!localStorage.getItem(KEY))state=createTestDiscovery('rare').state;localStorage.setItem(KEY,JSON.stringify(state));});}catch(error){blocked=(error.message?.startsWith('Invalid research state')||error.message?.startsWith('Invalid visual genetics')||error.message?.startsWith('Invalid genetic quality'))||error instanceof SyntaxError?'corrupt':'storageError';}
saveSettings();render();
try{const {createScene}=await import('./scene.mjs');scene=createScene($('scene'),{onAction:(action,id)=>{if(action==='hotspot')openNode(id);else if(action==='parent'&&phase()==='compose')chooseParent(typeof id==='number'?PARENTS[id]?.id:id);else if(action==='specimen'&&phase()==='ready'&&!researchId)command({type:'INSPECT',trialId:current().id});else if(action==='specimen'&&phase()!=='compose')scene.focus('specimen');else if(action==='pot')scene.focus('pot');else if(action==='cards')scene.focus('parents');}});$('loading')?.remove();applyScene();if(['inspected','revealed','kept'].includes(phase()))scene.focus('specimen');}catch(error){console.error('Scene initialization failed',error);$('loading').textContent=t('noWebGL');}
setInterval(()=>{const trial=current();if(blocked||busy||trial?.phase!=='growing')return;const elapsed=Math.max(0,Date.now()-trial.createdAt),pct=Math.min(100,elapsed/120);if($('progressFill'))$('progressFill').style.width=pct+'%';if($('progressLabel'))$('progressLabel').textContent=t('previewTime')+' · '+Math.min(12,Math.floor(elapsed/1000))+'/12';if(elapsed>=12000)command({type:'ADVANCE',trialId:trial.id});},250);

window.addEventListener('blur',pauseReveal);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseReveal();});
window.addEventListener('pagehide',()=>{pauseReveal();audio.setEnabled(false);});
window.addEventListener('pageshow',()=>{$('sound').textContent=t(audio.enabled?'soundOn':'soundOff');});
