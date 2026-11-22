# SKYSHIFT 0.23.2 — Cinematic Light Architecture (Pass 2)

This pass builds on the tested 0.23.1.1 **Neon Glow Repair**, not the regressed early 0.23.1. It targets only HARDSURFACE_PANELS and desktop STRUCTURAL_CONDUITS. Closed-shell neon and arch ribs keep their existing shader; road, ship, wave, camera, GRIP, collision and physics remain unchanged.

## Actual change
- Metallic reflection is **additive** to the original finished RGB, strictly inside the original 78–304 m material reference gallery; smoothly feathered at either end.
- Reflection uses the existing colored zone palette only (no white sun), actual banked material normals and existing wall/roof neon directions on high graphics. Physical panel bevels receive greater reflections; broad faces receive only faint localized sparkle, recessed joints almost none.
- Original tunnel portal arcs gently amplify nearby metal glints, but no extra neon strips or lamps are introduced.
- 4GB mobile uses one original sun-sealed panel batch and a cheaper single-varying formula; no new geometry, vertex attributes, draw calls, shader passes, or lights.
- The pass does not modify exposure, bloom or global lighting.

## Compare and acceptance
- New: `/skyshift/?v=0.23.2`
- Exact previous 0.23.1.1 metal + native neon (same deployment): `/skyshift/?v=0.23.2&lightArchitecture=classic`
- QA: `?lightArchitectureSmoke=1&lightArchitectureFrameProof=1` takes identical WebGL frames with only the new light response toggled.
- Real browser tests check cyan/gold/jade high profile and violet/gold 4GB, original neon brightness retention, no new white solar spill and an unchanged road centre.
- **Acceptance demands real WebGL screenshots** and a visible but not overexposed localized difference. A successful test alone does not imply the concept-image target has been reached.

No user's uploaded screenshot is used as render-test proof.
