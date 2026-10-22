# Japanese Harmony — Level 8: Garden in Bloom (2026-10-22)

## Change

The previous **Beautiful Shapes** objective required one T- or L-shaped 5-object intersection on a 7×7 board. With five families and a limited turn count, the goal could depend heavily on luck.

Level 8 now uses a familiar, predictable progress goal:

- **Name:** Garden in Bloom
- **Goal:** evolve **5 distinct pieces to stage 3** (the engine's existing stage-3 milestone counter; an object contributes only upon reaching stage 3).
- **Turns:** 20 (formerly 16).
- **Three-star par:** 12 turns.
- **Active families:** unchanged (Koi, Solfjäder, Bonsai, Maneki-neko, Origami).
- **Introduction:** ordinary 3+ matches count; T and L matches are possible bonuses but are never required.

This is intended to be more approachable than waiting for a T/L configuration while still rewarding planning and cascading combos. Difficulty should be tuned further based on playtests.

## Save migration

A saved **unfinished** level-8 run created before this goal change gets four extra turns on first resume (capped at 20). It retains board, evolved objects, score, RNG position, goal progress and other levels. A revision flag stored in the normal game snapshot prevents the bonus from being granted again.

## Regression

- Added core tests for the new objective, turns, threshold and single-use saved-run migration.
- Updated the browser-smoke expectation from the former T/L objective.
- Bumped the `rules.js` cache tag in `index.html` so Pages clients load the updated level.

No mechanics, art, other objectives or other level settings were changed.
