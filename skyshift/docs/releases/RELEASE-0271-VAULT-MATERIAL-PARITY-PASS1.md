# SKYSHIFT 0.27.1 – Neon Vault Material Parity, Pass 1

## Scope and provenance

The new 3400m Neon Vault was playable in 0.27.0, but its metal shell and structural ribs were uniformly colored, solar-isolated MeshBasicMaterials. Skyline 0.26.2 and 0.26.5 use physically illuminated metal coats, with a mipmapped packed micro-normal/roughness/milling texture and carefully limited cyan/amber sources. Directly replacing the full tunnel with physical material under the older outdoor lights would reintroduce white glare and add mobile shader overhead.

This pass **directly reuses the approved 0.26.2 packed 128/256 px metal atlas**, without copying or rebuilding the source library, to create material-definition parity on existing Neon Vault surfaces. It is **not** a 0.26.1 native GGX reflection transfer (reserved for 0.27.2).

## Changes

- Adds track-independent, camera-stable 0–3400m material UVs to the original 20 indexed shell chunks and 20 nonindexed structural rib batches, preserving the two ends of every 170m chunk.
- One 0.26.2 DataTexture reused on the two existing MeshBasicMaterial shader programs: 256×256 High / 128×128 4GB with mipmaps. Texture R/B micro-normal perturbation, G roughness and A milling drive subtle brushed, satin titan variation. UVs are in actual global track metres, not stretched to one giant 3400m texture or reset per chunk.
- Visible machined panel subdivision and recess seams with minor neighboring lips, deterministic tile-specific charcoal/bronze-toned titanium differences. The original source-colored cyan/amber transport in vertex colors is preserved; no white world ambient and no additional emitters.
- Exactly the same 60 batches (20 shell + 20 ribs + 20 unchanged emissive). No new geometry, lights, collisions, road edits, ship edits, GRIP or physics edits.
- Exact same-frame comparison: **?v=0.27.1&track=vault&vaultMaterial=classic** returns the 0.27.0 material finish. If v=0.27.0 is explicitly selected, the new effect remains off.
- New audit: vaultMaterialSmoke=1, real fixed-view A/B WebGL: vaultMaterialFrameProof=1.

## Tests / acceptance

- Unit tests: atlas provenance, global coordinates/seam continuity at all 20 sections, rib positions, shader hooks, fallback, memory profile, no change to old tracks, 60 unchanged batches.
- Real 1536×870 Chromium/SwiftShader renders: High at s=110,990,1840,3230 and 4GB at s=110,1910. The same game frame is captured twice (classic / new), with side-wall change, dark road, cyan fixture and white-spill constraints.
- Historical 0.26.5 and 0.27.0 regressions remain mandatory before merge.
- No claims of physical reflection parity until later local-GGX port, and no release if WebGL shaders fail or mobile throughput is unacceptable.

The user's previously approved SKYSHIFT 0.27.0 racing geometry, camera and control logic remain untouched.
