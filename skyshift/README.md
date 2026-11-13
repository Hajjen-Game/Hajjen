# SKYSHIFT 0.4.4 – Flight Dynamics & Motion Feel

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

**Optional flight-tuning panel:** https://hajjen-game.github.io/Hajjen/skyshift/?flightlab=1

## Intent and safeguards

The 0.4.3 handling lab fixed the slippery feel and doubled the forward speed. This pass adds a more expressive flight *presentation* while keeping the 0.4.3 pilot-owned world position, yaw-rate steering, 120Hz physics, road collision and uninterrupted track mesh intact. This prevents visual polish from accidentally creating steering assistance, sideways inertia or lane magnetism.

## New flight motion

- **Steering-based roll:** up to 19° pilot-derived lean, combined with 78% of actual road bank and clamped to ±33.2°. An analytic critically-damped spring gives fast turn-in and a slower, non-wobbly release.
- **Hover suspension:** independently damped visual height offset, under 11cm, reacts subtly to turn load and lateral motion with a tiny idle variation. Collision height and jump/fall rules remain authoritative and unchanged. This is deliberately not a new physics hover integrator.
- **Pitch:** subtle nose-down response to turn load, preserving vertical velocity response for possible future jump courses.
- **Inertial chase camera:** smoothed craft heading, coherent camera-position/look-at response, restrained camera roll (<2.3°), recycled vector buffers to reduce per-frame allocation.
- **Time integration:** rate-independent damped springs sample the same interpolated 120Hz pose as the rest of the renderer. Pause freezes the flight spring state, checkpoint resets it; large frame steps are capped.
- **Live tuning lab:** append `?flightlab=1` to enable six sliders for banking, spring response, hover travel and camera following. The normal game UI remains unchanged.
- **Audit:** export `skyshift-flight-v044-audit.json` with active tuning and peak visual bank, pitch and hover metrics.

## Code and tests

- `flight-motion-v044.mjs`: isolated renderer-neutral spring and camera motion engine.
- `frame-pacing-v044.mjs`: retains 0.4.3 pacing with interpolated yaw-rate and lateral velocity.
- `game-v044.mjs`: active gameplay integration and opt-in tuning UI.
- `flight-motion-v044.test.mjs`: steering bank, spring stability, neutral recovery, hover, camera, unchanged authoritative handling, frame interpolation and active-page checks.
- `speed-v043.test.mjs`: old implementation assertions retained, with the expected active page updated.
- `.github/workflows/skyshift-tests.yml`: syntax/logic checks for both 0.4.3 and 0.4.4.

Run `node --test skyshift/flight-motion-v044.test.mjs skyshift/speed-v043.test.mjs` to verify core checks.

**Mobile playtest priorities:** Is a partial steering input visually readable? Does it settle without wobble? Does the camera feel stable when changing direction quickly? Is hover subtle rather than floaty? Check with and without the optional tuning panel, then export the audit. Automated tests cannot determine whether the feeling is premium on a real phone.

---

## Previous release — 0.4.3

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

This is a focused technical pass on the 510-metre Handling Lab. The user confirmed that the manual ship controls are no longer notably slippery but reported visible stutter, transverse lighting bands in the road, and the desire for roughly twice the forward speed. The former 0.4.2 code and longer 0.4.1 trial remain in GitHub for rollback/comparison. Other games are untouched.

## 1. Double speed, same basic radius

- `trial-v043.mjs` scales speed from **22–23.5 m/s** to **44–47 m/s**.
- Maximum yaw rate scales by 2× (0.62 → 1.24 rad/s); response and release constants increase to stay responsive over the doubled distance traveled each second.
- The authored course is still exactly five elements: 95m straight, genuine constant-radius banked left, straight, genuine constant-radius right, finish straight. No jumps in this steering-only lab.
- The craft owns its world position and heading. None of these changes bring back road following, lane recentering or synthetic turning forces.

## 2. Rebuild road as ONE shared-vertex surface

- `smooth-track-v043.mjs` samples the centerline every **0.45 metres**, using 5 vertices across its width.
- Instead of generating independent 0.8m top-surface triangles and shading each face separately, it builds **one indexed, contiguous deck**. The render engine computes normals across shared row vertices.
- Physically hard-edged vertical sidewalls remain a separate mesh. Thin neon guardrails, centerline, banking, checkpoint signs, collider and route shape retain their established roles.
- The change fixes the *structural cause* of transverse per-segment lighting seams. It does not guarantee visual smoothness until playtested.

## 3. Fixed-step physics and interpolated rendering

- Physics is still authoritative at **120Hz**. Renderer samples a pose interpolated between the previous and current fixed physics steps.
- Ship, chasing camera and engine trail feed from the *same* interpolated world pose, not three differently timed positions.
- Checkpoint teleport/respawn is recognized and rendered as a snap; interpolation must not visually slide the ship hundreds of metres.
- Long frame delays are explicitly tracked. No hidden automatic course correction is added.

## 4. HDR compositing and performance

- Default is **full quality up to 2× device DPR** and the exact 0.3.2 neon/bloom hierarchy.
- When **90+ recent samples** indicate prolonged slow frame times (95th percentile over 27ms AND a similarly slow median), the **offscreen** EffectComposer render resolution can fall from 2 to 1.75 to 1.5, with a 9s cooldown. The visible canvas and HTML HUD remain at native quality. Fast devices remain at full settings, and resolution can recover after sustained fast frames (p95 under 17ms).
- This is workload adaptation rather than a permanent global reduction for older hardware; no device model is singled out.
- The audit now reports **real frame-duration average FPS** (not arithmetic per-frame FPS), minimum observed FPS, p95/p99 frame times, renderer CPU-call timing (not true GPU timing), simulation steps, dropped simulation time and HDR internal rendering DPR.
- Logging of renderer draw calls/triangles remains indicative, not an absolute GPU load metric.

## Changed modules

- `trial-v043.mjs`: twice the speed, matched steering authority.
- `smooth-track-v043.mjs`: continuous indexed roadway deck.
- `frame-pacing-v043.mjs`: deterministic fixed-step scheduler, visual interpolation, frame diagnostics and adaptive HDR ratio.
- `neon-v043.mjs`: unchanged original HDR renderer with an opt-in internal render-target DPR adjustment.
- `game-v043.mjs`: active 0.4.3 game, road geometry and animation/render integration.
- `index.html`, `style-v043.css`: active version and label.
- `speed-v043.test.mjs`: geometry, pacing, speed scaling, camera/ship integration, adaptive quality and manual-pilot full-course tests.
- Existing versioned 0.4.2 and earlier files remain available.

## What to test on a phone

Play at least 2–3 full rounds. Check whether the transverse stripes on the banked road are gone, whether the ship/camera movement is smoother, and whether 2× speed feels good or needs compensation through wider tracks/longer curves. Export `skyshift-handling-v043-audit.json` to see FPS, p95 frame time, internal HDR resolution changes, off-road seconds and steer reversals.

Automated tests cannot prove that a device runs at 60fps or that the change feels right. If the graphics are still slow, the new separate frame/render metrics can help determine whether more targeted GPU optimization is needed.
