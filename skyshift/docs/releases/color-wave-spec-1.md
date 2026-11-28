# SKYSHIFT Color Wave Spec 1.0

Status: proposed implementation contract, awaiting visual approval; not a runtime release.
Baseline: main 01f1a8edfaabc5f5bd542d6424faf8c1945f3b66, 0.29.5.2 (approved Manta exhaust). Scope: shared tunnel palette, not ship art, geometry, gameplay or performance rearchitecture. First integration target: Vault; same role resolver can be reused by future tracks, not separate tunnel renderers.

## 1. Verified progression and current palette

Source: core/zone-wave-v060.mjs (8 triggers, 9 stages, one spatial front), core/zone-wave.mjs (9 frozen palettes). Runtime evidence from the player's previously uploaded performance audits (9), (12), (16), and (7): activatedStages and passedStages are [1,2,3,4,5,6,7,8]. Audit (16) reports transition times 18.708, 36.750, 54.783, 72.817, 90.875, 108.933, 127.117, 145.242 seconds, front 10434.16m, three launches and three landings. Historical baseline audit additionally records three laps, 10200m, finish 151.867s. These are sample runs, not a guarantee of nine zones for faster future runs. The scheduler caps at stage index 8. Stage index is zero-based; player HUD is one-based. Eight timed transitions also control speed: game-v0210.mjs calls setZoneSpeedStage on wave.changed. Do not change triggers, physics, speed multipliers, reset or lap behavior merely to introduce more colors.

| HUD zone | Existing name | Launch (s) | Existing light | Existing boost |
|---|---|---:|---|---|
| 1 | MIDNIGHT | 0 | #3FEEFF | #FFBC67 |
| 2 | ELECTRIC VIOLET | 18 | #C67AFF | #FFC579 |
| 3 | SOLAR GOLD | 36 | #FFC45A | #FFB75B |
| 4 | JADE SURGE | 54 | #9AE765 | #FFC773 |
| 5 | EMBER DRIVE | 72 | #FF769A | #FFBC63 |
| 6 | GLACIER FLOW | 90 | #7BE8FF | #FFBF78 |
| 7 | COPPER BURST | 108 | #FFBC76 | #FFD37F |
| 8 | PRISM TIDE | 126 | #B3A5FF | #FFCA79 |
| 9 | AURORA FINALE | 144 | #7EFFCF | #FFC274 |

Observation: all existing boost palette inputs are amber/gold variants; actual production boost and fixture shader colors must also be checked at integration. Several shared optical consumers currently select only ZONE_PALETTES.light; some connected amber feet and straight-only cyan inlays retain original authored colors (see sections 3–4). This explains why simply replacing the single light field cannot create a complete multi-role scene.

## 2. Proposed nine-zone color compositions

Color values are sRGB design inputs, not predicted rendered pixel colors. Use linear-light THREE.Color values for shader blending. Keep existing stage IDs (save/audit compatibility); proposed display names below are optional visual labels only. Main P dominates; secondary S is deliberately distinct; A is a sparing complementary accent, not an all-scene flood. Base D is a subtle near-black material tint, not a bright floor fill.

| HUD | Proposed theme | Primary P | Secondary S | Accent A | Dark substrate D |
|---|---|---|---|---|---|
| 1 | Arctic Cyan | #00E5FF | #356BFF | #FFB55A | #09212D |
| 2 | Electric Violet | #8A4DFF | #FF4FD8 | #3EEBFF | #1C1035 |
| 3 | Solar Flare | #FFB347 | #FF642E | #427BFF | #301710 |
| 4 | Volt Lime | #B7FF3C | #12CFA0 | #A86BFF | #10251B |
| 5 | Plasma Rose | #FF39A8 | #762DFF | #FFD24A | #2C1027 |
| 6 | Hyper Blue | #2979FF | #45F0FF | #FF865D | #101B38 |
| 7 | Inferno | #FF583D | #FFBD35 | #27E9DB | #301510 |
| 8 | Prism Shift | #B94DFF | #2BE8D0 | #FF5A94 | #241337 |
| 9 | Aurora Overdrive | #69FFD0 | #4566FF | #FF45D3 | #102C30 |

Design allocation: approximately 55–65% primary, 25–35% secondary, 5–15% accent by perceived colored-light area, not literal emitted watts. White/near-neutral road guides and white wave crest outside the allocation. Start with existing approved HDR gains; do not globally increase bloom/exposure. The design intent is strongly separated hues in each scene, not nine mono-color filters. In particular P and S need not share a hue, and fixed orange and cyan should not remain in every zone. P/S/A retain role identity throughout transitions; the same role must drive the actual emitter and its local reflection.

## 3. Component role contract

