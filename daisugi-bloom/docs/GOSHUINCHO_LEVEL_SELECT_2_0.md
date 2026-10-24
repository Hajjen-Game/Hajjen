# Goshuincho Level Select 2.0 (Path B)

Japanese Harmony · v6.32.0 · 2026-10-24

## Goal

Keep the existing level list available as a fallback while turning the Goshuincho travel-stamp book into a fully functional alternative level selector. The user will evaluate usability before any removal of the original list.

## Interaction contract

- Open Goshuincho in the menu. It opens on the chapter containing the latest unlocked stage.
- Each ten-stage chapter shows **completed**, **currently available**, **in-progress**, and **locked** stamp states with distinct markup and presentation. Existing graded stamp/seal presentation remains.
- Tap a stamp **once to inspect**. Show existing `R.levelConfig(level)` title, configured moves, objective, recorded stars and best score. Do not start play from the stamp itself (avoids accidental runs when paging a book).
- Explicit **Spela nivå N**, **Spela nivå N igen**, or **Fortsätt nivå N** button starts or resumes via existing `startLevel(level, resume)`. The existing `save.run` determines resumability with the same condition used by the original Continue button.
- **No stage unlock bypass**: `G.levelStatus` checks `level <= save.unlocked` and the launch button checks the current authoritative save again at click time. Locked stamps can be inspected but the launch action is disabled. Viewing an unreached preview chapter cannot start its levels.
- The next/current stage gets a distinct border; if its run was saved, the level button says Continue. Completed stamps retain their exact earned star rating. Previous chapter/page navigation is unchanged.
- The original 20-at-a-time level list, Continue button, advanced game settings, existing game balance and archived progress are **unchanged**. This is Path B, not the final replacement.
- No new currency, store, Omikuji or changes to rewards.
- The book is read-only until a deliberate start/resume; the level game then follows its existing save/update flow.

## Art handoff

Keep the light presentation and the **unchanged** independent slots from Collection 1.0:
- chapter motif: `ART.chapters[chapterIndex]`
- level seal: `ART.stamps[levelIndex]`
- one/two/three-star grade: `ART.grades[stars]`
- ten-stamp chapter completion: `ART.covers[chapterIndex]`

Future generated transparent PNG/WebP assets replace each layer without changing level selection code. States use CSS borders and simple captions, never bake progress into images.

## Test plan

- Unit tests: default/locked/unearned/completed/current state; active saved-run detection; prevent locked future resumes.
- Mobile browser at 390px/320px: states, stage descriptions, disabled locked launch, completed-stage replay, saved-stage resume with preserved moves and points, same original twenty-item list, no overflow, existing earned stamp rendering and art slots.
- Full GitHub Actions rules and mobile tests must pass; long simulation jobs guard unchanged engine behavior.
