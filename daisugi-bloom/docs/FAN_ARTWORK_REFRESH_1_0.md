# Fan / Solfjäder Artwork Refresh 1.0 — 2026-11-03

**Scope:** Fan only (five stages), replacing visuals while retaining all original code/assets.

## Asset and stage mapping

- Added `daisugi-bloom/assets/fan-five-stages.webp` (1280×256 transparent RGBA WebP; 5 horizontal cells at 256×256).
- Stage 1 → user's simple single folding fan (`1000001142.png`).
- Stage 2 → user's richer single fan with ornament (`1000001140.png`).
- Stage 3 → user's pair of decorated fans (`1000001141.png`).
- Stage 4 → user's three-tier folding fan composition (`1000001139.png`).
- Stage 5 → user's ornate multi-layer Masterpiece (`1000001143.png`).
- Original uploads are preserved unchanged in the downloadable user image package; the optimized atlas crops to alpha extents, centers and resizes to fit the tiles.

## Integration and rollback

- `harmony/fan-art.css` changes only `.sprite-fan` and `.collection-fan`, leaving other eight families unmodified.
- Existing `harmony-atlas.webp` and earlier Sakura, Koi, Lantern overrides are preserved.
- `harmony/app.js` loads the Fan asset independently, retrying on failure, and assigns `has-fan-art` only when artwork finishes loading; old classic Fan artwork remains the fallback.
- Open `?fan=classic` to restore only original Fan artwork without changing player progress. May combine with `?sakura=classic`, `?koi=classic` and/or `?lantern=classic`.
- No changes to gameplay, levels, scoring, chain reactions, Director, cards or save format.

## QA

1. Inspect Fan stage 1 through stage 5 on the board and in Fusion sequences.
2. Confirm the stage-5 Fan image in the Masterpiece collection.
3. Compare new images to the original version with `?fan=classic`.
4. Check legibility and transparent edges on a mobile-sized 7×7 board.
5. Verify Sakura, Koi, Lantern and the other families unchanged.

Rollback: revert the Fan PR. Original artwork remains in GitHub and the classic atlas remains in place.