# SKYSHIFT 0.25.1 — Micro Surface Metal Definition

## Why
0.25.0 created the right dark graphite baseline, but player screenshots show large, still-plastic panel faces. This is **not** a brightness/bloom pass. Target: brushed manufactured metal that responds differently to existing cyan, violet, gold and amber emitters without reintroducing uniform cyan wall wash.

## Implemented
- Shader `micro-surface-metal-definition-v0251.mjs` composes directly **inside the 0.25.0 dark graphite material response** for the same high-tier 4 / 4GB 3 sun-sealed MeshBasicMaterial batches.
- Directional micro striations follow the *original banked track* with two different spatial frequencies and a low-frequency warp. Fade fine texture over distance, and use a simplified, slower signal on 4GB mobile.
- A procedural **roughness-distribution approximation** reshapes local view-dependent highlights, without changing global brightness, road roughness or original nine-zone color wave. This is a physical-inspired surface response on a sun-isolated Basic shader, not a real PBR roughness/normal map; no claim of real ray-traced reflection.
- The machined panel bevels receive narrower specular response, and existing true recessed joints are darkened. On high tier only, sparse machining scores appear in illuminated portions of the material.
- The original wall/crown emitters, 20 amber practicals, 0.24.2 cinematic road reflections, 0.25.0 graphite substrate, ship, HUD, rails, camera, GRIP, collisions and physics are all untouched.
- **No extra meshes, draw calls, lights, textures, render passes or vertex attributes**, no new plugin or paid asset.

## Exact A/B
- Candidate build: `/skyshift/?v=0.25.1`
- Same-build **0.25.0 appearance**: `/skyshift/?v=0.25.1&microMetal=classic`.
- WebGL browser probes: `?microMetalSmoke=1&microMetalFrameProof=1&trackRepairSmoke=1&waveSmoke=1`.
- The 0.25.0 dark-metal comparison remains independently available using `darkMetal=classic`.

## Acceptance
- Full historical shader-chain composition under high/4GB and each physical tunnel role.
- Real same-camera WebGL screenshots at early, middle and late tunnel under cyan/gold/jade/violet, with 8GB and simulated 4GB profile.
- Micro changes must be perceptible *as material*, but average wall brightness should remain approximately the same; original bright neon cores and true road pixels must remain unchanged, with no extra white solar spill.
- Visual artifacts uploaded to `skyshift-v0251-micro-surface-metal-visual-proof` and reviewed before merge. A passing unit test alone is not artistic approval.

## Known limit
Procedural striation in the existing MeshBasicMaterial shader is lightweight and scalable for browsers, but not equivalent to a physically based anisotropic metal + authored normal/AO/roughness texture set. Evaluate screenshots on desktop and iPhone; if too regular or subtle, tune from real render, not from arbitrary test assertions.
