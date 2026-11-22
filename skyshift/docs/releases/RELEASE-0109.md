# SKYSHIFT 0.10.9 — Rail Scrape Sparks

## Creative intent
The ship must feel substantial when it **actually contacts** the guardrails. White-gold sparks strike at the real metal collision point and fly backwards in the world, dispersing naturally rather than being parented to the hull. A brief punch on the first impact is followed by shorter, uneven little showers when the pilot keeps scraping. A clean line along the wall produces no sparks.

## Implementation
- New `rail-scrape-sparks-v0109.mjs` with a single **preallocated additive WebGL mesh**, maximum 104 particles (52 low-memory) / one draw call / no extra lights, bloom passes, textures, HTML layers or sounds.
- Uses the existing authentic physics outputs `flight.railContacting`, `lastRailSide`, `railScrubIntensity`, and `railContactStarts`. Does **not** alter physical collisions, velocity, steering, railing, shield, camera, lap progression, or GRIP.
- Emitter placement is `railContactPoint(s,side)` from the actual track geometry `positionAt/poseAt/surfaceNormalAt`, 0.68m above the banked wall surface near the ship's outer blade contact. Works on left/right guardrails and banked/corkscrew portions without assuming global up.
- The **impact** triggers an initial controlled 3–12 white-gold fragments. While scraping continues, smaller irregular bursts add 8–44/s depending on true zone speed and scrub load. Almost-grazes are subtle; high-speed impacts are substantially more energetic.
- Per-particle deterministic pseudo-random emission velocities include backward track flow, inward bounce from the wall and upward scatter. Brief ballistic paths have gravity/drag and fade within 0.16–0.47s. A fine bright core sits inside a subtle warm-orange halo: two planes in one mesh using additive blending and RGBA alpha. No black or darkening trails.
- Particles store their **own immutable spawn world coordinates**, then keep flying independently of the ship after contact ends. Repeated scrapes do not cause infinite solid bars or strobe flashes.
- Restart, pause, Hangar, and ship changes hide/reset the sparks. All existing wing flap and living aerodynamic wake modules remain active and unchanged.
- Production telemetry exposes contact frames, source side/position, impact bursts, particle counts, world travel, lighting mode and 1-draw-call budget.

## QA
- `rail-scrape-sparks-v0109.test.mjs`: zero sparks without physical contact, both sides and banked wall positions, impact and sustained scrape rate, independent age/motion/decay, low-memory limit, no physics and batch allocation regressions.
- `browser-smoke-v0109.mjs`: genuine Chrome WebGL test of left/right wall impacts, correct world positions, source-relative travel, no particle spawning near a rail without contact, and decay after release. Continues to test old 0.10.8 wing flaps, the 0.10.7.1 white wake, Hangar, HUD, Shadow Tunnel, and mobile GRIP input.

## Device playtest
1. Lightly brush the guardrail: a few bright contact points, no full neon ribbon.
2. Hit the left edge harder in a fast turn: a distinct impact spark shower followed by smaller independent bursts while scraping.
3. Switch to the right edge: the spark source must follow, not come from the center of the ship.
4. Leave the wall: particles must finish their short world-space trajectories instead of freezing or persisting attached to the wing.
5. Check performance on an older mobile and contrast in the Shadow Tunnel; white sparks should remain visible without obscuring the course or the zone-wave effect.

Visual taste and particle scale still need real device feedback. CI confirms correctness and GPU rendering but cannot substitute for premium-feeling game playtests.

Live: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.10.9
