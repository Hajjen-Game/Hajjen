# Sharkan assets

This folder contains production assets for Sharkan.

## Planned folders

- `reference/` — approved master/reference art.
- `idle/down`, `idle/up`, `idle/left`, `idle/right` — directional idle sprites.
- `walk/down`, `walk/up`, `walk/left`, `walk/right` — four-frame directional walk cycles.
- `jump/` — jump animation assets.
- `combat/` — later combat-specific poses/animations.

Git does not store empty directories, so the actual subfolders will appear automatically when their first sprite files are added.

## Naming convention

`sharkan_<animation>_<direction>_<frame>.png`

Examples:

- `sharkan_idle_down.png`
- `sharkan_walk_down_01.png`
- `sharkan_walk_down_02.png`
- `sharkan_walk_down_03.png`
- `sharkan_walk_down_04.png`

## Sprite consistency

Directional sprites should share the same canvas dimensions, camera, character scale and ground/foot anchor. Use real alpha transparency and avoid baked-in ground shadows.
