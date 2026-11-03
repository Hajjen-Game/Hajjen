# Ryū Dragon Artwork Refresh 1.0 — 2026-11-03

**Scope:** Replace *only* Ryū Dragon imagery, stages 1–5, with the five **user-provided** refined icons. No new art generated. Keep other eight families, game code logic, progression, Director, and saved progress unchanged.

## File mapping

| Stage | User original 1254×1254 RGBA PNG | Description |
| --- | --- | --- |
| 1 | `1000001190.png` | Young curled dragon with large eyes |
| 2 | `1000001187.png` | Dragon with glowing orb |
| 3 | `1000001188.png` | Flying dragon with extended foreclaw |
| 4 | `1000001189.png` | Proud dragon on rocks amid Sakura and waves |
| 5 | `1000001186.png` | Masterpiece dragon with luminous moon, blossoms and lanterns |

## Implementation

- `assets/ryu-five-stages.webp`: transparent, **lossless WebP** strip, 1280×256 (five 256×256 cells in the table order). Each uploaded illustration was carefully alpha-trimmed and proportionally resized into its cell; only isolated almost-transparent edge residue (<12/255 alpha) was suppressed. Original colors and designs preserved. Source PNGs are included unchanged in the downloadable user archive.
- `harmony/ryu-art.css`: a family-specific override for the 7×7 board and Masterpiece collection, loaded after preceding family styles.
- `harmony/app.js`: dedicated `sprite-ryu` and `collection-ryu` classes, matching the new-family stage mapping; separate preload and recovery via `has-ryu-art`, `--harmony-ryu-art`.
- `?ryu=classic` disables the new Ryū sprite resource and shows the previous art. This is independent of `?sakura=classic`, `?koi=classic`, `?lantern=classic`, `?fan=classic`, `?sushi=classic`, `?maneki=classic`, `?origami=classic`, `?bonsai=classic`.
- The existing `assets/harmony-new-families.avif` is **preserved** and remains a fallback if the new image fails to load. No game data or save migration.

## QA checklist

1. Confirm Ryū stages 1–5 on board; ensure poses and art progression match uploaded images.
2. Confirm Stage 5 in the Masterpiece collection.
3. Verify alpha blending and readable silhouettes on a phone-sized dark board; no colorful fringing.
4. Check `?ryu=classic` shows previous Ryū while the other eight families remain on their refreshed art.
5. Reload an existing saved game; check objective, score, Fusion and Director remain unchanged.
6. Verify GitHub Pages deployment and CI after PR merge.

**Whole-repository rollback:** revert the pull request, or leave the new files and use the per-family classic toggle when testing.
