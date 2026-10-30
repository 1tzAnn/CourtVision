import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {shotEvidence} from '../dist/shot-insights.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const spatial=JSON.parse(readFileSync(new URL('../dist/spatial.json',import.meta.url)));
let cases=0;
for(const name of readdirSync(new URL('../dist/shots/',import.meta.url))) {
  const data=JSON.parse(readFileSync(new URL('../dist/shots/'+name,import.meta.url)));
  for(const value of ['all',2,3]) for(const zone of ['all',0,1,2,3,4]) {
    const rows=data.shots.filter(r=>(value==='all'||r[4]===value)&&(zone==='all'||r[5]===zone));
    const ref=spatial.league.filter(z=>(value==='all'||(z.zone<3?2:3)===value)&&(zone==='all'||z.zone===zone));
    const e=shotEvidence(rows,ref);
    if(!rows.length) {assert.equal(e,null);continue;}
    const observed=rows.reduce((s,r)=>s+r[3]*r[4],0)/rows.length;
    const modeled=rows.reduce((s,r)=>s+r[6]*r[4],0)/rows.length;
    near(e.referencePPS+e.mixEffect+e.conversionEffect,observed);
    near(e.observedPPS,observed);near(e.modeledPPS,modeled);
    near(e.zones.reduce((s,z)=>s+z.modelResidualContribution,0),observed-modeled);
    near(e.zones.reduce((s,z)=>s+z.share,0),1);
    if(zone!=='all') near(e.mixEffect,0);
    cases++;
  }
}
const ref=[{zone:0,attempts:1,pps:1},{zone:3,attempts:1,pps:1.5}];
const e=shotEvidence([[1,0,0,1,2,0,.5]],ref);
near(e.referencePPS,1.25);near(e.mixEffect,-.25);near(e.conversionEffect,1);
assert.equal(e.zones[1].observedPPS,null);near(e.zones[1].modelResidualContribution,0);
assert.throws(()=>shotEvidence([[1,0,0,1,2,0,NaN]],ref));
assert.throws(()=>shotEvidence([[1,0,0,1,2,2,.5]],ref));
assert.equal(shotEvidence([],ref),null);
console.log(`PASS: ${cases} real team/filter decompositions reconcile; empty, absent-zone and invalid-probability cases passed.`);
