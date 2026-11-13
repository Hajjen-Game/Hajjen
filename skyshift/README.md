# SKYSHIFT 0.4.7 – Aero-Barrier Architecture & Premium Trackside Design

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

**Optional Flight Lab:** https://hajjen-game.github.io/Hajjen/skyshift/?flightlab=1

## Visual design objective

The 0.4.6 screenshot feedback was positive on the smoother ribbon course, but the rails looked like thick colored luminous tubes. This pass replaces those rails with deliberately faceted metal architecture: a continuous road-side sweep, angled graphite wall, broad flat cap, distinct recessed channel, very thin inset LED, and sparse direction chevrons concentrated in the bends. The surface is restrained rather than busy. The art direction is informed by the structural design language of futuristic racing tracks but is original to SKYSHIFT.

## Geometry / rendering

- `aero-barrier-v047.mjs` replaces `identity-v046.mjs` on the active page. The old module and build remain available for rollback.
- **Eight-vertex angular cross-section** (was 5), with a 1.36m gradual road shoulder, sharp armored inner face, chamfered corners and broad flat cap. Height remains **0.78m**.
- **A dark recessed channel** is laid along the cap, with an **inset LED 0.035m wide** instead of the large continuously glowing rail profile.
- Panels include graphite seam engravings every **16m**, restrained low-side latch cuts, and large double-chevron inlays through appreciable curves (rather than equal chevron density everywhere).
- The accent material is isolated from the dark metal and seams: `updateAccent(color)` recolors only the small LED and chevron/shoulder inlays. No animated zone transition is introduced in 0.4.7.
- **Three batched draw calls**: indexed shared-vertex structural body, dark inset grooves/panel seams, and color-reactive light inlays. The redundant old underside trim from `game-v046.mjs` is removed to offset the additional batch.
- All mesh data is generated once at build time. This pass adds no particle effects, new postprocessing passes, or dynamic lights; the angled body is slightly more geometrically detailed than 0.4.6 and should be tested on device.

## Handling and safety

- Uses the exact **`trial-v046.mjs` collision constraints**. Pilot-owned position/heading, 44–47m/s speed, guardrail contact limits, banked/curvature-continuous course, 120Hz simulation, and non-magnetic containment remain unchanged.
- Keeps the 0.4.5 cinematic camera and 0.4.4 bank/hover response.
- `game-v047.mjs` exports `skyshift-track-v047-audit.json` including panel counts, accent width, body/detail triangle counts, FPS percentiles, and prior guardrail contact metrics.

## QA

- `aero-barrier-v047.test.mjs` verifies angular profile, seamless bends, geometry budget, curve-only chevron placement, separation of color-reactive inlays from non-reactive metal, and unchanged piloting/collision behavior.
- Existing historical tests continue to validate archived builds, with active-page assertions updated to 0.4.7.
- `.github/workflows/skyshift-tests.yml` includes the new files and full regression suite.

**Playtest priorities on iPhone:** does the rail now read as a low, integrated METAL safety wall rather than a pipe? Can you still see the corner through the new faceted profile? Is the cap line thin enough? Are panel seams and chevrons elegant rather than flashy or obstacle-like? Compare frame-time telemetry to 0.4.6. Camera and physics have not been changed.

---

## Previous release — 0.4.6

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

This pass targets the user's screenshots of visible angular transitions and their request for genuinely protective, visually elegant Wipeout-like raised edge rails and carefully restrained surface design before implementing spectacular future color transitions.

## 1. Curve flow and surface continuity

- `trial-v046.mjs`: replace linear curvature ramps with analytic **quintic smoothstep** curvature ramps. The entering and exiting curvature now has zero first and second derivatives at joins; integrated heading stays continuous. Straights and circular-arc plateaus are preserved.
- Lengthen each curve entry/exit from 20m to **30m**, keeping the same overall 510m route and maximum turn curvature. This softens the visual entry/exit; it slightly reduces each curve's total deflection.
- `smooth-track-v046.mjs`: one indexed continuous top ribbon at **0.30m longitudinal spacing**, **7 lateral columns** (was 0.45m and 5). The banked collision surface, edges and camera all follow the **same** new heading/bank model.
- The centerline remains simple, and the track avoids noisy tiling or many small false curves.

## 2. Real raised guardrails

- `identity-v046.mjs`: add two **0.78m high** sculpted edge rails with shared longitudinal vertices, dark titanium-toned material, a restrained lit cap and chevron precision inlays.
- Physically contain the ship on either side: world position is clipped at the collision boundary only when the craft strikes the rail. The boundary includes the approximate craft half-width and rail shoulder. This prevents accidental off-track falls and protects the previous steering feel.
- Rail collision **never changes pilot yaw, steering input or forward speed**. There is no invisible road centering or constant auto-steering. A player intentionally steering into a guardrail may continue sliding along it, rather than turning automatically.
- Flight logs include **rail contacts, contact seconds and maximum attempted penetration**. Only the new contact event is emitted, avoiding per-frame log noise.

