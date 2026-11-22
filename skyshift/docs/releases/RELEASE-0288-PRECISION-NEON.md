# SKYSHIFT 0.28.8 — Precision Neon Emission & Local Metal Response

## Goal and existing source
0.28.7 improved the NEON VAULT L-shaped orange arch-foot fixture, while earlier releases provide the original Skyline 0.26.5 physical tunnel, native GGX fixture integration, 0.28.4 PMREM, 0.28.5 wave and 0.28.6 stable roof finish. This pass refines source definition and local response without creating a new tunnel or swapping postprocessing libraries.

## Implementation (Vault only)
- **Actual cyan/amber cove**: a small, color-preserving source-core emphasis added to the original cove's existing shader, strongest at its already bright pixels.
- **Existing orange 0.28.7 L-foot**: increase color definition of the high-alpha blade, gently reduce low-alpha outer haze; retain one actual connected fixture and graphite mount.
- **Original local GGX**: increase the pre-existing 0.26.1 physically based cyan/warm strip samples only when close to the true source and only where 0.26.5 wall source masks permit. Cyan falls off across 2–9.2m; amber 1.5–7.5m.
- Retain existing 0.28.6 roof roughness and micro-normal stability, 0.28.4 PMREM, 0.28.5 spatial wave, road, boost, ship, physics, GRIP, 120Hz flight, SMAA and UnrealBloom. No additional meshes, lights, textures, passes, BRDF source samples, or draw batches.
- High and 4GB retain their original 5 / 3 local light quadrature samples, with a lower power on 4GB.
- Strict version isolation: NEON VAULT v0.28.8+ only; older Vault, Skyline and Aurora unchanged.

## Comparison and rollback
Current: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.8

Same version with exact prior source-response uniforms:
https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.8&precisionNeon=classic

Previous release:
https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.7

Only the real shared renderer integrates precision-neon-response-v0288.mjs. All original material hooks and cache keys are restored on disposal.

## Real WebGL before/after
The browser QA loads the actual game renderer, starts the race, and teleports to 110, 1840, 3230m High and 1840m 4GB. Its exact-frame A/B helper renders 0.28.7 source-response uniforms and 0.28.8 uniforms without stepping physics, camera, wave, scene, ship or PMREM. The resulting PNG images come from the real game canvas, NOT generated concept art.

A screenshot workflow uploads true before/after proofs and, after successful merge to main, commits them to skyshift/previews for direct GitHub Pages viewing. The pixel metrics reject invisible changes, white ceiling spill, and a broad road wash. Historical Vault v0.28.7 and Skyline v0.26.5 are checked for isolation.

After the screenshot workflow passes:
- Before: https://hajjen-game.github.io/Hajjen/skyshift/previews/v0288-vault-0.28.8-High-1840-before-0287.png
- After: https://hajjen-game.github.io/Hajjen/skyshift/previews/v0288-vault-0.28.8-High-1840-after-0288.png

**These image URLs do not exist until the workflow has completed and published them.** Static images cannot verify in-motion flicker; a manual PC/mobile motion check is still needed.

## Required release gates
- Source tests for native shader anchors, exact original GGX taps, version gates and rollback.
- GitHub fast-core regression (GRIP, physics, metal sources, lighting and solar seals).
- Real Chromium WebGL screenshots and pixel metrics in High and 4GB.
- Publishing verification on GitHub Pages.
