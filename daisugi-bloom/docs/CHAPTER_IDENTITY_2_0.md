# Chapter Identity 2.0 — Five chapters, distinct journeys
Japanese Harmony · October 29, 2026

## Purpose
Strengthen the identities of the five crafted ten-level chapters without replacing the approved Japanese watercolor/Washi art, disturbing live saves, or adding another complicated blocker.

### Chapters 1–5
| Levels | Chapter | Recognizable gameplay identity |
| --- | --- | --- |
| 1–10 | First Harmony | Learn matching, stage growth, stage-5 Harmony Pulse, then practice Mist and four-tile matches |
| 11–20 | Garden of Mist | More families, spatial Mist clearing, careful fusion landing and Pulse planning |
| 21–30 | Daruma's Wish | Fixed Daruma dolls, two separate hits, with fusion/Mist relief challenges |
| 31–40 | Path of the Seals | Sealed Stones require four separate hits; final impact creates eight-way Awakening Pulse |
| 41–50 | Lantern Path | Guaranteed Lantern family, Lantern-specific fusion and masterpiece goals mixed with pulse/four-match challenges |

## Lantern Path: ten authored missions
Each brand-new Chapter 5 level has Lantern in its five active families, while every family still follows the same standard match, fusion and stage rules. There are no forced matches, hidden special drops or new blockers.

| Level | Name | Objective | Moves |
| --- | --- | --- | ---: |
| 41 | Lantern Welcome | 3 Lantern-family fusions | 34 |
| 42 | Gathering Glow | 8 objects upgraded to stage 3 | 35 |
| 43 | First Lantern Masterpiece | 1 stage-5 Lantern masterpiece | 44 |
| 44 | Four Lights | Four-tile matches on 3 different moves | 36 |
| 45 | Winding Lanterns | 5 Lantern-family fusions | 40 |
| 46 | Festival Ripples | 10 Harmony Pulse upgrades | 42 |
| 47 | Evening Masterpieces | 3 masterpieces of any family | 44 |
| 48 | Lantern Crossing | 7 Lantern-family fusions | 44 |
| 49 | A Thousand Sparks | 15 Harmony Pulse upgrades | 44 |
| 50 | Festival of Lights | 2 Lantern-family masterpieces | 50 |

A Lantern-family fusion is a genuine three-or-more Lantern match; different stages and cascades are allowed. Its progress is stored separately in the snapshot field familyFusions. A Lantern masterpiece is an ordinary stage-5 Lantern which also activates Harmony Pulse; this was already supported in the core game.

Directors, hints and level previews all recognize the new Lantern-family fusion goal. The family is present on every new Chapter 5 board, but no player moves or matches are fabricated.

## Legacy saves (critical)
New Chapter 5 runs save chapterIdentityVersion:2 with per-family fusion counts.
Earlier saved Chapter 5 runs have no such version. On resume they keep their original goal, their old five-family pool, all current tiles, remaining moves, stars, Mist mask, score and RNG state. Their old general-purpose mission is **not** silently swapped for a Lantern mission.

Restarting an old level begins a fresh Chapter 5 authored mission. Earned Goshuincho stars, coins and unlocked levels are left untouched.

## After level 50
The game continues rather than abruptly ending or pretending more handcrafted chapters exist. Level 51 onward is explicitly labelled **Endless Garden** in Goshuincho, with level titles prefixed "Endless". These are the existing procedurally varied objective challenges: they do not claim a new story mechanic, and existing saves beyond 50 are retained.

The level-50 victory action offers **Enter Endless Garden** and explains that the next challenges are generated. The post-50 economy and game balance remain unchanged.

## Presentation and acceptance
- Each chapter now has a concise identity subtitle in Goshuincho. The paper, stamps, button artwork and existing 7×7 portrait layout are unchanged.
- Chapter 5 teaches Lantern-family matches and Lantern masterpieces contextually, with an explicit two-masterpiece finale.
- Levels 41–50 were sampled at five reproducible seeds for random and goal-oriented strategies. All ten were winnable for the goal bot in that small sample; random play was less consistent on levels 44, 46 and 50. This is a smoke calibration, **not** proof of full human difficulty balance.
- New deterministic tests verify goals and move budgets, Lantern availability, per-family progress and save/restore, legacy-run identity, and Endless Garden labels.
- Mobile browser presentation still needs a visual hands-on check; no artwork has been regenerated.

## Files
- harmony/rules.js — authored levels, Lantern family pool, objective progress, save version, Director support.
- harmony/goshuincho.js — five chapter subtitles and honest Endless Garden naming.
- harmony/onboarding.js — Lantern-family matching, stage-5 Lantern and final two-masterpiece tutorials.
- harmony/app.js — Goshuincho subtitle, matching goal glyph, finale transition; fixes a previous selected-level accessibility label reference.
- harmony/chapter-identity.css — small chapter subtitle in the existing painted layout.
- tests/harmony-chapter-identity-v2.test.cjs — regression contracts, wired into CI.
