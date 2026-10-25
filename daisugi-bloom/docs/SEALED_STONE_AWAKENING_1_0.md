# Sealed Stone & Awakening Pulse 1.0 — Chapter 4

Japanese Harmony · v6.39.0 · 2026-10-25

## Scope & artwork
Levels **31–40** have a dedicated objective: break Sealed Stones. The chosen original user-approved transparent artwork remains intact in four distinct 640×640 WebP images optimized from 1254×1254 source PNGs:

| Remaining hits | Artwork | Visual |
| ---: | --- | --- |
| 4 | `assets/sealed-stone-0.webp` | Unbroken seal |
| 3 | `assets/sealed-stone-1.webp` | Fine cracks |
| 2 | `assets/sealed-stone-2.webp` | Glowing cracks |
| 1 | `assets/sealed-stone-3.webp` | Critical fracture |

Image transparency is preserved, and CSS uses `background-size:contain`; no sprite-atlas downscaling. On the final hit the stone is removed from the board.

## Mechanical rules
- A stone occupies one fixed cell and cannot be moved, matched, upgraded, refilled into, or shuffled elsewhere.
- Exactly **four distinct player turns** are needed for each stone unless a later pulse helps after earlier damage. Multiple cascades or pulses during one player move cannot remove more than one layer from the same stone.
- A fusion ending on an orthogonally adjacent cell can damage a stone. A normal 4-neighbour Harmony Pulse can also damage it.
- Breaking a stone releases **Awakening Pulse** from that cell, to all eight surrounding cells (orthogonal + diagonal). All eight receive a visual path even if some are empty.
- Occupied ordinary pieces receive one stage upgrade if eligible; growth within a connected chain is deduplicated. Fixed-cell mist and other fixed blockers can also be affected when available (pulse mechanics).
- If the eight-direction wave hits another stone, it removes at most one layer from that stone in the same turn; a stone at one remaining layer can itself break and emit a new eight-way wave. The queue is limited to 49 releases, one per cell.
- Normal Harmony Pulse remains strictly orthogonal. Neither one changes the game's original 9 families or baseline 7×7 merge rules.

## Chapter progression
- 31–33: one sealed stone and four-hit introduction.
- 34: two stones.
- 35: one stone with increased positioning challenge.
- 36–38: two stones.
- 39–40: three stones and more potential Awakening chain reactions.
- Seeded initial boards have >=3 legal swaps, and their stone cells are excluded from swap/hint/shuffle decisions.
- Chapter title in Goshuincho: *Förseglingarnas väg* (*Fyra sprickor, åtta riktningar*).
- Chapter 4 artwork remains a later visual-polish decision; current fallback motifs and past chapter illustrations are untouched.

## Compatibility and QA
- Existing in-progress saved levels 31–40 without `sealedStoneVersion:1` remain on their original objectives and board. No retroactive stone placement.
- New runs save `sealedStoneVersion`, `sealed[49]`, `sealedCleared` in the existing run snapshot; no save reset, economy changes or starred-record mutation.
- Node test verifies all four hit states, one hit per move, eight-way neighbours, chains, immovable blockers, gravity and old-save behaviour.
- Mobile-browser test confirms all four artwork states and 1/2/3 stone layouts on 390/320px screens, plus missing-asset and overflow checks.
- Existing comprehensive audits and mobile smoke must remain green.
- Balancing still requires human testing. Random, unskilled bots finish some early Stone levels and seldom finish 39–40, intentionally making the last two more demanding; do not treat this as human-difficulty validation.
