# SKYSHIFT 0.24.1 — Premium Surface Craftsmanship

## Objective
Advance toward the supplied futuristic tunnel reference without rolling back 0.23.3's full-length 3D panels or 0.24.0's colored architectural lighting. Improve actual wall and crown metal craftsmanship while preserving readable neon, dark reveals and the original driving corridor.

## Changes
- Extends the **original 22 m coherent panel bays** on the original curved/banked tunnel profile. No independent panel-pattern overlays or new light strips.
- On high-fidelity hardware, the panel cross-section now has an actual cast-in shoulder, narrow raised titanium bead, a recessed dark machining score, an inset graphite face and a genuine longitudinal end relief. Material categories use the original glowWeight classes (.008 face, .004 lip, .003 machined edge, 0 recess).
- The panel geometry is **replaced inside the same original HARDSURFACE_PANELS mesh**, not stacked over it, to avoid z-fighting and preserve material batching. Other structural conduits/arched ribs/closed shell keep their current shapes.
- A local, restrained spectral satin response is appended after the original native-emissive + 0.24.0 shader chain. It uses the existing nine-zone wave and banked neon proximity. Fine directional grain fades out with distance to avoid shimmering.
- On simulated 4GB mobile, geometry remains byte-for-byte identical to 0.23.3; a cheaper distance-faded shader finish is used, with bounded extra edge response to compensate for missing fine geometry. No extra geometry, lights or draw calls on that tier.
- No new lights, textures, meshes, render passes, colliders or changes to original road, ship, rail, steering, GRIP, physics, camera, bloom, exposure, neutral-white solar containment or zone wave.

## Compare
- Proposed release: `/skyshift/?v=0.24.1`
- Prior 0.24.0 look on the **same build**: `/skyshift/?v=0.24.1&surfaceCraft=classic`
- Native probe: `?surfaceCraftSmoke=1&surfaceCraftFrameProof=1&trackRepairSmoke=1&waveSmoke=1`.
- Real Chromium A/B snapshots at tunnel entry, midpoint and exit, in high-tier cyan/gold/jade and mobile gold/violet. Each frame uses the same camera; missing shader/old native neon, white solar leakage or road changes are failure conditions.

## Acceptance and follow-up
Unit tests + real WebGL proof are required before merge, followed by subjective side-by-side iPhone assessment. This step increases panel depth/readability; it does not promise a photorealistic concept-image match. The separate road-reflection work remains a later pass.
