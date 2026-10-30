# Omamori Afterglow 1.0 — restrained Director momentum
30 October 2026

## Design intention
After a player **successfully consumes** an Omamori card, give the next
**two valid match decisions** a small positive opportunity bias inside
Harmony Director 4.0. The card already provides its stated power; this
secondary effect should feel like more natural follow-up options, not a
second paid reward and not an automatic win.

## Rules and safeguards
- The normal one-use card must first **succeed and be consumed** by
  `commitActivePower`. Opening cards, selecting targets, cancelling, using
  an invalid target, or looking at the shop cannot trigger Afterglow.
- One activation **per level attempt**. More cards do not refresh, stack,
  lengthen or strengthen the window.
- Afterglow is active for **two valid swaps**, with a larger influence on
  the first and a smaller one on the second. Invalid swaps do not count.
- Only the **first eligible refill per swap** can be influenced; a cascade
  cannot repeatedly reapply the bonus. Other refills are ordinary.
- Director only compares the **same existing normal-stage-one bag
  candidates** as before. The effect does not increase candidate count.
- No invented legal match, direct stage upgrade, guaranteed cascade, free
  extra moves, drop-rate alteration, Harmony Coin reward or star adjustment.
- Candidate zero is still the normal seeded baseline. Alternatives that
  create a free match when baseline had none remain disallowed.
- An additional score based on already-legal, meaningful swaps and
  prospects is capped at **1.6 Director points**. The refill threshold
  reduction is capped at 0.4 points and cannot cross the 1.75 minimum for
  Director 4.0. Other Director versions are unchanged.
- Moon rescue cards can activate the same non-stacking Afterglow for the
  next two moves, but do not bypass the level objective.
- No new notices or UI noise: the effect is intentionally subtle.

## Compatibility
- The timer and one-time-used flag are saved with the current round. A
  reload between the two boosted decisions continues correctly.
- Old saves with no Afterglow state normalize to a clean inactive state.
- Default state has zero influence. Levels 1–100, difficulty, economy and
  existing active saves are not reset.
- Users selecting non-Director-4 modes receive no hidden alternate
  tuning.

## Diagnostic fairness
A small seed-paired check used 12 identical level-22 game starts and the
same two real swaps after using a Bloom Touch card. The resulting board
differed once in 12 pairs. Zero pairs gained an automatic victory. This
is **not** a player-experience or win-rate estimate. The calibrated
intensity should be reassessed from human feedback after Omamori becomes
relevant to harder levels.

## Automated test coverage
`harmony-omamori-afterglow.test.cjs` checks one-time activation,
window depletion on legal swaps, invalid swaps, reload persistence,
Moon rescue, no effect in older Director modes, no direct free
stage/coin/turn creation and ordinary refill baseline preservation.
CI runs the test alongside existing Harmony rules and mobile smoke.

## Future adjustment
Once the player has used real cards on challenging levels, review whether
this subtle extra opportunity is perceptible, too weak, or too strong.
Do not increase influence merely to drive Omamori spending.
