# Daruma artwork refresh — 2026-11-03

Replace only **Daruma** obstruction artwork, using the user's three original high-quality transparent RGBA paintings. **No image generation.**

## Stage order
1. `1000001210.png`: both eyes blank (internal `state-0`, remaining hits: 2).
2. `1000001209.png`: viewer-left eye black (internal `state-1`, remaining hits: 1).
3. `1000001208.png`: both eyes black (internal `state-2`, immediately before completion).

## Asset
- New independent lossless transparent atlas: `assets/daruma-states-20261103.webp` (768 × 256 px, three square 256px frames).
- Crop and scale use a **fixed shared source region** for all stages, LANCZOS resizing, and 13px-ish transparent margins; original coloring, Sakura patterns, gold highlights, expressions and silhouettes retained. No repainting, no graphics alterations.
- The previous `assets/daruma-states.webp` remains unchanged as a rollback artifact.
- Existing `harmony/mobile-game.css` three-state positions (0%, 50%, 100%) continue to address the three frames.
- HTML stylesheet cache key changes to `6.51.1-daruma-20261103` to invalidate old mobile CSS.
- No JavaScript changes, level changes, mechanics, star changes, Director changes or save data migration.

## QA
Inspect level 21 / Daruma demo: blank eyes → one black eye → two black eyes; check that the illustration stays centered throughout and the fully painted state appears briefly before the object clears. Confirm no opaque background and that all other families retain their prior art. Previous asset can be restored by reverting the CSS reference.
