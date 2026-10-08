# Energy Combat 1.1 — separate playable prototype

## Entry points

- From Energy Build Lab click **TEST BUILD IN ENERGY ARENA**.
- Standalone: **pvp-25d/energy-arena.html**. Choose a saved complete build or the autosaved draft.
- Current/legacy Orb Arena: **pvp-25d/orbs.html**. The original classes, Babylon renderer, Pixi overlay, AI and progression have NOT been replaced.

## Controls

- WASD: player movement, with solid pillar/bounds collision.
- Left click on an orb, friendly or enemy team frame: select target.
- Tab: cycle enemy targets.
- F1/F2/F3: self and two friendly party members.
- Keys 1–0: equipped ability slots. Click the 10-slot action bar as alternative.
- Change Build: leave match and select another complete build.
- Restart: start a new match with the same chosen build.
- COPY AI REPORT: copy team plans, targets, LOS/path information, casts, damage and healing to share a stalled-match diagnostic.

## Current match functionality

- Exactly three allied and three enemy orbs, with Healer/Melee/Caster roles on each team. The player can choose any role.
- Individual health, Flux (100 max / 8 per second), global cooldown, cast bar, target selection, targeting ranges and line of sight.
- All 22 defined ability IDs have baseline prototype handlers: damage, healing, DOTs, HOT/reactive healing, shield, damage reduction, interrupts, root, break-on-damage CC, debuff dispel, link, movement and area damage.
- CC uses prototype diminishing returns (full, half, then immune; category reset timer 20s after an effect finishes), dampening starts 45s into matches.
- Mobility is collision-safe and short chained movement lockouts apply. Long range casts cannot ignore solid pillars.
- EnergyAI.js now adapts important principles from the Pixi 3v3 AISystem: pressure/burst/peel/recover team plans, player-led friendly focus, health/Flux-aware enemy target scores, healer triage and LOS rescue navigation, attempts at interrupts/dispels, cast priorities, mobility/kiting, and stable shortest paths around the four pillars. Enemy opening focus can vary between roles; it is never selected simply because an actor is player-controlled.
- A copyable AI report includes each team plan, alive/dead stats, target, LOS, path waypoints, ability usage, damage/healing and the age of the last damage event. This is a first-pass adaptation, **not** a port of the entire production 3v3 intelligence.
- Role-specific Flux behavior is included: Healer healing discount, Caster ranged direct-damage discount, Melee melee-hit Flux gain.
- The player's dominant equipped disciplines tint the glass orb inner energy. Existing production OrbCharacterRenderer and OrbGroundMarkers are reused unchanged.
- A small generic Babylon effect accompanies combat events. This is **not** the final authored spell/VFX system.

## Visual Combat Slice v1 — creative go/no-go gate

A **separate, controlled 3D/Pixi audition page** is available at
**pvp-25d/energy-vfx-lab.html**, linked from Energy Arena and Energy Build Lab.
It deliberately pauses combat entirely: no bots, no cooldown restrictions and
no resource/HP balance. Click any of the eight signatures, Replay, or Play All.

Visual signatures and goals:
- **Crystal Bolt:** converging icy prisms inside glass, faceted projectile, shattering contact.
- **Sun Lance:** solar corona and spinning charge geometry, concentrated gold lance and piercing starburst.
- **Null Prison:** angular windup and six-sided energy cage around the target.
- **Rift Slash:** weaponless crossing arcs/void tear rather than swinging a sword.
- **Gravity Hammer:** red gravity buildup, overhead faceted impact, ground shock rings.
- **Pulse Mend:** coiling turquoise energy inside the caster, transfer to ally and luminous landing.
- **Photon Barrier:** interlocking photon bands and transparent shell that persists on the ally.
- **Reactive Thread:** persistent living strands looping inside/around ally's glass, triggered healing pulses.

Technical split: **Babylon** owns all volumes, internal glass charge-up, 3D geometry, target occlusion and orbit/ring environment. A **nonessential Pixi v8 overlay** uses bright, fine 2D linework to make trails, slash outlines and contact readable at actual arena scale; the underlying Babylon signatures remain usable if Pixi fails to load. The original Pixi 3v3 is unchanged and can be compared from a lab header link.

