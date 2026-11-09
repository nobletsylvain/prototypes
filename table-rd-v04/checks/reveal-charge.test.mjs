import test from 'node:test';
import assert from 'node:assert/strict';
import {createRevealCharge} from '../source/reveal-charge.mjs';

test('release pauses and retains accumulated progress',()=>{
 const charge=createRevealCharge();charge.start();charge.advance(840);charge.pause();
 assert.equal(charge.advance(10000).progress,.4);charge.start();
 assert.equal(charge.advance(1260).didComplete,true);
});
test('keyboard repeat and duplicate starts do not accelerate completion',()=>{
 const charge=createRevealCharge();for(let i=0;i<20;i++)charge.start();
 assert.equal(charge.advance(2099).didComplete,false);
 assert.equal(charge.advance(1).didComplete,true);
});
test('a completed charge can emit completion only once',()=>{
 const charge=createRevealCharge();charge.start();assert.equal(charge.advance(2100).didComplete,true);
 charge.start();assert.equal(charge.advance(2100).didComplete,false);
 assert.equal(charge.state.active,false);
});
test('assisted and interrupted holds finish at the same presentation threshold',()=>{
 const assisted=createRevealCharge(),held=createRevealCharge();assisted.start();assisted.advance(2100);
 for(let i=0;i<10;i++){held.start();held.advance(210);held.pause();}
 assert.deepEqual(held.state,assisted.state);
});
test('reset removes progress and prevents old completion from carrying to another trial',()=>{
 const charge=createRevealCharge();charge.start();charge.advance(2000);charge.reset();
 assert.deepEqual(charge.state,{progress:0,active:false,completed:false});
 charge.start();assert.equal(charge.advance(200).didComplete,false);
});
test('invalid time cannot poison progress',()=>{
 const charge=createRevealCharge();charge.start();charge.advance(200);const before=charge.state;
 for(const value of [NaN,Infinity,-1])assert.throws(()=>charge.advance(value));
 assert.deepEqual(charge.state,before);
});
