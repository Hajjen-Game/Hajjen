# Daruma Awakening 1.0 — Lucky Bounce (visual implementation)

## Scope
This change animates the **existing** Daruma obstacle in Japanese Harmony. It does **not** generate, replace or modify any artwork. All three eye stages still use `assets/daruma-states-20261103.webp`.

## In-game sequence
1. First hit: original one-eye atlas frame is rendered; the doll makes a short, subtle wobble (~245 ms).
2. Second hit: original two-eye atlas frame is rendered. The doll anticipates, rocks, briefly jumps and settles (~570 ms). A lightweight golden ring, four tiny CSS petals/glints and a gentle, warm chime confirm completion.
3. Release: the now-complete original sprite contracts/fades (~245 ms) before its cell is cleared on screen; a gold ripple finishes above the freed cell. Actual gravity/refill is handled by the unchanged game event order.

## Technical boundaries
- Only the event renderer in `harmony/app.js`, associated CSS and the existing WebAudio cue engine change.
- All motion runs through the existing `animateNode` Web Animations helper. Decorative nodes clean themselves up after their animation.
- The existing fixed screen-space `score-fx-overlay` places effects outside tile clipping; no canvas, audio files, generated PNGs or sprite sheets added.
- Sound respects `save.sound`; animations obey the game's reduced-motion preference and `prefers-reduced-motion`.
- No edits to `rules.js`, goal tracking, move limits, Director, saves, levels or other treasure families.

## QA to verify on mobile
- Level 21, first hit: blank → one black eye, short wobble only; no completion burst.
- Second distinct turn: one → both black eyes. The fully completed Daruma must remain visible during bounce, then fade before the square empties.
- Multiple Daruma in one move: independent effects, correct per-object completion, no duplicates.
- Finish via adjacent fusion, Harmony Pulse or mirror resonance.
- Disable animations: state, completion and gravity still progress instantly. Disable sound separately: no audio.
- No remaining temporary particle nodes, no blocked input, no yellow flash covering another tile.
