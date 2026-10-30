# Bamboo Paths 1.0 · Japanese Harmony
**Chapter 6 · Levels 51–60 · 30 October 2026**

## Release intent
Turn Board Mechanics Foundation 1.0 into the first chapter that changes
the shape of the puzzle board. The three reusable layouts are **Temple Gate**,
**Twin Gardens**, and **Central Shrine**. Board stones are closed, stationary
terrain, **not** multi-hit blockers and not collectibles.

The player learns each layout in two levels, gets a lighter relief round at
level 57, and revisits the central shrine for the level 60 Mist finale.

| Level | Name | Board | Main goal | Moves | 3-star threshold |
|---|---|---|---|---:|---:|
| 51 | First Bamboo | 2 closed cells | 10 fusions | 26 | 9 |
| 52 | Narrow Paths | 4 closed cells | 7 stage-3 upgrades | 34 | 13 |
| 53 | Temple Gate | 8-cell Temple Gate | 14 fusions | 33 | 12 |
| 54 | Gate of Echoes | Temple Gate | 7 Harmony upgrades | 46 | 24 |
| 55 | Twin Gardens | 4-cell Twin Gardens | 16 fusions | 35 | 12 |
| 56 | Bridge of Harmony | Twin Gardens | 9 stage-3 upgrades | 43 | 21 |
| 57 | Bamboo Breeze | Fully open 7×7 relief | 16 fusions | 28 | 12 |
| 58 | Central Shrine | 8-cell Central Shrine | 15 fusions | 37 | 13 |
| 59 | Heart of the Garden | Central Shrine | 2 Masterpieces | 46 | 18 |
| 60 | Path of Harmony | Central Shrine with 3 Mist tiles | Clear 3 Mist | 58 | 31 |

The first 50 level configurations and progression rules remain unchanged.
Levels 61+ remain the existing generated objectives for now; **Lotus Stream is
not yet implemented**.

## Delivery
- Hand-authored level recipe module: `harmony/bamboo-paths.js`.
- Integrated into `HarmonyRules.levelConfig`, with physical board masks.
- New Goshuincho Chapter 6: Bamboo Paths. Endless Garden now follows it.
- One-time onboarding at levels 51, 53, 55, 58 and 60, with illustrated
  7×7 layout previews. Existing GOAL [?] reopens the lesson.
- Lantern Path victory now offers “Enter Bamboo Paths”.
- Victory for level 60 acknowledges completion of the chapter.
- Preserves old active 51–60 saves as legacy generated rounds; only starting
  a **new** round enables the authored Bamboo recipe and shape.

## QA & fairness
- Dedicated `harmony-bamboo-paths.test.cjs` verifies authored level count,
  layouts, goals, chapter art keys, tutorial keys, saves, resume behavior,
  hint nonmutation, 250 seeded Director 4 opening moves and full-terrain invariants.
- Seven independent hint-driven sample rounds per level were compared during
  calibration. All won in levels 51–59, six of seven won on the chapter
  finale after reducing four Mist targets to three. This is *diagnostic*,
  not a human completion-rate estimate.
- Three-star deadlines and several move budgets were tuned after diagnostic
  runs to avoid every fusion-level win giving automatic three stars.
- Dedicated closed-terrain regression guards still protect Pulse, Awakening,
  shuffle, Omamori, gravity and save snapshots.

## Playtest questions
- Are levels 51 and 52 clear and welcoming without feeling trivial?
- Do closed stones visually read as **permanent** rather than requiring hits?
- Do the Gate and Gardens layouts genuinely change strategy in human play?
- Does level 57 feel refreshing without being almost instant?
- Is the final Mist objective understandable and completable without an
  Omamori, including players with slower pattern recognition?
- Are 1/2/3-star outcomes and Harmony Coins fair over a real 10-level run?

## Recommended next pass
**Lotus Stream 1.0 — Drop & Collection Foundation**: add dedicated movable
lotus-seed collectibles and delivery cells, a clearly visible path and a
collection goal. First implement a single playable sample level, then
calibrate and author levels 61–70. Do not reuse arbitrary stone hit counters:
its novelty is *routing objects through gravity*, not more obstacles.
