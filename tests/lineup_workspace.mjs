import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lineupKey,lineupEvidenceExport} from '../dist/lineup-comparison.mjs';
import {lineupInputs,normalizeLineupStudy,readLineupStudies,saveLineupStudy} from '../dist/lineup-workspace.mjs';
const all=JSON.parse(fs.readFileSync(new URL('../dist/spatial.json',import.meta.url))).lineups;
const records=new Map(),storage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)};
for(const team of new Set(all.map(l=>l.team))){
 const units=all.filter(l=>l.team===team),state={team,minPoss:0,priorStrength:200,lineupA:lineupKey(units[0]),lineupB:lineupKey(units[1])};
 const saved=normalizeLineupStudy(lineupInputs(state),all);
 assert.deepEqual(lineupInputs(saved),lineupInputs(state));
 const evidence=JSON.parse(JSON.stringify(lineupEvidenceExport(all,state)));evidence.a.net=9999;evidence.difference=9999;evidence.eligibleCohort=[];
 assert.deepEqual(normalizeLineupStudy(evidence,all),saved);
 assert.notEqual(all.find(l=>l.team===team&&lineupKey(l)===state.lineupA).net,9999);
 saveLineupStudy(storage,state,all);saveLineupStudy(storage,state,all);
 assert.equal(readLineupStudies(storage,all).filter(s=>s.team===team).length,1);
}
assert.equal(readLineupStudies(storage,all).length,8);
const entry=readLineupStudies(storage,all)[0];
for(const invalid of [null,{}, {...entry,season:'2025-26'}, {...entry,prior:999}, {...entry,minimumPossessions:-1}, {...entry,team:'XXX'}, {...entry,bKey:entry.aKey}, {...entry,aKey:'missing'}, {...entry,schemaVersion:9}, {schemaVersion:2,season:'2024-25',a:{ids:[1,1,1,1,1]},b:{ids:[1,2,3,4,5]}}])assert.throws(()=>normalizeLineupStudy(invalid,all));
const units=all.filter(l=>l.team===entry.team),largest=Math.max(...units.map(l=>l.poss));
assert.throws(()=>normalizeLineupStudy({...entry,minimumPossessions:largest+1},all));
assert.throws(()=>readLineupStudies({getItem:()=>'{oops'},all));
assert.throws(()=>readLineupStudies({getItem:()=>JSON.stringify({})},all));
assert.throws(()=>readLineupStudies({getItem:()=>'x'.repeat(100001)},all));
assert.throws(()=>saveLineupStudy({getItem:()=>null,setItem:()=>{throw Error('blocked')}},normalizeLineupStudy(entry,all),all));
console.log('PASS: 30 team save/export round-trips; imported-result isolation; deduplication; eight-save cap; invalid inputs, corruption and storage failures.');
