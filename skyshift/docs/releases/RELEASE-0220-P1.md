# SKYSHIFT 0.22.0 — Cinematic Visual Rebirth
## Pass 1: Premium Material Revolution

### Diagnosis
The late 0.21.x tunnel has working enclosed geometry, 22-m architectural panel bays, integrated longitudinal neon and an isolated black-solar road surface. But most new wall/roof panels are `MeshBasicMaterial`, so they render as uniformly colored blue rectangles. The original vault and ribs are `MeshStandardMaterial`, which can still receive exterior world key highlights. Adding more neon, more panels or global bloom would not fix the material disconnect.

### What Pass 1 does
- Apply one coherent **brushed graphite/titanium finish** to the four **existing** tunnel construction batches: large hard-surface panel faces, recessed structural conduits, the original indexed closed vault and original curved supporting ribs.
- Author convincing shape response from actual world-position normals, view direction, shallow brushing, layered coarse tonal variation, face-versus-bevel identification and dark insets. No new mesh, decal, bitmap textures or random flashing.
- Tone down the flat blue vertex colors toward neutral steel, using a small zone-colored grazing/specular reflection instead of a white highlight. Bevels are naturally more luminous; recesses remain visibly darker.
- Preserve real `MeshStandardMaterial` roughness and metalness for the original shell/ribs, but **attenuate their neutral external direct/indirect reflected world-light response** inside the sealed tunnel. Add only a low-energy, palette-colored analytic rim response. This is not a new physical local light; the coordinated neon bounce system is reserved for **Pass 2**.
- The new panel/conduit material remains physically informed custom shading layered over the old `MeshBasicMaterial`, so the mobile renderer does not require multiple new PBR lighting calculations across 20k+ triangles. It uses existing `normal`, `trackS` and `glowWeight` geometry attributes plus the original nine-stage spectral palette; mobile uses fewer procedural bands.
- The 0.21.6 motion shader, 0.21.4 neon flows, road's 0.21.5 matte material, the 0.21.2.6 white-solar seal, ship and rails remain unchanged. No player camera, GRIP, physics, collision, steering, curve, geometry or exposure differences.
- No extra draw calls, lights, model resources, render passes or textures. The pipeline remains the same 9 high-quality / 5 4GB structure batches.

### Compare
- New Pass 1: `/skyshift/?v=0.22.0`
- Previous 0.21.6 materials: `/skyshift/?v=0.22.0&rebirthMaterial=classic`
- Older release URLs `?v=0.21.x` retain their original material/shader stack.
- Diagnostic hooks `?materialRebirthSmoke=1&materialRebirthFrameProof=1` take two screenshots with exactly the **same camera, ship, palette, boost and track** while toggling only the shared material blend uniform, with no physics tick.

### Acceptance gates
- Material visibly differs on both sides of the tunnel and on the roof; panel faces, bevels, recesses and underlying shell have distinct roughness/edge response rather than flat uniform blue.
- A/B images at Cyan 165m, Solar Gold 165m, Jade 273m and simulated 4GB Solar Gold 165m show measurable changed structure pixels.
- No renewed neutral-white road streak, global exposure increase, beam lights or added blur; still follows the original native color wave.
- Older world/GRIP/performance audits remain valid. Browser shader and frame verification must pass before this is considered fully validated.

### Deliberate future work
Pass 2 — `Cinematic Neon Lighting` — makes the actual neon reflect more dramatically in nearby panel metal, floor and ship materials. Pass 3 can add selective velocity-dependent directional blur in a performance-gated manner. Pass 4 balances the whole scene.
