# Speed Curve 3.2 — Faster Momentum

**Date:** 2026-11-09  
**Scope:** speed tuning only. Dynamic camera zoom is **not** active in this version.

## Player evidence

Two real player rounds were reported back-to-back:

| Curve | Run duration | Final zone | Final world speed | Feedback |
| --- | --- | --- | --- | --- |
| 3.0 | 6m53s | 35 | ~1,155 | Felt overly drawn out |
| 3.1 | 4m29.68s | 23 | 1,348.77 | Shorter run but speed still rose too slowly |

The second round's audit documented 128 spawned obstacles, 115 cleared, 13 hits, 7 successful gap clears, 13 perfect zones, and 125 HP regained from five collected Shield Cores. The user explicitly requested **faster acceleration**, not extra obstacles or less HP. This pass therefore changes **only** the acceleration curve.

These rounds are not controlled experiments: random patterns, terrain, human actions and HP recovery vary between runs. No change to a survival-time distribution should be inferred from the predicted speed curve alone.

## Model

```js
// elapsed time t in seconds, world units per second
speed(t) = 370 + 1350 * (1 - Math.exp(-t / 170)) + 0.9 * t
```

The starting speed is 370. The initial acceleration is about 8.84 world units/s²; it continuously decreases toward +0.9 rather than stopping. Zone transitions remain every 12 seconds and add **no discrete speed change**, preventing momentary jolts. There is **no hard speed cap**.

| Time | Zone | Curve 3.1 | Curve 3.2 | Curve 2.0 historical |
| --- | ---: | ---: | ---: | ---: |
| 0m | 1 | 370 | **370** | 370 |
| 1m | 6 | 698 | **825** | 825 |
| 2m | 11 | 947 | **1,162** | 1,280 |
| 3m | 16 | 1,137 | **1,414** | 1,585 |
| 5m | 26 | 1,406 | **1,759** | 2,195 |
| 7m | 36 | 1,588 | **1,984** | 2,805 |
| 10m | 51 | 1,784 | **2,220** | 3,720 |

At the previous 4m29.68 checkpoint, the new curve predicts **~1,686 world units/s** versus 1,348.77 observed in Curve 3.1 (about **25% faster** at equal elapsed time), not a prediction of when the run would end.

## Not modified

- Fixed camera, existing foreground/background, quality tiers, mobile frame pacing, HUD and zoom stay unchanged.
- Jump, Duck, Echo Jump, Air/Ground Dash geometry and physics, existing Dash Energy Bridge and compulsory seal remain unchanged. Removal of that seal is a separate design decision/pass.
- Director, advance hazard cues, high-speed reaction-time budgets, gap and gravity-flip systems, Shield Cores, HP, Flow, scoring, palettes and 12-second zone cadence remain unchanged.
- Practice zones still derive speed from the matching elapsed time at zone entry. No save reset and no forced death after 5–7 minutes.

## Validation

Automated regression in `tests/speed-curve-3.2.test.cjs` checks exact rounded speed checkpoints, smooth taper and no zone-boundary speed jumps, never-decreasing/no-cap velocity through 20 minutes, practice alignment, narrow/standard/wide screen lead-time budgets for Jump/Duck/Echo/Gaps/Dash, the seeded 7-minute Director sweep and comparisons with both previous player-tested curves.

**This does not prove a 5–7-minute survival duration.** That requires new human rounds, especially on the user's older phone. Speed can expose visibility limits that simulated offscreen cues merely warn about, motivating the planned camera pass.

## Next separate workstream: Adaptive Camera Horizon 1.0

1. Zoom **out** smoothly as speed and lookahead requirements grow; retain visual clarity at typical mobile screen sizes. Explore ~100% early to ~80% only in the fastest zones, not a sudden camera cut.
2. Make rendering, player anchoring, terrain and obstruction visibility agree about the world-space viewport. Screen-space HUD and touch buttons must retain constant accessible size.
3. Check both floor and ceiling gravity orientation: no upside-down HUD, missing landscape, displaced obstacles or gaps.
4. Coordinate the newly visible ahead distance with Director/fairness early warning logic so zoom does not double-count or conceal reaction-time cues.
5. Compare low/high graphics profiles, short/wide landscape aspect ratios, and real older-device smoothness before deciding the final zoom range.

Implement the camera separately after a Speed Curve 3.2 playtest so it is possible to attribute changes in pace versus readability.
