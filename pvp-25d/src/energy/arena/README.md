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
