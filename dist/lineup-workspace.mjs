import {lineupKey} from './lineup-comparison.mjs?v=27e84cde6f3e';
const LINEUP_SAVE_KEY='courtvision.lineups.v1';
export function lineupInputs(state){
 return {kind:'courtvision-lineup-inputs',schemaVersion:1,season:'2024-25',team:state.team,minimumPossessions:state.minPoss,prior:state.priorStrength,aKey:state.lineupA,bKey:state.lineupB};
}
export function normalizeLineupStudy(input,all){
 if(!input||input.season!=='2024-25')throw new Error('Choose a Courtvision lineup comparison for 2024–25.');
 let aKey,bKey;
 if(input.kind==='courtvision-lineup-inputs'&&input.schemaVersion===1){aKey=input.aKey;bKey=input.bKey;}
 else if(input.schemaVersion===2){
  const valid=unit=>Array.isArray(unit?.ids)&&unit.ids.length===5&&unit.ids.every(Number.isInteger)&&new Set(unit.ids).size===5;
  if(!valid(input.a)||!valid(input.b))throw new Error('The file must identify two five-player units.');
  aKey=lineupKey(input.a);bKey=lineupKey(input.b);
 }else throw new Error('Unsupported lineup file. Use an exported Courtvision comparison.');
 if(![0,50,100,250,500].includes(input.minimumPossessions)||![50,200,500].includes(input.prior))throw new Error('Unsupported possession threshold or prior strength.');
 const candidates=all.filter(unit=>unit.team===input.team&&unit.poss>=input.minimumPossessions);
 if(aKey===bKey||!candidates.some(l=>lineupKey(l)===aKey)||!candidates.some(l=>lineupKey(l)===bKey))throw new Error('Both units must be different, observed for this team, and meet the possession threshold.');
 return {team:input.team,minPoss:input.minimumPossessions,priorStrength:input.prior,lineupA:aKey,lineupB:bKey,selected:[],rotationInclude:'',rotationExclude:''};
}
export function readLineupStudies(storage,all){
 const raw=storage.getItem(LINEUP_SAVE_KEY);if(!raw)return [];
 if(raw.length>100000)throw new Error('Saved lineup list is too large.');
 const list=JSON.parse(raw);if(!Array.isArray(list))throw new Error('Saved lineup list is invalid.');
 return list.slice(0,8).map(item=>lineupInputs(normalizeLineupStudy(item,all)));
}
export function saveLineupStudy(storage,state,all){
 const entry=lineupInputs(normalizeLineupStudy(lineupInputs(state),all));
 const list=[entry,...readLineupStudies(storage,all).filter(item=>JSON.stringify(item)!==JSON.stringify(entry))].slice(0,8);
 storage.setItem(LINEUP_SAVE_KEY,JSON.stringify(list));return list;
}
export function lineupStudyLibrary(all,escape){
 let list=[],error='';try{list=readLineupStudies(localStorage,all)}catch{error='Browser saves are unavailable or invalid. Export and import JSON still work.'}
 const label=item=>{const a=all.find(l=>l.team===item.team&&lineupKey(l)===item.aKey),b=all.find(l=>l.team===item.team&&lineupKey(l)===item.bKey);return `${item.team} · ${a.names.join(', ')} vs ${b.names.join(', ')} · min ${item.minimumPossessions} · prior ${item.prior}`};
 return `<section class="scenario-library"><div><h2>Keep your lineup research</h2><p>Save up to eight comparisons, including the team, both units and your sample settings.</p></div><div class="row"><button class="btn" id="saveLineupStudy">Save comparison</button><label class="btn import-scenario">Import comparison<input id="importLineupStudy" type="file" accept=".json,application/json"></label></div><div class="saved-controls"><label for="savedLineupStudy">Saved comparisons</label><select id="savedLineupStudy" ${list.length?'':'disabled'}>${list.length?list.map((item,i)=>`<option value="${i}">${escape(label(item))}</option>`).join(''):'<option>No saved comparisons yet</option>'}</select><button class="btn" id="restoreLineupStudy" ${list.length?'':'disabled'}>Restore</button></div><p class="footnote" id="lineupStudyStatus" role="status" aria-live="polite">${error||'Saves belong to this browser and file address. Export comparison below for a portable backup. Restored results are recalculated from bundled data.'}</p></section>`;
}
export function wireLineupStudyLibrary(all,state,render){
 const message=text=>{const el=document.getElementById('lineupStudyStatus');if(el)el.textContent=text};
 const save=document.getElementById('saveLineupStudy');
 try{normalizeLineupStudy(lineupInputs(state),all)}catch{save.disabled=true}
 save.onclick=()=>{try{saveLineupStudy(localStorage,state,all);render();message('Comparison saved. Export JSON for a portable backup.')}catch{message('Could not save in this browser. Use Export comparison for a portable backup.')}};
 document.getElementById('restoreLineupStudy').onclick=()=>{try{const item=readLineupStudies(localStorage,all)[+document.getElementById('savedLineupStudy').value];Object.assign(state,normalizeLineupStudy(item,all));render();message('Comparison restored and recalculated from bundled data.')}catch(error){message(error.message)}};
 document.getElementById('importLineupStudy').onchange=async event=>{
  const input=event.currentTarget,file=input.files[0];if(!file)return;
  try{
   if(file.size>1000000)throw new Error('Comparison JSON must be smaller than 1 MB.');
   const restored=normalizeLineupStudy(JSON.parse(await file.text()),all);
   if(document.getElementById('importLineupStudy')!==input)return;
   Object.assign(state,restored);render();message('Imported selections recalculated. File-provided ratings, ranks and data were not applied.');
  }catch(error){if(document.getElementById('importLineupStudy')===input){message(error instanceof SyntaxError?'This file is not valid JSON.':error.message);input.value=''}}
 };
}
