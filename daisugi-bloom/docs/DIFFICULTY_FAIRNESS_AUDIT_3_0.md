# Japanese Harmony – Difficulty & Fairness Audit 3.0

**Target:** live version **6.39.0**, first 40 levels. **Status:** implemented diagnostic audit; balance decisions pending actual human playtesting.

## Why this pass exists
Earlier tests checked that boards remain playable (legal swaps, valid score accounting, successful persistence and obstacle integrity). Those checks do not establish fair objectives, approachable three-star thresholds or human difficulty. This pass makes level configuration and seeded-bot outcomes reviewable in a single reproducible artifact before anyone adjusts live moves, stars or obstacle positions.

## What ships
- `tools/harmony-difficulty-fairness-audit.cjs`: executes deterministic, paired seeded full games against the actual `HarmonyRules.Game` implementation using the live **Pacing Director 3.0** by default.
- Every selected level gets the same start seed for the **random** baseline and an established **one-turn-preview goal** bot, which has exact engine knowledge. This is explicitly *not* a human performance estimate.
- Per-level and per-run records: configured goal and target, move budget, four/five families, 2★/3★ goal-completion move thresholds, won attempts, median winning moves, earned stars among wins, remaining moves on win, progress fraction on losses, near misses, longest objective stagnation, legal swaps and fixed obstacle positions.
- Three outputs: machine-readable JSON with **every game and seed**, compact CSV for spreadsheets, and a Markdown level-by-level assessment with screening flags. Generated into `daisugi-bloom/reports/` (not copied into game files).
- `tests/harmony-difficulty-fairness-audit.test.cjs` checks deterministic paired seeds, output formats, blocked levels and a read-only guarantee. The ordinary CI rules job runs that test.
- A separate GitHub Actions job runs **40 × 8 × 2 = 640 games**, with files downloadable in its run's `japanese-harmony-difficulty-fairness-3-0` artifact. Existing CI and deployment remain in place.

## Interpreting diagnostic flags (not automatic balancing)
| Code | Audit-only trigger | Interpretation |
| --- | --- | --- |
| LOW_GOAL_BOT_COMPLETION | Goal bot wins ≤25% | Inspect goal attainability and positioning, particularly obstacles |
| VERY_EARLY_COMPLETION | Goal bot wins ≥75% with median ≤3 moves | Goal may be trivial or solved by easy cascades |
| NO_3STAR_GOAL_BOT_WINS | ≥50% goal-bot wins, none 3★ | Check efficiency reward threshold against player runs |
| LONG_GOAL_STAGNATION | Mean longest zero-objective streak ≥min(12, 38% of budget) | Player may feel stuck despite legal swaps |
| LARGE_RANDOM_VS_GOAL_GAP | Random bot wins 0 but goal bot wins at least once | Planning matters; check whether information is readable |
| DARUMA_CHAPTER_FALLBACK_GOAL | Chapter 3 stage is not actually a Daruma challenge | Inconsistent chapter theme |
| STONE_POSITION_REPEATED | Early chapter 4 uses center stone on repeat | Review meaningful positioning variety |

**Critical interpretation caveat:** the original generic goal bot primarily rewards *completed* mission counters, not intermediate Daruma eyes or Sealed Stone cracks. It may be especially weak at four-hit obstacles. Low obstacle completion is a **test-design investigation trigger** until obstacle-aware play and real human attempts corroborate it. No threshold above proves a human level unfair. Bot trials may be too few to infer probability precisely, and the bot previews future results it could not know in actual play.

## Static inspection findings from v6.39.0
- Stages **1–5** form the guided introduction; stage **11** expands from four to five active families.
- Chapter **21–30** introduces actual fixed Daruma objectives on **21, 23 and 26**. Remaining stages continue the standard quest cycle; this weakens chapter consistency.
- Chapter **31–40** uses one four-hit fixed **Sealed Stone** for levels 31–33 and 35; multiple stones progressively appear later. Early levels **31–33** reuse the exact same cell `24`, so variation is largely in refill/seed.
- All ten chapter-4 stages share the same `sealedStone` goal type, which may become repetitive even if the increasing obstacle count is objectively harder.
- `moveStarTargets` computes star thresholds from the configured `par` and the move budget; no human-playtest-based calibration exists for this entire 40-level build.
- Present default Pacing Director 3.0 maintains ordinary refill opportunities but is not explicitly targeted at completing Sealed Stone / Daruma missions. The opt-in Objective 3.1 refinements likewise lack custom metrics for these goals.

## Running the audit
From repository root:

```bash
node daisugi-bloom/tools/harmony-difficulty-fairness-audit.cjs
node daisugi-bloom/tools/harmony-difficulty-fairness-audit.cjs --levels 21-40 --trials 8 --seed 20261025 --mode director3
node daisugi-bloom/tests/harmony-difficulty-fairness-audit.test.cjs
```

To experiment without changing production, use `--mode director31` or `--mode director311`; document both mode and seed before comparing. The modes are NOT interchangeable with normal human sessions and should not be used to claim improved fairness without real player tests.

## Required validation before a balance update
1. Test the first 40 levels on the same target phones, logging initial seed if available, attempted moves, completed goal progress, remaining turns, earned stars, retries and whether the player understood *how* to progress.
2. Prioritize stages flagged for rapid completion, long target stagnation, or no 3★ goal-bot wins; include unflagged control stages too.
3. For stages 21–40 distinguish objective progress on each turn (eye painted, stone cracked) from only the final completed-obstacle count. Four-hit objectives are fundamentally different from one-turn challenges.
4. Avoid changes to saves, star records, rewards or existing player's in-progress boards while diagnosing.
5. Only after real observations, propose targeted per-stage changes with paired before/after benchmark and unchanged gameplay physics.

**No levels, stars, coins, economy, UI or gameplay rules were changed in Audit 3.0.**
