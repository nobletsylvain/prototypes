import test from 'node:test';
import assert from 'node:assert/strict';
import { selectNearbyNotes, resolveIntake, isTableDrop } from '../gesture.mjs';

const notes = Array.from({ length: 120 }, (_, i) => ({ id: `note-${String(i).padStart(3, '0')}`, x: (i % 12) * .014, z: Math.floor(i / 12) * .014 }));
test('a direct grab chooses a real handful, deterministically nearest first', () => {
  const ids = selectNearbyNotes(notes, { x: .05, z: .04 }, 100);
  assert.equal(ids.length, 24); assert.equal(new Set(ids).size, 24);
  assert.deepEqual(ids, selectNearbyNotes([...notes].reverse(), { x: .05, z: .04 }, 100));
});
test('gathering respects remaining capacity and never reaches distant notes', () => {
  assert.equal(selectNearbyNotes(notes, { x: .05, z: .04 }, 7).length, 7);
  assert.deepEqual(selectNearbyNotes(notes, { x: .05, z: .04 }, 0), []);
  assert.deepEqual(selectNearbyNotes(notes, { x: 8, z: 8 }, 100), []);
});
test('the nearest visible inlet wins without crossing into the other circuit', () => {
  const targets = { sorter: { x: 90, y: 150, visible: true, radius: 45 }, counter: { x: 190, y: 150, visible: true, radius: 45 }, combined: { x: 140, y: 150, visible: false, radius: 80 } };
  assert.equal(resolveIntake({ x: 110, y: 150 }, targets), 'sorter');
  assert.equal(resolveIntake({ x: 180, y: 160 }, targets), 'counter');
  assert.equal(resolveIntake({ x: 140, y: 150 }, targets), null);
});
test('empty space and cancelled drops cannot become accidental machine deposits', () => {
  assert.equal(resolveIntake({ x: 0, y: 0 }, {}), null);
  assert.equal(isTableDrop(null), false); assert.equal(isTableDrop({ x: NaN, z: .3 }), false);
  assert.equal(isTableDrop({ x: 0, z: -.3 }), false); assert.equal(isTableDrop({ x: 3, z: .3 }), false);
  assert.equal(isTableDrop({ x: .4, z: .32 }), true);
});


import { CashScene } from '../scene.mjs';
import { CashLedger } from '../ledger.mjs';
import * as THREE from '../assets/three.module.js';

class Target {
  constructor(){this.handlers=new Map();}
  addEventListener(type,handler){this.handlers.set(type,handler);}
  dispatch(type,event={}){this.handlers.get(type)?.({pointerId:1,clientX:10,clientY:10,preventDefault(){},...event});}
  setPointerCapture(){}
  getBoundingClientRect(){return{left:0,top:0,width:360,height:740};}
}
function pointerHarness(){
  const previousWindow=globalThis.window,previousDocument=globalThis.document;
  const fakeWindow=new Target(),fakeDocument=new Target();
  globalThis.window=fakeWindow;globalThis.document=fakeDocument;
  const scene=Object.create(CashScene.prototype),canvas=new Target(),ledger=new CashLedger('small','separate');ledger.dump();
  Object.assign(scene,{canvas,ledger,look:false,gesture:null,handDrag:null,hoverTarget:null,views:new Map(),targets:new Map(),ring:{position:new THREE.Vector3(),visible:false}});
  for(const [index,e] of ledger.entities.entries()){scene.views.set(e.id,{position:new THREE.Vector3((index%12)*.01,.75,Math.floor(index/12)*.01)});}
  scene.hitAt=(x)=>x<50?{action:'handful',point:new THREE.Vector3(.05,.75,.04)}:null;
  scene.planePoint=(x,y,height)=>new THREE.Vector3(x/1000,height??.9,y/1000);
  scene.getHotspots=()=>({sorter:{x:100,y:100,visible:true,radius:36},counter:{x:200,y:100,visible:true,radius:36}});
  const events=[];
  scene.onSelect=event=>{events.push(event);if(event.action==='handful')return ledger.pickup(event.ids).ok;if(event.action==='sorter')return ledger.feedSorter().ok;if(event.action==='counter')return ledger.feedCounter().ok;if(event.action==='drop')return ledger.dropHand().ok;};
  scene.installControls();
  return {scene,canvas,ledger,events,fakeWindow,restore(){globalThis.window=previousWindow;globalThis.document=previousDocument;}};
}

