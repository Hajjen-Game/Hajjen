# SKYSHIFT 0.4.1 – True Banking & Manual Flight

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

0.4.1 replaces the last spline-following steering with genuine pilot-controlled 3D flight and banked raceway geometry. **Only forward speed remains automatic.** Steering, heading and world-space X/Z movement are player owned. The trial remains finite with six mandatory jumps, the island sequence, checkpoints, split routes, fullscreen and HDR rendering.

## Manual flight physics

- `trial-v041.mjs`: worldX/worldZ and heading are independent state variables. Steering rotates the ship's *own* heading; world displacement is derived from that heading and forward speed.
- Local road s/lateral coordinates now come from a bounded nearest-segment projection, used only for road/collision queries, checkpoint events and UI. That projection NEVER modifies heading or worldX/worldZ.
- Removed the synthetic `turnLoadAt` force entirely. Neutral steering does not turn toward the road, and a misjudged bend can send the ship off the edge.
- Pure deterministic physics with controlled turn rate and a smooth input response rather than hidden guide rails.
- Genuine checkpoint resets restore a coherent world position/heading, not just logical spline coordinates.
- The personal-best storage key is versioned for the new driving model so old assisted times do not compete.

## Physical 3D banking

- `bankAt(s)` uses authored road curvature to create a continuously varying camber up to **25°**, not a camera-only trick.
- `positionAt(s,lateral,height)` positions every road mesh, side rail, neon core, guide mark and landing cue in the same banked road frame.
- Ground collision and landing code sample `surfaceHeightAt(s,lateral)` from that geometry. The contact shadow follows the true surface normal.
- Bank angle gradually goes to zero at mandatory jumps, lateral Sky Islands and split cutouts, preserving fair launch/landing edges.

## Craft and chase camera

- Craft yaw follows `flight.heading`, rather than `poseAt(s).heading`.
- Third-person camera follows the real player heading and world position, not the track's path; leaving the track is visible rather than automatically corrected.
- Ship roll is composed from physical deck camber and actual input. Engine trails follow real craft heading instead of the old road tangent (`premium-v041.mjs`).
- Small horizon roll keeps the camera readable while the entire 3D road actually banks.

## Tests, metrics and constraints

- `truebank-v041.test.mjs` covers free-flight/no autopilot, left/right yaw, physical bank height and normals, geometry projection, checkpoint correction, independent jump trajectories, and active module wiring.
- CI keeps historical 0.4 tests scoped to the archived 0.4 renderer/fixed-track files.
- Audit now records real steering time, lateral off-track time, peak banking, heading-error statistics and aggregated draw calls/triangles.
- Renderer workload counters sum the whole HDR composer rather than logging only its last pass. They remain *draw-call proxies*, not direct GPU timing.
- Existing HDR bloom settings, modern GPU target (up to 2× DPR), space environment and the six handcrafted gaps are retained. No wall rides, inverted gravity or Chroma Rush color wave yet.

## Browser testing

Test long sweepers around 40–116m, 181–258m, 687–839m, and 1130–1248m. A neutral stick should now leave the road in a bend; controlled countersteering should trace it. Check the transition into/out of genuine bank and the Sky Islands jumping sequence. Report any launch/landing or unexpected snap in a 0.4.1 audit.

Other games in the repository are unchanged.