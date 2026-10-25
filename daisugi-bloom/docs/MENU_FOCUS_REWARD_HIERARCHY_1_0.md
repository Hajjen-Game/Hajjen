# Menu Focus & Reward Hierarchy 1.0

Japanese Harmony · v6.45.0 · 2026-10-25

## Objective
The mobile landing menu should lead with the player's level journey. The Goshuincho remains the **only prominent level-selection surface**; the quick-play button is a subordinate shortcut, not a rival primary CTA. Omamori and daily Omikuji are pleasant optional diversions, not gameplay requirements.

## Changes
- Compressed the ornamental hero into a quiet Midnight Garden overline, keeping the festival illustration visible.
- Moved the small quick-play shortcut directly below the warm paper Goshuincho entry.
- Consolidated Omamori and Omikuji in a compact *Samling & belöningar* area, with their actual saved coin and daily values still shown.
- Removed the distracting family-count chips and duplicated instructions from visual presentation. Their reference DOM is retained for legacy diagnostic selectors; families still follow existing rules.
- Reduced visual emphasis of Game Dev. Settings, Help and Director controls remain available.
- Updated CSS and JS cache-busting to 6.45.0. No images required.

## Invariants
No change to 7×7 matching, level data, star thresholds, saved games, rewards, currency, Omikuji rules, unlocks or Goshuincho paging. Existing button IDs and navigation handlers remain intact.

## QA
Static regression assertions added to `tests/harmony-goshuincho.test.cjs`.
Manual mobile check: ensure Goshuincho is visually primary on 360–390px phones; progress and coin balances are readable; Continue resumes a saved run; book opens and closes; Omamori, Omikuji, Game Dev, Help, Settings and the folded Director can still be accessed; no horizontal scrolling. 
