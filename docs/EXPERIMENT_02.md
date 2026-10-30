# Experiment 02 — opponent-adjusted baseline (pre-run specification)

The existing 2024–25 results have already been inspected. Adding a new baseline now is exploratory on that season. We will obtain completed 2025–26 team games for a fresh audit; those outcomes will not select hyperparameters or models.

Add an outcome-only sequential Elo baseline: reset each team to 1500 at the start of each season, K=20, base-10 logistic scale 400, and a fixed 75-point home offset. Neutral-site games have no offset. Read the ratings before a game, then update symmetrically after the result. Constants are declared assumptions, not fitted to 2024–25 or 2025–26.

Fit a regularized logistic conversion from pregame Elo gap to home win probability using the same 2022–23 training / 2023–24 validation split and C grid as the existing model. Compare the existing variants plus Elo on validation only. Refit the selected model on training + validation, then report both 2024–25 and the fresh 2025–26 audit. Use exactly the same ten-prior-game eligible sample for every model. No tuning after reading audit results.

The UI stays a 2024–25 historical research workspace because its shot and lineup evidence refers to that season. The extra season is an evaluation dataset, not a current-roster feed.

Separately, expose lineup shrinkage strengths 50, 200 and 500 possessions. Show all three estimates and ranking changes for an observed lineup; do not choose the prior based on which ranking looks attractive.

## Results (appended after execution)

Elo won validation and was selected. 2024–25 log loss: 0.61304; fresh 2025–26 audit: 0.59956, versus 0.68845 home baseline. The MVI model was slightly worse than core on the fresh audit (0.62195 versus 0.62068). No constants were changed after evaluation.
