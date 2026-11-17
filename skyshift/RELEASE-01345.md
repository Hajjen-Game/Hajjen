# SKYSHIFT 0.13.4.5 — Camera-True Wing Parity

## Report
The actual phone screenshots show Manta Blade ~170px and Stingray ~210px across the wings in the chase view, despite 0.13.4.4 giving both ships 5.8m world spans. This proves the previous world-span test cannot guarantee screen-space parity.

## Fix
- Apply an additional stable horizontal screen-calibration factor 170/210 to Stingray's 0.13.4.4 span. New X scale: (5.8/8.08)*(170/210) ≈ 0.581. The Stingray is physically narrower than Manta to look similar in the live chase camera.
- Keep existing 0.68 Y/Z scales, fixed +0.26m visual lift, smooth 0.25rad relative-roll limit, original nine-joint tail, GRIP and flight physics.
- No camera changes, dynamic wing compensation, extra particles, or ship-geometry rebuilding.
- Introduce QA-only `__skyshiftScreenBeamProbe` to PROJECT actual loaded wing geometry and an unchanged Manta wing reference through the same real racing camera; a focused Chrome WebGL test checks the resulting relative image width.

The two captures are 43m apart and use different speed readouts, so this is a calibrated starting correction. Exact visual parity must still be verified on the real phone at the same camera pose.

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.5
