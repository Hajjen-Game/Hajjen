# 3v3 Arena prototype

A dependency-free browser prototype for a single-player 3v3 arena game inspired by MMO arena combat: positioning, line of sight, target switching, pressure, healing decisions, crowd control and class matchups.

## Run

The prototype is static and GitHub Pages-ready:

`/arena3v3/`

No build step or package manager is required.

## Class roster

Nine classes are implemented. Every class currently has exactly five abilities so the prototype stays readable while the future Honor progression system is still undefined.

Healers:
- Priest — reactive healing, defensive cooldown and short-range AoE fear
- Druid — HoTs, instant healing, Ironbark-style defense and Cyclone-style control
- Paladin — strong direct healing, durable defensive cooldown and short stun

Melee:
- Warrior — rage, Rend, Mortal Strike healing reduction, Charge and Pummel
- Rogue — energy, bleeds, burst, Kidney Shot and Kick
- Death Knight — runic power, disease pressure, self-sustain, Chains of Ice and Mind Freeze

Casters:
- Mage — Living Bomb, Frostbolt, Pyroblast, Frost Nova and Polymorph
- Warlock — Corruption, Shadow Bolt, Chaos Bolt, Unending Resolve and Fear
- Shaman — Flame Shock, Chain Lightning, Lava Burst, Hex and Wind Shear

The **ROSTER** button lets you choose:
- your healer class
- friendly melee
- friendly caster
- enemy healer
- enemy melee
- enemy caster

The player-controlled unit is always named **Player**. AI units use their class name.

## Current systems

- 3v3 teams: healer + melee + caster
- Player controls the healer
- WASD movement
- Click world units or side frames to target
- F1/F2/F3 target self, party member 2 and party member 3
- Five abilities on 1–5
- Rebindable movement, action and party-target keys saved in localStorage
- 400 ms player ability queue window
- Mana, energy, rage and runic resources
- Cast times, cooldowns and global cooldown
- HoTs, DoTs, damage reduction and healing-reduction debuffs
- Crowd control:
  - fear
  - incapacitate
  - stun
  - root
  - interrupt + spell-school lock
- Large central CC/root alert for the player
- WoW-inspired Dampening scaled to prototype match length:
  - 0% during the opening 45 seconds
  - starts at 10% at 45 seconds
  - rises by 2% every 10 seconds
- DPS switches pressure to an enemy healer at low mana
- Team AI preserves breakable friendly CC:
  - DPS swaps off feared / polymorphed / hexed targets instead of immediately breaking the control
  - breakable targeted CC avoids enemies already carrying friendly DoTs when possible
  - chain spells skip secondary targets protected by breakable friendly CC
  - AI finishes an already-started cast without damaging a newly CC'd target
- Peel AI:
  - when a healer or caster teammate drops low while an enemy melee is actively tunneling them, DPS can temporarily switch to that melee
  - available stuns / incapacitates can prioritize the peel target
  - peel pressure is sticky for a short window to avoid target-switch jitter
- DPS tries to reposition its kill target back into healer line of sight when its own healer is hard-CC'd
- Caster survival / uptime pass:
  - casters actively kite enemy melee that are tunneling them instead of positioning only from their offensive target
  - threatened or low-health casters now treat their own healer's healing range + line of sight as a movement constraint
  - if a caster loses healer LOS while pressured, it first tries to recover a healable position rather than blindly kiting farther around a pillar
  - low/pressured casters now treat healer LOS as a hard safety gate before starting offensive casts
  - if healer LOS is lost during an offensive cast, the caster cancels that cast and repositions instead of finishing the cast while unhealable
  - self-peel starts earlier for casters under sustained melee pressure
  - Mage receives a small health + movement-speed increase
  - Shaman receives a smaller health + movement-speed increase
  - Warlock keeps its higher health and Unending Resolve instead of receiving a raw stat buff
- Crits, misses and dodges
- Marble-bag RNG for hit/crit/amount variance
- Four line-of-sight pillars in a proportional 16:9 arena
- Damage meter for both teams
- Copy Run Report
- Match ends immediately if Player dies
- Combat readability:
  - stun, fear, incapacitate and root show a compact colored arena ring + icon-over-timer marker
  - each CC type has its own procedural icon: stun burst, fear face, incapacitate spiral and root branches
  - hard CC is no longer duplicated in the small world-effect row or side-frame effect chips
  - CC icon/timer contents explicitly clear inherited Canvas shadows so they render once instead of appearing doubled
  - side unit frames receive a matching CC banner and colored outline
  - current heavy DPS cooldown abilities trigger a short BURST aura and frame banner around the user
  - burst telegraphs are visual/readability metadata only and do not add hidden damage modifiers
- Reset/reload diagnostics:
  - header Restart requires two pointer clicks and ignores keyboard activation
  - internal resets record their source (manual restart / roster apply / play again)
  - a session heartbeat detects an unexpected browser reload/navigation while a match was active
  - Copy Run Report includes a RESET / RELOAD DIAGNOSTICS section

## Visual effects

Every class has its own procedural Canvas VFX identity and color language:

- Priest — warm holy gold
- Druid — nature green
- Paladin — bright sacred gold
- Warrior — steel/bronze
- Rogue — amber blade effects
- Death Knight — icy runic cyan
- Mage — arcane/frost blue
- Warlock — shadow violet
- Shaman — electric cyan

Class bursts also draw a small class-specific glyph, while beams, rings, interrupts, CC and Chain Lightning inherit the caster's class visual style.

Future sprites, animations, spell icons and textures belong in each class folder's `assets/` directory.

## Architecture

`src/core/` — game loop, input, geometry, RNG and match reports  
`src/entities/` — runtime actor model  
`src/systems/` — movement, resources, crowd control, player ability queue, visual effects, AI, dampening and combat  
`src/rendering/` — shared Canvas rendering  
`src/ui/` — shared HUD components  
`src/content/classes/` — one folder per class plus the class registry  
`src/content/arena/` — arena configuration

The visual theme is centralized in `src/styles/theme.css`, while interaction/feedback styles are isolated in `src/styles/feedback.css`.
