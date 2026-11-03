# Bonsai Artwork Refresh 1.0 — 2026-11-03

**Scope:** Update ONLY Bonsai stages 1–5, using the five 1254×1254 transparent images the user supplied in this order. No image generation.

## Artwork and stage mapping

- `assets/bonsai-five-stages.webp` is a **1280×256 lossless transparent WebP**, five horizontally arranged 256×256 frames.
- Stage 1: `1000001134.png` — smaller S-shaped bonsai in a classic pot.
- Stage 2: `1000001137.png` — larger bonsai and decorated pot.
- Stage 3: `1000001135.png` — mature bonsai with Sakura blossoms and roots.
- Stage 4: `1000001136.png` — broad old bonsai with deep gold accents and exposed roots.
- Stage 5: `1000001138.png` — ornate full Masterpiece tree with Sakura blooms and ceremonial ribbons.
- Source PNGs are preserved unchanged in the accompanying downloadable ZIP. The game frames are alpha-trimmed (discarding faint isolated pixels below 8/255), scaled to about 90% of their 256px cells, and centered. No design changes.

## Game integration and rollback

- `harmony/bonsai-art.css` overrides **only** `.sprite-bonsai` on the board and `.collection-bonsai` for the stage-5 Masterpiece.
- `harmony/app.js` loads the new atlas via existing recovery logic, applying the override class only after successful image load.
- Classic graphics from the untouched `assets/harmony-atlas.webp` remain the fallback.
- **Use `?bonsai=classic`** to show the previous Bonsai visuals independently, without altering saved progress or the other artwork overrides.
- All earlier Sakura, Koi, Lantern, Fan, Sushi, Maneki-neko and Origami assets remain unmodified.
- No gameplay, objective, Director, level, Fusion, scoring, inventory or save format changes.

## Live visual QA

1. Verify the Bonsai family at all five stages, including Fusion.
2. Verify Bonsai stage-5 Masterpiece artwork inside the collection view.
3. Switch to `?bonsai=classic` and confirm only Bonsai restores the prior visuals.
4. Check the transparency and scale in dark mobile-sized board cells.
5. Confirm saved progress and every other family are unaffected.

Repository-wide rollback: revert this PR. The old artwork stays in its original atlas.