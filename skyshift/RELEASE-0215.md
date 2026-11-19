# SKYSHIFT 0.21.5 — Premium Road Surface

## Why
The mobile gameplay screenshot shows a sealed neon tunnel with more coherent wall/ceiling geometry than earlier versions, but the original single-PBR road deck looks nearly black and featureless. Past attempts to add world key/specular shine caused bright white sunlight leaks. The 0.21.5 pass must create material depth without reopening them or obscuring high-speed racing guides.

## Road-only material treatment
- Keep the original **one indexed MeshStandard road surface** and its original lane, boost and 9-color spectral wave shaders; no road geometry reauthoring, new collision, mesh, decal, normal-map texture, light or screen-space renderer pass.
- Shade dark, irregularly staggered **19 m graphite material bays** with very soft recessed divisions, slower-than-screen longitudinal grain and subtle low-frequency slate variation. No large high-contrast squares or dense repeated stripes.
- Do **not** tint/dim the original luminous guide markings or boost arrows; alter only the base `road` value **before** original guide and wave overlays are assembled.
- Within the existing 0–368 m tunnel interior only, shift PBR roughness to around 0.67–0.725 and metalness down to around 0.22–0.28. This suppresses neutral key/specular sheen rather than adding it. Fade changes out smoothly from 340–368 m.
- Add very weak, **native zoneAccent-colored** reflected light around real tunnel neon portal positions, only at road shoulders. CPU-independent portal proximity is computed with cheap min/abs and one Gaussian per shaded pixel, not 10 Gaussian evaluations. No neutral-white ground wash.
- Preserve the original white-core wave, filaments, lane emission, guide/readability, road-solar spill containment, hull containment, rail containment, global bloom and kinetic camera.
- The same shader is used on mobile; no extra draw calls, textures or materials. Purely visual.
- The pass is enabled by default only on Skyline, when the sealed road solar light correction is active. Older URLs remain unchanged.

## Compare/QA
- Normal: `/skyshift/?v=0.21.5`
- Prior 0.21.4 road: `/skyshift/?v=0.21.5&premiumRoad=classic`
- Previous road sun A/B: `/skyshift/?v=0.21.5&roadSolar=classic` (intentionally disables the new premium finish, to maintain original test isolation)
- `?premiumRoadSmoke=1&premiumRoadFrameProof=1&trackRepairSmoke=1` enables a CI-only hook to render exactly the same camera/ship/zone state three times: old road, premium road and road absent for a road-only pixel mask.
- Automated browser tests cover cyan (165m), Solar Gold (273m), Jade (165m) and simulated 4GB Solar Gold.
- Tests reject road invisibility, pixel changes escaping the roadway, restoration of excessive near-white pixels, shader compile failures, failed mobile startup or broken previous A/B.
- The full 0.21.2.6/0.21.4 regression suites remain part of CI.

## Next visual review
The intention is restrained, photogenic material depth, **not more neon lines**. If mobile screenshots show the new surface is too subtle, adjust the already isolated road-only material controls after an A/B capture rather than increasing global lighting.
