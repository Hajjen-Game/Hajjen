# PvP-2.5D — Energy Build System v1

**Status: phase 1 delivered (independent build editor). Combat integration is NOT yet active.**

## Agreed rules

- Original sci-fi 3v3 arena with glass energy orbs, no weapons.
- Three roles: Healer, Melee, Caster. Two always-equipped, role-bound abilities; eight freely selected from the shared library.
- Five disciplines: Void, Solar, Cryo, Kinetic, Vital. Any role may combine abilities from any discipline.
- Ten active slots total; no duplicate free abilities.
- Twelve Talent Points; rank 0–3 per equipped ability. At rank 3 one of three Evolutions becomes selectable. A maximum of two Evolutions may be active across the build.
- Six role-bound abilities plus sixteen free abilities (22 total), each with three Evolution variants (66 total).
- Three saved preset slots and an autosaved draft. Free reset/respec.
- Flux profile proposal: max 100, baseline regeneration +8/s. Healer: -15% healing Flux costs; Melee: +4 Flux per landed melee attack, max once per second; Caster: -15% ranged direct-damage Flux costs. The numbers await combat playtesting.
- Existing arena, AI, gameplay, progression, character screen, Babylon orbs, target rings and Pixi VFX remain intact until combat migration.
- Browser-local presets are a phase-1 prototype. New per-character profiles and match use come later.

## Approved ability list

Role-bound:
- Healer: Pulse Mend, Resonance Guard
- Melee: Phase Rush, Pulse Sever
- Caster: Flux Bolt, Phase Slip

Free:
- Void: Entropy Mark, Rift Slash, Null Prison
- Solar: Sun Lance, Zenith Crash, Photon Barrier
- Cryo: Crystal Bolt, Crystal Snare, Fracture Spear
- Kinetic: Arc Strike, Gravity Hammer, Vector Rush, Resonance Cut
- Vital: Reactive Thread, Symbiosis Link, Cleanse Flux

Authoritative ability and Evolution descriptions: src/energy/abilityCatalog.js
Validated state and local storage: src/energy/buildState.js
Interactive editor: src/energy/buildLab.js
Preview entrypoint: energy-build.html

## Combat rules to preserve in migration

- Real-time Healer + Melee + Caster, range, obstacle collision, LOS, cast/interrupt school lockouts, DR, CC break-on-damage, dispels, dampening, power-ups and opponent AI.
- AI must understand individual loadouts and Evolutions, not just fixed class IDs.
- Shared mobility gating for Phase Rush, Vector Rush and Phase Slip. No movement through solid pillars.
- Photon Barrier is an absorb; Resonance Guard is percentage damage reduction. Prevent unrestricted defensive stacking.
- Symbiosis Link converts capped direct offensive damage, not unlimited DOT or AOE ticks, into healing.
- Resonance Cut (free ability) provides ranged interrupt; Pulse Sever (melee role ability) preserves melee's close-range disruption advantage. A failed interrupt cannot silence.
- Root DR differs from other CC groups; roots do not prevent casting; Null Prison breaks on damage.
- Evolution VFX must produce distinct combat feedback. Numeric rank 1, rank 2, rank 3 effects need later per-ability definitions.

## Delivery milestones

1. DONE: Ability catalog; roles; Flux preview data; loadout editor; 2 locked + 8 shared slots; 12 TP; Evolution cap; 3 presets; auto-saved draft; access links from character and lobby screens.
2. NEXT: Define executable ability coefficients, costs, cast/cooldown rules; build a new actor configuration and selectable safe match path while retaining the existing game.
3. Implement combat handlers, role Flux economy, DR/LOS, interrupts, defenses, targeting, HUD, mobility and actionbar compatibility.
4. Adapt AI and match reports to build-based tactics; add balance telemetry.
5. Give every energy ability and Evolution a signature Babylon/Pixi buildup and impact, preserving current orb graphics.

## Manual smoke test

1. Open energy-build.html from the ENERGY BUILDS link on the character screen.
2. Switch among roles and verify both locked abilities; role changes discard the current draft after confirmation.
3. Equip eight different shared abilities; duplicate selection must be rejected.
4. Allocate 12 points, no more than 3 per ability. Select two Evolutions, not three.
5. Unequip a talented ability and verify its points and Evolution are refunded.
6. Save a preset, modify the draft, load the preset, reload the webpage; confirm persistence.
7. Return to the existing arena and verify match flow, HUD, graphics and original progression still work.

**Important:** The new abilities are not yet executable in the current match. Do not misrepresent the lab as a completed combat migration.