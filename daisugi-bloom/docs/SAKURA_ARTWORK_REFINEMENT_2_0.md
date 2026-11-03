# Sakura Artwork Refinement 2.0 — 2026-11-03

Replace only Sakura's five-stage icon set with the five **new user-uploaded** illustrations. No image generation, no changes to other eight families, rules, saves, progression or Director.

## Exact stage order

| Stage | Source illustration | Content |
| --- | --- | --- |
| 1 | `1000001193.png` | Sakura buds |
| 2 | `1000001192.png` | Single open blossom and buds |
| 3 | `1000001191.png` | Two blossoms and buds |
| 4 | `1000001194.png` | Ornate Sakura cluster with red ribbon |
| 5 | `1000001195.png` | Masterpiece bouquet with gold ornaments |

## Asset conversion and fallback

- The user originals are 1254×1254 transparent RGBA PNGs; **all are preserved unmodified** in the user's downloadable archive.
- The game uses `assets/sakura-five-stages-20261103-v2.webp` as a **lossless 1280×256 transparent WebP sprite strip** (five 256×256 cells) with artwork fit proportionally inside each stage. Colors and visual design are unchanged; only barely visible exterior alpha/color residue is cleaned, with mild downscale sharpening.
- The earlier `assets/sakura-five-stages.avif` stays in the repository as a historical rollback copy. The original `assets/harmony-atlas.webp` remains the runtime classic art source.
- The `sakura-art.css` styling is kept, apart from documenting the new graphic. Both the board and Stage 5 Masterpiece collection still use `--harmony-sakura-art`.
- `?sakura=classic` continues to disable refreshed Sakura independently of the other eight families. If the new asset fails to load, the current atlas fallback remains available.
- `index.html` cache-busts the styles and the app JavaScript so existing browser sessions can retrieve the new atlas resource.

## Verification checklist

1. Stage mapping 1–5 on 7×7 board matches five user uploads and ascending complexity.
2. Stage 5 in Masterpiece collection uses the same updated Sakura sprite.
3. Test alpha contours on a dark mobile board (no red/yellow halo), and readability at actual tile size.
4. Open `?sakura=classic` and confirm classic Sakura while all other families retain their refreshed visuals.
5. Confirm no save-data migration and no gameplay code changed.
6. Verify GitHub Pages deployment and the existing CI workflow.
