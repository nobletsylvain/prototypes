import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, transition, restoreState, validateState, getStrains, getOdds, QUALITY_TIERS, tierForScore } from '../source/model.mjs';
import { NORMAL_SAVE_KEY, TEST_SAVE_KEY, getTestSeed, createTestDiscovery } from '../source/test-session.mjs';
const reload = state => restoreState(JSON.stringify(state));
function step(state, type, extra = {}) {
  const result = transition(state, {type,trialId:state.activeTrialId,...extra},1000+state.revision);
  assert(result.ok,result.error);return result.state;
}
const finish = (state,keep=false) => step(step(state,'REVEAL'),keep?'KEEP':'ARCHIVE',keep?{name:'Quality test descendant',signature:'Test'}:{});
function discover(tier='rare',state=null,target=null){const result=createTestDiscovery(tier,state,target);assert(result.ok,result.error);return result;}
function refused(state,tier,target,error){const before=JSON.stringify(state),result=createTestDiscovery(tier,state,target);assert.equal(result.ok,false);assert.equal(result.error,error);assert.equal(result.state,state);assert.equal(JSON.stringify(state),before);}

test('normal and test V04 keys are distinct from all prior careers',()=>{
  assert.equal(NORMAL_SAVE_KEY,'botanical-table-v04');assert.equal(TEST_SAVE_KEY,'botanical-table-v04-test');assert.notEqual(NORMAL_SAVE_KEY,TEST_SAVE_KEY);
});

test('every requested quality tier is reachable through the normal model and ends inspected',()=>{
  const expected={poor:19,common:39,uncommon:54,rare:69,epic:80,legendary:100};
  for(const {id:tier} of QUALITY_TIERS){
    const result=discover(tier),state=result.state,trial=state.trials.at(-1);
    assert.equal(trial.phase,'inspected');assert.equal(trial.result.rarity,tier);assert.equal(trial.result.geneticQuality,expected[tier]);
    assert.equal(trial.pointsAwarded,false);assert.equal(tierForScore(trial.result.geneticQuality).id,tier);
    assert.equal(state.pot.trialId,null);assert.equal(validateState(state),state);assert.deepEqual(reload(state),state);
    assert.equal(state.inventory.length+state.trials.length*2,9+state.harvests.length);
    assert(trial.qualitySeed>=trial.odds.qualityOdds.outcomes.find(o=>o.score===expected[tier]).seedStart);
  }
});

test('quality fixture seeds select existing tier intervals, with null for unavailable or obsolete tiers',()=>{
  for(const parents of [['x','y'],['x','z'],['y','z']]){
    const odds=getOdds(createState(),parents);
    for(const {id:tier}of QUALITY_TIERS){
      const seed=getTestSeed(odds,tier);assert.equal(seed,getTestSeed(odds.qualityOdds,tier));
      if(odds[tier]===0)assert.equal(seed,null);
      else{assert(Number.isInteger(seed));const outcome=odds.qualityOdds.outcomes.find(o=>seed>=o.seedStart&&seed<o.seedEnd);assert.equal(outcome.tier,tier);}
    }
    assert.equal(getTestSeed(odds,'exceptional'),null);assert.equal(getTestSeed(null,'rare'),null);
  }
});

test('single-step fixtures award no early points and final revelation uses the normal threshold once',()=>{
  for(const tier of ['poor','common','uncommon','rare','epic']){
    let state=discover(tier).state;assert(Object.values(state.research).every(r=>r.earned===0));
    const parents=state.trials.at(-1).parentIds,expected=state.trials.at(-1).result.geneticQuality>=60?1:0;
    state=step(state,'REVEAL');for(const parent of parents)assert.equal(state.research[parent].earned,expected);
    const duplicate=transition(state,{type:'REVEAL',trialId:state.activeTrialId});assert.equal(duplicate.ok,false);assert.equal(duplicate.state,state);
  }
});

test('Legendary setup transparently retains an ordinary-command genetic bridge and its earned rewards',()=>{
  const result=discover('legendary'),state=result.state,[bridge,child]=state.trials;
  assert.deepEqual(result.setupTrialIds,[bridge.id]);assert.equal(result.setupLabels.length,1);
  assert.deepEqual(bridge.parentIds,['y','z']);assert.equal(bridge.result.geneticQuality,89);assert.equal(bridge.phase,'kept');
  assert.equal(state.varieties[0].geneticQuality,89);assert.equal(state.varieties[0].slotCapacity,5);
  assert(child.parentIds.includes(state.varieties[0].id));assert(child.parentIds.includes('z'));
  assert.equal(child.result.geneticQuality,100);assert(child.odds.legendary>0);assert.equal(child.pointsAwarded,false);
  assert.equal(state.research.y.earned,1);assert.equal(state.research.z.earned,1);assert.equal(state.research[bridge.result.id].earned,0);
  assert.equal(state.history.filter(h=>h.command.type==='REVEAL').length,1);
  const revealed=step(state,'REVEAL');assert.equal(revealed.research.z.earned,2);assert.equal(revealed.research[bridge.result.id].earned,1);
  assert.equal(revealed.trials.at(-1).batch.quality,'demo-standard');
});

