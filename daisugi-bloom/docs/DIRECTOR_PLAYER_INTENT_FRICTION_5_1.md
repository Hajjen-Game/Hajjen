# Harmony Director 5.1 – Player Intent & Friction Awareness
31 October 2026 · Local, passive foundation

## Scope

Director 5.1 is an **observation and audit layer**, not a new adaptive difficulty
policy and not a commercial engagement algorithm. It introduces no separate
test mode. Normal play and the player's Goshuincho history remain intact.

The system distinguishes two *independent* questions:

1. **Observable intent evidence**: Is the player replaying previously
   completed levels, genuinely improving Goshuincho stars, creating large
   fusion chains, or simply progressing through new levels?
2. **Observable round friction**: Did the round contain several independent
   signs of trouble, such as rejected swaps, an extended run of moves without
   objective progress, or repeated Director objective drought?

These are **not psychological diagnoses**. A player spending time on a
move could be thinking, enjoying the puzzle, distracted or using assistive
technology. Inactivity, slow decision times and late-night play are
**never used** to infer frustration.

## How it works

Module `harmony/player-intent.js` exports pure and local functions:

- `analyzeRound(game, trace, previousStars)` evaluates genuine
  per-move traces and original level-start stars. It returns signals and
  uncertainty without reading the wallet, purchases or device identifiers.
- `observeRound(save, game, trace, previousStars)` records one bounded
  summary **once per finished round**, including real losses and wins.
  Unfinished rounds and retries following a Moon rescue are not falsely
  counted. Repeated appearances of the same results dialog cannot inflate
  counters.
- `aggregate(save)` requires multiple completed rounds before it even
  offers a *tentative* preference hypothesis, and only repeated flagged
  rounds can create a `recurring-round-obstacles` trend.
- `report(save,game,trace)` adds a transparent per-round diagnostic section
  to the existing voluntary `Export round · JSON` file. The actual
  previously earned stars are retained, so a three-star **first clear**
  cannot masquerade as three-star optimization.

## Conservative thresholds

A round is marked for review (`friction.classification="watch"`) only
if at least four real legal moves have been recorded, with:

- Two or more independent positive signals, or
- One positive signal **plus an actual failed round**.

Potential independent signals:
- At least three rejected swaps in a round with four or more legal moves.
- At least five consecutive legal moves without goal progress.
- At least three logged Director frames with objective drought of four
  or more.

Failure alone is insufficient. An isolated slow choice, a single rejected
swap or a large deliberate combo without immediate objective progress
is insufficient by itself. Report language always describes **difficulty
indicators in the round**, never the player's emotional state.

These thresholds are provisional hypotheses to test against human play,
not measured psychological truths. A `partial` save explicitly lowers
confidence.

## Aggregate confidence and safeguards

- Fewer than five observed finished rounds: `insufficient`.
- Five to eleven finished rounds: `early`.
- Twelve or more: `moderate`, never definitive.
- `possible-star-improvement-interest` requires at least eight observed
  rounds, at least three completed replays and two actual improved star
  records; `possible-combination-interest` requires repeated long chains.
- Repeated round friction needs at least five completed rounds, three of
  which must independently meet `watch` requirements.
- Local storage holds only counters and the last 30 compact round summaries.
  There is no personal identity, payment history or purchase propensity.
- **No effect on gravity, random seeds, refills, Omamori strength, prompts,
  shop offers, stars, coins, move count, difficulty or objectives.**
  `personalizationActive:false`, `affectsDifficulty:false` and
  `affectsOmamori:false` are explicit contract fields.

## User-visible operation

Complete a level and use the quiet **Export round · JSON** link beneath
the result. For particularly important failed attempts, the same optional
link now appears in the **Try Again** dialog.

Reports include the existing detailed 5.0 move and refill log, plus
`intentAwareness.round` (specific observations) and
`intentAwareness.profile` (cautious multi-round signals).

Nothing is uploaded in the background. If the player attaches the file to
a chat, it can be reviewed alongside their own account of the experience.

## Tests

- `tests/harmony-player-intent.test.cjs`: ambiguous slow choices,
  first failures, multi-signal gating, real replays and first clears,
  duplicate-result suppression, bounded history, tentative multi-round
  evidence, correct prior-star context in the JSON report, and unchanged
  gameplay rules.
- `tests/harmony-browser-smoke.mjs`: victory report contains the new
  observational section, with no difficulty or Omamori adjustment.
- All previous Director 5.0 and game-rule regression tests remain active.

The next design decision should follow review of human game reports.
Do not activate personalized rewards or automatically offer paid Omamori
because an observed round contains `watch` signals.
