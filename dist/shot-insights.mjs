/** Descriptive, additive decomposition of a filtered shooting sample. */
export function shotEvidence(rows, reference) {
  const n = rows.length;
  const referenceN = reference.reduce((s, z) => s + z.attempts, 0);
  if (!n || !referenceN) return null;
  const zones = reference.map(z => ({zone:z.zone, n:0, points:0, modeledPoints:0,
    referenceShare:z.attempts / referenceN, referencePPS:z.pps}));
  for (const row of rows) {
    const z = zones.find(z => z.zone === row[5]);
    if (!z || ![2,3].includes(row[4]) || ![0,1].includes(row[3]) || !Number.isFinite(row[6]) || row[6] < 0 || row[6] > 1)
      throw new RangeError('Invalid shot or incompatible reference zones.');
    z.n++; z.points += row[3] * row[4]; z.modeledPoints += row[6] * row[4];
  }
  const referencePPS = zones.reduce((s,z) => s + z.referenceShare*z.referencePPS,0);
  for (const z of zones) {
    z.share = z.n/n;
    z.observedPPS = z.n ? z.points/z.n : null;
    z.modeledPPS = z.n ? z.modeledPoints/z.n : null;
    z.mixContribution = (z.share-z.referenceShare)*z.referencePPS;
    z.conversionContribution = (z.points-z.n*z.referencePPS)/n;
    z.modelResidualContribution = (z.points-z.modeledPoints)/n;
  }
  return {n,referenceN,referencePPS,zones,
    observedPPS:zones.reduce((s,z)=>s+z.points,0)/n,
    modeledPPS:zones.reduce((s,z)=>s+z.modeledPoints,0)/n,
    mixEffect:zones.reduce((s,z)=>s+z.mixContribution,0),
    conversionEffect:zones.reduce((s,z)=>s+z.conversionContribution,0),
    modelResidual:zones.reduce((s,z)=>s+z.modelResidualContribution,0),
  };
}

const shotSigned = n => `${n > 0 ? '+' : ''}${(100*n).toFixed(2)}`;
export function renderShotEvidence(e, names) {
  if (!e) return '<section class="panel section"><h2>Shot evidence breakdown</h2><p class="footnote">No attempts match these filters. Change the player, zone or shot-value selection to inspect evidence.</p></section>';
  const largest = [...e.zones].filter(z=>z.n).sort((a,b)=>Math.abs(b.modelResidualContribution)-Math.abs(a.modelResidualContribution))[0];
  return `<section class="panel section"><div class="panel-head"><div><div class="eyebrow">SHOT EVIDENCE BREAKDOWN</div><h2>Shot mix or conversion?</h2></div><button class="btn" id="exportShotEvidence">Export evidence JSON ↓</button></div><p class="footnote">Separate where this sample shoots from how it converts, relative to the 2024–25 league in the same selected zones and shot values. All contributions below are points per 100 field-goal attempts, not possessions.</p><div class="shot-equation"><div><span>League reference</span><strong>${(100*e.referencePPS).toFixed(2)}</strong></div><b>+</b><div><span>Shot-mix difference</span><strong class="${e.mixEffect>=0?'green':'cyan'}">${shotSigned(e.mixEffect)}</strong></div><b>+</b><div><span>Conversion difference</span><strong class="${e.conversionEffect>=0?'green':'cyan'}">${shotSigned(e.conversionEffect)}</strong></div><b>=</b><div><span>Observed sample</span><strong>${(100*e.observedPPS).toFixed(2)}</strong></div></div><p class="footnote">Mix holds league conversion rates fixed and changes zone shares. Conversion holds this sample's zone shares fixed and changes conversion rates. This is an accounting identity, not proof that changing shot selection would create the displayed gain. The same-season league reference includes this sample and is descriptive.</p><div class="panel-head section"><h2>Where observed results differ from the model</h2><small>PRIOR-SEASON TRAINING · HELD-OUT SHOTS</small></div><div class="table-wrap"><table><thead><tr><th>ZONE</th><th>ATTEMPTS</th><th>OBSERVED PPS</th><th>MODELED PPS</th><th>GAP CONTRIBUTION<br>PER 100 TOTAL ATTEMPTS</th></tr></thead><tbody>${e.zones.map(z=>`<tr><td>${names[z.zone]}${z.n>0&&z.n<50?'<br><span class="sample-flag">SMALL SAMPLE</span>':''}</td><td>${z.n.toLocaleString('en-US')}</td><td>${z.n?z.observedPPS.toFixed(3):'—'}</td><td>${z.n?z.modeledPPS.toFixed(3):'—'}</td><td class="${z.modelResidualContribution>=0?'green':'cyan'}">${z.n?shotSigned(z.modelResidualContribution):'—'}</td></tr>`).join('')}<tr><th>TOTAL</th><th>${e.n.toLocaleString('en-US')}</th><th>${e.observedPPS.toFixed(3)}</th><th>${e.modeledPPS.toFixed(3)}</th><th>${shotSigned(e.modelResidual)}</th></tr></tbody></table></div><div class="note">Largest absolute contribution: <strong>${names[largest.zone]}</strong> (${largest.n.toLocaleString('en-US')} attempts; ${shotSigned(largest.modelResidualContribution)} points per 100 total attempts). Start film review here to investigate why observed outcomes differ. Shooter ability, defensive pressure, omitted context, chance and model error are all possible explanations.</div><p class="footnote">The gap is observed minus modeled points. It is not expected future improvement or an isolated shooter-skill estimate. The 50-attempt flag is a display convention, not a statistical significance threshold. Zero-attempt zones contribute no residual; a missing conversion rate is never treated as zero accuracy. Minor displayed rounding differences may occur.</p></section>`;
}