The same authored signatures also display in normal Energy Arena matches when the abilities trigger. Other spells retain the generic fallback visual renderer. All casts/damage and actor rules remain separate from VFX.

**Important limitations:** This is a visual proof, not final production VFX or full combat parity; the spell timings in the visual lab are staged preview timings and do not change arena spell statistics. Pixel-level/browser screenshots, device frame rate and gameplay readability still need live verification.

Evaluation checkpoints: distinct silhouette for each ability; clear build-up inside the orb; release/impact legibility at normal camera zoom; no weapons; shields and controls readable on targets; acceptable performance; and whether this visually merits further work over Pixi 3v3.

## Visual Impact Pass 2 — four focused signature upgrades

- Crystal Bolt: expanded three-dimensional faceted shatter, cold ground cracks and multiple sharp Pixi polygons rather than the generic orb-ring flash.
- Sun Lance: larger radiant golden starburst and piercing spokes, synchronized with the projectile arriving at its target.
- Rift Slash: an energy-only travelling tear that passes through its target, then creates crossing spatial seams and an impact shock. The Visual Lab shows it at actual close-combat range.
- Gravity Hammer: impact geometry and ground shock now trigger **when the descending mass touches the target**, instead of flashing before the hammer lands; twelve fractured ground rays, expanding shock discs and displaced energy debris.
- For these four signatures, floating combat text is delayed cosmetically to the visible moment of contact. Simulation HP/damage is unchanged.
- Null Prison, Pulse Mend, Photon Barrier and Reactive Thread retain their prior signatures.
- Babylon meshes and Pixi overlay now follow the same contact timing. Verified with syntax tests and 4× full eight-spell simulated replay/cleanup; real browser and visual perception still require user screenshots and feedback.

## Visual Impact Refinement Pass 3 — compact, detail-first impacts

User screenshots showed that the existing build-ups were much sharper and more intricate than the impacts. Pass 3 specifically refines Crystal Bolt, Sun Lance, Rift Slash and Gravity Hammer; **all four build-ups and the other four signatures stay intact**.

- **Crystal Bolt** now has a tiny cold-tinted core, seven four-sided crystal fragments, six subtle floor fractures and two narrow orbit fragments, not a giant cyan luminous disc.
- **Sun Lance** now concentrates energy into a smaller piercing corona, five short thin spokes and tiny motes, not a wide wheel of large white rods.
- **Rift Slash** is now a close-range moving three-layer void seam (dark/magenta/hairline), followed by a thin directional tear with six fine rift chips rather than broad neon bands.
- **Gravity Hammer** retains a faceted overhead hit, but the head is smaller, the impact fires on ground contact, and the aftershock is a compact two-ring ground compression with eight short asymmetric cracks.
- **Babylon** impact mesh scale and fade curves now grow modestly; no oversized white geometry is introduced. **Pixi** uses detail-first strokes 0.7–2.1 px at reference scale and has a hard zoom-proportional clamp (0.48–1.08) based on the orb's projected world radius.
- The floating combat text and Pixi visuals for Rift Slash and Gravity Hammer align with the new Babylon hit time (269 ms and 478 ms after launch respectively).
- Verified via syntax checks, effect lifecycle simulation across all eight signatures repeated three times, no leaked meshes (591 created/591 disposed), Pixi shape tests and versioned module import chain. Actual browser visuals still require screenshot review.

## Trail + Outer Impact Pass 4 — restore readability beyond the orb

After testing Pass 3 on mobile, the authored four-hit signatures had become too
small: nearly everything was confined to the glass core. This pass intentionally
**does not alter the accepted buildup animations**.

- The four existing *inner* impacts remain compact, coloured, detailed, and
  identifiable even when impact effects are disabled.
- A separate *outer* layer (Babylon three-dimensional fine arcs and fragments,
  Pixi sharp lines) extends beyond the orb to approximately **2.0–2.45× the
  orb radius**, or a total silhouette of ~2.0–2.45× the orb diameter. It
  does not use broad white plates or full radial glowing wheels.
