# SKYSHIFT 0.26.4.1 — Unified Light Response & Dark Titanium Rebalance

## Why this pass exists
The 0.26.4 actual native WebGL image is structurally much nearer the supplied reference, but multiple mid/upper walls still read too gray/light, while roof cyan, warm arch strips and short straight-only cyan rail lamps do not appear equally grounded in their surrounding metallic reflections.

The goal reference is **an illustrative image, not a game's physical screenshot**. The actual 0.26.4 image provides the testable baseline. The user wants darker **metal substrate**, stronger yet differently colored **actual source response**, and consistent near-fixture specular falloff without reintroducing white outdoor solar spill.

## Implementation scope (two complementary shader changes)
1. **Dark Titanium Rebalance**: Apply a small source-aware graphite darkening in the existing `MeshBasicMaterial` sun-isolated tunnel substrate, *after* the current 0.26.2 packed micro-surface atlas. Preserve brushed micrograin, bevel and deep panel grooves. Role coefficients panel .81, rib .87, shell .91, conduit .94, with local glow/bevel relief retained. Crucially do **not** darken the road itself, ship or luminous sources.
2. **Unified Native GGX Response**: On the *existing* `MeshPhysicalMaterial` panel and rib coats, scale the pre-existing 0.26.0 physical cold/amber lamps and 0.26.1 finite source samples inside the native `RE_Direct` pipeline. No replacement PBR, no extra sample, no new environment map, no simulated sun. Small per-channel enhancements retain cooler cyan and warm orange character without making all lights equally bright.
3. **Stable cyan wall cove**: small 1.095 color gain to the **existing** 0.26.0 cyan wall cove mesh on high graphics, ~1.045 on 4 GB. Never touch the native white-core integrated neon, yellow corner chevrons or straight-only 0.26.3.3 lower cyan inlays.
4. **Actual scene comparison**: `?v=0.26.4.1&unifiedLight=classic` keeps all prior 0.26.4 postprocess and native zone wave, but returns exactly the original metal shaders' numerical output. Same-frame real Chromium WebGL 8 GB / simulated 4 GB Gold and Violet screenshots verify darker yet defined graphite, real colored reflections, unaltered road and no white solar spill.

## Performance / protected invariants
- Extra new lights / colliders / world meshes / draw calls / textures / shader sampling / fullscreen passes: **ZERO**.
- Reuse original 0.26.2 micro-normal/roughness atlas and existing 0.26.1 physical GGX local-lamp data. No SSR, PMREM, ambient probe or global exposure increase.
- Original `UnrealBloomPass` 0.26.4 calibration, ACES, SMAA and the optional high-only cohesion shader are unchanged.
- 4 GB retains reduced 0.26.1 sampling and existing mobile graphics settings. No extra full-screen pass.
- The **straight-only cyan** edge lamps are still absent from turns with yellow arrow chevrons.
- Connected orange arch-foot/floor bands, dark road, ship movement, GRIP, camera, physics, sunlight containment and native spectral wave remain intact.

## Release gates
- Unit tests verify shader patch anchors, 2 original physical samples, 3/2 high finite samples vs 2/1 on mobile, dark tint role order, zero-effect comparison, and full disposal of the original shader chain.
- Real screenshots check central road luminance, dark-black percentage, white-core spill and material response at a straight, transition, turn, Violet zone and mobile Gold.
- Old 0.26.0–0.26.4 native material, solar containment, ship, lane, GPU and gameplay regression suites must stay green.
- Do not merge solely because tests pass if darkening destroys brushed metal readability or reflection response looks flat compared with 0.26.4.
