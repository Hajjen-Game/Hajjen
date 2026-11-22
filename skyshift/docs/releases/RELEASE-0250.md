# SKYSHIFT 0.25.0 — Dark Metallic Lighting Foundation

## Why this rebuild exists
The player compared live 0.24.2 WebGL against the supplied concept and observed the entire wall and roof glowing cyan, whereas the desired tunnel uses charcoal/black metallic substrates, separated luminous cyan traces and orange local fixtures. Earlier passes mostly added colored light and sometimes preserved the brighter of two metal colors. They did not correct overall contrast.

## Implemented
1. **Graphite material foundation:** a new module composes after all original 0.24.2 solar-isolated shaders and replaces the final broad cyan-metal RGB with low-luminance neutral charcoal, inside the same 3 mobile / 4 desktop metal batches.
2. **Craftsmanship kept:** original 0.23.3 full-length geometry, 0.24.1 machined bevels, panel scoring and ribs retained. Subtle local grain fades with camera distance, no extra textures.
3. **Neon as local illumination:** real original banked wall, crown and portal distances define bounded but visibly stronger cyan and zone-colored bounce/specular on a readable charcoal substrate rather than global fill. Dark recesses and view-angle rim reflections remain distinct. Original native emitter geometry is not edited.
4. **20 warm portal fixtures with larger readable luminous surfaces:** small visible amber accents at actual tunnel portal positions, in one low-cost additional static mesh batch, without colliders, point lights or new shadow passes. Matching localized warm response on adjacent side-wall metal.
5. **Original gameplay and road:** no changes to road PBR, 0.24.2 cinematic road reflections, road solar spill seal, white spectral wave, ship/rails, GRIP, auto-throttle, physics, camera, exposure or bloom processing.
6. **Mobile:** original three metal batches, reduced shader grain and one small static amber fixture batch; no additional postprocess or textures.

## Compare and QA
- Release: /skyshift/?v=0.25.0
- Same build, exact previous 0.24.2 material look: /skyshift/?v=0.25.0&darkMetal=classic
- Same-frame QA: ?darkMetalSmoke=1&darkMetalFrameProof=1&trackRepairSmoke=1&waveSmoke=1
- Node shader-composition tests across panel, conduit, shell and rib on high/4GB.
- Real Chromium WebGL before/after at entry, middle and exit under cyan/gold/jade/violet. Validate large wall/roof luminance drop, preserved distinct neon cores, unchanged road and no extra neutral-white sunlight.
- GitHub artifact: skyshift-v0250-dark-metallic-visual-proof.

## Important limitations
This is browser-friendly shader-based local lighting, NOT real global illumination, ray tracing or image-based reflections. It is expected to provide a major visible direction correction, but the actual screenshots must be judged against the concept before promising a match. Retain old mode for direct comparison.

### Test measurement correction (no graphical changes)
The first main-branch test incorrectly treated the lower-center screen rectangle as road. At a banked tunnel-exit curve, it contained wall instead. QA now uses an actual temporary direct-render white/absent deck silhouette to identify road pixels in every camera pose. The temporary material is restored within a finally block; production rendering and gameplay are unaffected.
