import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findRotationOptions} from '../dist/rotation-finder.mjs';
import {lineupKey,lineupRating} from '../dist/lineup-comparison.mjs';
const all=JSON.parse(fs.readFileSync(new URL('../dist/spatial.json',import.meta.url))).lineups;
let checked=0;
for(const team of new Set(all.map(l=>l.team))){
 const units=all.filter(l=>l.team===team),players=[...new Set(units.flatMap(l=>l.ids))];
 for(const id of players)for(const minPoss of [0,100,500]){
  const base={team,minPoss,priorStrength:200};
  const inside=findRotationOptions(all,{...base,rotationInclude:String(id)}),outside=findRotationOptions(all,{...base,rotationExclude:String(id)});
  const eligible=units.filter(l=>l.poss>=minPoss);
  assert.equal(inside.candidates.length+outside.candidates.length,eligible.length);
  assert.ok(inside.candidates.every(l=>l.ids.includes(id)));
  assert.ok(outside.candidates.every(l=>!l.ids.includes(id)));
  assert.equal(new Set([...inside.candidates,...outside.candidates].map(lineupKey)).size,eligible.length);
  assert.ok(inside.candidates.every((l,i)=>l.adjustedNet===lineupRating(l,200)&&(i===0||inside.candidates[i-1].adjustedNet>=l.adjustedNet)));
  assert.equal(findRotationOptions(all,{...base,rotationInclude:id,rotationExclude:id}).candidates.length,0);
  checked++;
 }
 const config={team,minPoss:100,priorStrength:500,rotationInclude:players[0],rotationExclude:players[1]},result=findRotationOptions(all,config);
 assert.deepEqual(new Set(result.candidates.map(lineupKey)),new Set(units.filter(l=>l.poss>=100&&l.ids.includes(players[0])&&!l.ids.includes(players[1])).map(lineupKey)));
 const exported=JSON.parse(JSON.stringify(result));
 assert.deepEqual(findRotationOptions(exported.availableTeamUnits,config).candidates,exported.candidates);
}
assert.throws(()=>findRotationOptions(all,{team:'BOS',rotationInclude:'invalid'}));
assert.throws(()=>findRotationOptions(all,{team:'BOS',rotationExclude:999999999}));
assert.throws(()=>findRotationOptions(all,{team:'BOS',minPoss:-1}));
console.log(`PASS: ${checked} player/threshold inclusion-exclusion partitions, 30 combined searches and export reconstructions, invalid and conflicting filters.`);
