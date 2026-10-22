# Japanese Harmony — Endless Journey & Masterpiece Collection 1.0
**Date:** 2026-10-22 · **Scope:** live Japanese Harmony game at `daisugi-bloom/`

## Design decisions

- Stages 1–10 remain a deliberately short tutorial with different goals.
- From stage 11, **no new quest types**. All levels use `score` objectives, three configurable score thresholds, a move budget and a deterministic five-family pool.
- Levels 11–50 are the first generated sequence, visible in the menu. `levelConfig(index)` and `activeFamilies(index)` support arbitrarily high nonnegative stage indices, so future levels don't require new config rows.
- The level selector is paged in batches of 20; unlocks can cross the old ten/50-level cap. Persisted `bestStars`, `bestScores`, `bestChain` and run level remain keyed by stable numerical index.
- Level 6: one Lantern-family masterpiece, 20 moves. Level 9: two cumulative masterpieces, 20 moves. These reduce mission frustration; the underlying match/fusion/Harmony engine remains unchanged.

## Masterpiece collection UI

- New responsive row below the actual 7×7 board, showing exactly five current families with their real **stage 5** sprite from the corresponding transparent atlas.
- **Counter is an integer only** (0, 1, 2, 3, 4, 5, 6, …); never a fraction, threshold or cap. It resets on starting a new level and persists through Save/Resume within the same level.
- The stage-five artwork stands freely without a large ring, frame or disc. A small gold-trimmed circular integer counter overlays the icon’s bottom-left edge. The counter increases indefinitely and gives a compact pulse on each new masterpiece; there is no “collect five to win” rule.
- The standard three centered praise words remain *Masterpiece*, *Harmony Echo*, *Harmony Pulse*. Collection increments use compact badge animation plus their own bonus points, no additional center-board word.
- Counters already exist in the rules engine (`familyMasterpieces`); the newly added `collectionBonusTotal` is saved for diagnostics. Event frames carry a snapshot of counts so the visual display updates at the correct stage of the animation.

## Scoring

For each new masterpiece of a family, award incrementally:

| Lifetime family count in this level | Additional points |
|---:|---:|
| 1 | +100 |
| 2 | +200 |
| 3 | +350 |
| 4 | +550 |
| 5 | +800 |
| 6 | +880 |
| 7 | +960 |
| 8 | +1 040 |
| 9 | +1 120 |
| 10+ | Capped at +1 200 per new masterpiece |

These are additional to base fusion, echo, pulse and harvest points. They are **not** an extra win-condition. Bonus scoring is deterministic, monotone, and included in the regular score reconciliation.

## Level generator

- `endlessConfig(index)` computes one reusable objective template for any level from 11 onward. Levels 11–50 intentionally ramp from 1 600 points upward.
- `endlessFamilies(index)` uses a fixed index-derived PRNG to generate five distinct family IDs.
- Higher levels use a logarithmic target growth curve after level 50 to avoid unbounded linear requirements; move budgets stay between 17 and 22.
- Core board generation stays unchanged: all objects start in stage 1, no prematches, and >=3 legal swaps at the start.
- Stars for score levels use thresholds 100%, 140% and 185% of the level's required points. Players can keep playing remaining moves after achieving the base goal and improve stars, unlike the introductory move-efficiency stars.
- This is a scalable **rules architecture**, not a claim that 23,000 bespoke levels have been hand-crafted or human-playtested.

## QA / acceptance

- `harmony.test.cjs` validates score generation through stage 23,001, family deterministic mixing, count persistence, bonus events and the rebalanced tutorial.
- `harmony-consistency-audit.test.cjs` exercises seeded rules across all 50 preview stages.
- `harmony-browser-smoke.mjs` inspects five collection counters (integers, not fractions), basic art rendering, and score-mode generation.
- The existing GitHub Actions workflow exercises all tests on push; both rules and mobile-browser tests must succeed.
- Recommended next human check: verify that the collection strip is readable and not crowding the bottom of the game board on Android, test levels 9–12 and 30–50 for difficulty, and compare the feeling of bonuses with score flight timing.
\n## Follow-up fixes 1.0.1 (2026-10-22)\n\n- Migrates saved completion records from the original ten-level cap. A verified level-10 win in `bestStars[9]`, `bestScores[9]` or a completed saved run unlocks level 11 on next load. Unfinished level 10 remains locked. Records and unlocked progress are retained.\n- Removed the large circular backdrop/ring from each collection icon. Each stage-five cutout now floats freely, with its small circular number badge overlapping the bottom-left. Counter remains uncapped.\n- Recreated the reported level-10 mobile screenshot as a 7×7 regression test: 3 valid swaps, including row 4 col 5 down with row 5 col 5 to create a horizontal three-Ryu match. Existing fair-shuffle behavior covers truly deadlocked boards.\n