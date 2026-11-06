# CHROMA RUSH — Unified Terrain Director 3.0

**Scope:** Coordinate the existing infinite procedural terrain with Adaptive Rush Director 2.0. No new levels, buttons, physics, movement-speed rules, audio, HP or scoring systems.

## Motivation

Before 3.0 the TerrainSystem independently chose flat ground, slopes and gaps while the hazard Director scheduled jump/duck motifs. The hazards could be rejected near a gap, but there was no coherent planning around BUILD/PEAK/FADE/RELAX. In particular, a gap generated while PEAK was active might not reach the player until the Director was already in RELAX.

## Implementation

- `src/director/unified-terrain-director.js`: sidecar coordinator constructed with the existing terrain and adaptive Director. It projects an upcoming terrain feature's *arrival time*, uses the anticipated Director phase to determine safe feature weights, and forwards obstacle steps to the existing Director only when terrain permits.
- `src/terrain/terrain-system.js`: accepts an **optional** policy callback during `ensure`. The geometry generator remains authoritative for slopes, gap width, flat landing space, minimum gap separation, and zone unlocks. Calls without a policy still use the original standalone random generator.
- BUILD: predominantly slopes and flats; infrequent gaps only for later zones and confident play.
- PEAK: modest chance of a gap when enough phase time remains for both the jump and its landing. Wide/sloping terrain is less frequent than in BUILD.
- FADE/RELAX: no newly planned gaps. These phases are calm, though previously generated features can still exist in flight; forecast prevents most phase drift.
- Low HP / high stress: lowers or removes **future** gap pressure and softens elevation changes; speed is not reduced. Already visible geometry is never rewritten under a player.
- Hazard deferral: if a pending jump/duck would appear too near an existing gap, leave the action pending and retry. Do not increment Director spawns for rejected obstacles.
- Gap outcome: a miss adds a finite gap-plan cooldown and a recovery space for new hazards. A successful gap maintains flow; no hidden score or shield changes.
- Round audit: generated slope and gap events include `plannedPhase` to facilitate future real-run analysis.

## Safety constraints

1. No gap before zone 3; no slope before zone 2.
2. Terrain generator enforces min/max gap width, min landing runway, and physical separation.
3. Obstacles remain on flat ground, out of the protected takeoff and landing neighborhood.
4. No re-roll of already visible terrain when the Director changes state.
5. At high speed, gaps still fit the existing single-jump ability; Coyote Time and Jump Buffer are unchanged.
6. The seedable rules are testable with no player data and no network.

## Verification

- Unit tests: projected arrival phase, high-stress / low HP restrictions, deferred pattern retention, post-fall recovery, zone/geometry bounds.
- Seeded 3-minute simulations: multiple seeds, naturally cycling Director phases, gap/obstacle spacing and continued content production.
- Existing full gameplay tests: input/duck, gap damage, Flow, audio, progression, exported round logs.
- Browser visual matrix: flat, hills, gaps, and background continuity at four landscape viewports; menu and round-log export.

**Limits:** Simulation verifies structure and reachability constraints, not subjective enjoyment, actual player reaction time, or FPS on old Android phones. The current phone-performance concern (slowdown after terrain was introduced) remains a **separate profiling and rendering optimization task**. This change intentionally adds no new particles, gradients or shaders and does no frame-by-frame pathfinding.

## Next recommended test

Once a suitable phone is available, export 3–5 rounds and compare: missing vs cleared gaps, Director phase of each gap, duration in PEAK/RELAX, time at Chroma State, and frequency of deferred hazards. Verify that PEAK feels different from BUILD without overwhelming the player, and that late gaps remain readable at intended 2–3-minute speeds.
