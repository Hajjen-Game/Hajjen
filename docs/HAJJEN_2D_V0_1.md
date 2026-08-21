# HAJJEN 2D v0.1

## Repository inspection summary

The preserved prototype used `index.html` + `js/main.js` as its entry point. Rendering was DOM/CSS based, with one `.scene` element per zone. `js/player/movement.js` constrained Sharkan to path corridors, while `js/systems/zones.js` switched between separate scenes through portals. Player direction and delta-time movement were already present. Inventory, Spellbook, dialogue and shared state were isolated modules and therefore suitable for reuse.

## v0.1 implementation plan and decisions

1. Keep all legacy code/assets intact on `hajjen-2d`; never modify `main`.
2. Replace the branch entry point with a Canvas-based continuous 2D overworld.
3. Keep world data separate from rendering and movement logic.
4. Use a 3600×3600 representative Crossroads/meadow/light-forest test world.
5. Use chunks for object lookup/culling and physical object footprints for collision.
6. Use a foot-anchor world position for Sharkan and Y-sort player/world objects.
7. Use delta-time movement with normalized diagonals and four static facing directions.
8. Use a smooth bounded camera.
9. Reuse the existing game state, Backpack and Spellbook modules.
10. Isolate the old portal/zone architecture by leaving it in place but not importing it from the new entry point.

## New architecture

- `js/2d/config.js` — world, camera and player tuning.
- `js/2d/world-data.js` — paths, region metadata, props and chunk generation.
- `js/2d/collision.js` — player footprint and environmental collision.
- `js/2d/camera.js` — smoothed, world-bounded follow camera.
- `js/2d/renderer.js` — terrain, paths, prop rendering, culling and Y-depth sorting.
- `js/2d/main.js` — input/game loop and integration with preserved gameplay systems.
- `css/game-2d.css` — responsive full-window presentation and crisp Canvas rendering.

## Art status

The three files under `assets/2d/reference/` are master visual references, not production sprite sheets to place directly into the world. v0.1 currently uses procedural placeholder rendering for terrain/props and a deliberately temporary four-direction Sharkan placeholder. Production-ready transparent individual assets should replace these render functions later without changing movement, camera, collision or world architecture.

## Debug mode

Press `F2` to display Sharkan's collision footprint, environmental collision footprints and basic world/culling information. Debug rendering is disabled by default.

## Expansion path

The region data model is prepared for later Central/Crossroads, Growth, Ember and Aether definitions. Future region additions should extend world data and asset palettes rather than reintroducing portal-based scene switching.
