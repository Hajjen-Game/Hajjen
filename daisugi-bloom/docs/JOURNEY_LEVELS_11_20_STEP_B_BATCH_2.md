# Japanese Harmony · Journey 2.0 · Step B — Batch 2 (Levels 11–20)
2 November 2026 · **Unranked playtest drafts**. All currently published Journey levels, star archives and saved progress remain unchanged.

## Design goal
Following the positive playtest of the Koi-specific level-10 finale (completed in 25 moves, two stars), keep the first ten draft levels untouched. Level 11 opens to **five families**, levels 12 and 14 revisit Mist, and **Daruma arrives at level 15** rather than the older 21–30 chapter. Introduce fixed two-hit dolls clearly, then alternate with open-board chain play. Mist and Daruma can appear together from level 18 without requiring new physics.

## Ten authored levels
| Level | Name | Goal | Mechanics | Move budget | 3-star threshold |
|---|---|---|---|---:|---:|
| 11 | Five-Family Garden | 10 Fusions | Five families, no blockers | 32 | 16 |
| 12 | Mist Ribbons | Clear 4 Mist | Two small Mist patches | 36 | 18 |
| 13 | Rising Treasures | 4 stage-4 upgrades | Open board, stage planning | 36 | 19 |
| 14 | Mist Crossroads | Clear 5 Mist | Center-column Mist | 39 | 21 |
| 15 | First Daruma | Clear 1 Daruma | One central fixed doll (2 hits) | 38 | 20 |
| 16 | Daruma Pair | Clear 2 Daruma | Two dispersed dolls (2 hits each) | 44 | 25 |
| 17 | Open Harmony | 12 Fusions | Open breathing-space board | 34 | 19 |
| 18 | Mist Around Daruma | Clear 5 Mist | Five Mist with a central fixed Daruma | 44 | 26 |
| 19 | Pulse and Wishes | Create 2 Masterpieces | One optional central Daruma | 42 | 24 |
| 20 | Daruma Festival | Clear 3 Daruma | Three dolls with two optional Mist cells | 52 | 32 |

All move budgets and star targets are **provisional**, not claims about measured completion rates.

## Exact mechanics and authored scope
- **Daruma:** immovable, two hits to clear; one hit maximum per move. Adjacent Fusions and Harmony Pulse can damage it. L15 explains this without introducing another new mechanic at the same time.
- **Mist:** remains a fixed tile overlay; clears only via a Fusion landing on that cell or Harmony Pulse. At L18 the fixed Daruma changes routing, but *only the five Mist cells* are required. At L20 the inverse applies: only three Daruma are required, with Mist as secondary spatial texture.
- **Five families:** the existing `activeFamilies(level, 5)` controls membership, not hand-inserted bonus treasures.
- **Masterpieces:** L19 is a short breath with spectacle, not another three-Daruma objective.
- **Never auto-complete or secretly add help:** every opening uses the real 7×7 board, real Director, legal swaps, and normal hit mechanics. No artificial objective credit.
- **No Moon Mirrors, Wind Garden, Hanabi, Sealed Stones or Bamboo** in this chapter. They arrive gradually later in the planned progression.
- **Safety:** all twenty recipes are `HarmonyJourneyDrafts.get(index)` opt-in diagnostics. None modifies production `levelConfig`. The UI keeps original progress, rewards, coins and Omamori untouched.

## How to test
On the existing game: **Game Settings → Journey 2.0 · Levels 1–20 Preview → Levels 11–20**.
The chooser shows exactly ten levels at a time, with tabs to return to levels 1–10. The results modal returns to the active chapter. Test rounds can be exported from the results modal.

Repeated plays of levels 11–20 generate distinct, reproducible opening seeds. The established level-10 Koi replay rotation is kept.

## Technical verification
- Existing Chapter 1 regression suite still covers sixty seeded, four-family openings and Koi objective counting.
- New `harmony-journey-v2-chapter-two.test.cjs` covers sixty genuine five-family starts, legal swaps, fixed Daruma and Mist, zero incidental Moon/Wind/Hanabi fixtures, save/restore parity and unchanged live levels.
- New mobile browser test at 390px verifies chapter tabs, real Daruma art, one true successful move, different retry opening, L18 mixed fixtures, L20 final fixtures, consumables hidden and unchanged player saves.
- CI status must be checked before declaring this batch validated; these checks do **not** replace human playtesting of goal reachability or difficulty.

## Next
Evaluate manual tests on L15, L16, L18 and L20 first. Use exported completed/failed-round traces to decide whether Daruma is fair and entertaining, before starting the separate 21–30 Moon Mirror introduction.
