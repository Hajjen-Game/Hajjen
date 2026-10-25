# Chapter Gameplay Identity 1.0 — Japanese Harmony v6.41.0

**Status:** implemented on the game's main branch, with deterministic tests. Date: 25 October 2026.

## Purpose

Turn chapters 3 and 4 into intentionally authored puzzle journeys rather than repeating a generic quest rotation or exactly the same center stone. Keep the **same 7×7 board, nine families, five stages, two-hit Daruma, four-hit Sealed Stones, four-way Harmony Pulse and eight-way Awakening Pulse**. No new currency, power-up, random special item, or hidden dynamic difficulty.

The objective is for a player to remember *what* each chapter taught: chapter 3 is about positioning and returning to specific Daruma, chapter 4 is about setting up breaks and exploiting positional relationships between stone obstacles.

## Chapter 3 · Darumas önskan · levels 21–30

| Nivå | Stage name | Actual objective | Blocker cells (0-based) | Moves | Why this stage is different |
| --- | --- | --- | --- | ---: | --- |
| 21 | Daruma Awakening | Complete 1 Daruma | 24 | 36 | Learn the two separate-hit contract at center |
| 22 | Moonlit Mist | Cleanse 11 Mist | — | 42 | Breather / apply planned fusion landing |
| 23 | Twin Wishes | Complete 2 Daruma | 17,31 | 40 | Two distinct regions |
| 24 | Faraway Wishes | Complete 2 Daruma | 9,39 | 42 | Spread the effort over opposite quadrants |
| 25 | Festival of Fusion | Complete 11 fusions | — | 36 | Flow-level / release tension from stationary objects |
| 26 | Diagonal Wishes | Complete 2 Daruma | 16,32 | 42 | A different diagonal arrangement |
| 27 | Temple Gate | Complete 2 Daruma | 23,25 | 42 | Work a narrow central corridor |
| 28 | The Hidden Path | Cleanse 14 Mist | — | 40 | Precision Mist intermission — **keep v6.40 star calibration** |
| 29 | Three Wishes | Complete 3 Daruma | 10,24,38 | 46 | Three-blocker Daruma finale |
| 30 | Final Blessing | Cleanse 15 Mist | — | 40 | Chapter epilogue — **keep v6.40 completion and star tuning** |

Six of ten stages now contain required Daruma goals (previously three). The other four deliberately rotate between Mist and Fusion. This is not an indiscriminate obstacle rollout. **All six Daruma stages require two different player decisions per blocker; none can be completed from multiple hits in the same turn.**

The altered missions are **24, 27 and 29**. Original goals on already-started historical runs of these stages remain the original Mist / stage-3 / Pulse missions; see compatibility below.

## Chapter 4 · Förseglingarnas väg · levels 31–40

| Nivå | Stage name | Stone cells (0-based) | Purpose |
| --- | --- | --- | --- |
| 31 | First Sealed Stone | 24 | Learn four hits and eight-way release |
| 32 | Northern Seal | 17 | Same goal, distinct upper route |
| 33 | Southern Seal | 31 | Distinct lower route |
| 34 | Twin Seals | 17,31 | Pair of separated targets |
| 35 | Hidden Seal | 16 | Revisit a single blocker off-center |
| 36 | Distant Seals | 9,39 | Navigate across the board |
| 37 | Diagonal Seals | 16,32 | Diagonally displaced targets |
| 38 | Awakening Link | 23,24 | Adjacent stones can interact via released Awakening Pulse |
| 39 | Three Seals | 10,24,38 | Three separate targets, originally identified for strategy sensitivity |
| 40 | Awakening Garden | 16,24,32 | Three stones within diagonal Awakening Pulse reach |

**Every layout is distinct**. All positions are hand-authored and use the existing target-count pacing: one, two or three stones. Difficulty is changed through *position and player choices*, not additional hits or visual clutter. Core moves and star thresholds in chapter 4 are unchanged by this pass. **Every stone still needs four separate hits, at most once per player decision.**

## Player-facing clarity

- Every authored stage has a different title, subtitle and actionable, mechanics-consistent introduction.
- The in-game **Så spelar du** help now explains Daruma eyes, Sealed Stone layers, regular Pulse and eight-direction Awakening Pulse, and the intentional chapter transitions.
- The existing preview-based idle hint now rewards **a real hit on an existing Daruma/Stone**, not just completing the whole objective. This prevents the hint routinely favoring an unrelated high-score fusion while players attempt multi-hit obstacles. This is still a hint, not a guaranteed route to victory.
- Trying to drag a Sealed Stone gives a specific Sealed Stone message, not a misleading Daruma explanation.

## Save compatibility

- New Daruma missions are identified using the existing `darumaVersion:1` snapshot contract. Pre-identity saves on levels 24, 27, 29 lack this marker; the loader keeps their **previous objective** and does not inject new Daruma into their board. Original Mist masks stay where they were.
- New Stone layouts do not move existing blockers when restoring a saved level. The saved board and `sealed[49]` are authoritative; already damaged and cleared Stone stages retain their exact positions and HP, including earlier center-only formations.
- Existing stars, level unlocks, Goshuincho stamps, scores, coins, rewards and completed levels are unchanged.
- Level 28/30 retain **Fairness Rebalance 1.0** star and move requirements; previously-started rounds keep their historical contract.
- No forced data deletion or replay reset; restarting a level creates a fresh v6.41 formation.

## Testing

- `tests/harmony-chapter-identity.test.cjs`: 20 authentic missions, 10 unique stone placements, minimum 3 legal opening swaps, saved old Daruma/Stone boards, fairness protections, immovable-blocker checks, objective-aware hint non-mutation.
- Existing Daruma/Sealed Stone behavior tests continue checking hit-count conservation, Awakening, gravity, art and save safety.
- `tools/harmony-difficulty-fairness-audit.cjs` supports reproducible version-tagged bot simulations, including an obstacle specialist and a simple goal bot. Compare default seed 20261025 with 6.40.0. Neither strategy is a human win-rate predictor.
- The mobile smoke suite covers general gameplay plus 1/2/3 Stone presentations on 320px/390px devices.

**Design note:** newly introduced Daruma stages (24, 27, 29) may require further *human* balancing after playtesting. Their authored layouts are not yet proof of appropriate player difficulty. Review the 744-game bot audit for any glaring blockers before making large-scale changes.
