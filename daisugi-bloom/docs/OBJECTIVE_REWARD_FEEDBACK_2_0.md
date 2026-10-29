# Objective & Reward Feedback 2.0 — Japanese Harmony

## What changed

**In play (no extra HUD row):**
- Objective progress still comes from the exact game snapshots and the actual goal.
- The existing GOAL help button shows remaining Mist tiles, unfinished Daruma eyes, remaining Sealed Stone hits, or another goal-specific count.
- After a move with real progress, a single short, accessible message summarizes it (for example `Mist cleared +2 · 7/15`).
- Each actual Daruma or Sealed Stone hit can show a brief Washi-style label at the blocker (`1/2 EYES`, `3/4 HITS`, `COMPLETE`, `BROKEN`). Only real event hit data is used.
- The special labels obey motion-reduction preferences, appear in the existing pointer-free FX overlay, never block touches and never interrupt the game engine. Cascades do not generate multiple spoken toasts.

**At the end of a level:**
- A failed run shows objective progress and actionable remaining-hit information, not only the score.
- An Omamori-assisted victory retains the performance stars as a **PRACTICE RATING · NOT A STAMP**. It is visually muted, and its accessible label clearly says those stars are not archived.
- A normal victory is labeled **GOSHUINCHO STAR RATING**. Actual stamps, earned coins and normal records remain exclusively unassisted. Assisted wins can still unlock the next level.
- A completed chapter now explicitly identifies its seal as part of Goshuincho. No new currency or bonus effect is given.
- The previously misleading `BONUS SCORE` counter is renamed `SCORE` (with the existing Japanese 得点 accent) because it represents the full score, not bonus-only points.

## Invariants

- **No changes to** the 7×7 rules, tile families, move budgets, level difficulty, Directors, objective calculation, stars thresholds, Omamori consumption, economy, saves, RNG, rewards or unlock conditions.
- All feedback is derived from read-only snapshots of the current game and existing event fields.
- Feedback module exposes `detail`, `eventLabels`, `summary` and `rewardLabel`; it does not write game state.
- Existing paper panels, backgrounds, Goshuincho level-card placement and game board size are untouched.
- Multi-hit outcomes are compact and only the first hit per event is read for the toast; individual visual hit markers may display up to two blockers per event on mobile.

## QA

- `tests/harmony-objective-feedback.test.cjs` verifies two-hit Daruma, four-hit Sealed Stone labels, event-goal progress, reduced-motion CSS contracts, assisted reward messaging, and immutable snapshots.
- The mobile browser-smoke suite now checks that remaining progress is available via the existing GOAL help and screen-reader text, and expects the accurate `SCORE` label.
- GitHub Actions runs the new test and syntax-checks the new module.
- Real device visual and performance testing is still required before signing off the pass.
