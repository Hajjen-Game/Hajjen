# PvP-2.5D

Separate Babylon.js implementation of the existing single-player 3v3 arena game.

## Gameplay source of truth

Baseline: `5164b0f29e96d4e210c13913b93833dc429925ec`.

At project start, 63 non-rendering JavaScript modules under `arena3v3/src` were compared with current main. 56 were byte-identical and are reused directly. The gameplay modules that had changed are frozen from the baseline under `src/gameplay/original/`.

`src/core/Game.js` is adapted from the baseline orchestrator. Simulation order and gameplay systems remain original; Canvas rendering and the old UI manager are replaced.

## Layers

- Gameplay/simulation: original content and systems.
- Babylon presentation: `src/rendering/babylon/`.
- HTML/CSS UI: `src/ui/` and `src/styles/`.
- Simulation-to-presentation VFX bridge: `src/systems/VisualEventSystem.js`.

Babylon visuals never determine damage, healing, hit timing, LOS, CC or match results.

## Arena

Verdant Crucible is new. The four visible ruin blocks are built from the same obstacle rectangles used by gameplay collision and LOS.

Use `?debug=1` for FPS, active meshes, actor count and live VFX.
