# Japanese Harmony — Score & Stars 6.2
**Date: 2026-10-22**

## Why rebalance
Prior Endless Journey scoring began at 1,600 points with stars at only 1.4× and 1.85× the minimum, yielding trivial three-star ratings while actual full-length games routinely earned many thousands of points. Earlier Engine Lab results stopped playing at the pass threshold and significantly understated what full matches could score.

## What changes
- Levels 1–10 keep their original educational quests and move-based star rewards.
- Levels 11+: `minScore = round50(6500 + 35 × min(levelIndex − 10, 39) + cappedLogGrowth)`, where cappedLogGrowth reaches at most +1,500 far into Endless Journey. This keeps score goals realistic instead of diverging infinitely.
- `1★ = minScore`; `2★ = ceil50(1.75 × minScore)`; `3★ = ceil50(2.6 × minScore)`.
- The same level gives exactly **one star at the pass threshold**, not automatically two or three.
- Three visible goals appear just above the board, using the same calm HUD language as the existing interface. The top stars update when thresholds are reached.
- The level map shows the saved, personal best **REKORD [score] poäng** for every previously completed level.

Illustrative thresholds:

| Stage | 1 star / pass | 2 stars | 3 stars |
|---|---:|---:|---:|
| 11 | 6,500 | 11,400 | 16,900 |
| 30 | Derived from level recipe | 1.75× | 2.6× |
| 50 | Derived from level recipe | 1.75× | 2.6× |

## Historical saves

The records `bestScores`, `bestChain` and `unlocked` remain unchanged. Once upon loading after the update, for score-mode levels the `bestStars` value is recomputed from the saved personal high score. If the high score falls below the new minimum but the level has already been won, it retains **one grandfathered star** and remains unlocked. Existing completed run snapshots also keep their prior completion and at least one star; unfinished runs are evaluated using the new goal. Old high scores are never fabricated or increased.

## Validation

1. Unit tests assert 0 stars below pass, exactly 1 at pass, 2/3 at their distinct threshold scores, deterministic goals up to level 23,001, and legacy completed save preservation.
2. The mobile browser test verifies migration of an older three-star rating, retention of the original high score, recalculated ratings, actual score display in the level list, and three in-game milestone labels.
3. The `harmony-score-calibration.cjs` benchmark plays **330 full-length games** (11 stages × 3 bot strategies × 10 repeatable seeds); unlike the usual Engine Lab, all remaining moves are consumed even after a stage is technically won.
4. CI uploads exact per-game score and star results for review. These bots are diagnostic and do not represent human achievement probabilities.

## Candy Crush reference and intentional differences

King's official guidance uses a minimum passing score for the first star, with higher performance recognized separately; additional Sugar Stars are possible beyond three stars. We follow the **clear one-star-pass principle** but design our own score thresholds for the much richer fusion/Echo/Pulse/Masterpiece scoring model. We are not copying King's changing level-by-level target values or introducing Sugar Stars yet.
Source: https://candycrush.zendesk.com/hc/sv/articles/360002087578-Hur-samlar-jag-sockerstj%C3%A4rnor