test('in-progress and invalid requests refuse atomically with the original reference',()=>{
  const state=discover().state;
  refused(state,'rare',null,'test-trial-in-progress');refused(state,'exceptional',null,'invalid-test-tier');
  const terminal=finish(state);refused(terminal,'rare','missing','test-parent-unavailable');
  refused(terminal,'legendary','x','test-tier-unavailable');
  const invalid={...terminal,schema:4};refused(invalid,'rare',null,'invalid-test-state');
});

test('repeating fixtures preserves research and activation choices instead of adding free points',()=>{
  let state=finish(discover('rare',null,'x').state);
  assert.equal(state.research.x.earned,1);state=step(state,'ACTIVATE',{varietyId:'x',slotIndex:0,traitId:'citrus'});
  const old=structuredClone(state.research.x);state=discover('rare',reload(state),'x').state;
  assert.deepEqual(state.research.x,old);state=finish(state);assert.equal(state.research.x.earned,2);assert.equal(state.research.x.spent,1);
  assert.equal(state.research.x.choices['slot-0'],'citrus');
  const occupied=transition(state,{type:'ACTIVATE',varietyId:'x',slotIndex:0,traitId:'floral'});assert.equal(occupied.ok,false);assert.equal(occupied.state,state);
});

test('a retained five-slot bridge can earn five real descendant points within its finite eight-cutting budget',()=>{
  let state=finish(discover('legendary').state),parent=state.varieties[0];
  assert.equal(parent.slotCapacity,5);assert.equal(state.research[parent.id].earned,1);
  const baseline=state.research[parent.id].earned;
  for(let index=0;index<5;index++){
    const prepared=discover('rare',state,parent.id);assert.equal(prepared.setupTrialIds.length,0);
    assert(prepared.state.trials.at(-1).parentIds.includes(parent.id));assert.equal(prepared.state.research[parent.id].earned,baseline+index);
    state=finish(prepared.state);
  }
  assert.equal(state.research[parent.id].earned,baseline+5);
  const plant=state.plants.find(p=>p.varietyId===parent.id);assert.equal(plant.capacity,8);assert.equal(plant.harvested,6);
  assert.deepEqual(getStrains(state).find(p=>p.id===parent.id),parent);
});

test('finite fixture resources eventually refuse without refund, partial harvest or hidden setup commit',()=>{
  let state=createState(),successes=0;
  while(successes<12){const result=createTestDiscovery('rare',state);if(!result.ok){assert.equal(result.error,'test-cuttings-exhausted');assert.equal(result.state,state);break;}state=finish(result.state);successes++;}
  assert.equal(successes,6);refused(state,'rare',null,'test-cuttings-exhausted');
  assert.equal(state.trials.length,6);assert.equal(state.varieties.length,0);
  assert.equal(state.inventory.length+state.trials.length*2,9+state.harvests.length);
  const before=JSON.stringify(state),legend=createTestDiscovery('legendary',state);assert.equal(legend.ok,false);assert.equal(legend.state,state);assert.equal(JSON.stringify(state),before);
});

test('quality and inheritance seed replay ignores gesture precision and retry data',()=>{
  const first=discover('legendary').state,second=discover('legendary').state;
  assert.deepEqual(first.trials.map(t=>t.result),second.trials.map(t=>t.result));
  assert.deepEqual(first.trials.map(t=>[t.seed,t.qualitySeed]),second.trials.map(t=>[t.seed,t.qualitySeed]));
  const target=first.trials.at(-1),state=reload(first),retry=transition(state,{type:'START',parentIds:['x','y'],seed:0,qualitySeed:0,requestId:target.requestId,precision:0,x:99999});
  assert.equal(retry.ok,true);assert.equal(retry.state,state);assert.equal(retry.event,'request-already-committed');
});

test('explicit sandbox reset leaves supplied and normal states untouched',()=>{
  const normal=createState(),normalBefore=JSON.stringify(normal);let previous=finish(discover('rare',null,'x').state);
  previous=step(previous,'ACTIVATE',{varietyId:'x',slotIndex:0,traitId:'floral'});const before=JSON.stringify(previous);
  const reset=discover().state;assert.equal(reset.research.x.earned,0);assert.equal(reset.research.x.spent,0);
  assert.equal(JSON.stringify(normal),normalBefore);assert.equal(JSON.stringify(previous),before);
});
