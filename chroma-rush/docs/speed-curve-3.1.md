# Speed Curve 3.1 — Faster Run Pacing

## Evidence: player audit after Speed Curve 3.0

A real Arcade round (2026-11-09, starting zone 1) reached **zone 35** and lasted **413.2 seconds (6:53)**. The observed final speed was **1,154.84 world units/s**.

- 183 obstacles spawned, 169 cleared and 14 hits; 26 gaps cleared, 0 gaps missed.
- 23 perfect zones, maximum Flow 100, 46 max streak, 105 combos.
- 9 Shield Cores spawned, 6 collected, total 150 shield restored. Strong recovery may help explain the run length; this pass does **not** alter shielding or the Director.
- All 183 measured obstacle warning budgets were marked fair (0 under-budget); 3 early cues.
- On the test device: reported Performance profile ~27.5 FPS, 3,217 slow frames, 172 stalls, 666.3 ms worst frame, and 2.09 dropped simulation seconds. These reflect real-device performance concerns separate from curve pacing. Do not infer that faster speed fixes FPS.

The player's direct feedback: **the run felt drawn out and should accelerate sooner.** A 6:53 run was technically in the initial 5–7 minute *time* target but did not have the desired sense of rising intensity. Time to death is not the only criterion.

## Revised continuous velocity

In logical world units per second with elapsed run time `t` (seconds):

```js
speed(t) = 370 + 1000 * (1 - Math.exp(-t / 180)) + .75 * t
```

| Elapsed | Zone | Curve 2.0 | Curve 3.0 | Curve 3.1 |
| ---: | ---: | ---: | ---: | ---: |
| 0m | 1 | 370 | 370 | 370 |
| 1m | 6 | 825 | 579 | 698 |
| 2m | 11 | 1,280 | 738 | 947 |
| 3m | 16 | 1,585 | 861 | 1,137 |
| 5m | 26 | 2,195 | 1,038 | 1,406 |
| 7m | 36 | 2,805 | 1,161 | 1,588 |
| 10m | 51 | 3,720 | 1,298 | 1,784 |

Start speed remains 370, zone cadence remains 12 seconds. Initial acceleration increases from ~3.99 to ~6.31 units/s² (Curve 2.0 started at 7 plus stepped zone boosts). Acceleration tapers smoothly toward .75 units/s² without sudden zone speed bumps and **without a hard speed cap**. At the player's 413.2s mark, the revised formula predicts ~1,579 world units/s, an increase of ~37%.

## Safeguards and next steps

- This is a one-variable gameplay balance change: no changes to jump/Echo physics, Dash/Duck, HP, Shield Cores, terrain geometry, Director patterns, gap planning, Flow, score rate, visual camera or mobile quality profiles.
- Test speed continuity, 3/5/7/10m checkpoints, practice zone start, narrow-screen fairness and deterministic 7m Director planning. All direct action warnings must retain their physical lead-time guarantees.
- Speed is still not a substitute for **Adaptive Camera Horizon**: late-game objects may need offscreen prompts before they are on the screen. The zoom pass must follow with real-world visibility and collision safeguards.
- The existing Dash Energy Bridge and mandatory seal are unchanged. A separate geometry-only redesign is needed to remove its mandatory energy gate as discussed.
- **Next user playtest:** compare how the first 2 minutes feel, whether zones 10–20 finally build excitement, and whether the late-game pace feels controllable on the user's older phone. Review both duration and perceived intensity. A 5–7 minute great run remains an ambition, not an induced death timer.
