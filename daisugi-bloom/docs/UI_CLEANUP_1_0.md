# Japanese Harmony — UI Cleanup 1.0
2026-11-05

## Intent
Make Game Settings, Harmony Intelligence and the in-level Game Menu smaller and understandable to players. Preserve the approved Journey 2.0 puzzles (including levels 21–40), gameplay rules, saves, Omamori and visual assets.

## Game Settings
- Player-facing Game Engine choices are **Automatic (Recommended)** and **Harmony Director 6.2**.
- Internal legacy Director modes remain available to restore saved rounds and run historical diagnostics. Outdated future-start preferences migrate to Automatic, without rewriting the Director of an in-progress saved round.
- Game Dev · Intelligence is accessible from Main Menu → Game Settings only.
- Mechanic previews and old Journey draft playtests are preserved in a separately folded **Experimental previews & archived tests** section. They are not the official level selector.

## Harmony Intelligence
- Simplified to Director 4.0 vs 6.2, Standard vs 6.2, 6.2 alone and Standard alone.
- For levels 1–40, the benchmark now uses the actual Journey 2.0 recipe and hand-authored 7×7 opening when one exists. Simulated trials are separate from real player progress.
- Historical modes remain in the diagnostic engine for reproducible archival tests, but are not presented as the normal UI.

## Game Menu
- Keep Resume, Restart, Main Menu, How to Play and Settings (and Finish when appropriate).
- **Main Menu** replaces direct navigation to Goshuincho. Leaving a regular unfinished game preserves its current run.
- Remove Game Dev and the unused Performance report from the pause menu. Internal performance-aware effects are retained.

## How to Play
- Short, readable in-game guide for Fusion, Harmony Pulse, Mist, Hanabi Crate, Wind Garden, Daruma, Sealed Stones, mixed objectives, Goshuincho stars and Omamori.
- This guide is a reference; the existing illustrated per-mechanic introduction/help still handles context-sensitive onboarding.

## Verification
- JavaScript syntax checks succeeded on changed game and diagnostics files.
- Goshuincho Node regression coverage checks new game settings, folded previews, pause actions and current help topics.
- Relevant mobile browser tests were updated for the new Main Menu navigation and folded test previews.
- Full browser/CI success is **not** asserted until the workflows report results.
