import test from 'node:test';
import assert from 'node:assert/strict';
import { getRevealStage } from '../source/reveal-stage.mjs';
import { QUALITY_TIERS } from '../source/genetic-quality.mjs';

test('Intermediate stages never promise a tier above or equal to the unopened result',()=>{
 for(const [finalRank,tier] of QUALITY_TIERS.entries()){
  let previous=-1;
  for(let step=0;step<1000;step++){
   const stage=getRevealStage(tier.id,step/1000),rank=stage?QUALITY_TIERS.findIndex(t=>t.id===stage.id):-1;
   assert.ok(rank>=previous);assert.ok(rank<finalRank);previous=rank;
  }
  assert.equal(getRevealStage(tier.id,1).id,tier.id);
 }
});
test('Hold staging is independent of frame cadence and safely starts neutral',()=>{
 assert.equal(getRevealStage('legendary',0),null);
 assert.equal(getRevealStage('unknown',1),null);
 assert.equal(getRevealStage('rare',NaN),null);
 assert.deepEqual(getRevealStage('legendary',.6),getRevealStage('legendary',.6));
 assert.equal(getRevealStage('legendary',.999).id,'epic');
});
