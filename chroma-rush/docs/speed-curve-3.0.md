# Speed Curve 3.0 — Long-Run Progression

**Goal:** make strong CHROMA RUSH runs around 5–7 minutes a plausible tuning target, while 10+ minutes is reserved for exceptional players. These are **design goals, not observed player survival durations**. No time-based forced deaths.

## Velocity model

The run still begins at **370 logical units/s**, with a new color zone every **12 seconds**. Current speed is derived from elapsed zone-clock time `t` (seconds) and does not jump when the zone number increments.

```text
speed(t) = 370 + 620 * (1 - exp(-t / 180)) + 0.55 * t
```

| Time | Zone | Speed Curve 2.0 | Speed Curve 3.0 |
| --- | ---: | ---: | ---: |
| 0m | 1 | 370 | 370 |
| 1m | 6 | 825 | 579 |
| 2m | 11 | 1280 | 738 |
| 3m | 16 | 1585 | 861 |
| 5m | 26 | 2195 | 1038 |
| 7m | 36 | 2805 | 1161 |
| 10m | 51 | 3720 | 1298 |

Acceleration starts near 3.994 units/s² and decreases smoothly to about 0.884 units/s² at seven minutes, asymptotically approaching 0.55 units/s². There is **no hard speed limit**. Time is monotonic; zone changes are still meaningful for palettes, milestones, Director obstacle access and pacing, not abrupt velocity kicks.

## Scope

- **Changed:** only the shared speed formula, the HTML build/cache marker, historical test assumptions, new long-run speed/fairness tests and documentation.
- **Not changed:** jump physics, Echo Jump, Duck, Dash, collisions, gap planning, Director decisions, Flow, score calculation, HP, mobile quality, original background and fixed camera.
- **Dash Energy Bridge and its mandatory seal remain intact.** Removing seals is a later geometry/obstacle pass; Speed Curve 3.0 itself does not silently redesign obstacles.
- **Adaptive camera zoom is not part of this pass.** Future zoom must coordinate camera transforms with terrain, real obstacle visibility and the Fairness Director's per-action reaction windows.
- Practice runs start at the corresponding elapsed time for their selected zone. Existing personal bests and unlocks are not reset, though legacy score comparisons span different difficulty curves.
- Since the viewport has not yet zoomed out, high-zone Echo and Dash challenges may still require the existing advance warnings. These remain enabled and time-budgeted.

## Validation and next balancing iteration

Run `node --test chroma-rush/tests/*.test.cjs` and the existing mobile browser audits. The specific Speed Curve 3.0 suite checks exact time checkpoints, monotonic no-cap velocity over 20 simulated minutes, absence of velocity jumps at zone transitions, practice/arcade speed alignment and response-time horizons on narrow and wide screens. A seeded seven-minute Director planning audit checks gap and arrival safety; it is **not a human playthrough**.

Human acceptance criteria require real mobile playtests: distribution of run lengths by skill, new player first-run survival, near misses, damage types, frequency of retries, satisfaction with faster zones, and whether double-jump/Dash decisions remain clear. Use run exports to adjust acceleration and/or Director pacing if the proposed 5–7-minute target proves too easy, too exhausting or too hard. Do not enforce a hidden death timer.
