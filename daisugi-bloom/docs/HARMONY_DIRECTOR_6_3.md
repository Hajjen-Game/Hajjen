# Harmony Director 6.3 — Multi-Objective Awareness
Date: 2026-11-05

## Release contract
**Current live mode: `v63` / Harmony Director 6.3.** All newly started approved Journey 2.0 levels 1–40 (including the five seeded introductions), active mechanic previews, Puzzle Architect defaults, Difficulty Lab, and the ordinary Game Settings selector use 6.3.

Director 6.2 is **not renamed or deleted**. Its implementation, mode `v62`, deterministic refill decisions and saved in-progress rounds remain available solely for compatibility, controlled comparisons and regression tests. Normal players see Automatic or Director 6.3 in Settings. Harmony Intelligence defaults to **6.2 vs 6.3** and also allows Standard vs 6.3.

## What actually changed
Previously, Director 6.2 assessed mobility and goal momentum chiefly for the primary objective type (`config.goal`). A level with e.g. Stone + Hanabi + Masterpiece could lose a viable secondary route despite looking good for the first target.

**Director 6.3** receives the actual `Rules.Game.goalParts()` array, including individual live progress, plus the active Daruma and Sealed Stone health arrays, the current Mist layer and fixed Hanabi cargo positions. It considers only **unfinished** parts, not goals already completed.

The pure opportunity heuristic examines ordinary *currently legal* swaps, without consuming moves or random rolls. It estimates:
- Hanabi: matches genuinely below remaining cargo in its column, not merely arbitrary proximity to a crate.
- Daruma / Sealed Stones: direct Fusion landings adjacent to still-active blockers, plus smaller, explicitly uncertain stage-investment potential; partial blocker health determines which obstacles still matter.
- Masterpiece / family Masterpiece: real swap growth that would reach stage 5, with weak preparatory credit for stage 4, respecting family where required.
- Mist, Fusion, family Fusion, stage-3/4 growth, Harmony Pulse and other supported objective types using bounded, immediate opportunity signals.

Per-goal opportunities and a **weakest-goal coverage** score are combined with the actual 6.2 mobility heuristic. A candidate may not discard legal moves, generate a free match, sharply increase deadlock risk, or sacrifice currently supported unfinished goals just to improve another. Fallbacks use the unchanged 6.2 safe selection. No new pieces, scripted victory, free booster, hidden move grants, goal edits or changed refill RNG distribution are introduced.

The heuristic **does not** prove reachability or guarantee progress on the next turn. It ranks legal refill candidates only. Automated win rates are not human win rates.

## Save and Omamori compatibility
- Fresh games record `directorMode: "v63"`; an authentic `v62` snapshot still restores and continues in 6.2. Rules.Game explicitly retains both mode identifiers.
- Omamori Afterglow now accepts 6.3 as well as historical 4.0; once per round and at most two moves, it can modestly lower the minimum candidate-improvement threshold without relaxing mobility/safety constraints.
- Player's level recipes, signatures, stamps, Harmony Coins, card inventory, stars, moves and victory criteria are unchanged. This Director release is *not* a Journey progression reset.

## Integration checklist
- `harmony/director-v63.js` loaded between director-v62.js and rules.js in `index.html`.
- `harmony/rules.js` supports both fresh and restored v63 and emits the new objective metrics in Director refill telemetry.
- `harmony/app.js` uses v63 for the official Goshuincho campaign, player-facing Director selection and the HUD; past v62 HUD labels still describe old resumed rounds correctly.
- `harmony/diagnostics.js` includes `director63`; Game Dev Intelligence offers v62 versus v63 and Standard versus v63.
- `harmony/puzzle-architect.js`, `harmony/difficulty-lab.js`, `harmony/difficulty-lab-v2.js`, CLI audits, and Puzzle Lab default to v63.
- Unit regression: `tests/harmony-director-v63.test.cjs`.
- Phone regression: `tests/harmony-director-v63-browser.mjs`.
- GitHub Actions includes both new test files; historical v62-specific tests remain for compatibility.

## Evidence and limitations
The new 6.3 unit contract was executed in a JavaScript harness with actual project modules: all authored levels 21–40 could start, make a legal move, preserve their exact recipe and restore correctly in v63; multi-goal evaluation was read-only; completed goals dropped out; old v62 rounds remained deterministic. This is a functional check, not a calibrated 40-level multi-seed balancing study.

A fully green remote CI and physical-device frame-time audit have **not yet** been confirmed. Run Difficulty Lab 2.0 with the active v63 and compare with 6.2 on the same seeds, then evaluate real exported rounds before tuning the heuristic further.
