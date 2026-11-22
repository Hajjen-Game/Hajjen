# SKYSHIFT 0.10.5 — Wing Vapor & Speed Pressure

## Player feedback / target
The 0.10.4 ship-and-camera changes were perceptible but not dramatic enough at extreme speed. Add **white air-pressure streaks originating from the WINGS**, with gradually more individual lines as zone speed rises. Keep this independent of the existing chromatic twin-engine exhaust, steering, boost physics and track.

## Visual language
- A precise white, slightly ice-blue core inside each soft white feathered airflow wake.
- A single growing fan of individual wisps behind **each actual trailing wing edge**. Anchors are calculated from the original Manta Blade outline or Stingray EVO wing contour.
- Zone 1: no vapor. As actual cruise speed increases in zones 2–9, up to **seven individual vapor strands per wing** appear with gradual fades; the longest and most clearly layered wake appears at the final zone.
- Higher speed also extends and brightens the strands. Real boost adds another flare of pressure, but high-speed cruising is distinctly visible without a boost pad.
- In the air, the wake spreads a little farther behind and to the sides, elongates and brightens. The effect never rotates or takes control of the ship.
- Subtle phase-driven turbulence breaks up the appearance of straight laser beams. No particle spray, smoke cloud, vignette or full-screen overlay.

## Implementation
- New `wing-vapor-v0105.mjs`: **one batched, preallocated dynamic triangle mesh** for all 14 possible wisps, including white cores and feather layers. Bounded length, no dynamic lights, textures, particles or new postprocessing pass. Streaks disappear completely at base speed and in the non-playing Hangar.
- Stingray and Manta use their own **actual wing geometry** to calculate where the white airflow leaves the craft; the two existing engine-light emitters remain unchanged.
- Low-memory profile caps active strands at **four per wing**, with lower brightness; same draw-call budget.
- New versioned game and bootstrap preserve GRIP, 120 Hz physics, zone progression, boost reward, airborne trick controls, Kinetic camera, Shadow Tunnel and live racetrack Hangar.
- Game audit includes `visual.wingVapor` containing current and peak strand counts, wake length, airborne brightness and boosted frames.
- Query-gated `?vaporSmoke=1` for real Chrome WebGL test only, not available in ordinary play.
- `wing-vapor-v0105.test.mjs`: verifies wing edge anchoring, progression through all nine cruise tiers, boost/air intensity, low-memory cap, current production wiring and optical-only render costs.
- `browser-smoke-v0105.mjs`: live gameplay/Chrome WebGL, white vapor at 0/6/14 strands, air and boost, Screenshot QA, Hangar, Shadow Tunnel and Android controls.

## Playtest
1. Drive without boost from the start through the later zones. The white trails should appear a little after the first speed increase, then multiply and brighten.
2. At top speed, check they read as **air ripping off the wing surfaces**, not motor exhaust or laser obstacles.
3. Cross Skyline Leap and observe the stronger pressure trails in open air; compare with ordinary cruise and boost.
4. Try Manta and Stingray, high speed GRIP and a three-lap run on a phone. The white lines should not obscure the track or the existing white-core zone-change wave.
5. If a composition needs tuning, share a screenshot or short video at both medium and maximum speed, plus the exported 0.10.5 audit.

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/
