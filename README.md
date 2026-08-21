# HAJJEN

HAJJEN is a cozy top-down browser game about Sharkan, a whale-shark explorer who learns six primal forces and mixes ingredients into custom spells.

## Current prototype

The GitHub project has now been modularized from the previous single-file v5 prototype.

- Browser game built with HTML, CSS and JavaScript modules
- Fixed internal resolution: 1920 × 1080
- Proportional browser scaling
- WASD movement constrained to paths
- Space to jump
- I opens the backpack
- B opens the spellbook
- Introduction Zone / The Crossroads
- Professor Morrow dialogue
- Ember Zone and Ember Keeper dialogue
- Experimental four-frame DOWN walk cycle

## Project layout

```text
Hajjen/
├── index.html
├── css/
├── js/
│   ├── core/
│   ├── player/
│   ├── systems/
│   └── data/
├── assets/
│   ├── characters/
│   ├── zones/
│   ├── items/
│   └── ui/
└── docs/
```

See `docs/PROJECT_STRUCTURE.md` and `docs/SPRITE_WORKFLOW.md` for the detailed structure and conventions.

## Asset import

The code references normal image files instead of embedding images as base64. The expected v5 image paths are listed in `assets/ASSET_MANIFEST.md`.

## Running locally

Because the project uses JavaScript modules, use a small local web server rather than double-clicking `index.html`.

Example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Development rule

Game logic and visual assets stay separate. A character sprite, zone background or UI image should be replaceable without rebuilding the rest of the game.
