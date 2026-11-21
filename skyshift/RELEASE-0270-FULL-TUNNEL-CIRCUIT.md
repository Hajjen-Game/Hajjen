# SKYSHIFT 0.27.0 — Full Tunnel Circuit Foundation

## Objective

Introduce **NEON VAULT CIRCUIT** as a third circuit, entirely inside a continuous, closed, bank-following tunnel. Preserve Skyline Circuit and Aurora Run, particularly their steering, GRIP, collision, acceleration, ship, camera, three-lap progression and 0.26.5 lighting.

## Implemented

- Third selectable track: URL query v=0.27.0&track=vault. Other tracks retain their original authored layouts and mechanics.
- Genuinely independent 3,400m circuit: each 1,700m half has a ±25° S-link and two 90° C2-smoothed corners. The second mirrored half turns exactly 180° relative to the first, ensuring mathematical loop closure. Three laps share the unchanged 10,200m flight engine.
- Distinct gentle elevations and banked curves are geometry, not altered flight dynamics. No Skyline Leap, gap, wall ride, corkscrew or borrowed narrow GRIP throat.
- Continuous vault from 0 to 3,400m, based on the original 31-point 0.21.1 banked tunnel cross-section rather than a stretched texture.
- Twenty 170m independently culled mesh chunks. Roof, curved structural ribs, finite cyan overhead practicals, lower cyan inlays and amber wall lights cover the entire lap.
- High quality samples the shell every 2.5m, 4GB every 4.25m. Dark solar-independent metal and source-colored gradients provide a cautious foundation without global white exposure.
- The original native black-room controller now uses a Vault-only constant light-seal profile for all 3400m. Exterior directional/hemisphere white spill is reduced everywhere without altering original road/ship shaders or the other circuits.
- Skip the old independent 760m Shadow Tunnel and open-world station on this new course to avoid overlapping structures.
- Original racing deck, physical rails, zone wave, ship, camera and controls are not modified. No new physical colliders or rendering postprocess passes.
- Historical 0.26.5 Skyline geometry, lighting and A/B paths are preserved. New QA functions: __skyshiftFullTunnelProbe and __skyshiftFullTunnelFrameProof.

## Important boundary: foundation, not full 0.26.5 lighting parity

The new full-length shell has dark, vertex-colored metal and authentic narrow cyan/amber source geometry. It deliberately does NOT yet port the complete 0.26.1–0.26.5 multi-source native GGX lighting, micro-normal atlas and source masks from Skyline's original first 368 meters across the 3400m tunnel. That next pass must generalize fixed tunnel positions, light bay schedules, rail solar containment, road transport and zone-material coordinates. Do not imply visual material parity until independent real High/4GB WebGL proof.

## Tests and comparison

- Node: skyshift/full-tunnel-layout-v0270.test.mjs and skyshift/full-tunnel-circuit-v0270.test.mjs
- Real Chromium: skyshift/browser-full-tunnel-v0270.mjs generates 1536×870 High images at four track positions and 4GB at two, checking real lighting, complete coverage, native ship, no gaps and 3400m closed topology.
- Compare visual foundation with URL query v=0.27.0&track=vault&fullTunnel=classic (same physics; no new shell).
- Retain all previous flight/GRIP/white-spill regression tests.

Do not merge if new course visuals, shader compilation or historic Skyline and Aurora tests regress. Verify GitHub Pages after merge.
