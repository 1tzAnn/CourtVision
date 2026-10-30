export function lineupKey(unit){return [...unit.ids].sort((a,b)=>a-b).join('-')}
export function lineupRating(unit,k){return (unit.poss*unit.net+k*unit.prior)/(unit.poss+k)}
export function compareLineups(a,b,cohort,k=200){
  if(!a||!b||a.team!==b.team||lineupKey(a)===lineupKey(b))throw new Error('Choose two different observed units from one team.');
  const rank=(unit,prior)=>1+cohort.filter(x=>lineupRating(x,prior)>lineupRating(unit,prior)).length;
  const sensitivity=[50,200,500].map(prior=>({prior,a:lineupRating(a,prior),b:lineupRating(b,prior),difference:lineupRating(a,prior)-lineupRating(b,prior),rankA:rank(a,prior),rankB:rank(b,prior)}));
  const direction=new Set(sensitivity.map(row=>Math.sign(row.difference)));
  return {team:a.team,prior:k,a,b,difference:lineupRating(a,k)-lineupRating(b,k),weightA:a.poss/(a.poss+k),weightB:b.poss/(b.poss+k),shared:a.ids.filter(id=>b.ids.includes(id)),onlyA:a.ids.filter(id=>!b.ids.includes(id)),onlyB:b.ids.filter(id=>!a.ids.includes(id)),sensitivity,rankingStable:direction.size===1};
}
export function lineupAlternatives(unit,cohort){
  return cohort.filter(candidate=>candidate.team===unit.team&&candidate.ids.filter(id=>unit.ids.includes(id)).length===4)
    .sort((a,b)=>b.poss-a.poss||lineupKey(a).localeCompare(lineupKey(b)));
}
export function lineupEvidenceExport(all,state){
  const cohort=all.filter(l=>l.team===state.team&&l.poss>=state.minPoss);
  const a=cohort.find(l=>lineupKey(l)===state.lineupA),b=cohort.find(l=>lineupKey(l)===state.lineupB);
  return {schemaVersion:2,season:'2024-25',minimumPossessions:state.minPoss,eligibleUnits:cohort.length,
    source:'SportsDataverse/hoopR observed lineup export; CC BY 4.0. See bundled provenance.json.',
    method:{rating:'(poss * net + priorStrength * prior) / (poss + priorStrength)',rank:'1 + number of eligible units with a strictly higher unrounded rating',prior:'Possession-weighted mean of all available team units, including units below the display threshold'},
    limitations:'Descriptive comparison, not causal substitution impact or statistical confidence. Available lineup coverage may be capped.',
    eligibleCohort:cohort,availableTeamUnits:all.filter(l=>l.team===state.team),
    ...compareLineups(a,b,cohort,state.priorStrength)};
}
export function lineupComparisonPanel(all,state,escape){
  const eligible=all.filter(l=>l.poss>=state.minPoss).sort((a,b)=>b.poss-a.poss||lineupKey(a).localeCompare(lineupKey(b)));
  if(eligible.length<2)return '<section class="panel section"><h2>Compare observed units</h2><p class="muted">At least two units must meet the possession threshold. Lower the minimum to compare more units.</p></section>';
  const a=eligible.find(l=>lineupKey(l)===state.lineupA)||eligible[0];
  const b=eligible.find(l=>lineupKey(l)===state.lineupB&&lineupKey(l)!==lineupKey(a))||eligible.find(l=>lineupKey(l)!==lineupKey(a));
  state.lineupA=lineupKey(a);state.lineupB=lineupKey(b);
  const report=compareLineups(a,b,eligible,state.priorStrength),number=v=>(v>0?'+':'')+v.toFixed(1);
  const alternatives=lineupAlternatives(a,eligible);
  const nearby=`<div class="lineup-neighbors"><h3>Explore one-player differences from Unit A</h3><p class="small muted">${alternatives.length} observed ${alternatives.length===1?'unit shares':'units share'} four players with A and meet the filter. Ordered by possessions, not estimated substitution impact.</p>${alternatives.length?`<div class="table-wrap"><table><thead><tr><th>OUT OF A</th><th>IN ALTERNATIVE</th><th>POSS</th><th>SHRUNK NET</th><th></th></tr></thead><tbody>${alternatives.map(unit=>`<tr><td>${escape(a.names[a.ids.findIndex(id=>!unit.ids.includes(id))])}</td><td>${escape(unit.names[unit.ids.findIndex(id=>!a.ids.includes(id))])}</td><td>${unit.poss}</td><td>${number(lineupRating(unit,state.priorStrength))}</td><td><button class="chip" data-alternative="${lineupKey(unit)}" aria-label="Compare ${escape(a.names[a.ids.findIndex(id=>!unit.ids.includes(id))])} with ${escape(unit.names[unit.ids.findIndex(id=>!a.ids.includes(id))])}">${lineupKey(unit)===state.lineupB?'Selected B':'Use as B'}</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="small">No four-player overlap is available at this threshold. Try a lower possession minimum; missing combinations have unknown performance.</p>'}</div>`;
  const options=selected=>eligible.map(l=>`<option value="${lineupKey(l)}" ${lineupKey(l)===selected?'selected':''}>${escape(l.names.join(' · '))} (${l.poss} poss)</option>`).join('');
  const names=ids=>ids.map(id=>escape(a.names[a.ids.indexOf(id)]||b.names[b.ids.indexOf(id)])).join(' · ')||'None';
  const metrics=[['Possessions',a.poss,b.poss],['Offensive rating',a.off.toFixed(1),b.off.toFixed(1)],['Defensive rating · lower is better',a.defense.toFixed(1),b.defense.toFixed(1)],['Raw net rating',number(a.net),number(b.net)],['Shrunk net rating',number(lineupRating(a,state.priorStrength)),number(lineupRating(b,state.priorStrength))],['Observed-data weight',`${(report.weightA*100).toFixed(1)}%`,`${(report.weightB*100).toFixed(1)}%`]];
  return `<section class="panel section"><div class="row between"><h2>Compare observed units</h2><button class="btn" id="exportLineups">Export comparison</button></div><p class="muted small">${eligible.length} eligible units. Initial choices are the two most-used units; selections reset if excluded by a filter.</p><div class="grid2 equal lineup-compare-selects"><label>Unit A<select id="compareLineupA">${options(state.lineupA)}</select></label><label>Unit B<select id="compareLineupB">${options(state.lineupB)}</select></label></div><div class="table-wrap"><table><thead><tr><th>MEASURE</th><th>UNIT A</th><th>UNIT B</th></tr></thead><tbody>${metrics.map(row=>`<tr>${row.map((v,i)=>i===0?`<th scope="row">${v}</th>`:`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p><strong>A − B: ${number(report.difference)} points per 100 possessions</strong> after shrinkage.</p><p class="small">Shared: ${names(report.shared)}<br>Only A: ${names(report.onlyA)}<br>Only B: ${names(report.onlyB)}</p><h3>Does the ordering survive a different prior?</h3><div class="table-wrap"><table><thead><tr><th>PRIOR POSS</th><th>A − B</th><th>A RANK</th><th>B RANK</th></tr></thead><tbody>${report.sensitivity.map(r=>`<tr><td>${r.prior}</td><td>${number(r.difference)}</td><td>${r.rankA}</td><td>${r.rankB}</td></tr>`).join('')}</tbody></table></div><p class="small">${report.rankingStable?'The ordering is unchanged across these three settings.':'The ordering changes or ties across these settings; the comparison is sensitive to the prior.'} Ranks use all ${eligible.length} eligible units, with ties sharing rank.</p><p class="footnote">Observed-data weight = possessions / (possessions + prior strength); remaining weight comes from the available-team-lineup mean. This is not statistical confidence. Shared players do not isolate a substitution effect: opponents, game situations and overlapping possessions remain uncontrolled. Export coverage may be capped; absent units are unknown.</p>${nearby}</section>`;
}
export function wireLineupComparison(all,state,render){
  for(const [id,key,other] of [['compareLineupA','lineupA','lineupB'],['compareLineupB','lineupB','lineupA']]){
    const element=document.getElementById(id);if(!element)continue;
    element.onchange=e=>{const previous=state[key];state[key]=e.target.value;if(state[key]===state[other])state[other]=previous;render()};
  }
  document.querySelectorAll('[data-compare-a]').forEach(button=>{button.onclick=()=>{const previous=state.lineupA;state.lineupA=button.dataset.compareA;if(state.lineupA===state.lineupB)state.lineupB=previous;render();document.getElementById('compareLineupA')?.focus()}});
  document.querySelectorAll('[data-alternative]').forEach(button=>{button.onclick=()=>{state.lineupB=button.dataset.alternative;render();document.getElementById('compareLineupB')?.focus()}});
  const button=document.getElementById('exportLineups');if(!button)return;
  button.onclick=()=>{
    const output=lineupEvidenceExport(all,state);
    const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`courtvision-lineups-${state.team}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
}
