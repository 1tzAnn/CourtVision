# Third-party data attribution

The MIT software license does not cover third-party data.

## BoxScore Lab

Source: https://boxscorelab.com/downloads/
Upstream source: NBA Stats. License explicitly stated by publisher: **Creative Commons Attribution 4.0 International**, https://creativecommons.org/licenses/by/4.0/ .

Attribution: BoxScore Lab, boxscorelab.com, source build through October 25, 2026. We use completed 2022–23, 2023–24 and 2024–25 regular seasons for the displayed workspace, plus 2025–26 team games for a fresh audit. Download URLs, retrieval timestamp, byte counts and SHA-256 hashes are in `data/provenance.json`.

Changes: validation, season joins, per-minute metrics, derived rates, rolling game features, model training and browser exports. No affiliation or endorsement is implied.

## SportsDataverse / hoopR NBA Stats

Producer: https://github.com/sportsdataverse/hoopR-nba-stats-data
Explicit data license: https://github.com/sportsdataverse/hoopR-nba-stats-data/blob/main/LICENSE.md (**CC BY 4.0**, covers data, code and documentation).
Release assets: https://github.com/sportsdataverse/sportsdataverse-data/releases
Upstream source: NBA Stats.

Attribution: SportsDataverse and hoopR NBA Stats contributors; NBA Stats. Release ending years 2023, 2024 and 2025 represent 2022–23, 2023–24 and 2024–25; earlier shot seasons train/validate the model. Original Parquet files and hashes are retained.

Changes: regular-season filtering, one lineup measurement panel selected, geometry-derived shot zones, per-team compact shot exports, lineup shrinkage. The release repository's software license is not used as a substitute for the producer's data license.

The observed 2,000-lineup export appears capped. Shot coverage and coordinate definitions must be considered when interpreting results. See `docs/METHODOLOGY.md`.
