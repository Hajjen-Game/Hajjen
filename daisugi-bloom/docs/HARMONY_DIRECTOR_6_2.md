# Harmony Director 6.2 — Proactive Deadlock Prevention & Objective Momentum
**1 November 2026** · separate new-run engine mode

## Evidence and motivation
A real 6.1 level-54 Gate of Echoes round (seed 20266172) cleared seven pulse hits in 29 moves with 17 remaining and one forced shuffle. Legal choices fell 3 → 1 → 1 → 0 on moves 4–7. The log contained 18 regular candidates with zero legal moves at move 7, so the existing 6.1 refill could not prevent the deadlock at that point.

## Implementation
- Separate mode v62, default for newly started automatic levels 51+ and mechanic previews. Saved v61/v6/v4 and earlier rounds keep exactly their mode.
- Pure one-action structural outlook: for the first 24 legal swaps, count other currently legal swaps outside columns involved in the swap's immediate match. This is a **fragility heuristic**, not a gravity/refill simulation, and is especially conservative for Wind and Moon effects.
- Warn when four or fewer legal swaps exist, or <=8 with no independent routes. Candidate selection now prizes genuinely higher mobility and lane independence *before* speculative objective score.
- After at least five stalled goal moves, bounded objective momentum supports reachable stage investments or real collection possibilities. No artificial goal progression, created matches or free stage upgrades.
- The existing seeded bag and natural cascades are preserved. Alternatives are normal forked refills; add search breadth only for dangerous mobility; shuffle remains an authentic last resort.
- Exported refill traces include risk, independent routes and momentum for candidate auditing.

## Limits
No multi-turn gravity, Wind/Mirror, or RNG prediction is claimed. Some deadlocks cannot be prevented with ordinary refill candidates. Measure seed-paired outcomes and Android responsiveness before claiming player-facing improvement.
