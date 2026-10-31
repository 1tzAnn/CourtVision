# Courtvision submission checklist

Deadline: October 31, 2026 at 11:59 PM Pacific. Submit early.

## Links to include

- Source: https://github.com/1tzAnn/CourtVision (public source uploaded; automated verification passed).
- Prototype: https://1tzann.github.io/CourtVision/ (live; home screen and Boston–OKC matchup checked). Offline alternative: download Courtvision.html from the repository.
- Description: copy the short project description from SUBMISSION.md.

## Before pressing Submit

1. Confirm the public repository contains the current source, LICENSE, DATA_LICENSES.md, tests and standalone HTML—not just an empty repository.
2. Open the prototype link in a signed-out browser. Check the home screen and one matchup.
3. Use guided-start-desktop.png or guided-start-mobile.png; both show the current design.
4. Enter the correct team members and confirm student eligibility.
5. Describe Courtvision as a historical research app. Do not claim live injury prediction, proven coaching impact or a validated playoff forecast.
6. Check all required Devpost fields. A video is optional under the rules checked October 31.
7. Submit, then verify Devpost shows a submitted entry. Saving a draft is not submission.

## Three-minute demo

Overview → Boston/OKC → Series simulator → Boston at 0–0, then 3–3 → Lineups → include Tatum, exclude Porziņģis → inspect sample size and prior sensitivity → About the data.

## Release verification

The release-check.json report contains the local verification results. GitHub's Verify Courtvision workflow repeats the checks on a clean Linux runner; Publish prototype deploys dist only after successful verification or a manual request. A passing local report does not imply that remote CI or deployment has completed.
