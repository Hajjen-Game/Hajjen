# SKYSHIFT 0.26.2 — Premium Metal Surface Library · Pass 2/4

## Target
Dark, dense brushed titanium with direction-aware fine grain, distinct satin panels and more polished ribs, plus cold cyan and warm amber highlights that continue to follow ONLY the authored tunnel fixtures. Preserve original dark graphite substrate, road, ship, native spectral zone wave, GRIP and mobile frame pacing.

## Implementation
- Retain 0.26.0 native MeshPhysicalMaterial GGX/Fresnel coats and 0.26.1 finite-area cyan and amber emitter samples intact.
- One procedurally generated 256² RGBA packed atlas (128² on 4GB): R/B micro-normal perturbation, G roughness modulation, A restrained machined scoring.
- Mipmapping and 2× anisotropic **texture filtering** on high graphics to avoid crawling microfibers at racing speed. This is **not** a claim of a native anisotropic reflection BRDF.
- Texture sampling uses the existing banked tunnel's local section coordinates + track distance; not world-space sunlight or camera-facing fake shine.
- On high graphics, small physically shaped micro-normal perturbations use screen-space derivatives of the existing view-space surface, respecting the underlying true metal GGX.
- On 4GB profile, keep the roughness atlas but skip derivative micro-normal work and use 128² filtered texture.
- Satin flat panels and lightly polished ribs have distinct roughness profiles. The actual face geometry is preserved.
- Crucial visual follow-up: apply the SAME packed atlas to original solar-isolated graphite MeshBasicMaterial substrate across panel/rib/shell/conduit batches, using the existing cavity and authored-neon masks. The initial coat-only proof passed technically but was too subtle at full-screen scale. This change brings material definition to the visible dark panel body rather than only a translucent topcoat.
- Original solar and ambient loops stay disabled on these physical metal coats. No PMREM, SSR, HDRI, new lights, draw calls, or road/ship material edits.
- A/B: `?v=0.26.2&premiumMetal=classic` restores the 0.26.1 physical metal response. `?v=0.26.2&premiumMetalSmoke=1&premiumMetalFrameProof=1&trackRepairSmoke=1&waveSmoke=1` provides identical frame GPU checks.

## Acceptance gate
- Real Chromium/WebGL screenshots on high and 4GB demonstrate meaningful panel/rib detail versus true 0.26.1.
- Road image pixels remain unchanged; sunlight/neutral white spill does not return; cyan/amber glow remains authored and localized.
- Physics/GRIP/camera/native zone wave regressions pass.
- If visual impact is too subtle, do not merge until calibrated against actual screenshots.
- Pass 3 road reflections and Pass 4 bloom/color-grade remain explicitly out of scope.

## Source basis
- Three.js MeshStandardMaterial and MeshPhysicalMaterial docs on GGX, roughness and normal maps.
- Three.js official documentation on non-color data textures, anisotropy/performance tradeoffs.
- Existing SKYSHIFT 0.26.0 P2 / 0.26.1 P1 material shader implementation.
