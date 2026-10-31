# Courtvision — submission copy

## Tagline

NBA matchup, lineup, and shooting analysis with documented data and model evaluation.

## Short project description

Courtvision is a basketball analytics application for comparing teams, evaluating best-of-seven series scenarios, analyzing player profiles, and reviewing observed lineups with specific player combinations.

The app combines three displayed NBA seasons, 219,527 shot attempts and 2,000 observed lineup units. Small lineup samples are pulled toward the available-team average, with adjustable assumptions and ranking sensitivity shown alongside the result. Shot analysis separates shot selection from conversion and flags small samples. Saved studies and evidence exports make useful comparisons reproducible.

An opponent-adjusted Elo logistic model achieved 0.5996 log loss against a 0.6884 home-rate baseline on a separate 1,071-game 2025–26 audit. A separate shot-location/context model achieved 0.6487 log loss against a 0.6741 shot-value baseline on 2024–25 shots. Evaluation periods, model assumptions and source attribution are included.

Courtvision helps users prioritize film review and compare hypotheses. It does not claim that a substitution causes better performance, and its series simulator is a conditional scenario tool, not a playoff-validated forecast. The complete prototype runs from one local HTML file without accounts, API keys or a server. Editable source, cached data, a Python API and automated checks are included.

## Built with

JavaScript, HTML, CSS, SVG, Canvas, Python, pandas, scikit-learn, FastAPI, SQLite. Data from BoxScore Lab and SportsDataverse/hoopR, with attribution and CC BY 4.0 notices. Original software: MIT.

## Three-minute judge walkthrough

1. **Overview:** Select Boston and Oklahoma City. Click Compare teams. The percentages describe a hypothetical matchup using historical season-end ratings; they are not live odds.
2. **Series simulator:** Give Boston home court. At 0–0 its series estimate is about 30.1%. At 3–3 it becomes 46.0%, with exactly one game remaining. Show the venue schedule and explain that the calculation assumes fixed, independent game probabilities.
3. **Lineups:** Select Boston, minimum 100 possessions, prior 200. In Find rotation options, require J. Tatum and exclude K. Porziņģis. Seven observed units match. The Tatum/White/Kornet/Pritchard/Hauser unit has 127 possessions; raw +27.5 shrinks to about +17.0. Use as A and inspect the prior-sensitivity table. This is a candidate for review, not a proven replacement effect.
4. **Shot charts:** Boston → Tatum → Corner three: 46 attempts, 20 makes, 43.5%. Show why the wide interval and small sample matter.
5. **About the data:** Show the separate audit, baseline comparisons and limitations. Export or save a comparison to demonstrate reproducibility.

## Required submission items and status

- Working prototype: [https://1tzann.github.io/CourtVision/](https://1tzann.github.io/CourtVision/) is live and browser-checked. `Courtvision.html` is also available for offline use.
- Public GitHub source: [1tzAnn/CourtVision](https://github.com/1tzAnn/CourtVision) is public and contains the source. GitHub verification passed.
- Short description: ready above.
- Devpost submission: not submitted.
- Participant eligibility: the official rules welcome students; participant eligibility must be confirmed by the participant.
- Video: optional, not required.


Public deployment is an optional convenience, not an explicitly stated requirement on the rules page. Ensure the submitted prototype is accessible to judges through the public repository or another usable link. A private preview URL is insufficient.

## Verification and limits

Run `.venv/bin/python scripts/check_release.py` with Node on PATH, or supply `--node /path/to/node`. The report in `docs/release-check.json` records successful checks and SHA-256 hashes of the built app and distributed files. The October 31 run passed all 32 Python tests, all eight JavaScript suites and all 11 cached-source checksums.

Browser save/restore, team handoffs, constrained search and responsive layouts have been exercised during development. Native file-picker/download UI remains partly untested. The older 2024–25 game test was inspected before the later Elo experiment; use the separately reserved 2025–26 audit for the strongest game-model evidence. Lineup coverage is capped and observations are not causal. Passing tests is not a guarantee of defect-free software or a competition outcome.