- **Crystal Bolt**: 8 small outer frost facets and broken cold arcs.
  **Sun Lance**: partial corona, 5–6 focused needles and gold motes.
  **Rift Slash**: two travelling opposed void seams, thin afterimages and
  small dimensional chips. **Gravity Hammer**: low elliptical pressure arcs
  with shallow ground fractures.
- **Projectile trails**: Babylon now has 11 history-based 3D sparklets behind
  Crystal Bolt / Sun Lance that remain visible when Pixi is unavailable.
  Pixi adds tapered coloured ribbons, hairline energy spines, counter-twisted
  side filaments and crystalline/sun motes inspired by arena3v3's projectile
  VFX language. Rift Slash adds phased thin echo arcs and Gravity Hammer gains
  coiling descending filaments.
- Pixi outer-impact dimensions follow actual projected orb size. At sampled
  screen orb radii 20/38/66px, all four impact silhouettes remained in the
  intended 2.0–2.45× radius range; paths and alpha values remained finite.
- The pass only changes `pvp-25d/src/energy/arena/`; original
  `arena3v3` files are untouched. Both Energy Arena and Visual VFX Lab use
  cache-busted imports. Browser screenshot/feel verification remains next.

## Volumetric Impact Pass 5 — physical 3D spell hits

After the initial impact revisions were visually acceptable, the next goal was
depth and parallax rather than more screen-space rings. New module:
`EnergyVolumeImpact.js` (Babylon mesh-based particles, no external assets).

- **Crystal Bolt:** 12 individually animated faceted 3D shards with varied
  velocity/rotation/height; two tilted fragmented arcs.
- **Sun Lance:** nine slim directional light darts oriented to the projectile
  travel vector, four off-axis luminous motes, and separate front/back corona.
- **Rift Slash:** two genuine twisted Babylon ribbon meshes through the
  target's volume plus seven flying void fragments.
- **Gravity Hammer:** low ground-bound pressure rings and 12 3D fragments
  following ballistic arcs, with three weaker pressure jets.
- Kept the previously approved build-ups, underlying detailed inner impact,
  thin outer Pixi graphics, glow balance, arena, AI and damage calculations.
- All volume meshes are part of the existing `EnergyHeroVFX` lifetime system,
  capped at nine simultaneous volume impacts for bounded rendering cost.
- Corrected an existing low-FPS issue: hammer and rift impact events could be
  missed if animation time jumped over the contact trigger; contact now
  triggers once even on a delayed frame.
- Visual VFX Lab has `3D IMPACTS: ON/OFF`, automatically replaying the
  selected spell, alongside the pre-existing `PIXI ACCENTS: ON/OFF`.
  Compare both ON versus 3D OFF at the same spell and camera.
- Tested 16 four-spell scenarios at 16, 92, 280 and 600 ms per frame, plus
  48 eight-signature on/off replay simulations. All mesh instances were
  disposed in tests; **live-browser visuals and FPS still need review.**

## Projectile Parity Pass 6 — directly from Pixi 3v3

Crystal Bolt and Sun Lance have been revised against the actual
`arena3v3/src/rendering/PixiProofRenderer.js` Frostbolt / Pyroblast
implementations, not just screenshots.

- **Crystal Bolt:** adapts Frostbolt's compact angular spear, four tapered
  translucent/white-hot energy streams, rotating snow-star fragments,
  drifting crystal splinters and twin helix filaments.
- **Sun Lance:** adapts Pyroblast's five nested, temperature-separated
  ribbons, independent hot embers, wavy flame tongues, rotating coils and
  a narrower, concentrated solar head. These are not merely recolors.
- **Motion:** trails are capped to a recent slice of the projectile's flight,
  the Pixi launch point freezes at release, and both Pixi and Babylon use
  the same ease-out travel fraction. Moving after casting never tethers
  the released trail back to the caster.
- **Floor lighting:** new independent `EnergyProjectileGroundLight.js` uses
  one cached 128×128 radial-alpha texture and shared emissive materials.
  Four staggered translucent light pools plus a small bright pool move on
  the Babylon ground under each ranged projectile. A 270 ms expanding
  ground-light flash appears at contact. Lighting works even with
  `PIXI ACCENTS: OFF` and cleans up its meshes/materials/textures.
