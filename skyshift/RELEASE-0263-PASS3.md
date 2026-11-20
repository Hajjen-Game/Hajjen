# SKYSHIFT 0.26.3 — Cinematic Road Reflection Rebuild · Pass 3/4

## Visual goal
Move toward the supplied premium metal tunnel reference by replacing the road's largely hand-authored bright emissive ribbon approximations with actual geometry-based physically lit reflections on the original dark indexed racing deck. Cyan LED coves and short amber portal fixtures reflect according to GGX and current camera/road normals; lane guides, native white-core wave and original vehicle physics are protected. Do not create a wet mirror floor or brighten the outside sky.

## Technical change
- Native `MeshStandardMaterial` is retained, including the original 0.21.2.6 road sun suppression, 0.21.5 detail and the 0.24.2 selective emissive art as a comparison layer.
- The positions of the **actual 0.26.0 installed** upper cyan wall coves and amber companion strips are reconstructed from `TUNNEL_PORTALS_0211`, `tunnelProfilePoint0211` and the original banked `positionAt` (same placement recipe as `dual-tone-lighting-v0260.mjs`). No freehand reflection stripes, fictitious emission positions or time-driven reflection patterns.
- Original indexed road vertices receive interpolated light-direction inputs, true track tangents and finite fixture distance weights. No geometry/collider shape modification and no extra road draw.
- PBR `RE_Direct` for each local source is evaluated **after** the sealed world-light contribution is attenuated. It uses the native roughness, metallic Fresnel, scene-view and surface normals.
- High quality: 4 cyan quadrature taps (left/right, front/back) and 2 amber; 4GB quality: two cyan + one warm side. Native zone palette, road white crest and global bloom are unaffected.
- Road PBR roughness varies with original track coordinates: dark satin graphite around 0.32–0.43 inside tunnel, leaving the existing baseline 0.67–0.73 outside. This is a material change, not claiming ray-tracing or full SSR.
- First real GPU screenshot revealed excessive cyan diffuse wash (road mean luminance +22). Follow-up: keep native BRDF **specular only** for the local fixtures, restore the original physically shaded diffuse term per sample, and reduce direct source energy. The dark road is non-negotiable.
- Original 0.24.2 emissive reflection strips reduce to a restrained 10% residual by default. At `roadRebuild=classic`, old `0.26.2` road response is exact. Test `?v=0.26.3&roadRebuildSmoke=1&roadRebuildFrameProof=1&trackRepairSmoke=1&waveSmoke=1` for same-frame 8GB/4GB images.
- No new lights, textures, PMREM, HDRI, renderer passes, meshes, colliders, gameplay, GRIP, ship/rails, camera, world light or changes to the tunnel's 0.26.2 titanium coats.
- SSR is **not** active in this pass; a separate opt-in desktop experiment may be considered after native GGX proves the correct look and GPU budget. This avoids SSR's screen-edge leaks and cost on mobile.

## Release gates
1. All historic solar seal, road/wave, physics, GRIP regression tests remain green.
2. Real Chromium WebGL high/4GB A/B screenshots at cyan, violet, gold and jade show a significant road-only change and preserve other geometry pixels.
3. No neutral/white spill increase or flooded tunnel. Dark road, readable guides and ship preserved.
4. Do not merge on technical tests alone if the result is flat, too glossy or otherwise worse against the original visual reference.
5. Full main regression and GitHub Pages deployment must pass after merge.

## Research and previously inspected implementation
- Three.js: Standard/Physical material GGX, roughness/metalness and native direct light implementation.
- Existing 0.26.0 true metal GGX and 0.26.1 finite strip sampling.
- Existing 0.24.2 road reflection controller and 0.21.2.6 solar seal, used as unchanged reference.
