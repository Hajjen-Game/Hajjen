# Origami Artwork Refresh 1.0 — 2026-11-03

**Scope:** Replace Origami stages 1–5 only using the five original images provided by the user (no image generation).

## Asset and mapping

- New dedicated sprite `daisugi-bloom/assets/origami-five-stages.webp` (1280×256 lossless transparent WebP; five 256×256 stages, left to right).
- Stage 1: `1000001125.png` — simple origami crane with Sakura and wave paper pattern.
- Stage 2: `1000001124.png` — more elaborate blue-gold paper crane.
- Stage 3: `1000001126.png` — wide-winged origami bird with layered paper plumes.
- Stage 4: `1000001127.png` — elaborate origami phoenix with descending paper feathers and floral gold ornaments.
- Stage 5: `1000001128.png` — spectacular symmetrical Masterpiece crane with fans and flowing layered wings.
- All five supplied 1254×1254 PNG files are preserved unchanged in the user-exportable source ZIP. Optimized sprites are alpha-trimmed, centered at about 90% of the square cell and downsampled to 256px.

## Implementation & rollback

- `harmony/origami-art.css` overrides only `.sprite-origami` on the board and the `.collection-origami` Stage-5 Masterpiece inside the collection.
- `harmony/app.js` loads the atlas independently through the existing image recovery/preload path, and activates the CSS only after image load succeeds.
- `?origami=classic` switches only Origami back to the old artwork from `harmony-new-families.avif`, with no save changes. It can be combined with all six preceding per-family `classic` switches.
- Original image atlas, prior Sakura, Koi, Lantern, Fan, Sushi, Maneki-neko refreshes, game mechanics, Director, level design, and saved game progress remain untouched.

## QA

1. Confirm Origami stages 1–5 show the expected artwork on the game board; view the five stages after Fusion.
2. Confirm the Stage-5 Masterpiece in the collection uses the new image.
3. Check transparency/antialiasing on dark mobile board cells and that wings remain visible.
4. Open `?origami=classic` to compare old artwork and verify other families are unchanged.
5. Reload an in-progress game and confirm all saves work.

Full rollback is possible by reverting this PR, as the original assets are unchanged.