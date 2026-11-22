# SKYSHIFT 0.11.0 — Performance & Frame-Time Audit

0.11.0 introduces instrumentation, **not** a claimed performance increase. Normal rendering, pilot physics, GRIP, camera and three-lap track are unchanged from 0.10.9.1.

## Measurements in exported Flight Log
- Bounded rolling ring buffer (1200 frames), with p50/p95/p99 and mean for frame duration, simulation CPU, HUD CPU, camera/FX presentation CPU, render-call CPU, simulation steps, draw calls and triangles.
- Tracks 33.34ms+ stutters, last 24 spikes, ratio of frames slower than 18ms and simulation time dropped by the frame-pacing system.
- Intervals over 250ms (tab resumes/background) are not used for performance percentiles.
- Optional GPU timer: WebGL2 EXT_disjoint_timer_query_webgl2 only. A nonblocking query every ten frames with at most three outstanding queries. Unsupported timer is flagged unavailable; CPU render-call time is never mislabeled GPU time.

## A/B diagnostic presets
Original graphics and adaptive DPR are retained during normal play. Add ?perf=1 to enable a small performance overlay and fixed DPR for reproducible A/B comparisons:

- ?perf=1&perfPreset=baseline — full original rendering.
- ?perf=1&perfPreset=no-bloom — disable HDR bloom pass.
- ?perf=1&perfPreset=no-smaa — disable SMAA pass.
- ?perf=1&perfPreset=low-dpr — cap internal DPR at 1.
- ?perf=1&perfPreset=no-wake-sparks — omit only the wing wake and rail spark drawing.

Play on the same device/browser, same section of track and similar speed. Export a log after each comparable run, repeat each condition three times, compare p95/p99 and average, and note device heat. This is instrumentation, not a graphics settings menu.

## CI and caveats
Unit tests verify preset parsing, bounded memory, distribution calculations, frame spikes and nonblocking GPU queries. Existing browser smoke tests are adapted to 0.11.0 and verify default visuals and no-bloom benchmarking. Software-rendered CI cannot validate real mobile thermal behavior.

Next milestone 0.11.1 may tackle actual bottlenecks based on this data rather than assumed performance gains.

Live: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.11.0
