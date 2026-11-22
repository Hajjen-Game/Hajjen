# SKYSHIFT 0.13.4.8 — Gameplay First: GRIP Half-Power

## Why
The GRIP control turned too sharply. Both craft share the same pilot-owned 120 Hz steering logic. At low speed normal yaw authority is 0.69 vs GRIP 1.55; at max speed normal is 0.40 vs GRIP 1.55. The old grip bonus grew much larger relative to normal steering at high speed.

## Controlled change
- Half the **additional GRIP turn authority**, not the full yaw: `fullGrip = normal + .5 * (1.55 - normal)`.
- At 44m/s: 0.69 normal, **1.12** full grip (old 1.55).
- At highest speed: 0.40 normal, **0.975** full grip (old 1.55).
- Same 85ms activation, 140ms release, yaw smoothing, steering deadzone, grip-speed penalty, boost, camera, road, race mode and ship presentation. Both ships share identical new handling.
- New versioned steering module and runtime trial module prevent historical v0.9 and v0.13 tests from being retroactively changed.

## Note
The existing narrow 14m GRIP apex was designed for stronger full-GRIP authority. Testing must check whether it remains fair at later speed zones; **this patch does not quietly soften that track**. Next gameplay iteration should follow player feedback, not visual art polishing.

**Play:** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.8
