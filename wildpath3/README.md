# Wildpath 3.0 — Pass 1: Mobile Arena Vertical Slice

**Live:** https://hajjen-game.github.io/Hajjen/wildpath3/

Wildpath 3.0 is deliberately separate from `/wildpath/` (the preserved Wildpath 2.x game). No changes are needed in the old app to play this version.

## Product direction (agreed)

- Mobile-first portrait, large joystick, automatic skills, compact high-readability arena.
- Saturated, rounded, clean arcade fantasy with controlled highlights, drawing on the *visual clarity* of Brawl Stars and Clash Royale, without using their art/assets.
- Fights primarily test movement, positioning and placement of nature growth.
- Plants and trees created during a **whole level** carry forward their full development and fusion history.
- Later passes: `Nature Fusion 2.0` rewards intelligent fusion chains over raw flower count. **All** nature from the round creates **one** procedurally generated level tree. Player chooses **one of three** final mutations (e.g., More Blossoms). Tree gets a skill-based 1–5 star score and grows in a simple scrollable 2D Daisugi lobby.

## Playable now — Pass 1

- New standalone arcade 3D level at `/wildpath3/`.
- Raised circular arena, **13 world-unit radius** vs. Wildpath 2.x radius 43.
- Close **16.5-unit** orthographic portrait follow camera vs. 29.5 in 2.x.
- Distinct high-saturation hero and four enemy silhouettes.
- Movement on one touch thumbstick; keyboard fallback via WASD/arrows.
- Entirely **automatic** Water Dart, Tidal Pulse, Auto Renewal; **no manual combat action buttons**.
- 3 finite waves (11/15/19 spawns), different enemies, guardian finale, 2 choices of between-wave power-up selection (3 cards per intermission).
- Gold collectible seeds + existing Nature Rebirth, nature color/shape variety and basic spatial Nature Fusion ported *by reuse*, leaving old game intact.
- HUD for HP, wave, time, kills, blooms, fusions and pickups, pause, restart, failure, completion.
- Mobile performance design: low-poly-count *rounded* meshes, shared materials for characters, simple emission and no bloom shader/post-processing.
- `?debug=1`: `window.__wildpath3.read()` for basic browser smoke tests.

## Not yet implemented

The Great Fusion final level tree, mutation choices, skill-quality scoring, Daisugi lobby, persistent saves, richer nature chain combinations, final polish and device performance profiling. End-of-level text labels the future feature rather than awarding a fake 1–5 star result.

## Source structure

- `src/rules.js`: pure arena/combat/upgrade rules.
- `src/arena.js`: mobile camera, arena geometry, materials, lighting and decorative instances.
- `src/actors.js`: original modular 3D character silhouettes.
- `src/controls.js`: thumbstick, pointer capture and keyboard.
- `src/game.js`: finite playable loop, automatic combat, effects, drops, boost selection and nature adapters.
- `src/main.js`: boot, fallback and debug.
- `tests/rules.test.js`: Node tests for key gameplay rules.

### Run

Serve the repository at its root through a static web server. Open `/wildpath3/`. Babylon.js is currently loaded from CDN. In `wildpath3/`, run `npm test` or `node --test`.

### Mobile smoke test

1. Start on Android portrait, observe that the hero and enemies occupy more screen space than Wildpath 2.x.
2. Move the joystick in every direction, especially diagonals, and check the arena boundary.
3. Wait near foes: auto Water Dart and Tidal Pulse should fire without touching ability buttons.
4. Defeat foes in groups: flowers/bushes/trees grow and smaller settled plants fuse.
5. Collect gold seeds, choose one upgrade after wave 1 and wave 2, clear guardian wave 3.
6. Retry, pause/resume, rotate the phone, and compare rendering/performance.

## Pass 1.1 — Visual Restoration + Score Return (2026-10-18)

User device feedback on the first prototype identified three priorities: 2.x actor forms were more readable, the raised neon circle looked like a test scene, and visible score was missing.

**Implemented in the isolated 3.0 build:**

1. **Actual original 2.x capsule silhouettes** imported from `wildpath/src/actors-v2.js` through a thin adapter in `wildpath3/src/actors.js`, preserving actor body, face, arms, enemy silhouettes and mobile-friendly geometry.
2. **A full-bleed painted woodland** with warm stepping stones, flower details, branching woodland and partial wooden borders. `wildpath3/src/arena.js` replaces the bright raised round test platform and navy emptiness. Same 13-unit playable radius and close mobile camera.
3. **Water spell restoration**: original `wildpath/src/water-pixi.js` projectile tail and impact drawing via `wildpath3/src/vfx.js`; optional Pixi layer adds VFX on capable devices, preserving Babylon mesh fallback when unavailable.
4. **Visible arcade score**: top-right live gold score, time-limited kill combo, saved best, score popups and end-screen score; `wildpath3/src/score.js` separates scoring from the battle engine.
5. **Rewards**: enemy type, seeds, blooms/upgrades, fusion quality and wave clearing. Grove/enchanted fusion rewards exceed simple flower spamming. This is an arcade score and **not** the future 1–5 star tree-quality formula.
6. New score and visual regression tests.

**Score details:** kills 100/160/140/550 by enemy type with combo multiplier, gold seeds 25, plant generation/evolution 15/90/300/850, fusion by category 220/390/720/1400, wave clear 450. Tuning values are provisional.

**Pending:** verify rendering and performance on actual Android devices; advanced multi-stage fusion quality, final Daisugi tree generator, mutations and hub are not part of this pass. Legacy Wildpath `/wildpath/` unchanged.
