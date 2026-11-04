# Early Game Difficulty Calibration 3.0 · Journey 2.0 levels 1–20
3 November 2026 · **Opt-in unranked previews; published Journey remains unchanged**

## Human feedback
After the Hanabi-first identity redesign, a real player reported clearing almost every
level in **2–3 moves**, including the chapter-2 finale (level 20) in just **2 moves**.
This is a **design failure** even if the game mechanics and animations are correct.

### Root cause in the authored recipes
- Level 20 asked only for two Hanabi deliveries, although its two Moon Mirrors were
  supposed to be the chapter's strategic centerpiece.
- The Hanabi opening deliberately supplies easy bottom-row matches. It was adapted
  from a **demonstration pilot**, then reused across chapter finals.
- Other recipes asked for two stage-4 upgrades, two generic Masterpieces or modest Mist
  counts. One cascade or launch can advance several such counters simultaneously.
- Large move budgets and a powerful Director make tiny single-condition goals even
  easier. Merely lowering the budget would not solve the two-move win.

## Design response
Levels 1–4 remain short learning levels. Level 5 stays a short, visually rewarding
first Hanabi. The tested **Koi Masterpiece Finale (10)** stays intact.

The other fourteen redesigned levels use explicitly listed, independently necessary
**secondary objectives**. All objectives count actual engine events and may be
progressed in any order; no hidden move minimum, random locks, artificial blockers,
fake credit or arbitrary difficulty multiplier is added.

| Level | Primary goal | Additional requirements |
|---|---|---|
| 6 | 2 Hanabi rockets | 3 separate four-tile match turns |
| 7 | Clear 4 Mist | Deliver 1 rocket; 5 Fan fusions |
| 8 | 2 Masterpieces | Deliver 1 rocket; 1 Koi Masterpiece |
| 9 | 2 Hanabi rockets | Clear 2 Mist; 6 Lantern fusions |
| 10 | 2 Koi Masterpieces | **Unchanged; already positively playtested** |
| 11 | 2 stage-4 upgrades | 3 genuine Moon Mirror Fusion Resonances |
| 12 | Clear 3 Mist | 4 Mirror Resonances |
| 13 | 2 Hanabi rockets | 4 Mirror Resonances |
| 14 | 3 stage-4 upgrades | 5 Mirror Resonances |
| 15 | 2 Masterpieces | 4 Mirror Resonances; 1 Hanabi rocket |
| 16 | 14 Fusions | Four-tile matches on 4 separate turns |
| 17 | 1 Hanabi rocket | Four-tile matches on 4 separate turns; 5 stage-4 upgrades |
| 18 | 3 stage-4 upgrades | 3 Mirror Resonances (Wind helps create the openings) |
| 19 | 2 Masterpieces | Four-tile matches on 5 separate turns |
| **20** | **2 Hanabi rockets** | **6 Mirror Resonances; 2 Masterpieces** |

**Mirror Resonance** only counts when an ordinary player-created Fusion lands next to
a fixed Moon Mirror and activates its directional reflection. It is credited **at
most once per accepted player move**, regardless of long cascades or Hanabi blasts.
Thus the level-20 finale cannot be cleared by the old two-rocket/two-turn shortcut.
The player must genuinely learn to work *with* Moon Mirrors.

**Four-tile turns** already count once per separate player decision in the real
rules engine; one giant cascade does not earn five separate turns.

## Readability and compatibility
- HUD lists goals in a stable order: `Hanabi 2/2 · Mirror 4/6 · Masterpieces 1/2`.
- The help modal and accessible goal text describe all tasks before completion.
- Completed primary goals do not close the level until the other **visible** tasks
  have been met. The compact HUD preserves the festival presentation.
- Existing normal level goals and historical save contracts are not modified.
- The new counter is included in diagnostic save/restore and defaults safely to
  zero on snapshots created before the optional Mirror objective existed.
- Even with multiple tasks, moves, RNG, gravity, fusion, Moon Mirror, Hanabi,
  Wind and Harmony Director 6.2 all use the existing genuine mechanics.

## Verification / limits
- Automated contracts verify immutable recipe data, every requirement's counters,
  60 seeded openings in each chapter, legal swaps, one Mirror credit per move,
  chapter-final non-completion after two rockets and after five Mirror activations,
  save/restore, mobile goal visibility, and unchanged published levels.
- The old tests checked technical correctness, **not difficulty**. New tests prevent
  the specific zero-strategy two-move finale, but cannot guarantee that every
  combination feels fun or balanced. In particular, multi-objective gameplay
  should be checked for too many four-tile matches and Mirror starvation.
- Playtest high-priority levels **6, 8, 11, 14, 16, 18, and 20**. Report
  successful move counts, stalls, resets and involuntary shuffles.
- Never promote the draft into the normal Journey until its difficulty is
  manually approved.
