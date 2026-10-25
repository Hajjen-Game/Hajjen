# Goshuincho Artwork Fidelity 1.0 — image geometry & source recovery

Japanese Harmony · 6.34.1 · 2026-10-25

## Player-reported defect
The approved chapter, stamp and grade illustrations appear fuzzy on phone screenshots.
The 6.34.0 atlas is just 288×288 AVIF (nine cells of 96×96, 8,485 bytes). A
96-pixel source cannot provide native 2×/3× detail on today's phone screens.
In addition, CSS was stretching **square atlas cells** into **rectangular cover
and grade plaques** because sprite background-size was relative to their
non-square container. The resulting geometric distortion is a separate defect.

## Fixed and pushed in 6.34.1
- For atlas-backed cover/stamp/grade art, always use a square drawing area:
  `aspect-ratio:1 / 1`, centered inside its decorative parent.
- For the wider, shorter Japanese star plaque, size the square by the
  *available height*, not the plaque width.
- Standalone replacement images preserve their source proportions with
  `object-fit:contain` and `object-position:center`.
- Refresh the mobile-game.css cache key to 6.34.1 so the change is visible.
- Add an automated CSS-regression check to the Goshuincho test file.
- No changes to progression, 4+4+2 pages, artwork selection, locked levels,
  stars, scores or save data.

## Not fixed yet — source pixels are still 96×96
The original approved PNGs have been located in the project's media Library:
- `goshuincho_kapitel_sakura.png`
- `goshuincho_kapitel_dimma.png`
- `goshuincho_kapitel_daruma.png`
- Three chapter-specific circular test stamps generated 2026-10-25 06:32:57–06:33:06 UTC (Sakura / Mist / Daruma).
- `goshuincho_star_1.png`, `goshuincho_star_2.png`, `goshuincho_star_3.png`.

Their Library entries display 724×724 (chapters) and original full-size
image previews (stamps and grades). Attempts to export their original bytes
through the current Project file bridge returned
"This Project file does not have an authorized raw-byte materialization path."
**Do not claim the hi-res art is deployed.** Until originals can be exported
and added to the repository, the 96×96 AVIF remains the on-screen image.

## Required final image handoff
1. Obtain the **same nine approved source artworks**, not screenshots and not
   upscaled exports of `goshuincho-nine-atlas.avif`.
2. Export individually as transparent WebP or PNG, preserving aspect ratio and
   transparent edges; aim for >=256px effective image dimensions for 100 CSS-px
   medals on high-density mobile, ideally 384px for headroom.
3. Add files to `assets/goshuincho/`. Do not bundle into an aggressively
   compressed 96px per-image atlas.
4. In `harmony/goshuincho.js`, replace entries of `ART.chapters`,
   `ART.stamps`, and `ART.grades` with the separate file paths.
   `goshuinArtwork` already accepts ordinary image strings and serves them
   via an <img> with `object-fit:contain`.
5. Run Node Goshuincho + Playwright/browser 320px/390px and pixel-shape checks.
6. Confirm that 1/2/3-star kanji and the subtle watercolor texture stay legible
   at actual phone resolution.

The chapter seal *award* illustration is intentionally outside the nine-image
set and remains pending separate design approval.
