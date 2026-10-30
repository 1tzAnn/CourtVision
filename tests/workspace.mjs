import assert from 'node:assert/strict';
import {normalizeScenario,scenarioInputs,readScenarios,saveScenario} from '../dist/workspace.mjs';
const teams=['BOS','OKC','DEN'];
const state={seriesA:'BOS',seriesB:'OKC',seriesCourt:'A',seriesWinsA:1,seriesWinsB:2,seriesAdjustment:20};
const input=scenarioInputs(state);
assert.deepEqual(normalizeScenario(input,teams),state);
const enriched={...input,model:{features:['malicious'],coef:[999]},scenario:{winA:1},unexpected:'ignore'};
assert.deepEqual(normalizeScenario(enriched,teams),state);
for(const change of [{schemaVersion:2},{snapshot:'2026-27'},{teamA:'UNKNOWN'},{teamB:'BOS'},
  {currentScore:[4,0]},{currentScore:[1.5,2]},{currentScore:['1',2]},
  {homeCourt:'C'},{adjustmentEloA:200},{adjustmentEloA:15},{adjustmentEloA:NaN}])
  assert.throws(()=>normalizeScenario({...input,...change},teams));
let saved=null;
const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
assert.deepEqual(readScenarios(storage,teams),[]);
saveScenario(storage,state,teams);saveScenario(storage,state,teams);
assert.equal(readScenarios(storage,teams).length,1);
for(let i=0;i<11;i++)saveScenario(storage,{...state,seriesAdjustment:-100+i*10},teams);
const list=readScenarios(storage,teams);
assert.equal(list.length,8);assert.equal(list[0].adjustmentEloA,0);
assert.equal(list[7].adjustmentEloA,-70);
saved='invalid';assert.throws(()=>readScenarios(storage,teams));
saved='x'.repeat(100001);assert.throws(()=>readScenarios(storage,teams));
assert.throws(()=>saveScenario({getItem:()=>null,setItem:()=>{throw Error('quota')}},state,teams));
console.log('PASS: workspace round-trip, imported-output isolation, 11 invalid input cases, deduplication, 8-save cap, corrupt/oversized storage and storage failures.');
