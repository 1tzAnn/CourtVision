# Verification record — first working MVP

Executed October 25, 2026 (America/Los_Angeles).

## Automated checks completed

- `python -m pytest -q`: **28 passed**. One upstream FastAPI/Starlette httpx deprecation warning; no failures.
- `node tests/browser_math.mjs`: all **870** distinct team pairing probabilities finite and within (0,1); quantile and Wilson edge cases passed.
- `node --check dist/app.js`: passed.
- Pipeline assertions: paired scores, game identities, made/attempt bounds, results, prior dates, unique player seasons, unique lineup panel rows, lineup five-player counts, coordinates and result types.
- Training, validation and held-out evaluation ran locally; machine-readable results retained.

## Browser workflows verified

- Overview rendered at desktop size; screenshot inspected.
- Home-team selection and swap changed matchup output (OKC home vs DEN showed 65.1% in this frozen model).
- Player search for Curry + Enter selected Seth Curry and updated the report and comparisons.
- Lineup Inspect populated exactly five selections and displayed raw/shrunk observed ratings.
- Shot player and zone filtering: Tatum corner threes displayed 46 attempts, 20 makes, 43.5% and 1.304 points/shot.
- Mobile overview at 390×844: no document horizontal overflow; responsive navigation and cards rendered.

## Limits

- Manual browser verification is not yet a comprehensive automated end-to-end suite.
- Docker deployment configuration is provided but Docker was not run.
- No external basketball expert review has occurred.
- No statistical significance has been established for the small MVI gain.
- Lineup coverage is capped/incomplete; shot model omits defender tracking and player identity.
- Public GitHub and judge-accessible publication require completion before submission.


## October 26 additions

- Trained and validated a shot-conversion model chronologically across three seasons; 219,527 held-out attempts.
- Added tests for source shot/box-score reconciliation across all 30 teams, outcome-independent feature construction and valid exported shot probabilities.
- Python API and JavaScript inference parity verified to 1e-12 across four reference scenarios.
- Mobile Strategy Engine at 390×844 had no document overflow; recommendation disclosure expanded correctly.
- Methodology page displayed actual evaluated metrics; browser console error/warning log was empty.

- Updated shot dashboard verified in browser: Boston modeled expected PPS 1.081 from prior-season training; observed PPS 1.122.
- Paired MVI test-week bootstrap interval spans zero (−0.00105 to +0.00163 log-loss improvement); displayed as exploratory.


## Experiment 02 verification

- 28 tests passed, including Elo pre-outcome ordering, season resets, zero-sum conservation, row-order invariance, disjoint calibration-bin boundaries and lineup prior sensitivity API checks.
- JavaScript inference checked across 870 matchups and against four updated Python API references.
- Fresh audit contains 2,460 team rows / 1,230 games with 82 games per team; 1,071 are eligible under the common prior-game rule.
- Browser lineup sensitivity: the selected Boston 127-possession unit changed from +17.0 at k=200 to +13.8 at k=500; the sensitivity table showed ranks 2, 1 and 2 under k=50, 200 and 500.

- Full `python -m pipeline.rebuild` ran successfully from cached sources, followed by all 28 tests and 870-pair/parity checks.
- Browser verified the Elo model removes the unused rest slider, shows the actual rating-gap driver, and renders the fresh 2025–26 audit table without console errors.
- Keyboard check: a focused shrinkage filter retained focus after changing to 50 possessions; Skip to analysis focused the main landmark without changing the Lineup Lab route.

## October 27 — Series Lab, profile discovery and local delivery

- **32 Python tests passed** (the same upstream httpx deprecation warning remains). New tests validate all 11 source hashes, reject a changed cache before ingestion can rewrite its manifest, reject invalid source filenames, and distinguish a missing snapshot from an explicit refetch path.
- Exact series math passed 64 scenarios against an independent exhaustive seven-bit outcome reference, including unequal venue probabilities and conditioned scores. Tests cover terminal states, invalid inputs, probability conservation, decreasing game-reach probabilities, monotone strength sensitivity and all 870 team-swap symmetries.
- Profile similarity tests check unit/scale invariance, identical profiles, missing fields and constant dimensions.
- Standalone test compiles the complete inline module, checks all 35 embedded datasets against their source JSON, verifies local evaluation downloads, and rejects external script/style/data dependencies. This verifies the artifact's structure and syntax; browser automation of `file://` remains unavailable under the browser tool's URL policy.
- Browser verification on the editable HTTP app: baseline Boston series 30.1%; 3–3 becomes 46.0% with 1.00 game remaining; a +10 Elo keyboard adjustment becomes 47.6% at 3–3. Same-team input shows a clear empty state.
- Series-to-matchup navigation verified with Denver versus the Lakers, Lakers home court: matchup selects LAL home and DEN away.
- Export button produced a real JSON download; the downloaded file contained fitted coefficients, all assumptions, the selected DEN/LAL scenario and finishing probabilities summing to one.
- Search “Curry” exposes explicit Stephen/Seth results; choosing Stephen updates his report. Nearest-profile Compare selects Jordan Poole and retains comparison-control focus. Position filtering is functional.
- Series Lab and Player Analytics checked at 390×844 with document width exactly 390 (no horizontal page overflow). Desktop Series Lab screenshot saved as `docs/series-lab.png`. Browser error/warning log was empty after the verified flows.
- Repaired stale HTTP stylesheet/module caching with content-derived asset URLs. Slider keeps its DOM node while dragging, updating the label during movement and recalculating on release.

No playoff validation, causal player-fit claim, public GitHub publication or new external hosting deployment is implied by these changes.

## October 27 — shot evidence refinement

