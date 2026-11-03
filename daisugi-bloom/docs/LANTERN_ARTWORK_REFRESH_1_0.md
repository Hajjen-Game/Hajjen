# Lantern Artwork Refresh 1.0 — 2026-11-03

Scope: **Lantern (Lykta) only, stages 1–5**, using the five original images supplied by the user. No image generation.

## Asset

- New transparent five-column strip `daisugi-bloom/assets/lantern-five-stages.webp`, 1280×256 px, each frame 256×256.
- Stage 1: simple round Sakura paper lantern (`1000001144.png`).
- Stage 2: round lantern with red ribbon and golden ornaments (`1000001145.png`).
- Stage 3: Japanese roof-shaped lantern with sakura blossoms (`1000001146.png`).
- Stage 4: taller illuminated shrine lantern with hanging side lanterns (`1000001147.png`).
- Stage 5: magnificent landscape lantern with a red sun, bridge, blossoms and gold ornaments (`1000001148.png`).
- Supplied original sources are retained at 1254×1254 in the accompanying exported asset archive, with pixels unaltered.
- Sprite images retain true RGBA transparency, preserving the watercolour illustration. Cropped to meaningful alpha, centered and downsampled with LANCZOS.

## Game integration & A/B rollback

- `harmony/lantern-art.css` overrides **only Lantern** sprites and the Lantern Stage-5 collection image after `harmony/mobile-game.css`.
- Artwork preload uses the existing error-retry mechanism. The new art class is activated only after the WebP has successfully loaded; otherwise the old classic atlas remains visible.
- `?lantern=classic` restores the previous Lantern sprites without altering game saves. This parameter can be combined with `?sakura=classic` and/or `?koi=classic`.
- **Unchanged:** original `assets/harmony-atlas.webp`, Sakura, Koi, every other family, levels, mechanics, Director, scores, star thresholds, power cards and progression.

## Manual QA

1. Reload the game and inspect all five Lantern stages on the board and in a fusion.
2. Verify the stage-5 Lantern Masterpiece inside the collection.
3. Compare normal game to `?lantern=classic`; check original and new stage graphics.
4. Check transparency and readability on a phone-sized board tile.
5. Confirm Sakura, Koi and all other families remain unchanged and player progress still loads.

Repository rollback: revert this artwork PR. The original classic atlas remains intact throughout.