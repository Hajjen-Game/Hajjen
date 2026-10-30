# Lotus Stream 1.0 — Drop & Collection Foundation
30 October 2026

## Status and scope
**Implemented:** a real new puzzle objective and a single playable introduction
on **level 61**. Levels 62–70 remain the previously generated Endless Garden
missions until the follow-up chapter-design pass.

This follows Bamboo Paths without changing goals, board layouts, move budgets,
stars or saves for levels 1–60.

## New mechanic
- Two physical **lotus seeds** appear as distinct, softly painted gold symbols,
  with illuminated river collection gates near the bottom of the 7×7 board.
- Seeds are a **new stage-zero cargo family**, not a tenth matchable treasure.
  They cannot be swapped, fused, grown, collected by Harmony Pulse or moved by
  Omamori; they do not block column gravity.
- Normal match resolution removes treasure tiles, then gravity lets seeds
  fall through their own columns. A seed entering its collection gate is
  counted exactly once, removed from the board and replaced by an ordinary
  refill treasure.
- The first level uses **two scripted, legitimate stage-one match openings**.
  Both require a player swap. Neither seed is given directly or teleported.
  The pilot is intentionally easy to teach the new motion.
- Animated seed descent and gate-glow delivery have dedicated event frames.
  Reduced-motion mode retains clear static indicators without pulsing.
- Goal meter counts **0/2 → 1/2 → 2/2**, and completion grants the usual
  move-based stars and Harmony Coin reward.

## Architecture
- `harmony/lotus-stream.js`: separate versioned, validated pilot recipe,
  cargo IDs, opening, delivery layout and collection logic.
- `harmony/rules.js`: integrates moving stage-zero cargo into gravity, legal
  swaps, matching, fair shuffling, hints, snapshots and objective accounting.
- `harmony/save-health.js`: validates all remaining seed IDs, lanes, totals
  and collection count; malformed saves are refused.
- `harmony/powers.js` and `harmony/omamori-targets.js`: protect cargo from
  magical effects until intentional powers for Lotus are specifically designed.
- `harmony/lotus-stream.css`: lightweight CSS gameplay art for the pilot.
  Dedicated premium collectible art is deferred.
- `harmony/onboarding.js`, `harmony/tutorial-help.js`,
  `harmony/objective-feedback.js`, `harmony/goshuincho.js`: instructional
  preview and one-time guide, readable progress text and a Chapter 7 pilot label.

## Legacy save compatibility
A player who was already partway through the previous generated level 61
does **not** have their board or original goal replaced mid-game.
A **fresh** start of level 61 receives Lotus Stream instead.
Older chapters and progression records are untouched.

## Tests
- `harmony-lotus-stream.test.cjs`: 24 deterministic openings, two genuine
  delivery swaps, no mutation from a refused swap, save/resume between
  deliveries, stage-zero matching guards, identity-preserving shuffle,
  illegal-save checks and legacy migration.
- `harmony-lotus-browser.mjs`: independent Android-sized Chrome session:
  confirms tutorial, visible seed and gate markers, responsive viewport,
  first delivery and persisted save, second delivery, stars and victory.
- Both have been added to GitHub Actions. A completed CI result must be
  checked independently; local module tests are not a claim of green CI.

## Next recommended development
**Lotus Stream 1.1 — Routing & Difficulty Design**: prototype seeds starting
higher, multiple delivery lanes and the strategic choice of clearing supports.
Use playtesting and solvability tests before assigning levels 62–70. Keep
Temple Gate/Twin Gardens/Central Shrine unchanged until Bamboo playtests
provide human feedback.
