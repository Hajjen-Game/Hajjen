# SKYSHIFT 0.3.2 – Refined Neon Balance

### Corrective visual pass after 0.3.1

The 0.3.1 HDR bloom was too strong: oversized glows on rails and beacons, a nearly blown-out ship, and reduced readability of platform edges. **0.3.2 fixes light balance, not resolution or gameplay.**

### Play

https://hajjen-game.github.io/Hajjen/skyshift/

### Changes

- **Controlled HDR bloom:** UnrealBloomPass strength 1.18 → 0.43, radius 0.48 → 0.21, threshold 1.06 → 1.40. OutputPass and ACES tone mapping remain active.
- **Crisp neon rails:** preserve three-layer look but halve the physical width of the halo, reduce opacity and core intensity; dark road material remains a contrast anchor.
- **Subtle beacons:** the intrusive tall white beacons are smaller, thinner, and significantly less luminous. Three-layer neon remains.
- **Readable ship:** toned-down thrusters, emissive strips and local engine lighting. Metallic body and clearcoat glass remain.
- **Gates and signage:** lighter bloom on arches and in-world text; no neon rectangles should overpower the route.
- **Flight FX:** less energetic engine trails and landing shards; still responsive.
- **Lighting:** reduced scene exposure, key light and rim fill to keep surface shapes legible.
- **Same quality tier:** WebGL HDR, postprocessing and native device pixel ratio up to 2. No Galaxy A51-driven downgrades.

### Code

- `neon-balance-v032.mjs` is a pure JavaScript lighting-tuning module. It validates contrast hierarchy, halo spread and intensity budgets.
- `neon-v032.mjs` keeps the high-quality compositor and shares the tuning values with world materials.
- `game-v032.mjs` modifies only renderer materials, lighting, rail/beacon widths, scene exposure and the active visual modules; the authored trial and collision logic are unchanged.
- `premium-v032.mjs` limits the brightness of engine trails and landing effects.
- `neon-v032.test.mjs` checks tuning relationships, bounds, visual component integration, import map and unchanged game systems.
- `game-v031.mjs`, `neon-v031.mjs` and `premium-v031.mjs` remain for diagnosis and rollback.

### Verification

Run `node --test skyshift/neon-v032.test.mjs`. GitHub Actions runs all historical deterministic game tests too.

Automated tests cannot guarantee the visual result in actual browsers. Compare v0.3.2 screenshots at the start, at the first gap, and in Skybreak and Final Velocity. Assess ship silhouette, luminous core sharpness and whether the glow respects the missing-platform edges.

### Unchanged

First Flight 2.0 length 1300 m, six mandatory gaps, risk route, checkpoints, zone transitions, fullscreen and exported run metrics. No endless mode or new gameplay content.

### Platform

Modern mobile GPUs and desktop browsers are the target; Galaxy A51 is not the graphics-quality reference. Three.js modules are version-pinned to 0.180.0 via the HTML import map. No changes to other projects in the repository.