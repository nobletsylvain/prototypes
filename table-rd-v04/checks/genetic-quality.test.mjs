import test from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_TIERS, QUALITY_VERSION, tierForScore, getQualityOdds, drawGeneticQuality } from '../source/genetic-quality.mjs';
import { PARENTS, createState, getOdds, transition, restoreState, validateState } from '../source/model.mjs';

const SPACE = 2 ** 32;
const pair = (a, b) => [{ geneticQuality: a }, { geneticQuality: b }];
function step(state, type, extra = {}) {
  const result = transition(state, { type, trialId: state.activeTrialId, ...extra }, state.revision + 100);
  assert(result.ok, result.error); return result.state;
}
const qualitySeed = (parents, score) => getQualityOdds(parents).outcomes.find(item => item.score === score).seedStart;
const start = (score, seed = 1704791872, parents = ['x', 'z']) => step(createState(), 'START', { parentIds: parents, seed, qualitySeed: qualitySeed(parents.map(id => PARENTS.find(p => p.id === id)), score), requestId: 'same' });

test('six tiers cover every integer exactly and preserve the specified boundary colours', () => {
  assert.equal(QUALITY_VERSION, 1);
  assert.deepEqual(QUALITY_TIERS.map(({id,min,max,color}) => ({id,min,max,color})), [
    {id:'poor',min:0,max:19,color:'#7b8589'}, {id:'common',min:20,max:39,color:'#3f9765'},
    {id:'uncommon',min:40,max:59,color:'#408ed5'}, {id:'rare',min:60,max:79,color:'#db6257'},
    {id:'epic',min:80,max:99,color:'#a879d4'}, {id:'legendary',min:100,max:100,color:'#e9bf4f'},
  ]);
  for (let score = 0; score <= 100; score++) {
    const tier = tierForScore(score); assert(score >= tier.min && score <= tier.max);
    assert.equal(tier, QUALITY_TIERS.find(t => t.id === tier.id)); assert(tier.name.fr && tier.name.en);
  }
  assert(Object.isFrozen(QUALITY_TIERS)); assert(Object.isFrozen(QUALITY_TIERS[0].name));
  for (const invalid of [-1,101,.5,NaN,undefined,'60']) assert.throws(() => tierForScore(invalid), /Invalid genetic quality/);
});

test('triangular quality distribution partitions all uint32 seeds without clamping extra mass at the limits', () => {
  for (const values of [[0,0],[0,1],[0,100],[24,54],[24,84],[54,84],[89,84],[99,100],[100,100]]) {
    const odds = getQualityOdds(pair(...values)), center = Math.round((values[0] + values[1]) / 2);
    assert.equal(odds.center, center); assert.equal(odds.sampleSpace, SPACE);
    assert.equal(odds.outcomes[0].score, Math.max(0,center-20)); assert.equal(odds.outcomes.at(-1).score,Math.min(100,center+20));
    assert.equal(odds.outcomes[0].seedStart,0); assert.equal(odds.outcomes.at(-1).seedEnd,SPACE);
    assert.equal(Object.values(odds.counts).reduce((sum,count)=>sum+count,0),SPACE);
    const weightSum=odds.outcomes.reduce((sum,item)=>sum+21-Math.abs(item.score-center),0);
    odds.outcomes.forEach((item,index)=>{
      if(index) assert.equal(item.seedStart,odds.outcomes[index-1].seedEnd);
      assert.equal(item.count,item.seedEnd-item.seedStart); assert(item.count>0);
      const exactWeight=(21-Math.abs(item.score-center))/weightSum;
      assert(Math.abs(item.count/SPACE-exactWeight)<1/SPACE);
      assert.equal(item.tier,tierForScore(item.score).id);
      assert.equal(drawGeneticQuality(odds,item.seedStart),item.score);
      assert.equal(drawGeneticQuality(odds,item.seedEnd-1),item.score);
    });
    for(const tier of QUALITY_TIERS){
      assert.equal(odds.counts[tier.id],odds.outcomes.filter(o=>o.tier===tier.id).reduce((sum,o)=>sum+o.count,0));
      assert.equal(odds[tier.id],odds.counts[tier.id]*100/SPACE); assert.equal(odds[tier.id],odds.exactPercent[tier.id]);
    }
    assert.deepEqual(odds,getQualityOdds(pair(...values.reverse())));
  }
});