- The existing build-ups, authored 3D impacts (Pass 5), character/orb
  visuals, spells, combat timings, arena and original Pixi-3v3 source
  were **not changed**.
- Both Energy Arena and Visual VFX Lab have versioned import URLs.
  Static JavaScript parsing and 36 time/zoom-case projectile geometry
  simulations succeeded. Babylon floor-light creation, movement, impact
  and disposal were also exercised with a lightweight mesh mock.
  **Live-browser looks, especially real floor blending and mobile FPS,
  still need visual verification**.

## Impact Continuity Pass 7 — hits that belong to the projectile

After user screenshot review, the Pass 5 impacts looked like independent radial
sigils/star drawings, while the newer Pass 6 projectiles were sharpened,
directional and full of layered material-specific motion. This pass changes
**Crystal Bolt and Sun Lance impacts only**.

- New `EnergyPixiImpacts.js` replaces the old Pixi `contact + outerContact`
  rendering **for these two spells**. It uses the *same incoming vector* as
  the projectile and follows `pierce -> fracture/bloom -> decay`.
- Crystal Bolt continues the white-blue spear a short distance THROUGH the
  orb, breaks into restrained forward ice splinters, tiny rotating snow-star
  fragments, and two incomplete directional frost shears. No big teal plates
  or round frost sigils.
- Sun Lance leaves a narrow white-gold penetrator, releases asymmetric loose
  embers, short streaks and three rolling heat tongues. There are no large
  even spokes, complete corona rings, or diagram-like starbursts.
- Babylon `EnergyHeroVFX.impact()` now authors the small axial penetration
  core and fine material fragments instead of a radial wheel. Its original
  `outerImpact()` is **not invoked** for these two spells.
- Babylon `EnergyVolumeImpact` now pushes real 3D ice shards and hot solar
  debris predominantly along the incoming vector, with 1–2 needle filaments
  instead of the previous upright fragmented orbit arcs. The four other
  signatures retain their earlier effects. The `3D IMPACTS` A/B toggle
  still controls only the volumetric layer.
- Pixi and Babylon impact durations are paired at 560 ms for Crystal Bolt
  and 480 ms for Sun Lance. Impact ground-light flashes remain 270 ms.
- The existing Pass 6 projectiles, reflections, glass orb visuals, approved
  build-ups, AI, collision, hit timing and damage are unchanged.
- Validation: eight JavaScript syntax checks, 96 Pixi impact phase/scale/spell
  simulations (including no effect on unrelated Rift Slash), and four Babylon
  3D volume scenarios with 53/53 mock meshes disposed. **Actual browser
  aesthetics and FPS still require visual verification.**

## Impact Burst Pass 8 — readable release beyond the glass

Following real browser screenshots of Pass 7, both impacts still read as a
thin horizontal line within the victim orb, despite the improved projectile
travel effects. Pass 8 preserves the accepted Crystal Bolt/Sun Lance
projectiles and build-ups while strengthening the hit in three phases:

- **0–100 ms / penetration:** a brief layered icy-blue or white-gold core
  burst expands near the impact point. The old static axial white line now
  fades early instead of lingering through the entire contact animation.
- **100–250 ms / energy release:** Crystal Bolt's directional frost splinters,
  angular needles, two non-closed ice shears and snow-star particles form an
  irregular wider fracture fan. Sun Lance's flowing hot tongues, golden embers,
  and open coiling heat ribbons burst outward. Both remain biased toward the
  incoming direction, never becoming a circular rune or starwheel.
- **250–600 ms / aftermath:** splinters and embers separate and fade. The
  projected Pixi impact silhouette is capped at approximately 2.3× normal
  projected scale, retaining actual arena size readability rather than
  turning into a full-screen graphic.
- The Babylon volume layer now uses faster staged motion and more substantial
  real 3D fragments, reaching outside the glass at several heights/depths,
  with a brief luminous volumetric core. Existing volume concurrency remains
  limited to nine simultaneous impacts. The `3D IMPACTS` switch still works.
- The real floor receives both a concentrated hot reflection and a softer
  growing light pool for 350 ms. Original projectile travel ground lights
  and their fade curves are unchanged.
