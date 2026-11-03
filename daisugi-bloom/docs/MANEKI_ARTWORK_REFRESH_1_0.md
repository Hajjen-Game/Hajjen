# Maneki-neko Artwork Refresh 1.0 — 2026-11-03

**Scope:** replace Maneki-neko visuals only (stages 1–5), using the five user-supplied 1254×1254 RGBA images. No newly generated artwork.

## Art and mapping

- `assets/maneki-five-stages.webp` is a 1280×256 transparent, lossless WebP sprite strip (five 256×256 cells). Left to right corresponds to stage 1–5.
- Stage 1: original upload `1000001154.png` — seated lucky cat with ribbon, bell and Sakura.
- Stage 2: original upload `1000001156.png` — lucky cat with golden plaque.
- Stage 3: original upload `1000001155.png` — lucky cat with decorated collar and plaque.
- Stage 4: original upload `1000001158.png` — elaborate lucky cat with golden charms and coins.
- Stage 5: original upload `1000001157.png` — maximal Masterpiece with ornate floral arch.
- The original uploads are retained unchanged in the downloadable source ZIP. Each new sprite is alpha-cropped, centered at about 88% of its square, and downsampled from the supplied artwork.

## Integration and safety

- `harmony/maneki-art.css` is loaded after `mobile-game.css` and other artwork overlays. It explicitly overrides the *older standalone Maneki stage-1 AVIF* CSS and stages 2–5 from `harmony-new-families.avif`.
- The changes in `app.js` set the family-specific classes for all board sprites and the stage-5 Masterpiece collection image.
- The game's existing image loader activates the new art only after successful load. If it is unavailable, original sprites stay visible.
- Add `?maneki=classic` to the game URL to display the original art for all five stages. It can combine with the existing `sakura`, `koi`, `lantern`, `fan`, and `sushi` classic switches.
- Original `assets/maneki-stage1.avif`, `assets/harmony-new-families.avif`, and all earlier family art are preserved. No level rules, progression, objectives, Director, Fusion, inventory or save changes.

## QA

1. Confirm stages 1–5 display the new Maneki sprites on a small phone board.
2. Confirm stage 1 is *not* overridden by the older standalone `maneki-stage1.avif` when both images have loaded.
3. Confirm the Stage 5 Masterpiece collection uses the final new sprite.
4. Compare `?maneki=classic` against the new art; ensure save progress is unchanged.
5. Check Sakura, Koi, Lantern, Fan, Sushi and remaining family graphics stay as before.

Rollback for all users: revert this PR. The original art remains in the repository.