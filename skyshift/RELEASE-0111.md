# SKYSHIFT 0.11.1 — Render & CPU Optimization

## Purpose
Make the Three.js racer cheaper to render **without** tuning the artistic ceiling to a Galaxy A51. Old hardware is a stress test, not the intended premium visual target. Keep Stingray EVO, world-anchored white wake, rail scrape sparks, zone white-core, SMAA and authoritative 120 Hz flight physics intact.

## Changes
- `neon-v0111.mjs`: constrain **only** UnrealBloomPass's internal blur mip-chain input to 0.88x on premium profiles and 0.78x when the browser reports <=4 GB RAM. RenderPass, main HDR composer, SMAA and OutputPass keep their original internal DPR. Expected bloom blur-input pixel ratios are 77.44% and 60.84%, respectively; these are **not** measured frame-time improvements. All passes, color/wave uniforms and white-core energy are preserved.
- `render-optimizer-v0111.mjs`: reusable HUD 30 Hz cadence, write-through DOM value caching and pure bloom scaler functions. Controls, physics, atmosphere, track geometry, boost, steering and camera updates are not throttled.
- `game-v0111.mjs`: avoid cloning the entire flight + interpolated view every frame for the twin-engine exhaust effect; pass a stable minimal FX context instead. Preserve last end-of-race spark telemetry before the effect manager resets on the victory screen.
- `performance-audit-v0111.mjs`: no temporary eight-value allocation per profiled frame; A/B mode `bloom-full` restores untouched full-resolution UnrealBloom blur chain. The old benchmark variants continue to work.
- Keep `skyshift/browser-smoke-v0111.mjs`: wait for a **sample threshold**, not fixed wall-clock time, before asserting frame metrics; this corrects the flaky 0.11.0 Chrome software-WebGL smoke.
- Updated visible version and active bootstrap, with unit + browser CI gates.

## Reproducible A/B
Compare on the **same device**, orientation, browser, quality settings and roughly similar race conditions. Both URLs below fix adaptive resolution so bloom cost is the controlled change:
- **0.11.1 optimized bloom**: `?perf=1&perfPreset=baseline`
- **0.11.1 original full bloom**: `?perf=1&perfPreset=bloom-full`
- **No bloom sanity check**: `?perf=1&perfPreset=no-bloom`

Export audit files from each run and compare `performanceAudit.breakdown.frameMs.p50/p95/p99`, GPU p95 if available, `renderCpuMs`, `bloomResolutionScale`, and `visual.renderOptimization`. A11/A16 comparison is not a benchmark when internal DPR differs. Observed FPS may be affected by thermal throttling, tab scheduling and background activity; GPU time extensions may be unsupported.

## Non-goals
No geometry segmentation/culling until profiling supports its benefit, and no cuts to polygon count, ship movement, HUD legibility, physics rate, white core, or anti-aliasing. The full-resolution visual passes remain by design.

## Test expectations
- `node --test skyshift/render-optimizer-v0111.test.mjs` checks math, pass scaling, cached UI behavior and benchmark profiles.
- GitHub Actions runs the retained deterministic physics gates and browser WebGL smoke. The smoke exercises the HDR render, real wake/sparks and the new profiler.
