# SKYSHIFT 0.16.4 — One Pilot Engine, Two Tracks (Aurora Fair-Flow)

## Why
Player correctly pointed out that changing tracks must NEVER change vehicle handling, GRIP or contact response. We compared **two real 0.16.3 runs from the same Manta Blade**:
- Skyline: 20 rail contacts, 9.00s on rail, 0 automatic yaw corrections, 3.5° average heading error, 8.75s GRIP.
- Aurora: 10 rail contacts, 25.32s on rail, **702 automatic yaw corrections**, 5.3° average heading error, 13.4s GRIP.
- Aurora's old 180° corners have radii ~119.5m and 124.8m, at 101.4m/s requiring ~0.81–0.85rad/s yaw. Normal steering at high speed can give ~0.50rad/s, so ordinary steering necessarily hits the barrier. This is a **course fairness issue**, compounded by a **code architecture issue**: 0.16.2–0.16.3 applied special steering suppression, yaw impulses and projection only when Aurora was selected.

## Changes
### Physics: same exact code on ALL circuits
- `trial-v0164.mjs` removes **all** `isAurora()` branches from `constrainToGuardrail()`, `projectWorldToTrack()` and `stepFlight()`. Exactly one original Skyline steering and GRIP function applies on both tracks; no Aurora-only yaw correction, rail suppression, or forward-only projection. Shared projection is the archived local-tangent bounded solver (4m backward, 10m forward).
- Same ship/GRIP/boost speed multiplier, yaw damping/response, wall scrub, physical half-span, 3D road frame and 120Hz physics for both. The only track-specific data are authored turns, elevation/banking, jumps, pads, tunnel, precision scoring and world coordinates.
- Record the same collision diagnostics for both tracks, enabling honest comparisons in future reports. No more artificial yaw correction counters.
- Rendering imports `trial-v0164` consistently for the same active 3D road, sparks and camera.

### Aurora is now a *fairer different track*
- Rebuild **only Aurora geometry** into 13 C2-connected authored sections, keeping 3400m per lap and three laps. The two 180° reversals now have radii **~219m and ~213m**, not 124.8/119.5. All other turns have radii over 200m; Skyline track data is unchanged.
- The final reversal now finishes at ~3180m, leaving a **true 220m final straight**. Previously the turn ended *exactly at the lap seam*, concentrating steering and clipping problems right at the finish.
- Analytically closed circuit, no random microbends, minimum road width unchanged, no risk lines added, no new mandatory mechanics.
- Align Aurora-only track cues and optional clean-carve scoring with new *road coordinates* (content, never physical steering).

### Records
The new Aurora centerline is a new track revision `aurora-fair-flow-0164`, so its PB/ghost is stored separately under `skyshift-time-trial-ghost-aurora-0164`. Old Aurora 0.16.0 records are **not deleted** but must not be replayed on a geometrically different course. Skyline PB and challenges are untouched.

## Real regression tests
- Deterministic child processes select Skyline and Aurora independently and run **64 identical real 120Hz grip/steering ticks**, requiring an identical sequence of actual yaw rates, GRIP intensity, speed, and scrub.
- Direct impacts on both left/right rails produce the **same** original physical response, no specialized yaw impulse.
- Both physics engines select **identical** projection limits; source test forbids `isAurora` steering/collision branches.
- Geometry checks verify all Aurora curve radii above 200m, 220m final straight, exact seam closure and 3-lap 3400m layout.
- Actual Chromium WebGL starts both circuits, exercises identical in-game 120Hz input sequences, preserves original Skyline 360° corkscrew and risk lines and verifies native 3D Aurora world/camera.
- Existing code tests and automated GitHub Pages publication remain gated.

## Caveat
An actual Android player's feel remains the final acceptance test. Merely having identical *control laws* does not guarantee two different turns feel identical: a tighter road requires more player correction. This release removes the **extra physics rules** and makes Aurora's arcs achievable under the same baseline. Do not add track-specific handling again.

Play: https://hajjen-game.github.io/Hajjen/skyshift/?track=aurora&v=0.16.4
