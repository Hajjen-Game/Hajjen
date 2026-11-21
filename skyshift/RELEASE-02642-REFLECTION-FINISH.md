# SKYSHIFT 0.26.4.2 – Reflection Cohesion & Premium Surface Finish

## Target
The real user PC screenshot of 0.26.4.1 shows a credible dark metallic tunnel. Do NOT repeat broad material darkening or global bloom increases. The aspirational reference has longer, softer cyan/amber highlight footprints. Work within the existing real, source-positioned Three.js GGX pipelines.

## Scope
1. **Metal Reflection Smoothing**: Existing native physical panel/rib coats only. Extend the *finite source* GGX reach of 0.26.1 cyan and amber strips (14.4→18.2m cold, 11.6→15.2m warm high tier; smaller gains on 4GB). Reduce the roughness of the existing 0.26.2 micro-roughness atlas by no more than .071 **only close to the current finite-fixture masks**. No additional samples, no flattening the underlying brushed titanium.
2. **Cinematic Road Highlight Refinement**: On the original indexed MeshStandard road, widen the already source-position-masked, glancing colored roof/arch GGX lobes (cyan 2.2→3.15m, warm 2.05→2.72m high). Adjust their bounded directSpecular weights but leave native emissive lane guides, original roughness grain, graphite diffuse, solar seal, wave and white core intact. The **0.26.3.3 straight-only lower cyan gate is untouched**: no new cyan LED illumination or reflections on corner-arrow sections.
3. **Warm Light Falloff Polish**: The original single-geometry amber arch-foot/floor mesh remains in exactly the same position, with the same 20 bands and draw calls. Its already transparent vertex-alpha soft edge receives only a subtle gamma feather; this does NOT add lamps or change fixture cores.
4. **Visual Consistency QA**: Same-frame, same-camera true WebGL before/after PNGs at Gold straight/arch/turn and Violet plus a 4GB profile. Require visible change, no bright neutral-white external solar spill, no washed out central black asphalt, no lost dark gaps. Existing historical CI for the metal library, road GGX, straight-only rails, solar seal, ship and physics must stay green.

## Technical limits
- No new lights, colliders, road/ship/rail/tunnel geometry, textures, reflection samples, WebGL render passes, SSR, PMREM or global exposure/bloom changes.
- Reuse 0.26.4.1 material and 0.26.3.3 road chains, attach via a reversible uniform. **?reflectionFinish=classic** must produce 0.26.4.1 on the same frame without creating/replacing render objects.
- 4GB maintains existing single metal coat and reduced GGX tap counts. Original high-only postprocess remains intact.
- If snapshots show negligible improvement or harsh floor/wall artifacts, adjust parameters or keep PR unmerged.

## Evidence
Real Chromium/WebGL artifacts are saved as `skyshift-v02642-{label}-{classic|refined}.png` and `skyshift-v02642-proof.json` for review before merging. They are actual game frames, never generated image references.
