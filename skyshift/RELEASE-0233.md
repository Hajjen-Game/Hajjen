# SKYSHIFT 0.23.3 — Unified Tunnel Materials

## Goal
Extend 0.23.0 physical metal, 0.23.1 real sculpted panels, and 0.23.2 localized neon reflection coherently through the full original **0–368 m** sealed tunnel. The partial material gallery (78–304 m) and raised geometry study (98–284 m) created visible wall/roof pattern discontinuities.

## Implemented
- A new installer `unified-tunnel-materials-v0233.mjs` composes all **existing 0.23** passes, then extends their exact metal and light study masks across the full 368 m tunnel. The previous passes and their `?v=0.23.2` behavior remain available.
- Real 0.58 m sculpted panel geometry covers the full tunnel, following its original banked, curved profile. Wall, crown, opening cutouts, 22 m panel rhythm and intact portal lighting use the same original geometry builder.
- Native 0.22 neon color and luminance are kept as a floor before final 0.23 metal shading. This is confined to tunnel materials, preventing the 0.23 reference-shader from dimming the existing glow.
- On 4 GB mobile, the same panel silhouette is built with fewer profile facets/trim strips and a single original panel batch, with no new analytic frame attributes. Existing low-memory materials still use simplified shader paths.
- Existing sun-isolated MeshBasicMaterial, emission cores, wall/roof spectrum wave, GRIP, rail collisions, ship, camera, road shaders and postprocessing remain unchanged.
- No extra scene meshes, draw calls, lights, textures or render passes.

## Comparison and proof
- Release: `/skyshift/?v=0.23.3`
- Exact previous 0.23.2 render: `/skyshift/?v=0.23.3&unifiedTunnel=classic` (or `?v=0.23.2`).
- Same-frame browser hooks: `?unifiedTunnelSmoke=1&unifiedTunnelFrameProof=1&trackRepairSmoke=1&waveSmoke=1`.
- Test both 8 GB and simulated 4 GB profiles at early / center / late tunnel sections, multiple wave colors. Check shader compilation, no new neutral-white sunlight, unchanged driving corridor and neon core visibility.
- Visual assessment remains separate from code-test success; the concept image is an art direction, not an identical render claim.

## Next
Continue toward concept-image material richness with carefully bounded light and surface passes only **after** verifying this full-tunnel baseline on iPhone.