## 3. Surface identity and color-zone groundwork

- One batched mesh for continuous raised edge bodies; one batched mesh for lit caps, low-profile shoulder markings and chevrons. Broad road center remains uncluttered.
- Small racing inlays on the rail face and interrupted shoulder stripes support speed reading. Accents have a common color-controlled material, so future color transitions can recolor them coherently.
- The 0.4.6 build **does not yet contain animated zone color switching**, as that is a separate feature. Future wave anchors are exposed from the track identity data.
- Three old free-floating neon rim passes have been removed; new body/markings require two batches. Extra geometry is precomputed once rather than regenerated each frame.

## 4. Protected flight handling and QA

- The trusted 0.4.5 cinematic camera, 0.4.4 motion response and 44–47m/s 120Hz steering dynamics are retained unchanged.
- Added `track-flow-v046.test.mjs` for C2 curvature joins, no seam positions/banking, shared vertices, guardrail collision/non-magnetic control, high-speed containment and future-color anchors.
- Historical version logic is retained and all affected active-page expectations now refer to 0.4.6.
- `.github/workflows/skyshift-tests.yml` runs the complete regression suite and syntax checks for the new modules.
- Export `skyshift-track-v046-audit.json`. On iPhone, inspect both corner transitions, guardrail feel and pattern readability, and compare average FPS / frame-time percentiles to 0.4.5.

**Known limitation:** This remains the 510m handling track, not a production race circuit. Guardrail impacts are protective constraints, not full rigid-body vehicle collision/bounce physics. Final judgment of visual quality and handling requires a real-device playtest.

---

## Previous release — 0.4.5

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

**Optional flight tuning:** https://hajjen-game.github.io/Hajjen/skyshift/?flightlab=1

## Intent

Building on the user-approved SKYSHIFT 0.4.4 handling feel, this release improves perspective, speed readability and lightweight engine/body movement. The underlying 0.4.3 course and manual flight physics are deliberately unchanged; visuals must never magnetize the craft toward the track. The user's 0.4.4 Samsung log showed 29fps average and 66.6ms p95 frame time despite 120Hz simulation stability, so this pass avoids new dynamic lights, postprocessing layers, or meshes per frame.

## Changes

- **Closer / lower chase camera:** default distance **13.8m** (15.2m previously), height **7.8m** (9.5m previously); look-ahead **36m**. Keep the fixed-step flight and existing small horizon roll.
- **Bounded corner anticipation:** camera looks toward upcoming curvature sampled **40m** ahead; capped to **±0.12 rad (~6.9°)** with frame-rate-independent smoothing. It only biases the look target, **not** camera world position, ship yaw, lateral position, collision or speed. On straight sections the preview is zero.
- **Controlled motion weight:** existing hover/bank from 0.4.4 remains. Small cosmetic nose yaw is capped at **±1.9°** and is independent of authoritative world yaw.
- **Engine/load response:** reuse the existing engine light and plume meshes, vary their intensity and scale subtly based on yaw rate and steering; adjust the two existing engine trails in world-space to match visual hover and banking. No new draw calls required for these changes.
- **Allocation cleanup:** reuse trail bounding sphere and impact material color instead of allocating these every frame.
- **Frame-rate resilience:** smooth time constants use closed-form exponential updates; no new simulation forces.
- **Optional live tuning panel:** use `?flightlab=1` to tune camera height/distance, corner preview and engine weight alongside existing flight sliders. The regular UI remains uncluttered.
- **Flight audit:** export `skyshift-flight-v045-audit.json`, including preview, max cosmetic yaw, peak engine response and configured camera values.

## Changed files

- `cinematic-v045.mjs`: pure camera anticipation, chase pose, bounded weight curves and diagnostics.
- `premium-v045.mjs`: reuse original trails and materials with more faithful exhaust positions.
- `game-v045.mjs`: the active 0.4.5 game, same `trial-v043.mjs` handling and `flight-motion-v044.mjs` banking.
- `cinematic-v045.test.mjs`: turn preview, no-assist invariants, camera dimensions, capped engine/nose motion, FPS invariance and active site checks.
- `index.html`: current release.
- `.github/workflows/skyshift-tests.yml`: include new module syntax and test suite.
- Historical test files updated only where they assert the active HTML asset version.

## Phone playtest

Compare 0.4.5 and 0.4.4 on the iPhone, especially the entry to each long bend. Confirm that the craft is larger and the camera looks earlier into the curve without exaggerated swinging or undesired steering correction; engine response should remain subtle. Capture a short video and the 0.4.5 flight audit. This build intentionally leaves the 510m calibration track in place—jumps, weapon systems and full-sized courses are separate future work.

---

## Previous release — 0.4.4

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
