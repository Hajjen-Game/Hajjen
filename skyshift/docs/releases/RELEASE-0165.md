# SKYSHIFT 0.16.5 — Fix GRIP Tricking Guard; Restore Original Aurora

## User report and exact root cause
The player repeatedly observed a striking symptom on Aurora: HOLD full steering and press GRIP, yet the craft continues nearly straight — apparently worsening later in a lap or after hitting the rail. Skyline did not behave this way.

The actual code revealed a 93.5% yaw-authority suppression bug on a track with **zero jumps**:
```js
const preArming=control.grip===true&&st.grounded&&
 lapS>=SKYLINE_LEAP.approachStart-40&&lapS<SKYLINE_LEAP.start&&
 st.lastJumpLap!==st.lap;
const tricking=control.grip===true&&
 ((!st.grounded&&st.trickLaunchLap>0)||preArming);
const desired=input*TRIAL.maxYawRate*yawFactor*
 (tricking?AIR_TRICKS.yawAuthorityWhileTricking:1);
```
On Skyline: SKYLINE_LEAP.approachStart=515 and start=573, so only ~475–573m gets the intentional stunt preparation window.

On Aurora: the absent jump was modeled with SKYLINE_LEAP.start=**4100** (outside its 3400m lap), yet approachStart remained **515**. That made preArming TRUE for every GRIP hold from **lap distance 475m through the finish of EACH lap**. AIR_TRICKS.yawAuthorityWhileTricking=**0.065**, so a pressed GRIP button actively **removed 93.5% of yaw** (while the UI continued to display GRIP correctly). Wall collisions were incidental, not the primary trigger.

This also explains why earlier tests of identical steering on the two circuits failed to detect the bug: they sampled the **first 64 ticks from the starting line** (well before 475m). Previous rail tests did not hold GRIP in the middle of an actual full race.

## Correct fix
In `trial-v0165.mjs`, stunt preparation additionally requires `Boolean(nextGap(st.s))`. On Aurora, `nextGap` is always null, because it has **no genuine gaps**. Thus pressing GRIP never switches into air-trick handling. On Skyline, the genuine jump returns a valid upcoming gap and its original approach behavior remains intact.

No new steering, grip, yaw, collision, camera or projection profiles; no per-track branch in the physics integration. Same original physical engine for both circuits.

Add useful **gripPreArmTicks** and **gripYawSuppressedTicks** to the JSON game audit. Both should remain **zero** in all genuine Aurora gameplay; Skyline should increment them only around a real leap or airborne stunt.

## Restore Aurora's pre-0.16.4 geometry
The player's diagnosis shows the earlier widening of Aurora's two 180-degree corners was not the correct fix. This release restores exact 0.16.3 source contents of:
- `circuit-layout-v0160.mjs`: original 12 authored sections and the 180° switchbacks (~125m and ~120m radius).
- `track-3d-v0160.mjs`, `racing-experience-v0160.mjs`, `track-selection-v0160.mjs`, `time-trial-v0160.mjs`: original elevation/roll profile, rhythm windows, track fingerprint and saved PB/ghost record key.
- Aura cue locations in `game-v0165.mjs` match the restored geometry.

Existing Skyline track, ships, HUD, and all shared vehicle physics stay unchanged. Existing original Aurora PB/ghost returns, its records are not deleted; the briefly shipped 0.16.4 course remains archived in Git, separate from restored Aurora.

## Regression testing
- Directly compare the **buggy archived** `trial-v0164.mjs` against the fixed `trial-v0165.mjs` under identical full-steer and GRIP commands. Reproduce the yaw collapse without touching a rail after 475m on all three laps.
- Repeat with forced **left and right wall contact** at ~350m before finish on lap 3. This must not resurrect yaw suppression.
- Confirm actual Skyline stunt pre-arming still works near 500m, but not earlier or after landing, and both old/new Skyline physical outputs remain identical.
- Confirm actual 120Hz steering, GRIP, camera and collision parity for both tracks on open road.
- Verify in Chrome WebGL on both tracks, with a real in-browser physics test at Aurora s=510,1450,4750 and 9852m; Skyline still has real leap, wall and corkscrew.
- All production gates remain active and must pass before treating the fix as complete.

Play: https://hajjen-game.github.io/Hajjen/skyshift/?track=aurora&v=0.16.5
