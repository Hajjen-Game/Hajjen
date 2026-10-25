# Goshuincho Level Card Rework 1.0

Japanese Harmony · v6.35.0 · 25 October 2026

## Player-approved art / exact live assets
- Chapter 1 / levels 1–10: `assets/goshuincho/level-card-sakura.webp` (720×887, transparent exterior, source user JPEG 1000000633.jpg)
- Chapter 2 / levels 11–20: `assets/goshuincho/level-card-mist.webp` (717×900, transparent exterior, source user JPEG 1000000634.jpg)
- Chapter 3 / levels 21–30: `assets/goshuincho/level-card-daruma.webp` (717×900, transparent exterior, source user JPEG 1000000636.jpg)

The user approved these three *unlettered, unstamped* watercolor cards, including the Daruma composition with a smaller face and ample pale space below. They are independently uploaded as actual high-resolution transparent WebP images (135, 165 and 155 KB), not cells in the previous 96×96 atlas.

## UI
- Two portrait 4:5 level cards per row, 4+4+2 across three pages.
- Whole card uses one high-resolution illustration, contained with no aspect distortion, clipping or repeated circular chapter emblem.
- Runtime places only `Nivå X` on the lower third; an authentic existing one-/two-/three-star Japanese stamp appears below **only when earned**.
- Unfinished levels have no printed star seal. Available/current/locked/selected states use subtle card/border changes and original accessible labels.
- The chapter heading thumbnail uses the same high-resolution illustration, eliminating the shifted old background-position atlas bug. Grades still use the previously approved separate artwork cells in the original atlas.
- The chapter completion *award* illustration is still future work, unchanged.
- No changes to gameplay, stars, levels, progression archives, page counts, or save format.

## Implementation
- `harmony/goshuincho.js`: `ART.cards[0..2]` image URLs.
- `harmony/app.js`: `goshuinArtwork(tile,"cards",info.index)`, labels and grades as separate DOM overlays; chapter thumbnail also uses `cards`; no `goshuin-stamp-slot` node.
- `harmony/mobile-game.css`: isolated v6.35.0 full-card positioning and dynamic overlays, `object-fit:contain` at a fixed portrait aspect.
- `index.html`: v6.35.0 cache busters.
- Unit test: actual committed WebP file signatures, dynamic mapping, no legacy circle.
- Browser regression: cover, cards and grades; 320/390px viewport, no out-of-card art, chapter boundaries, saved progress untouched.

## Quality note
The three *card artworks* now use high-resolution sources. The Japanese star stamps remain in the prior, separately approved 96px atlas. If future phone tests show those grades remain soft, restore their original approved standalone files without upscaling the atlas.
