# Japanese Harmony — Sprite Refresh (2026-10-22)

**Scope:** Refresh the 25 classic-family stage images (Sakura, Lykta/lantern, Koi, Solfjäder/fan and Bonsai). Cosmetic only; no gameplay, score, evolution or level changes.

## Game atlas

- File: `daisugi-bloom/assets/harmony-atlas.webp`.
- Format: 960 × 960 transparent WebP. 5 × 5 cells, each 192 × 192 px.
- Columns, left to right: stages 1, 2, 3, 4, 5.
- Rows, top to bottom: Sakura, Lykta, Koi, Solfjäder, Bonsai.
- Each cell contains an isolated, cropped and centered cutout of the approved generated artwork. Alpha transparency preserved.
- Source: the 25 transparent Japanese Harmony cutouts generated and reviewed with the user on 2026-10-22.
- Git blob SHA of the updated atlas: `5a3d5ff4ce32bb27f74ae3c754c104c21ef19a6d`.
- Previous atlas Git blob SHA: `a97cbba2c3f0efe5904f634c4aaab5f4ce78f9ef`, for rollback.
- Added matching cache-busting query `?v=icons-20261022` to CSS and JS sprite preload. Entry HTML also version-bumps these two resources so browser caches refresh.

The four additional families (Sushi, Maneki-neko, Origami, Ryu) continue to use their separate `harmony-new-families.avif` atlas and are unchanged.

## Verification checklist

1. Open the normal game with a fresh or hard-reloaded tab.
2. Check that Sakura, Lykta, Koi, Solfjäder and Bonsai each show five distinct stage artworks without opaque borders.
3. Progress or use a developer/debug mode to inspect stages 4 and 5; their silhouettes should remain visually distinct.
4. Check Sushi, Maneki-neko, Origami, Ryu render exactly as before.
5. Confirm existing saves, swaps, score flights, Harmony Echo and Harmony Pulse still work.

This change does not alter the family/row mapping defined in `harmony/app.js`.
