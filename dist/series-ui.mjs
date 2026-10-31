import {scenarioLibrary,wireScenarioLibrary} from './workspace.mjs?v=fde41db338a9';
import {seriesOutcome, seriesProbabilities} from './scenarios.mjs?v=439745271d2d';

const sPct = p => (100 * p).toFixed(1) + '%';
const sOptions = (names, selected) => Object.keys(names).sort().map(t => `<option value="${t}" ${selected === t ? 'selected' : ''}>${names[t]}</option>`).join('');

export function seriesReport(data, state) {
  const a = data.teams.find(t => t.season === '2024-25' && t.team === state.seriesA);
  const b = data.teams.find(t => t.season === '2024-25' && t.team === state.seriesB);
  const evaluate = (adjustment, homeCourt = state.seriesCourt, model = data.model) => {
    const games = seriesProbabilities(model, a.profile.elo, b.profile.elo, homeCourt, adjustment);
    return {...games, ...seriesOutcome(games.probabilities, state.seriesWinsA, state.seriesWinsB)};
  };
  const baseline = evaluate(0), scenario = evaluate(state.seriesAdjustment);
  const draws = data.bootstrap.map(m => evaluate(state.seriesAdjustment, state.seriesCourt, m).winA).sort((x, y) => x - y);
  const q = p => {const i = (draws.length - 1) * p, lo = Math.floor(i); return draws[lo] + (draws[Math.ceil(i)] - draws[lo]) * (i - lo);};
  return {
    schemaVersion: 1, model: data.model,
    snapshot: 'End of 2024–25 regular season', teamA: a.team, teamB: b.team,
    currentScore: [state.seriesWinsA, state.seriesWinsB], homeCourt: state.seriesCourt,
    adjustmentEloA: state.seriesAdjustment, ratings: [a.profile.elo, b.profile.elo],
    baseline, scenario, calibrationRange80: [q(.1), q(.9)],
    flippedCourt: evaluate(state.seriesAdjustment, state.seriesCourt === 'A' ? 'B' : 'A').winA,
    sensitivity: Array.from({length: 21}, (_, i) => ({adjustment: -100 + i * 10, probability: evaluate(-100 + i * 10).winA})),
    assumptions: [
      'Hypothetical series using a regular-season Elo logistic model; not playoff-validated.',
      'Independent games, fixed team strength and a 2–2–1–1–1 venue schedule.',
      'Current score conditions the remaining paths; it does not update team ratings.',
      'Elo adjustment is an assumed change in team A strength, not a measured effect of a player, injury or tactic.',
      '80% range varies logistic calibration only, holding ratings and structural assumptions fixed.',
      'No injury, travel, fatigue, roster, coaching adaptation or game-to-game dependence model.',
    ],
  };
}

