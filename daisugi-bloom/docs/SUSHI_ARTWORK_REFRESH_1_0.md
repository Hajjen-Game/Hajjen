# Sushi Artwork Refresh 1.0 — 2026-11-03

**Scope:** Replace only the five Sushi-family illustrations. The supplied original PNGs are used without generating new art.

## Asset and stage mapping

- Game sprite: `daisugi-bloom/assets/sushi-five-stages.webp` — 1280×256 transparent, lossless WebP, left to right five 256×256 frames.
- Stage 1: `1000001161.png` — one salmon nigiri with Sakura blossom.
- Stage 2: `1000001159.png` — two nigiri, salmon and tuna.
- Stage 3: `1000001160.png` — salmon and tuna nigiri with ikura gunkan.
- Stage 4: `1000001163.png` — four-piece assortment with shrimp and ikura.
- Stage 5: `1000001162.png` — elaborate assorted sushi Masterpiece platter with Sakura ornaments.
- Original 1254×1254 PNGs are preserved unchanged in the delivered downloadable source archive.
- The icon trim uses alpha-content bounds and soft-antialiased transparency, with icon artwork sized to approximately 90% of each sprite square.

## Technical changes and rollback

- `harmony/sushi-art.css` targets `.sprite-sushi` and `.collection-sushi` only, with additional specificity because Sushi belongs to the newer-family 5×4 image atlas.
- `harmony/app.js` assigns sprite and Masterpiece collection classes, independently loads the new image, retries network failures, and applies `has-sushi-art` only after successful image load.
- `?sushi=classic` suppresses the new image resource and restores the original Sushi family from unchanged `harmony-new-families.avif`. Player save data is unaffected.
- The Sushi switch can be combined with `?sakura=classic`, `?koi=classic`, `?lantern=classic` and `?fan=classic`.
- No changes to any other family art, game rules, levels, fusion, Director, stars, scores, inventory, or saved progress.

## QA to perform on live deploy

1. Confirm Sushi stage 1–5 all render, particularly stages 4 and 5 on dark board backgrounds.
2. Verify stage 5 in the Masterpiece collection uses the new Sushi image.
3. Toggle `?sushi=classic` and confirm *only* Sushi reverts.
4. Test a Fusion involving Sushi and reload the same save.
5. Confirm all previous family refreshes remain intact.

To revert across all players, revert the PR. Original Sushi atlas remains in GitHub throughout.