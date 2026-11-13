# SKYSHIFT 0.4.3 – Speed, Smooth Mesh & Frame Pacing

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
