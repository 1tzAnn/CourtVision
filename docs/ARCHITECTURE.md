# Architecture decisions

The master brief supersedes the earlier CourtFit concept. Original CourtFit planning remains outside this repository for reference; no SkyRoute files were modified.

We choose buildless ES modules over Next.js for the first MVP. The application has no authentication or transactional writes, and the model is small enough to export transparently. This enables a zero-dependency static demo alongside the full local Python API, with no paid services or fragile live API dependency. Python performs training and cleaning; JavaScript only applies fitted coefficients and renders data.

Storage: attributed source files → validated Pandas transforms → SQLite/feature CSV/model JSON → portable static assets. FastAPI reads the same exported assets. The browser and Python implementations share a specified model formula and receive parity verification.

Eight navigation destinations are functional, including the Series Lab. Scope boundaries: no current injury/roster ingestion, no causal player-impact estimate, no optimization claim for unobserved lineups. These are disclosed rather than represented by fake outputs.

The primary deliverable is now a local standalone HTML file with embedded data and modules, as requested by the owner. The earlier private Sites copy is not a dependency. API hosting can use the supplied Dockerfile or uvicorn; public GitHub remains a separate publication step. Shot conversion now uses a chronologically validated gradient-boosted model trained on two prior seasons. No background automation is implied by the week-long work plan.

Experiment 02 adds a sequential opponent-adjusted Elo baseline, selected on the existing validation season, with 2025–26 as a fresh audit. Lineup controls expose prior sensitivity.

The scenario calculations live in `dist/scenarios.mjs`, independently tested without a browser. `dist/series-ui.mjs` renders and exports series scenarios. Profile discovery uses the same pure calculation module. The standalone packager versions stylesheet/module URLs by content hash for local HTTP use, removes imports for the single file, embeds all datasets, and converts evaluation downloads to local Blob URLs.

`dist/workspace.mjs` validates Series Lab inputs and manages up to eight browser-local saves. JSON imports accept only whitelisted scenario inputs for the supported snapshot; imported predictions and coefficients are ignored and results are recalculated. Storage failures leave JSON import/export available. Import reads are discarded if the input element was replaced by navigation.

`dist/lineup-comparison.mjs` provides canonical order-independent unit IDs, pure shrinkage/comparison calculations, comparison rendering and JSON export. It is embedded in the offline build. `tests/lineup_comparison.mjs` checks all 30 teams across three priors, order invariance, filtering fallback, ties and a synthetic rank reversal.

`dist/lineup-workspace.mjs` validates lineup study inputs against the bundled observed units, manages an eight-entry deduplicated browser library, and wires save/restore/import controls. Imported ratings and cohort data are ignored. Schema 2 evidence exports and version 1 input-only records are accepted.

`dist/rotation-finder.mjs` implements observed-unit constraint search, ranking, rendering and evidence export. It imports the shared lineup rating and canonical ID helpers and is bundled offline. `tests/rotation_finder.mjs` verifies partitions, combined constraints and export reproducibility.
