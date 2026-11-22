# SKYSHIFT 0.28.9.2 — Ceiling Fixture Placement & Glow Cohesion

## Origin — the user-marked T / floating white & amber blocks
The screenshot highlights an 0.26.0 original source batch in the real shared Skyline renderer, not random collision decals or the 0.28.9.1 lower edge lights. The source is `makeCoolCoveBatch` in `dual-tone-lighting-v0260.mjs`: two upper cove strips per portal, short perpendicular cyan T accents (High only), and short amber blocks near each original portal. They had fixed `THREE.Color(0x31ddf2)` / `THREE.Color(0xffa35d)` and lay across 0.24.1 raised facets.

The user asks for the lights to sit **between panels**, to participate in the real **zone color wave**, and to have a softer premium glow rather than overexposed white rectangular markers.

## Solution
- This is a surgical **Vault-only** `>=0.28.9.2` adaptation of the original cove mesh, not a second tunnel system. `skyshift/ceiling-fixture-cohesion-v02892.mjs` replaces that mesh's geometry **in place**, preserving one original batch per source module. High 0.26.0's extra disconnected 0.7m perpendicular T bars are removed.
- Cyan upper sources are relocated to the actual **j11 upper-wall / roof facet joint** on the original 0.21.1 shared profile. Amber upper-wall companions use the real **j9 side-wall facet joint**. Both use the existing banked `positionAt` adapter; the 0.82m recessed cove offset and 0.095m seating follow source authoring. Original portal cadence and paired fixture counts remain unchanged.
- Longitudinal core bars get a narrow flush center and **two feathered transparent edges**; no floating quads, no dynamic point lights, no exposure or global bloom change. Short amber bars use enough arc subdivisions to have a genuine bright center instead of fading away at both ends. Same material/draw call count, bounded 4 GB geometry.
- Instead of a static cyan/amber material, `onBeforeCompile` reads the exact original `ZONE_PALETTES[].light` from `zone-wave-v060`, with the original 66m wave feather. Vertex-local `fixtureTrackS02892` maps to global Vault arc by `module.start+sourceS*module.scale`, with the same closed-lap signed front and `zoneWave` update call as the other tunnel lights. Amber companion retains a small 16% warm bias.
- 0.28.6 stability and 0.28.8 emission shader wrappers remain intact; the seam tint wrapper installs after those decorators. The unchanged 0.28.4 PMREM, physical GGX sampling, arch foot source, roof panels, 0.28.9.1 straight-only lower inlays, road, ship, GRIP and physics remain on their original routes.
- Full restore on `dispose()`: original cove mesh geometry, material shader hooks, program key, transparency and blending all restored. `?ceilingFixtures=classic` disables only this pass on the new release. Both Skyline and historic Vault versions are unchanged.

## Play and compare
- **New:** https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.2
- **Exact former cove fixtures within the new runtime:** https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.2&ceilingFixtures=classic
- **Historical 0.28.9.1:** https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.1

## Verification
- Node tests cover real source-profile seams, single-batch geometry, complete High/4 GB vertex color/alpha buffers, preserved per-portal counts, global world-wave stage/front mapping, old-version gating and rollback.
- The PR fast checks include this module and the historic build-version contract.
- `browser-ceiling-fixture-v02892.mjs` captures actual Chrome/WebGL images before/after from the same new version at 110m, 292m, 955m (High) and 1840m (4 GB), with shader error monitoring and intact ship/GRIP/0.28.9.1 straight-edge parity. These images are *real game screenshots*, not generated art.
- Remaining visual judgement: evaluate against the user's photograph in motion; source-response GGX remains intentionally untouched in this placement pass rather than pretending to relight all metal.
