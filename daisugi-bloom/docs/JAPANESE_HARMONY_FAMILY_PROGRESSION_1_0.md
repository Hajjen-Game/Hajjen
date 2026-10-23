# Japanese Harmony — Family Progression 1.0
**2026-10-23**

## Production design decision
- Levels 1–10 (zero-based 0–9): **exactly four** active families and four larger Masterpiece collection icons
- Levels 11 onwards (zero-based 10+): **exactly five** active families and five Masterpiece icons
- The full catalogue still contains nine families and rotates between levels
- Standard, Opportunity 2.0 and Pacing Director 3.0 are unchanged
- No alterations to gravity, stage evolution, score values, star thresholds or reward probability to compensate; this change is strictly family-density pacing
- The temporary level-menu 4/5 selector is removed in favor of a concise explanatory label

## Motivation: 480 full-length tests
The first experiment benchmarked 4 vs 5 family modes across 480 paired games with identical seeds, four Journey levels, three bot strategies and Pacing Director 3.0.

| Metric (score-driven bot) | Five families | Four families |
|---|---:|---:|
| Mean game score | 15,329.86 | 40,557.59 |
| Mean masterpieces | 8.11 | 20.54 |
| Three-star results | 24 / 80 | 80 / 80 |

These differences argue against adopting four families throughout the score-focused Journey. During the introductory objectives, a denser board is more satisfying and teaches the five evolutionary stages earlier.

## Saves and record migration
1. A new `Game(level)` defaults to `familyCount = 4` below level index 10 and `5` otherwise, with optional explicit `{familyCount:4|5}` remaining for test harnesses and deterministic reproduction.
2. Existing saved runs retain their *own* `familyCount`, including five-family legacy introductory runs. If the old snapshot lacks the field entirely, it is considered a five-family run. Their board identities, scores, bag and seeded progression remain unchanged.
3. First ten levels now display `fourFamilyScores` and `fourFamilyStars`; from index 10 onwards, `bestScores` and `bestStars`. One-time migration merges higher legacy five-family results into the introductory display, preserving original data as an archive. The highest recorded achievement wins.
4. If an old five-family intro run finishes after the upgrade, its result updates the intro display too. All levels remain unlocked.
5. The former `familyCount` menu preference, if present in old storage, is ignored, not deleted.

## Verification
- Unit checks for the exact level-10 → level-11 family-count boundary, stage-one-only starting boards, seeded reproducibility, old five-family snapshot preservation, and mixed family recipes
- Mobile browser checks for intro four-icon layout, Journey five-icon layout, personal-record migration, and old intro save/resume
- Legacy directors and 480-game benchmark remain in CI for regression coverage
