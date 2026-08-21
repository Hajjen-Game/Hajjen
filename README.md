# HAJJEN

HAJJEN is a cozy top-down browser game about Sharkan, a whale-shark explorer who discovers primal forces, gathers ingredients and experiments with magic.

## Current branch prototype — HAJJEN 2D v0.1

The `hajjen-2d` branch now launches the first seamless-world foundation for the new handcrafted 2D direction.

- 3600 × 3600 continuous Crossroads/meadow/light-forest test world
- Canvas-based top-down renderer
- Modern pixel-art-inspired faceted placeholder terrain and props
- WASD and arrow-key movement
- Normalized diagonal movement and delta-time speed
- Four static Sharkan facing directions (temporary procedural placeholder)
- Foot-anchor player position and compact collision footprint
- Physical collisions for trees, rocks and bushes
- Walkable paths, grass, flowers and decorative plants
- Smooth bounded follow camera
- Chunk-based object lookup and viewport culling
- Y-sorted player/world depth
- F2 collision/debug overlay
- Existing Backpack and Spellbook modules preserved and reused
- Old portal/scene implementation retained in source but no longer used by the v0.1 entry point

## New 2D layout

```text
Hajjen/
├── index.html
├── css/
│   ├── game-2d.css
│   └── ...legacy/preserved styles
├── js/
│   ├── 2d/
│   │   ├── main.js
│   │   ├── config.js
│   │   ├── world-data.js
│   │   ├── camera.js
│   │   ├── collision.js
│   │   └── renderer.js
│   ├── core/
│   ├── player/      # preserved previous implementation
│   ├── systems/     # reusable gameplay systems
│   └── data/        # preserved previous zone data
├── assets/
│   ├── 2d/reference/
│   │   ├── terrain/
│   │   ├── vegetation/
│   │   └── sharkan/
│   └── ...legacy/preserved assets
└── docs/
    └── HAJJEN_2D_V0_1.md
```

The reference sheets in `assets/2d/reference/` are visual masters, not production sheets that should be drawn directly into the game. Individual transparent production assets can replace the current placeholders later without changing the world architecture.

## Running locally

Because the project uses JavaScript modules, serve the repository from a local HTTP server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Branch safety

New 2D development belongs exclusively on `hajjen-2d`. `main` is the preserved legacy version and must not be modified by HAJJEN 2D work.

See `docs/HAJJEN_2D_V0_1.md` for the repository inspection, architecture decisions and expansion path.
