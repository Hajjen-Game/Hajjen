# Koi Artwork Refresh 1.0 — 2026-11-03

Scope: **Koi stages 1–5 only**, using the five explicitly approved images in this conversation. No newly generated illustrations.

## Asset and exact stage mapping

- `daisugi-bloom/assets/koi-five-stages.webp` is an RGBA 5×1 sprite strip, 1280×256 px, 256×256 per cell.
- Stage 1: the simple koi with water droplets (`1000001179.png`).
- Stage 2: ascending koi with sakura and flowing ornaments (`1000001182.png`).
- Stage 3: downward-turning koi with waves and sakura (`1000001180.png`).
- Stage 4: upward koi with lotus and waves (`1000001181.png`).
- Stage 5: elaborate masterpiece with rising sun, bridge and pagoda (`1000001183.png`).
- Each 1254×1254 supplied original remains unchanged in the user's downloadable source archive. Source images were cropped to the visible alpha region, centered at 90% maximal dimension and downsampled with LANCZOS for the game. Extremely low-alpha (<11/255) stray background pixels were removed to retain clean transparency.

## Implementation and rollback

- Independent `harmony/koi-art.css` renders the new strip on all five Koi stages, and the Koi stage-5 collection icon.
- The new CSS loads after `mobile-game.css` to override the **special old stage-1 standalone Koi sprite** as well as atlas stages 2–5.
- `harmony-atlas.webp`, `koi-stage1.avif`, `harmony-new-families.avif` and the newer Sakura strip remain untouched.
- The main game's URL with `?koi=classic` disables new Koi artwork and restores all previous Koi stage rendering without editing player saves. `?sakura=classic&koi=classic` disables both artwork trials.
- Missing/unavailable new asset: old Koi visuals remain as automatic fallback; the new class is activated only after image load succeeds.
- No gameplay, director, objectives, level balance, progression, scores, power cards, or save format changes.

## QA

1. Load game and inspect all five Koi stages (including original stage-1 legacy override) and collection Masterpiece.
2. Verify Sakura and all seven other families are unchanged.
3. Compare Koi using `?koi=classic` and re-enable by dropping the query parameter.
4. Inspect transparent edges on dark board cells; check mobile-size legibility and Fusion transition.
5. Reload existing save; confirm stage data and score consistency.

Repository rollback: revert this PR if the look is not approved. Originals remain unchanged.