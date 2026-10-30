import {lineupKey,lineupRating} from './lineup-comparison.mjs?v=27e84cde6f3e';
export function findRotationOptions(all,{team,minPoss=100,priorStrength=200,rotationInclude='',rotationExclude=''}={}){
 const units=all.filter(l=>l.team===team),roster=new Set(units.flatMap(l=>l.ids));
 const parse=value=>value===''||value==null?null:Number(value);
 const include=parse(rotationInclude),exclude=parse(rotationExclude);
 if(![50,200,500].includes(priorStrength)||![0,50,100,250,500].includes(minPoss))throw new Error('Unsupported sample settings.');
 for(const id of [include,exclude])if(id!==null&&(!Number.isInteger(id)||!roster.has(id)))throw new Error('Choose a player from the available team units.');
 const eligible=units.filter(l=>l.poss>=minPoss);
 const candidates=eligible.filter(l=>(include===null||l.ids.includes(include))&&(exclude===null||!l.ids.includes(exclude))).map(l=>({...l,adjustedNet:lineupRating(l,priorStrength)})).sort((a,b)=>b.adjustedNet-a.adjustedNet||b.poss-a.poss||lineupKey(a).localeCompare(lineupKey(b)));
 return {schemaVersion:1,kind:'courtvision-rotation-search',season:'2024-25',team,minPoss,priorStrength,include,exclude,conflict:include!==null&&include===exclude,availableUnits:units.length,eligibleUnits:eligible.length,candidates,availableTeamUnits:units,limitations:'Observed historical units only; missing combinations have unknown performance. Absence of a player is a search constraint, not verified injury status. Ratings do not estimate injury or substitution effects. Prior is unchanged by player filters.'};
}
export function rotationFinderPanel(all,state,escape){
 const result=findRotationOptions(all,state),roster=new Map();all.forEach(l=>l.ids.forEach((id,i)=>roster.set(id,l.names[i])));
 const options=(value,emptyLabel)=>`<option value="">${emptyLabel}</option>`+[...roster].sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>`<option value="${id}" ${String(id)===String(value)?'selected':''}>${escape(name)}</option>`).join('');
 const number=value=>(value>0?'+':'')+value.toFixed(1);
 return `<section class="panel section"><div class="panel-head"><h2>Find rotation options</h2><button class="btn" id="exportRotation" ${result.candidates.length?'':'disabled'}>Export search</button></div><p class="small muted">Find observed units around a player, or see which units played without someone. Uses the possession minimum and prior selected above.</p><div class="filters section"><label>Must include<select id="rotationInclude">${options(state.rotationInclude,'No required player')}</select></label><label>Must leave out<select id="rotationExclude">${options(state.rotationExclude,'No excluded player')}</select></label><button class="btn" id="resetRotation">Clear player filters</button></div><p class="small" role="status"><strong>${result.candidates.length} matching units</strong> out of ${result.eligibleUnits} above the possession threshold (${result.availableUnits} available in total).</p>${result.conflict?'<p class="note warning">A player cannot be required and excluded at the same time. Change one of the player filters.</p>':''}<div class="table-wrap section"><table><thead><tr><th>OBSERVED UNIT</th><th>POSS</th><th>RAW NET</th><th>SHRUNK NET</th><th></th></tr></thead><tbody>${result.candidates.slice(0,20).map(l=>`<tr><td class="rank-name">${l.names.map(escape).join(' · ')}</td><td>${l.poss}</td><td>${number(l.net)}</td><td>${number(l.adjustedNet)}</td><td><button class="chip" data-lineup="${l.ids.join(',')}">Inspect</button> <button class="chip" data-compare-a="${lineupKey(l)}" ${result.eligibleUnits<2?'disabled':''}>Use as A</button></td></tr>`).join('')||'<tr><td colspan="5">No observed units match. Clear a player filter or lower the possession minimum. This does not mean the combination is impossible.</td></tr>'}</tbody></table></div><p class="footnote">Showing the top ${Math.min(20,result.candidates.length)} by shrunk net rating; export includes every match. Player filters apply to this search only. Use as A opens the broader comparison pool, which uses the possession threshold. This is historical evidence, not an injury forecast or a recommendation to replace a player.</p></section>`;
}
export function wireRotationFinder(all,state,render){
 for(const key of ['rotationInclude','rotationExclude'])document.getElementById(key).onchange=e=>{state[key]=e.target.value;render()};
 document.getElementById('resetRotation').onclick=()=>{state.rotationInclude='';state.rotationExclude='';render()};
 document.getElementById('exportRotation').onclick=()=>{
  const data=findRotationOptions(all,state),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`courtvision-rotation-${state.team}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
}
