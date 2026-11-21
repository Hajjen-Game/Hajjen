# SKYSHIFT 0.26.3.1 — Edge Lighting & Floor Pools

## Target image review
The user's reference has three distinct lower-tier lighting cues that the 0.26.3 live screenshot largely lacks:
1. **Long, thin cyan edge accents on the ordinary trackside railing** with restrained elongated road reflections. These are NOT the many yellow turning arrows.
2. **Small amber practicals at the foot of vaulted structural ribs**; warm, localized point-source appearance instead of upper-wall color wash.
3. **Local amber spill on the SHOULDER floor and lower wall** beneath those footlights, fading to the original dark graphite.

The reference also shows longitudinal cyan traces toward the roof and some amber accents between the ribs. The game **already** has vaulted cyan arch emitters, upper cyan coves, integrated light traces and the 0.26.0 intermittent amber companion strips. Doubling them now would overilluminate the tunnel. Therefore no extra roof lamps or additional global lights are introduced in this scoped pass. Re-assess in Pass 4 after new lower lighting is visible.

## Implementation
- Original 0.8.4 aero guardrail has a dark lower *inner bevel* (physical profile offset -0.78 to -0.56; local height .245 to .84). Add thin recessed cyan emitter strips exactly on the existing banked rail bevel, spaced in 22.7m illuminated bays with 1.3m dark breaks. Arrow meshes and elevated cap remain unchanged.
- Twenty short amber foot practicals are anchored near the original 10 portal roots (two sides), using `tunnelProfilePoint0211(2,...)` and the original banked `positionAt`.
- Twenty elliptical warm falloff pools are placed directly on the **original roof tunnel's side-floor shoulders**, sampled from `TUNNEL_PROFILE_0211`, and stay outside the original road/rail envelope. RGBA vertex falloff with additive 4GB-safe batching; no new physics plane.
- The existing solar-isolated `MeshStandardMaterial` and 0.26.3 native GGX accept two additional local cyan rail-source samples on high, one on low memory. An extended, tightly masked specular response is included for legibility. The initial real WebGL capture confirmed the cyan inset and amber floor pools but had too little real road reflection. The bounded Fresnel lobe is widened toward lane-edge asphalt, with a shorter dark seam: preserve negative space and leave the inner driving line dark. Amber road glints are limited to original arch-foot distances; yellow turning arrows are not treated as light sources.
- No screen-space reflection pass, HDRI, world/point/directional lights, global exposure change, camera adjustment or new colliders.
- Two new render batches (rail cyan + foot emitter together; amber shoulder floor pools separate). No persistent texture upload, dynamic lights or postprocess passes. Same frame independent A/B `?v=0.26.3.1&edgeFloor=classic` returns true 0.26.3; legacy v=0.26.3 still disables new effects.

## Release QA
- Pixel-difference proof on real Chromium WebGL high and simulated 4GB graphics: rail lower lighting visible and some reflection on road, floor pool warm localized, graphite remains dark, neutral-white sunlight stays sealed.
- Exact frame Gold/Violet plus unchanged ship/GRIP/native wave/road/collider geometry.
- Old 0.26.0-0.26.3 automated tests and full regression check continue passing.
- If results are too bright or textures look like strips painted on roadway, iterate before merging.
- Pass 4 can balance controlled HDR bloom/color grade around the new fixtures, but should not be used to conceal missing sources.
