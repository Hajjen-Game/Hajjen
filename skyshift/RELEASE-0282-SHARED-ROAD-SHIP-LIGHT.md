# SKYSHIFT 0.28.2 – Shared Road Reflections & Ship Light Response

## Why
User camera frames after 0.28.1 show the right Skyline tunnel geometry in NEON VAULT, but the low side cyan inlays still appear unreflected in the native road, and the ship hull is almost invisible. Neither observation calls for reauthoring any tunnel. Only the light response is missing.

## Implementation
1. **Original source-of-truth road GGX**. Export the existing real 0.26.3 physical fixture position function and extend the original `patchCinematicRoadRebuild0263` / `installCinematicRoadRebuildShader0263` with a fullTunnel mode. The normal 0.26.5 Skyline path is byte-compatible in behavior. The mode only changes the 368m shader cutoff into a full-course mask and anchors its original native RE_Direct code in the base road PBR shader instead of depending on Skyline's 0.21.2.6 decorator.
2. **Source-aware arc sampler**. The exact same 368m original fixture positioning logic is evaluated per each of the ten balanced 340m `TrueSharedTunnelRenderer0281` modules over 3400m. The existing single indexed PBR racing deck owns six original 0.26.3 source attributes and original GGX direct light terms; no extra road geometry or collision meshes. This is physical glancing response, not a painted emissive overlay.
3. **Original Skyline neutral-road-light seal (visual QA correction).** The first real 0.28.2 High images showed that original GGX alone widened the neutral ambient world response across the Vault road. Reuse the exact original 0.21.2.6 road-only direct/indirect diffuse/specular attenuation factors in `fullTunnel` mode BEFORE finite cyan/amber GGX source sampling. Source constants come from `ROAD_SOLAR_SPILL_02126`, with the A/B strength shared so `classic` restores the actual 0.28.1 image. No change to neon guides, white zone wave, rails, ship or global scene lighting. Visual criterion is DARK graphite road, colored local reflections, not broad cyan-white road wash.
4. **Finite colored ship lights**. Only existing MeshStandard/Physical hull instances receive a shader-local, distance- and source-weight-bounded cyan/amber RE_Direct term and tiny strictly colored source-led response. No white ambient/key, no new world/point lights, no exposure/bloom changes, and no geometry, flight or ship pose changes. Both ship variants and hot-swapped hull materials are supported.
5. **Rollback and release**. Old Skyline v0.26.5, Vault v0.28.1 and `?sharedRoadLight=classic&sharedShipLight=classic` are preserved. The new visuals activate only on `?track=vault&v=0.28.2`. Vault HUD displays the actual release; the Skyline bootstrap version remains v0.26.5.
6. **QA**. Source module unit testing, existing flight/GRIP checks, exact same-frame GPU A/B for road-only, ship-only, combined at 110m, 1840m, 3230m and simulated 4GB, plus old Vault, original Skyline and Aurora. Require real pixel change, genuine GGX shader, correct source module count, no extra white highlights or runtime shader errors.

## Acceptance
Do not merge if the real WebGL proof fails. Runtime shader compile failures are not acceptable even if game can fall back. Inspect real high-quality screenshots; do not substitute generated concept imagery. Minimum performance: verify both High and 4GB run; device-specific FPS remains a separate playtest.

- Proposed URL: `https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.2`
- A/B: `?track=vault&v=0.28.2&sharedRoadLight=classic&sharedShipLight=classic`
- GPU audit: `?track=vault&v=0.28.2&sharedOpticsSmoke=1` → `window.__skyshiftSharedOpticsAudit()`
