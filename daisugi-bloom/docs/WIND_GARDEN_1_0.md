# Wind Garden 1.0 — Playable Row Movement
31 October 2026 · opt-in prototype integrated with the actual Japanese Harmony rules engine

## Why
The first chapters risk feeling too similar to conventional match-three. Wind Garden tests a different kind of player agency: **plan which positions will line up after an announced shift**. It must complement real fusion evolution and satisfying Harmony Pulse chains, not replace them with an automated rescue.

## How to play
On the Japanese Harmony start screen expand **Game Settings**, select **Wind Garden · Preview**, then choose one of three unranked scenarios.

1. **First Breeze** — row 4 moves **right after every valid move**, with wraparound. Goal: 18 fusions within 14 moves. The first legal lesson swap is row 3, column 4 downward into row 4, column 4. You should experience several shifts, not an instant demonstration victory.
2. **Crossing Winds** — a shift occurs **after every 2 valid moves**. Row 3 shifts left, row 5 shifts right, repeating. Goal: advance four objects to stage 3 within 18 moves.
3. **Garden Tide** — row 4 alternates **left and right each valid move** while two fixed Mist cells must be cleared within 18 moves. Mist remains attached to board cells, not to moving pieces.

The small visible **風 ROW n ← / → · x MOVES** label at the top of the board tells the player the **next affected row, direction and count of valid moves until it shifts**. The upcoming row is highlighted subtly; no panel obscures the board. Invalid swaps cannot advance the schedule. The prototype uses a real 7×7 board, genuine swaps, Directorate refills and genuine fusion/Pulse mechanics.

## Engine semantics
- After a **valid player's move**, settle all ordinary fusion cascades, gravity and refills.
- If that decision reaches the scheduled threshold and the level has not yet finished, rotate the selected row by **one slot** in the announced direction, with wraparound. The left/right edge piece returns at the opposite edge.
- Piece **IDs, families and stages move unchanged**. Fixed-cell Mist overlays remain at their positions.
- **Entire row must be full and settled** before shifting; a row containing Daruma, Sealed Stone, terrain, Moon Mirror or Lotus cargo is **skipped visibly** rather than silently shifting a blocker or moving only part of the row. A skip is still one scheduled event; the next forecast proceeds.
- **If the wind forms new matches**, they resolve via the regular fusion, Masterpiece, Harmony Pulse, Director refill, blocker and goal rules. Such automatic cascades **do not schedule another wind**; there is only one shift per accepted player move.
- If a wind shift leaves no legal swap, use the ordinary fair shuffle recovery.
- No extra moves, guaranteed winning path or adaptive intervention are introduced.

## Animation, saves, export
- An identity-preserving horizontal FLIP moves the six ordinary row pieces together. The seventh wraps via a shorter edge re-entry, rather than flying across the entire board.
- The existing board and background stay intact. The Wind Garden preview uses the same reduced-motion setting as existing gameplay.
- The engine supports restoring an opt-in wind round exactly: schedule, progress, board IDs, RNG and telemetry are serialized; the next forecast is calculated from completed legal moves.
- A voluntary JSON round export contains the wind schedule and **wind-shift / wind-blocked** events, including row, direction, affected object IDs and target cells.
- These three demonstrations are **not** live levels 81–90; they do not grant or spend stars, Goshuincho stamps, coins, Omamori or player progress, and do not overwrite an existing unfinished normal run. No level 1–100 is rebalanced.

## Verification
- Tests run on the **real rules engine**, including preview openings, invalid moves, one-cell wrap, deterministic schedule changes, post-wind fusion cascades, blocked rows, stationary Mist, ordinary levels, exact saved state/round telemetry, and deterministic seeded starts.
- 18 seeds × three scenarios are also exercised.
- Mobile smoke is added to GitHub Actions: verify menu, preview title, timing/direction badge, highlighted row, mobile no-overflow, genuine swaps and untouched saved progress.
- **Do not call browser CI green until the Actions run is confirmed.** Hands-on Android checks should confirm the wind row is clearly identifiable and the wrap animation is understandable.

## Recommended next pass
**Wind Garden 1.1 – Authored Spatial Challenges & Readability**.
Create true placement-dependent puzzles rather than only demonstration boards; evaluate whether shifts should always wrap or stop against fixed obstacles, and whether a stronger wind VFX is necessary. Follow with a combined mechanics review alongside Moon Mirrors before permanently reorganizing the first 20 levels.