- No combat mechanics, spells/damage, AI, arena, renderer baseline, or
  non-Crystal/Sun signatures are changed.
- Validated 108 Pixi geometry cases at different phases/sizes, four Babylon
  signature timelines with 76/76 mesh objects cleaned up, and floor light
  stress cases with 35/35 planes released. Browser appearance/FPS still need
  manual evaluation.

## Pixi-primary projectile policy — Pass 9

User side-by-side screenshots showed the **3D IMPACTS OFF** result was
cleaner and more readable than the volumetric version. The accepted
Pixi projectile shapes and authored Pixi impacts are retained.

- **Default for Energy Arena AND Visual VFX Lab:** experimental Babylon
  `EnergyVolumeImpact` is **OFF**. The old 3D layer is preserved only as
  an opt-in A/B comparison in Visual VFX Lab; normal fights do not spawn it.
- **Crystal Bolt and Sun Lance with Pixi ready/enabled:** Pixi owns the
  *complete visible traveling projectile and impact/aftermath*. The Babylon
  VFX controller keeps only an invisible timing root and its physical,
  moving projectile ground illumination / contact reflection. It no longer
  adds cones, sphere particles, 3D hit needles, or volumetric debris to the
  approved Pixi silhouette.
- **Fall back safely:** if Pixi has failed/not loaded or the user disables
  the `PIXI SPELLS` toggle, Babylon's existing projectile and compact hit
  visuals remain available. The renderer checks readiness at the hit event,
  so we do not create invisible attacks while a CDN is loading.
- **Approved build-ups inside the glass, shields, controls, other signatures,
  combat/hit logic, and the Babylon arena/orbs/ground remain unchanged.**
  Additional spells can be migrated selectively without hiding their
  existing effects before Pixi alternatives have parity.
- The lab defaults to `3D IMPACTS: OFF`; both renderer switches restart
  the current demonstration for a meaningful side-by-side comparison.
- Passed JavaScript syntax/import-graph checks and unit-style checks of
  both Pixi-primary and Babylon fallback paths (two ranged spells).
  Live visual/FPS testing is still needed.

## Threaded Impact Pass 10 — Reactive Thread depth for Pixi hits

After the user noted that Reactive Thread already looks three-dimensional
*with* Pixi, Crystal Bolt and Sun Lance now borrow its thin spatial strand
approach instead of reintroducing large polygon fragments.

- **Default:** accepted Pixi projectiles, impact flashes and particles remain
  untouched. On contact, Babylon adds only **four slender, partial 3D energy
  filaments and four tiny orbiting motes** for each Crystal Bolt / Sun Lance
  hit. This is a short-lived ~560/480 ms variant of Reactive Thread's rotating
  `this.arc()/this.tube()` geometry, not a comeback of the old 3D shards.
- **Actual depth:** the strands are authored as curved 3D tubes at differing
  heights, travel-axis depths and rotations, wrapping around the struck glass
  orb and unwinding as they fade. They are non-pickable and cleaned up through
  `EnergyHeroVFX`'s bounded lifetime management.
- **Crystal Bolt** receives colder, slightly tighter orbiting frost strands.
  **Sun Lance** receives more open, warmer and faster-winding solar filaments.
  Their Pixi material particles remain the principal visual impact.
- No additional 3D geometry is spawned during travel, and existing 3D
  build-ups inside glass and Babylon floor-light/reflections are retained.
- The former experimental heavy `EnergyVolumeImpact` remains **OFF by
  default**. Visual VFX Lab now offers three clean comparisons:
  `THREAD DEPTH: ON/OFF` for the subtle new filaments,
  `3D DEBRIS: ON/OFF` for the **old** faceted experiment, and
  `PIXI SPELLS: ON/OFF` for the safe fallback. Thread/debris toggles are
  mutually exclusive and replay the current signature.
- Verified six mocked contact modes (both spells with threads / without
  threads / with old debris); new contact has precisely four 3D tubes and
  four tiny motes, with no geometric overlap in pure-Pixi mode. Both spell
  timelines complete and clear their effects. Visual/FPS browser verification
  is still required.

## Neon Color / Glow Pass 11 — initial identity, new light separation

