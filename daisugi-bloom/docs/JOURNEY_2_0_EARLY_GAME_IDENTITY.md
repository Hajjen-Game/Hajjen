# Japanese Harmony — Early Game Identity Redesign · Journey 2.0
November 2026 · **Step B: playable, unranked drafts for levels 1–20**.

## Design rationale
Experienced match-three players already know basic swaps, three-in-a-row, and ordinary blockers. The first minutes should show what makes **Japanese Harmony** different: ascending treasure stages, Fusion Destination Control, large Masterpiece pulses and Japanese festival magic.

Introduce *spectacle* first, then strategic control, and only afterward multi-hit blockers. The sequence selected after human playtests is:
1. **Hanabi Crate — level 5** (easy to understand and visually satisfying).
2. **Moon Mirror — level 11** (a Fusion's destination controls a reflection).
3. **Wind Garden — level 16** (predictable row shifts following valid moves).
4. **Daruma — planned level 21**, not in first twenty.
5. **Sealed Stones — planned level 31**, with Hanabi + Stone combinations.
6. **Bamboo — late experimental content**, roughly 75+, only if it plays fairly.

### Authored first 20 missions
| Level | Design / identity | Objective | Move budget | 3-star par | Mechanics |
|---:|---|---|---:|---:|---|
| 1 | First Harmony | 3 Fusions | 18 | 4 | Core |
| 2 | Growing Beauty | 1 stage-3 upgrade | 24 | 5 | Core |
| 3 | First Masterpiece | 1 Masterpiece | 34 | 9 | Harmony Pulse |
| 4 | First Mist | Clear 3 Mist | 30 | 9 | Mist |
| **5** | **First Firework** | **Deliver 1 rocket** | 30 | 13 | Hanabi |
| 6 | Twin Fireworks | Deliver 2 rockets | 38 | 21 | Hanabi |
| 7 | Fireworks Through Mist | Clear 4 Mist | 38 | 21 | Hanabi + Mist |
| 8 | Festival Bloom | Create 2 Masterpieces | 39 | 23 | Hanabi (optional launch) |
| 9 | Firework Finale | Deliver 2 rockets | 41 | 23 | Hanabi + optional Mist |
| **10** | **Koi Masterpiece Finale** | **2 Koi Masterpieces** | 40 | 17 | Core, unchanged from approved playtest |
| **11** | **First Moon Mirror** | 2 stage-4 upgrades | 39 | 21 | Moon Mirror |
| 12 | Moonlit Mist | Clear 3 Mist | 43 | 24 | Mirror + Mist |
| 13 | Moon and Fireworks | Deliver 2 rockets | 45 | 25 | Mirror + Hanabi |
| 14 | Double Reflection | 3 stage-4 upgrades | 45 | 26 | Two Moon Mirrors |
| 15 | Moonlit Bloom | Create 2 Masterpieces | 46 | 26 | Mirror + Hanabi |
| **16** | **First Wind Garden** | **14 Fusions** | 37 | 22 | Wind |
| 17 | Wind and Fireworks | Deliver 1 rocket | 40 | 23 | Wind + Hanabi |
| 18 | Wind and Moonlight | 3 stage-4 upgrades | 46 | 27 | Wind + Mirror |
| 19 | Crossing Winds | Create 2 Masterpieces | 48 | 29 | Two shifting Wind rows |
| 20 | Festival of Reflections | Deliver 2 rockets | 48 | 28 | Hanabi + two Mirrors |

All budgets and star thresholds **remain provisional until repeated playtests**. The original chapter-one learning sequence and the positively reviewed Koi goal are unchanged.

## Rules, compatibility and feedback
- The original **seven-by-seven, real Rules.Game** performs swaps, gravity, board refills, damage, Fusion, Masterpieces and objective accounting. Level-architecture recipes never grant fake credit or scripted wins.
- **Hanabi's launch** still travels *straight upward*. It can clear Mist and hit Daruma / Sealed Stones once those mechanics arrive; its blast is **not reflected by Moon Mirror** until a separate rules design is approved. The rocket must arrive in the crate before firing.
- On 5–9 the **four-family** opening uses a valid fallback in Hanabi's existing authored starting row. Level 11 introduces the real fifth family.
- **Mirror Fusion Resonance** is active for ordinary Fusions next to a fixed Mirror, without requiring a Masterpiece.
- **Wind** shifts a forecast row after a scheduled number of successful moves. Wind never mixes with Mist in this batch. Wind rows cannot include a Moon Mirror or a Hanabi crate; any Hanabi cargo route below its start must remain unaffected by Wind.
- First encounters on **5, 11 and 16** show a dismissal-only contextual tutorial with the existing illustrated help system. The confirmation does not write tutorial flags to the normal save.
- **Harmony Director 6.2** operates on the new mechanized test boards; legacy first levels and Koi retain their original draft modes.

## Safe preview / test path
Open **Game Settings → Journey 2.0 · Levels 1–20 Preview** and select the desired chapter tab. It is unranked: no permanent stars, coins, Omamori spending, inventory, unlocks, records or current run changes. Draft levels use versioned recipe descriptors, and the normal published Journey remains untouched.

## Tests and acceptance criteria
- Chapter 1: 60 actual seeded games with genuine legal swaps, valid four-family Hanabi cargo, deterministic openings, no free match, and save/restore parity.
- Chapter 2: 60 actual seeded games with genuine legal swaps, fixed Mirror placement, Wind schedule, combined Hanabi fixtures and save/restore parity.
- Mobile: 390px full flow verifying the first Hanabi, Moon and Wind tutorials, cargo and crate artworks, actual player swap, mixed later chapter layouts, and *byte-equivalent logical save data* before and after.
- Existing production 1–100 and historical saved games remain unaffected.
- Acceptance for publication requires *human playtests* of 5–9, 11, 16–20; track objective reachability, stall/shuffles and move counts. Technical checks alone do not validate final difficulty.

## Retired designs
The older level 11–20 *Daruma-first* drafts and the old level 5–9 no-Hanabi drafts are superseded by these recipes. They must not be confused with published live levels. This file is the current source of truth for the early-game identity proposal.
