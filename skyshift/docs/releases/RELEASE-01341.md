# SKYSHIFT 0.13.4.1 — Stingray Clearance & Surface Integrity

## Problem confirmed by 0.13.4 A51 screenshots
The concept-inspired V3 Stingray wings are about **4.04 m from centerline to tip**, substantially wider than the older craft's visual/collision tuning. The real 120 Hz `stepFlight` still maintains hover for the **physical pilot center**, while steering, power carve and road banking add hull roll in `placeShip`. In hard corners an actual wing UNDERSIDE can visually pass below the road mesh, particularly beside a rail. This is a rendering/clearance mismatch; changing physics hover, steering or the GRIP speed/authority is not acceptable.

## Implemented V0.13.4.1
- **New** `wing-clearance-v01341.mjs`: on loading the real glTF Stingray, extract **36 underside sample points** from `Hero_Wing_L` and `Hero_Wing_R`, in ship-local coordinates. Scans GLTF geometry *once* per craft load; does not traverse meshes each render frame.
- Each visual frame, project the cached actual underside points through the **real current ship world transform**. Obtain the actual road's banked `surfaceNormalAt(s)`, road position and local lane tangent from the same `trial-v0901.mjs` 3D geometry that creates the road. Compute signed distances in that plane, not just world-Y difference.
- Where a visible piece would dip below the road, lift only `ship.position` **along the track normal** to leave at least **0.19 m apparent gap + 0.065 m curvature reserve**. The correction is immediate on ingress so no transitional frame shows a clipped wing; on release the extra lift eases away smoothly (3.3/s).
- While physically grounded, cap only cosmetic pilot roll beyond the current `-bankAt(s)` to ±0.17 radians (~9.7°), retaining the full physical wall/corkscrew banking and steering signals. Airborne rolls/tricks are unchanged. This reduces dramatic high-lift “floating” in sharp turns; both wings still respond visibly to steering and GRIP.
- Do not invent a ground plane at the Skyline Leap, an airborne trick or beyond road edges. Skip points outside the physical deck width; use `onRoad` as the gate. 70° magnetic wall and inverted corkscrew remain treated as signed 3D planes with the actual surface normal.
- Correction lives exclusively in render space. **NO changes** to `flight.y`, `stepFlight`, 120 Hz tick, physical collision radius, GRIP, steering, input, jump, time-trial ghost data, camera target, or Manta Blade. Original wing flap, tail springs, effects, white-core zone wave and Fidelity remain.
- Remove samples and reset the visual lift when switching ship; abort stale asynchronous asset loads using existing craft identity guard. A missing/invalid HERO file continues to fall back to classic procedural Stingray, without a new render-time logic burden.

### Diagnostics
`__skyshiftPerfProbe().stingrayClearance` and the downloadable `skyshift-v01341-performance-*.json` include version, `active`, `probes` (expected 36 for new Stingray), `minBefore`, `minAfter`, `liftMeters`, `peakLiftMeters`, `protectedFrames`, `rollClamps`, `maxUnresolvedPenetration`, `worstBefore` and `physicalFlightUnchanged`. No raw 3D sample vectors exported.

### Testing
- New `wing-clearance-v01341.test.mjs`: **12 tests** against the *actual deployed glTF* vertex data (not guessed wings), flat road, 70° banking, upside-down deck, outside-deck sample exclusion, immediate penetration correction, smooth release, no extra lift in the jump, procedural/Manta exclusion, craft-switch cleanup and pilot-state immutability.
- Updated `ui-flow-v01341.test.mjs`, `rail-scrape-sparks-v01341.test.mjs` and `browser-smoke-v01341.mjs` preserve previous menu, ghost, rail-spark and live ship regressions. Chrome smoke now requires 36 bound underside samples in Hangar and race but does NOT pretend a full Android test happened.
- `.github/workflows/skyshift-tests.yml` updated to run the tests and browser smoke; actual GitHub Actions Chrome run and device FPS still need live verification.

### Manual acceptance on Samsung A51
1. Open **https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.1**, select Stingray EVO.
2. In the sharp curves near the start and when holding GRIP + steer, inspect both wing tips **from below and from behind**. They should remain above road deck instead of visibly intersecting it, with no pop or unnatural sudden lift.
3. Also test elevated bank, magnetic wall, corkscrew and Skyline Leap: no snap to an invisible surface during airborne sections.
4. Check that left/right control, GRIP, tail motion and visual flaps remain responsive. Compare a full 3-lap run with 0.13.4 at the same Fidelity preset and similar phone conditions; log FPS and P95/P99 frame durations.
5. If still clipping, send the exact image/time/zone and log, especially `stingrayClearance` values; when the new mesh has wider true geometry or a rail has become the issue, adjust the sampled envelope instead of altering flight physics.

**Scope note**: This patch fixes **visual road-surface penetration**. It does not change the actual physical guardrail width, course design or other ships. The V3 hero mesh/art stays unchanged until another approved art pass.
