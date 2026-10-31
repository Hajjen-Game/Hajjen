# Japanese Harmony Identity Plan 1.0 — mechanics before progression
31 October 2026 · implementation start · **not** a live level rebalance

## Product direction
Japanese Harmony must succeed at BOTH:
1. **Thoughtful, varied puzzle boards**: level geometry, visible rules, positioning, fair but non-guaranteed solutions.
2. **Evolving treasures and satisfying chain reactions**: five-stage fusions, a powerful stage-five Harmony Pulse, meaningful spatial consequences.

Do not turn into another generic match-three blocker sequence. The Japanese theme alone does not distinguish the gameplay. The player's skill, including missing a valid winning move, must continue to matter. No guaranteed wins, automatic rescue, forced winning hints, or hidden adaptation of rewards and difficulty.

## What actually exists (31 October 2026)
- Levels 1–3 teach fusion, growth and a first Masterpiece / Harmony Pulse; Mist first appears at level 4.
- Levels 5–20 largely reuse the full 7×7 board while varying objectives and Mist.
- Daruma appears at 21, Sealed Stones at 31, Lantern Path at 41.
- **Bamboo Paths 51–60 is implemented** with authored terrain layouts.
- **Lotus Stream 61 is an implemented pilot**; remaining Lotus chapter levels are not yet authored.
- Mirror, wind and Shrine chapters are proposals, **not** released live mechanics.
- Director 5.1 is currently observational. Director 4 controls gameplay refills; do not change its existing behavior as part of this plan.

The first-20 boredom / Candy Crush resemblance is real *playtest feedback*, not a measured retention statistic. It warrants prototypes before a permanent reshuffle.

## Phase A — independent mechanical feasibility (this pass)
Implement deterministic, side-effect-free rules prototypes for:
- **Moon Mirrors**: a fixed directional mirror on a cell touched by a stage-five Pulse routes ONE extra Pulse hit to an adjacent cell in its specified direction. The normal direct targets remain; no recursive mirror reflections, double upgrades or out-of-board rays. Mirrors stay with *cells*, not falling objects. This is a first hypothesis, to validate in play.
- **Wind Garden**: a fully visible schedule predicts the next row and direction. After a completed player move, a suitable **unblocked, settled** row rotates by one cell with wraparound. Tile identities/stages move; fixed-cell overlays such as Mist do not. Reject blocked / unsettled rows instead of moving Daruma, Sealed Stones, terrain or Lotus seeds. The live prototype must decide how matches formed by a shift are resolved.
- **Board shape**: use the existing Board Mechanics / Bamboo geometry. Do not create another blocking system.

This first pass only adds a reusable isolated proof-of-mechanics module, unit tests and this plan. It is intentionally **not loaded by the production game**. No existing rounds, level definitions, saved data, UI, economy, odds or Director decisions change.

## Phase B — playable opt-in evaluation (next passes)
**B1. Moon Mirrors · Playable Prototype 1.0** (recommended next).
- Level-scoped opt-in prototype on a genuine 7×7 game board, **no replacement of live level numbers yet**.
- A mirror is a clearly signed fixed-cell overlay; show its direction before swapping.
- Real stage-5 Pulse must route via the mirror; correct interaction with Mist, Daruma, Sealed Stones, existing Pulse chain, score and per-move hit limits.
- Mirror relay cannot bounce indefinitely or grant a second hit to an already-hit target.
- Compare at least three authored scenarios: single mirror, mirrored objective, mirrored chain. Include no-mirror control, save/restore and mobile readable test cases.
- Exported round telemetry distinguishes ordinary Pulse from reflected targets. The Director must not manipulate mirror placement or rescue missed solutions.
- Evaluate in actual play whether rerouting or splitting energy creates the more interesting decision; do not treat the one-hop rule as fixed until tested.

**B2. Wind Garden · Playable Prototype 1.0**.
- Expose the next row, direction and trigger before the player decides.
- Integrate displacement after valid moves and after normal cascades; preserve fixed Mist, blocker positions, game invariants and replay determinism.
- Decide and test whether shifts may form bonus fusions; never introduce silent unavoidable failure or an infinite shift/cascade loop.
- Include conflict cases with blockers and Lotus, small-screen arrows, reduce-motion mode, save/restore and exports.

**B3. Board Geometry · Early Puzzle Variety Trial**.
- Reuse open/closed layout templates and compare short authored puzzles with one standard-board control.
- Do not overload onboarding with multiple new rules at once.

## Player evaluation gates (before reshuffling chapters)
Each candidate must pass:
- **Comprehension**: a new player can explain what changed and predict the immediate consequence without reading a long instruction.
- **Puzzle agency**: placement matters, multiple legitimate choices exist; the Director never ensures success.
- **Payoff**: upgrades and chain reactions remain frequent, satisfying and visible.
- **Distinctiveness**: the mechanic feels different from traditional matching, not just another obstacle.
- **Fairness and safety**: deterministic replay, no broken objectives, no softlocks, stable saves, Omamori and Director isolation, no worsening on small phones.
- **Evidence**: reproduce seeded fairness samples AND ask a few first-time players what they remember / whether levels felt repetitive. Simulated win rates are not human retention data.

A mechanic can be redesigned or dropped if it fails. Avoid optimizing merely for more animation.

## Phase C — redesign chapters 1–100 (only after B1–B3)
Draft, don't implement yet:
- Earlier identity moments: stage-five Pulse early, first board-shape variation within the first ten levels, and clear spatial goals.
- Stagger Daruma, Stones, Bamboo, Lotus, Mirror and Wind according to observed comprehension, not their old chapter numbers.
- Mix concise 10–15-move puzzles with larger cascade-building stages without removing difficulty.
- Use a **Shrine of Harmony** chapter/finale as a deliberate synthesis of previously learned mechanics; only then decide whether a three-lantern Pulse finale plays well.
- Do not silently retcon in-progress saved runs or revoke earned stars, coins, cards or unlocks. Version authored levels and provide migration tests.

## Non-goals / guardrails
- No new purchases or adaptive monetization.
- No automatic win, extra hint spam or correcting a player's missed winning move.
- No live deployment of Mirror/Wind mechanics in Identity Plan 1.0.
- No level re-ordering before actual playable feedback.
- No claims that Moon Mirrors, Wind Garden or level 100 are fully implemented just because this roadmap exists.

## Next recommended pass
**Moon Mirrors 1.0 — Playable Mechanics & Pulse Integration**.
Integrate the tested isolated Mirror planner behind an explicit prototype level descriptor, with visible mirror arrows and actual in-game Harmony Pulse / obstruction interaction. Validate with seeded tests, mobile presentation and voluntary round export before planning the 1–100 reshuffle.
