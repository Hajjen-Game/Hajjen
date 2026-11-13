# SKYSHIFT 0.3.4 — Clean Track & Premium World Rebuild

First Flight 2.0 remains a **finite, handcrafted, 1300 m 3D trial**. Version 0.3.4 is a deliberate visual simplification and world rebuild in response to feedback that the dark squares and glowing chips made the route harder to read, added little value, and could waste rendering resources.

## Play
https://hajjen-game.github.io/Hajjen/skyshift/

## Changes

### 1. Clean Track
- All 0.3.3/0.3.3.1 **dark decorative square panels** and repeated emissive chips are eliminated from the **active** scene. The historical identity files remain only for comparison/rollback.
- The new `identity-v034.mjs` produces a small set of functional lane guides, landing brackets and cyan/magenta safe-risk route accents. It never paints across a real void.
- The existing physically authored road, HDR edge rails, centerline, landing-edge and amber jump warnings are kept. No change to collision.

### 2. Premium World Rebuild
- `world-v034.mjs` replaces **155 repeated cylinder rocks**, the old instanced octahedron poles and the distant artificial neon grid.
- About 54 sculpted, multi-ring, faceted canyon formations (3 silhouette families) use instanced geometries with material color and face variation, rather than a forest of simple columns.
- Five paired engineered landmark positions use shared 6-sided forms and recessed accents, carefully outside the road.
- This gives fewer, more recognizable world shapes instead of increasing decoration density.

### 3. Ship premium pass
- `ship-v034.mjs` adds a restrained, shaped canopy spine, integrated shoulder armor, polished rear vents and minimal cyan/magenta inlays instead of accumulating many rectangular fins.
- **The opaque turquoise disc beneath the player is removed**; the replacement is a soft, dark, non-emissive contact shadow, shown only when solid road actually exists beneath the craft.
- Flight physics, craft position, banking, jump motion and camera are unchanged.

### 4. Performance & audit
- New telemetry reports surface accent count, decorative plate count (0), world formation/landmark counts and renderer draw call/triangle counters.
- Draw calls are a **renderer workload proxy**, NOT a GPU frame-time or a controlled before/after benchmark. A real mobile device run is still needed before making performance claims.
- The target remains modern mobile GPUs and desktop WebGL; up to 2x device-pixel ratio, the existing HDR UnrealBloom settings and the brighter 0.3.3.1 atmosphere are retained. The older Galaxy A51 is not the quality target.

## Active modules
- `index.html` / `style-v034.css` / `game-v034.mjs`
- `identity-v034.mjs` — minimal functional surface accents
- `world-v034.mjs` — sculpted canyon and engineered landmarks
- `ship-v034.mjs` — clean hero craft details and dark contact shadow
- `trial-v03.mjs` — **unchanged** real gaps, road geometry and physics
- `luminance-v0331.mjs`, `neon-v032.mjs`, `premium-v032.mjs`, `fullscreen-v02.mjs` — unchanged visual/controls baselines

## Verify
- `node --check skyshift/identity-v034.mjs skyshift/world-v034.mjs skyshift/ship-v034.mjs skyshift/game-v034.mjs` (run node --check individually if the local Node version requires it).
- `node --test skyshift/clean-v034.test.mjs` for decoration/geometry correctness and visual-module integration.
- GitHub Actions also runs all earlier track logic, neon/luminance and fullscreen regression tests.

## What to assess in screenshots
- 40–100m: uncluttered road, no dark tiles, clean ship outline.
- 330–430m: Sky Islands still readable and still require lateral landings.
- 560–680m: safe/risk route colors still communicate deliberate choice.
- 900–1300m: new world silhouettes and cleaner finish presentation.

Gameplay, checkpoint recovery, score logic, fullscreen and previous best remain unchanged. No new level, weapon, audio or endless mode. No other games in the repository are affected.