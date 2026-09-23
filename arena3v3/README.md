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
- Honor menu:
  - top HUD has a dedicated HONOR button
  - modal shows current rank, lifetime Honor, win/loss record, saved Talent Points and exact progress to next rank
  - full Rank 1-14 ladder shows Honor thresholds and the +1 Talent Point reward for each rank-up
  - current and already reached ranks are highlighted
- Honor and rank progression:
  - every completed match grants persistent Honor: 200 for a win, 70 for a loss
  - 14 Classic-inspired PvP ranks run from Private to Grand Marshal
  - thresholds rise sharply at higher ranks; Rank 14 requires 125,000 lifetime Honor
  - every rank gained after Rank 1 banks one Talent Point for the future class talent-tree system
  - this is intentionally adapted for single-player: it keeps the long grind but does not depend on weekly realm standings or real-world weekly lockouts
- Combat HUD layout:
  - only the player cast bar is shown in the centered arena overlay; the separate resource bar was removed
  - healer casts use a green gradient and DPS casts use a red gradient
  - the cast bar remains wide and thick for fast readability during combat
  - action-bar cards are taller to leave room for richer future spell presentation and icons
  - the always-visible bottom instruction line was removed
  - a HELP button in the top HUD opens movement, targeting, action-bar and combat-feedback guidance
- Out-of-range action feedback:
  - spells and attacks dim automatically when the currently selected valid target is outside their usable range
  - the feedback updates continuously while either unit moves
  - self-target abilities are unaffected, and invalid/no-target states keep their existing disabled treatment
- Role-based Tab targeting:
  - Tab defaults to Target Nearest and can be rebound in KEYBINDINGS
  - DPS characters target the closest living enemy
  - healer characters target the closest living teammate, excluding themselves
  - distance is measured directly from the player and does not require line of sight
- Action bar customization:
  - drag spells directly on the action bar to reorder them
  - layout is saved separately for each character
  - keybindings are attached to Slot 1-5, not to a specific spell
  - moving a spell into another slot immediately gives it that slot's keybind
  - the KEYBINDINGS menu can rebind Slot 1-5, movement and party targeting
  - legacy Spell 1-5 bindings are migrated automatically to Slot 1-5
  - action-bar layout and keybindings can be reset independently
- Responsive team-panel layout:
  - the center arena column follows the playable 16:9 arena footprint instead of stretching wider than the rendered arena
  - spare horizontal desktop space is split between YOUR TEAM and ENEMY TEAM
  - narrow layouts retain minimum side-panel widths and allow the arena to become width-limited when necessary
- Mouse steering:
  - hold left + right mouse buttons together inside the arena to continuously move toward the current cursor position
  - either mouse button by itself does not move the character; left click by itself still targets normally
  - movement direction updates while the mouse moves, giving a WoW-style dual-button movement feel adapted to the top-down arena
  - releasing either mouse button immediately stops mouse steering; WASD remains available and resumes normally
  - browser context menu is suppressed on the arena during right-click play
  - instant spells such as Renew and Psychic Scream can be activated by hotkey without stopping movement
  - cast-time spells still cancel when movement continues, matching the existing movement/casting rule
- Character selection:
  - the game now opens on a WoW-style character screen
  - create multiple persistent characters; creating a new one never overwrites existing characters
  - character creation asks for a custom name and class
  - playable player classes currently include Priest, Druid, Paladin, Warrior and Mage
  - Warrior uses its existing melee kit directly as the player
  - Mage uses its existing Living Bomb, Frostbolt, Pyroblast, Frost Nova and Polymorph kit directly as the player
  - each character permanently keeps its class plus separate Honor, Rank, win/loss record and banked Talent Points
  - a CHARACTERS button returns to the character screen; an active match can be resumed if you only opened the screen to look
  - existing pre-character Honor progress is automatically preserved as a legacy "Player" character on first load
- Dynamic roster role layout:
  - match setup hides the role already filled by the selected player character
  - Warrior therefore sees only Healer + Caster teammate selectors; healer characters see only Melee + Caster
- Pre-match draft:
  - every match begins on a setup screen before the arena timer or AI starts
  - the random enemy healer, melee and caster are revealed first
  - after seeing the opponent composition, the selected character chooses the two missing roles needed to form Healer + Melee + Caster
  - healer characters choose melee + caster; Warrior chooses healer + caster; Mage chooses healer + melee
  - START MATCH locks that setup and begins combat
  - NEXT MATCH and confirmed RESTART both return to this setup flow with a newly rolled enemy composition
  - the exact same enemy composition is avoided twice in a row
- Player control alerts:
  - Fear, Stun, Incapacitate, Root and Interrupt/School Lock all use the large center-screen warning
  - each state has its own large icon and countdown
  - interrupt alerts also show the locked spell school
  - hard CC takes priority over a simultaneous school lock so the most restrictive state is shown
- Spell and attack VFX:
  - lightweight Canvas-only effects; no sprite sheets or external assets required
  - Mage Frostbolt/Pyroblast, Warlock bolts, Shaman Lava Burst and Paladin Holy Shock have distinct projectiles
  - melee attacks use compact class-colored slash arcs; Charge leaves a short motion streak
  - healing uses class-themed halos/motes, while major defensives show shield arcs
  - CC/root effects use compact swirls, frost spikes or hammer/chains silhouettes without obscuring unit frames
  - existing Chain Lightning, hit bursts, CC rings and floating combat text remain in place
- Action bar clarity:
  - each spell now shows a compact effect summary directly in the action bar
  - defensives display mitigation + duration (e.g. Pain Suppression: 30% less damage · 4.2s)
  - heals, damage, DoTs/HoTs and CC durations are also shown
- AI movement polish:
  - blocked steering no longer returns a zero vector before the anti-stuck navigator can run
  - sustained pillar obstruction flips the preferred route side even when the actor is still sliding
  - rare collider overlap gets a nearest-valid-position recovery instead of trapping the actor
  - run reports include AI movement diagnostics when a route flip or overlap recovery occurs
  - AI uses obstacle-aware alternate movement angles when its preferred path is blocked
  - full-diagonal movement is tried before wall sliding to reduce pillar-corner stalls
  - persistent stalls flip the actor's preferred avoidance side and allow a short retreat
  - player movement behavior remains unchanged
- WoW-style unit readability:
  - world and side-frame HP bars use standard WoW class colors
  - enemy names render in red for faster team recognition
  - HP below 20% overrides class color with a pulsing red danger state
  - overhead CC icon/timer is raised to keep the character name unobstructed
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
