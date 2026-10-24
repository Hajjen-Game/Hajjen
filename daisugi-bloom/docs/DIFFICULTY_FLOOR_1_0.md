# Difficulty Floor 1.0 — Japanese Harmony
Release 6.29.1 · 2026-10-24

## Why
A player reported Level 13 as challenging and Level 14 completed in two turns. The previous goal was simply two 4+ matches. Cascades can produce multiple 4+ groups in a single decision, making the level end almost immediately.

Baseline 10-seed goal-bot diagnostics (Director 3.0; NOT human completion probabilities):
| Stage | Previous objective | Median winning moves |
|--|--|--:|
| 6 | 2 four-matches | 2 |
| 9 | 1 Masterpiece | 4 |
| 11 | 15 fusions | 6 |
| 12 | 6 stage-3 developments | 8 |
| 13 | 6 mist squares | 20 |
| 14 | 2 four-matches | 2 |
| 16 | 6 Pulse hits | 8 |
| 18 | 23 fusions | 12 |
| 20 | 3 Masterpieces | 10 |

## Player-facing rules
A new goal type `fourTurns` counts **individual player moves** that result in at least one 4+ match. Multiple 4+ groups and cascades caused by a single move count only once. Unlike arbitrary minimum-turn gates, the objective still requires a real skill action each time. Older `four` objectives are retained for existing saved runs.

Changed levels (including follow-up smoothing for 7 and 9):
- Level 6: fourTurns 4 (instead of 2 four-matches)
- Level 7: 8 stage-3 developments (was 5)
- Level 9: 3 Masterpieces (was 1)
- Level 11: 20 fusions (was 15)
- Level 12: 8 developments to stage 3 (was 6)
- Level 14: fourTurns 4 (instead of 2 four-matches)
- Level 16: 9 actual occupied-neighbor Pulse hits (was 6); fog-only reaches still never count
- Level 18: 26 fusions (was 23)
- Level 20: 4 Masterpieces (was 3)

No change to Mist levels (13, 15, 17, 19), the five-level intro, play budget, star timing thresholds, physics, refill Director, family count, effects or scoring.

## Existing progress
Previous wins and permanent star and score archives remain intact.
Saved rounds with `objectiveBalanceVersion < 3` on any changed level keep their original goal, and a second save/resume does not migrate them. Fresh levels use balance version 3. No data reset and no forced restart.

## Validation
- Engine unit tests ensure simultaneous/cascaded 4+ matches advance the new objective by one only, fresh levels have the new goals, and saved previous goal types/counts are preserved.
- The 400-game deterministic goal/random bot benchmark now records wins within 3 moves, and asserts Level 6/14 never complete in under 4 turns.
- Browser smoke checks new Level 14 objective and old-save compatibility alongside mobile UI, state and gameplay checks.
- This deliberately changes the **difficulty floor**, not a guarantee of human win rate. Review the seeded run success rates; if 4 separate 4-matches proves frustrating in 5-family play, adjust target/budget based on human tests rather than changing the actual definition of a move.
