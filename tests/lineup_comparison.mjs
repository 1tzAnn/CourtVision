import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lineupKey,lineupRating,compareLineups,lineupComparisonPanel,lineupAlternatives,lineupEvidenceExport} from '../dist/lineup-comparison.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../dist/spatial.json',import.meta.url)));
let checks=0;
for(const team of new Set(data.lineups.map(l=>l.team))){
 const cohort=data.lineups.filter(l=>l.team===team);
 for(const k of [50,200,500]){
 const [a,b]=cohort,report=compareLineups(a,b,cohort,k),reverse=compareLineups(b,a,cohort,k);
 assert.equal(report.difference,-reverse.difference);
 assert.equal(report.shared.length+report.onlyA.length,5);
 assert.equal(report.shared.length+report.onlyB.length,5);
 assert.ok(report.weightA>0&&report.weightA<1);
 assert.equal(lineupKey(a),lineupKey({...a,ids:[...a.ids].reverse()}));
 for(const row of report.sensitivity){assert.equal(row.rankA,1+cohort.filter(l=>lineupRating(l,row.prior)>row.a).length)}
 checks++;
 }
 const state={minPoss:0,priorStrength:200,lineupA:'missing',lineupB:'missing'};
 assert.match(lineupComparisonPanel(cohort,state,x=>x),/Compare observed units/);
 assert.notEqual(state.lineupA,state.lineupB);
 assert.match(lineupComparisonPanel(cohort,{minPoss:1e9},x=>x),/At least two/);
}
const a={team:'TEST',ids:[1,2,3,4,5],poss:10,net:20,prior:0},b={...a,ids:[1,2,3,4,6],poss:1000,net:1,prior:0};
assert.equal(compareLineups(a,b,[a,b]).rankingStable,false);
assert.throws(()=>compareLineups(a,a,[a]));
assert.throws(()=>compareLineups(a,{...b,team:'OTHER'},[a,b]));
assert.equal(lineupRating(a,200),20*10/210);
const tied={...a,ids:[1,2,3,4,7]};
const tie=compareLineups(a,tied,[a,tied]);
assert.equal(tie.difference,0);
assert.ok(tie.sensitivity.every(r=>r.rankA===1&&r.rankB===1));
console.log(`${checks} real-team/prior comparisons, filter fallback, ties and synthetic rank reversal passed.`);

let alternativesChecked=0;
for(const team of new Set(data.lineups.map(l=>l.team))){
 const all=data.lineups.filter(l=>l.team===team),state={team,minPoss:0,priorStrength:200,lineupA:lineupKey(all[0]),lineupB:lineupKey(all[1])};
 const exported=JSON.parse(JSON.stringify(lineupEvidenceExport(all,state)));
 const reconstructed=compareLineups(exported.a,exported.b,exported.eligibleCohort,exported.prior);
 assert.deepEqual(reconstructed.sensitivity,exported.sensitivity);
 assert.equal(exported.availableTeamUnits.length,all.length);
 for(const unit of all){
  const candidates=lineupAlternatives(unit,all);
  assert.ok(candidates.every(l=>l.ids.filter(id=>unit.ids.includes(id)).length===4));
  assert.ok(candidates.every((l,i)=>i===0||candidates[i-1].poss>=l.poss));
  assert.equal(candidates.length,all.filter(l=>l.ids.filter(id=>unit.ids.includes(id)).length===4).length);
  alternativesChecked++;
 }
}
assert.equal(lineupAlternatives(a,[a,{...b,team:'OTHER'}]).length,0);
console.log(`${alternativesChecked} lineup alternative searches and 30 self-contained export reconstructions passed.`);
