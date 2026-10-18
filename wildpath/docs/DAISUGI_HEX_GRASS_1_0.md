# Wildpath – Hex Grass 1.0

## Play on mobile

- **Daisugi with Hex Grass:** https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1&rev=hex-grass-1-0
- **Same Daisugi with previous plain grass (A/B):** https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1&hex=0&rev=hex-grass-1-0
- **Original Wildpath:** https://hajjen-game.github.io/Hajjen/wildpath/

## Goal

Subtly divide the large clean meadow into readable hexagonal patches in a few different shades of green, without looking like a hex-board game. Keep player-grown nature as the focus.

## Implementation

- `src/hex-grass.js` creates a **single static vertex-colored Babylon mesh**, not thousands of separate draw calls, textures, shader passes or tiles with colliders.
- About **3,039** pointy-top hex cells, with **five** green shade variations distributed by a deterministic grid-coordinate hash.
- Each tile has 13 vertices, a broad center color and a soft peripheral ring blended nearly back to the meadow base color. **No black outlines or edge geometry.**
- Original woodland radial color gradient (center to the outer teal perimeter) remains the basis for each tile's colors.
- The whole terrain retains the original size **180×180 world units** and gameplay radius **43**. Tile size `2.05` world units gives approximately 7 hex columns across the 24.5-unit Daisugi portrait camera width.
- At most **39,507** vertices and **54,702** triangles across the full existing 180-unit floor, all in one mesh. The unchanged original ground still exists but is hidden **only when Hex Grass is on**, avoiding overlapping/z-fighting floors.
- `world-open.js` exposes an optional `hexGrass=false` option; the default keeps original flat grass. The mode is enabled only in Daisugi via `main.js`:
  `hexGrass:DAISUGI_MODE&&params.get('hex')!=='0'`.
- No changes to camera, speed, joystick, game terrain bounds, enemy movement, combat text, spells, spawn logic, NatureGrowth, or fusion rules. Previous Daisugi feature (`staticVegetation:false`) is preserved.

## Validation

- `tests/hex-grass.test.js` covers five colors, deterministic geometry counts, performance budget, correct upward winding/backface visibility, non-colliding single-mesh rendering and Daisugi-only enablement.
- Updated clean-field regression for the optional `hexGrass` parameter.
- Source syntax checks and nine isolated tests all passed; full browser rendering and actual Android device performance must still be evaluated.

## Next visual review

Compare the two test links on your phone. We can tune the hexagon size and shade contrast without touching any game mechanics. Preferred outcome: calm, varied grass that stays secondary to fusion-born plants.

## Hex Grass 1.1 — visibility correction after first Android screenshot

The first live Samsung/Android screenshot showed almost uniformly dark green ground rather than any readable hexagons. The original changes were technically present and had passed geometry tests, but this did **not** prove visual readability on a mobile GPU.

Corrected **only** the Daisugi hex renderer:
- Increased the five tile shade offsets (green brightness spread from **0.086 to 0.247** normalized RGB) so differences stay visible after screen scaling.
- Expanded visible individual tile color at edges (`edge=blend(base,tinted,.62)` instead of `.18`), retaining a soft boundary without black outlines.
- Added a dedicated **unlit StandardMaterial**, which does not inherit the original floor's dramatic lighting-related darkening; specular remains zero.
- Disabled back-face culling for the single hex floor, ensuring it cannot vanish depending on device/triangle winding. The original ground stays available underneath but hidden only in hex mode.
- Changed nested imports and HTML asset version keys for mobile cache refresh.
- Added unit test assertions for color spread, unlit material and disabled back-face culling.

**New preview:** https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1&rev=hex-visible-1-1

**Flat grass comparison:** https://hajjen-game.github.io/Hajjen/wildpath/?daisugi=1&hex=0&rev=hex-visible-1-1

JavaScript checks and 10 test cases passed; actual Android rendering still requires the next visual screenshot.
