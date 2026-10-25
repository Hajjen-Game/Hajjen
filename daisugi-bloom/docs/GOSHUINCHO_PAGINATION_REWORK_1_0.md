# Goshuincho Pagination Rework 1.0

Japanese Harmony · v6.33.0 · 2026-10-25

## Problem and decision
Ten tiny stamps in a single mobile modal page crowd the 7×7 game art style, dilute the collection fantasy, and leave too little room for future image-generated seals. **Keep chapters at 10 stages and allocate them to three book pages of 4 + 4 + 2 stages.** Do not introduce new gameplay goals, coins, shop logic or artworks in this pass.

## Structure and UX
- Page 1: chapter stages 1–4, page 2: 5–8, page 3: 9–10.
- Every page shows the same chapter illustration slot and chapter title, followed by the chapter-wide collected count plus the current page's stage range and earned count.
- Stamps in a 2-column grid, bigger tappable area and seal artwork slots, stronger spacing for generated PNG/WebP art in a future pass.
- On page 3, **only two stage tiles** plus an explicit chapter conclusion with chapter progress bar and chapter seal placeholder. The completion illustration still uses `ART.covers[chapterIndex]`, appears only for all 10 archived achievements, and is not earned by changing pages.
- Next/Previous move one **book page**. Previous from chapter N page 1 opens chapter N-1 page 3; Next from chapter N page 3 opens chapter N+1 page 1. Preview one coming chapter only, exactly as before. No skips or circular wraps.
- The page label reads “Kapitel N · Sida X / 3”. Opening Goshuincho jumps to the book page containing the most recently unlocked level (e.g. level 27 -> chapter 3, page 2). The currently playable or resumable stamp opens its level detail automatically, otherwise the level detail starts hidden until the user chooses a stamp.
- A tap on a stamp still inspects that level, then the explicit Spela/Fortsätt action calls the existing startLevel logic, with the existing unlocked guard. In particular, browsing unfinished and upcoming levels never mutates save data or bypasses locks.
- Keep the original menu level list, menu play/continue button, game engine, star scoring, levels, background and records exactly unchanged.

## Technical boundaries
`G.CHAPTER_SIZE=10` is unchanged. New `G.PAGE_SIZE=4`, `G.PAGES_PER_CHAPTER=3`, `G.pageForLevel(level)`, and `G.pageSnapshot(save, chapterIndex, pageIndex)` are pure display helpers that slice each chapter's existing authoritative `G.chapterSnapshot`. A new UI-only `goshuinPage` controls page flips. No save schema change.

## Planned art handoff
The approved image slots remain stable: `G.ART.chapters[chapterIndex]` and `.goshuin-cover-slot` for chapter emblems; `G.ART.stamps[levelIndex]` and `.goshuin-stamp-slot` for custom stamps; `G.ART.grades[1..3]` for star seals; `G.ART.covers[chapterIndex]` for completed chapter seals. The small text and placeholder motifs are intentionally temporary. Generated images can be inserted directly without structural redesign.

## QA
Node assertions validate 4+4+2 slicing, no duplicate/lost stages, page-to-chapter mapping, starting page for current level, and full-chapter (not per-page) earned sigil. Mobile Chromium/Puppeteer checks 320 and 390 widths; four-stamp page, two-stamp final page, chapter-boundary paging, completed and locked stages, saved-run continuation, screenshot snapshots, and no horizontal overflow.
