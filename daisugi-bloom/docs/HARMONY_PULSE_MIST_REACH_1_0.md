# Harmony Pulse Mist Reach 1.0 — 6.26.1
Date: 2026-10-24

## Player report
When Fusion Destination Control draws a stage-4 object out of a fixed mist cell and promotes it to stage 5 on another cell, the original fog-covered cell becomes empty until gravity. The old Harmony Pulse filtered out empty cells before checking mist and therefore missed the now-vacant square.

## Updated contract
- Pulse originates from the **current location** of the stage-five object.
- Its four orthogonal neighbouring **cells** are spatially affected, regardless of occupancy.
- If the cell contains an eligible object, it evolves by at most one stage per connected chain (unchanged).
- If the cell contains mist, the mist clears even when the cell is empty, already-mature, or already affected by a four/five-match bonus. No diagonals and no remote consumed sources.
- Distinguish `targets` (real object upgrades) from `mistTargets` (fog-only reaches, including empties).
- `pulseHits` and Pulse score only increase for `targets`, not `mistTargets`; these extra rays cannot create phantom objects or another pulse chain.
- Fog-only `pulse` events still animate anticipation, travel, impact and release. On mobile the visual cap prioritises mist-clearing rays; it never caps logic.
- Gravity/refill still waits for all Pulse waves and harvests.
- No new player data reset. Historic save format and scores unchanged.

## Tests
`harmony.test.cjs`: actual empty misted source cells clear, including an entirely empty four-neighbour Pulse with zero object upgrades, zero additional points and a saved objective.
`harmony-pulse-destination.test.cjs`: original stage-four identity moves from a fog source, sends Pulse only from destination, cleanses the newly empty adjacent mist while nonadjacent mist remains, and deterministic real gameplay maintains spatial invariants.
`harmony-browser-smoke.mjs`: at 390px width, create a real stage-4 movement + stage-5 Pulse and observe glow on vacant mist cell and mist-release animation at its original position.

## Balance follow-up
Clearing empty mist cells makes fog levels somewhat more forgiving. Validate player feedback and move budgets on levels 13–20 before separately rebalancing difficulty. Do not quietly increase fog counts to offset this bug fix.