test('real pointer handlers carry 24 original notes to the sorter in one drag', () => {
  const h=pointerHarness();try{
    h.canvas.dispatch('pointerdown');assert.equal(h.ledger.handObjects,24);
    const identities=h.ledger.getEntities('hand').map(e=>e.id);
    h.canvas.dispatch('pointermove',{clientX:100,clientY:100});assert.equal(h.scene.getInteractionState().hoverTarget,'sorter');
    h.canvas.dispatch('pointerup',{clientX:100,clientY:100});
    assert.equal(h.ledger.handObjects,0);assert.deepEqual(h.ledger.getEntities('sortInput').map(e=>e.id),identities);assert.equal(h.ledger.verify().ok,true);assert.equal(h.scene.getInteractionState().dragging,false);
  }finally{h.restore();}
});
test('a tap keeps its handful and a following inlet tap deposits it', () => {
  const h=pointerHarness();try{
    h.canvas.dispatch('pointerdown');h.canvas.dispatch('pointerup');assert.equal(h.ledger.handObjects,24);assert.equal(h.ledger.getEntities('sortInput').length,0);
    h.canvas.dispatch('pointerdown',{clientX:100,clientY:100});h.canvas.dispatch('pointerup',{clientX:100,clientY:100});
    assert.equal(h.ledger.getEntities('sortInput').length,24);assert.equal(h.ledger.verify().ok,true);
  }finally{h.restore();}
});
test('pointer cancellation and focus loss keep held identities without a deposit', () => {
  const h=pointerHarness();try{
    h.canvas.dispatch('pointerdown');const before=h.ledger.snapshot();h.canvas.dispatch('pointermove',{clientX:100,clientY:100});h.canvas.dispatch('pointercancel');
    assert.deepEqual(h.ledger.snapshot(),before);assert.equal(h.scene.handDrag,null);
    h.canvas.dispatch('pointerdown',{clientX:100,clientY:100});h.fakeWindow.dispatch('blur');assert.deepEqual(h.ledger.snapshot(),before);assert.equal(h.scene.gesture,null);
  }finally{h.restore();}
});
test('looking and unrelated fingers cannot move money', () => {
  const h=pointerHarness();try{
    h.scene.look=true;const before=h.ledger.snapshot();h.canvas.dispatch('pointerdown');h.canvas.dispatch('pointerup');assert.deepEqual(h.ledger.snapshot(),before);
    h.scene.look=false;h.canvas.dispatch('pointerdown');const held=h.ledger.snapshot();h.canvas.dispatch('pointerup',{pointerId:2,clientX:100,clientY:100});assert.deepEqual(h.ledger.snapshot(),held);assert.notEqual(h.scene.gesture,null);
  }finally{h.restore();}
});
test('a miss remains in hand while a deliberate table drop preserves every note', () => {
  const h=pointerHarness();try{
    h.canvas.dispatch('pointerdown');h.canvas.dispatch('pointermove',{clientX:320,clientY:0});h.canvas.dispatch('pointerup',{clientX:320,clientY:0});assert.equal(h.ledger.handObjects,24);
    h.canvas.dispatch('pointerdown',{clientX:300,clientY:300});h.canvas.dispatch('pointermove',{clientX:310,clientY:310});h.canvas.dispatch('pointerup',{clientX:310,clientY:310});
    assert.equal(h.ledger.handObjects,0);assert.equal(h.ledger.getEntities('table').length,120);assert.equal(h.ledger.verify().ok,true);assert.ok(h.events.find(e=>e.action==='drop')?.position);
  }finally{h.restore();}
});


test('a carried handful cannot occlude the slot receiving its drop', () => {
  const h=pointerHarness();try{
    h.canvas.dispatch('pointerdown');h.canvas.dispatch('pointerup');
    const held=h.ledger.getEntities('hand'),noteMesh={userData:{denomination:20},visible:true};
    const slot={userData:{action:'slot',index:0},visible:true};
    h.scene.instanceIds={20:[held[0].id]};h.scene.noteInstances={20:noteMesh};h.scene.pickables=[slot];h.scene.bundleViews=new Map();
    h.scene.setPointerRay=()=>{};h.scene.ray={intersectObjects:()=>[{instanceId:0,object:noteMesh,point:new THREE.Vector3(.8,.9,.2)},{object:slot,point:new THREE.Vector3(.8,.76,.2)}]};
    h.scene.hitAt=CashScene.prototype.hitAt;
    const previousSelect=h.scene.onSelect;h.scene.onSelect=event=>event.action==='slot'?h.ledger.store(event.index).ok:previousSelect(event);
    h.canvas.dispatch('pointerdown',{clientX:300,clientY:200});h.canvas.dispatch('pointermove',{clientX:320,clientY:210});h.canvas.dispatch('pointerup',{clientX:320,clientY:210});
    assert.equal(h.ledger.handObjects,0);assert.equal(h.ledger.getEntities('slot0').length,24);assert.equal(h.ledger.verify().ok,true);
  }finally{h.restore();}
});


test('the measured visible inlet label accepts its top edge and corners outside the inlet disk', () => {
  const targets={sorter:{x:100,y:100,visible:true,radius:36,rect:{left:53,top:52,right:147,bottom:100}}};
  for(const point of [{x:100,y:52},{x:53,y:52},{x:147,y:52},{x:147,y:100}])assert.equal(resolveIntake(point,targets),'sorter');
  assert.equal(resolveIntake({x:52,y:52},targets),null);
});
test('a measured label cannot activate hidden or absent circuit targets', () => {
  const rect={left:53,top:52,right:147,bottom:100};
  assert.equal(resolveIntake({x:54,y:53},{sorter:{x:100,y:100,visible:false,radius:36,rect}}),null);
  assert.equal(resolveIntake({x:54,y:53},{combined:{x:200,y:100,visible:true,radius:36}}),null);
});
test('a real drag released at the visible label corner feeds the intended machine', () => {
  const h=pointerHarness();try{
    h.scene.setIntakeRegions({sorter:{left:53,top:52,right:147,bottom:100}});
    h.canvas.dispatch('pointerdown');h.canvas.dispatch('pointermove',{clientX:54,clientY:53});h.canvas.dispatch('pointerup',{clientX:54,clientY:53});
    assert.equal(h.ledger.handObjects,0);assert.equal(h.ledger.getEntities('sortInput').length,24);assert.equal(h.ledger.verify().ok,true);
  }finally{h.restore();}
});
