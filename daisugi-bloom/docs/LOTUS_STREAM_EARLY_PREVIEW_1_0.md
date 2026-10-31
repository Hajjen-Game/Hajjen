# Lotus Stream — Early Playable Preview 1.0
31 October 2026 · opt-in playable level-61 pilot plus four existing experimental routing challenges

## Why this is not levels 61–70
The current production game includes exactly **one authored Lotus Stream level: 61, First Lotus Stream**. The following four are separately authored, executable **diagnostic route prototypes**, not finished live chapter missions. They are offered to gather feedback before designing levels 62–70.

## Finding the preview
Open **Game Settings → Lotus Stream · Preview** beside Moon Mirrors, Wind Garden and Bamboo Paths.

The picker contains:
- **First Lotus Stream — real level 61:** two seeds near the bottom of the board, matching exit lanes, **38 moves**.
- **Long Lotus Crossing — experiment:** seeds start higher up the same lanes, **44 moves**.
- **Three Lotus Channels — experiment:** three simultaneous seed lanes, **54 moves**.
- **Two Seeds, One River Gate — experiment:** three seeds flow toward two physical exits; one gate receives two sequential seeds, **56 moves**.
- **Garden Lotus Crossing — experiment:** two seed lanes combined with fixed Bamboo terrain, **48 moves**.

This makes five authentic executable gameplay recipes available early. It does **not** unlock or invent production levels 62–70.

## Real Lotus mechanics
Lotus seeds are independent cargo pieces (`family:"lotusSeed"`) and cannot be matched or swapped. The player fuses regular objects in their lanes **beneath the cargo**, using the game's existing gravity and refill, to bring each seed to its corresponding exit at the bottom row. The actual seed collection, particle animation, move budget, scoring, objective progress, Director, and blocked-cell rules come from the current `rules.js`, `lotus-stream.js`, and `lotus-routing.js`.

The first option is byte-identical to a normal level-61 run under the same random seed and mode. The four experiments activate the already existing `lotusPrototype` routes using the engine's original diagnostic configuration; no original level is reassigned.

## Unranked isolation and saves
- `Game` accepts `lotusPreview` only on **level index 60** and only for `pilot`, `long-drop`, `three-lanes`, `shared-gate`, or `garden-route`. It rejects combinations with other mechanic previews.
- All five use a reproducible diagnostic seed for fair comparison and can be restarted from the picker or the pause menu.
- A preview will never replace `save.run`, unlock a new level, grant stars or coins, record a normal progression round, consume Omamori, or mark chapter onboarding as seen.
- The voluntary `Export round · JSON` includes the exact scenario, `previewType:"lotus-stream"`, `result.unranked:true`, no earned stars, and real cargo deliveries.
- The engine's save/restore machinery maintains route-specific lotus starts, gates, cargo IDs, progress and remaining moves. The original unfinished normal run remains untouched when returning to the menu.

## Checks
- `tests/harmony-lotus-preview.test.cjs` verifies all five distinct recipes, authentic level-61 identity, cargo/exit matching, non-swappable seeds, one real move, terrain preservation, stable save/restore, historical chapters and 75 seeded fair starts (15 per scenario).
- `tests/harmony-lotus-preview-browser.mjs` exercises the visible 390px mobile menu, five choices, rendered seeds/exit gates, an actual valid swap in each variant and preservation of local progression/Omamori.
- Both tests have been added to GitHub Actions. **Their browser CI status still requires a successful workflow run**; human Android playtesting should evaluate readability and actual puzzle difficulty before a production Lotus chapter is authored.

## What to evaluate next
The question to answer is whether moving seeds down columns is distinct and strategic enough, particularly when the board includes Bamboo obstacles or a shared collection gate. Analyze an exported round from at least one win and one loss before tuning Director or assigning permanent chapter levels.
