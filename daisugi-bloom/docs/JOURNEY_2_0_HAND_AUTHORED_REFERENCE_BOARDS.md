# Japanese Harmony — Hand-built Reference Puzzles 1.0
**2026-11-04 — Five real Journey 2.0 preview openings**

## Why
Human playtests showed that earlier randomly filled 7×7 boards could be won in
two or three moves even when objectives contained multiple mechanics. Research
pointed toward designing *deliberate moments of insight* instead of hiding
difficulty behind many target counters.

I (the developer assistant) build, test and calibrate the boards. The player
should **only play** and provide subjective feedback. The Puzzle Architect
editor and CLI are internal authoring instruments, not tasks for the player.

## Implemented reference puzzles

All layouts specify **all 49 cells** as symbolic A–E families or `-` fixed
fixtures (real Rules.Game pieces). A–E map to each level's existing four/five
active object families. No new artwork, pieces or mechanics are required.

| Level | Purpose | Intended player discovery | Explicit planned move |
|---|---|---|---|
| 5 — First Firework | Delivery setup | Use destination control to clear the square directly beneath Hanabi | C5 ↔ C6 (indices 30→37); the B6 match opens rocket lane B5→B7 |
| 11 — First Moon Mirror | Reflection geometry | A Fusion must **land** immediately left of a mirror | C4 ↔ D4 (23→24) creates A at D3/D4/D5, reflecting toward F4 |
| 16 — First Wind Garden | Advance planning | Wind's third-turn right shift can finish a prepared vertical match | Row 4 carries B4's A into C4 between C3/C5 |
| 18 — Wind and Moonlight | Two-step causal chain | Wind **creates the opportunity** for a later Mirror Fusion | Row 3 left shift E3→D3; later C4→D4 activates mirror at E4 |
| 20 — Festival of Reflections | Multiple strategic alternatives | Two mirrors require genuinely different Fusion destinations while Hanabi needs clear downward lanes | C4→D4 activates D4 mirror; G3→F3 activates E3 mirror; G5→G6 can clear rocket lane |

### What makes these authored?
These are intentionally composed complete cell layouts, not seed-captured
random boards. Every reference includes a conceptual payoff, named setup
cells and a reproducible exact initial grid. Tests prove its planned swap
creates an **actual** Fusion/Mirror event using the genuine game rules.

## Implementation
- `harmony/journey-authored-openings.js` stores versioned, complete 7×7
  layouts with insight, intended actions and exact fixture anchors.
- `PuzzleArchitect.build` validates the entire board and reconstructs a
  real `HarmonyRules.Game` using original game mechanics and replay/refill
  RNG. It rejects free opening matches and fewer than three genuine valid
  swaps.
- The ordinary **Game Settings → Journey 2.0 Preview** starts the five
  hand-built boards automatically. There is nothing special to install or
  operate, and no new test-mode menu or player-facing editor.
- Replays use the same hand-built opening but different refill seeds. This
  is intentional: the puzzle's *initial decision structure* stays fixed,
  while variation in later drops tests robustness.
- The published 1–100 Journey levels and all regular saved games are untouched.
- Other Journey 2.0 previews (including the approved Koi finale at 10) retain
  their existing start logic.

## Validation / remaining work
- Unit contract: all five layouts preserve their intended placements, actual
  legal swaps, Moon Mirror resonance event, wind predictions, save/restore
  and the old live level isolation.
- Browser contract: the five test levels launch from the regular Game Settings
  preview in a 390 px viewport, execute **real moves** and leave saves unchanged.
- The existing Difficulty Lab CLI now selects the hand-authored blueprint
  when it exists. Its reference level-20 comparison is no longer a
  random-start comparison.
- **These opening moves do not prove a complete level is human-solvable,
  fair, or fun.** Evaluate full-game simulations and watch specifically for
  repeated shuffles, luck-dependent stalled objectives and overly easy wins.
- Next work should refine the five openings from simulator findings before
  applying the same methodology to all remaining levels 6–9, 12–15 and 17–19.

## Feedback targets
Please simply play levels **5, 11, 16, 18 and 20** and tell me:
- Did you notice an intentional route or clever placement?
- How many moves did you need to complete the level?
- Did you ever feel that success depended on luck or unnecessary repetitions?

No manual level editing is expected.
