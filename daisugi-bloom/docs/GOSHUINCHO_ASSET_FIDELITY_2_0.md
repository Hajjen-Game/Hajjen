# Goshuincho Asset Fidelity 2.0

Japanese Harmony · v6.36.0 · 2026-10-25

## User-approved assets restored

Original transparent PNG images supplied by the player — NOT generated anew and NOT enlarged from a 96px atlas:

| Purpose | File | Dimensions |
|---|---|---|
| Chapter 1 header: Sakura | `assets/goshuincho/chapter-icon-sakura.png` | 724×724 |
| Chapter 2 header: Mist/Fuji | `assets/goshuincho/chapter-icon-mist.png` | 724×724 |
| Chapter 3 header: Daruma | `assets/goshuincho/chapter-icon-daruma.png` | 724×724 |
| One-star grade (pink) | `assets/goshuincho/star-seal-1.png` | 512×512 |
| Two-star grade (red) | `assets/goshuincho/star-seal-2.png` | 512×512 |
| Three-star grade (gold) | `assets/goshuincho/star-seal-3.png` | 512×512 |

## Presentation and code

- `harmony/goshuincho.js` maps `ART.chapters[0..2]` and `ART.grades[1..3]` to these individual PNG sources.
- `harmony/app.js` renders the `chapters` assets inside the top-left chapter header. `ART.cards` remains mapped to the three previously approved portrait WebPs shown on level tiles.
- The grade seal remains a separate overlay under the level number on earned stages only.
- CSS makes the chapter header a true square (no crop/stretch) and sets both header and grade `object-fit:contain`; PNGs are rendered as ordinary <img> elements.
- `index.html` changes stylesheet/script cache keys to v6.36.0.
- Browser smoke tests assert: 724px chapter source; 512px star source; zero atlas nodes in the displayed book; square header and seal geometry, mobile 320/390px overflow; existing unlocks and archived records unchanged.

## Intentionally unchanged

Level card watercolor art, 4+4+2 paging, scores, stars, goals, progression and save schema. Previous atlas remains as a legacy optional per-level stamp fallback, never used in current chapter headers or star rating overlays.
