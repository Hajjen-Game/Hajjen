# Japanese Harmony · Pass 2 — Balanced Refill & Fair Shuffle 2.0

**Release:** Japanese Harmony 5.3.0 (2026-10-22)
**Scope:** Internal randomness conservation and reshuffle integrity; no changes to 7×7 size, nine family rotation, five stages, level objectives, move counts, progression, artwork or core scoring rules.

## What changed

### Balanced Refill (bag conservation)

Previous behavior:
1. Draw a family and **remove it** from a 20-slot pool (four instances of each of the five active families).
2. With an approximately 78% cascade-dampening chance, if this placement would complete an automatic match, replace it with a random safe family.
3. The discarded family is **not returned to the pool**, while the substituted family is not deducted. The pool therefore no longer describes what appears on the board.

**New behavior:** Choose a provisional index in the *actual bag*, then, if the old 78% dampening applies and a safe alternative is available, select another eligible **index in that same bag**. Deduct **only the finally placed family**. Unselected entries remain to be used later. The system cannot invent a family outside the bag, and the intended four copies per family are conserved across each 20-piece bag cycle. If the bag has no safe choice, the original choice is allowed, preserving spontaneous cascades.

No explicit preference is given to the current level's objective family. This pass fixes accounting fairness; it is **not** the proposed Harmony Opportunity Director.

### Fair Shuffle (preserve player investments)

Previous shuffle changed family *labels* directly in the current slots, prioritizing stage-one pieces but potentially changing the family of a stage-4 piece after fallback. It also did not guarantee the resulting board was free of spontaneous matches.

**New shuffle** runs only if there are no legal adjacent moves:
- Gather the **actual 49 objects**, including `id`, `family` and `stage`.
- Build a new valid arrangement by drawing complete objects from family-specific pools without introducing an automatic line of three.
- Prefer arrangements with **at least three legal moves**; fallback is an identity-preserving pair relocation with **at least one legal move** if needed.
- Never create/delete an object, reroll an object's family, or modify its stage. Shuffle does not spend a move or change score.
- Browser visuals now use the same ID-aware FLIP motion as falling objects, so developed objects visibly travel to their new positions.

An artificial, internally inconsistent board with no possible solution by permutation produces an explicit diagnostic error rather than silently destroying player progression. All tested full legal boards have recovered.

## Verification

**Deterministic unit contracts** in `tests/harmony-refill-shuffle.test.cjs` cover:
- 3 full refill bags × 20 entries, exactly four of each family.
- Safe-choice redirection preserves the rejected family in the remaining bag.
- Forced natural matches remain possible when no safe family is left.
- 100 additional constrained draws preserve every family count and reduce the bag by precisely one per placement.
- Synthetic 7×7 locked board: shuffled by complete object identity, no free matches, at least three available swaps.
- 120 staged boards distributed across all ten level pools: every id/family/stage tuple is preserved.
- Live forced-rescue swap, unchanged score/moves and retention of every invested stage.
- Replay across all ten levels with valid moves and no unresolved free matches.

**Extended stress check:** 450 seeded automated games across all ten levels, with six required rescues. No unresolved deadlocks or exceptions were observed.

### Paired A/B report – 90 automated games

Fixtures:
- `tests/fixtures/harmony-engine-5.2.0-baseline.json` (before the changes)
- `tests/fixtures/harmony-engine-5.3.0-ab-report.json` (after the changes)

All compared runs use base seed `20261022` and identical per-(level,trial) initial boards. Changed refill selections intentionally alter subsequent board evolution.

| Bot | Before wins / runs | After wins / runs | Mean turns with cascades, before → after |
| --- | ---: | ---: | ---: |
| Random | 19 / 40 | 20 / 40 | 2.83 → 2.98 |
| Goal-oriented | 37 / 40 | 33 / 40 | 4.85 → 4.50 |
| Lookahead | 10 / 10 | 10 / 10 | 4.70 → 4.40 |

**Read carefully:** This is a small deterministic sample, not a measurement of human wins or proof of improvement/harm.

### Focused A/B – 24 seeds on the two sensitive levels

Raw paired runs: `tests/fixtures/harmony-engine-5.3.0-focused-ab.json`

| Level / bot | Before wins | After wins | Goal attainment (before → after) |
| --- | ---: | ---: | ---: |
| 6 – goal-oriented | 19 / 24 | 17 / 24 | 89.6% → 85.4% |
| 9 – goal-oriented | 22 / 24 | 19 / 24 | 95.8% → 87.5% |

These differences warrant further tuning research, not automatic assistance or an unsupported claim that the engine is easier. Future planning agents can simulate unknown refills (oracle-style) and cannot be taken as a human win-rate model.

## What stays unchanged

The existing initial-board guarantee (all five active families represented, all at stage 1, no opening matches, at least three swaps), level progress, 5-stage sprites, 280ms fusion gathering, Harmony Pulse interactions, 78% cascade dampener, all 10 level objectives, existing save JSON fields and old-save compatibility remain unchanged.

The fairness changes **do change** sequences of spawned objects and later cascades on existing seeds. Old saves remain valid, but the continuation after the next refill may differ from version 5.2.0.

## Next evaluation gate

Do not add objective-dependent steering in this pass. Compare larger seeded samples, check real human difficulty (especially levels 6 and 9), and only then evaluate Harmony Opportunity Director as a separately toggleable Pass 3 experiment.
