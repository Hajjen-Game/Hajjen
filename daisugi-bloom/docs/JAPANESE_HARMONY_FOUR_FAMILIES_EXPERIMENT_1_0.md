# Japanese Harmony — Four Families Experiment 1.0
**Date: 2026-10-23**

## Goal
See whether a 7×7 board with four simultaneous object families is more readable, engaging and fair than the existing five, while leaving the production gameplay intact for comparison.

## Player controls
A **OBJEKTFAMILJER · JÄMFÖRELSE** selector appears on the level list and persists the desired family count for new runs. Default remains **five** for existing players, so the experiment is opt-in. Choose four to play the experimental variant; choose five to revert. The live Pacing Director 3.0 and Opportunity Director 2.0 remain available in both family counts.

Every active run saves its familyCount, so a paused run **never changes its board identity pool** on resume. Older saves with no familyCount are explicitly interpreted as five-family games.

## Object selection, cosmetics and fairness
- All nine Japanese object families remain part of the game, with four active per experimental level instead of five.
- Deterministic level recipes are preserved; four uses the first four of the existing level mix, five uses the unchanged original recipe.
- The initial 49 cells are always stage 1, with no free match and at least three legal swaps.
- All refills draw legal stage-1 objects from the same chosen pool; no other piece identities can appear.
- The Masterpiece collection row becomes four columns; icon size is increased from the five-family range of 47–72 px to 58–87 px at typical viewport widths.
- Match rules, gravity, scoring, star thresholds, Harmony Resonance/Echo/Pulse, Director selection, and level goals are unchanged.

## Save / records
- Existing bestScores, bestStars, bestChain and unlocked are untouched.
- New fourFamilyScores, fourFamilyStars, fourFamilyChain keys hold experimental results independently.
- Unlocked levels remain shared, so users can compare previously completed levels without re-unlocking them.
- The level list and in-game record panel reflect the selected/current variant, preventing the easier variant from overwriting five-family personal bests.

## Test protocol
- Unit tests cover seed reproducibility, stage-one-only starts, every family appearing, board validity, no removed fifth family from old saves, four-family save/resume including Pacing Director 3.0, no illegal spawned families, and no unexpected scoring or gravity changes.
- Headless mobile browser smoke covers switch 4→5 and persistence, larger Masterpiece icons on 390px devices, Director 3.0 on four-family boards, and independent score records.
- A dedicated GitHub Actions job plays 480 **full-length** paired games with 4/5 families, holding stage index, strategy, initial seed and Pacing Director 3.0 constant. It stores average scores, legal moves, masterpieces, Echoes and three-star frequencies in an artifact. This is simulation, not human playtesting.

## Review criteria
A higher density of matches can be welcome, but if it makes three-star victories commonplace or removes the satisfaction of planning a Masterpiece, retain five families or rebalance difficulty before permanent adoption. The experiment intentionally does not auto-promote four families.
