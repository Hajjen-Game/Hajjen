# Harmony Director 4.0 — Objective Intelligence & Adaptive Recovery
**Date:** 2026-10-25 · **Release:** 6.47.0

## Activation
- The normal **Automatic** engine uses Pacing 3.0 for levels 1–9 (zero-based indices 0–8), then Director 4.0 for **level 10 onward** (indices ≥9).
- The advanced engine picker can still force Standard, Director 2.0, 3.0, 3.1 or 3.1.1 for reproducible comparison. Explicit 4.0 testing is also available.
- Previous saved runs resume on their original engine. Old 3.0 *default* preference migrates once to Automatic; other preferences are preserved. Existing stars, high scores, levels and rewards are untouched.

## Model
4.0 inherits the legal candidate refill selection of 3.0, the objective and directional fusion metrics of 3.1, and the final-1–3-Mist-tile reachability of 3.1.1. The additions are:
1. **Daruma and Sealed Stone targeting:** For every legal swap, inspect the first match landing cell (including player-chosen fusion destination) and whether that fusion would reach an adjacent fixed obstacle. Prefer candidates with multiple useful **player-driven** routes. Incomplete supported stage-3/4 investments provide a small secondary signal; an isolated stage-4 is not treated as an assured hit.
2. **Partial-hit progress:** Hitting an eye or chipping one of the four stone layers now resets 4.0's goal drought even when the obstacle has not been removed. Earlier modes retain their previous drought semantics.
3. **Adaptive Recovery:** After several genuine moves without meaningful objective progress, compare a limited number of extra ordinary refill candidates and relax the selection threshold slightly. The objective bonus and comparison count remain capped; the player never receives automatic progress.
4. **Consistent endgames:** Retain 3.1.1's final Mist analysis and use goal reachability for multiple Daruma and Stone positions too, without changing the target or move count.

## Fairness invariants
- Only stage-1 pieces from the same weighted, conserved family bag fall down normal gravity.
- No new match, immediate cascade, direct blocker damage, free turn, forced swap, altered score/star rule, or changed objective can be created by the Director.
- Candidate zero is the exactly original Standard refill, with forked deterministic alternatives. A refill is only changed if a legal proposal beats the baseline by a bounded margin. Automatic matches that Standard would produce are preserved.
- Only a player's real swap resolves a fusion. The objective model is read-only and preserves all existing piece identities/stages.
- Identical seeds/snapshots produce identical results; the selected engine survives save/load.
- The pace timer remains local-only. Long deliberation is not classified as poor play.

## Testing
- `tests/harmony-director-v4.test.cjs`: fixed-obstacle reachability, partial hits, score bounds, unchanged initial boards, refill bag/stage conservation, seeded snapshots, and Engine Lab comparison.
- `tests/harmony-browser-smoke.mjs`: Automatic mode uses 3.0 at level 1 and 4.0 at level 10.
- `Game Dev → Motorlab`: comparison **Endgame 3.1.1 vs Director 4.0**, sharing seeds. Human playtesting remains essential; bot success is not a proxy for fun.

## Scope
This pass does not implement opaque MakeHarder behavior, personalized monetization, additional turns, or machine learning. Future balance changes should be based on observed player difficulty and paired simulations, not automatic win-rate tuning.
