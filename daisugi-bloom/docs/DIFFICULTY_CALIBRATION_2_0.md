# Difficulty Calibration 2.0 — Japanese Harmony
October 29, 2026 · Levels 1–50

## Aim and measurement
The task was to remove unusually short/easy objective levels and soften difficult obstacle bottlenecks without changing the match engine, Directors, currency, star formula or the visual design. The starting point was a reproducible diagnostic sweep of **all 50 levels**, using two fixed seeds per level for each of two strategies (random and goal-focused; Director 4.0). That's **200 automated games in the baseline sample**. A separate two-seed check on each of the twelve adjusted stages confirmed the goal-focused bot could finish most revised missions; L36 remained variable even with additional moves.

**Important:** These are *bot simulations*, not human win probabilities. A strategy that inspects all legal swaps is much more knowledgeable than a new player. The sample is intentionally small and should guide playtesting, not replace it.

### Why these changes
- The beginning of each new mechanic should be recognizable, not a surprise difficulty wall. Introductory Mist and Daruma stages are unchanged.
- Straight fusion / stage-3 goals in five-family boards tended to finish very quickly for a focused bot, while later Mist and multi-blocker stages consumed more of their budget.
- Level 36 (two distant stones) and level 39 (three targets) had missed objectives even in the first small goal-bot sample; a little more budget is safer than another target or a Director change.
- Lantern Path had several levels with more moves than needed for a modest goal, so its fusion, growth and four-match tasks were made more deliberate. Levels 43, 49 and 50 retain their original chapter designs.

## Adjustments (newly started games only)
The goal family and mechanic stay identical; only the listed counts, budgets and one three-star move target change.

| Level | Objective | Old target → new | Moves old → new |
| --- | --- | --- | --- |
| 11 | Fusions | 20 → 24 | 26 → 25 |
| 12 | Stage-3 objects | 8 → 10 | 31 → 29 |
| 25 | Fusions | 11 → 17 | 36 → 31 |
| 36 | Sealed Stones | 2 → 2 | 42 → 48 |
| 39 | Sealed Stones | 3 → 3 | 46 → 49 |
| 41 | Lantern fusions | 3 → 5 | 34 → 32 |
| 42 | Stage-3 objects | 8 → 10 | 35 → 33 |
| 44 | Four-match moves | 3 → 4 | 36 → 35 |
| 45 | Lantern fusions | 5 → 7 | 40 → 37 |
| 46 | Harmony upgrades | 10 → 12 | 42 → 42 |
| 47 | Masterpieces | 3 → 4 | 44 → 42 |
| 48 | Lantern fusions | 7 → 9 | 44 → 42 |

Level 11's `starPar` changes to 12 moves to reflect its larger goal; all other star thresholds still come from each level's regular move-target formula. There is no score-based win requirement.

## Save and reward compatibility
Newly started games receive `difficultyCalibrationVersion: 2`. A game started before this update has no such field and always restores its pre-calibration objective, move *budget*, move *balance*, star criteria, tile board, score and RNG state. Saving and reloading that older run preserves the old contract. A new attempt on the same level receives the latest tuning.

No archived records, stars, coins, Omamori cards, unlocks or existing game progress are reset. The actual star calculation formula is unchanged. No Director logic or randomness has been modified by this calibration.

The first teaching levels, the majority of Mist and Daruma challenges, levels 31–35 and the final Lantern Path challenge are unchanged. Exactly 38 of 50 levels retain their previous budgets and goals.

## Validation
- `tests/harmony-difficulty-calibration-v2.test.cjs` checks all 50 levels, the 12 changed configurations, 38 untouched ones, playable starts, reward targets, new-version reloading and legacy save restoration (including repeated reloads), and selected seeded bot games.
- Existing Chapter Identity 2.0 and onboarding tests now match the new Lantern targets.
- `tests/harmony.test.cjs` expects the new level 11 target, not the prior 20-fusion target.
- The new suite is registered in GitHub Actions.

## Human playtest requests
Before further tuning, have players replay fresh levels 11–12, 25, 36, 39 and 41–48. Record: first-attempt clear, moves left, whether the goal felt understandable, moments of stagnation and whether an Omamori was used. Revisit the difficulty once real player records are available. Do not automatically make every level equally hard: changes in mechanics should produce some variation, but not impossible spikes.
