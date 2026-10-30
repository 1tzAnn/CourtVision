# Analytical methods and boundaries

## Prediction target

Binary home win in an NBA regular-season game. Source has 4,920 games over four seasons; the displayed workspace uses the first three and the fourth is a fresh audit. We exclude games without ten prior games for both teams and neutral-site rows without a designated home team. The 2024–25 source contains five neutral-site pairs (both home flags false), which are preserved for descriptive analytics but excluded from prediction evaluation.

Box-score candidate features are home-minus-away previous-ten-game means: net rating, eFG, turnover rate, offensive rebound share, rest-day difference, and experimental vulnerability difference. Every feature window is shifted before aggregation. Current-game and future-game data cannot enter its pregame predictors. Windows restart each season.

Possessions = mean of both teams' FGA + .44 FTA − OREB + TOV. Net rating = 100 × point differential / estimated possessions. Possessions/game is not pace per 48 because overtime duration is unavailable. eFG = (FGM + .5 3PM)/FGA. Turnover rate = TOV/(FGA+.44 FTA+TOV). ORB share = OREB/(OREB+opponent DREB). Team profiles average game-level rates rather than pooling counts.

## Evaluation protocol

- Train: 2022–23, 1,073 eligible games.
- Validate/model-select: 2023–24, 1,074 games.
- Test: 2024–25, 1,071 games.
- Candidate models: net-rating-only logistic, core logistic, core plus exploratory MVI, and Elo-gap logistic (added under predeclared Experiment 02).
- StandardScaler fitted on training only for selection.
- C ∈ {0.01, 0.1, 1, 10}, L2 penalty, selected by validation log loss.
- Selected variant refitted on train + validation, then scored once on test.
- Home-rate baseline is the train + validation observed home win fraction, never fitted to test.
- Seed 42; sixty bootstrap refits resample training weeks with replacement, retaining games together within weeks. 10th–90th percentiles describe parameter/model instability. This does not cover all dependency, data drift, injury or outcome uncertainty.
- Calibration uses ten fixed probability bins. Accuracy, Brier, log loss and bin counts are exported. No post-hoc calibration was fit.

Results are machine-generated in `dist/evaluation.json`. MVI changes held-out log loss only slightly; no statistical-significance or causal claim is made. Experiment 02 adds a fresh 2025–26 audit and an Elo baseline; the paired MVI interval spans zero on 2024–25, and MVI is slightly worse than core on the new audit. Broader external validation remains necessary.

## Prediction interface

The selected UI/API model uses each team's final Elo rating from 2024–25. Descriptive efficiency charts use their final ten games. These are hypothetical end-of-season scenarios, not backtests for a particular past game or current forecasts. Home team is explicit. The selected Elo model does not use rest. Its UI control is therefore absent; the API accepts rest_gap for schema compatibility but it has no effect for this selected model. No current rosters, injury data or live odds enter the model.

## MVI definition

Let positive(x)=max(0,x). For offense A, defense B:

MVI(A,B) = [positive((A.eFG−.54)/.05) × positive((B.allowed_eFG−.54)/.05) + positive((A.ORB−.27)/.05) × positive((B.allowed_ORB−.27)/.05) + positive((.13−A.TOV)/.03) × positive((.13−B.forced_TOV)/.03)] / 3.

The model input is MVI(home,away)−MVI(away,home). References and equal weights are assumptions fixed before the first evaluation, not tuned league estimates. This is an interpretable alignment heuristic, not a validated measure of tactical impact.

## Players

Per-36 statistics separate minutes from production. True shooting is recomputed from aggregate points/FGA/FTA. Radar charts use each player's first-listed G/F/C position cohort with ≥500 minutes. Unknown positions form a separate group; older seasons often lack positions. This is a coarse role proxy. It is not a lineup-adjusted value model. Percentiles use midpoint ranks for ties.

Player identity within season CSVs is the full source name; uniqueness is asserted. The source reports one row per player/season and may use the last team despite whole-season totals. Shot/lineup numeric identifiers are kept in their separate datasets; names are not heuristically joined across sources. Source net rating and steals/blocks are not presented as individual defensive impact.

Three-point intervals use Wilson 95% binomial intervals, which do not model shot difficulty or dependence. A descriptive shrinkage estimate uses 50 reference attempts at 36%; it is explicitly not a calibrated predictive model.

## Shots

Only season_type_id 2 is used. No simulated coordinates. x_legacy/y_legacy are tenths of feet relative to the basket. Court mapping is x=250+x_legacy, y=417.5−y_legacy on a 500×470 view. Full-court heaves outside the half court remain in aggregates but are omitted from plotting.

