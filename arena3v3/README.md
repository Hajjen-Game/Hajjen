# 3v3 Arena prototype

A dependency-free browser prototype for a single-player 3v3 arena game inspired by MMO arena combat: positioning, line of sight, target switching, pressure, healing decisions and crowd control.

## Run

The prototype is static and GitHub Pages-ready:

`/arena3v3/`

No build step or package manager is required.

## Current prototype

- 3v3 teams: healer + melee + caster
- Player controls the healer
- WASD movement
- Click world units or side frames to target
- F1/F2/F3 target self, party member 2 and party member 3
- Five abilities on 1–5
- Rebindable movement, action and party-target keys saved in localStorage
- Mana for healers/casters, energy for melee
- Cast times, cooldowns and global cooldown
- HoTs and DoTs with visible effect badges
- Crowd control:
  - healer: short-range AoE fear
  - melee: off-GCD interrupt with temporary spell-school lock
  - caster: casted incapacitate that breaks on damage
- DPS switches pressure to an enemy healer at 10% mana or lower
- DPS tries to drag its kill target back into healer line of sight while its own healer is hard-CC'd
- Crits, misses and dodges
- Marble-bag RNG for hit/crit/amount variance
- Four large line-of-sight pillars in a symmetric arena
- Basic collision and AI steering around pillars
- Shared vector role icons: healer cross, melee sword, caster spell glyph
- Damage meter for both teams
- Copy Run Report with combat, damage, healing, CC and interrupt data
- Match ends immediately if the player character dies
- Shared UI/theme/rendering components

## Architecture

`src/core/` — game loop, input, geometry, RNG and match reports  
`src/entities/` — runtime actor model  
`src/systems/` — movement, resources, crowd control, AI and combat systems  
`src/rendering/` — shared Canvas rendering  
`src/ui/` — shared HUD components  
`src/content/` — all tuneable arena and character configuration

Every player class, teammate and opponent has its own folder. Tune values in each folder's `config.js`; future animation art belongs in that same folder's `assets/` directory.

The visual theme is centralized in `src/styles/theme.css`, so later palette/frame changes propagate across the HUD. Canvas rendering reads those same CSS variables.
