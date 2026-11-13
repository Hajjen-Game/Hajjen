# SKYSHIFT 0.2 – Flight, Camera & Handcrafted Track Foundation

A standalone 3D browser arcade prototype and the first finite SKY TRIAL.

## Play
[First Flight on GitHub Pages](https://hajjen-game.github.io/Hajjen/skyshift/) · landscape orientation recommended on mobile.

- Desktop: **A / D** or **left / right arrow** to steer; **Space** to jump; **P / Escape** to pause.
- Mobile: drag the horizontal steering control with your left thumb and tap / hold **JUMP** with your right.
- **Fullscreen:** press START TRIAL to request fullscreen automatically, or use the ⛶ FULLSCREEN button on the menu and the top-right toggle during play. Tap again to exit.
- Embedded or in-app browsers can block fullscreen; if the browser refuses the request, open SKYSHIFT directly in Chrome using its browser menu. Landscape lock is attempted when supported, but gameplay is not blocked if it fails.
- Reach the **finish gate** on the short, manually laid-out course. There are **four genuine missing-road gaps** that cannot be safely crossed by simply continuing forward.
- Explore a split-lane bridge and deliberate gentle curves. Clear the course for a personal-best time.
- Shield: a failed jump or fall costs **35%**, with checkpoint recovery. Three falls end the attempt.

## Changes from 0.1
- **Endless suspended**: fixed, repeatable First Flight course instead of constantly randomized bends.
- **Camera**: anchored primarily to the course direction with look-ahead; a fraction of player offset affects framing rather than always re-centering the ship.
- **Physics**: descent must cross a deck from above to count as a landing; it is not possible to snap onto it from below after coasting across a gap.
- **Tracks**: authored straights, designed curves, height profiles, four jumps and a split-lane section.
- **Feedback**: approach markings, in-world beacons, sector gates, jump cues, result screen and a detailed telemetry export.

## Code
- \`trial-v02.mjs\`: authored finite trial and deterministic physics model.
- \`trial-v02.test.mjs\`: gap, continuity, actual jump necessity, camera coordinates and finish tests.
- \`game-v02.mjs\`: Three.js track rendering, scenery, ship, camera, inputs, HUD, logs.
- \`style-v02.css\`: trial-specific style adjustments.
- \`index.html\`: active entry point for 0.2.
- \`game.mjs\`, \`track.mjs\`, \`track.test.mjs\`: the previous 0.1 implementation retained as a reference, not loaded by the current page.

Three.js is loaded from a pinned CDN URL. GitHub Pages can serve the project directly without building.

## Verification
Run \`node --test skyshift/trial-v02.test.mjs skyshift/track.test.mjs\`.
\`node --check skyshift/game-v02.mjs\` verifies parse syntax, not runtime rendering.

**Prototype, not finished:** no advanced AI Director or endless mode. Visuals, camera feel, touch comfort, jump timings and real mobile frame pacing still require player testing. The mathematical tests ensure correct collision geometry and that no-jump traversal fails; they cannot substitute for human playtesting.

Other games in the monorepo are unaffected.

## Fullscreen implementation (0.2.1)
- `fullscreen-v02.mjs`: Fullscreen API adapter with user-gesture entry, exit, state synchronization, optional mobile landscape lock and actionable fallback.
- `fullscreen-v02.test.mjs`: Mock browser tests for entry/exit, blocked in-app contexts and unsupported browsers.
- `game-v02.mjs`: fullscreen buttons and responsive renderer resize.
