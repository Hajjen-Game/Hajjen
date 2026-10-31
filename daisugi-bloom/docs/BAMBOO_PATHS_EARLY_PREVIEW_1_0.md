# Bamboo Paths — Early Playable Preview 1.0
31 October 2026 · opt-in game-settings preview of the ORIGINAL chapter levels 51–60

## Purpose
Players who are not yet at level 51 should be able to try the genuine Bamboo Paths mechanics next to **Moon Mirrors · Preview** and **Wind Garden · Preview**, without skipping progression, unlocking pages or influencing their actual save.

## Where
Open the Japanese Harmony start screen, expand **Game Settings**, select **Bamboo Paths · Preview**. The picker shows **all ten authentic levels**:
- 51 First Bamboo — two closed tiles; entry-level spatial decisions
- 52 Narrow Paths — fixed tiles split gravity into short vertical sections
- 53 Temple Gate — fixed stones shape narrow passages
- 54 Gate of Echoes — Harmony Pulse in the temple passages
- 55 Twin Gardens — two wings with a shared crossing
- 56 Bridge of Harmony — stage growth in the crossing
- 57 Bamboo Breeze — an open-board relief level, useful as a control
- 58 Central Shrine — plan matches around a closed center
- 59 Heart of the Garden — create Masterpieces near the shrine
- 60 Path of Harmony — combine a shrine layout with three fixed Mist cells

The picker uses a two-column, vertically scrollable list in the modal. It does not increase the height of the actual game screen. It displays each original level title, subtitle and move budget. The user can retry, choose another Bamboo level, or return to the main menu from results. The in-game restart keeps the current preview selected.

## Exactly the original rules, not a simulation
- Construct a genuine `HarmonyRules.Game(index)` for **index 50 through 59**, using the original `HarmonyBambooPaths.get(index)` recipe unchanged: the same seven-by-seven shape, family pool, fixed terrain objects, objective, starting stages, move budget, gravity/refill and Director 4.
- Closed tiles are genuinely nonmatchable and nonswappable. They remain fixed while treasures fall within open sections; Harmony Pulse cannot grow closed terrain.
- Use a deterministic preview-only seed `20261031+index*97` so testers can compare layouts and retries. The starting board still comes from the **normal fair board generator**, not from a forced scripted win.
- The prototype is tagged `bambooPreview=true` in `Game` and in optional saved diagnostic snapshots. The game engine rejects preview mode outside levels 51–60, as well as combinations with Mirror/Wind previews.
- Round JSON export has `preview=bamboo-paths`, `previewType=bamboo-paths`, `result.unranked=true` and reports zero earned stars, while preserving all move details for analysis.

## Absolutely no progress or economy changes
- `saveRun()` will **not** replace any existing unfinished normal level with the Bamboo preview.
- `showResult()` and `unlockGoal()` divert previews before reward, currency, archive, star, level or Director-insight progression writes. Replay is optional and unranked.
- Omamori power controls are hidden so previews cannot consume cards.
- Chapter onboarding flags are not saved, and the actual ordinary Goshuincho remains unchanged. A real Chapter 6 level can still be played normally once unlocked.
- Existing Moon Mirrors, Wind Garden and standard levels are unaffected.

## Verification
- New `harmony-bamboo-preview.test.cjs` compares preview and normal level boards and **full events** for the same seed across all ten chapter levels, checks all blocked coordinates, goals, fair starts, save/restore, Mist finale and a correctly identified unranked round export.
- New `harmony-bamboo-preview-browser.mjs` opens the actual Game Settings modal in a 390px Chromium viewport, checks ten entries, exercises 51, 52, 53, 55, 58 and 60, makes legal moves, and verifies the active player's local unlock level and unfinished run are unchanged.
- Both tests are registered in the existing GitHub Actions workflow. A green CI run still requires GitHub verification; hands-on Android visual review is needed for picker readability.

## Recommended next pass
**Bamboo Paths 1.1 — Spatial Puzzle Fairness & Playtest**. Evaluate whether the real level 51–60 shapes reward deliberate puzzle planning rather than excessive raw fusion counts, and whether the narrow gravity sections are obvious enough without extra UI hints. Do not rebalance the real chapter until human playtest data supports it.
