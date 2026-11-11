# Chroma Clash 1.4 — Rendering Flow Recovery

Date: 2026-11-11

## Evidence: regression was NOT limited to color changes

The user's second real-device run audit, \`chroma-clash-zone-03-run-audit.json\`, identifies a severe continuing frame pacing problem:

- 23.067 seconds of **simulated** match time, 491 rendered frames: about 21.3 rendered frames per simulated second (not necessarily an accurate real-time FPS measurement).
- **438/491 frame intervals >50 ms (89.2%)**, **316/491 >100 ms (64.4%)**, worst interval 249.9 ms.
- Worst per-frame synchronous Canvas render time measured 55.3 ms.
- The 1.3.1 automatic chroma wave downgrade fired at exactly **10.125 seconds**, yet the game remained extremely slow. This strongly indicates a baseline render/compositor issue, not just the 1.55s transition.
- 92 physics contacts, one genuine KO at 23.067s; the game was still running even when the visual flow was unusable.

These metrics do NOT prove which exact Canvas operation bottlenecked the handset's GPU: asynchronous GPU and CSS compositor delays are not measured by synchronous \`performance.now()\` render timings. However, code inspection found the entire background plus platform painted from scratch on **EVERY FRAME**, using a full-screen radial gradient, large canvas filter blur, grid lines, glowing border, individual glowing cube gradients and per-frame impact shadow blur. It also allocated a 2× device pixel ratio backing canvas on phones. These are credible, substantial performance risks and are removed from the steady-state rendering loop below.

## 1.4 architecture changes

1. **Static cached world raster**: Two 960×540 offscreen Canvas layers store the complete background and rounded-square arena geometry for the current zone/stage. Rebuild only when stage, color or platform half-size changes. Normal frames perform a single image blit, not a complete world repaint.
2. **Four-corner wave still exists**: At ten-second transitions, the old cached stage image is drawn, the new pre-rendered image is revealed within one spatial four-corner clip, and two translucent outlines travel towards the center. No full-screen blur shaders. Static scene caches replace the prior 'cached old + LIVE full world' approach.
3. **Cube sprite caching**: Four 72×72 sprite textures rasterized once, then transformed via light Canvas drawImage to preserve squash/stretch, impact movement and color identities. Previously four gradient+shadow cubes were rasterized each frame.
4. **Simple hit visual**: No per-frame Canvas shadow blur or 'screen' composite. Keep a readable expanding ring and eight impulse rays.
5. **Cap mobile canvas memory/fill-rate**: internal backing pixels limited to 750,000, regardless of \`devicePixelRatio\`. The game remains proportionally scaled inside the CSS viewport; HTML HUD and joystick retain native device clarity.
6. **Frame-quality safety net**: Persistent >65ms frame intervals trigger staged resolution reductions to 80% then 55% of the initial resolution, **even when there is no color transition**. Isolated slow color transitions can still disable only their decorative wave if >75ms for four frames. Color zone/speed/gameplay continue; no new jump/dash control.
7. **HUD writes only on actual text changes**, avoiding multiple unnecessary DOM mutations every rendering frame. Physics, responsive joystick and AI/knockback rules remain unchanged.
8. **Run audit**: build set to \`chroma-clash-1.4-rendering-flow\`. Now records \`qualityDrops\`, per-run \`sceneBuilds\`, and \`basePixelBudget\` in addition to previous interval statistics and fallback events. Continues logging collision strengths, zone events and run outcome.

The original runner and other mini games were not modified.

## Automated QA / limitations

- Existing ~600 Node tests still verify physics, AI, zone times, falling edges and audit integrity.
- Updated 1.4 regression suite verifies offscreen cache compositing, unchanged impact physics, responsive joystick and cache busting.
- Extended Playwright smoke in 960×540 desktop, 812×375 phone, and 1400×700 high-DPR phone; verifies the backing canvas never exceeds the 750k pixel budget. Includes actual joystick drag, run log download, pause/resume and first zone switch.
- Visual capture confirms all four corners recolor before the center, with a cube remaining visible at the moment of transition. Stress renders 35 wave frames and 120 steady-state frames using the real in-app world renderer.

**Important**: Passing desktop/headless browser tests does not guarantee 60 FPS on a real phone. The next real-device 1.4 run audit should be checked for slow-frame fraction, quality adaptation events, and whether the pre-rendered corner tide has Rush-like responsiveness. If slow frame intervals remain widespread even at the lowest output resolution, investigate browser/GPU-specific compositing and compare against the runner under identical tabs/graphics conditions rather than layering more Canvas effects.
