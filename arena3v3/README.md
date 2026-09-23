# 3v3 Arena prototype

A dependency-free browser prototype for a single-player 3v3 arena game inspired by the pace, targeting, line-of-sight play and role composition of MMO arena combat.

## Run

The prototype is static and GitHub Pages-ready. Open it from a web server (GitHub Pages is ideal):

`/arena3v3/`

No build step or package manager is required.

## Current prototype

- 3v3 teams: healer + melee + spellcaster
- Player controls the healer
- WASD movement
- Click world units or side frames to target
- Four abilities on 1–4
- Rebindable movement and action keys, saved in localStorage
- Cast times, cooldowns and a global cooldown
- HoTs and DoTs
- Crits, misses and dodges
- Marble-bag RNG for hit/crit/amount variance
- Four large line-of-sight pillars in a symmetric arena
- Basic collision and AI steering around pillars
- Shared UI/theme/rendering components

## Architecture

`src/core/` — game loop, input, geometry, RNG  
`src/entities/` — runtime actor model  
`src/systems/` — movement, AI and combat systems  
`src/rendering/` — shared Canvas rendering  
`src/ui/` — shared HUD components  
`src/content/` — all tuneable arena and character configuration

Every player class, teammate and opponent has its own folder. Tune values in each folder's `config.js`; future animation art belongs in that same folder's `assets/` directory.

The visual theme is centralized in `src/styles/theme.css`, so later palette/frame changes propagate across the HUD. Canvas rendering reads those same CSS variables.
