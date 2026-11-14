# SKYSHIFT 0.4.9.5 – Inertial Boost Camera & Speed Punch

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

## Why this release

The 0.4.9.4 camera lag changed the chase camera's global follow response for 0.36 seconds and then jumped to a faster response for 0.52 seconds. It also imposed a positional 10m cap and slowed the camera's look target. Phone footage showed the ship moving away but the effect feeling like a correction rather than natural acceleration.

## Inertial boost spring

- `boost-spring-v0495.mjs` replaces response switching with an exactly integrated **critically damped longitudinal spring**. The initial velocity impulse is proportional to +40% expected boost speed, and half the total input is coupled to the real exponential speed ramp; the camera position itself is never teleported when boost starts.
- Peak visual separation on the 44–47m/s trial is about **4.0–4.2m**, at about **0.17–0.20 seconds** after pad contact, then it returns naturally over roughly **0.5–0.8 seconds** without position snapping or oscillation. A smooth hyperbolic tangent envelope keeps the additional lag strictly under **5.2m**, even under unusual inputs. There are no arbitrary lag/catch-up phase timers.
- The original default-position chase camera follows the pilot at its normal **10.4/s exponential response**, even during boost. Only a bounded offset along the ship's forward axis is layered on top. The look target keeps normal response: **steering, turn preview and aiming never inherit boost damping**.
- `boostFovTarget` smoothly adds up to **+3.7 degrees**, reaching about **74.2°** from the existing 70.5° high-speed FOV. Separate rise/fall responses (13.0/s and 5.5/s) prevent a harsh FOV cut at boost release, and the total is limited to 75°.
- The five physical boost pads, **+40% real speed multiplier**, 0.92s duration, authored 1,530m track, Manta Blade, existing Chroma-inspired spectral wave, mobile bootstrap and no extra GPU draw calls remain unchanged.
- The audit includes spring peak metres, event count, FOV bonus, frequencies and bounding values for comparison with new phone footage. No extra geometry or post-processing passes.

## Validation

- `boost-spring-v0495.test.mjs`: checks 20/30/60/120FPS spring timing, smooth distance envelope, steady return, FOV limits and unchanged physical boost/steering, plus production boot wiring.
- `browser-smoke-v0495.mjs`: checks live Chrome/Three.js WebGL, wave shaders, real browser ESM spring maths, Android touchscreen start and recoverable import failure.
- The user should judge the actual *feel* on their mobile; automated checks prove timing, wiring and absence of exceptions, not subjective quality.

---

# SKYSHIFT 0.4.9.4 – Boost Punch & Camera Catch-Up

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

- Five existing one-use boost pads now target **1.40× normal speed** (+40%, previously +30%) using the same 0.15s attack / 0.23s release / 0.92s duration, unchanged location/steering/road geometry.
- On boost activation the camera briefly falls behind the faster Manta Blade for **0.36s** (follow response 2.8), then accelerates to catch up over **0.52s** (response 13.8), returning to default response 10.4. The forward-axis distance behind the target is capped at **10m** during the effect to protect visibility and corner readability. Camera look smoothing shares the response, but player heading, lateral movement and collision are never modified.
- Boost HUD toast shows +40%; thrust plume normalization uses the actual configured boost rather than a hardcoded 30% scale. The flight audit records max camera trail and event count.
- New versioned `boost-v0494.mjs`, `trial-v0494.mjs`, `boost-chase-v0494.mjs`, `game-v0494.mjs`, `boot-v0494.js` keep 0.4.9.3 files available for rollback. Geometry, Manta Blade, 0.4.9.3 spectral wave, five boost positions and shader workload remain unchanged.
- New deterministic tests and real Chrome/WebGL & simulated Android touch/failure smoke. Tune perception using actual phone footage after checks.

---

# SKYSHIFT 0.4.9.3 – Spectral Balance & Refined White Core

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

Based on mobile video feedback, 0.4.9.2's white wave overexposed the road, muted Violet/Gold/Jade, and sometimes obscured the craft. This targeted shader balance pass reduces white-core half-width 5.6m→2.9m, white bloom half-width 19m→14m, core emission 1.52→0.72, and bloom emission 0.46→0.20. It caps neutral road diffuse mix to 0.60, gives the chromatic crest/halo more presence, and softens the white tint in rail LEDs, fog and twin engine lighting. All five spectral layers remain, with identical physical front timing (10/20/27s), 1,530m course, five boosts, Manta Blade, flight handling, 0.4.9.1.1 mobile bootstrap, no new geometry, draw calls or passes. New 0.4.9.3 Node and browser/WebGL/Android smoke tests validate integrations; real phone visual balance still needs user verification.

---

# SKYSHIFT 0.4.9.2 – White-Core Spectral Wave & Cinematic Energy

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

## Motivation

The 0.4.9.1 spectral tide was more colorful but lacked the dramatic white-hot seam visible in the actual Chroma Rush jump/duck mode (`chroma-rush/src/render/spectral-wave.js`). Mobile screenshots showed a large violet patch rather than a recognizably travelling energy front. In Chroma Rush, a thin near-white core, much wider light veil, secondary moving filaments and brief resonance are layered around one physical transition.

## White-Core Energy Architecture

