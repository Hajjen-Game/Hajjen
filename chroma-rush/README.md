# CHROMA RUSH — Core Prototype 1.0

A landscape HTML5 neon speed-survival arcade game. Play online at https://hajjen-game.github.io/Hajjen/chroma-rush/ (provided GitHub Pages is enabled for main / repository root).

## Playing

- Landscape mobile: tap **JUMP** with the left thumb, hold **DUCK** with the right thumb.
- Desktop: Space/ArrowUp/W to jump, ArrowDown/S to duck; P or Esc to pause.
- Survive while the speed increases continually and the world changes through eight neon color zones.
- Each hit removes 25 of 100 starting HP; low HP triggers a warning.
- Adaptive Flow Director cycles BUILD, PEAK, FADE and RELAX and inserts safe microbreaks without lowering speed.

## Files

- `index.html` — page structure and user interface.
- `style.css` — responsive landscape HUD and touch controls.
- `director.js` — adaptive hazard pacing and safety spacing.
- `game.js` — movement physics, rendering, collision detection, particles and audio.

The game is entirely static and works without any build step, packages, external assets, trackers or network requests. Open `index.html` locally or serve this folder through a static web server.

## Development notes

Original prototype version: 1.0 (6 November 2026). Canvas2D is deliberately used for this first playable version. The source was extracted from the identical standalone prototype so gameplay remains unchanged. Run testing and physical-device tuning before changing director timing and physics. Future effects can migrate to PixiJS without changing the game rules.
