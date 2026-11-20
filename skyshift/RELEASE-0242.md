# SKYSHIFT 0.24.2 — Cinematic Road Reflections

## Goal
Continue toward the provided premium futuristic tunnel reference without undermining the 0.23.3 full-vault geometry, 0.24.0 colored architectural neon, or 0.24.1 machined panels. Improve the dark road's perceived sheen with elongated colored reflections of actual existing tunnel emitters and keep the ship/corridor readable on iPhone.

## Implementation
- New module `cinematic-road-reflections-v0242.mjs` attaches **only to the existing indexed MeshStandardMaterial racing deck** after the 0.21.2.6 road solar seal and 0.21.5 premium-road color shader. No road mesh replacement, decal planes, SSR, cubemap, extra dynamic lights, world fog or full-screen render pass.
- Uses the **original ten authored portal positions**, reusing the per-fragment nearest-portal distance already computed by 0.21.5. Longitudinally stretched wall-light and roof-light ribbons use the original banked `trackS/trackL` coordinates; no screen-space streaks or texture shimmer.
- Native zone accent and incoming wave `waveSpectrum` tint the reflection (nine-stage synchronized palette). The existing warm boost color adds small secondary warm highlights. No separate color clock; **no neutral white spectral core** copied into the new reflection.
- Masks preserve the native lane guide emissive, center spine, boost markers, current white-core wave and travel corridor. Existing road PBR roughness and white solar spill containment are never changed.
- Full reflection strength inside 0–340 m of the sealed vault; smoothly falls to zero by the tunnel exit at 368 m. Outside tunnel, zero contribution. This is a stylized analytical neon bounce and **not real screen-space ray-traced reflection**.
- Mobile 4GB uses a cheaper smoothstep longitudinal reflection and reduced intensity; no new texture samplers, draw calls, geometry, lights, colliders, postprocessing, or changes to GRIP, steering, ship or camera.

## Comparing
- Release: `/skyshift/?v=0.24.2`.
- Exact 0.24.1 look on the same build: `/skyshift/?v=0.24.2&cinematicRoad=classic`.
- WebGL probe and same-frame screenshots: `?cinematicRoadSmoke=1&cinematicRoadFrameProof=1&trackRepairSmoke=1&waveSmoke=1`.
- Capture each frame with original 0.24.1 road, cinematic road, and deck hidden. The *road-only segmentation* is computed from a temporary flat-white road versus deck-hidden **direct renderer** pass, eliminating false positives from dark road versus dark background.
- The first test revealed too much road brightness; tuned emitter energy downward while preserving long chromatic highlights and adding an explicit average road-luminance limit. Profile cyan/gold/jade at entry/middle/exit, plus 4GB gold/violet.

## Acceptance
Require shader composition and historic road/white-solar/GRIP tests plus real Chromium screenshot pixel proof: visible additional colored illumination on the deck, preserved lane visibility, no extra white pixels and no substantive change outside the physical road. Reconcile A/B failures before release. Automated success cannot guarantee subjective parity with the target image; evaluate on iPhone.
