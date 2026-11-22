# SKYSHIFT 0.28.9.3 — Premium Arch Optics & Chromatic Road Reflections

## User-requested scope
One meaningful pass for priorities 1 & 2 together: improve the EXISTING curved portal arch glow, and make its actual zone-wave palette illuminate the SAME indexed road physically. Priority 3 is **diagnostic-only**: compare the legacy additive floor response on/off; do not destroy earlier Skyline artwork. The more invasive lighting-source consolidation (priority 4) is deferred.

## Starting point
SKYSHIFT 0.28.9.2 is the rollback reference. The 0.21.1 `Tunnel / INTEGRATED_LIGHT` batch holds the original curved arcs *and* continuous wall guides; `Tunnel / HALO` holds the arch halo (High). They are basic emissive geometry; physically modeled GGX applies on nearby physical metal but there is no per-arch palette-true direct specular contribution to the Vault road. The 0.21.2 `Tunnel / NEON_ROAD_RESPONSE` additive surface is an older independent effect. The upper/cove cyan and low straight-only cyan geometry must not be conflated.

## Implementation
- Single shared code component: `premium-arch-optics-v02893.mjs` operates on **original Skyline source meshes** reused in Vault's ten 340m modules. The current live release applies the enhancement only to `?track=vault&v>=0.28.9.3`, leaving Skyline's approved default appearance unchanged until separately reviewed.
- Per-vertex source mask upgrades only the curved `INTEGRATED_LIGHT` portal quads: the subsequent wall-guide portion of the same mesh remains unchanged. The old core mesh and native `tunnelSpectrumTint()` / global wave stage are retained, without overlaid duplicate bars.
- Existing High-quality `HALO` batch is rebuilt *in place* into a tapered four-slice soft profile, preserving each original banked quad's exact endpoint and color/wave attributes. 4GB source stays on the existing simpler no-halo mode. No new draw batch.
- Original road's 0.28.2 3400m indexed PBR material receives real view-space vectors sampled at the **same lower j6 portal-arch geometry** the source renderer uses. These pass through **native Three.js RE_Direct GGX**, not fake lights or a global wet wash. The two sources are physically at the left and right arch; 4GB samples only the nearer side.
- One restrained **arch-local shoulder reflection**, peaked within ~9m around each real source portal, follows `ZONE_PALETTES[].light` and the same signed 66m traveling zone-wave front as the arch. For example, the pink fifth palette colors both the visible arch and its local floor glint.
- Protected: native road graph/boost/white core, exact 0.28.9.1 straight-only cyan mask, 0.28.7 connected amber arch feet, 0.28.9.2 new ceiling seam fixtures, original metal PMREM, road roughness and metalness, static geometry, physics, GRIP, rails, ship and camera. No new dynamic scene lights, render targets, SSR, SMAA/bloom stages.
- Exact same-build A/B `?archOptics=classic` disables both effects; `?archRoad=classic` only disables new floor color while keeping the new arch; `?archLegacyRoad=off` hides only the old `NEON_ROAD_RESPONSE` for diagnosis (default **ON**, unchanged).
- QA using `?archOpticsSmoke=1`: `__skyshiftArchOpticsAudit()`, `__skyshiftArchOpticsFrameProof()`, and QA-only `__skyshiftArchOpticsSetStage(stage,front)` for real cyan (0) vs pink (4) palette screenshots.

## Links
- Proposed new: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.3
- Previous 0.28.9.2 in same new runtime: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.3&archOptics=classic
- New arch, old floor: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.3&archRoad=classic
- Legacy floor layer OFF for diagnostic: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.3&archLegacyRoad=off

## Verification gate
- Node tests: source mesh count/mask, original wall guide unaffected, halo bounded geometry/alpha, original physical source sampler, palette-true same-wave GGX, High/4GB budget, old version and Skyline unaffected, all rollback modes.
- Real Chromium WebGL workflow: same-frame original vs premium screenshots, split arch-only and road-only, High/4GB, cyan/pink, bends and straights, historic rollback, legacy additive road diagnosis.
- Merge only after the source tests and current visual suite pass. In-game acceptance still requires comparison against the user's actual annotated reference.