- `zone-wave-v0492.mjs`: retains the approved 1,530m circuit, waves from behind at 10 / 20 / 27 simulated seconds, moving at 114m/s; base ±24m palette transition, subtle lateral refraction, 62m afterglow. New **5.6m half-width neutral white core**, **19m white bloom**, sparsely animated front-local filaments, restrained pre-wave horizon cue. The white core is white (not the current palette's pink or green).
- `premium-track-v0492.mjs`: blends **five compositional energy components** in the same existing physically-based road shader: color body, high-luminance white core, soft neutral halo, few fine filaments and afterglow. White emissive intensity is 1.52 (shader units) and bloom 0.46; the core is wider than a single low-FPS frame at normal 47m/s cruise. Guides and boosts remain baked into the road and no new energy wall/gate obstructs the flight path.
- `aero-barrier-v0492.mjs`: **exactly the same world-distance spectral functions** run along existing rail LED and chevron geometry. White core temporarily brightens rail paint and its alpha as it travels forward; nothing spawns off the track.
- `game-v0492.mjs`: existing two wing engine lights briefly lean toward neutral white on the real crest crossing; the fog has a subtle horizon-linked tint (only a few percent) so the wider world participates without a full-screen flash. Stage colours, Manta Blade craft and twin-engine trails remain intact.
- No extra scene lights, new meshes, particle emitters, post-processing passes, textures or collisions. Secondary filaments are suppressed via a shader uniform on devices reporting ≤4GB RAM; white core and halo **remain enabled at every quality**.
- Keeps the independent `boot-v0492.js` start/fullscreen/error recovery from 0.4.9.1.1 intact. Production has no flight test-hook; `?waveSmoke=1` deliberately holds simulation only for accurate Chrome screenshots of the centre of the crest.

## Verification

- `white-core-v0492.test.mjs`: white-core vs chromatic palette separation; world-distance timing and horizon cue; road shader energy and low-tier filament gating; rail coordinate/shader synchronization; 1,530m, 5 boost fields, original physics and independent Android bootstrap.
- `browser-smoke-v0492.mjs`: actual headless Chrome WebGL screenshots at the white-core crossing in Violet and Jade, Android landscape touch start, and simulated module-network failure/retry. Production must be manually tested on iPhone for perceived luminosity and frame pacing.
- Audit export `skyshift-zone-v0492-audit.json` includes white-core/bloom widths and power plus unchanged renderer draw call / frame-time fields.

**Playtest:** White line should remain visible when the wave moves through distant bends, even on mobile; ambient world should subtly respond, rails must light at the same physical position, and no raised object should resemble a hazard. Check whether 0.4.9.2 increases p95 frame time relative to 0.4.9.1.1 on the same phone. Favor shader simplifications (especially fine filaments) over increasing draws.

---

## Previous release – 0.4.9.1.1

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

## Reported failure

Samsung Android landscape screenshot of 0.4.9.1 shows the rendered HTML start menu, but tapping **START RUN** or **FULLSCREEN** has no effect. There is no visible error overlay or active game canvas. This indicates a failure/delay somewhere between loading the page and the game's listener initialization; a screenshot alone cannot identify whether the culprit is a failed Three.js module/CDN fetch, slow initialization, or a WebGL context exception.

Previously, the game ran `initScene()` **before** attaching the controls, while an HTML static module could fail during import before the game's own `try/catch` ran. The menu then remained visually attractive but inert. The prior desktop WebGL test could not detect this device-specific bootstrap failure.

## Changes

- `boot-v04911.js` is dependency-free, nonmodule JavaScript loaded from the bottom of the HTML **before** importing any game modules. Its capture-phase listeners keep START RUN and FULLSCREEN responsive during slow or failed module loading. Start on a slow device queues an automatic game start on readiness; an early user-gesture fullscreen request is issued immediately. Fullscreen works independently of 3D initialization.
- Dynamic `import("./game-v04911.mjs?v=0.4.9.1.1")` reports module/network failures via a visible `boot-state` panel rather than leaving dead buttons. A failed start changes the button to **FÖRSÖK IGEN** and retries on reload. Loading status appears if import takes time.
- `game-v04911.mjs` connects fullscreen and game input handlers **before** heavy `initScene()`, signals ready only after the renderer, track and start state have been successfully built, and reports startup exceptions back to the bootstrap as well as the original error overlay.
- On devices reporting ≤4 GB RAM through `navigator.deviceMemory`, disable WebGL antialiasing and limit render DPR to 1.35; newer devices keep the existing settings. Retry the renderer context without antialiasing/default GPU preference if the primary context creation throws. This is a startup-safety path only, not an optimization target for the old Samsung.
- The spectral color wave, rail shaders, four palettes, course, physics, ship, boost and camera remain unchanged from 0.4.9.1.
- Audit file `skyshift-zone-v04911-audit.json` and public page version 0.4.9.1.1.

## QA

- `mobile-boot-v04911.test.mjs` checks the early bootstrap, protected failure handling and stable physics imports.
- `browser-smoke-v04911.mjs` still renders and tests the violet and jade spectral wave in real desktop Chrome WebGL. It additionally creates an Android-landscape **touch** viewport and taps START RUN to verify the transition to active HUD, and deliberately aborts a module request in another mobile viewport to verify visible retry messaging and an available fullscreen button.
- These tests establish web browser-level behavior. Real Samsung/iPhone testing is still required to identify any device-specific GPU or CDN issue.

## Previous release — 0.4.9.1

**Playable URL:** https://hajjen-game.github.io/Hajjen/skyshift/

## Why this pass

The 1,530 m circuit, 6 big curves, Manta Blade and five boosts in 0.4.9 were received well, but the 12 m-wide wave read as a short recolor, not a memorable energy event. Chroma Rush's actual jump/duck renderer (`chroma-rush/src/render/spectral-wave.js`) provides a reference: gently irregular chromatic seam, a slim bright edge with broad veils, local player-crossing resonance, and light afterglow. Do not directly port 2D Canvas layers or its screen-space sweep to a perspective WebGL racer. Instead reproduce the choreography **inside existing Three.js shaders**.

The supplied mobile audit (0.4.9) reported three correctly timed waves but the final Arctic front crossed at 31.417 s with a 31.48 s finish, so it was nearly invisible. Average recorded frame rate was **22 FPS**, p95 frame duration 83.2ms (device not established). Hence no new draw passes, full-screen filters, rings, beams, particles, or new dynamic lights.

## Spectral shader architecture

- `zone-wave-v0491.mjs`: keep 1,530 m world-space arc-length waves at 114 m/s, 90m behind craft, launched at **10/20/27 s**; last wave now leaves roughly three seconds of final palette in a ~31.5s clean run.
- The front's smooth half-width is **24 m** (48 m total), versus 6 m half-width previously, providing about 0.72s of gradual passage relative to a 47 m/s ship. Three-layer look: broadened chromatic color body, slim soft luminous crest (~4.5m), and low-energy wake extending up to ~62m behind the moving front.
- Two small oscillatory lateral offsets produce a gently refracted moving leading edge; **one shared spectral GLSL function** controls both road and rail light coordinates. The physical front's progression is unchanged and does not introduce a new obstacle.
- `premium-track-v0491.mjs` modifies the existing indexed PBR road shader only, with **no added meshes, draw calls, decals, framebuffers or texture fetches**. Boost inlays and neutral, readable racing lines remain visible.
- `aero-barrier-v0491.mjs` attaches lightweight world-arc-length coordinates to the **existing** light-chevron geometry. Its existing MeshBasicMaterial receives a matching spectral onBeforeCompile shader. Both deck and rail share one front position, shimmer function, time and zone palette.
- `game-v0491.mjs` blends fog, sky and ambient neon accent across a wider area around the approaching front, rather than suddenly jumping to the new color when the HUD changes. The HUD still advances when the wave passes the ship.
- Without new particle or lighting objects, the two existing wing-engine lights briefly charge for **0.19s** before each wave and brighten up to +22% for **0.62s** after crossing, plus small engine aperture size response. They cannot change authoritative physics or shield.
- `SPECTRAL_FRONT_GLSL` avoids per-frame material rebuilding; color uniforms and front coordinates are updated in place with the fixed-time simulation.

## Palette harmony, adapted from Chroma Rush

Use SKYSHIFT-specific darker, metallic road pigments against strong luminous contrast: **Midnight** (ocean blue + cyan), **Electric Violet** (violet + magenta), **Solar Gold** (copper + golden yellow), and **Jade Surge** (deep jade + electric lime). These are curated pairs inspired by the original Chroma Rush `PALETTES` (`chroma-rush/src/core/config.js`) rather than copying 2D canvas colors directly. The long bright guide lines remain near neutral across the four stages, and gold booster inlays remain legible.

The original Chroma Rush implementation uses precomputed 64-step OKLab ramps. SKYSHIFT intentionally retains GPU-native Three.js linear-color shader mixing instead of converting every road pixel in OKLab; this avoids a heavy shader and preserves existing PBR tone mapping. Only the color pair design and wave choreography were transferred.

## Testing & scope

- `spectral-zone-v0491.test.mjs`: verifies deterministic triggers (including 27s final), 48m color-transition width, charge, stage passing, post-crossing resonance, palette contrast, synchronized rail/deck GLSL, preserved route and speed, and unchanged draw-batch counts.
- `browser-smoke-v0491.mjs` captures both **Electric Violet** and **Jade Surge** using real Chrome/WebGL; a test-only fixed-time hook avoids conflating software renderer wall-clock performance with game time.
- Version and export: `game-v0491.mjs`, `skyshift-zone-v0491-audit.json`, active HTML `0.4.9.1`. Existing prior modules remain for fallback.
- No changes to `trial-v049.mjs`, `boost-v049.mjs`, Manta Blade geometry or twin trail logic, chase camera, track design, collision geometry, or controls.
- GitHub Pages guard validates live HTML and game module separately after main merge.

**Device playtest:** Compare the same iPhone across 0.4.9 and 0.4.9.1: perceptual clarity of spectral seam in each curve, physically synchronized rail accent wave, far-ahead color transformation, absence of distracting screen flashes, Jade visibly active for ~3 s before finish, and 95th-percentile frame time/CPU render cost. Unit/WebGL tests validate correctness but not final visual quality on a real device.

---

## Previous release — 0.4.9

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

## Intent

Three times the road length, but **not the old layout looped three times**. Preserve the tested Manta Blade 0.4.8.4, two-engine flight effects, pilot-directed steering, speed curve, guardrail physics and clean premium PBR surface. Add real-time color fronts like WipEout HD Zone Mode and CHROMA RUSH, without screen flashes or false hazards.

## Extended 1,530 m circuit

- `trial-v049.mjs` is the authoritative physics/route: exactly **1,530 m**, **13 connected authored pieces**, **6 major corners** rather than the old 510 m / two corners. The first 424 m is geometrically and mathematically preserved, then a very long Horizon straight, a wide left orbital bend, Vista straight, broad right bend, fast right arc, shorter left closing curve, and finish straight. All turns are genuine constant-curvature arcs with quintic-curvature C2 ramps and no pen-like micro-wiggles.
- Four *new* road straights have been authored for real boosts. `boost-v049.mjs` has 5 single-use 30% boost inlays: original launch 22–40 m, and 536–558, 815–837, 1080–1102, 1488–1508 m. Each is on a real straight with guardrail clearance, and matches visual pad coordinates in the road shader.
- New checkpoint positions and the finish arch at 1,523 m. The camera preview is unchanged and uses the updated 1,530 m future heading.
- New `smooth-track-v049.mjs` and `aero-barrier-v049.mjs` share the v049 authoritative track geometry. Deck sampling is 0.38 m and barrier sweep 0.70 m to control static geometry growth on a mobile phone while retaining continuous shared normals.
- Static road/beacon/ribbon draw batches remain constant in kind, but **total geometry is larger**, so phone FPS needs testing. No automatic speed increase is introduced.

## Zone Wave 1.0 — behind-to-ahead

- `zone-wave-v049.mjs`: triggers at fixed **10 s, 20 s, 30 s** in **flight simulation time**, not wall clock; pauses do not trigger waves. Each front spawns **90 meters behind** the ship at trigger time and advances forward at **114 m/s world arc-length** until it passes the ship and continues toward the horizon.
- `premium-track-v049.mjs` updates only shader uniforms (three front positions + stage count); the existing indexed PBR road is rendered **without rebuilding the geometry** and no new road draw layers.
- The shader blends the **base, side-band, guide-line, accent, and boost** colors over a subtle 6 m transition band. Small near-crest material brightness communicates the wave but avoids bright 3D gates, HUD-wide flashing or fake obstacles. Every curve naturally follows longitudinal distance along the authoritative mesh.
- Palettes: Midnight blue-green → Violet Velocity → Solar Flare (warm coral) → Arctic Flow (icy mint). World fog, sky, guardrail accents and engine lighting follow the palette after its wave passes the ship, smoothly rather than all at once.
- HUD zone number and name update when each actual front passes the craft. The zone label is not incremented just because a timer started. No full-screen `zone-flash` activation.

## QA & instrumentation

- `extended-zone-v049.test.mjs` verifies old-start geometry parity, all 6 bends and their C2 boundaries, no gaps, shared 1,530m road and rails, five real straight boosts, 10/20/30 triggers, 90m behind origin, world-space front timing, palette shader uniform identity, no new road meshes, and live 0.4.9 page dependencies.
- `browser-smoke-v049.mjs` runs real Chrome/WebGL long enough to check that **the first color wave actually reaches zone 02 after 10 seconds**, and captures screenshot artifact.
- `skyshift-zone-v049-audit.json`: length, six curves, full boost stats, wave launch/passed stages and their time/front coordinates plus renderer FPS/draw-call metrics. Old source code stays intact for rollback.
- GitHub Pages guard checks the *live public entrypoint and module*, not just git source, after merge.

**Real-device review:** Check iPhone frame pacing over the 1,530m run, the spatial wave actually moving forward through the bends, stage colors through 10/20/30, unobstructed view of road, five pads, and gradual environment shift. No claims of final visual quality until in-phone video confirms it.

---

## Previous release — 0.4.8.4

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

## 0.4.8.3 feedback and fixes

The player liked the new manta concept, but in banked turns it looked too organic/soft. The apparent blue glow and speed wake came from near the center of the craft rather than the twin wing-mounted exhausts. The user requested sharper shapes and subtle speed lines at regular pace with visual capacity for stronger later speed stages.

## Manta Blade / Interceptor Cut

- New **`manta-blade-v0484.mjs`** builds on the manta identity rather than swapping to a conventional interceptor: hard-cut forward blade corners, clipped outer shoulders, more angular stern edges, new shallow graphite cut panels and smaller precise cyan tips.
- The central body now uses an **eight-corner faceted ring** rather than ten, and hull/wing/canopy metal uses **flat shading** to reveal hard structural cuts. Dimensions and maximum wing width remain **±2.90m**.
- The pair of actual exhaust socket coordinates **(-1.99, 0.035, 2.52)** and **(1.99, 0.035, 2.52)** is exported and used by both the ship builder, engine lights and twin trail emission, preventing aesthetic/physical mismatch.
- The former long central luminous keel is now a tiny inset component. The old single **2.6-strength point light at x=0** is replaced by **two shorter-range wing-local lights** at **42% per engine** of its original intensity. This adds one point-light versus 0.4.8.3, but keeps total nominal intensity lower and replaces the center spotlight with two localized pools. Validate on iPhone.
- Thruster apertures now actually pulse in size (including X and Z radius on local rotating cylinders); a small controlled bank asymmetry and boost emphasis give the engine more life.

## Twin Engine Trail Language

- New **`engine-trails-v0484.mjs`** replaces the old 0.4.5 world-space line effect. That older effect placed its strokes at only **±0.78m**, inadvertently reading as a single middle wake. Now both emitter coordinates are the **actual two wing exhaust locations ±1.99m**.
- Two narrow, gently tapered **two-stage ribbons** are parented to the craft's local transform. They inherit every cosmetic bank/pitch/yaw, without changing the authoritative steering or camera.
- Normal 44m/s speed yields ~**2.6m** streaks and low **0.25** alpha. During +30% boosts they grow toward **6.4m** at current speeds, with brightness capped below **0.43**. Each ribbon fades toward the tip rather than ending as a neon bar. A subtle wingtip shimmer reacts to boost and banking.
- All trails are emitted by a **single prebuilt mesh/dynamic vertex buffer**, with no per-frame geometry allocations, particles, rings or new textures. Existing landing slash effects remain.
- The audit export `skyshift-manta-v0484-audit.json` reports twin-light sockets, base/max trail lengths, peak rendered trail length/opacity and existing performance, steering and boost diagnostics.
- Extra-high-speed visual tiers and full color waves remain intentionally for later versions: 0.4.8.4 is restrained at today's 44–60m/s.

## Scope / QA

- `game-v0484.mjs` retains `trial-v048.mjs`, `premium-track-v0482.mjs`, `cinematic-v045.mjs` and `flight-motion-v044.mjs`. Track geometry, guardrail collision, boost pads and user steering are unchanged.
- `hard-edge-v0484.test.mjs` covers wing triangulation and collision width, actual sockets, normal/boost trail envelope, paired ribbon buffer coordinates, legacy center-spot removal and preserved handling.
- `browser-smoke-v0484.mjs` validates real Chrome/WebGL rendering and takes a screenshot in GitHub Actions.
- The Pages guard verifies both the **public HTML and game JS** after merge; code tests alone do not establish live availability.

**Playtest focus:** Check the two separate glows/trails behind the wing motors instead of one blue center spot, especially in banking screenshots. Ask whether the harder outline reads at phone size and whether the short base streaks are visible but not distracting. Compare iPhone FPS against 0.4.8.3. This visual pass should not modify steering, camera, geometry or boosts.

---

## Previous release — 0.4.8.3

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

## Concept choice

The user specifically preferred **Manta Blade** over the previously proposed Split-Tail Interceptor. Despite the repeated Split-Tail wording at the end of the implementation request, Manta Blade is the explicit selected concept and the only active design for 0.4.8.3. It borrows a small open-aft cutaway from the broader design exploration but its primary language is a **single, wide, low-profile manta-like antigravity wing**, not a conventional jet plane or a forked interceptor.

## Identity, silhouette and structure

- **Wing-first geometry**: `manta-blade-v0483.mjs` builds a broad 5.8m-span shape with two sweeping blade lobes. Each lobe is a solid, concave, ear-clipped outline, not a flat rectangle or generic airplane wing.
- **Readable rear view**: The short central fuselage stops at **z=1.36m**, while two swept-back wing tips reach **z=2.62m**. This creates a scalloped/open-looking trailing silhouette in the exact chase-camera view the player sees most of the time.
- **Compact center keel**: A sculpted, thin central hull is built from 8 longitudinal stations, with a low curved canopy. Materials: satin titanium, dark graphite wing channels, tinted teal glass and restrained cyan tip details.
- **Twin integral exhausts**: Two small venturi thruster housings are fitted into the aft wing lobes, with existing glow-material aperture meshes. A narrow central luminous keel replaces the third big bright circular exhaust, maintaining the previous engineCore animation handle.
- **No new dynamic lights**: The existing single engine point light and the two enginePlumes / engineCore animation hooks remain active. Static mesh data is generated only once and stays below the 650-triangle budget for the three main custom shells.
- **No collision changes**: The maximum outer wing span is ±2.90m, within the existing craft collision half-span. Original steering, camera position, ship roll/pitch, boost pads, guardrails and 0.4.8.2 track spine remain exactly as before.

## Scope and QA

- `game-v0483.mjs` uses `buildMantaBlade(THREE,shipGlow)` instead of the old `buildPremiumShip`, without modifying the flight simulation.
- `skyshift/index.html` loads `game-v0483.mjs?v=0.4.8.3`.
- `manta-blade-v0483.test.mjs` verifies mirrored concave wing triangulation, unchanged collision span, distinct rear silhouette, paired engine animation handles and preserved physics.
- `browser-smoke-v0483.mjs` launches the actual game in Chrome / software WebGL, captures a screenshot and fails on shader/script/runtime errors. CI captures the screenshot as a GitHub artifact.
- `skyshift-manta-v0483-audit.json` adds the design identity and still records all flight, boost and performance metrics from the preceding version.
- GitHub Pages release guard must verify the public index and live game module after merge.

## iPhone review

Evaluate the actual rear silhouette at s≈100m and s≈300m: does the wing-first manta shape read instantly when the craft banks? Are the two extended aft fins, graphite inset areas and recessed vents clearer and more distinctive than the old "Astra Needle" conventional plane? Ensure the wider, flatter appearance stays centered and does not obscure the centerline/boost fields. Visual taste still needs real-device confirmation—code/Chrome tests alone cannot establish art quality.

---

## Previous release — 0.4.8.2

**Live:** https://hajjen-game.github.io/Hajjen/skyshift/

## Why this pass

Review of the 0.4.8.1 phone video showed the new cohesive PBR road surface working well, but the tiny box-and-cone prototype craft no longer matched the road's quality, and the wide dark central strip could benefit from a subtle speed reference. Preserve the camera and flight feel the player likes.

## Sculpted "Astra Needle" racing ship

- `premium-ship-v0482.mjs` builds a purpose-designed low, tapered center hull from **eight joined axial cross-sections**, with shared indexed vertices and smooth surface normals, no rectangular main body or primitive cone nose.
- A second **solid, swept double-wing structure** (matching top/bottom and closed edges) provides a purposeful compact craft silhouette, rather than flat overlapping wing stickers.
- A longitudinal canopy shell with six shaped stations replaces the glass box. Satin ice titanium, graphite shoulder channels, darker canopy and subdued cyan light tips form a deliberate, cohesive palette.
- Two recessed circular engine exhausts sit inside dark tapered nacelles, with a subtle center engine bridge. Reuse the existing `shipGlow` material and return **the same `enginePlumes` and `engineCore` animation handles** to `game-v0482.mjs`. Reuse the existing single engine point light—**zero new dynamic lights**.
- The old large extraneous decorative lines and mechanical box parts are not carried forward.
- No changes to position, heading, steering yaw, banking spring, boost, guardrail collision, shadow logic or chase camera.

## Minimal segmented track spine

- `premium-track-v0482.mjs` keeps the exact indexed 0.4.8.1 PBR road and shader placement.
- One subtle **center spine** is added as purely pixel-shaded road paint in the existing material: **11.5m repetition, around 8m of visible dash**, soft anti-aliased sides (about 0.15m full characteristic width), **23% of the guide tone**.
- It does **not emit light**, does **not create geometry**, and loses **80% strength over functional boost patches** so boosts remain readable.
- Existing long icy-white parallel guides, restrained teal bands, small panel seams, and subtle amber boost inlays stay untouched. The spine is intentionally a small speed-reference detail, not a new luminous stripe.

## Version / build integration

- `game-v0482.mjs`: activates new craft model and new road shader while retaining physics from `trial-v048.mjs`; exports `skyshift-ship-v0482-audit.json` with craft and spine metadata.
- `index.html`: points to `game-v0482.mjs?v=0.4.8.2` so the active page reflects the release.
- `premium-ship-v0482.test.mjs`: mesh index validity, symmetry and bounds, canopy/profile quality, linked engine animation, absence of primitive geometry, narrow/low-contrast shader spine and unchanged physics.
- `.github/workflows/skyshift-tests.yml`: includes the historic tests and 0.4.8.2 real browser WebGL smoke.
- Pages guard confirms deployed HTML and game module, not just GitHub contents.

**Phone review:** Examine craft shape from behind at the 0.4.8.1 camera angle, boost and bank sections. Confirm the cockpit reads as a coherent hull and the engines have depth rather than looking like floating neon blocks. The spine should be visible only close to the ship, barely noticeable at the horizon, and should not compete with boost markings. Compare iPhone FPS / draw calls against 0.4.8.1. If the spine remains too subtle, adjust shader contrast gently before widening it.

---

## Previous release — 0.4.8.1

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

## Why rebuild rather than tweak?

The user-approved 0.4.7 track and the 0.4.8 +30% boosts functioned, but 0.4.8's large, disconnected violet polygons and bright amber rectangles looked like stickers. They did not convey the architectural, saturated, lane-following material rhythm of the WipEout HD Zone Mode screenshots. This release **removes the detached decals entirely** and rebuilds the road's color language as a continuous, curved, physically based material with a single coherent palette.

## What changed

- **Shader-based road material:** New `premium-track-v0481.mjs` uses one indexed, shared-normal, 510m roadway geometry with custom longitudinal/lateral attributes. Lighting remains MeshStandardMaterial/PBR (metalness 0.52, roughness 0.38). A shader patch paints broad teal side fields, continuous icy-white racing guide lines, a very fine secondary lane spine and near-camera 12m panel seams **within the road material itself**. No extra floating band meshes.
- **Color is part of the roadway:** Longitudinal lanes always follow banked turns and remain visible far down a straight. Broad side bands gently change their strength over entire curve sections instead of abrupt diagonal triangles. Panel and guide details use restrained contrast to protect high-speed readability.
- **Embedded boost inlays:** Keep `boost-v048.mjs` and `trial-v048.mjs` unchanged; two genuine +30% boost fields stay at 22–40m and 447–465m. The shader reads these same start/end/lateral bounds, adds subtle warm amber tint in the road and thin amber/white speed-chevron outlines. No raised pads or screen-size orange slabs.
- **Material-only future palette changes:** Base, band, guide, secondary accent and boost colors are five shader uniforms backed by mutable Three.js Color objects. Changing colors does not rebuild the mesh and can support future zone transition waves, but **no actual zone animation** is implemented here.
- **Less visual obstruction:** Remove the giant in-world "HANDLING LAB" start billboard/gantry and huge curve signs. Keep a small finish gate/sign as an unmistakable race landmark.
- **Simpler rendering:** Remove three 0.4.8 overlay draw batches, the old centerline decal mesh, and the obstructive start structure. The premium top deck still uses one draw call. The shader does add per-pixel math, so actual iPhone GPU performance and appearance still require playtesting.
- **No handling regressions:** Preserve the 0.4.7 Aero-Barriers, 0.4.6 curve shape, 0.4.5 camera, 0.4.4 banking, 120Hz pilot-owned steering and the 0.4.8 boost timing.

## Implementation / QA

- `premium-track-v0481.mjs`: GLSL patcher and PBR material, integrated boost fields, material-color controls and shared indexed road coordinates.
- `game-v0481.mjs`: active game; adds the new material, removes the old `installZoneSurface` and debug-scale signs, updates version/audit filename.
- `premium-track-v0481.test.mjs`: checks geometry identity/continuity, shader injection, exact agreement between boost graphics and physics, no floating overlay calls and palette references.
- `.github/workflows/skyshift-tests.yml`: syntax and full legacy regression tests.
- `skyshift-premium-v0481-audit.json`: new version tag and material metadata with existing FPS, boost and rail safety telemetry.

**Important:** A passing source-code test cannot prove visual quality or compilation on every mobile GPU. We will verify the live GitHub Pages HTML *and the actual JS module* before reporting release. Review on an iPhone, with screenshots in the same banked bends as 0.4.8. The old version remains available as an archived entrypoint for rollback.

---

## Previous release — 0.4.8

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

**Optional Flight Lab:** https://hajjen-game.github.io/Hajjen/skyshift/?flightlab=1

## Intent

The 0.4.7 faceted Aero-Barrier and 0.4.6 curve shape are now approved for the time being. This release adds real integrated boost lanes on authored straight sections, plus highly legible, large-scale multi-color geometry on the deck. Influenced by the abstract/color-block visual identity of WipEout HD Zone Mode and the user's CHROMA RUSH / Chroma Circuit, but with original SKYSHIFT markings and a fixed starting palette. **No animated overall color-zone switching yet.**

## 1. Real boost pads and physical speed changes

- `boost-v048.mjs` is independent of Three.js. Two wide 18m boost pads span lateral positions **-4.6m to +4.6m** in straight sections: **s=22–40m** (launch) and **s=447–465m** (finish).
- When the craft is grounded, physically inside the pad, and has not triggered that pad before, apply a short boost ramp, target **+30% speed** for **0.92s**. Attack time constant **0.15s**, release **0.23s**, automatically returning smoothly to normal speed. Distinct pad IDs prevent multiple activations from the same pad.
- `trial-v048.mjs` is the active authoritative pilot simulation; only forward speed is varied. Curvature/heading/position helpers, 1.24rad/s maximum yaw, steering mapping, banked guardrail collider, 44–47m/s base speed, and 120Hz fixed timestep remain as in `trial-v046.mjs`.
- Real world-space translation uses `state.currentSpeed` rather than applying cosmetic speed lines without additional forward movement.
- The HUD speed display, camera field-of-view and existing motor trails react to actual current speed; an unobtrusive "BOOST +30%" status/toast and a small existing engine-light intensity increase give feedback without new particles or dynamic lights.
- Boost activation/count/peak actual speed/duration/distance are recorded in `skyshift-boost-v048-audit.json`. Best run time uses a new storage key to avoid comparison with pre-boost runs.

## 2. Large-scale zone-surface motifs

- `zone-surface-v048.mjs` is a Three.js-independent mesh-data generator with a minimal installer. It creates **eight sweeping violet band fields**, **three large direction-V fields**, and two inset **amber** boost pads with turquoise-white edge and chevrons.
- Violet/purple is an intentional contrasting secondary color against the existing deep blue track; amber is reserved for functional speed pads. Distinct graphic language ensures decoration does not look like an obstacle or an active boost.
- Individual band width **3.4–4.3m**, length **12–29m**, projected and banked with the same authoritative `positionAt` geometry as the physical deck. Designed to be readable in motion at 44–61m/s rather than scattered micro-decorations.
- Static geometry only, with **three batched draw layers** and no flash, screen pulse, extra point lights, extra bloom pass, timers, textures, or new physics colliders. Material opacity/zone tone chosen to limit bloom.
- `setZonePalette(patternHex,boostHex,accentHex)` recolors **materials only** in a future color-wave release; this version uses a fixed two-tone palette, not color switching.

## 3. Integration and performance

- `game-v048.mjs` is active, preserving `aero-barrier-v047.mjs`, `smooth-track-v046.mjs`, `flight-motion-v044.mjs` and `cinematic-v045.mjs`.
- `index.html` now uses `game-v048.mjs?v=0.4.8`.
- Old releases remain for rollback. No existing rail or track geometry is deleted, and the full 510m handling track is still present.
- Increased static geometry and 3 extra mesh draw batches need an **on-iPhone** FPS check; older Samsung performance is not an optimization target for this change.
- `boost-zone-v048.test.mjs` checks pads stay on straights, player physically accelerates, pads fire only once, collision/no-assist physics remain unchanged, frame-rate-independent boost recovery, large-pattern geometry budget, palette updates, and active-page wiring.
- Full CI syntax and regressions run via `.github/workflows/skyshift-tests.yml`.

## Playtest focus

Check that the first pad can be hit by staying roughly centered on the opening straight; that a short, unmistakable acceleration occurs but fades before the first big bend; that the last pad boosts onto the finish straight; that graphics feel large/graphic and complementary rather than hazardous or busy; that the 0.4.7 rails remain premium. Record iPhone frame pacing and export `skyshift-boost-v048-audit.json`.

---

## Previous release — 0.4.7

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

**Optional Flight Lab:** https://hajjen-game.github.io/Hajjen/skyshift/?flightlab=1

## Visual design objective

The 0.4.6 screenshot feedback was positive on the smoother ribbon course, but the rails looked like thick colored luminous tubes. This pass replaces those rails with deliberately faceted metal architecture: a continuous road-side sweep, angled graphite wall, broad flat cap, distinct recessed channel, very thin inset LED, and sparse direction chevrons concentrated in the bends. The surface is restrained rather than busy. The art direction is informed by the structural design language of futuristic racing tracks but is original to SKYSHIFT.

## Geometry / rendering

- `aero-barrier-v047.mjs` replaces `identity-v046.mjs` on the active page. The old module and build remain available for rollback.
- **Eight-vertex angular cross-section** (was 5), with a 1.36m gradual road shoulder, sharp armored inner face, chamfered corners and broad flat cap. Height remains **0.78m**.
- **A dark recessed channel** is laid along the cap, with an **inset LED 0.035m wide** instead of the large continuously glowing rail profile.
- Panels include graphite seam engravings every **16m**, restrained low-side latch cuts, and large double-chevron inlays through appreciable curves (rather than equal chevron density everywhere).
- The accent material is isolated from the dark metal and seams: `updateAccent(color)` recolors only the small LED and chevron/shoulder inlays. No animated zone transition is introduced in 0.4.7.
- **Three batched draw calls**: indexed shared-vertex structural body, dark inset grooves/panel seams, and color-reactive light inlays. The redundant old underside trim from `game-v046.mjs` is removed to offset the additional batch.
- All mesh data is generated once at build time. This pass adds no particle effects, new postprocessing passes, or dynamic lights; the angled body is slightly more geometrically detailed than 0.4.6 and should be tested on device.

## Handling and safety

- Uses the exact **`trial-v046.mjs` collision constraints**. Pilot-owned position/heading, 44–47m/s speed, guardrail contact limits, banked/curvature-continuous course, 120Hz simulation, and non-magnetic containment remain unchanged.
- Keeps the 0.4.5 cinematic camera and 0.4.4 bank/hover response.
- `game-v047.mjs` exports `skyshift-track-v047-audit.json` including panel counts, accent width, body/detail triangle counts, FPS percentiles, and prior guardrail contact metrics.

## QA

- `aero-barrier-v047.test.mjs` verifies angular profile, seamless bends, geometry budget, curve-only chevron placement, separation of color-reactive inlays from non-reactive metal, and unchanged piloting/collision behavior.
- Existing historical tests continue to validate archived builds, with active-page assertions updated to 0.4.7.
- `.github/workflows/skyshift-tests.yml` includes the new files and full regression suite.

**Playtest priorities on iPhone:** does the rail now read as a low, integrated METAL safety wall rather than a pipe? Can you still see the corner through the new faceted profile? Is the cap line thin enough? Are panel seams and chevrons elegant rather than flashy or obstacle-like? Compare frame-time telemetry to 0.4.6. Camera and physics have not been changed.

---

## Previous release — 0.4.6

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

This pass targets the user's screenshots of visible angular transitions and their request for genuinely protective, visually elegant Wipeout-like raised edge rails and carefully restrained surface design before implementing spectacular future color transitions.

## 1. Curve flow and surface continuity

- `trial-v046.mjs`: replace linear curvature ramps with analytic **quintic smoothstep** curvature ramps. The entering and exiting curvature now has zero first and second derivatives at joins; integrated heading stays continuous. Straights and circular-arc plateaus are preserved.
- Lengthen each curve entry/exit from 20m to **30m**, keeping the same overall 510m route and maximum turn curvature. This softens the visual entry/exit; it slightly reduces each curve's total deflection.
- `smooth-track-v046.mjs`: one indexed continuous top ribbon at **0.30m longitudinal spacing**, **7 lateral columns** (was 0.45m and 5). The banked collision surface, edges and camera all follow the **same** new heading/bank model.
- The centerline remains simple, and the track avoids noisy tiling or many small false curves.

## 2. Real raised guardrails

- `identity-v046.mjs`: add two **0.78m high** sculpted edge rails with shared longitudinal vertices, dark titanium-toned material, a restrained lit cap and chevron precision inlays.
- Physically contain the ship on either side: world position is clipped at the collision boundary only when the craft strikes the rail. The boundary includes the approximate craft half-width and rail shoulder. This prevents accidental off-track falls and protects the previous steering feel.
- Rail collision **never changes pilot yaw, steering input or forward speed**. There is no invisible road centering or constant auto-steering. A player intentionally steering into a guardrail may continue sliding along it, rather than turning automatically.
- Flight logs include **rail contacts, contact seconds and maximum attempted penetration**. Only the new contact event is emitted, avoiding per-frame log noise.

## 3. Surface identity and color-zone groundwork

- One batched mesh for continuous raised edge bodies; one batched mesh for lit caps, low-profile shoulder markings and chevrons. Broad road center remains uncluttered.
- Small racing inlays on the rail face and interrupted shoulder stripes support speed reading. Accents have a common color-controlled material, so future color transitions can recolor them coherently.
- The 0.4.6 build **does not yet contain animated zone color switching**, as that is a separate feature. Future wave anchors are exposed from the track identity data.
- Three old free-floating neon rim passes have been removed; new body/markings require two batches. Extra geometry is precomputed once rather than regenerated each frame.

## 4. Protected flight handling and QA

- The trusted 0.4.5 cinematic camera, 0.4.4 motion response and 44–47m/s 120Hz steering dynamics are retained unchanged.
- Added `track-flow-v046.test.mjs` for C2 curvature joins, no seam positions/banking, shared vertices, guardrail collision/non-magnetic control, high-speed containment and future-color anchors.
- Historical version logic is retained and all affected active-page expectations now refer to 0.4.6.
- `.github/workflows/skyshift-tests.yml` runs the complete regression suite and syntax checks for the new modules.
- Export `skyshift-track-v046-audit.json`. On iPhone, inspect both corner transitions, guardrail feel and pattern readability, and compare average FPS / frame-time percentiles to 0.4.5.

**Known limitation:** This remains the 510m handling track, not a production race circuit. Guardrail impacts are protective constraints, not full rigid-body vehicle collision/bounce physics. Final judgment of visual quality and handling requires a real-device playtest.

---

## Previous release — 0.4.5

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

**Optional flight tuning:** https://hajjen-game.github.io/Hajjen/skyshift/?flightlab=1

## Intent

Building on the user-approved SKYSHIFT 0.4.4 handling feel, this release improves perspective, speed readability and lightweight engine/body movement. The underlying 0.4.3 course and manual flight physics are deliberately unchanged; visuals must never magnetize the craft toward the track. The user's 0.4.4 Samsung log showed 29fps average and 66.6ms p95 frame time despite 120Hz simulation stability, so this pass avoids new dynamic lights, postprocessing layers, or meshes per frame.

## Changes

- **Closer / lower chase camera:** default distance **13.8m** (15.2m previously), height **7.8m** (9.5m previously); look-ahead **36m**. Keep the fixed-step flight and existing small horizon roll.
- **Bounded corner anticipation:** camera looks toward upcoming curvature sampled **40m** ahead; capped to **±0.12 rad (~6.9°)** with frame-rate-independent smoothing. It only biases the look target, **not** camera world position, ship yaw, lateral position, collision or speed. On straight sections the preview is zero.
- **Controlled motion weight:** existing hover/bank from 0.4.4 remains. Small cosmetic nose yaw is capped at **±1.9°** and is independent of authoritative world yaw.
- **Engine/load response:** reuse the existing engine light and plume meshes, vary their intensity and scale subtly based on yaw rate and steering; adjust the two existing engine trails in world-space to match visual hover and banking. No new draw calls required for these changes.
- **Allocation cleanup:** reuse trail bounding sphere and impact material color instead of allocating these every frame.
- **Frame-rate resilience:** smooth time constants use closed-form exponential updates; no new simulation forces.
- **Optional live tuning panel:** use `?flightlab=1` to tune camera height/distance, corner preview and engine weight alongside existing flight sliders. The regular UI remains uncluttered.
- **Flight audit:** export `skyshift-flight-v045-audit.json`, including preview, max cosmetic yaw, peak engine response and configured camera values.

## Changed files

- `cinematic-v045.mjs`: pure camera anticipation, chase pose, bounded weight curves and diagnostics.
- `premium-v045.mjs`: reuse original trails and materials with more faithful exhaust positions.
- `game-v045.mjs`: the active 0.4.5 game, same `trial-v043.mjs` handling and `flight-motion-v044.mjs` banking.
- `cinematic-v045.test.mjs`: turn preview, no-assist invariants, camera dimensions, capped engine/nose motion, FPS invariance and active site checks.
- `index.html`: current release.
- `.github/workflows/skyshift-tests.yml`: include new module syntax and test suite.
- Historical test files updated only where they assert the active HTML asset version.

## Phone playtest

Compare 0.4.5 and 0.4.4 on the iPhone, especially the entry to each long bend. Confirm that the craft is larger and the camera looks earlier into the curve without exaggerated swinging or undesired steering correction; engine response should remain subtle. Capture a short video and the 0.4.5 flight audit. This build intentionally leaves the 510m calibration track in place—jumps, weapon systems and full-sized courses are separate future work.

---

## Previous release — 0.4.4

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

**Optional flight-tuning panel:** https://hajjen-game.github.io/Hajjen/skyshift/?flightlab=1

## Intent and safeguards

The 0.4.3 handling lab fixed the slippery feel and doubled the forward speed. This pass adds a more expressive flight *presentation* while keeping the 0.4.3 pilot-owned world position, yaw-rate steering, 120Hz physics, road collision and uninterrupted track mesh intact. This prevents visual polish from accidentally creating steering assistance, sideways inertia or lane magnetism.

## New flight motion

- **Steering-based roll:** up to 19° pilot-derived lean, combined with 78% of actual road bank and clamped to ±33.2°. An analytic critically-damped spring gives fast turn-in and a slower, non-wobbly release.
- **Hover suspension:** independently damped visual height offset, under 11cm, reacts subtly to turn load and lateral motion with a tiny idle variation. Collision height and jump/fall rules remain authoritative and unchanged. This is deliberately not a new physics hover integrator.
- **Pitch:** subtle nose-down response to turn load, preserving vertical velocity response for possible future jump courses.
- **Inertial chase camera:** smoothed craft heading, coherent camera-position/look-at response, restrained camera roll (<2.3°), recycled vector buffers to reduce per-frame allocation.
- **Time integration:** rate-independent damped springs sample the same interpolated 120Hz pose as the rest of the renderer. Pause freezes the flight spring state, checkpoint resets it; large frame steps are capped.
- **Live tuning lab:** append `?flightlab=1` to enable six sliders for banking, spring response, hover travel and camera following. The normal game UI remains unchanged.
- **Audit:** export `skyshift-flight-v044-audit.json` with active tuning and peak visual bank, pitch and hover metrics.

## Code and tests

- `flight-motion-v044.mjs`: isolated renderer-neutral spring and camera motion engine.
- `frame-pacing-v044.mjs`: retains 0.4.3 pacing with interpolated yaw-rate and lateral velocity.
- `game-v044.mjs`: active gameplay integration and opt-in tuning UI.
- `flight-motion-v044.test.mjs`: steering bank, spring stability, neutral recovery, hover, camera, unchanged authoritative handling, frame interpolation and active-page checks.
- `speed-v043.test.mjs`: old implementation assertions retained, with the expected active page updated.
- `.github/workflows/skyshift-tests.yml`: syntax/logic checks for both 0.4.3 and 0.4.4.

Run `node --test skyshift/flight-motion-v044.test.mjs skyshift/speed-v043.test.mjs` to verify core checks.

**Mobile playtest priorities:** Is a partial steering input visually readable? Does it settle without wobble? Does the camera feel stable when changing direction quickly? Is hover subtle rather than floaty? Check with and without the optional tuning panel, then export the audit. Automated tests cannot determine whether the feeling is premium on a real phone.

---

## Previous release — 0.4.3

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

This is a focused technical pass on the 510-metre Handling Lab. The user confirmed that the manual ship controls are no longer notably slippery but reported visible stutter, transverse lighting bands in the road, and the desire for roughly twice the forward speed. The former 0.4.2 code and longer 0.4.1 trial remain in GitHub for rollback/comparison. Other games are untouched.

## 1. Double speed, same basic radius

- `trial-v043.mjs` scales speed from **22–23.5 m/s** to **44–47 m/s**.
- Maximum yaw rate scales by 2× (0.62 → 1.24 rad/s); response and release constants increase to stay responsive over the doubled distance traveled each second.
- The authored course is still exactly five elements: 95m straight, genuine constant-radius banked left, straight, genuine constant-radius right, finish straight. No jumps in this steering-only lab.
- The craft owns its world position and heading. None of these changes bring back road following, lane recentering or synthetic turning forces.

## 2. Rebuild road as ONE shared-vertex surface

- `smooth-track-v043.mjs` samples the centerline every **0.45 metres**, using 5 vertices across its width.
- Instead of generating independent 0.8m top-surface triangles and shading each face separately, it builds **one indexed, contiguous deck**. The render engine computes normals across shared row vertices.
- Physically hard-edged vertical sidewalls remain a separate mesh. Thin neon guardrails, centerline, banking, checkpoint signs, collider and route shape retain their established roles.
- The change fixes the *structural cause* of transverse per-segment lighting seams. It does not guarantee visual smoothness until playtested.

## 3. Fixed-step physics and interpolated rendering

- Physics is still authoritative at **120Hz**. Renderer samples a pose interpolated between the previous and current fixed physics steps.
- Ship, chasing camera and engine trail feed from the *same* interpolated world pose, not three differently timed positions.
- Checkpoint teleport/respawn is recognized and rendered as a snap; interpolation must not visually slide the ship hundreds of metres.
- Long frame delays are explicitly tracked. No hidden automatic course correction is added.

## 4. HDR compositing and performance

- Default is **full quality up to 2× device DPR** and the exact 0.3.2 neon/bloom hierarchy.
- When **90+ recent samples** indicate prolonged slow frame times (95th percentile over 27ms AND a similarly slow median), the **offscreen** EffectComposer render resolution can fall from 2 to 1.75 to 1.5, with a 9s cooldown. The visible canvas and HTML HUD remain at native quality. Fast devices remain at full settings, and resolution can recover after sustained fast frames (p95 under 17ms).
- This is workload adaptation rather than a permanent global reduction for older hardware; no device model is singled out.
- The audit now reports **real frame-duration average FPS** (not arithmetic per-frame FPS), minimum observed FPS, p95/p99 frame times, renderer CPU-call timing (not true GPU timing), simulation steps, dropped simulation time and HDR internal rendering DPR.
- Logging of renderer draw calls/triangles remains indicative, not an absolute GPU load metric.

## Changed modules

- `trial-v043.mjs`: twice the speed, matched steering authority.
- `smooth-track-v043.mjs`: continuous indexed roadway deck.
- `frame-pacing-v043.mjs`: deterministic fixed-step scheduler, visual interpolation, frame diagnostics and adaptive HDR ratio.
- `neon-v043.mjs`: unchanged original HDR renderer with an opt-in internal render-target DPR adjustment.
- `game-v043.mjs`: active 0.4.3 game, road geometry and animation/render integration.
- `index.html`, `style-v043.css`: active version and label.
- `speed-v043.test.mjs`: geometry, pacing, speed scaling, camera/ship integration, adaptive quality and manual-pilot full-course tests.
- Existing versioned 0.4.2 and earlier files remain available.

## What to test on a phone

Play at least 2–3 full rounds. Check whether the transverse stripes on the banked road are gone, whether the ship/camera movement is smoother, and whether 2× speed feels good or needs compensation through wider tracks/longer curves. Export `skyshift-handling-v043-audit.json` to see FPS, p95 frame time, internal HDR resolution changes, off-road seconds and steer reversals.

Automated tests cannot prove that a device runs at 60fps or that the change feels right. If the graphics are still slow, the new separate frame/render metrics can help determine whether more targeted GPU optimization is needed.
