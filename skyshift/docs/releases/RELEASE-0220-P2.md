# SKYSHIFT 0.22.0 — Cinematic Visual Rebirth
## Pass 2: Cinematic Neon Lighting (0.22.0.2)

### Goal
Pass 1 made four original tunnel material groups capable of an analytic graphite/titanium finish, but it remained visually conservative. Pass 2 must establish a clear relationship between actual neon fixtures and nearby wall and ceiling surfaces: metal should catch **colored, localized light** while panel seams and racing lanes remain dark and readable. Do not inflate global bloom or introduce neutral white sunlight.

### Implementation
- Reuse the original `MeshBasicMaterial` enclosed shell/ribs from the 0.21.2 solar containment, plus existing 0.21.3 graphite panel and structural conduit batches. The Pass 1 patch remains in place.
- Derive each geometry vertex's real **local lateral (x) and height (y)** position by inverting the existing `positionAt(s,lateral,height)` track frame in world coordinates, using cached sampled basis frames. This remains correct in all banked turns without regenerating road geometry or altering any collider.
- Add a compact two-float `neonLocalSection` vertex attribute to these *existing* four original meshes (three in 4GB mode), with no additional meshes, draw batches, textures or render passes.
- Shader proximity response: two sidewall guides around the real wall lighting height, two upper neon paths around the vaulted crown, and ten preexisting portal arches at original measured track positions. Architectural faces, grazing edges and cavity-shadow behavior use Pass 1's normal/view/rough-machined-face response.
- The color comes only from the shared **native zone-wave palette** via Pass 1's `rebirthPalette()`, not a new time clock, white daylight source or screen-coordinate gradient. The native moving white-core crest remains unchanged; ambient bloom, directional lights and PBR road shaders are untouched.
- Mobile lowers bounce intensity and keeps three original batches. All effects are local to the physical wall/roof geometry.
- If required material or geometry is missing, the installer returns a **safe Pass 1 fallback** instead of failing the whole game boot.

### Comparison and acceptance
- New version: `/skyshift/?v=0.22.0.2`
- Same shaders without new neon bounce: `/skyshift/?v=0.22.0.2&cinematicNeon=classic`
- Older Pass 1 release: `/skyshift/?v=0.22.0`
- Diagnostic `?cinematicNeonSmoke=1&cinematicNeonFrameProof=1` captures exactly the same camera, palette, ship and road with only new bounce disabled/enabled.
- Browser CI checks cyan/gold/jade across desktop and simulated 4GB, comparing changed wall and ceiling pixels; it rejects insufficient effects, excessive changes in the playable center road, shader compile errors and unwanted white sun spill.
- Unit tests cover actual world-space cross-section inversion, real `MeshBasicMaterial` shell composition, PBR material compatibility, performance budgets, old solar seal and previous A/B.
- Confirm game startup on an actual phone before visually grading Pass 2.

### Still not part of Pass 2
No global motion blur, exposure uplift, new tunnel geometry, per-panel neon lines, extra physics, altered camera handling, weapons, steering, GRIP or ship material rework. Pass 3 — Velocity Cinematography — will separately evaluate controlled, optional directional blur at high speed once this pass is stable.
