# High-Speed Readability & Fairness Audit 1.0

**Project:** CHROMA RUSH  
**Date:** 2026-11-07  
**Scope:** Procedural JUMP, DUCK, Echo Spire, normal gaps, Echo Gaps, gravity inversion, mobile graphics and fixed-step simulation.

## Executive finding

At high speeds, the previous fixed obstacle-spawn position delivered decreasing human-visible response time even when a move was physically possible. Specifically, Echo Spires could mathematically be cleared with a double jump but were no longer recognizable early enough on narrow mobile screens. An additional interaction was found during implementation: moving hazards farther offscreen changes their *arrival time relative to other hazard types*, so safe spawn-to-spawn spacing does not automatically imply safe arrival-to-arrival spacing.

This pass adds **time-budgeted hazard spawning, actual-geometry offscreen warning, arrival-to-arrival recovery checks and per-run fairness telemetry**. Game speed, two-button input, jump/duck physics, HP/Flow scoring, hitboxes, original background and Gravity Shift remain untouched. Dash is not added.

## Baseline: why fixed-screen spawning fails

At a 1280 logical-unit viewport, a player at x=339 with approximately 22 units of collision half-width, and the old obstacle spawn x=1370, the time until its leading edge reaches the player is approximately:

`(1370 - 339 - 22) / speed = 1009 / speed` seconds.

The time after the obstacle **first becomes visible** at screen x=1280 is approximately `919 / speed` seconds.

| Speed (logical units/s) | Old total approach | Old on-screen approach |
|---:|---:|---:|
| 750 | 1.35s | 1.23s |
| 1500 | 0.67s | 0.61s |
| 2200 | 0.46s | 0.42s |
| 2800 | 0.36s | 0.33s |

These are **calculated engine distances**, not observed human reaction times. A two-press Echo Spire is not a reasonable ~0.36-second recognition-and-execution challenge, even if a perfectly preplanned input sequence could clear it.

## Implemented protections

### 1. Response budgets by action

Pure module: `src/director/high-speed-fairness.js`.

| Hazard | Design budget from earliest actionable cue |
|---|---:|
| JUMP | 0.57s |
| DUCK | 0.56s |
| Echo Spire / 2× JUMP | 1.00s |
| Normal GAP | 0.66s |
| Echo GAP | 1.10s |

These values are *initial design hypotheses*, intentionally distinct from reaction-time measurements of actual players. Individual hazards gain an additional ~0.06s nominal placement margin for leading-edge / fixed-step tolerance. They should be tuned with exported runs and playtests.

The game computes each obstacle's spawn position from **speed × required lead seconds**. At slower speeds, it retains the familiar x=viewportWidth+90 spawn. At fast speeds it moves only the **spawn point**, not the actual collision box, physics, player position or speed.

### 2. Early, specific, upright warnings

When an existing hazard is still beyond the screen edge **and** its natural on-screen visibility would be below the action budget, a restrained right-edge cue displays `JUMP`, `DUCK`, `2× JUMP`, `GAP` or `2× GAP`, with approximate time to contact.

It is driven by real spawned obstacles / generated gaps; it never guesses future Director choices. It stays upright in Ceiling Run, uses a high-contrast dark background, and avoids flashing rings, screen wash, additional particles and motion dependencies. If normal on-screen time is sufficient, **no advance warning is shown**.

### 3. Actual arrival spacing, not only spawn spacing

When action-specific spawn distances differ, a following duck or jump can reach the player too soon after an Echo Spire **despite safe spawn timestamps**. Adaptive Rush Director now preserves both existing spawn-time spacing and minimum **arrival-time** spacing, using the last successful hazard's lead time. A failing transition is deferred rather than spawned.

The Unified Terrain Director evaluates each obstacle's actual planned world x (not a single shared offscreen x); it continues to reject gaps, hostile slopes, unsafe Echo approach geometry and gravity-transition neighborhoods. The terrain generator extends its lookahead when speed requires a farther spawn.

