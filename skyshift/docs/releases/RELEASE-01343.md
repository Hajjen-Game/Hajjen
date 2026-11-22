# SKYSHIFT 0.13.4.3 — Stingray / Manta Size Parity

## User report
Samsung A51 gameplay screenshots of 0.13.4.2 showed that Stingray still looked wider than the standard Manta Blade when viewed in the same racing camera. The visual size change in 0.13.4.2 was 90%, but Stingray's underlying mesh is physically much wider than Manta.

## Exact geometry comparison (no guessing)
- Standard Manta Blade (`manta-blade-v0484.mjs`): wingtip ±2.90 m, full span **5.80 m**, scale 1.00.
- Stingray HERO V4 (`stingray-evo-hero-v4.gltf`): wingtip ±4.04 m, full span 8.08 m.
- At 0.13.4.2 scale 0.90: Stingray appeared **7.272 m** wide, **25.38% wider** than Manta.
- At **0.13.4.3 scale 0.72**: Stingray appears **5.8176 m** wide, only **0.30% wider** than Manta.

## Changes
- `stingray-presentation-v01343.mjs`: isolated change from `visualUniformScale: .90` to **`.72`**. The fixed visual lift remains `+.18 m` along the real road normal; the dynamic 0.13.4.1 wing sampling remains completely disabled.
- `game-v01343.mjs`, `boot-v01343.js`, `index.html`: activate the new size parity by default, retain same GRIP, hover physics, camera/roll, engines, Fate/Time Trial/Ghost and V4 mechanical tail model. No extra gameplay FX or buttons.
- `stingray-size-parity-v01343.test.mjs`: read actual width from the V4 glTF indexed geometry and Manta Blade's published original wing outline; assert rendered wing spans match within 1%. Keep full V4 mechanics and original-no-clearance rollback tests.
- `browser-smoke-v01343.mjs`, `ui-flow-v01343.test.mjs`, `rail-scrape-sparks-v01343.test.mjs`: current release version and regression checks.
- `.github/workflows/skyshift-tests.yml`: active parity and browser tests updated.

## Acceptance
- In the same speed zone and comparable camera framing, Manta and Stingray wings should occupy approximately the same width. Screenshot perspective can still alter the apparent scale, so compare similar poses.
- The tail will remain distinctive and much longer than the standard craft; matching wing breadth does not mean both ships have identical outlines.
- Watch for the visual hover height and jet plume alignment. If either looks disconnected, refine that separately—not by restoring the old frame-by-frame wing lift which introduced knocking.
- Samsung A51 FPS and live Chrome/WebGL regression tests are configured but not confirmed from a real device/browser run yet.

**Live:** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.3
