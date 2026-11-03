# Lantern artwork correction 2.0 — 2026-11-03
Five **user-uploaded** Lantern artworks replace only the Lantern (Lykta) stage 1–5 atlas; no generative art used.

## Source and processing
- Source image files in stage order: 1000001197.png, 1000001196.png, 1000001200.png, 1000001198.png, 1000001199.png.
- Supplied 1536×1536 RGB images contain a baked-in gray checkerboard, *not* an alpha channel. The checkerboard was removed by a color/darkness matte, isolation of the original illustration and slight antialiasing.
- The five isolated original illustrations were centered and resized with LANCZOS into 256×256 frames and combined into `assets/lantern-five-stages.webp`, a 1280×256 lossless RGBA WebP atlas.
- Colors, motifs, outlines, individual stage designs and order are retained; no artwork was generated or redesigned.
- The asset is cached as `v=lantern-20261103-2-originals`.

## Integration and rollback
- Existing `harmony/lantern-art.css` automatically renders the replacement in play and collection using `--harmony-lantern-art` once preload succeeds.
- Query parameter `?lantern=classic` restores the classic Lantern assets.
- All other families (including Sakura), game rules, saves, and level progression remain untouched.
- Visual acceptance: check stages 1–5 at 7×7 board scale, verify no checkerboard/grid behind icons, inspect Stage 5 in Goshuincho and compare `?lantern=classic`.
