# SKYSHIFT 0.22.0.3 — Cinematic Visual Rebirth
## Pass 3: Velocity Cinematography

### User goal
The target screenshots show high-speed neon blur with cinematic focus. The existing 0.22.0 Passes 1–2 establish physically plausible graphite metal and localized neon reflections, but the **on-screen motion** still reads less dramatically at speed. Pass 3 adds velocity-dependent directional blur while protecting interactive visibility.

### Implementation
- Reuse the existing r180 Three.js HDR EffectComposer: **RenderPass → UnrealBloomPass → SMAAPass → optional Velocity ShaderPass → OutputPass**.
- The new pass samples the already composed HDR image with five taps and a perspective-aligned, symmetric motion field that grows toward screen periphery. It is inserted **before** OutputPass/tone mapping so the original palette and white-core wave remain intact.
- A center-of-screen road corridor and the craft silhouette at the lower center receive strong protective masks. Existing DOM HUD does not pass through the WebGL compositor, so it stays crisp automatically.
- The effect reads only `flight.currentSpeed/TRIAL.startSpeed`, the existing physical boost multiplier, playing/paused state and the performance director's adaptive quality level. It never changes the physical simulation, camera bank, camera FOV, GRIP, hull or native speed curve.
- At low speed, pause, menu or on quality level >=3, the ShaderPass is **disabled** (0 extra draw calls). When enabled it adds **one** HDR fullscreen pass, no new 3D geometry, lights, textures or additional postprocessing targets. `?velocityCinema=classic` keeps the exact prior 0.22.0.2 renderer with no extra pass.
- Simulated 4 GB devices use the unchanged four-pass compositor with no blur. The full effect is available only on the existing premium renderer profile; the adaptive director scales its intensity down as device rendering cost increases.
- No global contrast, exposure, bloom, white solar key or zone-wave shader changes. Result is a controlled cinematographic speed cue, not continuous full-screen smear or pulsing road stripes.

### Comparisons
- Pass 3: `/skyshift/?v=0.22.0.3`
- Pass 3 with old renderer: `/skyshift/?v=0.22.0.3&velocityCinema=classic`
- Pass 2 release: `/skyshift/?v=0.22.0.2`
- Pass 1 release: `/skyshift/?v=0.22.0`
- Browser CI-only `?velocityCinemaSmoke=1&velocityCinemaFrameProof=1` can freeze one camera/ship/zone frame and compare a forced high-speed blur against the original. It also checks default low-memory fallback and explicit classic mode.

### Acceptance criteria
1. The walls and ceiling have a measurable high-speed response during boost, but the central ship silhouette and the racing apex remain readable.
2. At cruise and pause the new render pass costs zero GPU draws, and performance adaptation can scale it down or deactivate it.
3. HDR tone mapping and existing color-wave neon remain intact; no reintroduction of white exterior sunlight.
4. All game startup, steering, physics, camera and 0.22.0 Pass 1–2 regression tests pass.
5. Real Chrome/WebGL frames in cyan, gold, jade plus a 4GB device gate pass; actual phone playtesting is required before final visual acceptance.

### Deliberately deferred to Pass 4
Overall materials, lighting, blur, ship/road readability, exposure and bloom are to be balanced **together** in Unified Cinematic Grade. Avoid layering more effects without first assessing the new frame in motion.
