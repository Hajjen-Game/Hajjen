# SKYSHIFT 0.28.9.4 — Unified Light Sources & Road Layer Cleanup

## Scope: priorities 3 + 4 from the user's lighting audit

**Priority 3 — understand / remove duplicated old road response.** The original `neon-interior-v0212.mjs` adds `Tunnel / NEON_ROAD_RESPONSE` (one transparent additive mesh per Skyline source module, ten in Vault on High; absent on 4GB). Previous 0.28.9.3 A/B showed it is not the *main* source of the wide road wash, but it is still a second source-independent road color layer. Vault 0.28.9.4 hides only those ten old meshes on High. The original meshes/materials are retained for exact A/B and full restoration; the native PBR road and existing arch-to-road local GGX are untouched. `?roadLayers=classic` restores them. Other tracks and previous Vault releases are unchanged.

**Priority 4 — one physical source registry.** `unified-tunnel-light-sources-v02894.mjs` is the canonical palette/source sampler based on the original `0.28.1` shared Skyline banked module adapter:
- Lower portal arch: original 0.21.1 j6 and 0.28.9.3 local pulse, unchanged numerically.
- Cyan upper-wall/roof fixture: the same original panel-facet **j11** inset used by 0.28.9.2 geometry, including actual ~9m into each portal bay.
- Warm wall practical: the original **j9** panel seam inset, center ~3.75m after each portal, not the old floating T-shaped source.
- Cyan lower inlay: 0.28.9.1 straight-only mask and the approved 0.26.3.2 banked lower rail lip location, without reintroducing bend fixtures.
- Shared `zone-wave-v060` 9-color palette and the same 3400m moving front; ceiling materials and arch road uniforms call the same mapping.

The new physical ceiling-to-road light transport **wraps the existing** `MeshStandardMaterial` `RE_Direct` path after 0.28.9.3. On both High and 4GB, evaluate restrained nearest-side j11 cove source GGX. The j9 warm wall practical remains authored through the same position and palette registry, with its existing legacy amber road response intact; do not add a second costly GPU source tap. No new world lights, road geometry, material replacements, mesh draws, shadow maps, global wetness, SSR, bloom passes, or tone-mapping adjustments. New sources are local and pre-weighted by per-vertex distance to the actual fixture, so their color does not smear across the whole track. One packed vec4 vertex attribute (actual j11 world XYZ + source-distance mask) keeps the native road within the WebGL attribute limit, after real Chromium validation found that three extra attributes exhausted shader slots.

## Comparison and rollback
- **Version:** https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.4
- **Return to exact 0.28.9.3 lighting inside the new runtime:** `?track=vault&v=0.28.9.4&unifiedLights=classic`
- **Old transparent road layer restored, still use shared ceiling GGX:** `?track=vault&v=0.28.9.4&roadLayers=classic`
- **New legacy layer cleanup only; ceiling GGX disabled:** `?track=vault&v=0.28.9.4&ceilingRoad=classic`
- Full former release: `?track=vault&v=0.28.9.3`

`?unifiedSourcesSmoke=1` exposes `__skyshiftUnifiedSourcesAudit()` and `__skyshiftUnifiedSourcesFrameProof()` to render identical-frame classic/cleanOnly/sourceOnly/after screenshots. The original `?archOpticsSmoke=1` wave stage setter remains available for pink/cyan comparisons.

## Verification
- Node unit tests: exact 0.28.9.3 unchanged arch positions when using the new registry, exact 0.28.9.2 j11/j9 seam geometry with the same palette, 0.28.9.1 bend/straight masks preserved, ten old additive sources hidden but restorable, one additional packed road vertex attribute maximum, original shader restoration, unchanged game controls.
- Real Chrome/WebGL High and 4GB: raw native before/after, original-road-layer only and new ceiling GGX only, cyan and pink palette, straights and bends, runtime toggle controls, no shader errors and limited source area (not a road-wide filter).
- Historic Skyline artwork, Skyline 0.26.5 and Vault 0.28.9.3 are not visually altered by their existing versioned paths.

## Important visual interpretation
This pass is a light-source/transport **cohesion** step, not a wholesale physical-rendering engine replacement. The new lights approximate local PBR energy; they are not full ray-traced reflections. Assess the actual images against the user's Skyline reference and keep or roll back individual components based on visuals.
