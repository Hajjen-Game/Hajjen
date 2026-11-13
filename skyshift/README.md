# SKYSHIFT 0.3 – Track Identity & Premium Flight Feel

First Flight 2.0 is a rebuilt, finite browser-based 3D arcade trial. Endless remains postponed until the short course feels good.

## Play
https://hajjen-game.github.io/Hajjen/skyshift/

- On mobile: landscape, drag STEER with the left thumb, press JUMP on the right. Fullscreen is available in the menu and during play.
- On desktop: A/D or arrows to steer, Space to jump, P/Escape to pause.
- Clear a roughly one-minute, 1300-metre authored course, including six mandatory gaps.
- Sky Islands require lateral navigation in mid-air: the first island is left, the second is right.
- At Split Horizon the left route is safe; the right is narrow and has two extra gaps, rewarding a 500-point style bonus if cleanly traversed.
- Final Velocity climbs to a raised route, followed by a final jump and finish gate.
- Crashes cost 35 shield. A checkpoint restarts the section. Export a run log from the results screen.

## Architecture
- trial-v03.mjs: authored path heading/height/width, geometry masks, six jumping gaps, split-route risk, checkpoints, deterministic flight physics, style event.
- trial-v03.test.mjs: track continuity, no-jump failures, viable jumping, distinct island landings, optional risk route, finishes.
- game-v03.mjs: Three.js renderer, visual platform edges, section landmarks, HUD, telemetry, controls and camera.
- premium-v03.mjs: two short engine streaks, non-circular landing impact shards and ship motion feedback.
- index.html and style-v03.css: active version 0.3 game and UI.
- The v02 modules remain as historical comparison and are not loaded by the current page.

## Testing
Run: node --test skyshift/trial-v03.test.mjs
Syntax: node --check skyshift/game-v03.mjs
GitHub Actions runs both v02 regression checks and v03 tests.

## Limitations
One authored course, not a full track selection yet. The 3D physics and collision are arcade approximations, not a production suspension model. No advanced Director, sound or weapons. WebGL performance and how the jumps and camera feel on a real phone still require playtesting. Three.js is loaded from a version-pinned CDN.

Other projects in this repository are unaffected.