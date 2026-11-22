# SKYSHIFT 0.16.1 — Aurora Camera / Track Integrity Hotfix

## Reported by player, confirmed by real game log
The first 0.16.0 Aurora playthrough completed three laps but felt buggy: the whole track appeared to spin in the final corner and other elements felt wrong.

Audit evidence from the 18 Nov 2026 Aurora recording:
- 3 laps, 161.78 seconds, 10,200 m, no falls.
- Physically banked road peaked at only **6.88°**.
- Yet camera reported a 360°/corkscrew profile at an old Skyline arc range.
- 9 physical rail-contact events, 35.47s in contact, 254.9m of cumulative scrub loss; heading error peaks at 67.8°.
- 33.24 observed FPS, p95 frame time 50ms, 1,380 spikes above 33ms, 212k median triangles. JS physics average only 0.66ms per frame; GPU timing was not collected.

## Confirmed root cause: phantom camera corkscrew
The original `cinematic-v0901.mjs` imports `heightAt`, `bankAt` and `CORKSCREW` from `trial-v0901.mjs` (old Skyline geometry). Aurora's actual 3D bank stayed within ±0.12 radians (6.9°), but `cameraBankAt(3180)` followed **Skyline's unwrapped full 360° road roll between 3005–3338m** and `chasePose` looked ahead at the **wrong course elevation**.

**Fix:** `cinematic-v0161.mjs` imports the track-selected `trial-v0160.mjs`. The **shared active rig** `unified-flight-v0161.mjs` now imports precisely this corrected camera module as well. This removes the false Aurora 360° while preserving Skyline's actual, intentional 360° corkscrew camera behavior.

## Other stale course data removed
- `rail-scrape-sparks-v01091.mjs` also referenced the old Skyline physics. This explains sparkle sources appearing away from actual Aurora rail contacts. New `rail-scrape-sparks-v0161.mjs` uses the same local world position and normal as the active collision boundary.
- Aurora inherited a **RIGHT GRIP APEX** warning at s~650m with “3348m to funnel” despite having no 14m grip funnel. False cues now remain hidden on Aurora while Skyline's guidance is preserved.
- The fixed **SKYLINE LEAP** sign incorrectly appeared near Aurora s~650m due to periodic positional sampling of a disabled jump beyond the lap end. That sign is now Skyline-only; Aurora correctly displays “LUMEN PASS” ahead of its actual tunnel.
- The finished title reflects `AURORA RUN COMPLETE`, not the old Skyline circuit.

## Mobile frame pacing
The log showed CPU simulation cost far below the frame time, but *does not include GPU timing*, so GPU saturation is a hypothesis rather than a proved root cause. Aurora's 120m+ turn radii tolerate a wider rail mesh sample: 1.55m instead of 0.95m (worst-case arc sagitta about 2.5 mm). That cuts approximately 39% of Aurora guardrail surface triangles without changing the physical collision, steering, wing clearance, texture shader or original Skyline mesh.

## Preserved by design
- Aurora retains the same course geometry and three-lap layout, speed and GRIP tuning, PB/ghost record revision from 0.16.0, and zero Safe/Risk pads.
- Skyline retains the old layout, risk line pickups, true corkscrew and 8 challenges.
- The camera correction is **render-only** and changes no pilot yaw, lateral displacement or GRIP.

## Automated test contract
Node checks all Aurora camera bank samples against the physical road frame, reproduces and excludes the archived phantom 360° roll, checks camera look-ahead elevation and correct metal spark contacts, active JSX/DOM wiring, zero false grip cues, correct new signs, smaller rail mesh, and course/PB continuity. Chrome WebGL traverses both selectable tracks and checks the actual 3180m corner, camera, HUD and original Skyline behavior.

### Play links
- Aurora: https://hajjen-game.github.io/Hajjen/skyshift/?track=aurora&v=0.16.1
- Skyline: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.16.1

**Remaining design issue:** log indicates 35.47s contact with rails and 67.8° maximum heading error. These are not proof of code failure but suggest that hairpin difficulty and actual Android FPS deserve a separate paced handling/optimization pass, if player reports persist after the camera hotfix.
