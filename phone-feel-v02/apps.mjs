import {APP_DATA,APP_TEXT} from './app-content.mjs';

const contactById=id=>APP_DATA.contacts.find(item=>item.id===id);
const varietyById=id=>APP_DATA.varieties.find(item=>item.id===id);
const plantById=id=>APP_DATA.plants.find(item=>item.id===id);
export const PERIODS=Object.freeze(['today','week','all']);

export function periodTransactions(period='all') {
  if(!PERIODS.includes(period))throw new RangeError('Unknown finance period.');
  const earliest='2026-11-03';
  return APP_DATA.finance.transactions.filter(item=>period==='all'||(period==='today'?item.date===APP_DATA.today:item.date>=earliest&&item.date<=APP_DATA.today));
}

export function summarizeFinance(period='all') {
  const entries=periodTransactions(period);
  const summary={revenue:0,expenses:0,net:0,units:0,grams:0,byProduct:{hash:{amount:0,units:0,grams:0},buds:{amount:0,units:0,grams:0}}};
  for(const item of entries){
    if(item.kind==='sale'){
      summary.revenue+=item.amount;summary.units+=item.units;summary.grams+=item.grams;
      const group=summary.byProduct[item.product];group.amount+=item.amount;group.units+=item.units;group.grams+=item.grams;
    }else if(item.kind==='expense')summary.expenses+=item.amount;
  }
  summary.net=summary.revenue-summary.expenses;
  return summary;
}

export function accountBalances(){
  const result={...APP_DATA.finance.opening};
  for(const item of APP_DATA.finance.transactions){
    if(item.kind==='transfer'){result[item.from]-=item.amount;result[item.to]+=item.amount;}
    else result[item.account]+=item.kind==='sale'?item.amount:-item.amount;
  }
  return {...result,total:result.cash+result.bank};
}

export function accountTransactions(account='all'){
  if(!['all','cash','bank'].includes(account))throw new RangeError('Unknown finance account.');
  return APP_DATA.finance.transactions.filter(item=>account==='all'||item.account===account||item.from===account||item.to===account).slice().reverse();
}

function portrait(palette='gold'){
  const colors={gold:['#ad8c5c','#c89f73','#665342'],sage:['#819984','#bd9a80','#4b5d4e'],blue:['#7d9aab','#c5a185','#405e71']}[palette]||['#ad8c5c','#c89f73','#665342'];
  return `<svg class="apps-portrait" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="40" fill="${colors[0]}"/><path d="M9 80 16 60 29 53 51 53 65 61 72 80" fill="${colors[2]}"/><path d="m27 24 12-9 15 10-2 24-12 11-12-12Z" fill="${colors[1]}"/><path d="m25 29 2-13 15-5 15 9-1 15-8-10-21 9Z" fill="#333d34"/><path d="m39 28 0 18 10-3-1-17Z" fill="#000" opacity=".1"/><path d="M31 35h4m10 0h4" stroke="#41493c" stroke-width="2.5"/></svg>`;
}

function plantArt(color='#83a278'){
  return `<svg class="apps-plant-art" viewBox="0 0 180 180" aria-hidden="true"><ellipse cx="90" cy="162" rx="44" ry="9" fill="#173d2820"/><path d="m64 123 8 39h38l8-39" fill="#9a7655"/><path d="M59 119h64v11H59z" fill="#ad8c61"/><path d="M90 121V36m0 69-23-17m23-6 24-19m-24-3L74 47" stroke="#567a45" stroke-width="4"/><g fill="${color}"><path d="M88 91Q40 87 42 54q38 2 46 37Z"/><path d="M92 77q2-39 43-42-1 35-43 42Z"/><path d="M88 59Q62 55 61 25q28 6 27 34Z"/><path d="M91 42q-9-28 5-40 18 23-5 40Z"/><path d="M90 112q7-32 45-24-15 27-45 24Z"/></g></svg>`;
}

