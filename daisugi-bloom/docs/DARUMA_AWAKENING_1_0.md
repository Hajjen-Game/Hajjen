# Daruma Awakening 1.0 · 6.30.0

## Introduction
First playable Daruma at **Level 21** (zero-based index 20), followed by two-Daruma goals on Levels 23 and 26. Level 22 and all earlier levels remain unchanged. This is a new obstacle/objective, not a tenth matchable family.

## Rules
- A Daruma is a fixed occupant in one controlled board cell. It cannot be selected, swapped, matched, upgraded as a normal family or moved by gravity and shuffles.
- A **fusion whose surviving piece finishes directly above/below/left/right** of the doll grants one eye.
- A **Harmony Pulse reaching that cell** grants one eye. Diagonals do not count.
- Each Daruma receives **at most one eye per player move**, irrespective of cascades, multiple fusions, or multiple Pulse waves in that turn.
- On the first hit one black eye appears; on a later move, the second eye completes the doll and the fully painted state appears briefly. It then releases sakura-colored light and the fixed cell frees up for ordinary gravity/refill.
- No additional moves, automatic boosts or free stage increases; successfully completed dolls count toward the explicit level goal. Score/stars keep the existing reward rules.
- Daruma obstructs gravity while active. Each column compacts only within the contiguous segments between remaining Daruma cells; after completion the segment joins again.
- Refill and identity-preserving shuffle respect fixed Daruma and never move existing advanced objects through them.

## Asset
A single optimized transparent WebP sprite strip with three matching 64px Daruma designs from the approved artwork: blank/one-eye/two-eye. Mobile renders one tile at a time from this atlas.

## Compatibility
In-progress saves from before 6.30.0 on Levels 21/23/26 keep their previous objective and board. New games on those levels use Daruma. Saves from new games persist eye progress, position and objective without changing archival scores and stars. No localStorage reset.

## QA
- Fixed positions and swaps, one-hit-per-turn/cascade, pulse, gravity, bonus/refill, resuming half-painted Daruma, two-hit completion.
- Seeded Director 3.0 runs without empty/deadlocked grids.
- Browser mobile image decode, visible stage changes, goal accessibility, and end-of-level UI.
