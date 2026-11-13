# SKYSHIFT 0.4.2 — Track Geometry & Handling Reset

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/

This is an intentional **short driving-quality experiment**, not a content update to the 1,300 m full trial. Previous flight versions including `trial-v041.mjs` and `game-v041.mjs` remain untouched in GitHub for comparison and rollback.

## Why we are resetting

The 0.4/0.4.1 track was an accumulated set of smoothstep changes in heading. With physical camber tied to changing curvature, it looked hand-drawn and continuously wriggling. The player also reported a slippery ship, partly consistent with yaw-rate response, camera lag and heavy renderer load. The 0.4.1 log showed 23 steering reversals, 5.25 s off-road and a 31 FPS average (20 minimum). Those metrics alone cannot diagnose handling feel, but the feedback warrants separating geometry and control from platform challenges.

## 0.4.2 handling-lab test course

**510 metres, five authored elements:**
1. 0–95 m: precisely straight launch
2. 95–222 m: long banked left corner with 20 m entry transition, **87 m constant-radius arc**, 20 m exit
3. 222–292 m: precisely straight middle section
4. 292–424 m: long banked right corner with 20 m entry transition, **92 m constant-radius arc**, 20 m exit
5. 424–510 m: precisely straight finish

Geometry uses curvature integration. On the straights, curvature **equals zero**. In each circular arc core, curvature is **constant**, so the radius never wobbles. Only short, defined linear-curvature entrance and exit transitions are allowed. This is materially different from adding more smoothstep bends. Banking is physical and matches the collision surface (about 17–18 degrees at full curve), with a smooth 20 m ramp at each end.

There are **no jumps, moving hazards, split lanes or risk route** in this calibration course. The jump control is hidden and jump input has no effect. The target is to learn if two good corners and a responsive steering model can make SKYSHIFT actually fun before restoring the Sky Islands and other challenges.

## Handling reset

- Forward speed remains automatic at roughly 22–23.5 m/s.
- **No automatic turn-following**, correction to track centerline, hidden corner load or lane magnet.
- Player stick input drives a *bounded yaw rate* (~0.62 rad/s maximum), not an accumulated artificial lateral force.
- Small center deadzone and shaped input improve precision on phones.
- On stick release yaw rate damps quickly, while the current world-space heading remains player owned. There is no reversal or auto recenter.
- The same input response is used at any frame rate in the deterministic 120Hz physics step.
- Keyboard steering is slightly scaled for predictable digital input.
- The craft and chase camera share a quicker, **matched** smoothing constant so separate camera/look delays cannot induce the previous lagged orbit sensation.
- The 0.4.1 HDR neon pipeline, space environment, anti-gravity hull, fullscreen and modern-device target are preserved.

## Files

- `trial-v042.mjs`: mathematically designed track, camber, free-heading yaw physics, checkpoint handling, deterministic runtime
- `identity-v042.mjs`: zero nonfunctional road graphics
- `game-v042.mjs`: short-course presentation, camera/ship response, runtime telemetry
- `handling-v042.test.mjs`: straightness and constant radius, banking continuity, yaw input and release, full pilot-controlled lap, no hidden road-following, WebGL integration wiring
- `index.html`, `style-v042.css`: new menu, result fields, hidden jump button
- `README.md`: design rationale and testing instructions

## Please test on a phone

Focus specifically on whether the road looks *machine-designed*: truly straight sections, single consistent-radius bends and gradual camber changes. During each corner, release the steering briefly — the ship should maintain its heading and drift **off the racing line**, not turn itself back. It should not keep turning long after releasing the stick. Try several partial-deflection inputs and notice whether the camera is less disorienting.

Export `skyshift-handling-v042-audit.json`: it includes steering reversals, peak yaw rate, maximum lateral deviation, banking angle and time off-road. Compare with 0.4.1, but note that this is a different-length test course and times are not comparable.

## Out of scope

No real wall riding, ceiling gravity, endless mode, new weapons or Chroma Rush color wave. No full-course migration until the handling lab is approved. Other games in the repository remain unchanged.