Geometric zones: rim radius ≤4 ft; paint |x|≤8 ft and y≤13.75 ft; other twos mid-range; threes with |x|≥22 ft and y≤9.25 ft corner; other threes above break. These approximate categories differ from official NBA labels. Zone-reference expected points use season league zone conversion, including the selected player's attempts: a descriptive reference, not out-of-sample shot-quality modeling. No defender-pressure claim is supported. Multi-season shot charts are deferred; the trained model below uses earlier seasons.

## Lineups

Filter regular-season, advanced, totals to avoid duplicated measurement panels. Exactly 2,000 units are present; source coverage may be capped. Absent combinations have unknown performance. Lineup builder roster choices are derived from observed units, not a current roster feed.

Shrinkage = (poss × raw net + k × prior)/(poss+k), with prior the possession-weighted mean of available team units. The default strength 200 is a declared assumption, not selected by validation. The UI compares k=50, 200 and 500 and shows ranks within the current possession threshold. The API accepts k from 1 to 1000. A ranking change is sensitivity, not evidence that one prior is optimal. It reduces small-sample extremes but does not remove opponent, garbage-time, role or selection confounding. No optimal-lineup or causal player-impact claim is made.

## Strategy reports

Deterministic templates use measured inputs and explicit thresholds. Every report includes observation, evidence, hypothesis, potential outcome and limitations. No LLM or external inference service is used, and numerical improvement estimates are not fabricated.


## Validated shot conversion model

Histogram gradient boosting, 80 iterations, L2 regularization 10, seed 42, early stopping disabled. Maximum leaf count selected from 7 and 15 on the validation season; 15 selected. Inputs: x/y feet, source distance, shot value, period, period seconds remaining. No post-shot scores or outcome-derived inputs; no player identifier, defender position, or shot-clock data. Game clock is parsed as period time remaining.

Train on 217,219 shots from 2022–23. Validate on 218,702 from 2023–24. Refit on those two seasons. Evaluate once on 219,527 from 2024–25. Compare with training-derived overall make probability and two/three-point make rates. Metrics/calibration in `dist/shot_evaluation.json`; source hashes are recorded. Exported predictions align exactly with original shot row identities, coordinates, values and outcomes; assertions enforce this. All 30 teams' 2024–25 shot attempts, field goals and three-point makes reconcile to the independent BoxScore Lab game totals.

Expected points = shot value × predicted make probability, averaged over the current filter. This is conditional on the shot being attempted and its observed location/context; it is not a forecast of shot choice or a causal benefit of moving a shot. Observed-minus-expected conversion is confounded and cannot isolate shooter skill. Individual-shot uncertainty intervals are not supplied. Calibration and broader generalization require further study.

## MVI uncertainty analysis

The held-out per-game difference in core versus MVI log loss is resampled in 2,000 paired calendar-week bootstrap replicates. The 95% percentile interval is exported as `mvi_ablation.interval_95`. This describes uncertainty under that block-resampling assumption; it does not correct all team/time dependence. It is reporting only and does not change model selection.


## Experiment 02: Elo baseline and fresh audit

The 2024–25 test results were already inspected before adding Elo. `docs/EXPERIMENT_02.md` records the specification made before the new evaluation. No claim is made that 2024–25 remained untouched during this second experiment.

Sequential Elo starts each team at 1500 each season. Expected home win = 1 / (1 + 10^(−(home_rating−away_rating+75)/400)). Neutral games use zero home offset. After each game, update both sides by ±20 × (home_result−expected). Pregame ratings are stored before updating. Neutral games contribute to rating updates but are excluded from home-win evaluation. All candidates use the identical ten-prior-game eligible sample. Constants are assumptions, not optimized against test or audit.

Fit regularized logistic conversion using pregame Elo gap, following the existing training, validation and C selection protocol. Elo won validation (0.61945 log loss versus 0.63784 for core+MVI) and became the default. 2024–25 log loss is 0.61304. On the separate 2025–26 audit, log loss is 0.59956, Brier 0.20630 and accuracy 67.23%. Home-rate baseline log loss is 0.68845. All audit results are reported, not used for selection.

The bootstrap recalibrates logistic coefficients over resampled training weeks while retaining the original precomputed Elo features. It therefore omits uncertainty in the Elo assumptions and rating trajectories; the displayed interval is conditional model instability, not a full uncertainty interval. Elo ignores score margins, injuries, roster changes and player availability.

## Series Lab: conditional scenario analysis

