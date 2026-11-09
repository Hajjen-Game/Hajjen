# Adaptive Camera Horizon 1.1 — Extended High-Speed Zoom

**Date:** 2026-11-09  
**Change:** Camera-only follow-up to Adaptive Camera Horizon 1.0, in response to iPhone player feedback. **Speed Curve 3.2 remains frozen.**

## User feedback and design choice

The player felt the original 1.0 camera zoom was subtle enough to barely notice during normal play, which was not a problem, but suggested zooming farther—**as low as 60% at high speed**.

The first camera matched the difficulty around zone 15 particularly well. Preserve it exactly until speed **1,450** and add a second progressive zoom stage **only for later, faster play**.

## Two-stage smooth continuous target zoom

```js
smooth(x) = clamp(x, 0, 1)^2 * (3 - 2*clamp(x, 0, 1))
early = smooth((speed - 650)/1200)   // original Camera 1.0 response
late  = smooth((speed - 1450)/750)   // new extra 20%
zoom = 1 - 0.20*early - 0.20*late
```

The camera still eases toward its target over ~1.15s. At and below speed 1,450 the second ramp is mathematically zero: **old zoom and new zoom are identical.** Both ramps have zero derivative at their endpoints, avoiding sudden steps or an arbitrary 80% plateau. Zoom stops at **60% once speed reaches 2,200**, and cannot go smaller even if endless-run speed increases.

| Approximate arcade time | Zone | Speed from unchanged Curve 3.2 | Camera 1.1 target |
| ---: | ---: | ---: | ---: |
| Start | 1 | 370 | 100% |
| 1m | 6 | 825 | 98.8% |
| 2m | 11 | 1,162 | 92.2% |
| 3m | 16 | 1,414 | 86.0% |
| 4m | 21 | 1,607 | 79.9% |
| 5m | 26 | 1,759 | 72.9% |
| 6m | 31 | 1,882 | 67.8% |
| 7m | 36 | 1,984 | 64.0% |
| 8m | 41 | 2,072 | 61.6% |
| 10m | 51 | 2,220 | 60.0% |

These values are camera *targets*, not a prediction of how many minutes people will survive. The Director, reaction budget, HP, Shield Cores, physical movement and speed remain unchanged. The visibility improvement can change player performance indirectly.

## True screen visibility

For logical screen width 1,280 and anchored player x=339.2:

| Zoom | Visible world right | Extra ahead compared with no camera | Visible world left |
| ---: | ---: | ---: | ---: |
| 100% | 1,280 | 0 | 0 |
| 80% | 1,515 | +235 | −84.8 |
| 70% | 1,683 | +403 | −145.4 |
| 60% | 1,907 | +627 | −226.1 |

Unlike a decorative scale-down, `FAIR.horizonFor`, `FAIR.metrics`, warning prompts, terrain generation and Shield Core spawn positions already consume the *expanded world-space visible-right bound*. Full background and Tide retain stable screen coordinates; course-only scaling remains nested inside gravity mirroring and cannot resize the upright HUD or touch targets.

## Tradeoffs and real-device checks

At 60%, the original 44-unit square is ~26.4 logical units tall, and the small obstacle language shrinks similarly. This may be near the readability limit on narrow older iPhones and Androids. The new 60% level appears only very late: the controlled test should confirm that this is a benefit rather than over-miniaturization. User should compare around zones **15 / 25 / 35+**, including the inverted ceiling, color transitions, longer Dash Energy Bridges and both ordinary and Echo jumps.

The camera is a single existing Canvas transform, with no extra offscreen canvases or passes. But more world terrain/grid and more hazards can fit in the viewport. The iPhone and PERFORMANCE-tier audits are still important to rule out extra frame pressure.

## Tests and boundaries

`tests/adaptive-camera-horizon-1.1.test.cjs` validates:
- Exact Camera 1.0 parity through speed 1,449 and a smoothly extending camera later.
- Monotonic 60% limit, reduced motion handling and long-run no-underzoom.
- 60% world-to-screen projection, ceiling gravity reversal, wider left/right/bottom terrain fill.
- Fair planner lookahead and Echo/Dash/gap offscreen cues when the world horizon expands.
- Chroma Tide color alignment with the background, browser module order and version markers.
- Smoke/physics regression tests unchanged apart from camera presentation.

**Recommendation:** test this experimentally before changing the game’s speed or density. If player and hazards appear too small near 60%, raise the minimum zoom toward 65–70% instead of slowing Speed Curve 3.2.
