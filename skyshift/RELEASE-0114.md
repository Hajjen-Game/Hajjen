# SKYSHIFT 0.11.4 – Smart Fidelity Refinement

## Decision based on Samsung Galaxy A51 A/B
The owner reported that Fidelity ON in 0.11.3 **looked better**, but became noticeably laggy after the first lap. The two logs on the same device (both version 0.11.3, fixed DPR 1.25, optimized bloom 0.78) showed 41.51 FPS OFF vs 29.043 FPS ON, P95 frame time 49.9 ms vs 83.3 ms, and dropped simulation time 64.9 ms vs 1086.8 ms. ON was tested after OFF, so heat / CPU/GPU throttling could also contribute; GPU timer extension was unsupported. **These are the 0.11.3 numbers, not validated gains of 0.11.4.**

## Shader refinement
0.11.3 calculated near-field modulo distance, one spatial smoothstep and two lateral smoothsteps in the *fragment shader* for every pixel of the roadway. 0.11.4 moves that exact spatial mask calculation to the *vertex shader*, using the deck's pre-existing 0.8 m road tessellation and GPU varying interpolation. The pixel shader now multiplies one interpolated varying by the same smoothed intensity and keeps the original 0.11.3 guide tint and roughness response. Preserved:
- Near fade: 26–74 m, 3.4 km periodic track wrap, same longitudinal and lateral mask bounds.
- Same guide brightening factor `0.085`, roughness reduction `0.055`, bloom, SMAA, white-core spectral wave.
- Same shadow-tunnel, road-blackout and emission ordering.
- No added road geometry, passes, particles, textures, lights or extra draw calls.
- No changes to driving, GRIP, 120 Hz physics, ship/camera motion, 3 laps, track, HUD or collisions.

The value of the vertex mask is identical to 0.11.3 **at each existing deck vertex**; interior fragments interpolate the mask instead of recomputing the exact per-pixel distance, so its shape can soften slightly between lateral vertices. The improvement is a GPU work reduction **by design**, not a measured performance gain until tested on the target device.

## Device profiles and exact A/B
- Normal / premium class (not low memory): optimized vertex-space sheen ON and default bloom 0.88.
- Normal / low-memory (4 GB A51): original 0.11.2 road shader, optimized bloom 0.78 and adaptive internal resolution; no overhead from Fidelity.
- `fidelity-off`: original road shader, no Fidelity.
- `fidelity-legacy`: **exact 0.11.3 premium fragment shader**, to provide a fair direct benchmark.
- `fidelity-on`: **new 0.11.4 vertex-space Fidelity**, forced on any device.
All three tests use fixed quality, the same device-specific bloom resolution, the same DPR and the same rendered scene. These modes *do not* automatically downscale Fidelity by temperature, because that would invalidate the controlled A/B result.

## Links
- Normal game: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.11.4
- Refined Fidelity 0.11.4: https://hajjen-game.github.io/Hajjen/skyshift/?perf=1&perfPreset=fidelity-on
- Original Fidelity 0.11.3 shader: https://hajjen-game.github.io/Hajjen/skyshift/?perf=1&perfPreset=fidelity-legacy
- Fidelity OFF: https://hajjen-game.github.io/Hajjen/skyshift/?perf=1&perfPreset=fidelity-off

## Verification
- `visual-fidelity-v0114.test.mjs`: checks profiles, pixel-vs-vertex mask equivalence at physical vertices and lap seam, that optimized pixel shader has no extra spatial modulo/smoothstep, legacy GLSL equality, preservation of the old shader on low memory, tunnel/blackout composition, exact existing material gains, bounded director response, A/B presets, no physics changes.
- `browser-smoke-v0114.mjs`: ensures actual production WebGL selects the expected shader family and retains original flight/hangar/wake/sparks/fullscreen protections. Saves screenshot artifact.
- `rail-scrape-sparks-v0114.test.mjs`: active production versions and spark regression.
- GitHub Actions runs existing deterministic physics checks and the new shader tests. Do not claim a measured FPS uplift until the browser / device results are confirmed.

## What to look for
On the A51 the normal game must stay as fast as the previous OFF mode. When comparing forced `fidelity-legacy` against `fidelity-on`, both should show a similar premium finish, with the newer mode expected to require less per-pixel shader work. If performance still collapses after lap one, repeat in reverse order or after cooling to distinguish shader impact from temperature / background processes.
