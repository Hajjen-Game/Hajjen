# CHROMA RUSH — Core Prototype 1.1

A landscape HTML5 neon speed-survival arcade game. Play online at https://hajjen-game.github.io/Hajjen/chroma-rush/ (provided GitHub Pages is enabled for main / repository root).

## Playing

- Landscape mobile: tap **JUMP** with the left thumb, tap **DUCK** with the right thumb. Every tap ducks for 0.55 seconds, then automatically stands with 0.12 seconds of recovery; holding cannot extend or repeat the action.
- Desktop: Space/ArrowUp/W to jump, tap ArrowDown/S to duck; P or Esc to pause. Key repeat is ignored.
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

## Core Prototype 1.1 — Tap Duck

Duck is a time-limited tap action rather than a hold state. Only a fresh press can trigger a crouch; releasing early does not cancel it, and holding a finger/key cannot repeat it. Duck presses during jump, another duck, or recovery are ignored (not queued). AI Director and jump timing remain unchanged.
