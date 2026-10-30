/** Exact independent-game series scenarios; no sampling or playoff fitting. */
export function seriesOutcome(probabilities, winsA = 0, winsB = 0) {
  if (probabilities.length !== 7 || probabilities.some(p => !Number.isFinite(p) || p < 0 || p > 1))
    throw new RangeError('Provide seven valid game probabilities.');
  if (![winsA, winsB].every(n => Number.isInteger(n) && n >= 0 && n <= 4) || (winsA === 4 && winsB === 4))
    throw new RangeError('Invalid best-of-seven series score.');
  const finishes = [], reach = Array(7).fill(0);
  function visit(a, b, mass) {
    if (a === 4 || b === 4) {
      const existing = finishes.find(f => f.a === a && f.b === b);
      if (existing) existing.probability += mass;
      else finishes.push({a, b, probability: mass});
      return;
    }
    const game = a + b;
    reach[game] += mass;
    visit(a + 1, b, mass * probabilities[game]);
    visit(a, b + 1, mass * (1 - probabilities[game]));
  }
  visit(winsA, winsB, 1);
  finishes.sort((x, y) => (x.a + x.b) - (y.a + y.b) || y.a - x.a);
  return {
    winA: finishes.filter(f => f.a === 4).reduce((s, f) => s + f.probability, 0),
    expectedRemaining: reach.reduce((s, p) => s + p, 0), finishes, reach,
  };
}

export function seriesProbabilities(model, eloA, eloB, homeCourt = 'A', adjustment = 0) {
  if (model.features.length !== 1 || model.features[0] !== 'elo_gap')
    throw new Error('Series scenarios require the exported Elo model.');
  if (![eloA, eloB, adjustment].every(Number.isFinite) || !['A', 'B'].includes(homeCourt))
    throw new RangeError('Invalid series inputs.');
  const venues = ['A', 'A', 'B', 'B', 'A', 'B', 'A'].map(v => homeCourt === 'A' ? v : v === 'A' ? 'B' : 'A');
  const gap = eloA + adjustment - eloB;
  const atHome = d => 1 / (1 + Math.exp(-(model.intercept + (d - model.mean[0]) / model.scale[0] * model.coef[0])));
  return {venues, probabilities: venues.map(v => v === 'A' ? atHome(gap) : 1 - atHome(-gap))};
}

/** Within-season standardized Euclidean distance, not an impact or fit score. */
export function similarPlayers(target, candidates, keys, limit = 6) {
  const complete = p => keys.every(k => typeof p[k] === 'number' && Number.isFinite(p[k]));
  if (!complete(target)) return [];
  const pool = candidates.filter(complete);
  if (pool.length < 2) return [];
  const scales = keys.map(key => {
    const mean = pool.reduce((s, p) => s + p[key], 0) / pool.length;
    return Math.sqrt(pool.reduce((s, p) => s + (p[key] - mean) ** 2, 0) / pool.length);
  });
  const active = keys.map((key, i) => ({key, scale: scales[i]})).filter(d => d.scale > 1e-12);
  if (!active.length) return [];
  return pool.filter(p => p.player_name !== target.player_name).map(player => {
    const differences = active.map(({key, scale}) => ({key, z: (player[key] - target[key]) / scale}));
    return {player, distance: Math.sqrt(differences.reduce((s, d) => s + d.z ** 2, 0) / active.length), differences};
  }).sort((a, b) => a.distance - b.distance || a.player.player_name.localeCompare(b.player.player_name)).slice(0, limit);
}