export function renderApp(page,context){
  if(typeof page!=='string'||!(/^(snap|green|charbon)(:|$)/.test(page)))return null;
  const c=context,lang=c.state.settings.language==='en'?'en':'fr';
  const t=key=>APP_TEXT[lang][key]??key, e=c.escape;
  const nav=(route,label,cls='button secondary',attrs='')=>c.button('navigate',label,cls,`data-page="${e(route)}" ${attrs}`);
  const header=(app)=>`<div class="app-header">${c.icon(app)}<strong>${t(app)}</strong><small>${t('demo')}</small></div><div class="apps-fixture">${t('fixture')}</div>`;
  const tabs=(entries,active)=>`<nav class="apps-tabs" aria-label="${e(t('overview'))}">${entries.map(([key,path])=>nav(path,t(key),key===active?'apps-tab active':'apps-tab',key===active?'aria-current="page"':'')).join('')}</nav>`;
  const snapTabs=active=>tabs([['network','snap'],['feed','snap:feed'],['messages','snap:messages'],['store','snap:store']],active);
  const greenTabs=active=>tabs([['plants','green'],['varieties','green:varieties']],active);
  const financeTabs=active=>tabs([['dashboard','charbon'],['sales','charbon:sales:today'],['ledger','charbon:ledger:all']],active);
  const hint=key=>`<p class="apps-footnote">${t(key)}</p>`;
  const row=(label,value)=>`<div class="apps-fact"><span>${label}</span><strong>${value}</strong></div>`;
  const missing=app=>`${header(app)}<h2>${t('notFoundTitle')}</h2><p>${t('notFound')}</p>${nav(app,t('back'))}`;
  const personCard=(person)=>nav(`snap:profile:${person.id}`,`${portrait(person.palette)}<span><b>${t(person.nameKey)}</b><small>${t(person.roleKey)}</small></span><span class="apps-arrow">›</span>`,'apps-person');
  const balances=accountBalances();

  if(page==='snap'){
    return `${header('snap')}${snapTabs('network')}<h2>${t('knownNetwork')}</h2><p class="small muted">${t('networkHint')}</p><div class="apps-network"><svg viewBox="0 0 300 250" aria-hidden="true"><path d="M55 55 210 55 90 190 237 190" fill="none" stroke="#c5b36d" stroke-width="2" stroke-dasharray="4 5"/></svg><div class="apps-node apps-node-self"><span class="apps-self">${c.icon('person')}</span><b>${t('you')}</b></div>${APP_DATA.contacts.map((person,index)=>nav(`snap:profile:${person.id}`,`${portrait(person.palette)}<b>${t(person.nameKey)}</b>`,`apps-node apps-node-${index}`)).join('')}</div>${nav('snap:contacts',t('allContacts'))}${hint('networkLimit')}`;
  }
  if(page==='snap:contacts')return `${header('snap')}${snapTabs('network')}<h2>${t('contacts')}</h2>${APP_DATA.contacts.map(personCard).join('')}${nav('snap',t('backNetwork'))}${hint('fictionalPeople')}`;
  if(page.startsWith('snap:profile:')){
    const person=contactById(page.slice('snap:profile:'.length));if(!person)return missing('snap');
    return `${header('snap')}${snapTabs('network')}<div class="apps-profile-hero">${portrait(person.palette)}<h2>${t(person.nameKey)}</h2><p>${t(person.roleKey)}</p></div><section class="apps-note"><h3>${t('learned')}</h3><p>${t(person.interestKey)}</p><h3>${t('source')}</h3><p>${t(person.originKey)}</p><h3>${t('unknown')}</h3><p>${t(person.unknownKey)}</p></section><h3>${t('knownLinks')}</h3>${person.links.map(id=>personCard(contactById(id))).join('')}${person.thread==='message'?c.button('message',t('openMessage'),'button'):person.thread?nav(person.thread,t('openMessage'),'button'):`<p class="notice">${t('noDirect')}</p>`}${person.id==='messenger'?nav('onion',t('onion'),'button apps-gap'):''}${hint('fictionalPeople')}`;
  }
  if(page==='snap:feed')return `${header('snap')}${snapTabs('feed')}<h2>${t('feedTitle')}</h2>${APP_DATA.posts.map(post=>`<article class="apps-post"><div class="apps-post-author">${portrait(post.contact?contactById(post.contact).palette:'gold')}<span><b>${post.contact?t(contactById(post.contact).nameKey):t('yourStore')}</b><small>${t(post.timeKey)}</small></span></div><h3>${t(post.titleKey)}</h3><p>${t(post.bodyKey)}</p>${nav(post.route,t('viewPost'))}</article>`).join('')}${hint('fictionalPeople')}`;
  if(page==='snap:messages')return `${header('snap')}${snapTabs('messages')}<h2>${t('messageTitle')}</h2>${c.button('message',`${portrait('gold')}<span><b>${t('messenger')}</b><small>${t('messengerPreview')}</small><em>${t(c.state.readMessage?'read':'unread')}</em></span>`,'apps-person')}${nav('snap:thread:lea',`${portrait('sage')}<span><b>${t('lea')}</b><small>${t('leaPreview')}</small><em>${t('read')}</em></span>`,'apps-person')}${hint('threadReadOnly')}`;
  if(page==='snap:thread:lea')return `${header('snap')}${snapTabs('messages')}<div class="person">${portrait('sage')}<div><b>${t('lea')}</b><small>${t('leaRole')}</small></div></div><div class="apps-chat"><p>${t('threadLea1')}</p><p class="apps-chat-self">${t('threadSelf')}</p><p>${t('threadLea2')}</p></div>${nav('snap:profile:lea',t('viewProfile'))}${nav('snap:store',t('store'),'button apps-gap')}${hint('threadReadOnly')}`;
  if(page==='snap:store')return `${header('snap')}${snapTabs('store')}<div class="apps-store-sign">${c.icon('snap')}<h2>${t('storeTitle')}</h2><p>${t('storeCaption')}</p></div>${['Hash','Buds'].map(type=>nav(`snap:offer:${type.toLowerCase()}`,`<span class="apps-offer-art ${type.toLowerCase()}"></span><span><b>${t('offer'+type)}</b><small>${t('offer'+type+'Detail')}</small></span><span class="apps-arrow">›</span>`,'apps-offer')).join('')}${hint('offerNote')}${hint('marketingSeparate')}`;
  if(page==='snap:offer:hash'||page==='snap:offer:buds'){
    const type=page.endsWith('hash')?'Hash':'Buds';return `${header('snap')}${snapTabs('store')}<div class="apps-offer-large"><span class="apps-offer-art ${type.toLowerCase()}"></span></div><h2>${t('offer'+type)}</h2><p>${t('offer'+type+'Detail')}</p><p class="notice">${t('offerDetail')}</p>${nav('snap:store',t('back'))}${hint('marketingSeparate')}`;
  }
  if(page==='green'||page==='green:plants')return `${header('green')}${greenTabs('plants')}<h2>${t('cultureTitle')}</h2><p class="small muted">${t('cultureIntro')}</p><div class="apps-metrics"><div><strong>${APP_DATA.plants.length}</strong><span>${t('occupied')}</span></div><div><strong>${APP_DATA.varieties.length}</strong><span>${t('knownVarieties')}</span></div></div>${APP_DATA.plants.map(plant=>nav(`green:plant:${plant.id}`,`${plantArt(varietyById(plant.variety).color)}<span><b>${e(plant.label)} · ${t(varietyById(plant.variety).nameKey)}</b><small>${t(plant.placeKey)}</small><em>${t(plant.stageKey)}</em></span><span class="apps-arrow">›</span>`,'apps-plant')).join('')}${hint('cultureLimit')}`;
  if(page.startsWith('green:plant:')){
    const plant=plantById(page.slice('green:plant:'.length));if(!plant)return missing('green');const variety=varietyById(plant.variety);
    return `${header('green')}${greenTabs('plants')}<div class="apps-plant-hero">${plantArt(variety.color)}<div><span>${e(plant.label)}</span><h2>${t(variety.nameKey)}</h2><b>${t(plant.stageKey)}</b></div></div>${row(t('location'),t(plant.placeKey))}${row(t('plantState'),t(plant.stageKey))}<div class="apps-progress"><label>${t('progress')} · ${plant.progress}%</label><progress max="100" value="${plant.progress}" aria-label="${e(t('progress'))}">${plant.progress}%</progress></div><p>${t(plant.noteKey)}</p><p class="small muted">${t(plant.lastKey)}</p>${nav(`green:variety:${variety.id}`,t('openVariety'),'button')}${hint('cultureLimit')}`;
  }
  if(page==='green:varieties')return `${header('green')}${greenTabs('varieties')}<h2>${t('varietyTitle')}</h2><p class="small muted">${t('varietyIntro')}</p>${APP_DATA.varieties.map(variety=>nav(`green:variety:${variety.id}`,`${plantArt(variety.color)}<span><b>${t(variety.nameKey)}</b><small>${t(variety.aromaKey)}</small></span><span class="apps-arrow">›</span>`,'apps-plant')).join('')}${hint('varietyLimit')}`;
  if(page.startsWith('green:variety:')){
    const variety=varietyById(page.slice('green:variety:'.length));if(!variety)return missing('green');
    return `${header('green')}${greenTabs('varieties')}<div class="apps-plant-hero">${plantArt(variety.color)}<h2>${t(variety.nameKey)}</h2></div><section class="apps-note"><h3>${t('origin')}</h3><p>${t(variety.originKey)}</p><h3>${t('description')}</h3><p>${t(variety.aromaKey)}</p><h3>${t('appearance')}</h3><p>${t(variety.formKey)}</p></section><h3>${t('relatedPlants')}</h3>${APP_DATA.plants.filter(plant=>plant.variety===variety.id).map(plant=>nav(`green:plant:${plant.id}`,`${e(plant.label)} · ${t(plant.placeKey)}`,'button secondary apps-gap')).join('')}${hint('varietyLimit')}`;
  }
  const filters=(period,prefix)=>`<div class="apps-filters" aria-label="${e(t('date'))}">${PERIODS.map(key=>nav(`${prefix}:${key}`,t(key),period===key?'active':'',`aria-pressed="${period===key}"`)).join('')}</div>`;
  const amount=value=>e(c.money(value));
  if(page==='charbon'||/^charbon:summary:(today|week|all)$/.test(page)){
    const period=page==='charbon'?'today':page.split(':')[2],summary=summarizeFinance(period);
    return `${header('charbon')}${financeTabs('dashboard')}<h2>${t('financeTitle')}</h2><p class="small muted">${t('financeCaption')}</p>${filters(period,'charbon:summary')}<div class="apps-money-hero"><span>${t('revenue')}</span><strong>${amount(summary.revenue)}</strong></div>${row(t('spending'),amount(summary.expenses))}${row(t('net'),amount(summary.net))}${hint('notProfit')}<div class="apps-metrics"><div><strong>${amount(balances.cash)}</strong><span>${t('cash')}</span></div><div><strong>${amount(balances.bank)}</strong><span>${t('bank')}</span></div></div>${nav(`charbon:sales:${period}`,t('openSales'),'button')}${nav('charbon:ledger:all',t('openLedger'),'button secondary apps-gap')}${hint('financeLimit')}`;
  }
  if(/^charbon:sales:(today|week|all)$/.test(page)){
    const period=page.split(':')[2],summary=summarizeFinance(period);
    return `${header('charbon')}${financeTabs('sales')}<h2>${t('sales')}</h2>${filters(period,'charbon:sales')}<div class="apps-money-hero"><span>${t('revenue')}</span><strong>${amount(summary.revenue)}</strong></div><div class="apps-metrics"><div><strong>${summary.units}</strong><span>${t('salesCount')}</span></div><div><strong>${summary.grams} g</strong><span>${t('grams')}</span></div></div><h3>${t('byProduct')}</h3><table class="apps-table"><thead><tr><th>${t('product')}</th><th>${t('units')}</th><th>${t('amount')}</th></tr></thead><tbody>${Object.entries(summary.byProduct).map(([key,value])=>`<tr><td>${t(key)}</td><td>${value.units}</td><td>${amount(value.amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th>${t('all')}</th><th>${summary.units}</th><th>${amount(summary.revenue)}</th></tr></tfoot></table>${hint('salesTableNote')}${hint('financeLimit')}`;
  }
  if(/^charbon:ledger:(all|cash|bank)$/.test(page)){
    const account=page.split(':')[2],entries=accountTransactions(account);
    return `${header('charbon')}${financeTabs('ledger')}<h2>${t('ledger')}</h2><div class="apps-filters">${['all','cash','bank'].map(key=>nav(`charbon:ledger:${key}`,t(key==='all'?'allAccounts':key),key===account?'active':'',`aria-pressed="${key===account}"`)).join('')}</div><div class="apps-money-hero"><span>${t(account==='all'?'combined':account)}</span><strong>${amount(account==='all'?balances.total:balances[account])}</strong></div>${row(t('opening'),amount(account==='all'?APP_DATA.finance.opening.cash+APP_DATA.finance.opening.bank:APP_DATA.finance.opening[account]))}<h3>${t('transactions')}</h3>${entries.map(entry=>{const sign=entry.kind==='sale'?'+':entry.kind==='expense'?'−':account==='cash'?'−':account==='bank'?'+':'↔';return nav(`charbon:transaction:${entry.id}`,`<span><b>${t(entry.labelKey)}</b><small>${e(entry.date)} · ${t(entry.kind)}</small></span><strong class="${entry.kind==='sale'?'apps-positive':''}">${sign} ${amount(entry.amount)}</strong>`,'apps-ledger-row');}).join('')||`<p>${t('empty')}</p>`}${hint('financeLimit')}`;
  }
  if(page.startsWith('charbon:transaction:')){
    const entry=APP_DATA.finance.transactions.find(item=>item.id===page.slice('charbon:transaction:'.length));if(!entry)return missing('charbon');
    return `${header('charbon')}${financeTabs('ledger')}<div class="eyebrow">${t('transaction')} · ${e(entry.id.toUpperCase())}</div><h2>${t(entry.labelKey)}</h2><div class="apps-money-hero"><span>${t('amount')}</span><strong>${amount(entry.amount)}</strong></div>${row(t('date'),e(entry.date))}${row(t('type'),t(entry.kind))}${entry.kind==='transfer'?`${row(t('from'),t(entry.from))}${row(t('to'),t(entry.to))}<p class="notice">${t('transferNote')}</p>`:row(t('account'),t(entry.account))}${entry.kind==='sale'?`${row(t('units'),String(entry.units))}${row(t('grams'),`${entry.grams} g`)}`:''}${hint('recordNote')}${nav('charbon:ledger:all',t('back'))}`;
  }
  return missing(page.split(':')[0]);
}
