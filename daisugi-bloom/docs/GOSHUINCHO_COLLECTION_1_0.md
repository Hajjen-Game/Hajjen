# Goshuincho Collection 1.0

Version 6.31.0 · 24 October 2026

## Product intent
Introduce a meaningful but very lightweight secondary progression loop, **without** adding an economy or changing the 7×7 puzzle. The player's Goshuincho is a *fictional travel-stamp book inspired by Japan's goshuincho*. The artwork is original to Japanese Harmony, not a recreation of actual sacred seals.

## Player experience
- One main-menu entry beneath family progression opens the book in a scrollable modal.
- Chapters are groups of ten consecutive levels: chapter 1 (1–10) First Harmony; 2 (11–20) Mist Garden; 3 (21–30) Daruma's Wish; later chapters use distinctive simple titles and a generic fallback for endless stages.
- Each level that the saved archive confirms has been completed is shown with a stamp.
- Existing best star ratings of 1/2/3 appear as a **separate grade seal** placed under each stamp.
- Finishing all ten levels of a chapter reveals a chapter-wide completion seal.
- Prev/Next paging, tap-to-inspect levels, simple mobile and keyboard navigation, and reduced-motion compatible UI.
- Current chapter opens first. Players may browse previous chapters and one upcoming preview chapter.
- No level unlocks are granted from opening/browsing the book.

## Read-only, save-safe design
`harmony/goshuincho.js` is a standalone pure module projecting the existing localStorage-backed `fourFamilyStars` (level 1–10) and `bestStars` (later stages). Old achievement scores from the corresponding archives are counted as an achieved minimum-one-star stamp only if the star archive is missing. A completed in-progress run is also considered. Merely unlocking a level does *not* award a stamp. Goshuincho does not create additional fields or reset data, and it does not touch the global score, the move-efficiency rules, star calculations or the Director.

## Generated artwork: easy replacement
Every illustrated element has an independent **asset slot** and a stable key:

| Layer | DOM | JS image-map entry | Fallback |
|---|---|---|---|
| Chapter illustration | `.goshuin-cover-slot[data-art-key="chapter-03"]` | `G.ART.chapters[2]` | Symbol |
| Level stamp | `.goshuin-stamp-slot[data-art-key="level-021"]` | `G.ART.stamps[20]` | Symbol |
| 1-, 2-, or 3-star grade | `.goshuin-grade[data-art-key="stars-3"]` | `G.ART.grades[3]` | ★★★ |
| Completed chapter seal | `.goshuin-chapter-sigil[data-art-key="chapter-01-complete"]` | `G.ART.covers[0]` | ✦ |

To integrate generated images, save transparent optimized PNG/WebP assets under `daisugi-bloom/assets/goshuincho/` and add the correct relative paths in the `ART` manifest at the top of `harmony/goshuincho.js`. Example: `ART.stamps[20]="./assets/goshuincho/level-21.webp"`. The UI automatically swaps just that slot after the browser confirms it loaded; absent or broken files leave the simple, accessible placeholder. For stamps, prioritize 128–256px original art (downsample/encode for small phones). The actual icons, borders and typography are intentionally not detailed because generated art will replace them later.

## QA
- Node checks for zero-profile, archived stars split across the old 4-family and 5-family saves, one-time historic score fallback, finished runs, complete-book seal, stars upgraded, scaled endless chapters, and immutability.
- Puppeteer snapshots at 390px and 320px, accessible UI controls, book navigation and completion, preserved archives, no horizontal scrolling, placeholder separation.
- Regular GitHub Actions rules/browser suites still run.

## Out of scope
Harmony Coins, Omamori store, Omikuji, animated popups on win, and any real-money monetization are future projects; none is implemented in this release.
