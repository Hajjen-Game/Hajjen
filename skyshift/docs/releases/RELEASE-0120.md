# SKYSHIFT 0.12.0 — Racing Experience Evolution

## Goal and approach
An experiential update, not another post-processing pass. The real 3D Skyline Circuit keeps its mathematically closed 3,400m lap, seven purposeful turns, eight straights, 33.6m leap, 70-degree magnetic wall, Shadow Tunnel, 360-degree corkscrew and 3-lap 10,200m race. No small hand-drawn wiggles, extra mandatory controls or forced steering.

### Precision Flow (real racecraft)
`racing-experience-v0120.mjs` observes existing authoritative 120Hz flight steps. Four deliberately authored, non-overlapping short windows—PRECISION APEX, S-COMPLEX, BACK SWEEPER and FINAL CARVE—can register clean pilot-driven GRIP turns. To earn a clean Flow event, the actual ship must build controlled yaw with held GRIP for a minimum window-specific duration **and not contact the rails between entry and exit**. Flow can chain within a lap, resets after a missed maneuver, and deduplicates each window once per lap. Flow is a **presentation reward**, not a speed increase, auto-steering or shield change. The original boost pads, trick/landing boosts, world collision and topological track all remain authoritative and untouched.

### Camera and engine finish
A modest exponential, section-responsive camera FOV and lean gives extra presence to the important sweeps and technical links. Successfully completed Flow adds a short camera/engine swell. The added camera roll and FOV are suppressed on magnetic wall and corkscrew sections to preserve the carefully fixed inverted-road horizon. Engine response reuses existing engine lamps and exhaust plumes; no new lights, passes or motion-trail lines. No per-frame object creation in the new race director.

### Geometry identity
`sector-landmarks-v0120.mjs` adds exactly two pairs of original large, swept metallic roadside blades with fine white-core edges (S-COMPLEX, FINALE). They stand outside the guardrails, have no colliders and do not alter roadway topology, its collision width or rail geometry. Body and edge are each batched into a single mesh: **2 additional draw calls in total**, under 120 extra triangles. There are no repeated posts, skyscrapers, tunnels or long roadside stripes. A51 performance must be measured; 2 draws is an intentional small but nonzero budget.

### Fidelity 0.11.4 preserved
The Samsung Galaxy A51 user logged a valid `fidelity-on` run with forced vertex-space Fidelity at DPR=1.25 / bloom .78: **41.096 FPS**, 50ms P95, 66.7ms P99, 879/6321 slow frames (>33ms), 150.9ms dropped simulation over 153.68s, adaptive DPR changes 0, 3 laps completed. This is a useful improvement from the old 0.11.3 ON log (29.043 FPS, 83.3ms P95), but different run order, thermal state and no GPU timer prevent attribution to GPU shader cost alone. No Fidelity changes in 0.12.0. Normal low-memory mode keeps premium off and automatic adaptive DPR.

## Instrumentation and testing
- `visual.racingExperience`, `visual.sectorLandmarks`, `run.precisionFlow` and `window.__skyshiftPerfProbe().racingExperience/landmarks`.
- 7 deterministic new tests verify real held GRIP clean turn and rail rejection, no duplicate rewards, lap chain behavior, exponential camera step equivalence, pause freeze, protected 70° wall and corkscrew, and tiny exterior landmark geometry.
- `browser-smoke-v0120.mjs` checks the actual WebGL game and renderer, active 0.12.0, the new modules' signal and geometry plus all legacy flight/tunnel/Fidelity/Android tests.
- CI updated for test discovery, syntax checks, browser smoke and screenshot upload.

Real-device feel and FPS on A51 / iPhone remain user playtest validation; do not infer a hardware uplift from deterministic tests.

## Playtest
https://hajjen-game.github.io/Hajjen/skyshift/?v=0.12.0

Observe the S-COMPLEX entry and FINALE track architecture, try deliberate GRIP + steer through the precision corners without railing, compare how the camera settles after a successful precision flow, and verify the 360-degree corkscrew and Shadow Tunnel still read correctly. Use normal settings first on the A51; optional `?perf=1&perfPreset=fidelity-on` still exists for separate optical comparisons.
