# SKYSHIFT 0.23.1 — True Material Depth & Reflection Rebuild

## Why
SKYSHIFT 0.23.0 changed GGX-inspired material values but the actual panel geometry remained virtually flat. The user's before/after comparison showed too little visual difference. This release changes the *real 3D surface* and its metal finish.

## Implementation
- A scoped 78–304 m reference section of the original vaulted tunnel receives actual raised inserts (0.58 m versus the previous 0.34 m), stepped satin-metal bevels, black inset channels, thin raised machined trims and thick end caps. The existing panel geometry is REPLACED rather than overlaid; no additional scene meshes/draw calls.
- The sun-isolated MeshBasicMaterial chain remains. A new material shader separates graphite faces, satin-titanium edges, dark gaps and support ribs, with controlled colored reflections from the *existing* native tunnel neon. No global white sun, neutral ambient or new lighting passes.
- High-quality mode recalculates track-aligned neon coordinates and GGX basis attributes for every new geometry vertex. The original panel buffer is retained strictly for exact-frame comparison and disposed with the world.
- Simulated 4 GB low-memory devices retain existing geometry but receive a simplified separated metal response. No physics, GRIP, steering, camera, ship, road, rail, native zone wave, bloom or exposure changes.
- A missing mesh or invalid banked reference triggers a safe fallback to 0.23.0.

## Compare
- `/skyshift/?v=0.23.1`
- `/skyshift/?v=0.23.1&trueDepth=classic` (previous 0.23.0 material and geometry)
- Diagnostic same-frame capture: `?trueDepthSmoke=1&trueDepthFrameProof=1`, testing cyan/gold/jade and 4GB.

## Acceptance
A visibly different real WebGL before/after image is required. Real Chrome rendering and older solar/road/physics regression tests must pass before visual approval. Do not claim the aspirational concept image is already achieved.
