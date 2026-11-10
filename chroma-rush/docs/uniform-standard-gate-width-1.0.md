# Uniform Standard Gate Width 1.0 — 2026-11-10

## Player request
Jump and Duck should not mix thin and wide versions at the start or later
in a run. Begin with the *former widest* regular starting gate and increase
both obstacle families **together** as speed rises.

## Implementation
- Regular Jump and Duck share one deterministic width based solely on speed.
- The fixed early width is **71 world units** (formerly 54–71 random).
- Ten common speed stages increase width in **15-unit increments** from 71
  to 221 at speed 2200, with plateaus between transitions so adjoining
  gates don't visually fluctuate in width.
- This applies to all normal Jump/Duck spawns, including Rush Chains.
- Random draws are still consumed by widthFor, preserving downstream seeded
  generator behavior; RNG cannot affect regular gate width.
- All gate heights, duck clearance, basic controls, physics, obstacle mix,
  spawn timing, Dash hazard sizes and Echo geometry remain unchanged.
- Versioned obstacle-balance asset and build marker are bumped for Pages.

## Validation
Compare every random roll and action type at the same speed. Check fixed
early width, monotonic shared stages, late zoom visibility, single Jump
clearance and Duck duration safety as in the obstacle-balance tests.
