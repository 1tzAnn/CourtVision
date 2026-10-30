import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {features,probability,quantile,wilson} from '../dist/analytics.mjs';
const D=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url))),ts=D.teams.filter(t=>t.season==='2024-25');
for(const a of ts)for(const b of ts){if(a.team===b.team)continue;const x=features(a.profile,b.profile);const p=probability(D.model,x);assert.ok(p.p>0&&p.p<1);assert.equal(p.contributions.length,D.model.features.length)}
assert.equal(quantile([1,2,3],.5),2);assert.deepEqual(wilson(0,0),[null,null]);assert.ok(wilson(100,100)[0]>.96);
console.log('870 matchup combinations and interval edge cases passed');
const cases=JSON.parse(readFileSync(new URL('./inference_cases.json',import.meta.url)));
for(const c of cases){const a=ts.find(t=>t.team===c.home),b=ts.find(t=>t.team===c.away),p=probability(D.model,features(a.profile,b.profile,c.rest_gap)).p;assert.ok(Math.abs(p-c.expected)<1e-12)}
console.log('Python API / JavaScript inference parity: 4 reference scenarios passed');