export function renderSeries(data, state, names) {
  const scoreOptions = n => [0, 1, 2, 3].map(x => `<option ${x === n ? 'selected' : ''}>${x}</option>`).join('');
  const controls = `<div class="filters series-controls"><label>Team A<select id="seriesA">${sOptions(names, state.seriesA)}</select></label><label>Team B<select id="seriesB">${sOptions(names, state.seriesB)}</select></label><label>Home-court advantage<select id="seriesCourt"><option value="A" ${state.seriesCourt === 'A' ? 'selected' : ''}>Team A · ${state.seriesA}</option><option value="B" ${state.seriesCourt === 'B' ? 'selected' : ''}>Team B · ${state.seriesB}</option></select></label><label>A wins<select id="seriesWinsA">${scoreOptions(state.seriesWinsA)}</select></label><label>B wins<select id="seriesWinsB">${scoreOptions(state.seriesWinsB)}</select></label><button class="btn" id="seriesReset">Reset scenario</button></div>`;
  const header = `<div class="page-head"><div><div class="eyebrow">BEST OF SEVEN</div><h1>Play out a series</h1><p class="subtitle">Explore how venue, the series score and assumed team strength change a best-of-seven scenario.</p></div><span class="tag">HYPOTHETICAL · 2024–25 RATINGS</span></div><details class="page-help"><summary>Quick guide to this page</summary><ol><li>Choose two teams, home-court advantage and the current series score.</li><li>The large percentage is Team A’s estimated chance of winning the series from this point.</li><li>Use the strength slider to explore an assumption. Save a scenario to revisit it; this simulator has not been validated as a playoff forecast.</li></ol></details>`;
  if (state.seriesA === state.seriesB) return header + controls + '<div class="empty">Choose two different teams to explore a series.</div>';
  const r = seriesReport(data, state), {scenario: s, baseline: b} = r;
  const delta = 100 * (s.winA - b.winA), sign = delta > 0 ? '+' : '';
  const x = d => 44 + (d + 100) / 200 * 468, y = p => 196 - p * 160;
  const path = r.sensitivity.map((d, i) => `${i ? 'L' : 'M'}${x(d.adjustment)},${y(d.probability)}`).join(' ');
  const chart = `<svg viewBox="0 0 560 245" class="sensitivity-chart" role="img" aria-label="Team A series probability as its assumed Elo adjustment changes from minus 100 to plus 100. Baseline ${sPct(b.winA)}. Current scenario ${sPct(s.winA)}.">${[0, .25, .5, .75, 1].map(p => `<line x1="44" x2="512" y1="${y(p)}" y2="${y(p)}" stroke="#c9bbaa" stroke-dasharray="3 5"/><text x="34" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>`).join('')}<path d="${path}" fill="none" stroke="#a64327" stroke-width="3"/><line x1="${x(0)}" x2="${x(0)}" y1="30" y2="200" stroke="#635b54" stroke-dasharray="3 5"/><circle cx="${x(state.seriesAdjustment)}" cy="${y(s.winA)}" r="6" fill="#a64327" stroke="#fffefb" stroke-width="2"/>${[-100, -50, 0, 50, 100].map(n => `<text x="${x(n)}" y="220" text-anchor="middle">${n > 0 ? '+' : ''}${n}</text>`).join('')}<text x="280" y="242" text-anchor="middle">Assumed Elo change for ${state.seriesA}</text></svg>`;
  return header + controls + `<div class="series-hero"><div><div class="eyebrow">${names[state.seriesA]} · SERIES WIN ESTIMATE</div><div class="series-prob">${sPct(s.winA)}</div><p>${state.seriesA} ${state.seriesWinsA}–${state.seriesWinsB} ${state.seriesB} <span class="muted">/ ${state.seriesCourt === 'A' ? state.seriesA : state.seriesB} holds home court</span></p><div class="prob-bar"><i style="width:${100 * s.winA}%"></i></div><div class="row between small"><span class="green">${state.seriesA} ${sPct(s.winA)}</span><span class="cyan">${state.seriesB} ${sPct(1 - s.winA)}</span></div></div><div class="series-summary"><div><span>Change from unadjusted strength</span><strong>${sign}${delta.toFixed(1)} <small>percentage points</small></strong></div><div><span>Expected games remaining</span><strong>${s.expectedRemaining.toFixed(2)}</strong></div><div><span>Calibration-only 80% range</span><strong>${sPct(r.calibrationRange80[0])}–${sPct(r.calibrationRange80[1])}</strong></div></div></div>
  ${scenarioLibrary(names)}<div class="grid2 equal section"><section class="panel"><div class="panel-head"><h2>Test a strength assumption</h2><small>SENSITIVITY · NOT CAUSAL IMPACT</small></div><label class="scenario-slider" for="seriesAdjustment">Assumed ${state.seriesA} Elo adjustment <output id="seriesAdjustmentValue">${state.seriesAdjustment > 0 ? '+' : ''}${state.seriesAdjustment}</output><input id="seriesAdjustment" type="range" min="-100" max="100" step="10" value="${state.seriesAdjustment}"></label>${chart}<p class="footnote">Ratings before adjustment: ${state.seriesA} ${r.ratings[0].toFixed(0)} · ${state.seriesB} ${r.ratings[1].toFixed(0)}. The slider tests model sensitivity; it does not assign a measured value to an injury, trade or tactical change.</p></section><section class="panel"><div class="panel-head"><h2>What changes the decision?</h2><small>COMPUTED COMPARISONS</small></div><div class="report"><div class="report-item"><h3>Unadjusted scenario: ${sPct(b.winA)}</h3><p>Same series score and venue schedule, with no assumed strength change.</p></div><div class="report-item"><h3>Flip home court: ${sPct(r.flippedCourt)}</h3><p>${state.seriesA}'s chance under the reversed venue schedule, holding the current score and strength assumption fixed. This is a counterfactual, not a re-estimate of past games.</p></div><div class="report-item"><h3>${s.winA >= .5 ? state.seriesA : state.seriesB} leads this scenario</h3><p>${sPct(Math.min(s.winA, 1 - s.winA))} remains for the other team. Use the range of scenarios to stress-test confidence rather than treating a favorite as a certain winner.</p></div></div><a class="btn" id="inspectSeries" href="#matchup">Inspect unadjusted single-game model →</a><button class="btn" id="exportSeries">Export scenario JSON ↓</button></section></div>
  <section class="panel section"><div class="panel-head"><h2>The road to four wins</h2><small>2–2–1–1–1 · NO MONTE CARLO NOISE</small></div><div class="series-schedule">${s.venues.map((venue, i) => {const past = i < state.seriesWinsA + state.seriesWinsB;return `<div class="game-card ${past ? 'past' : ''}"><span>GAME ${i + 1}</span><strong>${venue === 'A' ? state.seriesA : state.seriesB} <small>HOME</small></strong><div>${past ? 'Already played' : `${sPct(s.probabilities[i])} ${state.seriesA} win`}</div><p>${past ? 'Score supplied above' : `${sPct(s.reach[i])} chance needed`}</p></div>`;}).join('')}</div><p class="footnote">Win estimates are conditional on the game being played. “Chance needed” is the probability the series reaches that game. Past game outcomes are not inferred from the supplied score.</p></section>
  <div class="grid2 equal section"><section class="panel"><div class="panel-head"><h2>Possible finishing scores</h2><small>PROBABILITIES SUM TO 100%</small></div><div class="finish-list">${s.finishes.filter(f => f.probability > 0).map(f => `<div class="finish-row"><span>${state.seriesA} ${f.a}–${f.b} ${state.seriesB}</span><div class="bar-track"><span style="width:${100 * f.probability}%;background:${f.a === 4 ? 'var(--green)' : 'var(--cyan)'}"></span></div><strong>${sPct(f.probability)}</strong></div>`).join('')}</div></section><section class="panel method-text"><h2>Know the model's boundaries</h2><ul>${r.assumptions.map(a => `<li>${a}</li>`).join('')}</ul><p>Exact enumeration accounts for every possible remaining outcome path and stops at four wins. Precision of the arithmetic does not establish real-world playoff accuracy.</p></section></div>`;
}

