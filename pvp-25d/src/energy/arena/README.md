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
