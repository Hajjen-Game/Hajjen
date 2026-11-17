# SKYSHIFT 0.12.1 — Smart Fidelity ON & Power Carve

## Why
0.12.0’s A51 baseline run logged 46.595 FPS, P95 33.4ms with adaptive HDR DPR 0.98 (3 changes), but **Fidelity was classic-PBR OFF**, and only **one Precision Flow of 12 attempts** succeeded. Added camera lean max was 0.55° and additional FOV 0.904°: not a visible leap. The user's valid 0.11.4 opt-in Fidelity run logged **41.096 FPS at fixed DPR 1.25** for the complete 153.68-second race (P95 50ms). These tests are not controlled GPU benchmarks; they justify testing adaptive default premium ON, **not** declaring performance parity.

## 1. Adaptive Smart Fidelity ON, on low-memory mobiles too
The actual optimized 0.11.4 **vertex-nearfield-pbr-sheen** shader now runs in **normal** 0.12.1 mode on 4GB devices (and premium devices). It is the proven opt-in vertex shader, not the expensive 0.11.3 fragment shader. No additional lights, textures, triangles or render passes. Crucially, in normal play the existing adaptive render resolution and original low-memory bloom resolution **0.78** and SMAA remain enabled. The game will scale HDR render resolution if necessary instead of silently disabling the liked material.

The START menu exposes a compact **FIDELITY ON · TOGGLE** button in the same row as Fullscreen. Tapping saves the preference to localStorage and reloads the scene so WebGL can compile the right material cleanly. It persists across runs (default ON). `?fidelity=off` or `?fidelity=on` can override per launch. Old diagnostic presets `?perf=1&perfPreset=fidelity-off`, `fidelity-on`, and `fidelity-legacy` always take precedence, even over saved user choices, keeping comparable A/B data. The toggle is disabled while a fidelity diagnostic preset forces a profile.

## 2. Tactile Power Carve
`racing-experience-v0121.mjs` now reacts to **actual GRIP intensity + steering + yaw rate** during the maneuver, not only after a rare clean-Flow award. On normal banking roads:
- Additional craft bank up to **0.099 radians** (~5.7°), smoothly recovered on GRIP release
- A spring-smoothed **0.62m camera shift**, **0.45m camera pull-in**, max **0.038 radians** (~2.2°) of camera lean and up to **3.25°** context/GRIP FOV lift
- Twin engines visibly power up through the existing lights, exhaust and core scale; **no added particles, draw calls or post passes**
- Real skill reward still requires held GRIP, nonzero yaw and clean rail-free exit, now requiring ~0.18–0.22s genuine GRIP in authored corners versus ~0.27–0.40s in 0.12.0. Each window remains once per lap.

All new animation is forcibly suppressed in the real **70° magnetic wall**, **360° corkscrew** and airborne tricks to avoid destabilizing the physical horizon. 120Hz steering authority, air trick, boost multipliers, lap geometry, collision and speed remain unchanged.

## 3. Less clutter
Removed 0.12.0’s two roadside monument batches (four sculptural wings), described by the user as new poles. No replacements or screen streaks; **two fewer render draw batches** versus 0.12.0, all else equal.

## Quality and instrumentation
- 10 deterministic tests for 4GB baseline ON, persistent OFF, explicit URL override, benchmark priority, meaningful live GRIP responses, 30/60 FPS convergence, frozen pause, zero-response in wall/corkscrew/air, real clean carve, blocked wall-contact rewards, reset.
- Retain all previous physics, camera, shadow-tunnel, rail-sparks, device controls and 0.11.4 Fidelity unit regressions.
- WebGL smoke verifies active production shader, default adaptive DPR, zero scenery additions and live Power Carve response.
- Audit `visual.smartVisualFidelity` now reports choice source, defaultOnLowMemory, userRequestedOff and adaptive-resolution state. `visual.racingExperience` and `run.precisionFlow` expose actual peak carve, camera and engine response.
- **Device performance cannot be verified from deterministic tests.** Compare real runs with Fidelity ON/OFF *in 0.12.1*, noting changing resolution and thermal state. Do not claim a guaranteed FPS increase.

## Run
[Normal 0.12.1](https://hajjen-game.github.io/Hajjen/skyshift/?v=0.12.1)
[Force Fidelity OFF](https://hajjen-game.github.io/Hajjen/skyshift/?v=0.12.1&fidelity=off)
[Fixed quality Fidelity ON benchmark](https://hajjen-game.github.io/Hajjen/skyshift/?perf=1&perfPreset=fidelity-on)

## Playtest priorities
1. On A51 with default Fidelity ON, compare sharpness, FPS and lag after lap 1 with adaptive HDR still enabled.
2. Hold GRIP through the early Precision Apex and S-complex. Does hull/camera/engine now feel distinctly more responsive? Is it too much?
3. Check no extra camera roll interrupts the corkscrew and that Shadow Tunnel, zone white-core and existing rail sparks remain intact.
4. Try Fidelity OFF from the starting menu (reload) and check whether the choice survives a new launch.
