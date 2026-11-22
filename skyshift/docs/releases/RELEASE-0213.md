# SKYSHIFT 0.21.3 — Structural Tunnel Rebuild

## Purpose
The 0.21.2.6 solar containment made the tunnel lighting dark and readable. The next visual gap to the provided reference images is physical architectural complexity: old 0.21.1 featured a continuous smooth shell, ten large portal ribs and a handful of narrow light guides.

## Additive architecture, not a physics rebuild
- Keep the exact original, solid 368 m curved/banked tunnel shell and its minimum clearance, 10 neon arches, fog seal and spatially synchronized nine-color zone wave.
- Create 3D raised bevelled graphite sidewall panels and faceted ceiling cassettes sampled from the **same original tunnel profile and track positionAt**.
- Separate panels at regular 14 m architectural bays with real recessed edges and hard-surface returns; preserve openings around original neon portal arches.
- Introduce ~21 m secondary curved reinforcement ribs between large arches. These are visible structure, not collisions or obstacles.
- Desktop gets a second batched layer of recessed conduits, roof overhead service spine and small hard-surface accents; 4GB mobile gets fewer panels/supports and one additional art batch.
- All new surfaces use dark, fog-free MeshBasic vertex-color materials with an extremely mild echo of the existing tunnel spectral color. No neutral sun-key whitewash, new dynamic lights, heavy PBR reflections, motion blur or new shader passes.
- Original driving deck, full GRIP, ship hull, rail system and game camera remain unchanged.

## Architecture validation
- Core shell remains fully closed and unchanged (0.21.1).
- Do not obscure entrance/exit neon or the racing lane; all panels in the flight envelope remain above ~26 m.
- New material geometry is only rendered in the sealed Skyline tunnel (0–368 m).
- Preserve existing render budget: +2 batched meshes on desktop, +1 lower-density batched mesh for simulated 4GB.
- All new detail geometry sits **inside** the original shell; it follows bank and real curvature with <=2 m longitudinal segmentation on desktop.
- Artistic A/B: `?tunnelStructure=classic` displays the original 0.21.2.6 scene under the same render stack.
- Historical version URLs `?v=0.21.2.x` automatically retain their older architecture for reliable previous QA.
- Real WebGL CI renders identical frames before/after toggling only the new structural meshes at cyan / Solar Gold / Jade and mobile gold.

## What is deliberately left for later
Pass 0.21.4 will install long integrated neon flows, and 0.21.5 can refine the road's physical surface treatment. Avoid compensating for insufficient architecture by increasing whole-scene bloom at this stage.
