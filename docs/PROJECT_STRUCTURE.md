# HAJJEN project structure

This repository is structured so that each part of the game can be changed independently without rebuilding one giant HTML file.

## Root

- `index.html` — minimal browser entry point.
- `css/` — presentation only.
- `js/` — game code and data.
- `assets/` — image/audio assets.
- `docs/` — design and technical documentation.

## Assets

```text
assets/
├── characters/
│   ├── sharkan/
│   │   ├── reference/
│   │   ├── idle/
│   │   │   ├── down/
│   │   │   ├── up/
│   │   │   ├── left/
│   │   │   └── right/
│   │   ├── walk/
│   │   │   ├── down/
│   │   │   ├── up/
│   │   │   ├── left/
│   │   │   └── right/
│   │   ├── jump/
│   │   └── combat/
│   ├── npcs/
│   │   ├── professor/
│   │   └── primal-keepers/
│   │       ├── growth/
│   │       ├── ember/
│   │       ├── flow/
│   │       ├── stone/
│   │       ├── gale/
│   │       └── aether/
│   └── bosses/
├── zones/
│   ├── intro/
│   ├── growth/
│   ├── ember/
│   ├── flow/
│   ├── stone/
│   ├── gale/
│   └── aether/
├── items/
│   ├── ingredients/
│   │   ├── growth/
│   │   ├── ember/
│   │   ├── flow/
│   │   ├── stone/
│   │   ├── gale/
│   │   └── aether/
│   └── objects/
└── ui/
    ├── logo/
    ├── start-screen/
    ├── backpack/
    ├── spellbook/
    ├── hud/
    └── icons/
```

### Sharkan sprite naming

Use predictable names so animation code can load frames without special cases:

- `sharkan_idle_down.png`
- `sharkan_walk_down_01.png`
- `sharkan_walk_down_02.png`
- `sharkan_walk_down_03.png`
- `sharkan_walk_down_04.png`
- same pattern for `up`, `left`, and `right`

All directional gameplay sprites should use the same canvas size, scale and foot-anchor convention. Transparent PNG is preferred.

## JavaScript

```text
js/
├── main.js
├── config.js
├── core/
│   ├── game.js
│   ├── input.js
│   ├── renderer.js
│   └── asset-loader.js
├── player/
│   ├── sharkan.js
│   ├── movement.js
│   └── animation.js
├── systems/
│   ├── collision.js
│   ├── interaction.js
│   ├── inventory.js
│   ├── spellbook.js
│   ├── dialogue.js
│   ├── zones.js
│   └── combat.js
└── data/
    ├── ingredients.js
    ├── spells.js
    ├── npcs.js
    └── zones.js
```

The exact modules can evolve as the game grows. We should not create complexity merely for its own sake; files should be split when they represent genuinely different responsibilities.

## CSS

```text
css/
├── game.css
├── ui.css
└── spellbook.css
```

## Rules

1. Never embed large images/base64 data directly in HTML, CSS or JavaScript.
2. Keep generated art as independent files in `assets/`.
3. Sharkan animation frames must preserve a common canvas, scale and foot anchor.
4. Keep gameplay data such as spells and ingredients separate from rendering code.
5. Prefer small focused modules over one giant game file.
6. Keep `main` in a working state; larger changes should eventually be developed on branches and merged after testing.
7. Add folders when needed rather than creating dozens of empty speculative directories.

## Current asset workflow

For Sharkan, the first production target is:

```text
assets/characters/sharkan/
├── reference/
├── idle/
│   ├── down/
│   ├── up/
│   ├── left/
│   └── right/
└── walk/
    ├── down/
    ├── up/
    ├── left/
    └── right/
```

Each walking direction uses four frames. Each direction also has its own idle sprite. This keeps the sprite system inspectable and lets individual frames be replaced without touching game code.