export function wireSeries(data, state, render) {
  if(document.getElementById('saveScenario')) wireScenarioLibrary(state,Object.fromEntries(data.teams.map(t=>[t.team,t.team])),render);
  for (const key of ['seriesA', 'seriesB', 'seriesCourt', 'seriesWinsA', 'seriesWinsB'])
    document.getElementById(key).onchange = e => {state[key] = key.includes('Wins') ? +e.target.value : e.target.value; render();};
  document.getElementById('seriesReset').onclick = () => {Object.assign(state, {seriesWinsA: 0, seriesWinsB: 0, seriesAdjustment: 0, seriesCourt: 'A'}); render();};
  const slider = document.getElementById('seriesAdjustment');
  if (slider) {
    // Keep the dragged DOM node alive until release; replacing it interrupts pointer capture.
    slider.oninput = e => {
      const value = +e.target.value;
      document.getElementById('seriesAdjustmentValue').textContent = `${value > 0 ? '+' : ''}${value}`;
    };
    slider.onchange = e => {state.seriesAdjustment = +e.target.value; render();};
  }
  const button = document.getElementById('exportSeries');
  const inspect = document.getElementById('inspectSeries');
  if (inspect) inspect.onclick = () => {
    state.home = state.seriesCourt === 'A' ? state.seriesA : state.seriesB;
    state.away = state.seriesCourt === 'A' ? state.seriesB : state.seriesA;
  };
  if (button) button.onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(seriesReport(data, state), null, 2)], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = `CourtVision-${state.seriesA}-${state.seriesB}-series.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
