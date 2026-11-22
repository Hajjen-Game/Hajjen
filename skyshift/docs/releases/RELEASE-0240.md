# SKYSHIFT 0.24.0 — Architectural Neon Lighting

## Art direction
Keep the complete 0.23.3 material/geometry upgrade while moving toward the supplied futuristic racing-tunnel reference: luminous cyan/zone-colored portals, gently lit machined wall/roof panels, dark recessed seams, strong near-camera perspective. This is a first architectural-light pass, not a photorealistic asset reconstruction.

## Implementation
- `architectural-neon-lighting-v0240.mjs` composes AFTER 0.23.3's full-vault metal lighting. Existing wall neon, crown flows and portal arches drive bounded colored cove light, rim highlights and reflective portal collars on the **original** four tunnel batches (three low-memory).
- Near-field wall and crown response uses the banked road-relative neon coordinates and physically scoped 0.23 lighting functions; never world-space y / external sunlight.
- Recesses retain 90% suppression of added light to protect graphite contrast; real machined bevels receive sharper highlights, with stronger portal response on the actual ribs.
- Uses the original nine-stage `rbTint` spectral color wave. Does not introduce an unrelated light clock or neutral-white ambient fill. Original native emission, shader pipeline, tunnel portals, geometry, exposure, bloom, solar seal and road reflections remain unchanged.
- Reduced shader response on simulated 4GB mobile; no new vertex data, draw calls, lights, textures, meshes or render passes. No changes to flight / steering / GRIP / camera / road / ship / rail collision.

## Live and comparison
- New: `/skyshift/?v=0.24.0`.
- Same deployment old appearance: `/skyshift/?v=0.24.0&architecturalNeon=classic`.
- Prior release: `/skyshift/?v=0.23.3`.
- Exact-frame QA: `?architecturalNeonSmoke=1&architecturalNeonFrameProof=1&trackRepairSmoke=1&waveSmoke=1`.

## Validation gate
Dedicated shader composition / zero-cost / mobile tests and real Chromium WebGL A/B captures at three different positions and colors. Check actual luminous surface changes, preserved neon cores, unchanged road center and no white solar leak. Upload capture artifacts even when the visual threshold fails, so failures can be diagnosed. Shader unit success is not visual approval. Review on iPhone before next step.
