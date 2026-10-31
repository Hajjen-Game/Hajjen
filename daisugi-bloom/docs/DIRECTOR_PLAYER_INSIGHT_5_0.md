# Harmony Director 5.0 – Player Insight Foundation
31 October 2026

## Goal
Understand how the player enjoys Japanese Harmony without adding a test mode,
selling-pressure logic or silently changing level difficulty. Capture exact
rounds for user-requested analysis via a **quiet, optional “Export round · JSON”**
link below the victory details.

## What the new link exports
A single local JSON download named `japanese-harmony-level-NNN-round.json`.
It contains:
- Level/goal/seed/Director mode and completion result.
- Initial 7×7 state, complete state before and after each valid swap, numbered
  source/destination indices, decision latency (bounded to 90 seconds).
- Separate list of rejected swaps and reasons, without charging a move.
- Actual resolution events: fusion, echo, pulse, Mist / Daruma / Sealed
  Stone effects, Lotus delivery, cascades, shuffles and score deltas.
- For **each actual Director refill**: refill phase, drought, candidate count,
  seed-roll position, baseline match preservation, each evaluated candidate's
  score and ordinary move opportunities, applied selection threshold, chosen
  candidate and decision rationale, plus Afterglow influence.
- Consumed Omamori card identity, state before and after its effect,
  and active Afterglow turns.
- Local aggregated player signals from the current Goshuincho and finished
  rounds, explicitly tagged as **not personalizing gameplay yet**.

The file contains **no account identifiers, device identifiers, coin balance,
transaction history, emails or personal details**. It is created only on click
and is never uploaded by the game. The player can attach it to a conversation
for detailed review.

## Data correctness
The telemetry is captured inside the engine's real `Game.swap` and
`refillOpportunity`, not reconstructed afterward from score totals.
Internal `bestHint` simulations are read-only and **do not** add imaginary
moves or refills. Reports travel with the normal active-round save so an
unfinished round can be resumed without losing its history. Older saves
without telemetry start a report labelled `partial`, rather than inventing
past turns. Reports are bounded to 160 valid moves, 80 rejected swaps,
12 card activations and 14 refill records per turn, with truncation signalled
where necessary. No separate developer test mode is needed.

## Player Insight: local passive evidence only
The player profile stores small aggregate counters for:
- Completed distinct levels and completed replays, including replays of archive levels that predate Player Insight.
- **Real** star improvements: replaying a previously completed level and earning more stars. A first completion, even with three stars, is **not** evidence of perfectionism.
- Big fusion chains (5+), Masterpieces and fusion counts.
- Omamori-assisted clears.

Because this is a completion-based journal, **Goshuincho stamps do not establish a collecting preference**. Completion and true score improvement are separate signals. There is no persistent Masterpiece collection in the current game; Omamori are consumable cards. An older v1 counter that accidentally counted first clears as star improvements is retired without affecting levels or saved star records.

It avoids guessing personality or purchase propensity. Confidence remains
`insufficient` before five logged rounds. The report exposes objective
signals, labels intent as `undetermined`, and leaves
`personalizationActive:false`. A future Director 5.x pass may only make
fairness-preserving, understandable adjustments after real player evidence.
No mechanic increases frustration or manipulates paid-card demand.

## Changes and exclusions
- Modules: `harmony/player-insight.js` and `harmony/player-insight.css`.
- Engine: `harmony/rules.js` instruments real games and decisions without
  influencing the choice of refill or changing the score model.
- UI: `harmony/app.js` adds the voluntary win-screen link and small
  local aggregate updates after finished rounds.
- Persistence: `harmony/save-health.js` validates optional telemetry while
  keeping old saved runs valid.
- No change to level 1–100 layouts, objectives, moves, star thresholds,
  Omamori prices or card strengths. Saves and Goshuincho stamps are not reset.

## QA
`tests/harmony-player-insight.test.cjs` verifies actual decisions, boards,
events, failed swaps, save/resume, simulated hint non-mutation, Omamori and
Afterglow tracking, optional export schema, archive-based signals and bounded
storage. The existing mobile-browser smoke now checks a generated file from
a **real victory modal** and asserts that it contains a genuine move and
Director refill selection.

## How to use
Complete any level → on the victory result scroll within the small result
area if needed → tap **Export round · JSON** → choose to save the JSON file
→ attach it here. Files are created on the user's device, not stored by the
game on a server.
