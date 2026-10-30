const SAVE_KEY = 'courtvision.series.v1';

/** Import only scenario inputs; never execute or apply imported model coefficients. */
export function normalizeScenario(input, teams) {
  if (!input || input.schemaVersion !== 1 || input.snapshot !== 'End of 2024–25 regular season')
    throw new Error('Choose a CourtVision v1 series export for the 2024–25 snapshot.');
  if (!teams.includes(input.teamA) || !teams.includes(input.teamB) || input.teamA === input.teamB)
    throw new Error('Scenario needs two different supported teams.');
  if (!Array.isArray(input.currentScore) || input.currentScore.length !== 2 ||
      !input.currentScore.every(n => Number.isInteger(n) && n >= 0 && n <= 3))
    throw new Error('The current series score must be between 0 and 3 wins per team.');
  if (!['A','B'].includes(input.homeCourt) || !Number.isInteger(input.adjustmentEloA) ||
      input.adjustmentEloA < -100 || input.adjustmentEloA > 100 || input.adjustmentEloA % 10 !== 0)
    throw new Error('Unsupported home court or strength adjustment.');
  return {seriesA:input.teamA,seriesB:input.teamB,seriesCourt:input.homeCourt,
    seriesWinsA:input.currentScore[0],seriesWinsB:input.currentScore[1],seriesAdjustment:input.adjustmentEloA};
}

export function scenarioInputs(state) {
  return {schemaVersion:1,snapshot:'End of 2024–25 regular season',teamA:state.seriesA,teamB:state.seriesB,
    homeCourt:state.seriesCourt,currentScore:[state.seriesWinsA,state.seriesWinsB],adjustmentEloA:state.seriesAdjustment};
}

export function readScenarios(storage, teams) {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return [];
  if (raw.length > 100000) throw new Error('Saved scenario list is too large. Use a JSON export instead.');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Saved scenario list is invalid.');
  return parsed.slice(0,8).map(item => scenarioInputs(normalizeScenario(item,teams)));
}

export function saveScenario(storage, state, teams) {
  const entry = scenarioInputs(state);
  normalizeScenario(entry,teams);
  const existing = readScenarios(storage,teams);
  const list = [entry,...existing.filter(s=>JSON.stringify(s)!==JSON.stringify(entry))].slice(0,8);
  storage.setItem(SAVE_KEY,JSON.stringify(list));
  return list;
}

export function scenarioLibrary(names) {
  let list=[],error='';
  try {list=readScenarios(localStorage,Object.keys(names));}
  catch {error='Browser storage is unavailable or contains an invalid save. JSON export and import still work.';}
  return `<section class="scenario-library"><div><h2>Keep your research</h2><p>Save up to eight scenarios in this browser, or import an exported series JSON. Imported inputs are recalculated with this app’s model.</p></div><div class="row"><button class="btn" id="saveScenario">Save scenario</button><label class="btn import-scenario">Import JSON<input id="importScenario" type="file" accept=".json,application/json"></label></div><div class="saved-controls"><label for="savedScenario">Saved scenarios</label><select id="savedScenario" ${list.length?'':'disabled'}>${list.length?list.map((s,i)=>`<option value="${i}">${s.teamA} vs ${s.teamB} · ${s.currentScore.join('–')} · ${s.homeCourt==='A'?s.teamA:s.teamB} home court · ${s.adjustmentEloA>0?'+':''}${s.adjustmentEloA} Elo</option>`).join(''):'<option>No saved scenarios yet</option>'}</select><button class="btn" id="restoreScenario" ${list.length?'':'disabled'}>Restore</button></div><p class="footnote" id="scenarioStatus" role="status" aria-live="polite">${error||'Browser saves stay on this computer and browser profile. Export JSON for a portable backup.'}</p></section>`;
}

export function wireScenarioLibrary(state, names, render) {
  const message = text => {const el=document.getElementById('scenarioStatus');if(el)el.textContent=text;};
  const teams=Object.keys(names);
  document.getElementById('saveScenario').onclick=()=>{
    try {saveScenario(localStorage,state,teams);render();message('Scenario saved in this browser. Export JSON to keep a portable copy.');}
    catch {message('Could not save to browser storage. Use Export scenario JSON for a portable copy.');}
  };
  document.getElementById('restoreScenario').onclick=()=>{
    try {
      const selected=readScenarios(localStorage,teams)[+document.getElementById('savedScenario').value];
      Object.assign(state,normalizeScenario(selected,teams));render();message('Saved inputs restored and results recalculated.');
    } catch {message('Could not restore this browser save. Import a valid scenario JSON instead.');}
  };
  document.getElementById('importScenario').onchange=async event=>{
    const input=event.currentTarget;
    const file=input.files[0];if(!file)return;
    try {
      if(file.size>1000000)throw new Error('Scenario JSON must be smaller than 1 MB.');
      const restored=normalizeScenario(JSON.parse(await file.text()),teams);
      // If navigation changed during file reading, do not silently change another view.
      if(document.getElementById('importScenario')!==input)return;
      Object.assign(state,restored);render();message('Imported inputs recalculated. Imported predictions and model coefficients were not applied.');
    } catch(error) {message(error instanceof SyntaxError?'This file is not valid JSON.':error.message);}
  };
}
