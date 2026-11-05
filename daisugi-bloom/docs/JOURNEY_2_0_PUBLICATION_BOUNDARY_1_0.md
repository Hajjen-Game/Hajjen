# Japanese Harmony — Journey 2.0 publication boundary 1.0
Date: 2026-11-05

## Decision
**Only the 40 approved, Puzzle Architect-designed Journey 2.0 levels are public.** Legacy generated/old levels 41 and above are not production content. Levels 41–50 will be rebuilt as new authored puzzles, not merely reactivated. Harmony Director **6.2** is the automatic/refill Director across **all 40 approved levels**, including seeded introductions.

## Player experience
- Goshuincho shows no chapter beyond 31–40, even if an older browser profile reports level 41+ unlocked or has awards beyond that point.
- The main menu's Goshuincho stamp count is limited to published levels.
- Finishing level 40 offers **View Goshuincho** and a completion note, not **Next level**.
- The main Play button becomes **LEVELS** once the published Journey is complete. It opens Goshuincho and lets the player replay published puzzles.
- The hidden legacy level list, if used by diagnostics, is capped to 40.
- A saved old level 41+ run cannot appear as a resumable production Journey round.
- Direct production-level launches for 41+ are blocked. Explicit opt-in, unranked developer previews still work from the folded settings tools.

## Preservation and cleanup scope
- Do **not** wipe saves, scores, coins, Omamori inventory, old archive fields or user's approved 1–40 boards.
- The legacy level configs remain in the underlying rules engine temporarily for test coverage and for archived experiments. They are **not published** and must **not** be counted as approved Puzzle Architect levels.
- The normal app is now bounded independently of those historical engine definitions. Deleting internal legacy definitions requires a separate dependency audit.
- Legacy rounds keep their original stored Director if already in progress and are still within 1–40. New normal Journey rounds use 6.2.

## Regression
- Static Node tests assert the 40-level publication boundary, no stage 41 onward, valid hand-authored chapter 3–4 recipes, and the 6.2 default.
- Browser smoke tests include an older save with level 45 unlocked, an old level 45 run, and a legacy level-41 star. This must display the 31–40 Goshuincho page, a 40-level stamp denominator, and create a new real Director-6.2 level-40 round.
- JavaScript parse checks completed; full remote browser/CI status requires separate confirmation.
