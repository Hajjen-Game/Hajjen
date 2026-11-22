# SKYSHIFT 0.13.5 — Handling & Track Fairness Audit

This is a **measurement-only** gameplay release; 0.13.4.8 steering/track, ship handling, and rendering remain unchanged. A deterministic test suite checks every authored turn against available maximum yaw across zones 0, 4, 6, 7, 8, with/without the worst-case ×1.4 boost. It also runs a constrained, external, scripted 120Hz steering controller in five important corners at zones 0, 4, 8, both ordinary steering and GRIP.

### Design boundaries
- The solver samples the real `curvatureAt`, `widthAt`, `yawAuthorityAt`, and `stepFlight`, not a simplified replacement track
- An idealized driver is a diagnostic, **not** proof a human can do it
- Worst-case boosted zone 8 is intentionally an envelope stress case, not guaranteed to coincide with that curve during a real run
- Cases with available yaw below centerline demand are *reported* rather than quietly changing the player's control
- Medals/challenges in 0.14.0 should NOT demand impossible boosted corner situations
- Racing ghosts require a physics ruleset revision in a future Time Trial fairness pass

### Validate
`node --test skyshift/handling-fairness-v0135.test.mjs`
`node skyshift/handling-fairness-cli-v0135.mjs` (generates report JSON and prints summary)

**Play (no gameplay differences yet):** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.5

## Measured CI results
7 distinct authored turn sections, 70 zone/boost feasibility envelopes; 16 centerline-yaw deficits. The 30 deterministic idealized-drive traces achieved 19 no-rail exits. Worst simulated centerline yaw margin is 0.552 at precision apex, zone 8 ×1.4 boost. These are *stress envelopes*; they are not automatically attainable together in a normal three-lap race. All 95 node tests passed at this stage.
