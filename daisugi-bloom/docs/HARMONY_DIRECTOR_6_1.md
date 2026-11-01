# Harmony Director 6.1 — Objective Reachability & Strategic Mobility
**1 November 2026** · first playable engine integration and opt-in new-run activation

## Why 6.1
A real exported **level 54 Gate of Echoes** round using Director 6.0 (seed `20266172`, `bamboo-paths` preview) finished in **34 moves, 12 moves remaining, score 9,585, zero shuffles**, compared with an earlier Director 4.0 run requiring **33 moves and three shuffles**. That is a positive player result but **not sufficient evidence** of better strategic pacing.

The new 6.0 log also reveals:
- **36 total refill attempts**; 34 have spatial diagnostics. **20/34** of those recorded zero goal-opportunity points for both their original and chosen candidate.
- The first Pulse target progress occurred on move **15**, then **26**, then **34**. Long objective droughts remain even with many legal fusion moves.
- **Five** of the 34 reported snapshots had `supportedChannels > channels` because Director 6.0 counted only >=3-cell gravity runs in `channels` while counting short runs in `supportedChannels`.
- A collectible route (Lotus) should not be scored as if developing stage-five treasures were its primary objective.

## Implemented

### Separate versioned Director mode
`directorMode:"v61"` (not replacing `v6` in saved runs). The older `v6` spatial evaluator, candidate order and game save semantics remain available. Newly started Auto Director levels 51+ and all four mechanic preview menus use 6.1. Levels 1–50 retain their established Auto progression and explicit older modes remain selectable.

### Pure strategic reachability assessment
`harmony/director-v61.js` wraps the genuine 6.0 board-health metrics but adds:
- **All vertical gravity channels** measured consistently: `supportedChannels <= channels` by construction. `viableChannels` is the long-channel subset.
- **Blocked-path distance** using orthogonal BFS through the board's actual movable cells; no path crosses terrain, Lotus cargo, stones or mirrors.
- **Persistent stage 2–4 investments** and nearby same-family partners up to four to five traversable cells away, with greater but bounded value for stage 3/4 pieces.
- **Real stage-progressing moves**: assess legal swaps that could create stage 3, 4, or 5 at actual fusion destination locations. Landing is assessed for both player swap directions, as in Fusion Destination Control 1.0.
- **Follow-up possibilities**, not guarantees: a stage-3 or stage-4 result has additional strategic value only if compatible same-family treasures remain nearby on an unobstructed path. This does not simulate refills, guarantee a future fusion, predict a win or secretly alter any stages.
- **Actual first-ring Pulse opportunity** for a legal stage-five fusion, excluding consumed/fixed cells; deeper Pulse chains are intentionally not promised.
- **Several distinct evolution routes** with bounded rewards for strategic diversity rather than only counting trivial match-3 moves.
- **Goal-specific restraint**: Pulse/Masterpiece missions value stage-growth reachability; Lotus missions prioritize genuine moves that clear pieces in seed lanes, and do **not** sacrifice collection mobility merely for improved stage-four aesthetics.

### Honest, bounded refill choice
The existing candidate process remains: generate genuine stage-one refills from exactly the normal object-family bag and game seed, preserve baseline natural cascades, disallow artificial free auto-matches, and compare only alternatives that already exist. In a healthy board, reject candidates that noticeably reduce mobility just to improve speculative reachability. In near-deadlock, protect real legal swaps first. During objective drought, slightly increase the weight of already-existing development paths rather than injecting a solved objective.

The regular shuffle remains a technical **last resort only when no legal move exists**. Director 6.1 uses the improved identity-preserving >=4-legal-choice shuffle evaluation of 6.0 but does not force an unwarranted rearrangement.

### Debugging and replay
Refill reports for v61 now include `reachability`, `routes`, `strategicMoves`, `channels`, `supportedChannels`, and the full `spatial.before/after` assessment. Existing v6 and v4 logs are not retroactively changed. Save/restore of v61 preserves exact gameplay outcomes.

## Verification and limitations
- New regression: `tests/harmony-director-v61.test.cjs`, checking unchanged level-54 opening, pure read-only assessment, viable channel counts, investment reachability, rejection of artificial cascades, movement and progression contracts, deterministic saves, plus v3/v4/v6 compatibility.
- Existing v6, Bamboo, Lotus, Wind and Mechanic Balance suites remain passing during the implementation.
- New benchmark: `tools/harmony-director-v61-benchmark.cjs` compares **the same seeded legal-move selection policy** across v6/v61 on Gate of Echoes, Central Shrine, Garden Lotus Crossing, Moonlit Mist and Crossing Winds; CI saves per-seed results.
- **Preliminary small sample before final Lotus goal calibration:** 3 seeds × 14 moves on Gate of Echoes: v6 had **2 shuffles**, v61 had **1**, and v61 earned **3 total target hits** versus zero for v6 under the same naive move-selection policy. However low-choice turns were **8 vs 9**, and Lotus showed three more low-choice turns with no deliveries. The Lotus objective was subsequently reweighted. These numbers are exploratory, not a victory guarantee or a robust statistical finding.
- A human mobile playtest and verified GitHub Actions run are still required. The new assessment is more computation-intensive than 6.0; profile animation responsiveness on lower-powered Android devices before extending it to all levels.

## Recommended next pass
**Director 6.2 – Multi-Turn Intent & Performance Audit:** analyze genuine exported round outcomes and identify goal-aware choices with several turns of horizon *without* giving the player a forced solution. Prioritize benchmark and real-game responsiveness, and reconsider a brittle stage-five objective only if meaningful reachable paths remain scarce.

**Separate pending playtest observations remain unchanged:** the Hanabi/firework-delivery concept with collectors under the board, and Wind Garden continuous animation on all wind rows.
