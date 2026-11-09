import test from 'node:test';
import assert from 'node:assert/strict';
import {PARENTS,getStrains,transition} from '../source/model.mjs';
import {createTestDiscovery} from '../source/test-session.mjs';
import {buildJournalEntries,filterJournalEntries,journalGraphHTML} from '../source/journal.mjs';
import {buildJournalGraph} from '../source/journal-graph.mjs';
import {VISUAL_TEXT,visualFamilyHTML,visualFeatures,shortVisualName} from '../source/visual-ui.mjs';

test('unrevealed journal does not read phenotype and cannot match visual descriptors',()=>{
 const {state}=createTestDiscovery('rare');
 const strains=getStrains(state), trial=state.trials.at(-1),id=trial.id;
 Object.defineProperty(trial,'result',{get(){throw Error('Hidden phenotype read');}});
 const entries=buildJournalEntries(state,strains,()=>({activeIds:[]}));
 const hidden=entries.find(e=>e.trialId===id);
 assert.equal(hidden.visual,null);
 for(const query of ['mauve','compact','large','cristal'])assert(!filterJournalEntries(entries,{query}).matchIds.has(hidden.id));
 const html=journalGraphHTML(buildJournalGraph([hidden]));
 assert(html.includes('data-portrait-kind="sealed"'));
 assert(!html.includes('data-head-shape'));
});

test('revealed visual projection is detached from immutable saved identity and searchable',()=>{
 let {state}=createTestDiscovery('rare');const trial=state.trials.at(-1);
 state=transition(state,{type:'REVEAL',trialId:trial.id},trial.createdAt+20000).state;
 const entries=buildJournalEntries(state,getStrains(state),()=>({activeIds:[]}));
 const entry=entries.find(e=>e.trialId===trial.id),saved=state.trials.at(-1).result;
 assert.deepEqual(entry.visual,saved.visual);
 assert(filterJournalEntries(entries,{query:shortVisualName(entry.visual,'fr')}).matchIds.has(entry.id));
 assert(filterJournalEntries(entries,{query:'mauve'}).matchIds.has(entry.id));
 entry.visual.alleles.elongation[0]=99;
 assert.notDeepEqual(entry.visual,saved.visual);
});

test('family comparison uses three inherited portraits and escapes saved names',()=>{
 const {state}=createTestDiscovery('rare'),child={...state.trials.at(-1).result,name:'<img src=x onerror=alert(1)>'};
 const parents=state.trials.at(-1).parentIds.map(id=>PARENTS.find(p=>p.id===id));
 const html=visualFamilyHTML(child,parents,'fr','qa');
 assert.equal((html.match(/data-portrait-kind="strain"/g)||[]).length,3);
 assert(html.includes('&lt;img'));
 assert(!html.includes('<img'));
 assert(html.includes('ni rareté'));
 assert(html.includes('Transmis ·'));
 assert(html.includes('Exprimé ·'));
 assert.equal(visualFeatures(child.visual).length,8);
 assert.deepEqual(Object.keys(VISUAL_TEXT.fr).sort(),Object.keys(VISUAL_TEXT.en).sort());
});

test('visual transmission labels use canonical parental order even when parent selection is reversed',()=>{
 const {state}=createTestDiscovery('rare'),child=state.trials.at(-1).result;
 const parents=state.trials.at(-1).parentIds.map(id=>PARENTS.find(p=>p.id===id));
 const html=visualFamilyHTML(child,[...parents].reverse(),'fr','order');
 const inheritedRows=[...html.matchAll(/<span class="visual-transmitted">([^<]+)<\/span>/g)].map(m=>m[1]);
 assert(inheritedRows[0].includes('X · Aromatique: Tête compacte + Z · B1: Tête ramifiée'));
});
