# Lotus Stream — Hint Reliability 1.0
31 October 2026 · player screenshot with 32 moves remaining, 0 / 2 Lotus seeds delivered

## Observed symptom
A tester could not see a possible swap and did not receive the expected helper highlight on an experimental Lotus board (the Garden Lotus Crossing layout with two closed cells). The screenshot has *at least one legitimate match-making swap*: exchange the small bonsai in **row 3, column 6** with the origami paper directly below in **row 4, column 6**. That completes three origami objects in column 6. Different stages of the same object family still match.

## Root cause in the interface
The existing 30-second guided hint was scheduled correctly at game start but **restarted on every tile pointerdown, every ordinary click, every selection tap and every invalid swap**. A user searching around the board by tapping different objects could inadvertently postpone hints indefinitely. There was also no direct 'show a legal move' control inside the Goal (?) help dialog: it only described the objective.

The engine's `validSwaps` and `bestHint` produce legitimate moves for Lotus prototypes in tested seed sequences; the screenshot shows a move, so this was **not** a proven no-move game-engine deadlock.

## Corrected behavior
- **30 seconds since last successful decision** produces normal gold source + mint target highlighted tiles. Invalid taps and nonmatching swaps no longer reset the countdown. Hints never choose, swap or move pieces.
- For Lotus, when the passive hint appears, a short message says 'Possible move: gold tile → mint tile.' The on-board two-tile glows remain the primary affordance.
- In the existing Goal (?) modal, a clearly labeled **Show a possible move** control now reveals a genuinely legal hint **immediately**, closes the modal and highlights the two tiles on the real board. Works without an Omamori card, move deduction, score change or reward.
- If the score-based hint simulator has an unexpected error, the app falls back to the first **actual** legal swap returned by `R.validSwaps` and `R.directedHint`; it never constructs an impossible suggestion.
- Opening/closing an unrelated dialog still correctly re-arms hints. Clicking 'Show a possible move' itself must NOT clear the just-revealed highlights.
- No changes to Lotus routing, objective, progression, any player's saved run, Wind Garden, Moon Mirrors or previously discussed Hanabi/fireworks concept.

## Verification
- `harmony-lotus-hint-browser.mjs` drives the actual UI at a 390px mobile viewport. The browser test fast-forwards the 30s timer and repeatedly taps nonproductive tiles, then asserts that idle source/target glows appear, that they represent a genuine legal pair, that Goal (?) can reveal a pair on demand, and that the original saved run and moves are unchanged.
- The test is registered in `.github/workflows/daisugi-bloom-tests.yml`. A successful CI browser run still needs verification; an Android playtest should inspect glow contrast on the painted Lotus board.

## Playtest
In **Game Settings → Lotus Stream · Preview → Garden Lotus Crossing** (or another Lotus route), try waiting 30 seconds after the last successful move, *or* tap **?** in the GOAL panel and select **Show a possible move**. Yellow/gold is the piece to move; mint is where it should be moved. These are hints, not automatic solutions.