| Existing component | Role | Behavior |
|---|---|---|
| Main arch outline and primary wall/cove luminous bands | P | Follow spatial front; keep luminous white core where already present |
| Ceiling seam fixtures / secondary cove strips | S | Follow same front; retain physical fixture positions and HDR core |
| Straight-only lower rail / edge lights | S | Preserve original straight mask, no curved emitters |
| Amber wall/arch foot and warm accent fixtures | A | Replace fixed orange chroma; preserve connected L geometry, localized wall/road pools |
| Road surface tint | D | Subtle dark base; do not paint saturated full road; retain approved roughness/PMREM |
| Integrated lane guides | Neutral cool white (#EAF5FF) | Consistent readability, do not recolor to boost accent |
| Road/rail/wall local reflections and ship spill | Match source P/S/A | Same spatial coordinate and source ID; no independent color timer |
| Main boost pad | A, with neutral HDR core (#F5FBFF) | Same front; existing arrow geometry, pad footprint, gameplay trigger and readable white energy core retained |
| HUD zone identity | P | Switch on existing passed-stage event; functional shield/status cues remain semantic |
| Ship inlays | Fixed approved cyan | Preserve Manta identity and hull; no new model changes |
| Ship exhaust | P and existing neutral white core | Preserve accepted 0.29.5.2 plume shader/shape; use current stage/continuous shared sample, no independent palette |
| Existing engine point lights | P | Follow approved engine ownership, no new lights |
| Fog/sky | Derived from dark substrate, restrained | Preserve sealed interior darkness; do not flood tunnel with saturation |
| White transition crest | Fixed neutral #F5FBFF | Retain white-core width, existing bloom and no screen flash |

Safety/readability: GRIP HUD, shield health, warning/damage indicators and boost distinguishable by shape/white core; do not substitute decorative palette for gameplay status semantics.

## 4. Integration boundaries observed in main

- core/zone-wave.mjs and core/zone-wave-v060.mjs: canonical palette data and scheduler. Add a role-aware palette resolution in the existing shared core, not a second scheduler or per-track duplicate table. Preserve existing legacy fields/values for comparison routes; select the new palette at explicit release boundary. Maintain immutable numeric stage IDs.
- game-v0210.mjs: COLOR/themes, updatePalette, announceSector, engineFxFrame.sectorColor, audit.zoneSurface. Existing updatePalette distributes visualWave to all material owners; attach role selection there or pass a shared palette resolver in shared ownership. Preserve the existing player blend vs global spatial front distinction.
- tunnel/shared-tunnel-runtime-v0280.mjs -> tunnel/true-shared-tunnel-renderer-v0281.mjs: shared module ownership, actual connected amber feet, straight-only cyan edge strips, ceiling fixture integration and existing updateWave dispatch.
- tunnel/unified-tunnel-light-sources-v02894.mjs: sharedWaveColors02894 currently resolves ZONE_PALETTES.light; extend resolution by role and have source registry carry the role with source IDs rather than copying colors into separate modules.
- tunnel/shared-optical-assembly.mjs: installSharedRoadOptics orchestrates existing road/arch/cove/spill owners; tunnel/shared-road-ship-light-v0282.mjs, tunnel/premium-arch-optics-v02893.mjs, tunnel/road-spill-wave-coves-v02895.mjs and tunnel/ceiling-fixture-cohesion-v02892.mjs: propagate matching emitter roles through actual light-response shader uniforms. Reuse existing PMREM; no per-zone PMREM regeneration.
- tunnel/shared-straight-edge-parity-v02891.mjs and tunnel/edge-source-floor-bands-v02632.mjs: keep straight mask and connected foot ownership. Check actual emitter and spill, not just visible emissive strip.
- game-v0210.mjs creates premiumSurface=createSmartPremiumTrackMaterial and identitySurface=installAeroBarriers; both receive visualWave. Trace their active production shader inputs for road guides/boost before changing them; do not assume legacy boost field alone controls real pad mesh.
- ships/engine-trails-v01346.mjs: preserve accepted energy plume algorithm and resource ownership; use existing sectorColor input only. Any archived source change needs EF08 exact reviewed inverse checks, not disabled tests.
- All implementation names above are inspected ownership boundaries, not claims that role wiring already exists.

## 5. Spatial transition and budget

Keep fixed 120Hz simulation clock, 18s timing, 90m behind-player launch, 170m/s front, 24m feather, existing 66m atmosphere transition, 4.5m crest and 2.9m/14m white core/bloom. At each source's actual global arc coordinate use the existing signed-distance/single-pass view and resolve from/to P/S/A using the same front. Preserve global-to-module arc transform and settlement behavior in vault-spatial-wave-parity-v0285.mjs; no lap-wrap antipodal jump or re-coloring behind an already settled front. Interpolate linear RGB role colors in existing shader/uniform paths, avoid frame allocations and per-fixture CPU updates. Use existing local-light falloff/intensity. Only use player-local blend for cockpit/atmosphere; HUD uses passed stage. One front, no new scene passes, lights, draw batches, textures or shader loops per fixture. Profile actual GPU frame time; same draw count is not proof of same thermal load.

## 6. Next implementation pass and acceptance

Proposed explicit release 0.29.6 (name: Color Wave 1.0); previous 0.29.5.2 remains comparison/rollback. This spec PR itself intentionally does not alter live rendering or create a release URL. Implement in one coherent shared palette integration pass, not separate per-track rebuilds. Preserve all accepted tunnel geometry, straight-only rails, curve seams, jump, boost physics, Manta and motion blur.

Tests: data table contains exactly nine entries aligned with scheduler indices; all hex values finite 24-bit values, stable IDs; verify old/new role samples before/at/after front in actual shared module and across lap seam; assert emitter/road/wall/ship-spill role parity, no stale fixed orange/cyan on designated dynamic sources; boost shape/physics and guide white readability retained; no extra lights/passes/batches; old route retains original colors. Use existing real Chrome/WebGL CI at high and simulated 4GB for all nine settled themes, transition captures (including lap seam), and before/after matched camera/settings. Capture actual game images only, not generated concept images. Audit palette ID, role colors, timing and activated/passed stages; compare existing real race duration, boost/physics behavior, GPU timings and memory. Player S26 validation remains required for visual preference and thermal cost. Main merge only after review/CI. No claim that these proposed RGB combinations already look right in the HDR game.

