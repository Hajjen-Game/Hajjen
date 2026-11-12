# Neon Circuit 2.0 — World Track & Follow Camera

Date: 2026-11-12

## Why this rebuild

Versions 1.0–1.3 squeezed the entire three-lap circuit into a 960×540 arena. Even at full width, the course looked like a deformed oval rather than a road. The user explicitly wants a much larger course with a camera that follows the cyan cube, like a real top-down mobile racing game. This release intentionally builds **one full world course**, not three tiny variations, to validate that foundation first.

## Physical world and race

Spectral Highway is approximately 1,900×970 world units in footprint, with a continuous route of about 4,857 units. The course includes an ~960-unit opening straight, sweeping right and left sections, one S segment and a broad hairpin. Only the nearby part of the road appears on screen. All four racer positions, AI lookahead, road barriers, collision impacts, Dash, respawns and Track Tide use actual world coordinates, not display coordinates.

Physical lap integrity is preserved: start-line + quarter/half/three-quarter checkpoints, ordered and identical for player and AI, 13 validated passes for three completed laps. The longer route uses a Circuit-specific speed curve of 172 + 14 units/s per 10s zone, capped at 268, with a 165s maximum time to avoid prematurely ending slow but valid races.

## Follow camera

A separate pure module at src/gameplay/neon-circuit-camera.js implements an unrotated, north-up world follow camera, gentle exponential damping, a target ahead of the player in movement direction, speed-dependent zoom out, and quick recovery/snap after large position changes. Viewport zoom is normalized by height to avoid camera distortion on extra-wide landscape phones. Cubes remain square.

## Rendering & Track Tide

The former full-screen cached arena rendering is replaced by a bounded LRU of at most 36 transparent, padded 448-world-unit road tiles. Only currently visible route sections need to be rasterized. Dark background and world grid are neutral and rendered separately. Existing road-only Track Tide still recolors the road along the real racing direction in 1.45s, never the whole sky or surrounding world. Mobile canvas backing is capped at 750k pixels with adaptive resolution fallback.

## Gameplay and layout

The established four colored cube racers, joystick direction, Brake, Dash, impacts/knockouts, Line Flow, HUD, fullscreen, pause and locally downloadable JSON logs remain. AI speed is adjusted to remain competitive on the long route. There is deliberately only **one curated course** in this prototype; further routes and Arcade Cup wait for actual fun/playability feedback.

## QA

Node tests: multi-screen road extent, continuity, safe corners, physical lap gates and anti-shortcut protection, seeded AI, impact/respawn, color-zone movement and camera damping/lookahead/zoom. Chromium UI tests: 960×540, 812×375, 1400×700 high-DPR landscape with screenshots, actual moving world camera, bounded visible tile cache, Track Tide colored-road sample at a fixed world coordinate, touch joystick, Brake, Dash, pause, fullscreen and run-log export. All earlier Rush, Clash and Trails regressions must remain unaffected.

After publication: https://hajjen-game.github.io/Hajjen/chroma-rush/neon-circuit.html

Human mobile playtests remain necessary to assess steering feel, camera framing, AI difficulty, game duration and whether the larger course is more fun.