- `node tests/shot_evidence.mjs`: 390 real team/filter cases across all 30 teams reconcile independently calculated observed PPS with the shot-mix/conversion decomposition. Zone residual contributions sum to the full observed-minus-modeled gap. Single-zone mix contribution is zero; missing-zone, empty-filter and invalid-probability cases pass.
- Browser Boston example: 108.61 league points/100 attempts −0.27 mix +3.86 conversion =112.21 observed (rounded). Its model residual is +4.07 points/100 attempts; rim contribution is +2.63.
- Tatum corner-three filter: 46 attempts triggers the small-sample flag; mix contribution is zero. Selecting two-pointers simultaneously gives a clear no-attempts message.
- Shot page document width matched its 390px mobile viewport. Desktop evidence panel inspected and saved as `docs/shot-evidence.png`.
- Calibration markers now have bounded 3–18 radii; browser inspection verified shot tooltips say “shots”, not “games”. Model estimates themselves are unchanged.
- Async render errors from stale shot requests are ignored so they cannot overwrite a newly selected route.
- Shot-evidence export is implemented; this round verified its calculation payload and bundle, but did not perform a separate browser download check for that button.

## October 27 — saved research workflow

- `node tests/workspace.mjs` passes scenario serialization/normalization, ignored imported model and output fields, eleven invalid-input cases, duplicate elimination, eight-save cap, corrupt/oversized saved data and storage failures.
- Browser verified save → reset → restore and persistence across a full reload. A Boston 2–0 scenario restored at 63.9%.
- Browser file import verified with a local test JSON containing DEN vs LAL, 1–2, Lakers home court, +20 Elo, and deliberately false imported coefficients/predictions. The app ignored those outputs and recalculated 34.3%; status message explicitly confirmed this behavior.
- Contextual matchup links verified: importing DEN/LAL, inspecting the unadjusted matchup, then selecting home-team shooting opened LAL with all-player/all-zone filters.
- New workspace at 390px had no document overflow; browser error/warning logs were empty. Screenshot saved to `docs/research-workspace.png`.
- Browser storage is origin/file-address dependent and can be unavailable in private/file contexts. JSON export is the portable backup. No cloud account or external storage service is used.

### Lineup comparison update — October 27, 2026

Added paired observed-unit comparisons, shared/exclusive players, observed-data weights, prior sensitivity, and JSON export. Automated checks cover 90 real team/prior comparisons, selector fallback, ties and rank reversal. Browser checks confirmed Boston default difference −13.6, selecting the other unit swaps the pair to +13.6, a 500-possession threshold leaves two Boston units, and changing to Denver recomputes the pair. No browser console errors observed. Screenshot: `lineup-comparison.png`. The new JSON download has not been exercised through the browser download dialog.

### Four-player overlap explorer — October 27, 2026

Verified alternative enumeration and sample ordering for all 2,000 available units. Reconstructed all sensitivity rankings from JSON-serialized exports for each of 30 teams. Browser-tested Kornet alternative selection (Boston A minus B −11.5) and ranked-table Use as A (+3.3 with the tested pair). JSON export schema is now 2; exports include eligible and all available team units plus formulas. Native browser download dialog remains untested. Screenshot: `lineup-alternatives.png`.

### App-wide visual redesign — October 28, 2026

Simplified product branding and simplified navigation and page copy. Applied warm paper backgrounds, dark text, orange/navy chart colors, larger typography, and revised controls across all eight routes. Removed external font imports; standalone and served versions use the same local font stacks.

Browser: all eight routes loaded without console errors. All routes checked at 390px width, with document width equal to viewport width. Inspected overview, shot map and mobile series layout visually. Main text contrast 12.96:1, secondary text contrast above 5:1; primary button white-on-orange exceeds 4.5:1. This is targeted contrast checking, not a complete accessibility audit. Existing analytics suites and standalone integrity checks pass. Screenshots: redesign-overview.png and redesign-mobile.png.

### Guided start and reduced brightness — October 28, 2026

Muted sage/deep green palette applied throughout. Browser-verified same-team action blocking; Denver/Lakers carried into Matchups and Series simulator. Quick guide opens on the matchup page. All eight routes checked at 390px: no page-wide overflow or loading error. Standalone integrity checks pass. Screenshots: guided-start-desktop.png and guided-start-mobile.png.

### Saved lineup studies — October 28, 2026

Thirty team round-trips pass for saved inputs and exported JSON. Imported ratings and results are ignored. Tests cover invalid schema/season/team/units/settings, deduplication, eight-entry cap, corrupt or oversized storage and write failure. Browser verified saving Boston at prior 500, switching to Denver, restoring Boston, reloading and restoring prior 500 again. File-picker import UI was not exercised; import validation was tested directly. Screenshot: saved-lineups.png.

### Rotation finder — October 28, 2026

Passed 1,674 player/threshold inclusion-exclusion partitions across 30 teams, 30 combined searches, exported-result reconstructions, invalid inputs and conflicts. Browser: Boston/Tatum included/Porzingis excluded at 100 possessions returns seven units; Use as A selects the candidate; same-player conflict disables export; changing team clears player constraints. Native export download was not exercised. Preview initially remained at loading; a reload resolved it, and no console errors were recorded. Screenshot: rotation-finder.png.

### Release check — October 30, 2026

Added a single-command release check and ran it successfully: 11 check groups, including 32 Python tests, eight JavaScript suites and 11 cached-source hashes. Offline artifact and 46 distributed files fingerprinted in release-check.json. One upstream Starlette/httpx deprecation warning remains; no test failed. Updated README branding/screenshot and submission narrative to match current navigation, features and rules. GitHub account 1tzAnn supplied; publication awaits sign-in. No Devpost submission has been performed.
