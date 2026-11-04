# Japanese Harmony — Journey 2.0 · focused levels 1–20

**Current playtest design, 4 November 2026.** This supersedes the earlier Moon Mirror introduction and the old counter-heavy difficulty patch.

## One direction

Playtests confirm the level design is improving. Moon Mirror lacks a necessary gameplay role, so it is **parked throughout levels 1–20**. The game keeps its real Fusion, evolution, Harmony Pulse and Mist teaching mechanics. Four clear pillars lead the puzzle progression: **Hanabi Crate, Wind Garden, Daruma and Sealed Stones**.

The central question for every level is what the player must notice, prepare and exploit. Do not replace spatial design with long lists of counters. A second objective is included only when it makes an interacting mechanic genuinely necessary. There are no fake minimum-turn locks, scripted wins or required boosters.

## Level plan

| Level | Name | Mechanic | Objective | Moves | Discovery |
|---:|---|---|---|---:|---|
| 1 | First Harmony | Fusion | 3 Fusions | 18 | Learn the merge |
| 2 | Growing Beauty | Stages | Stage 3 | 24 | Control evolution |
| 3 | First Masterpiece | Harmony Pulse | 1 Masterpiece | 34 | Earn a stage-five Pulse |
| 4 | First Mist | Mist | Clear 3 Mist | 30 | Land Fusion on the overlay |
| 5 | First Firework | Hanabi intro | Deliver 1 rocket | 30 | Two-step setup |
| 6 | Long Fuse | Hanabi | Deliver top-row rocket | 36 | Open a full-column route |
| 7 | Twin Ascent | Hanabi | Deliver 2 top-row rockets | 43 | Handle independent routes |
| 8 | Festival Bloom | Hanabi + Masterpiece goal | 2 Masterpieces and 1 rocket | 44 | Use the blast to evolve |
| 9 | Festival Clearing | Hanabi + Mist | 3 Mist and 2 rockets | 47 | Work outside blast columns |
| 10 | Koi Masterpiece Finale | Koi | 2 Koi Masterpieces | 40 | Keep approved Koi challenge |
| 11 | First Wind Garden | Wind | 12 Fusions | 38 | Read the third-turn shift |
| 12 | Crossing Winds | Wind | 1 Masterpiece and 2 four-match turns | 43 | Plan alternating rows |
| 13 | Wind and Fireworks | Wind + Hanabi | 1 rocket and 2 stage-4 upgrades | 43 | Coordinate upper Wind and cargo |
| 14 | First Daruma | Daruma | Clear 1 Daruma | 38 | Land two separate hits |
| 15 | Twin Daruma | Daruma | Clear 2 Daruma | 44 | Hit two guardians |
| 16 | Festival Guardian | Hanabi + Daruma | Clear 2 Daruma and 1 rocket | 46 | Hit blockers with the blast |
| 17 | Wind Shrine | Wind + Daruma | Clear 2 Daruma | 48 | Shift toward blockers |
| 18 | First Sealed Stone | Stone | Clear 1 Stone | 46 | Four hits and Awakening |
| 19 | Awakening Pair | Stones | Clear 2 Stones | 52 | One break helps another |
| 20 | Festival Seal | Stones + Hanabi | Clear 2 Stones and 2 rockets | 57 | Blast through stone columns |

**Hanabi placement policy:** The first Hanabi is introduced at level 5 with a short drop. Subsequent solo Hanabi levels 6 and 7 start rockets in the **top row**. Level 8 (with a Masterpiece goal) and level 9 (with Mist) also start rockets at the top. Mixed Wind / Daruma / Stone puzzles may position rockets lower to make the interaction more interesting.

**Chapter rhythm:** 1–5 discovery; 6–10 long Hanabi routes and Koi finale; 11–15 Wind then Daruma; 16–20 interactions, Stone Awakening and a festival finale. Wind and Mist never mix in the first 20; no Bamboo and no Mirror.

## Implementation

- All twenty versioned recipes live in harmony/journey-levels-v2.js. Sealed Stone positions are included in the recipe's deep-copy contract.
- Fifteen **fixed, complete, 49-cell reference openings** live in harmony/journey-authored-openings.js for 5–9 and 11–20. Levels 1–4 and the already playtested Koi level 10 retain their original generation.
- All goals, Fusions, gravity, real swaps, Harmony Director and refills use HarmonyRules.Game. No artificial goal progress is granted.
- Game Settings → Journey 2.0 Preview is still opt-in and unranked. A completed level offers **Next Journey level**, permitting a continuous 1–20 playthrough.
- Contextual teaching prompts appear at levels 5 (Hanabi), 11 (Wind), 14 (Daruma) and 18 (Stone).
- Normal Journey 1–100, saved runs, Goshuincho, cards, coins, unlocked levels and earned stars are deliberately isolated.

## Review criteria

1. No accidental 2–3-move clears in the later puzzle challenges; level 5 can be short after its actual setup.
2. Each opening has genuine legal swaps and a visible planned interaction (not just long objectives).
3. Monitor full rounds for deadlocks, excessive auto-shuffles, sudden cascade victories and long stretches without target progress.
4. Diagnostic agent wins are *not* player win rates and cannot guarantee a level is enjoyable or solvable for humans.
5. Human testing decides whether any of the provisional move / star budgets or board layouts should be changed before normal publication.

Historical Mirror-first Journey specs are retained only as previous design experiments.
