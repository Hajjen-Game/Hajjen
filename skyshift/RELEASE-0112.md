# SKYSHIFT 0.11.2 — Unified Flight Motion

## Goal
Reduce CPU allocation churn and make camera and ship cosmetic motion share one consistent source of signals, **without** changing steering, GRIP, track, lap pacing, collision, landing or the 120 Hz authoritative simulation.

## Scope
- `flight-motion-v0112.mjs`: three analytic critically damped spring updates now mutate the existing state directly. Previous `dampedSpring` pure API is retained. The exact same formula, coefficients, clamping, and output are used.
- `frame-pacing-v0112.mjs`: optional output objects for `capturePose` and `interpolatePose`; fixed interpolation-field array. `game-v0112.mjs` uses two stable simulation snapshots per run and one shared interpolated view. Respawns/trick roll discontinuities still snap instead of blending across them. Legacy callers can omit the output parameter.
- `unified-flight-v0112.mjs`: one stable, read-only motion signal hub dispatching the original Flight Motion, Signature Flight, Cinematic Preview and Kinetic Camera math. Camera and hull now sample the same local track flags for wall/corkscrew and the same clearance, preserving all existing tuned spring responses and update order. The kinetic camera step is moved out of `placeShip` and into the hub before the existing transform application.
- Retain full GPU and CPU gains of 0.11.1: selective bloom blur resolution, 30 Hz DOM-cached HUD, no per-frame profiler array, stable twin-engine FX context and correct spark telemetry.
- `browser-smoke-v0112.mjs` checks the new motion rig is active and physical flight is still running at 120 Hz.
- The exported audit now contains `visual.unifiedFlightMotion` and `window.__skyshiftPerfProbe().motionRig`.

## Deterministic verification
Parity tests compare the old and new implementations over:
- 500 spring integration steps at 120/60/30 Hz and an irregular 47 ms timestep;
- 6 interpolated render-pose samples, including wrap-around heading and air-roll discontinuity;
- 360 full visual frames with the original sequence of Flight Motion, Signature, Cinematic Preview and Kinetic Camera updates on both ordinary road and the magnetic wall and 360° corkscrew. All values must agree within 1e-11.

The tests also assert no new lights, draw calls, postprocess passes or pilot physics changes.

## Important distinction
The comparison proves mathematical parity of the moved code under synthetic, deterministic test inputs. It does **not** prove an actual FPS gain on a device. Frame pacing and qualitative feel must still be checked on real hardware when convenient. A work-owned iPhone is not required.

## Test commands
- `node --test skyshift/unified-flight-v0112.test.mjs`
- `node --test skyshift/track.test.mjs skyshift/trial-v02.test.mjs skyshift/rail-scrape-sparks-v0112.test.mjs skyshift/performance-audit-v0110.test.mjs skyshift/render-optimizer-v0111.test.mjs skyshift/unified-flight-v0112.test.mjs`
- `node skyshift/browser-smoke-v0112.mjs` under the existing GitHub Actions Chrome/WebGL runner.