Side-by-side code checks against the earliest Pixi overlay showed the
**original base palette never changed**: Crystal Bolt used
`#6fd8ff / #ebfcff / #278cbe` and Sun Lance used
`#ffb66b / #fff1bf / #d36a43`. The flatter newer results were therefore
**not solvable by reverting the hex values alone**.

This pass restores the luminous neon feel without modifying existing
Frostbolt/Pyroblast-inspired projectile choreography or glass build-ups:

- Original `COLORS` remains the palette for charges and all non-target
  effects. Crystal/Sun **hit events only** use a richer saturated
  travel/contact skin: `#29ceff/#f7ffff/#0868b7` for Crystal Bolt and
  `#ffaa34/#ffffe8/#c85618` for Sun Lance, matching the earlier cyan/gold
  identity with stronger light/dark contrast.
- A **separate Pixi Graphics bloom layer** is drawn *beneath* the accepted
  sharp spell artwork, using Pixi v8 `BlurFilter` and additive blend. A
  second sharp additive layer above it restores concentrated near-white
  projectile tips and instant contact cores.
- The glow is anchored to the **same launch/target coordinates and existing
  smoothstep/contact-time easing**, with a bounded travelling wake and
  noncircular burst halo, so it never turns a spell into a screen-wide disk.
  Only Crystal Bolt and Sun Lance hit events get this extra work.
- Optional filter setup degrades gracefully; unsupported blur devices keep
  the sharp original Pixi VFX instead of breaking the renderer.
- The existing **Reactive Thread-style 3D hit arcs and motes** get a
  slightly stronger neon emission, with materials overridden *only* for
  these two impact types. Build-ups and original Reactive Thread remain
  unchanged; no rejected large 3D debris returns.
- Verified 72 Pixi glow timeline/zoom scenarios with valid geometry and
  opacity, plus static checks that the original `COLORS`, charge routine,
  and projectile animation function remain unchanged. Browser aesthetics,
  bloom/compositing and device performance still require visual validation.

## Work still required

- Most Talent-rank modifiers and most of the 66 Evolutions do not yet affect combat. Examples of very early activated Evolution effects include Twin Arc, Deep Decay, focused single-target impact, interrupt Flux restoration and Purifying Surge.
- Detailed per-ability balance, damage sources, shared defensive cooldowns, spell schools, targeting preference and LOS validation need substantial playtesting.
- AI still needs more advanced coordinated burst windows, defensive restraint, variation in generated enemy builds, rated difficulty/personality, CC/DR prediction and playtesting. The separate Energy AI is not yet at full Pixi-3v3 parity.
- Dedicated spell build-ups INSIDE each glass orb, special energy impact animation and themed Evolution VFX are future visual passes.
- Results, Honor, rank, rating and progression are intentionally not part of this isolated test.
- Full WebGL/browser smoke tests have not been run in the connector environment; JS syntax and pure model combat tests can be verified through direct module evaluations.

## Manual smoke checks

1. In Build Lab equip eight free abilities and activate 0-2 Evolutions; press TEST BUILD IN ENERGY ARENA.
2. Verify six glass orbs appear, the cyan/dark environment looks correct and targets have red/green floor rings.
3. Select enemies via Tab/click, party via F1–F3. Verify targeting in unit frames and on the ground.
4. Move with WASD, dash near a pillar, ensure no obstacle traversal.
5. Attack with a ranged and melee ability. Test cast bars, cooldowns, energy and LOS.
6. Target an ally, use Pulse Mend/Photon Barrier or Reactive Thread and see HP increase.
7. Try interrupting a cast, CC another target, and break Null Prison with damage.
8. If surviving teams stop fighting, use COPY AI REPORT before restarting and share the report.
9. Restart and change builds; ensure the original Orb Arena still works.

## Files

- EnergyMatch.js: independent combat model, events and copyable telemetry.
- EnergyAI.js: team plans, ability priority rules, heal/peel selection and obstacle-aware navigation.
- EnergyArenaRenderer.js: new Babylon scene, reusing existing glass orbs and marker classes.
- energyArena.js: controls, build selection, HUD, actionbar, DOM views and animation loop.
- energyArena.css: styling in Build Lab visual language.
- ../../energy-arena.html: web entrypoint.
