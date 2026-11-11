# Chroma Clash 1.3.1 — Zone-2 Freeze / Canvas Performance Hotfix

Date: 2026-11-11

## Player report & evidence

On Android Chrome, Chroma Clash 1.3 lagged severely and appeared to freeze or crash during the first color change at **10 seconds**. The screenshot still shows a normally updated HUD (**ZONE 02 · 4 ALIVE · 0:10**) and empty-looking arena.

The uploaded local audit \`chroma-clash-zone-02-run-audit.json\` provides important constraints:
- Status \`in_progress\`, elapsed **10.008 s** and highest zone **2**.
- Four cubes alive; zero arena collapses or eliminations.
- 44 accepted collisions (31 strong; max recorded impulse 320) but **no match_end**.
- Final logged event is \`zone_change\` at 10.000 seconds. This rules out an intended end-of-round or collision-death explanation for the empty arena, but **does not by itself prove a JavaScript exception**.
- v1.3 had no frame-time diagnostics, so the file cannot prove an exact GPU/CPU stall duration.

A source inspection showed that the first 1.3 transition painted the complete world twice *each frame* and used two sets of four large glowing circular wavefronts plus nested even/odd clips and multiple full-screen gradients. This is unnecessarily expensive on mobile, and the first affected frame aligns with the reported freeze.

## Fix: low-cost, fail-soft four-corner tide

1. Introduce a **960×540 pre-rendered old-color scene cache**, allocated only at first color swap (~2 MB regardless of DPR).
2. On a zone transition, the visible canvas uses the old scene **as a single cached drawImage**, then performs **one live world render**, clipped to **one four-corner union**. No second backdrop pass, no second arena floor clip, no even-odd masking, and no full-screen radial pulse.
3. Redraw a clear safe-zone warning guide over the final composite, preserving the existing 3.2-second collapse warnings even while the old-color cache is displayed.
4. Limit the front's expensive glow radius from 22 to 6 pixels. Keep all four inward-moving fronts and true old/new palettes, and draw the cubes **after** the wave masks. If Canvas throws, turn off the transition and restore the current world instead of leaving an unfinished arena.
5. If 3 transition frames take over 65 ms, disable only the temporary wave effect for that match. Cubes, physics, speed progression, joystick, AI, collisions, color zones, and arena collapse continue working.
6. In sudden death after 81 seconds, skip the cached wave so the continuously shrinking floor is not rendered using stale geometry.
7. All Clash JS/CSS assets have a new \`1.3.1\` URL query to bypass existing mobile browser caches.

The original runner and other minigames are untouched.

## Improved local JSON Run Log

The run log now additionally reports:
\`performance.frames\`, \`slowFrames50ms\`, \`severeFrames100ms\`, \`worstFrameMs\`, \`worstRenderMs\`, \`rendererFallbacks\`, and \`adaptiveTideDisables\`. A specific \`graphics_fallback\` event is recorded when the renderer is automatically reduced. This diagnostic sampling is in-memory and local, no network telemetry.

## Validation

Automated checks require:
- Existing zone, joystick, impact physics and audit suites remain green.
- Real-browser screenshots at 0%, 55%, 100% color progress confirm four corners recolor before center.
- Actual game canvas has **visible player sprites at onset** of the first transition.
- 35 consecutive synthetic transition renders complete within a conservative CI performance budget.
- Real JSON run log still downloads from the pause screen.
- No uncaught browser errors in mobile or desktop emulation.

**Known limitation:** Headless CI/browser emulation is not a real low-end phone GPU. Testing on the specific affected phone still decides whether the fix removes the lag and whether 1.55 seconds is the right look. If a new slowdown happens, export a new 1.3.1 log (from Pause where possible); the added frame metrics are now diagnostic.
