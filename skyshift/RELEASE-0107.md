# SKYSHIFT 0.10.7 — Living Aerodynamic Wake

## Problem being corrected
0.10.5 rendered seven glowing bands across the entire trailing wing edge. 0.10.6 corrected placement to the outer wingtips but drew perfectly repeated streaks whose geometry was parented to the ship. They looked stationary and were already full brightness after two stages. This pass **replaces** the system. Do not reintroduce old attached contrail meshes into the active game.

## New aerodynamic language
- One world-space condensation ribbon per **actual outermost wingtip**, not a row of emission sockets.
- New `living-wake-v0107.mjs` buffers up to 28 historical positions for each wingtip from the rendered ship's true world matrix. Samples never reattach to the craft after it moves.
- History ages and fades over **at most 0.61 seconds**, bounds total visible path to **38 meters**, and breaks on a discontinuity instead of drawing a teleporter-like laser line.
- Camera-facing ribbon tessellation, a subdued off-white wispy halo and an even thinner off-white core. Older samples widen and drift slightly. Peak light energy is capped at **0.35**, far below the old white-hot neon emission.
- Real speed only enables the effect progressively after the early stages. Steering and yaw-load, GRIP, boost and airborne state determine *when* visible condensation appears. Full-speed straight driving is deliberately subtle.
- After the craft eases out of a turn, the old curved wake remains where it was drawn, gently disperses and vanishes; nothing is constantly attached behind the hull.
- All sampling, upload buffers, and material geometry are preallocated and reused. Two visible wake trails are batched into **one additional draw call**, no particles, new dynamic lights or extra postprocessing.
- The active game's existing twin engine exhaust, three-lap track, GRIP steering, ships, Kinetic camera, Shadow Tunnel, ship selection and original Hangar stay intact.

## Technical changes
- `game-v0107.mjs` integrates world-space sampling **after** the ship's final visual pose, including jet/body scaling. It replaces the former `wingtip-contrails-v0106.mjs` import with `living-wake-v0107.mjs`.
- `boot-v0107.js` and `index.html` activate 0.10.7.
- Flight audits report `visual.livingWake`: historical sample count, segment count, historical distance, world anchoring, energy, discontinuity count and draw-call budget.
- Restart, pause, menu and Hangar reset/hide previous condensation; reselecting a ship disposes the old world mesh.
- Query-gated `?wakeSmoke=1` exists for software WebGL verification only. Real play never enters that special mode.

## Tests
- `living-wake-v0107.test.mjs`: verifies speed gating, straight-driving restraint, yaw/GRIP/boost/airborne response, immutable world-space history, teleport protection, lifetime, fade, reset and batch budget.
- `browser-smoke-v0107.mjs`: checks true Chrome WebGL world-space history and intensity difference between straight cruise versus GRIP, airborne and boost, plus hangar, tunnel and mobile touch controls.

## Playtest priorities
1. Drive **straight** at speed: white air wisps should be subtle, not bright constant laser beams.
2. Enter a fast GRIP turn: condensation should gather dynamically at wingtip load and preserve a soft history of the **past actual flight path** behind the ship.
3. Release GRIP: old wake should drift and dissolve rather than remain tethered to the craft.
4. Repeat through Skyline Leap and a boost segment at high speed. Avoid any obstruction of the track and white-core spectral zone waves.
5. Compare Manta Blade and Stingray EVO; on lower-memory phones there is a shorter trail segment budget.

Art direction needs subjective device playtesting. Green CI proves functional rendering and physics isolation, not that the artistic effect feels premium.

Play: https://hajjen-game.github.io/Hajjen/skyshift/
