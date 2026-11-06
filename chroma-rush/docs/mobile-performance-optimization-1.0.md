# CHROMA RUSH — Mobile Performance Optimization 1.0

## Scope and purpose

CHROMA RUSH remains the same single endless, accelerating course. This version separates **visual quality** from gameplay timing and provides reproducible benchmarks and developer-only diagnostics. The goal is additional headroom for future effects, not a promise of a particular frame rate or the removal of the game's neon look.

## New code

- `src/performance/quality-manager.js`: rendering-only graphics profile, local preference and auto-quality hysteresis; no game mechanics, RNG or audio rules.
- `src/performance/frame-clock.js`: fixed 60 Hz simulation with bounded catch-up for slower rendering or long browser stalls.
- `src/render/world-background.js`: less decorative work when quality is reduced; gradients and sky remain full height behind gaps.
- `src/render/terrain-renderer.js`: fewer samples for smooth terrain in lower quality profiles, fewer perspective grid strokes; real terrain heights and gap edge cues remain identical.
- `src/gameplay/game.js`: uses a separate pseudo-random stream for visual particles, conditional particle/glow detail, draw-stage metrics and adaptive render resolution.
- `scripts/mobile-performance-audit.py`: independent headless Chromium screenshots/CPU draw timings for HIGH, BALANCED, PERFORMANCE on two landscape widths.

## Graphics selection

Press the **⚙** button on the main menu (or pause screen) to choose:

| Setting | Device render density cap | Visual detail | Auto-adjust |
| --- | ---: | --- | --- |
| HIGH | up to 2x DPR / 3.2M pixels | Full glow, trails, architecture | No |
| BALANCED | up to 1.5x DPR / 1.7M pixels | Moderate detail reduction | No |
| PERFORMANCE | up to 1x DPR / 0.9M pixels | Fewer background layers and particles, softened glow | No |
| AUTO (default) | Picks one of the above | Uses device memory/CPU hints and measured frame pacing | Yes, with hysteresis and long cooldowns |

The chosen mode persists locally in `chromaRushGraphicsV1`. **All gameplay content, collision geometry, scroll speeds, jump timing, difficulty and score rules remain identical in every mode.** A profile should never alter the gameplay random stream. Every quality mode preserves the visible ground edge, gaps, obstacles, player and input affordances.

## Development diagnostics

Add `?perf=1` to the game URL to show a *local-only* overlay containing:

- Rolling FPS and 90th-percentile frame interval, measured from `requestAnimationFrame` timestamps.
- JS `performance.now()` durations for game update, background drawing, ground, actors and effects.
- Currently selected/active visual profile.

The existing **EXPORT RUN LOG** JSON gains a `renderPerformance` object, including the same approximate metrics. It does not include device identifiers, precise timestamps or personal data. This does not upload or transmit any data.

**Limitations:** JS timings and headless screenshots do not measure GPU composition time, actual Android browser throttle, power saving, touch latency, audio processing or thermal throttling. The real phone and browser must still be tested. Compare long enough stable runs; do not infer a particular mobile FPS from a sub-millisecond headless canvas benchmark.

## Fixed-step fairness

The physics step is 1/60 second, regardless of the monitor refresh rate. A 30 fps renderer can process two simulation steps per frame; 120 fps may render between simulations. Up to 6 steps can catch up after short lag, but a long browser suspension cannot jump the player forward by multiple seconds. Pausing resets accumulated time. A render-quality change cannot change the physical frame step.

## Automated verification

From the repository root:

```sh
node --test chroma-rush/tests/*.test.cjs
python chroma-rush/scripts/visual-audit.py
python chroma-rush/scripts/mobile-performance-audit.py
```

CI retains screenshots and a JSON report for seven days. The new browser audit checks that quality settings change backing resolution and aesthetic detail while gaps still show the real background. Node tests cover profile persistence, downgrade/upgrade hysteresis, fixed-step 30/60/120 Hz equivalence, bounded tab stalls, and **identical seeded gameplay between HIGH and PERFORMANCE**.

## Future work

The next rendering investment can be a shared batched or pooled effects engine, cached static geometry, and/or PixiJS/WebGL if profiling demonstrates that Canvas 2D has become the bottleneck. Resist premature migration without a real-device trace. More particles can be unlocked on HIGH without affecting the rules of the game.
