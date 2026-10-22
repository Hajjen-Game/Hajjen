# Japanese Harmony — Full Game Audit (2026-10-22)

**Scope:** Current 7×7 game, 10 levels, 9 rotating families, 5 stages, fusion mechanics, bonus upgrades, resonance/echo, pulse/harvest, points, persistence, visual events, and level balance. Audited source includes the level-8 adjustment in commit `8059b185`.

## Executive assessment

**The core fusion engine is consistent across levels; the game is NOT yet ready to be called fully balanced or bug-free.** No evidence of different fusion rules on levels 4 and 9. Two outstanding issues need a product decision before extending the level map:

1. **High (objective clarity/retention):** Level 9 can produce many masterpieces without advancing the win condition. In one reproducible goal-oriented seeded run, 9 masterpieces were made but the game still failed with best chain = 1. Consider a cumulative *two masterpieces total* target, or a clearly signposted chain tutorial and explicit same-wave scoring. Do not silently alter its objective.
2. **Medium (logic/terminology):** `Game.resolve()` calculates `bestChain` from `all.size`, where `all` includes independent stage-5 creations in a single fusion wave. Two disconnected masterpieces can therefore clear the “same *connected* Harmony Pulse chain” target. Decide whether a chain means *same wave* or *actually connected by pulse*, and align wording/scoring accordingly. A stricter connected-chain counter without rebalancing level 9 would increase difficulty further.
3. **Medium (difficulty):** Level 6 requires two *lantern-family* masterpieces in 22 moves. Goal-focused bots showed difficulty substantially above level 4; review move budget and goal threshold in player tests.
4. **Low (reward perception):** When level 4's first masterpiece completes its goal, UI shows both the Masterpiece event and goal-completion feedback. On level 9 a masterpiece that does not meet the chain goal generates Masterpiece feedback without goal progress. This is explainable under current rules but feels less rewarding. Consider progress-based feedback and/or a more incremental goal.
5. **Low (documentation):** Older GDD entries and historical README used retired objectives/family counts. README's active overview was corrected as part of this audit; the historical GDD remains an archived design record.

## Engine implementation findings

- **Shared rules:** All 10 levels instantiate `HarmonyRules.Game` and use the same `swap` → `resolve` implementation. Level-specific configuration controls move budget, family mix, score par and objective only. No branch selectively disables fusion/bonus/pulse visual events on levels 4 or 9.
- **Fusion:** Horizontal/vertical same-family run of 3+; overlapping lines form a group. Highest-stage object survives at its position and gains one stage (max 5). Four gives one eligible adjacent stage increase; five or more gives two. Direct and bonus-created stage 5 triggers Harmony Pulse; cascading refills occur afterward.
- **Visuals:** The same UI event handlers animate fusion, echo, hero, pulse, harvest, gravity and point flights for every level. The rare centered praise queue contains Harmony Echo, Masterpiece, and Harmony Pulse. The additional “goal reached” celebration is objective-dependent.
- **Save:** `Game.save()` tracks ID, seed, RNG rolls, counters, stars and best chain. Older level-8 unfinished saves gain four turns at most once; tests cover this.
- **QA:** Existing GitHub Actions workflow `Japanese Harmony & legacy checks`, including browser smoke and rule tests, succeeded on commit `8059b185` (run 39817617632). GitHub Pages deployment succeeded on the same commit (run 39817615910). CI success is not a substitute for human balance assessment.

## Seeded baseline (before any balance change)

**24 starts per level, legal random moves** (not human win-rate predictions), 240 total games and **3,533 accepted turns**. Checked after every turn: legal moves consume exactly one turn; scoreboard equals sum of awarded event deltas; no duplicate IDs, invalid stages, unresolved triples or lost pieces; completion status matches the configured goal. **Zero violations** in these checked invariants.

| Level | Current objective | Moves | Random baseline wins |
|:--|:--|--:|--:|
| 1 | 5 fusions | 12 | 24/24 |
| 2 | 3 reaches of stage 3 | 18 | 24/24 |
| 3 | 1 reach of stage 4 | 16 | 20/24 |
| 4 | 1 masterpiece | 18 | 9/24 |
| 5 | 3 Harmony Pulse target upgrades | 18 | 4/24 |
| 6 | 2 lantern masterpieces | 22 | 0/24 |
| 7 | 1 match of 4+ | 18 | 20/24 |
| 8 | 5 reaches of stage 3 | 20 | 23/24 |
| 9 | 2 masterpieces in the same fusion-wave (currently labelled “pulse chain”) | 20 | 3/24 |
| 10 | 3 masterpieces cumulatively | 24 | 7/24 |

**Goal-focused bot comparison:** 16 fixed-seed simulations per level: level 4 **16/16**, level 6 **12/16**, level 9 **13/16**, level 10 **16/16**. Bot can simulate candidate turns with full game RNG and therefore is *not* a human success-rate estimate. Poor level-9 runs can still score highly without satisfying its chain goal. This validates the user's subjective observation without claiming fusion physics differ.

## Reproducible disconnected-chain counterexample

Construct a 7×7 board with two independent 3-piece Sakura/Lantern groups at indices `[8,9,10]` and `[36,37,38]`, where pieces at 9 and 37 start at stage 4. Both groups evolve to stage 5 in the same wave. No pulse makes the other masterpiece. The engine nevertheless emits `harvest.chain=2`, sets `bestChain=2`, and completes level 9. The behavior is deterministic and was reproduced against the production rules. It is a terminology/logic issue, not a rendering glitch.

## Recommended acceptance gate before levels 11+

1. Choose whether level 9 tests cumulative masterpieces or a genuinely connected chain, and align goal title, milestone display and scoring. Do not make a difficult level stricter without compensating balance.
2. Review level 6. Compare multiple real starts from zero (no pre-evolved pieces) and note victories/frustration.
3. Have a human replay levels 4, 6, 8, 9 and 10 with sound and reduced-motion settings. Verify feel of center-board callouts, hero timing and visible score flights.
4. Re-run CI with the extra `harmony-consistency-audit.test.cjs`, record seeded metrics after any design decision, and only then add more levels.

**No existing gameplay rules or level goals are changed by this audit.** The additional CI check and README update are quality/documentation changes only.
