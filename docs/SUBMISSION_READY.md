# Courtvision — submission package

## Entry fields

**Project name:** Courtvision

**Tagline:** Compare NBA matchups, lineups, and shooting patterns with reproducible evidence.

**Working prototype:** https://1tzann.github.io/CourtVision/?v=1.0.3

**Public source:** https://github.com/1tzAnn/CourtVision

**Downloads:** https://github.com/1tzAnn/CourtVision/releases/tag/v1.0.3

**Built with:** JavaScript, HTML, CSS, SVG, Canvas, Python, pandas, scikit-learn, FastAPI, SQLite.

## Short description — paste into the project description

Courtvision helps basketball analysts compare teams, investigate rotations, and evaluate shooting patterns using historical NBA data. Start with two teams, compare a matchup, or explore a best-of-seven series under different scores and home-court assumptions.

The app includes player comparisons, a lineup search with required and excluded players, and interactive analysis of 219,527 shot attempts. Lineup estimates account for sample size, while shooting analysis separates shot selection from conversion. Saved studies and JSON exports make comparisons reproducible.

An Elo-based game model achieved 0.5996 log loss against a 0.6884 home-rate baseline on a separate 1,071-game audit. Data sources, evaluation results, assumptions, and limitations are available in the app. The series simulator illustrates conditional scenarios; it is not a validated playoff forecast.

Courtvision supports actionable research: identify lineup candidates for film review, compare player profiles for a role, and examine where scoring differences originate. It runs publicly in a browser or offline from one HTML file. The source is MIT licensed, with attributed sports data and automated verification included.

## Screenshots

Upload guided-start-desktop.png first. Add 03-lineups.png and 04-shots.png to show the analysis; guided-start-mobile.png is optional.

## Final participant actions

1. Sign in to Devpost and open the event's submission form.
2. Enter your correct participant name and team members, if any. Confirm student eligibility.
3. Paste the project name, tagline, description, built-with list and links above. Upload the screenshots.
4. Review any additional required fields and declarations. Answer them accurately; no video is required by the posted project rules.
5. Submit before October 31, 2026, 11:59 PM Pacific. Verify the entry is marked submitted and save its public project URL or confirmation.

The prototype and public source are ready. This package does not mean the Devpost entry has been submitted.

## Optional judge walkthrough

Overview → Boston/OKC → Compare teams → Series simulator → set score to 3–3 → Lineups → compare sample sizes and adjusted ratings → Shot charts → filter a player and zone → About the data.

Use the app's historical-analysis framing. Lineup observations do not establish causal substitution effects, and estimates do not incorporate live injuries or roster changes.
