# Goshuincho Stamp Slot Polish 1.0

Japanese Harmony · 6.34.0 · 2026-10-25

## Purpose
Finish the visual asset handoff after Goshuincho Pagination Rework 1.0 using the images approved by the player. Keep the 4+4+2 level selector, progression, and original level list unchanged. Do not generate replacement assets or fabricate an unapproved chapter-completion illustration.

## Actual images, mapping and transport
Nine approved images were downsampled from transparent PNG sources and combined into one transparent **288×288 AVIF atlas** for game delivery, **8,485 bytes** (Git blob 846e899c12605b0b53f804e3b1b7babecd9c5a68). Atlas size is 3×3, one 96px square per picture:

| Atlas row | Col 0 | Col 1 | Col 2 |
|---|---|---|---|
| 0 | Chapter 1 Sakura | Chapter 2 Mist | Chapter 3 Daruma |
| 1 | Level seal Sakura | Level seal Mist | Level seal Daruma |
| 2 | 一星 (one star) | 二星 (two stars) | 三星 (three stars) |

`ART.chapters[0..2]`, `ART.stamps[0..2]` (indexed by chapter), and `ART.grades[1..3]` each point to an atlas cell. Existing approved art is the source; no browser-generated new stamps. For levels 1–10, 11–20, and 21–30, the respective chapter-specific test stamp is reused until individually illustrated level stamps are created. Levels in later chapters retain the existing fallback rather than misusing art from a different chapter.

## Future individual replacements
- `ART.chapters[chapterIndex]` = relative PNG/AVIF/WebP path string to override a chapter picture.
- `ART.levelStamps[levelIndex]` = relative asset string to override a *single level* stamp. If absent, `ART.stamps[chapterIndex]` supplies shared chapter-level stamp.
- `ART.grades[1|2|3]` = relative asset string to override a star grade, without touching the seal plaque.
- `ART.covers[chapterIndex]` = relative asset string for a **completed chapter seal** (pending art).

`goshuinArtwork()` handles both standalone image paths and atlas references with a browser-loaded asset cache and keeps a text placeholder on missing image requests.

## UI changes
- Chapter image replaces chapter placeholder in its softly rounded square.
- Chapter test stamp replaces the redundant old CSS circle. Large motif stays centered on the stage card.
- The old little brown badge is replaced by an individual light cream/rose/gold **seal plaque**, housing exactly **one** Japanese grade stamp for an earned 1/2/3-star rating. Uncompleted stages display no grade plaque.
- Chapter completion includes a separate large future-image slot with text fallback, preserving the total ten-stamp requirement.
- Stronger warm dark text in the chapter conclusion and selected level's objectives/record, improved selected tile highlight, reduced visual noise.
- All images decorative with readable level labels/aria status preserved. No economy or unlock changes.

## Validation
- Node: nine mapping cells, fallback on chapters >3, specific level override, 1/2/3 star mapping, chapter and saved progress checks.
- Browser: real atlas decodes with transparent corner and nonempty cells, different chapter/stamp/grade asset positions, grade plaque width, text contrast and chapter-completion slot, 320/390px overflow, replay/resume/locked levels and existing list.
- Full GitHub Actions suite, including the two longer seeded simulations, to ensure gameplay is unchanged.
