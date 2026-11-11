# Neon Circuit 1.0 — Chroma Rush racing minigame

2026-11-11

## Identity
Neon Circuit is a distinct **racing** minigame, not a remix of Neon Trails. Following the earlier Roller Ruckus-inspired design discussion, four colored glass cubes compete on a continuous winding course with fast straights, S-bends, overtakes, bumps and braking. One three-lap race establishes the foundation for future Arcade Cup, Endless, Challenges and Mini Games selection. Cup progression is not yet built.

## Rules
- Four racers, one human cyan plus three deterministic AI color-coded glass cubes. Three genuine clockwise laps of a closed Catmull-Rom course; nearest-road projection and continuous arc-distance progression disallow sideways shortcut laps.
- Left mobile joystick directs movement; BRAKE (hold, or Shift) reduces speed and increases steering response. DASH (tap, or Space) provides a short 0.34s sprint, 5.4s cooldown. Acceleration is otherwise automatic.
- A 2.4-second countdown provides a nonlethal starting phase. Track borders reduce momentum and return racers to the road, rather than immediately eliminating them. Rival contacts produce meaningful but nonlethal bumps.
- Flow rewards close racing line by up to 7.5% bonus speed. Dynamic AI aims ahead along the path and brakes for tighter bends.
- Every ten seconds the real shared Rush colors change in a center-out Chroma Pulse, and the base speed increases (118 upward to capped 187 units/s). Players and AI share the same terrain and speed-zone rules.

## Presentation and performance
- Shared Rush chromatic palettes, glass cube material and center-out transition.
- One full-width panoramic cached raster track per zone. Track has luminous guardrails, a continuous dark glass roadway, sparse center markings and a checkered start/finish line. No copied Fuzion Frenzy art.
- Screen backing budget 750,000 pixels, adaptive quality fallback and cached racer sprites; only four moving cubes and tiny rear wakes are rendered each normal frame.
- Landscape page with joystick + BRAKE + DASH controls, centered Zone header, left Lap/Line Flow, right place and timer, pause, fullscreen, results and locally exported JSON Run Log.
- Run log captures zone, lap times, finishing position, rival encounters, corner/edge penalties, Dash uses, Brake seconds, best Line Flow and frame timing. No uploaded telemetry.

## Neon Trails evidence informing the decision
The three uploaded Neon Trails 1.1 runs lasted 7.467, 14.033 and 14.700 seconds, mean 12.067s, compared with 9.846s across four earlier 1.0 runs (+22.6%). All three were wins; two reached Zone 2; all opponents eliminated before Zone 3. One very early double AI elimination at 4.767s indicates a likely AI survival issue, not just trail length. Logs show actual wall bounces and no slow frames >50ms. Keep current Trails balance for now and tune AI survival separately after the new racing concept is playtested.

## QA
Deterministic physics/geometry tests (spline closure, lap integrity and anti-shortcuts, AI, Dash/Brake, nonfatal track edge, 10s zone, run log) plus 960×540, 812×375 and 1400×700 Chromium browser tests (mobile touch controls, fullscreen, render density/pixel coverage, JSON export and page errors). Keep previous Runner, Clash, Trails regressions passing.

## First playtest
Prioritize corner feel, visibility of racing line, clarity of braking and overtakes, race duration, actual AI competitiveness and real-device frame timing. Do not conclude that browser CI alone verifies the phone feel.

After merge: https://hajjen-game.github.io/Hajjen/chroma-rush/neon-circuit.html