The Series Lab applies the selected regular-season Elo logistic model to a hypothetical best-of-seven series. Team ratings are the displayed 2024–25 season-end ratings; they remain fixed. Venue order is 2–2–1–1–1. For team A at home, use the fitted home-win function at `(Elo_A + adjustment − Elo_B)`. For team A away, use `1 − home_win(Elo_B − Elo_A − adjustment)`. Simply subtracting a fixed percentage for away games would be incorrect for the nonlinear model.

Starting at the user-supplied series score `(a,b)`, enumerate win/loss paths from game `a+b+1`, multiplying each path by its conditional game probabilities and stopping when either team reaches four wins. Aggregate terminal mass by finishing score. Team A's series chance is the total mass of its wins. Expected remaining games is the sum of probabilities that each future game is reached. The arithmetic is exact under the assumptions, with no random sampling.

The current score conditions future outcomes; it does not reconstruct prior game order or update ratings. Flipping home court is a counterfactual holding that score fixed. Elo changes of −100 to +100 are declared strength assumptions, not estimated effects of a player, injury, trade or coaching adjustment. The 80% calibration-only range reuses each fitted logistic bootstrap draw consistently across all games; it does not capture rating uncertainty, dependence between games or structural uncertainty. These scenarios have **not** been validated against playoff series outcomes.

Exported JSON includes schema version, fitted coefficients and scaling, ratings, teams, score, assumptions, per-game probabilities, reaching probabilities, finishing scores and sensitivity results. It supports independent inspection rather than presenting a bare probability without context.

## Player profile discovery

Candidates come from the selected season with at least 500 minutes and complete values for true shooting, points/36, assists/36, rebounds/36, three-point attempts/36, turnovers/36, usage and three-point attempt share. An optional first-listed position-group filter narrows the pool. For each dimension, standardize candidate minus target by the population standard deviation of that dimension in the complete-data candidate pool; ignore constant dimensions. Distance is the root mean square of these standardized differences. Lower is more similar, not more valuable.

All eight dimensions receive equal weight. Correlated scoring/shooting metrics can effectively overweight that aspect. Low-minute targets are flagged, and missing values are never filled with zero for the distance calculation. This is a descriptive discovery method, not a validated transfer, lineup fit, defensive impact or talent-equivalence model.

## Shot evidence decomposition

For the selected team/player sample, let `w_z` be the fraction of its attempts in zone z, `p_z` its observed points per attempt, `L_z` league zone PPS, and `W_z` league zone attempt share. Restrict the league reference to the same selected zone and shot-value filters, then renormalize its shares. The descriptive identity is:

`sample PPS = league PPS + sum((w_z − W_z) × L_z) + sum(w_z × (p_z − L_z))`.

The first contribution changes shot mix at fixed league conversion rates. The second changes conversion at fixed sample shares. A zero-attempt zone has no sample conversion contribution; its unknown conversion rate is not imputed as zero. League references use the same 2024–25 season and include the selected sample, so this is not an out-of-sample benchmark or causal impact estimate.

Separately, sum actual points minus held-out modeled points by zone and divide by the full filtered sample's attempt count. These zone contributions sum exactly to overall observed-minus-modeled PPS. The interface multiplies contributions by 100 and labels them per 100 field-goal attempts, never per 100 possessions. The model omits shooter identity and defensive pressure. Residuals may reflect omitted context, player differences, chance or model error; they are not future expected gains. A flag below 50 attempts signals limited evidence without implying a significance threshold.

### Comparing observed lineup units

For each unit, adjusted net = (possessions × raw net + prior strength × available-team mean) / (possessions + prior strength). The team mean uses all available team units, not only those passing the display threshold. Observed-data weight is possessions / (possessions + prior strength), not a confidence level. A minus B is calculated before display rounding. Ranks count strictly higher adjusted ratings among all units passing the possession threshold; ties share rank. The sensitivity table uses prior strengths 50, 200 and 500. Stability describes only the sign of the difference across those settings, not statistical significance. Shared players do not control opponents, game state or overlapping observations. No causal substitution effect is estimated.

The one-player-difference explorer requires exactly four shared player IDs, the same team and the current possession threshold. Candidates are sorted by observed possessions, with canonical player IDs breaking ties. It enumerates observed comparison candidates and does not estimate what replacing one player would cause. Schema 2 comparison exports include the full available team group and eligible group so prior inputs and ranks can be independently examined.

### Constrained rotation search

The finder intersects the selected team and possession threshold with optional required-player and excluded-player IDs. The same player cannot satisfy both constraints. Candidate ratings retain the available-team prior; the player filters do not change it. Results sort by unrounded adjusted net, then sample size, then canonical IDs. UI shows up to 20; JSON contains every match and all available team units. An empty result means no observed unit meets these constraints in the capped export, not that a rotation is impossible. Filters are reset on team changes or comparison restores.
