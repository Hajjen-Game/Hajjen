# Journey Levels 1–50 Redesign · Step B, Batch 1 (Levels 1–10)
2 November 2026 · Design preview, **not** the published journey.

## Goal
Keep the clarity of the first three levels, avoid Mist fatigue, and establish the rhythm of
**teach → apply → contrast → reward** before introducing the first additional mechanical fixture
(Daruma, planned around level 15).

The new level definitions use the independent `Level Architecture 2.0` recipe schema
(`HarmonyJourneyDrafts`) and the genuine existing `HarmonyRules.Game` engine.
They do **not** change the production `levelConfig`, unlocked content, star archives,
coins, saved rounds, move economy, or the first-timer onboarding.

## First chapter — authored draft (numbers below are *player-visible* 1–10)
| Level | New design | Mission | Moves | 3-star par | Purpose |
| --- | --- | --- | ---: | ---: | --- |
| 1 | First Harmony | 3 fusions | 18 | 4 | Teach one real match |
| 2 | Growing Beauty | 1 stage-3 treasure | 24 | 5 | Understand stages |
| 3 | First Masterpiece | 1 stage-5 Masterpiece | 34 | 9 | Experience Harmony Pulse |
| 4 | First Mist | Clear 3 Mist | 30 | 9 | First fixed-position overlay |
| 5 | Fusion Crossing | 8 fusions | 26 | 11 | Relax on a clear board instead of repeating Mist |
| 6 | Fourfold Dance | Four-tile matches on 3 separate moves | 30 | 16 | Encourage deliberate shape planning |
| 7 | Pulse Garden | 5 Harmony Pulse upgrades | 33 | 16 | Teach purposeful fusion landing |
| 8 | Misty Crossroads | Clear 5 Mist across two small groups | 35 | 18 | Apply Mist knowledge, with spatial separation |
| 9 | Growing Treasures | 9 upgrades to stage 3 | 34 | 19 | Stage development as an alternative to clearing |
| 10 | Masterpiece Festival | 2 Masterpieces | 40 | 22 | A satisfying chain-building chapter finale |

The stars/moves listed above are provisional art-direction targets; they must be
calibrated with actual player rounds and **not** treated as verified success rates.

## Preview available in Game Settings
Open **Game Settings → Journey 2.0 · Levels 1–10 Preview**.
Select any of the ten designs. The preview reuses the existing 7×7 board,
animations, sound and genuine objective logic while disabling persistent
completion, Omamori spending and recorded level rewards.

To preserve live-player state:
- Preview is a deliberately unranked draft; it cannot unlock levels.
- The trial does not overwrite the user's existing in-progress run.
- Preview screenshots, exported rounds and human feedback can inform the next revision.
- No new "test" currency or permanent profile data is added.
- This preview only offers **core mechanics** and Mist, not early Mirrors, Wind, Hanabi or Bamboo.

## Proposed introduction milestones after Chapter 1
- **Level 15:** Daruma introduction (two-hit fixed fixture)
- **Level 22:** Moon Mirror introduction (one directed reflection, then Fusion Echo)
- **Level 31:** Wind Garden introduction (predicted periodic row rotation)
- **Level 38:** Hanabi Crate introduction (drop-to-crate then upward Pulse)
- **Level 44:** Sealed Stones introduction (four hits and Awakening Pulse)
- **Level 71–80, evaluation only:** Bamboo boards, not assumed permanent content

These are a planning schedule, **not yet implemented live**.
After introducing a mechanic, old mechanics return in different, intentional
combinations. Wind + Mist stays disabled by default until a visual readability
playtest explicitly approves the combination.

## Validation gates before promoting to live
1. Reproducible valid openings, true swaps and a real objective on each draft.
2. Objective reachability and Director decisions across multiple seeds.
3. No high-frequency reshuffles, surprise auto-win or inaccessible target.
4. A mobile screenshot/readability pass for objectives, Mist and HUD.
5. Human playtest of a sample of the first ten, especially levels 6 and 9.
6. Versioned live rollout that keeps existing saved level contracts and
   archives intact (not part of this isolated preview deployment).

## Work remaining in Step B
Draft/validate 11–20 with Daruma on 15, 21–30 with Mirror on 22,
31–40 with Wind on 31 and Hanabi on 38, and 41–50 with Sealed Stones
on 44. Do not change the chapter-book assets or award system until the
new batch order has been validated.
