# SKYSHIFT 0.13.4.4 — Standard-Width Span & GRIP Clearance

## Issue reproduced in mobile screenshots
The real Stingray V4 was still perceived as too large, and the lower wing intersected the road in hard GRIP turns. The previous v0.13.4.3 uniform 0.72 scale **already matched the actual 5.80 m Manta Blade reference wing span to within 0.3%**. Therefore another uniform width cut alone would not correct this GRIP intersection.

## Implementation
- Use exact X scale **5.80 / 8.08** on the active V4 mesh; true wingtip-to-wingtip span is now precisely 5.80 m.
- Shorten vertical and longitudinal art scale from 0.72 to **0.68** to reduce perceived bulk and the extended tail, while preserving the wing reference size. The sculpt, nine moving joints and authentic metallic surfaces remain the same.
- Increase Stingray's **constant** road-normal presentation lift from 0.18 m to **0.26 m**. No feedback loop, per-frame mesh raycasts, probing or sudden lifting.
- Saturate the **total cosmetic Stingray lean**, after all GRIP, Signature, Velocity and Power Carve roll terms, smoothly using tanh with **0.25 radians maximum relative to the road normal**. Keep physical bank and complete air-trick roll separately intact. The effect is frame-stateless, smooth and symmetrical, not a hard clamp.
- The Manta Blade retains **scale 1.00 and the original natural roll**, as do all authoritative 120 Hz flight physics, GRIP authority, rail collision, track geometry, camera and Ghost logic.
- Gate the release with real V4 glTF span measurements, a conservative deterministic wing-tip safety envelope, monotonic banking tests, full trick/bank restoration, production HTML boot, navigation and Browser/WebGL smoke.

## Limitations / validation
The deterministic static roll envelope is intended to stop the visible wing penetration in regular and GRIP turns without the stepping/knocking of the withdrawn 0.13.4.1 dynamic wing sampler. It is **not a full surface-intersection guarantee** for every extreme wallride, airborne transition or track edge. Real Samsung A51 playtest is still required.

**Live when deployed:** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.4

## Repository art-generator audit
The archived V4 generator does not reproduce the checked-in production glTF byte-for-byte. This patch leaves deployed art untouched and validates its actual geometric contract (34 meshes, complete wings and nine articulated tail sections), not a misleading text-equivalence assertion. Reconcile the generator in a separate art-source maintenance pass.
