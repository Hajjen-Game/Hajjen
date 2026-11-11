# Neon Circuit 1.1 — Track, Impact & Lap Integrity

Date: 2026-11-11

## Source: actual player testing
The player shared two Neon Circuit 1.0 screenshots and JSON run audits. The prior answer incorrectly interpreted three *recorded* laps as proof that the player only drove three physical laps. The player clarified unequivocally: they physically drove extra complete circuits, including one race they won, and those laps **did not register**. That observation was correct and must not be dismissed as slow driving.

Logs: 60.667s and 82.7s recorded for the player, with 22 and 36 edge scrapes. Both recorded AI finish times near 34–37s and zero AI edge scrapes, a mismatch amplified by the old repeated 45% speed penalty on contact. Records show 0 brake time, indicating that the player naturally steered rather than using the small Brake button.

## Root cause of missed laps
Old 1.0 `updateProgress` inferred laps from the nearest centerline projected distance, then silently rejected a projected delta larger than a small per-frame threshold. If projection briefly jumped due to an inside corner / edge / incident, the saved progress could fall more than the accepted distance behind the racer. All subsequent frames could also be rejected, until the nearest projection wrapped to that stale value. **An entire physically driven lap could go unrecorded.** The old JSON only knew accepted laps, so it could not be used to deny missed laps.

## New authoritative lap system
Physical segment crossing of four *ordered, full-width track checkpoints*: the start line (gate 0), quarter, halfway, three-quarter, then finish/start again. Each segment is scored by a signed plane crossing in the forward track direction, with lateral position bounded to the live course. This is shared identically for the human and AI. The first start-line crossing arms the lap, and each subsequent return after the three quarter gates records exactly one completed lap. Nearest-road projection is only used for bounded fractional ranking/steering; it cannot block actual checkpoint recording. A teleport/shortcut cannot award a lap by projecting forward. Run-log events now include checkpoint passes, physical gate count per racer, and `validatedBy:'physical-checkpoints'`.

## A clearer, friendlier course
The former busy S-bend outline is replaced with a horizontal closed rounded rectangle: two **long, straight top/bottom sections**, short vertical sides and four large tangent quarter-circle bends. The track remains wide and full-screen, with a clearly identifiable finish stripe. Cached raised neon rim strips give visual language for falling from high-impact collisions; normal corner errors only slow the cube a bit.

## Arena-style racing contact
Cube-to-cube impacts use real closing speed, Dash contribution, cooldown-based events and decaying directional impulse. A strong hit can send either cube over a ramp edge, briefly shrink/fade the cube into world depth and respawn near their last validated course position after 0.72s, with 1.22s collision protection. The fall **does not delete laps or restart the race**. Normal rim contacts are safe and have a small speed penalty, automatic inward recovery and a speed floor to prevent the old 'speed 5' wall stalls.

## Identity and quality
- Rush palette changes and speed escalation every 10s unchanged; shared center-out Chroma Pulse unchanged.
- Real four-cube racing, joystick, Brake and Dash unchanged.
- New directional five-stroke white/color impact animation based on Rush's angular arcade language; short dynamic impacts only, no high-cost particle showers.
- Cached static landscape renderer, full-width panorama, 750k backing-pixel mobile cap and adaptive pixel resolution remain.
- Neon Circuit Run Log 1.1 records gate passes, physical checkpoint lap validation, falls, respawns, knockouts, impacts and existing frame/zone data.

## QA and acceptance
- Real three-lap deterministic guided runs: assert exactly 13 ordered gate crossings including start + 3×(quarter/half/three-quarter/finish), three completed laps and working AI.
- Wrong-way crossings and shortcuts must not grant progress.
- Forced high-speed Dash impact ejects and respawns a racer without resetting lap counter.
- Edge recovery must not stall below meaningful speed.
- Chromium mobile and desktop joystick/Brake/Dash, JSON export, fullscreen and completion smoke.
- Real on-phone playtest still required for feel and competitiveness. **Do not claim that all physical laps were registered in the old version; the old logs cannot tell that.**

This work changes Neon Circuit only, leaving Runner, Clash and Trails intact.
