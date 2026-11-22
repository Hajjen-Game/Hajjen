# SKYSHIFT 0.21.2.5 — Ship White-Spill Containment

## Observed issue
After SKYSHIFT 0.21.2.4 successfully removed the bright neutral-white rail-body reflection, the ship still showed a white patch across its upper hull in a curved Solar Gold tunnel view.

## Source isolation
The original 0.21.2.3 ship shader reduced ordinary specular, but the PBR light response also includes *direct diffuse from the exterior directional key* and an independent physical clearcoat response. Same-frame WebGL isolation demonstrated:
- Disabling clearcoat alone did **not** remove the wash.
- Making the complete hull merely rough and non-metallic can make it brighter.
- Disabling the exterior world lighting removes neutral illumination but makes the entire world and ship too dark.

The fix must operate on the ship's upper hull shader, not the entire scene.

## New art-only solution
- Preserve all original ship geometry, tank/flight physics, GRIP, movement, handling, camera, engine lights, nebula/rail/tunnel and native nine-color wave.
- Apply to bright PBR hull surfaces only, avoiding dark recesses, cockpit/glass, engines, emissive details and transparent trails.
- Through a shared track-distance uniform, reduce *direct exterior-key diffuse* from the hull and ordinary/clearcoat specular **only inside 0–340m**, with a smooth return to original PBR lighting at 368m.
- Restore hull readability using a tiny (0.022) emission echo of the actual interpolated zone accent; never introduce a new lamp or white bloom source.
- Same uniform works on initial Manta/Stingray procedural craft, fleet switches and asynchronously imported Stingray Hero model.
- Exact real WebGL same-camera A/B available using `?shipWhite=classic`. The previous 0.21.2.4 metal rail fix is not touched.
- No added draw calls, renderer passes, shader animation clocks or gameplay modifications.

## Acceptance checks
1. WebGL shader must compile without errors.
2. Old vs new exact same frame at 165/261/273m, cyan, Solar Gold and Jade, including deliberate hull roll.
3. No new white hotspot; ship remains visible, powered engine glow and neon line colors stay intact.
4. Simulated 4GB tier has no additional draw batches.
5. All prior track, camera and GRIP tests pass.
