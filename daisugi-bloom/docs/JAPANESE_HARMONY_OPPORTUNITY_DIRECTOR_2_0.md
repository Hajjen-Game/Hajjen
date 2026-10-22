# Japanese Harmony — Opportunity Director 2.0
**Date:** 2026-10-22

## Design
Three explicitly different, reproducible engine modes:

- `standard`: default for actual players; original refill logic remains untouched
- `director`: legacy Opportunity Director 1.0; unchanged scoring and candidate selection
- `director2`: experimental proposal evaluator, opt-in via `new Game(level,null,{directorMode:"v2"})`

Refill still flows from above; no new gravity directions. It uses the same weighted five-family bag, placing **only ordinary stage-one** pieces. No alteration to any existing piece, no free stage boost, no extra turns, no fabricated Masterpieces and no change to match/pulse rules.

## V2 candidate selection

Four refill proposals are drawn from the same board holes and bag. Candidate 0 is the **exact Standard proposal**, consuming the same normal random stream. The other three use deterministic forked RNGs without advancing the game's regular stream. The method selects among these proposals only when Standard has no automatic free match, and rejects proposals that introduce free cascades. The bag counts, object IDs and save-compatible seed remain consistent.

Director 2.0 evaluates:

1. **Developed investment:** distinct stage-3 and stage-4 pieces that participate in available matches, not just total move count
2. **Promising neighbours:** developed objects with a same-family piece within two orthogonal spaces
3. **Playable choices:** sufficient valid moves but no excessive weight on irrelevant stage-one matches
4. **Specific tutorial goals:** eligible family when the objective asks for a particular family
5. **Controlled drought:** after several moves without stage advancement, Echo, Pulse or a Masterpiece, cautiously prefer candidates that restore development opportunities

One-move candidates never require a specific player action. The Director does not pick or play a move; Smart Hint is a separate feature.

## Backward compatibility & safety

- `directorMode` and `directorDrought` are included in game snapshots; old `opportunity:true` snapshots restore to Director 1.0.
- The actual released game retains `standard` without a save migration or a change to normal gameplay.
- Director 1.0 is unchanged and included as a separate baseline.
- Scores, movement count, animation events, save IDs, Masterpiece collection and Harmony are untouched.

## Testing and promotion gate

The engine test suite includes seed matching, bag preservation, unchanged surviving objects, no created stage 2–5 pieces, no free cascades when Standard is match-free, deterministic snapshots, drought state and three-way diagnostic mode support.

The benchmark script `daisugi-bloom/tools/opportunity-director-v2-benchmark.cjs` plays **480 actual seeded games** (10 representative level indices × 2 player bots × 3 modes × 8 shared seeds). Results include wins, scores, stage-investment opportunities, near-Masterpiece moves, legal moves, streaks of no progress, automatic cascades and Director intervention rates. Raw runs and seeds are exported by the `director2-benchmark` GitHub Actions job as JSON artifact `japanese-harmony-director2-benchmark`.

**Interpretation:** Bot success is not a proxy for human enjoyment. Higher average score and a few extra opportunities do not justify a change if the Director reduces meaningful decisions or makes fusion outcomes feel handed to the player.

**Ship decision:** Director 2.0 remains experimental by default. Promote to live gameplay only after broad seeded comparisons, regression checks and mobile playtesting.

## Confirmed initial benchmark (480 seeded games)

The dedicated GitHub Actions benchmark completed successfully using ten level indices, two bot styles, three modes and eight identical seeds per combination (480 games). The first raw benchmark is attached to workflow run `39841068030` as `japanese-harmony-director2-benchmark`.

| Metric | Standard | Director 1.0 | Director 2.0 |
|---|---:|---:|---:|
| Random-bot wins / 80 | 44 | 51 | **53** |
| Random-bot mean score | 2,860 | 2,969 | **3,078** |
| Random-bot stage-4-ready opportunities per observed turn | 0.08 | 0.12 | **0.13** |
| Random-bot longest no-goal-progress streak | 5.45 | 5.14 | **5.03** |
| Goal-bot wins / 80 | 80 | 80 | 80 |
| Goal-bot mean score | 3,993 | 3,895 | **3,995** |

These results are promising but modest, particularly for the less strategic bot, and cannot establish user-perceived enjoyment. Crucially, **they do not justify automatically switching production play to Director 2.0**. Full regression tests and human playtesting remain the promotion gate.

