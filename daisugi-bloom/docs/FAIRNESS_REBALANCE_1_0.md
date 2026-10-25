# Japanese Harmony – Fairness Rebalance 1.0 (v6.40.0)

## Scope and decision

A **targeted live gameplay balance** follow-up to [Difficulty & Fairness Audit 3.0](DIFFICULTY_FAIRNESS_AUDIT_3_0.md). This pass improves chapter-three Mist challenge rewards and one chapter finale's completion budget. We deliberately do **not** rewrite the entire 1–40 Journey, reduce the required number of Sealed Stone hits, modify the Director, or change player rewards.

The audit used 744 deterministic seeded bot simulations. Their results are useful directional signals, **not human win-rate estimates**.

### Changes for newly started rounds

| Level | Goal | Moves before → after | 3 stars (clear by turn) | 2 stars (clear by turn) | Reason |
| --- | --- | --- | --- | --- | --- |
| **28** | Cleanse 14 Mist cells | **40 → 40** | **13 → 19** | **27 → 30** | An objective-oriented bot won 8/8 and needed median 22 turns, but won 0/8 three-star ratings under the 13-turn cap |
| **30** | Cleanse 15 Mist cells | **36 → 40** | **13 → 23** | **25 → 32** | The bot won 6/8, median 31 turns; no three-star wins; four more moves help avoid near-miss failures without reducing the objective |
| **39** | Break 3 Sealed Stones (4 hits each) | **46 → 46** | **34 → 34** | **40 → 40** | Generic bot 2/8 wins, but the obstacle-hit-aware specialist won 8/8; no evidence yet that four-hit gameplay needs easing |
| Other levels | Unchanged | Unchanged | Unchanged | Unchanged | Do not destabilize the rest of the progression |

Stars are awarded only upon completing the primary objective. The three-star target stays faster than the two-star deadline; neither score nor randomness affects those thresholds.

### Important save safety

A fresh round has `fairnessBalanceVersion=1`. A game saved before this release has no such marker; restoring it treats it as `version 0` and **keeps the former reward timing** on levels 28 and 30. A player already in level 30 keeps the old 36-turn basis and the exact remaining turns, instead of receiving a surprise change partway through. A retry/new round receives the new rules. Already earned stars, stamps, Harmony Coins, scores, existing obstacle damage, and completed levels are not reset.

Both old and new versions remain stable after save/reload and in Game Dev simulations. No extra turns can be acquired by save/reload.

## Quality assurance

- `tests/harmony-fairness-rebalance.test.cjs`: isolated assertions for new star deadlines, unaffected level 39, old/new save compatibility, exact move preservation, old earned stars.
- Standard `tests/harmony.test.cjs` updated for level 30's new 40-move cap.
- GitHub Actions runs all existing puzzle, obstacle, browser smoke, reward and game-engine tests.
- `tools/harmony-difficulty-fairness-audit.cjs` remains available to reproduce 744 post-balance simulations. Compare seed 20261025 with the original 6.39.0 results.

## Verified before / after (same 8 seeds per level)

The full **6.40.0** GitHub Actions audit completed successfully: **744 full games**, seed `20261025`, default Pacing Director 3.0. All level-by-level rows **other than 28 and 30** were unchanged compared with the verified 6.39.0 audit. The targeted improvement therefore did not change any other level's observed bot outcomes.

| Metric | Level 28 – before → after | Level 30 – before → after |
| --- | --- | --- |
| Goal-oriented bot wins | **8/8 → 8/8** | **6/8 → 7/8** |
| Goal bot median winning moves | **22 → 22** | **31 → 31** |
| Goal bot 3★ | **0/8 → 1/8** | **0/8 → 2/8** |
| Goal bot 2★ | **7/8 → 6/8** | **2/8 → 4/8** |
| Goal bot 1★ | **1/8 → 1/8** | **4/8 → 1/8** |

These are small **algorithmic** samples, not human success rates or statistically robust difficulty estimates. They confirm the intervention had its intended mechanical effect without a wholesale change to difficulty.

- [Verified before – v6.39.0 audit with complete diagnostic artifact](https://github.com/Hajjen-Game/Hajjen/actions/runs/40200411017/artifacts/12601182573)
- [Verified after – v6.40.0 audit with complete diagnostic artifact](https://github.com/Hajjen-Game/Hajjen/actions/runs/40202017323/artifacts/12602581147)

## Next validation

Replay levels **28 and 30** with real players and compare stars, attempts and remaining turns. If players still cannot reliably work toward the scattered Mist cells, investigate objective reachability or board hint clarity **before** applying more free moves.

**Review status:** this pass is limited and intentional. It is not a blanket claim that 1–40 are now perfectly balanced.
