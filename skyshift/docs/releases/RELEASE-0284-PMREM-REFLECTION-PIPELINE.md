# SKYSHIFT 0.28.4 — PMREM Reflection Pipeline 1.0

## Source of truth / why now
User approved trying PMREM after shared Vault geometry (0.28.1), physical road and ship lighting (0.28.2) and clean boost pads (0.28.3). The earlier before/after PMREM illustration was generated imagery, **not a real render or a guarantee**. Do not tune towards a globally brighter scene merely to imitate it.

Three.js r180 supports `PMREMGenerator.fromScene(scene, sigma, near, far, {size,position})`. The generated CubeUV radiance texture adds a genuine roughness-filtered image-based reflection to MeshPhysical/Standard materials. It does NOT independently generate new direct sources, SSR, dynamic moving reflections, bloom or ship illumination.

## Pass 1: actual environment, controlled IBL
- Gate **only** NEON VAULT 0.28.4; `?pmrem=off` restores the actual prior version on the same path. Skyline and Aurora are unchanged.
- Capture **one real static PMREM** at 110 m from the actual pre-existing Skyline-shaped VAULT scene and its actual neon fixture geometry. Cube capture is near=.4 m/far=55 m at 12 m above road, with temporarily black background, no fog, the ship hidden and external neutral directional/hemisphere lights temporarily suppressed. Everything is restored in finally, including camera, road, ship visibility and world lights.
- High probe 256 px, 4GB 128 px; one startup capture, **zero frame-loop captures**. Probe source is a local slice of the 3400m tunnel and is reused along the race (not viewpoint-specific). Pass 2 can explore spatially updated probes **only after** memory and real-device performance tests.
- Assign the generated filtered environment texture only to the ORIGINAL ten sections of native MeshPhysical metallic coats and to genuine PBR hull materials (also attached on craft swaps and async craft art).
- The tunnel's original coats are transparent + additive. They **must be included** because they are the actual physical metal highlights; Basic graphite substrates and Basic neon emissive strips are excluded.
- Preserve exact local cyan/amber GGX sources, 0.28.2 road specular response, 0.28.3 boost arrows, SKYLINE's shader overrides, 120Hz physics, GRIP, camera, zone wave and postprocessing. **No** global `scene.environment`, no environment on the road/rail/boost deck, no new point lights or meshes.
- Conservative per-material `envMapIntensity`: tunnel .40 / ship .38 High, tunnel .25 / ship .24 4GB. Real A/B controls intensity 0–1 without rebuilding shaders, and dispose restores previous envMaps/intensities and releases the PMREM render target.

## QA requirements
- Fast Node tests: correct release selection, actual single generator invocation, capture lighting/visibility restoration, original transparent physical coat binding, eligible ship attachment, in-place intensity A/B, resource disposal and non-Vault isolation.
- **Actual Chromium/WebGL**, not generated images, at High 110/1840/3230m, 4GB 110/1840m, historical Vault 0.28.3, Skyline 0.26.5 and Aurora.
- Detect actual native PMREM target and frame pixel differences in walls/ship; ensure white exterior spill and broad road brightness do not return. A/B must be an identical camera frame with no physics advance.
- Do not merge if runtime/source cannot compile, PMREM silently falls back, visual change is absent, or mobile proof fails. Extra attention to startup delay, texture count and mobile frame rate when user obtains their new device.

## URLs
- Proposed: `https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.4`
- Same version without PMREM: `?track=vault&v=0.28.4&pmrem=off`
- Historical true baseline: `?track=vault&v=0.28.3`
- Exact-frame QA: append `&pmremSmoke=1&trackRepairSmoke=1`, then `window.__skyshiftPmremAudit()` and `window.__skyshiftPmremFrameProof()`

## Technical limitations
One stationary environment probe cannot give physically correct parallax or spatially varying reflections over all 3400 meters of winding tunnel. This is a justified **evaluation pass**, not a claim that the generated target picture will appear automatically. Keep the hard neon contrast, local fixture lights and dark PBR road. Only expand to probes/atlas updates if visually worthwhile and within measured High/4GB performance budget.
