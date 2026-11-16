# SKYSHIFT 0.11.3 — Smart Visual Fidelity

## Intent
Spend pixel/postprocess headroom where the player can perceive it rather than by adding more layers of glowing lines or expensive screen-space passes. **This release is a carefully scoped material-quality pass**, not a track, mechanics or camera redesign.

## Baseline
The A51 fixed-DPR A/B logs in the conversation showed `bloomResolutionScale=.78` at ~39 observed FPS vs `1.0` at ~22.7 FPS on SKYSHIFT 0.11.2. Both had DPR 1.25 and the same PBR surface/SMAA/postprocess chain. Thermal order and unsupported GPU timer remain caveats. Those measurements support **retaining** 0.11.1 selective bloom optimization, not restoring expensive full-size bloom.

## What changed
1. `visual-fidelity-v0113.mjs` adds the Smart Visual Fidelity Director, with a premium-only near-field PBR surface treatment: a controlled brightening of **existing** lane guides and a small roughness reduction in the material near the player. The shader is arc-length periodic across the 3400 m three-lap circuit and feathers from 26 m to 74 m to prevent hard popping at corners and the lap seam. Motion intensity tracks true speed, boost and existing zone resonance via an exponential smoothing response; it never controls physics, steering, camera, wave timing or track.
2. Low-memory devices retain the **exact 0.11.2 original track GLSL**, bloom scale 0.78 and dynamic internal DPR. On other devices default bloom remains 0.88, with premium road treatment.
3. The new shader is a decorator of the existing `premium-track-v0901` material rather than a fork. The Shadow Tunnel and Blackout decorators still apply **after** it; tunnel darkness and road emissive sequence remain intact.
4. No added meshes, GPU passes, textures, triangles, particles, lights or extra draw calls.
5. `performance-audit-v0113.mjs` supports `fidelity-on` and `fidelity-off` A/B modes at the same fixed DPR, independent of the existing `bloom-full` test.
6. `game-v0113.mjs` includes `visual.smartVisualFidelity` in exported audit and `visualFidelity` in `window.__skyshiftPerfProbe()`.
7. `visual-fidelity-v0113.test.mjs` verifies the complete original shader is preserved on low memory, GLSL injection and uniforms, coexistence with both 0.9.2 tunnel shader decorators, profile selection, bounded and frame-rate-independent response, strict shader anchors, and bloom preservation.
8. `browser-smoke-v0113.mjs` checks the profile in the actual Chrome production WebGL scene and captures `skyshift-v0113-smart-fidelity.png` for visual review.

## Test links
**Normal game**: `https://hajjen-game.github.io/Hajjen/skyshift/?v=0.11.3`

**Fixed-quality A/B on the same device**:
- Smart fidelity OFF: `https://hajjen-game.github.io/Hajjen/skyshift/?perf=1&perfPreset=fidelity-off`
- Smart fidelity ON: `https://hajjen-game.github.io/Hajjen/skyshift/?perf=1&perfPreset=fidelity-on`
- Existing bloom optimized baseline: `https://hajjen-game.github.io/Hajjen/skyshift/?perf=1&perfPreset=baseline`
- Existing full bloom: `https://hajjen-game.github.io/Hajjen/skyshift/?perf=1&perfPreset=bloom-full`

Both fidelity A/B modes preserve the selected device's existing fixed DPR, SMAA and default optimized bloom. `fidelity-on` intentionally forces the premium road shader on low-memory phones for inspection and may cost performance; do not use as a default quality policy for those devices.

## Verification
The pure helper/shader-composition calculations were checked against real source fragments using in-tool JavaScript. The full hosted Chrome/WebGL CI workflow and real-device FPS gains require independent confirmation; a successful deterministic math test does not prove a prettier result or higher device FPS.

## Non-goals
No loss of visual features or quality ceilings on flagship/iPhone-class devices. No changes to GRIP, normal steering, ship handling, zone colors, white-core spectral wave, shield, 3 laps, camera interpolation or game physics. Deliberately avoids extra repetitive lines and full-screen glow.
