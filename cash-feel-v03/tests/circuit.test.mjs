import test from 'node:test';
import assert from 'node:assert/strict';
import { CashLedger } from '../ledger.mjs';
const ids = (l, p, count = Infinity) => l.getEntities(p).slice(0, count).map(e => e.id);
function exact(l) {
  assert.deepEqual(l.verify().errors, []);
  assert.equal(l.totalValue, l.mode === 'large' ? 22000 : 2200);
  assert.deepEqual(l.entities.flatMap(e => e.noteIds).sort(), l.notes.map(n => n.id).sort());
  for (const e of l.entities) {
    if (e.location.startsWith('reserve')) { assert.equal(e.type, 'note'); assert.equal(l.denomination(e), Number(e.location.slice(7))); }
    if (e.location === 'output' || e.location.startsWith('binding')) assert.equal(e.type, 'bundle');
    if (e.type === 'bundle') { assert.equal(e.noteCount,e.bundleSize); assert.equal(e.noteIds.length,e.bundleSize); assert.ok([25,50,100].includes(e.bundleSize)); }
  }
}
function ok(l,r) { assert.equal(r.ok,true,r.reason); exact(l); return r; }
function no(l,op,reason) { const before=l.snapshot(),r=op(); assert.equal(r.ok,false); assert.equal(r.reason,reason); assert.deepEqual(l.snapshot(),before); exact(l); }
function drain(l) { while(l.getEntities('input').length) assert.equal(l.tickMachine().ok,true); exact(l); }
function feedTable(l) { while(l.getEntities('table').length) { ok(l,l.pickup(ids(l,'table',100))); ok(l,l.feed()); drain(l); } }
function first() { const l=new CashLedger(); ok(l,l.dumpDelivery()); feedTable(l); return l; }