test('quality odds use only parental quality and never random, appearance, slots or active research', () => {
  const parents=pair(24,84);
  for(const parent of parents)for(const field of ['visual','potentialIds','slotCapacity','rarity','research'])Object.defineProperty(parent,field,{get(){throw Error(field+' read');}});
  const random=Math.random; Math.random=()=>{throw Error('Random consulted');};
  try{assert.deepEqual(getQualityOdds(parents),getQualityOdds(pair(24,84)));}finally{Math.random=random;}
  assert.deepEqual(PARENTS.map(p=>[p.id,p.geneticQuality,p.rarity]),[['x',24,'common'],['y',54,'uncommon'],['z',84,'epic']]);
  for(const pairIds of [['x','y'],['x','z'],['y','z']])assert.equal(getOdds(createState(),pairIds).legendary,0);
  assert(getQualityOdds(pair(89,84)).legendary>0);
});

test('separate quality seed changes only quality while the inheritance seed changes only inherited identity', () => {
  const low=start(34).trials[0],high=start(74).trials[0];
  const withoutQuality=trial=>{const result=structuredClone(trial.result);delete result.geneticQuality;delete result.rarity;return result;};
  assert.deepEqual(withoutQuality(low),withoutQuality(high)); assert.deepEqual(low.batch,high.batch);
  assert.equal(low.result.rarity,'common');assert.equal(high.result.rarity,'rare');
  for(const seed of [0,1,2000000000,SPACE-1]){
    const changed=start(60,seed).trials[0]; assert.equal(changed.result.geneticQuality,60);assert.equal(changed.result.rarity,'rare');
    assert.equal(changed.batch.quality,'demo-standard');assert.equal(changed.batch.quantity,1);
  }
});

test('60 is the exact reward boundary and high-tier children still award only one point per actual parent', () => {
  for(const [parents,score] of [[['x','z'],59],[['x','z'],60],[['y','z'],79],[['y','z'],80],[['y','z'],89]]){
    let state=start(score,0,parents);
    for(const type of ['ADVANCE','INSPECT'])state=step(state,type);
    assert(PARENTS.every(p=>state.research[p.id].earned===0));
    state=step(state,'REVEAL');
    for(const parent of PARENTS)assert.equal(state.research[parent.id].earned,score>=60&&parents.includes(parent.id)?1:0);
    assert.equal(state.trials[0].pointsAwarded,score>=60);
    const reloaded=restoreState(JSON.stringify(state)),repeat=transition(reloaded,{type:'REVEAL',trialId:state.activeTrialId});
    assert.equal(repeat.ok,false);assert.equal(repeat.state,reloaded);
  }
});

test('saved quality and both seeds survive every phase and duplicate request replay', () => {
  let state=start(60),identity=structuredClone(state.trials[0].result);
  for(const type of ['ADVANCE','INSPECT','REVEAL','KEEP']){
    state=restoreState(JSON.stringify(state));assert.deepEqual(state.trials[0].result,identity);
    const retry=transition(state,{type:'START',requestId:'same',seed:SPACE-1,qualitySeed:SPACE-1,parentIds:['y','z']});
    assert.equal(retry.state,state);assert.equal(retry.event,'request-already-committed');
    state=step(state,type,type==='KEEP'?{name:'Stable quality'}:{});
  }
  assert.equal(state.trials[0].qualitySeed,state.history[0].command.qualitySeed);
  assert.equal(state.varieties[0].geneticQuality,60);assert.equal(validateState(state),state);
  for(const change of [s=>s.trials[0].result.geneticQuality++,s=>s.varieties[0].rarity='epic',s=>s.trials[0].qualitySeed++,s=>s.trials[0].odds.qualityOdds.counts.rare++]){
    const copy=structuredClone(state);change(copy);assert.throws(()=>restoreState(copy),/Invalid research state/);
  }
});

test('schema 5 starts a separate career and rejects old archives rather than migrating their rewards', () => {
  const state=createState();assert.equal(state.schema,5);
  for(const schema of [2,3,4])assert.throws(()=>restoreState({...state,schema}),/unsupported schema; V04 requires a new career/);
  for(const seed of [undefined,-1,SPACE,.5,NaN]){
    const result=transition(state,{type:'START',parentIds:['x','z'],seed:0,qualitySeed:seed,requestId:'missing'});
    assert.equal(result.ok,false);assert.equal(result.error,'quality-seed-required');assert.equal(result.state,state);
  }
  for(const invalid of [-1,SPACE,.1,undefined])assert.throws(()=>drawGeneticQuality(getQualityOdds(pair(24,84)),invalid),/Invalid genetic quality/);
});
