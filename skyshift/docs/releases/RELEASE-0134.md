# SKYSHIFT 0.13.4 — Stingray Silhouette & Hard-Surface Refinement

## Goal / exact art reference
The provided original Stingray EVO manta concept shows one coherent, extremely swept manta silhouette with a long low embedded black canopy, integrated twin engine shoulders, sparse violet/ice-blue trim and an elegant nine-joint segmented tail. In real 0.13.3 A51 screenshots the new model still looked like separately stacked elements, the cockpit stood vertically above the wing, the back engine nacelles looked glued-on, the graphite vents floated on top of the metal and the Hangar camera clipped the tail.

This release prioritizes underlying **3D geometry and the original visual concept**, not added particles, UI clutter or glow.

## What was committed and activated

**Pass A — Sweep and silhouette**
- V3 authoring source `blender/stingray-hero-v3-source-v0134.mjs` and actual deployed self-contained **`assets/ships/stingray-evo-hero-v3.gltf`** (a genuine glTF 2.0 model, not runtime-constructed triangles or a decorative texture).
- Wing half-span increases **3.78 → 4.04 m**. Smooth 17-station leading/trailing manta outline removes the sharp rear notches; the wing surface uses 15 chord stations rather than 11 with independent low wing and cambered top.
- Hull is redesigned as an integrated nose/central keel/aft tail-fairing from z −3.22 to +1.99.

**Pass B — Deliberate hard surfaces and more restrained materials**
- Two shallow **geometric pocket impressions** are part of the physical upper wing surface under each recessed graphite inset; shoulder and engine-fin art is reduced and better aligned to the body.
- Nine coordinated physically based materials kept, but slate wing brightness, cockpit glow and bright violet rim values are lowered to avoid the blown-out 0.13.3 Samsung hangar appearance.
- Fewer flourishes and thinner blade/telemetry strips. No added texture images, shaders, trails, lights or bloom passes.

**Pass C — Mechanical tail redesign**
- **Nine shaped elongated armor sections** with proud root collars, faceted top ridges and strong continuous taper; every plate is limited to the original 0.68 m hinge pitch and mounted in joint-local space.
- The original living spring/damped 9-link articulated Stingray tail remains authoritative. Zero replacement physics or additional animation controllers.

**Pass D — Cockpit / engine integration**
- The canopy is a **longer, lower** smoked glass teardrop: z −2.78 to +0.69, upper crown **around 0.73 m** versus ~0.96 m before, physically following the lower center spine.
- Two nacelle housings begin further forward inside the swept wings, become fuller by the rear and align to the original **x = ±1.99 m** thrust sockets. Both existing motor effects remain.
- Reacting wing flaps, GRIP authority, white-core zone transitions, physical rail scraping, boost, magnetic wall and corkscrew remain unchanged.

**Pass E — Hangar full silhouette**
- Ship-local stable three-quarter camera is backed away: eye `[3.50, 4.10, 13.50]`, look at `[-5.0, 0.15, 1.25]`, **50.5° FOV**.
- Unlike the prior extreme near-angle, the two wing tips, nose and last tail plate are projected fully inside the right-side Hangar showcase at 1536×690 landscape, away from the left menu and footer. This is verified by projection math in the test suite.
- **Two Hangar-only lights** are toned down: pale-cool key 0.68, violet rim 0.34 (formerly 1.15 and 0.70). They are disabled when in race. Manta keeps its own unchanged hangar camera.

**Pass F — In-race protection**
- V3 is now the actual default **only when Stingray EVO is selected**. Manta Blade remains unchanged. No new main menu buttons or overlays.
- New model still rides on unchanged 120 Hz `stepFlight()`, speed/GRIP/boost and existing world track. Ghost and Time Trial logic unchanged.
- If the V3 model is missing/invalid the game gracefully falls back to the original procedural Stingray. Force the original with `?shipArt=classic`.
- The latest complete version is `game-v0134.mjs`, started via `boot-v0134.js` and `skyshift/index.html`.

## Technical budget / verification

| Characteristic | 0.13.3 | 0.13.4 |
|---|---:|---:|
| Wing half-span | 3.78 m | **4.04 m** |
| Canopy crown (approx.) | 0.96 m | **0.73 m** |
| Wing surface stations | 17×11 | **17×15** |
| Mesh draw batches | 34 | **34** |
| Model triangles | 3,356 | **4,184** |
| Materials | 9 | **9** |
| glTF file size | ~116 KB | **137,083 bytes** |
| Encoded geometry buffer | ~69 KB | **84,528 bytes** |
| Extra lights during racing / colliders / texture maps | 0 | **0** |
| Live tail joints | 9 | **9** |

The 10 new real-asset tests inspect the deployed file, curve/mesh geometry, low canopy, engine socket alignment, nine local tail plates, strict runtime budget, and projection-based full silhouette framing. Additional loader and UI tests protect default V3, classic opt-out, stale async switches, ghost menu and Fidelity navigation. A Chrome/WebGL smoke test is also wired into CI to require the new art and ensure showroom lights disappear in race.

**Honest remaining verification**: A deterministic glTF model has been generated and committed. The Blender `.blend`/binary `.glb` conversion is supported through `blender/convert_stingray_hero_v3.py` and the GitHub Actions Blender workflow; successful execution and publication have *not* been verified. Nor have the full Chrome/WebGL browser smoke and an Android FPS/visual playtest. The output is a detailed authored procedural sculpt exported as a static glTF asset, not a claim of manual Blender polish or art-director approval.

## Compare / test
- New V3 default: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4
- Original code-built ship: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4&shipArt=classic
- Optional Blender V3 GLB A/B once published: `?v=0.13.4&shipArt=blender`.
- In Hangar choose Stingray EVO; expected label **HERO 3.0 · REN ROCKASILHUETT · LEVANDE SVANS**.
- Check that full tail stays in shot, upper wing transitions are cleaner, low canopy no longer towers above the body and both motor housings appear attached. Then play race/boost/GRIP, inspect tail response and capture audit.
- On A51, monitor FPS and P95 under same Fidelity conditions versus 0.13.3. More triangles could cause an FPS change despite the same number of materials/draw batches; do not claim measured performance gains.
