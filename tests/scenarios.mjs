import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seriesOutcome, seriesProbabilities, similarPlayers} from '../dist/scenarios.mjs';
import {seriesReport} from '../dist/series-ui.mjs';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-11, `${a} != ${b}`);

// Independent exhaustive enumeration of all seven-bit sequences, stopped at clinch.
function reference(ps, startA, startB) {
  let win = 0, remaining = 0;
  const n = 7 - startA - startB;
  for (let mask = 0; mask < 2 ** n; mask++) {
    let a = startA, b = startB, mass = 1, played = 0;
    for (let j = 0; j < n; j++) {
      const p = ps[startA + startB + j], victory = (mask >> j) & 1;
      mass *= victory ? p : 1 - p;
      if (a < 4 && b < 4) {victory ? a++ : b++; played++;}
    }
    if (a === 4) win += mass;
    remaining += mass * played;
  }
  return {win, remaining};
}
for (const ps of [Array(7).fill(.5), Array(7).fill(.7), [.61, .61, .39, .39, .61, .39, .61], [0, 1, .2, .9, 0, 1, .33]]) {
  for (let a = 0; a <= 3; a++) for (let b = 0; b <= 3; b++) {
    const result = seriesOutcome(ps, a, b), ref = reference(ps, a, b);
    near(result.winA, ref.win); near(result.expectedRemaining, ref.remaining);
    near(result.finishes.reduce((s, f) => s + f.probability, 0), 1);
    near(result.winA + seriesOutcome(ps.map(p => 1 - p), b, a).winA, 1);
    for (let i = a + b + 1; i < 7; i++) assert.ok(result.reach[i] <= result.reach[i - 1] + 1e-12);
  }
}
near(seriesOutcome(Array(7).fill(.5)).winA, .5);
near(seriesOutcome(Array(7).fill(.5), 3, 0).winA, 15 / 16);
near(seriesOutcome(Array(7).fill(.5), 0, 3).winA, 1 / 16);
near(seriesOutcome(Array(7).fill(.5), 3, 3).expectedRemaining, 1);
near(seriesOutcome(Array(7).fill(1)).expectedRemaining, 4);
near(seriesOutcome(Array(7).fill(.5), 4, 2).winA, 1);
assert.throws(() => seriesOutcome([.5]));
assert.throws(() => seriesOutcome(Array(7).fill(NaN)));
assert.throws(() => seriesOutcome(Array(7).fill(.5), 4, 4));
assert.throws(() => seriesOutcome(Array(7).fill(.5), 1.5, 0));

const data = JSON.parse(readFileSync(new URL('../dist/data.json', import.meta.url)));
const state = {seriesA:'BOS', seriesB:'OKC', seriesCourt:'A', seriesWinsA:0, seriesWinsB:0, seriesAdjustment:0};
const r = seriesReport(data, state);
near(r.baseline.winA, r.scenario.winA);
assert.ok(r.calibrationRange80[0] <= r.calibrationRange80[1]);
assert.ok(r.sensitivity.every((d, i, all) => i === 0 || d.probability > all[i - 1].probability));
const ts = data.teams.filter(t => t.season === '2024-25');
for (const a of ts) for (const b of ts) {
  if (a === b) continue;
  const ab = seriesProbabilities(data.model, a.profile.elo, b.profile.elo, 'A');
  const ba = seriesProbabilities(data.model, b.profile.elo, a.profile.elo, 'B');
  near(seriesOutcome(ab.probabilities).winA + seriesOutcome(ba.probabilities).winA, 1);
}

// Similarity is unaffected by unit changes; constant and missing dimensions are handled.
const pool = [{player_name:'a', x:1, y:3, c:0}, {player_name:'b', x:1, y:3, c:0}, {player_name:'c', x:2, y:8, c:0}, {player_name:'d', x:null, y:3, c:0}];
const similar = similarPlayers(pool[0], pool, ['x','y','c']);
assert.equal(similar.length, 2); assert.equal(similar[0].player.player_name, 'b'); near(similar[0].distance, 0);
const scaled = pool.map(p => ({...p, x:p.x === null ? null : p.x * 100}));
const after = similarPlayers(scaled[0], scaled, ['x','y','c']);
similar.forEach((p, i) => near(p.distance, after[i].distance));
assert.deepEqual(similarPlayers(pool[3], pool, ['x','y']), []);
assert.deepEqual(similarPlayers(pool[0], pool, ['c']), []);
console.log('PASS: 64 exact series cases vs exhaustive reference; 870 swap symmetries; clinch/invalid/sensitivity cases; similarity scaling/missing-data cases.');
console.log(`Boston–OKC baseline series: ${(100*r.scenario.winA).toFixed(2)}%; expected remaining: ${r.scenario.expectedRemaining.toFixed(3)} games.`);
