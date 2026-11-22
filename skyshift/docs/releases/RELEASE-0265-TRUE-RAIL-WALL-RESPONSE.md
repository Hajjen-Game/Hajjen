# SKYSHIFT 0.26.5 – True Rail & Wall Local Light Response

## User observation and root cause

0.26.1 finite-source GGX made the original cyan roof / upper wall fixtures reflect from dark titanium panel/rib coats. It deliberately left the rail and road unchanged. Later 0.26.3.1–0.26.4.3 added short, straight-only cyan emitters on the lower rail and strengthened ROAD specular, but the RAIL BODY metal still carried the 0.21.2.4 anti-white-sunlight seal: roughness ≈0.98, metalness ≈0.04, direct specular damping ≈0.055. The lit inlays thus appeared separate from nearby metal.

## Implementation

1. Rail: on the EXISTING indexed MeshStandardMaterial aero-barrier body, sample the exact 0.26.3.3 straight-safe 6.5 m cyan inlay intervals and 0.26.3.2 lower-bevel fixture coordinates. Profile-weighted source masks locally reopen gloss/metalness and evaluate genuine source-positioned RE_Direct GGX AFTER the old global white-sunlight suppression. Two samples High, one on 4 GB. No new rail mesh or corner illumination.
2. Walls: reuse the already integrated 0.26.1/0.26.2 finite cyan/amber GGX taps (no new wall taps). Strengthen only wall-facing, physically masked source samples below an explicit roof cutout. The existing dark Basic-material substrate gains stronger but still 0.26.4.3-source-masked colored response; no global exposure or fake neon.
3. A/B: v=0.26.5&railWallResponse=classic is the same-code 0.26.4.3 look. railWallSmoke=1&railWallFrameProof=1 captures identical-camera real WebGL before/after screenshots.
4. Original 0.26.3.3 straight-only source geometry, 20 amber joined floor bands, native zone wave, dark road, original ship, camera, GRIP, physics and all anti-solar safeguards remain unchanged. No new dynamic lights, geometry batches, draw calls, textures, SSR, PMREM, HDR passes or colliders.

## QA and release gates

- Node tests verify exact straight intervals and mask zero in bends, material shader anchors, two/one rail taps, old seal, roof exclusion and classic restoration.
- Real Chromium/SwiftShader at 1536×870 produces High Gold straight/arch/turn, Violet and 4 GB Gold PNG A/B captures. Check roof and dark road as protected controls, rail/wall metal as target ROI, white-spill and preserved black seams.
- Do not merge until shader compile, source/safety checks and screenshot checks pass. The previous release must remain intact if a test fails.

Previous source work: 0.26.1 [PR #131](https://github.com/Hajjen-Game/Hajjen/pull/131), then 0.26.3.3 and 0.26.4.3.