### 4. Exportable fairness and mobile-performance evidence

Run exports remain **local-only**. Alongside existing speed/zone/Flow data, hazard spawn events now report:
- Total lead seconds until physical contact
- Required design-budget seconds
- Natural on-screen seconds
- Early-warning seconds and whether the cue was necessary
- Whether the minimum budget was met

A compact run summary aggregates measured hazards, required advance cues, minimum lead and any below-budget encounters, by movement action. Per-run performance adds the longest frame, count of frames over 33.4ms and 66.7ms, and fixed-step time dropped after stalls. The regular graphics-quality metrics still report render timing and frame p90.

No individual finger movement, identity or personal information is collected.

## Automated results

Command: `node chroma-rush/scripts/high-speed-fairness-audit.cjs`. The test suite also invokes the same report.

| Test matrix | Value |
|---|---:|
| Deterministic runs | **24** |
| Simulated game time | **4,320 seconds (72 minutes)** |
| Duration per run | **180 seconds** |
| Logical view widths | 900, 1280, 1600 |
| Random seeds | 7, 42, 101, 909 |
| Player models | Ideal clears; synthetic periodic damage/recovery |
| Obstacles analyzed | **2,206** |
| Necessary early cues | **974** |
| Under-budget obstacle warnings | **0** |
| Gaps generated too late for cue budget | **0** |
| Unsafe consecutive hazard arrival intervals | **0** |

The 24 runs are 3 widths × 4 seeds × 2 scripted difficulty conditions, with all run durations fixed at 180 seconds. The typical final speed for a zone-1 start is ~2,620 logical units/s. Node regression tests: **261 passed, 0 failed**, on the validated PR revision before documentation updates.

**These are deterministic, idealized scheduling and geometry audits.** They are not 24 recordings of a human playing, nor a physical 72-minute mobile benchmark. Zero violations means the measured code invariants held in this matrix, **not** that every possible generated run is guaranteed easy, fair or visually legible to every player.

## Mobile and high-stress visual checks

- Canvas rendering uses a fixed 1/60-second simulation clock with a capped catch-up budget. Extremely long stalls do not create giant physics jumps; the lost simulation time is now measurable in the exported log.
- Auto-quality mode still adjusts only graphics budget (resolution, glow, particles and render detail); it does not change terrain generation or the player's physical inputs.
- The offscreen warning is drawn once per frame in upright UI space, independent of the mirrored course. No new asset downloads or dependencies.
- Browser/mobile CI covers rendering, UI, controls and quality presets. **Real-device touch latency, display visibility and FPS must still be playtested** on both powerful and weaker phones.

## Recommended manual acceptance tests

1. Start a normal arcade run. Before zone 4, verify the simple JUMP and DUCK obstacles do **not** gain distracting extra warning labels unnecessarily.
2. Play into zones 7–12. Confirm that Echo Spire can be identified well before its first jump, including after Chroma color-zone changes.
3. In Ceiling Run, confirm the warning reads normally while the course is inverted, and that an upcoming gap/Spire never overlaps an unfair gravity transition.
4. Test an Echo Spire followed by a Duck Gate at high speed. Verify there is time for landing, duck recovery and a fresh input.
5. On a weaker phone, try the **Performance** graphics preset. Verify the warning persists in reduced effects. Export the round to inspect per-obstacle lead time and frame-stall counts.

## Follow-up tuning decisions

- After mobile feedback, adjust the action response-budget constants using actual player failure/near-miss logs. Do **not** use render FPS or quality-tier to change RNG or collision physics.
- Consider a user-controlled accessibility toggle for warnings only after testing whether the short HUD text is helpful. This pass deliberately does not add new settings or buttons.
- If high-speed hazard density falls too low, add authored fast reaction patterns that remain safe under arrival-time checks, rather than shortening the minimum fairness budgets.
- Review whether a color-zone transition's strongest glow needs additional softening specifically while a close hazard is visible; avoid broad visual redesign without A/B feedback.
