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

test('all six tiers are reachable in one fresh normal-model trial ending inspected',()=>{
  for(const {id:tier} of QUALITY_TIERS){
    const result=discover(tier),state=result.state,trial=state.trials.at(-1);
    assert.equal(state.trials.length,1);assert.equal(state.varieties.length,0);
    assert.deepEqual(result.setupTrialIds,[]);assert.deepEqual(result.setupLabels,[]);
    assert.equal(trial.phase,'inspected');assert.equal(trial.result.rarity,tier);
    assert.equal(trial.pointsAwarded,false);assert.equal(tierForScore(trial.result.geneticQuality).id,tier);
    assert(Object.values(state.research).every(research=>research.earned===0&&research.spent===0));
    assert.equal(state.pot.trialId,null);assert.equal(validateState(state),state);assert.deepEqual(reload(state),state);
    assert.equal(state.inventory.length,7);assert.equal(state.harvests.length,0);
    assert.deepEqual(state.history.map(item=>item.command.type),['START','ADVANCE','INSPECT']);
    const outcome=trial.odds.qualityOdds.outcomes.find(item=>trial.qualitySeed>=item.seedStart&&trial.qualitySeed<item.seedEnd);
    assert.equal(outcome.score,trial.result.geneticQuality);assert.equal(outcome.tier,tier);
    assert.deepEqual(state.trials.map(item=>item.result),reload(state).trials.map(item=>item.result));
  }
});

test('fixture seeds select positive intervals for every tier and founder pair',()=>{
  for(const parents of [['x','y'],['x','z'],['y','z']]){
    const odds=getOdds(createState(),parents);
    for(const {id:tier}of QUALITY_TIERS){
      const seed=getTestSeed(odds,tier);assert.equal(seed,getTestSeed(odds.qualityOdds,tier));
      assert(odds[tier]>0);assert(Number.isInteger(seed));
      const outcome=odds.qualityOdds.outcomes.find(item=>seed>=item.seedStart&&seed<item.seedEnd);
      assert.equal(outcome.tier,tier);assert(outcome.count>0);
    }
    assert.equal(getTestSeed(odds,'exceptional'),null);assert.equal(getTestSeed(null,'rare'),null);
    assert.equal(getTestSeed({outcomes:[]},'rare'),null);
  }
});

test('single-step fixtures award no early points and final revelation uses the normal threshold once',()=>{
  for(const {id:tier} of QUALITY_TIERS){
    let state=discover(tier).state;assert(Object.values(state.research).every(r=>r.earned===0));
    const parents=state.trials.at(-1).parentIds,expected=state.trials.at(-1).result.geneticQuality>=60?1:0;
    state=step(state,'REVEAL');for(const parent of parents)assert.equal(state.research[parent].earned,expected);
    const duplicate=transition(state,{type:'REVEAL',trialId:state.activeTrialId});assert.equal(duplicate.ok,false);assert.equal(duplicate.state,state);
  }
});

test('Legendary uses fresh X and Y directly and awards one point per parent only on revelation',()=>{
  const result=discover('legendary'),state=result.state,[child]=state.trials;
  assert.deepEqual(result.setupTrialIds,[]);assert.deepEqual(result.setupLabels,[]);
  assert.equal(state.trials.length,1);assert.equal(state.varieties.length,0);
  assert.deepEqual(child.parentIds,['x','y']);assert.equal(child.result.geneticQuality,100);
  assert(child.odds.legendary>0);assert.equal(child.pointsAwarded,false);
  assert.equal(state.research.x.earned,0);assert.equal(state.research.y.earned,0);assert.equal(state.research.z.earned,0);
  assert.equal(state.history.filter(item=>item.command.type==='REVEAL').length,0);
  const revealed=step(reload(state),'REVEAL');
  assert.equal(revealed.research.x.earned,1);assert.equal(revealed.research.y.earned,1);assert.equal(revealed.research.z.earned,0);
  assert.equal(revealed.trials[0].pointsAwarded,true);assert.equal(revealed.trials[0].batch.quality,'demo-standard');
  assert.deepEqual(revealed.inventory,state.inventory);assert.deepEqual(revealed.plants,state.plants);
  const replay=reload(revealed),duplicate=transition(replay,{type:'REVEAL',trialId:child.id});
  assert.equal(duplicate.ok,false);assert.equal(duplicate.state,replay);
});

test('in-progress and invalid requests refuse atomically with the original reference',()=>{
  const state=discover().state;
  refused(state,'rare',null,'test-trial-in-progress');refused(state,'exceptional',null,'invalid-test-tier');
  const terminal=finish(state);refused(terminal,'rare','missing','test-parent-unavailable');
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

test('a retained five-slot discovery earns five real descendant points within its finite eight-cutting budget',()=>{
  let state=finish(discover('legendary').state,true),parent=state.varieties[0];
  assert.equal(parent.slotCapacity,5);assert.equal(state.research[parent.id].earned,0);
  const baseline=state.research[parent.id].earned;
  for(let index=0;index<5;index++){
    const prepared=discover('rare',state,parent.id);assert.equal(prepared.setupTrialIds.length,0);
    assert(prepared.state.trials.at(-1).parentIds.includes(parent.id));assert.equal(prepared.state.research[parent.id].earned,baseline+index);
    state=finish(prepared.state);
  }
  assert.equal(state.research[parent.id].earned,baseline+5);
  const plant=state.plants.find(p=>p.varietyId===parent.id);assert.equal(plant.capacity,8);assert.equal(plant.harvested,5);
  assert.deepEqual(getStrains(state).find(p=>p.id===parent.id),parent);
});

test('preparation chooses a stocked pair when the preferred pair is exhausted and debits both real harvests',()=>{
  let state=createState();
  for(let index=0;index<3;index++)state=finish(discover('poor',state,'x').state);
  for(let index=0;index<3;index++)state=finish(discover('rare',state,'y').state);
  const before=structuredClone(state),prepared=discover('rare',state).state,trial=prepared.trials.at(-1);
  assert.deepEqual(trial.parentIds,['x','z']);assert.equal(prepared.trials.length,state.trials.length+1);
  assert.equal(prepared.harvests.length,state.harvests.length+2);
  assert.deepEqual(prepared.history.slice(state.history.length).map(item=>item.command.type),['HARVEST','HARVEST','START','ADVANCE','INSPECT']);
  assert.deepEqual(prepared.research,state.research);assert.deepEqual(state,before);
  assert.equal(prepared.inventory.length+prepared.trials.length*2,9+prepared.harvests.length);
  assert.equal(validateState(prepared),prepared);
  refused(state,'legendary','y','test-cuttings-exhausted');
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