test('integrated circuit is immutable and the default target is 100',()=>{
  for(const mode of ['small','large']) { const l=new CashLedger(mode); assert.equal(l.circuit,'integrated'); assert.equal(l.bundleSize,100); assert.equal(l.snapshot().bundleSize,100); assert.throws(()=>{l.circuit='other';},TypeError); assert.throws(()=>{l.bundleSize=25;},TypeError); exact(l); }
});
test('deliveries release existing balanced batches without generating money',()=>{
  const l=new CashLedger();
  for(let i=0;i<2;i++) { const r=ok(l,l.dumpDelivery()), notes=r.ids.map(id=>l.entities.find(e=>e.id===id)); assert.equal(r.moved,60); assert.equal(notes.filter(e=>l.denomination(e)===20).length,50); assert.equal(notes.filter(e=>l.denomination(e)===10).length,10); assert.equal(l.getEntities('pouch').length,i===0?60:0); }
  assert.equal(l.getEntities('table').length,120); no(l,()=>l.dumpDelivery(),'pouch-empty');
});
test('partial reserves wait inside and idle processing cannot spill loose cash',()=>{
  const l=first(); assert.equal(l.getEntities('reserve20').length,50); assert.equal(l.getEntities('reserve10').length,10); assert.equal(l.getEntities('output').length,0); assert.equal(l.getEntities('pouch').length,60);
  for(let i=0;i<3;i++) no(l,()=>l.tickMachine(),'input-empty');
  for(const cut of [10,20]) no(l,()=>l.bind(cut),'need-matching-notes');
  no(l,()=>l.takeOutput(),'output-empty');
});
test('reserve withdrawal chooses a denomination and requested quantity',()=>{
  const l=first(), twenties=ids(l,'reserve20'), tens=ids(l,'reserve10');
  assert.deepEqual(ok(l,l.takeReserve(10,7)).ids,tens.slice(0,7)); assert.equal(l.getEntities('reserve10').length,3); assert.deepEqual(ids(l,'reserve20'),twenties);
  for(const bad of [0,-1,1.5,NaN,Infinity,'3',null]) no(l,()=>l.takeReserve(10,bad),'invalid-limit');
  for(const bad of [5,50,'10',null]) no(l,()=>l.takeReserve(bad),'invalid-denomination');
  assert.equal(ok(l,l.takeReserve(10,25)).moved,3); no(l,()=>l.takeReserve(10),'reserve-empty');
});
test('withdrawing between deliveries delays binding until those exact notes return',()=>{
  const l=first(), taken=ok(l,l.takeReserve(20,10)).ids; ok(l,l.store(0)); ok(l,l.dumpDelivery()); feedTable(l);
  assert.equal(l.getEntities('reserve20').length,90); assert.equal(l.getEntities('reserve10').length,20); no(l,()=>l.bind(20),'need-matching-notes');
  ok(l,l.withdraw(0)); assert.deepEqual(ids(l,'hand'),taken); ok(l,l.feedSorter()); drain(l);
  const bundle=ok(l,l.bind(20)).entity; assert.equal(l.getEntities('output').length,0); assert.ok(taken.every(id=>bundle.noteIds.includes(id))); ok(l,l.eject(20)); assert.equal(l.getEntities('output')[0].id,bundle.id);
});
test('binding locks its notes while other cash remains available and target changes preserve its stamp',()=>{
  const l=new CashLedger(); l.dump(); l.pickup(ids(l,'table',100)); l.feed(); drain(l); const bundle=ok(l,l.bind(20)).entity;
  no(l,()=>l.takeReserve(20),'reserve-empty'); no(l,()=>l.takeOutput(bundle.id),'output-empty'); no(l,()=>l.bind(20),'binding-busy');
  ok(l,l.setBundleSize(25)); assert.deepEqual(l.getEntities('binding20')[0],bundle); l.pickup(ids(l,'table')); l.feed(); drain(l); ok(l,l.takeReserve(10,1)); assert.deepEqual(l.getEntities('binding20')[0],bundle);
  ok(l,l.eject(20)); assert.equal(ok(l,l.takeOutput(bundle.id)).entity.bundleSize,100); no(l,()=>l.openHand(),'hand-full');
});
test('target changes are explicit and invalid settings never change cash or bundles',()=>{
  const l=first(), original=l.snapshot().entities;
  for(const bad of [0,1,10,99,200,'25',null,NaN,Infinity]) no(l,()=>l.setBundleSize(bad),'invalid-bundle-size');
  for(const size of [25,50,100]) { ok(l,l.setBundleSize(size)); assert.equal(l.bundleSize,size); assert.deepEqual(l.entities,original); }
  const snapshot=l.snapshot(); snapshot.bundleSize=25; assert.equal(l.bundleSize,100);
});
test('smaller targets form stamped bundles without resizing previously formed bundles',()=>{
  const l=first(); l.setBundleSize(50); const a=ok(l,l.bind(20)).entity; ok(l,l.eject(20)); l.setBundleSize(25); l.dumpDelivery(); feedTable(l);
  const b=ok(l,l.bind(20)).entity; ok(l,l.eject(20)); const c=ok(l,l.bind(20)).entity; ok(l,l.eject(20));
  assert.deepEqual(l.getEntities('output').map(e=>e.bundleSize),[50,25,25]); assert.equal(a.noteIds.length,50); assert.equal(c.noteIds.length,25);
  ok(l,l.takeOutput(b.id)); ok(l,l.openHand()); assert.deepEqual(ids(l,'hand').sort(),[...b.noteIds].sort()); assert.equal(l.getEntities('output')[0].noteCount,50); assert.equal(l.getEntities('reserve10').length,20);
});
test('output selection takes only the specified completed bundle',()=>{
  const l=first(); l.setBundleSize(25); const a=ok(l,l.bind(20)).entity; ok(l,l.eject(20)); const b=ok(l,l.bind(20)).entity;
  no(l,()=>l.takeOutput(b.id),'output-empty'); ok(l,l.eject(20));
  for(const bad of ['',null,1]) no(l,()=>l.takeOutput(bad),'invalid-selection');
  no(l,()=>l.takeOutput('missing'),'output-empty'); ok(l,l.takeOutput(b.id)); assert.deepEqual(ids(l,'output'),[a.id]); assert.deepEqual(ids(l,'hand'),[b.id]);
});
test('both chambers may bind while new counted notes stay available in reserve',()=>{
  const l=new CashLedger('large'); l.dump();
  for(const cut of [20,10]) { l.pickup(l.getEntities('table').filter(e=>l.denomination(e)===cut).slice(0,100).map(e=>e.id)); l.feed(); drain(l); ok(l,l.bind(cut)); }
  const bundles=[...ids(l,'binding20'),...ids(l,'binding10')]; l.pickup(ids(l,'table',20)); l.feed(); drain(l); ok(l,l.takeReserve(20,10)); assert.equal(l.getEntities('reserve20').length,10);
  assert.equal(l.getEntities('binding20').length,1); assert.equal(l.getEntities('binding10').length,1); ok(l,l.eject(20)); ok(l,l.eject(10)); assert.deepEqual(ids(l,'output').sort(),bundles.sort()); no(l,()=>l.eject(20),'binding-empty');
});
for(const mode of ['small','large']) test(mode+' complete deliveries preserve every note through internal counting, ejection and storage',()=>{
  const l=new CashLedger(mode); let deliveries=0,counted=0;
  while(l.getEntities('pouch').length) {
    ok(l,l.dumpDelivery()); deliveries++;
    while(l.getEntities('table').length) {
      ok(l,l.pickup(ids(l,'table',100))); ok(l,l.feed());
      while(l.getEntities('input').length) {
        const r=l.tickMachine(); assert.equal(r.ok,true); counted++; const cut=l.denomination(r.entity);
        if(l.getEntities('reserve'+cut).length>=l.bundleSize) { ok(l,l.bind(cut)); assert.equal(l.getEntities('binding'+cut).length,1); ok(l,l.eject(cut)); }
      }
    }
  }
  assert.equal(deliveries,mode==='small'?2:20); assert.equal(counted,mode==='small'?120:1200);
  assert.equal(l.getEntities('reserve20').length,0); assert.equal(l.getEntities('reserve10').length,mode==='small'?20:0); assert.equal(l.getEntities('output').length,mode==='small'?1:12);
  while(l.getEntities('output').length) { ok(l,l.takeOutput()); ok(l,l.store(l.getEntities('slot0').length<10?0:1)); }
  if(mode==='small') { ok(l,l.takeReserve(10,100)); ok(l,l.store(1)); }
  assert.ok(l.entities.every(e=>e.location.startsWith('slot'))); assert.equal(l.handObjects,0); exact(l);
});