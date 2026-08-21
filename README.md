# HAJJEN

HAJJEN is a cozy top-down browser game about Sharkan, a whale-shark explorer who learns six primal forces and mixes ingredients into custom spells.

## Current direction

- Browser game built with HTML, CSS and JavaScript
- Fixed internal game resolution: 1920 × 1080
- Top-down / three-quarter low-poly visual style
- WASD movement constrained to paths
- Space to jump
- I opens the backpack
- B opens the spellbook
- Intro zone leads to six primal-force zones: Growth, Ember, Flow, Stone, Gale and Aether
- Combat happens later in caves and uses prepared spells

## Project layout

```text
Hajjen/
├── index.html
├── css/
│   ├── game.css
│   ├── ui.css
│   └── spellbook.css
├── js/
│   ├── main.js
│   ├── config.js
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

See `docs/PROJECT_STRUCTURE.md` for the detailed structure and conventions.

## Development rule

Game logic and visual assets stay separate. Character sprites, zone backgrounds, item icons and UI images should never be embedded as base64 inside the game code. Each asset gets its own file so it can be replaced or inspected independently.
