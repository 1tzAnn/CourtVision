import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('Courtvision.html', root), 'utf8');
const payload = html.match(/<script id="courtvision-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const data = JSON.parse(payload);
assert.equal(Object.keys(data).length, 35);
for (const [path, value] of Object.entries(data))
  assert.deepEqual(value, JSON.parse(readFileSync(new URL(`dist/${path}`, root), 'utf8')), path);
const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
assert.ok(!/^import\s/m.test(source));
assert.ok(!/\bfetch\(/.test(source));
assert.ok(!/@import/.test(html));
assert.ok(!/<script[^>]+src=/.test(html));
assert.ok(!/<link[^>]+rel="stylesheet"/.test(html));
for (const name of ['evaluation.json', 'provenance.json', 'shot_evaluation.json'])
  assert.ok(html.includes(`download="${name}"`));
const check = spawnSync(process.execPath, ['--check', '--input-type=module'], {input:source, encoding:'utf8'});
assert.equal(check.status, 0, check.stderr);
for (const feature of ['function seriesOutcome(', 'function renderSeries(', 'function similarPlayers(', 'function similarityPanel(', 'function shotEvidence(', 'function renderShotEvidence(', 'function normalizeScenario(', 'function scenarioLibrary(', 'function normalizeLineupStudy(', 'function lineupStudyLibrary(', 'function findRotationOptions('])
  assert.ok(source.includes(feature), feature);
assert.ok(html.includes('.series-hero{display:grid;'));
console.log('PASS: standalone script compiles; all 35 datasets match source; new features bundled; no external data, stylesheet or module dependencies.');
