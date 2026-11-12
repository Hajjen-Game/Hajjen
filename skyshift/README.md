# SKYSHIFT 0.1 – Flight & Track Prototype

An original standalone browser 3D arcade prototype. Flowing high-speed roads meet precision platform jumps and color-changing Zone Survival.

## Play
GitHub Pages: https://hajjen-game.github.io/Hajjen/skyshift/ (once deployed). Landscape orientation is recommended on phones.

- Desktop: A/D or left/right arrows to steer, Space to jump, P or Esc to pause.
- Mobile: drag the left control to steer and tap/hold JUMP on the right.
- Jump across missing road, navigate split routes, survive increasing speed. A fall costs 35 shield and repositions you; 0 shield ends the run.
- Export telemetry from the results screen with EXPORT RUN DATA.

## Architecture
- index.html: responsive menu, HUD, results and mobile controls.
- style.css: neon arcade visuals.
- track.mjs: deterministic modular track planner, continuity, surface masks, zone and mathematical jump envelope checks. Pure JS.
- game.mjs: Three.js renderer, procedural ribbon mesh, ship model, camera, flight, landings, controls, palette and run telemetry.
- track.test.mjs: deterministic track and collision logic tests.

Standalone GitHub Pages subdirectory; no build step. Three.js version 0.180.0 is pinned from jsDelivr, so an internet connection is needed for initial module loading. No images or media files are required.

## Prototype limitations
Contains Flow Roads, Precision Gaps, Surge Gaps, Split Routes and gentle Vertical Sections. These are procedural prototypes, not yet a curated hand-authored segment library or advanced AI Director. Gap fairness is checked mathematically for same-height jumps and still requires real mobile playtesting. No music, opponents, weapons, production settings or advanced collision models in v0.1.

This project is isolated in /skyshift/ and does not change the other games in this repository.

## Tests
Run: node --test skyshift/track.test.mjs
