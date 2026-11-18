# SKYSHIFT 0.16.0 — Aurora Run: Second Real Circuit

## Why
The player wants more distinct **actual tracks** and is unsure about SAFE/RISK strips. This release therefore preserves the original Skyline Circuit, including its five 0.15.1 SAFE/RISK decisions and eight Skyline Challenges, while introducing an entirely separate racing course without **any** SAFE/RISK or boost-pad lanes.

## Select a track
The main menu's **SELECT CIRCUIT** control now offers:
- **01 · SKYLINE CIRCUIT** — original 3,400m circuit, jump, narrow GRIP apex, wall, corkscrew, five risk/SAFE gates per lap, existing Skyline Challenges.
- **02 · AURORA RUN** — new 3,400m **closed original curve geometry**, two wide 180° switchbacks, alternating +40°/-40° and +45°/-45° S sweeps, long fast straights, rolling hills from −4m to +16m, subtle 7° physical banking and a distinct 270m Lumen Pass. **Zero boost pads, zero risk lines, zero hidden line magnets, zero forced jump/corkscrew/wall.**

Both support the familiar **3 laps, speed zones, steering/GRIP, ship choices, rail contact and ghost Time Trial**. Skyshift keeps the 0.13.4.8 GRIP balance for BOTH ships. The Aurora introduction has no hidden extra steering restrictions.

## True geometry, not a visual recolor
A shared track-selection registry drives **the same chosen track** through:
1. Race physics and world-to-track projection, analytic curvature, pose/elevation/bank, and rail collision widths.
2. The single indexed premium road PBR mesh and material coordinates.
3. 3D guardrails, road skirts, tunnel geometry/shader/light levels and environmental scene layout.
4. Authored speed-zone/lap lengths, racing flow/cues and separate PB/ghost storage.

Aurora's plan is a 12-section lap designed as a pair of 1,700m halves with distinct curve shaping and opposite loop headings. Closure was numerically optimized so the raw geometric seam error is under 1 metre before normal 25cm spline welding. The large turns' maximum curvature is lower than the old narrow apex. It is intentionally simpler and faster to learn than Skyline.

Aurora doesn't inherit inappropriate features or rewards from Skyline: the jump and corkscrew positions are disabled, rail geometry isn't re-used at old world coordinates, no pads/line cues appear, and Skyline Challenges aren't offered on Aurora (their currently authored sector coordinates only apply to Skyline).

The current track is selected explicitly via `?track=aurora`; removing this restores Skyline. Switching track reloads the 3D circuit, safely preserves graphics preferences and uses a new Time Trial PB/ghost fingerprint for Aurora. **Existing Skyline PB/ghost and earned challenge medals remain untouched.**

## Testing
CI validates all course geometry and seam closure, full-lap physical rail placement, smooth banking, absence of risk pads, valid empty-pad GLSL, launch of shared 120Hz physics, unique PB/ghost storage, and both track selection states. Headless Chrome checks the production WebGL shaders of BOTH tracks, the selectable UI, unchanged original Skyline boosters/challenges, visible difference in physical geometry, and actual race start.

## Limits
This is a first playable second-circuit layout; final lap times and tricky corners still need physical mobile playtesting before medals or special challenges are authored for Aurora. Early reviews should focus on the **overall rhythm and turn readability**, not adding more visual effects.

Play: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.16.0
Direct Aurora: https://hajjen-game.github.io/Hajjen/skyshift/?track=aurora&v=0.16.0
