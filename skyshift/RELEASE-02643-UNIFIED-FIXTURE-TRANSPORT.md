# SKYSHIFT 0.26.4.3 – Unified Fixture Light Transport & Surface Response

## Why – real PC screenshot red/green examples
The green roof cyan responds convincingly to its surrounding metal. The marked red cyan wall sconces, warm side practicals, orange floor bands and short lower rail cyan still appear insufficiently integrated with adjacent materials. Small multipliers in 0.26.4.1/0.26.4.2 were not convincing enough.

## All four priorities in one focused pass
1. Wall cyan and amber light response: reuse sun-isolated MeshBasic dark brushed titanium substrates after 0.26.4.1 darkening. Add localized, non-neutral cyan/amber color transport tied to the already authored wall/source height, portal and cavity masks. Protect the already-good roof by explicit height and roof-exclusion masks. On the original MeshPhysical coats, widen the 0.26.0 source-distance attenuation only near source wall sides. No new PBR sampling.
2. Connected amber floor: reuse the exact 20 joined arch-foot/floor bands from 0.26.3.2; change only the feather of their existing transparent per-vertex alpha, not the mesh or its position.
3. Lower short cyan lamps: improve original physical road specular response, preserving the required 0.26.3.3 straight-only mask. Cyan rail reflections remain absent in yellow-chevron turns. Preserve native road GGX, solar seal, white crest and dark substrate.
4. Real visual QA: use same-frame Chromium/WebGL with 1536x870 high Gold straight/arch/turn/Violet and 4GB Gold. Compare the user-marked red ROIs (wall cyan, amber sconces, floor pools, rail) with protected green good-ceiling ROI and black road. Real PNGs and numeric reports, never AI images.

## Technical boundaries
No new ambient/sun point lights, SSR, PMREM, render targets, meshes, draw calls, textures, collisions, physics or GRIP changes. Native wave, ship and camera untouched. 4GB uses smaller gains. Preserve exact old look using ?v=0.26.4.3&fixtureTransport=classic.

## Ship criteria
The new WebGL snapshots should show substantial changes in multiple red-marked light families without simply brightening the green roof or neutral-white sky, losing dark titanium or washing out the middle lane. All old shader, solar, road and gameplay CI should remain green. Keep the PR unmerged if not.
