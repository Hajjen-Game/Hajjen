# Japanese Harmony — Difficulty & Reward Calibration 1.0

Release: 6.26.0 · 2026-10-24

## Goal
Keep levels 1–5 an accessible tutorial, remove trivial challenges from the next 15 levels, and award meaningful stars without bringing back mandatory scores.

## Changes to the first 20
The previous Journey Objectives benchmark (10 levels × 8 seeds × 2 strategies) reported goal-directed bot wins of 8/8 on levels 11, 12, 14, 16, 18 and 20. Their median/mean moves were usually far below budget (e.g. 2.5 on level 11, 1.1 on 14 and 5.9 on 18). This is a sign of trivially small *bot objectives*, not proof of human ease.

- Level 6: 2 four-matches (was 1); level 7: 5 stage-3 developments (was 3).
- Level 11: 15 fusions (was 7); level 12: 6 stage-3 developments (was 3).
- Levels 13, 15, 17, 19: add two moves each while retaining the same fog count and fixed mask.
- Level 14: 2 four-matches (was 1); level 16: 6 Pulse hits (was 3).
- Level 18: 23 fusions (was 12); level 20: 3 masterpieces (was 2).
- Levels 1–5, 8–10 and 21+ keep their prior goals and move budgets. All 49 opening tiles still begin at stage 1; four families on levels 1–10 and five from level 11. There are no generated free boosts.

## Reward contract 3
A completed objective earns at least one star. Goal attainment on or before a level's curated `starPar` expert target wins three stars. Attainment at or before `ceil((starPar + moves)/2)` wins two. These first-20 expert values are [4,5,9,9,10,5,8,12,9,12,10,12,17,6,15,13,18,16,18,15] moves, chosen conservatively from reproducible bot efficiency diagnostics; they are provisional until human mobile replays. Historical `par` stays intact for legacy saved ratings. Later wins get one. Rating locks exactly when the objective is first achieved, so voluntary use of remaining moves can only improve personal *score* records, not stars. All scores remain optional and never determine win or stars.

Old runs retain their original rewardVersion=1 or =2 contract. Save archives retain the maximum recorded stars; the already-applied first-20 data reset is not repeated.

## QA
`tests/harmony.test.cjs` covers threshold edges, score independence, save compatibility, twenty mission targets and old ratings; mobile smoke tests the visible winner rating and replay options. The new `tools/harmony-difficulty-reward-benchmark.cjs` runs 400 reproducible complete bot games over levels 1–20, recording per-run seeds, wins, move efficiency and ratings. Bot results are **not player win-rate estimates**. Final difficulty still needs human replay, especially Mist and Pulse levels.
