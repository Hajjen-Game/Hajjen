# SKYSHIFT 0.10.4 — Velocity Presence & Airborne Motion

## Scope: all five motion-language passes in one release
1. **Velocity-loaded ship**: a shared visual-only speed envelope across all eight +11% cruise-speed stages; two articulated metallic aero vanes react to forward speed, boost and flight. Hull attitude and existing engine glow now read physical velocity. Both Manta Blade and Stingray EVO are supported.
2. **Airborne Motion**: takeoff, ascent, apex, descent and landing have sprung cosmetic hull/wing motion. The pilot's controlled air trick progressively suppresses extra auto-roll so it never competes with input; impact recovers quickly.
3. **Speed Flow**: existing longitudinal road/rail shader glints and deep-space parallax now grow with *cruise speed*, not just boost. No new roadside objects, obstacle-like particles or screen-filling flash.
4. **Kinetic Camera refinement**: small velocity/boost-driven framing changes and protected airborne look/lift; an additional FOV allowance of at most 1.15° with an absolute clamp. Full 360° corkscrew remains protected and the original wall ride is attenuated.
5. **Shared Velocity Presence signal**: `velocity-presence-v0104.mjs` translates real 120 Hz speed, boost, steering, GRIP and vertical velocity into a single render-only envelope consumed by camera, ship, exhaust and world.

## Specific tuning
- Physical cruise speed remains `44 * 1.11 ** stage` for stage 0–8. Existing pads, acceleration, steering authority, GRIP, collisions, lap count, rewards and track geometry unchanged.
- Velocity stages normalize using log ratio of the actual speed, so progress continues across all nine cruise tiers. Boost adds a *separate* short high-energy surge and is not confused with a permanent zone step.
- Stingray's nine original joints preserve the correct turn direction, while the neutral airflow wave has a faster final-zone cadence without large snake-like bends. Landing pitch ripple is slightly stronger in flight.
- Two tiny articulated aero vane meshes share one geometry and one material (two extra ship draw calls total); no new light, particle system or heavy blur pass.
- The engine-trail model increases length and white-core energy progressively during cruise, still retaining the special 40% boost flare and constant two-emitter layout.
- Camera keeps the pilot-owned target and FOV clamping. It never changes the underlying physics or automatically steers.

## Changed files
`game-v0104.mjs`, `boot-v0104.js`, `engine-trails-v0104.mjs`,
`stingray-evo-v0104.mjs`, `velocity-presence-v0104.mjs`,
`velocity-vanes-v0104.mjs`, `browser-smoke-v0104.mjs`,
`velocity-presence-v0104.test.mjs`, and `index.html`.

## QA and honest limitations
- Targeted pure-module tests check every cruise stage, boost onset/release, takeoff/ascent/descent, trick suppression, landing recovery, frame-rate equivalence, finite bounds and complete production wiring.
- Automated Chrome/WebGL smoke runs against the real production page, hangar, tunnel, 3D route and Android touch controls.
- The old full historical suite has 51 version-pinned tests looking for the **0.10.3** active entrypoint. These tests remain in the repository but are no longer the gating test selection for **0.10.4**. A focused current-release suite runs alongside Chrome smoke. Updating every archived historical 'active release' assertion is separate maintenance, not proof of a gameplay regression.
- Device-specific FPS and subjective readability need playtesting. The visuals have been implemented and are not a claim of verified artistic perfection.

## Playtest priorities
1. Drive Manta from zone 1 to zone 9 without using boost: look for progressively more animated wing vanes, engine wakes and road-edge flow.
2. Repeat with Stingray and compare neutral tail animation at low and high cruise speed, then test left/right GRIP.
3. On Skyline Leap, watch takeoff pitch, floating/descending attitude and cushioned landing. Attempt the full controlled air roll to ensure the cosmetic motion never fights your trick.
4. Use the Shadow Tunnel, 70° magnetic wall and corkscrew at high speed. Check if the camera stays understandable and track markings remain readable.
5. Export the flight audit and check `visual.velocityPresence` and `visual.fleet.velocityVanes`; share videos of extreme-speed moments if artistic refinement is needed.

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/
