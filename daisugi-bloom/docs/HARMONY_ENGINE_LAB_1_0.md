# Japanese Harmony · Engine Intelligence & Diagnostics 1.0

**Status:** Developer diagnostics implemented. Live game mechanics, probabilities, level objectives, presentation and player saves are unchanged. This is Pass 1 of the approved motor-improvement program.

## Purpose

Quantify the puzzle engine *before* changing refill fairness, reshuffles or introducing Harmony Opportunity. Use real `HarmonyRules.Game` rather than a separate approximate game model. Capture reproducible data for multiple agents and seeds, so future engine changes can be benchmarked against this version.

## Open the lab

- **Main menu:** Game Dev → Harmony Intelligence.
- **During a level:** Pause → Game Dev · Motorlab.
- Select a level or all ten; 2, 5, 10 or 25 seeds per strategy per level; and a fixed base seed (default `20261022`).
- Start the benchmark. The report updates progress between runs, can be cancelled, and can be exported as JSON with full per-run metrics, source seed, level, AI type and aggregate statistics.
- Runs only in browser memory; uses neither player `localStorage` nor network requests.

### Four agent profiles

| Bot | Strategy | Interpretation |
| --- | --- | --- |
| Random | Select uniformly among legal adjacent swaps | Baseline, **not** real-human success rate |
| Score | Simulate each immediate legal swap, select largest resulting score + small cascade bonus | Purely points-oriented upper bound |
| Goal | Simulate each immediate legal swap, favor progress toward current objective and built-up stages | Objective-oriented upper bound |
| Lookahead | Simulate best four candidate swaps and sample up to eight replies for a bounded two-ply comparison | Planning upper bound, **not** a human-skill claim |

**Important caveat:** Except for Random, bots simulate the actual refill RNG when evaluating a candidate. That lets them see the future result of a hypothetical move, including refills a human could not predict. They are *oracles* for testing goal accessibility, not estimates of real-world difficulty or fair play. This must not be confused with a human user-test metric or evidence that levels are easy.

## Metrics and terms

- **Win rate:** fraction reaching the level target before running out of moves.
- **Goal completion:** average `min(progress / target, 1)`.
- **Average legal choices:** mean number of playable swaps before each move.
- **Minimum choices:** fewest playable swaps seen during a game.
- **Cascade turns:** number of player turns that produced 2+ fusion waves.
- **Extra waves:** total fusion rounds after each move's first wave.
- **Goal drought:** longest consecutive player-turn streak without a numeric increase in the level-specific progress counter. On milestone levels, constructing a stage-4 object can be strategically useful despite not yet moving that counter. Interpret this together with progress potential, not alone.
- **Forced shuffles:** the count of shuffle events in the rules event log.
- **Total score, masterpiece count, pulse events, bonus events, and stars** provide secondary validation.

All four strategies share the *identical initial seeded board* for a given (level, sample index), eliminating start-board luck as an explanation for strategy differences. Each bot has its own deterministic decision source so repeated runs yield bit-for-bit-identical metrics for the same rule revision and input seed.

## Developer CLI (larger batch runs)

From the repository root:

```bash
node daisugi-bloom/tests/harmony-engine-lab.test.cjs
node daisugi-bloom/tools/harmony-engine-benchmark.cjs --trials 10 --level all --seed 20261022 --out /tmp/harmony-baseline.json
node daisugi-bloom/tools/harmony-engine-benchmark.cjs --trials 250 --level 6 --seed 20261022 --out /tmp/harmony-l6.json
```

- `--level` is **1-based** (1–10) or `all`.
- `--trials` is per AI per level. For example, 25 trials × 4 bots × 10 levels = **1,000 complete matches**.
- Large runs can require considerable CPU time; run them via Node rather than on a low-power phone.
- The JSON contains full trial logs and aggregates; keep the seed and tool version attached to any comparison.

## Technical implementation

- `harmony/diagnostics.js`: portable, dependency-free CommonJS/browser API. `run()`, `runAsync()`, `sampleSeed()`, `play()`, aggregates and cancellation.
- `harmony/rules.js`: optional `{seed}` in `Game` for test starts; optional `{fastRestore:true}` to restore a disposable evaluation snapshot without recreating an unused starter board. Live play without options uses the exact previous logic.
- `harmony/app.js`: Game Dev modal with progress, cancel, table and JSON export. No hidden tuning or interventions are applied to player sessions.
- GitHub Actions: deterministic harness tests; browser smoke for the actual 390px Game Dev menu, progress completion, report rows, export control and unchanged player save.

## Diagnostic findings to validate before Pass 2

These are **hypotheses and static-code findings**, not fixes:

1. Current refill draws one family from a 4×5 bag but may substitute another family to avoid an automatic match, after the initial family was already consumed. Audit **bag conservation** and family appearance rates.
2. Start boards have no initial matches and at least three valid swaps, but these conditions don't guarantee equivalent goal attainability.
3. Locked-board recovery can fall back to changing family identities on evolved objects. A fairer shuffle should preserve object identity and progress while still ensuring a playable state.
4. Some objectives require more planning (e.g., two lantern masterpieces on level 6). Compare random vs goal-oriented and two-ply bots and then test human strategies. Never balance difficulty by interpreting random-bot outcomes as real human win rates.
5. If a future `Harmony Opportunity` chooses among legal refill alternatives, benchmark goal-drought, legal-choice distribution, cascade balance and win rates against **this** unmodified rules engine.

**Ship gate for Pass 2:** A/B test identical seeds and all four bots on both rule versions. Preserve deterministic results, per-level fairness, active family pools and the player's existing save/progression format.
