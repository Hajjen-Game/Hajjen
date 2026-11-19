# SKYSHIFT 0.22.0.4 — Cinematic Visual Rebirth
## Pass 4: Unified Cinematic Grade

### Objective
Create a perceptible and coherent premium image from the existing four-stage work, without adding more repetitive tunnel geometry, unbounded bloom, static noise, a white solar spill, or excessive low-end GPU cost.

### Implementation
- Keep Pass 1's graphite/titanium material, Pass 2's bank-aware local neon reflection, and Pass 3's selective speed blur.
- Add an optional linear-HDR `ShaderPass` after SMAA and optional Velocity Cinematography, before the original OutputPass.
- Shape the graphite and metal midtones with a conservative contrast curve, slightly richer chromatic separation, and localized *colored* light-wrap sampled from nearby existing HDR neon pixels.
- The central road and ship retain strong sharpness masks. The brightest near-white cores are protected; neutral world light, camera, exposure, bloom threshold and source materials are unchanged.
- No new meshes, lights, textures, physics modifications or gameplay controls. One fullscreen pass on premium hardware while racing, automatically disabled during menus/pauses or slow adaptive tiers.
- A 4GB profile keeps the original compositor, avoiding both Pass 3 blur and Pass 4 grading.

### Testing and comparison
- New: `/skyshift/?v=0.22.0.4`
- Original Pass 3 rendering at the same code version: `/skyshift/?v=0.22.0.4&unifiedGrade=classic`
- Prior stage: `/skyshift/?v=0.22.0.3`
- Exact-frame QA: `?unifiedGradeSmoke=1&unifiedGradeFrameProof=1` captures identical camera, flight and wave with only grading toggled.
- Node tests cover HDR pass ordering, protected road/ship/white core, playing/paused state, adaptive quality, 4GB profile and existing solar isolation.
- Real WebGL screenshot tests check cyan, solar-gold and jade tunnel zones, plus original renderer and 4GB fallbacks.

### Acceptance
The user should see a clear improvement in material/lighting depth and spectral richness relative to Pass 3 without visual overload. A successful CI run is necessary for technical verification, but user gameplay inspection is still required for artistic acceptance.
