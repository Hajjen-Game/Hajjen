# Mechanic Balance 1.0 — Controlled Cascades
31 October 2026 · live-code integration for **opt-in previews only**

## Design decision
A good Japanese Harmony puzzle rewards smart placement, not free automatic chains. Preserve the entire base game's existing Fusion Destination Control, stage evolution, multi-wave gravity cascades, stage-five Harmony Pulse, bonus upgrades, scoring, Director and object-family interactions. **Do not globally cap combos or nerf a player-earned Masterpiece.**

Playtest context: six Android screenshots and a concrete First Breeze opening that went from 0 to 7/18 fusions with a single player move. Local seeded reproducible comparisons showed the first move could start multiple independent cascade cycles simply because Wind triggered a second complete `resolve()`, while Mirror Echo also fired on automatically formed fusion waves.

## Moon Mirrors — one earned Echo per move
- A **successful fusion on the player-triggered first wave** can activate one adjacent fixed Moon Mirror according to its arrow.
- **At most ONE Fusion Echo on each accepted player decision**. It upgrades one remote treasure, cleanses one Mist target or hits one obstacle.
- Additional mirrors, gravity/refill-created fusion waves, and auto cascades **cannot trigger another Echo from the same move**.
- If that one Echo genuinely creates a stage-five Masterpiece, the existing full Harmony Pulse still happens, including the mirror's normal one-hop Pulse reflection. No artificial limitations on authentic Pulse or the base game's own chain reactions.
- Echo Across Stone is intentionally **no longer an instant one-move win**: the first fusion can damage a Sealed Stone while distant Mist requires a later, strategically placed fusion.

## Wind Garden — a positioning tool, not a second cascade factory
- **First Breeze:** shift on every **second** valid move, row 4 right.
- **Crossing Winds:** shift on every **third** valid move, alternating row 3 left / row 5 right.
- **Garden Tide:** shift on every **second** valid move, alternating row 4 left / right. Mist stays fixed to cells.
- Continuous three-strand directional wind animation from Animation 1.2 **keeps blowing between every move**; it shows the forecasted row/direction even when the physical shift waits for another move. No need for extra bright gust.
- The wind rotates all seven real object identities one position, with edge wrap, as before. No row shift on invalid moves or a completed level.
- On a scheduled shift, **all matches formed at that instant are resolved in a single wind-triggered fusion WAVE**. Its gravity, earned stage-five Pulse and obstacle effects remain authentic.
- **Wind-only refill** uses the same family bag and stage-one pieces but prefers a deterministic completion with zero immediate automatic matches. This prevents the shift from routinely creating a second full random-refill cascade. No changes to normal refill or Director selection in live levels.
- **Fallback is intentionally not a dishonest hard cap:** if gravity itself forms unavoidable extra matches or a match-free refill cannot be found after bounded attempts, the normal resolver completes them. Never leave visible three-of-a-kind lines stuck on the board, silently erase match outcomes or secretly change evolved piece identities. A genuinely well-prepared player move can still make a big chain.
- Save/restore and JSON round traces retain the deterministic shift and refill decisions. The opt-in previews cannot spend Omamori, grant stars, overwrite normal saves or unlock levels.

## Less explosive showcase openings
- Demo start RNG seed changed **only in preview UI** from 20261031 to 13. This produces a natural playable opening with **one fusion** from the shown initial swap at row 3 column 4 to row 4 column 4, instead of the old showcase that exploded into many additional fusions.
- No forced winning move, free upgrade or hidden advantage is injected during the player’s turn. The opening is authored as before; thereafter the normal puzzle rules apply.
- Existing normal level seeds (per session) and all player progress are unchanged.

## Verification
- `harmony-mechanic-balance.test.cjs`: standalone gameplay assertions for Echo cap, Mirror Stone/Mist placement choice, genuine Echo-created Masterpiece and original Pulse, new Wind timing, single wind wave on the quiet opening, unchanged ordinary chapters, deterministic save/replay, and 35 seeded starts per wind variant with no unresolved matches and no duplicated IDs.
- Existing `harmony-moon-mirrors.test.cjs` and `harmony-wind-garden.test.cjs` updated for new design; the ordinary game should continue passing its original engine suite.
- Updated mobile smoke checks: Wind forecast now says 2/3 moves, the wind visuals remain continuous while waiting, the Moon Mirrors obstacle puzzle does not instantly auto-win, and the original saved normal run is unchanged.
- CI scripts are wired. A green GitHub Actions run and an actual Android playtest are still required before declaring visual or level-difficulty validation complete.

## What comes next
**Spatial Puzzle Challenge 1.0**: authored levels for Moon Mirrors and Wind Garden with several plausible strategies and a required spatial decision, evaluated using voluntary exported rounds. Calibrate their actual puzzle difficulty before moving either mechanic into permanent levels 1–100.
