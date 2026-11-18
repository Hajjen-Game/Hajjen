# SKYSHIFT 0.16.3 — Aurora Glancing Contact & GRIP Isolation

## Why a third rail correction?
The player's subsequent **0.16.2** Android Aurora Run performance log confirms the previous fix was only partial. It repaired the replay/track-progress metrics but did **not** repair the *perceived* moment of contact, especially while steering/GRIP.

Actual log:
- **11 separate rail impacts**, **30.82 seconds** of contact and **214.99m** of rail speed scrub.
- **1357 active automatic heading corrections** and up to **21.9° of excess heading above the 30° outward rail threshold**. The 0.16.2 solver changed heading instantly by the *full excess* on any contact tick. Thus a player with 50° outward heading could have a **~20° pilot/camera yaw step in a single 120Hz physics tick**, irrespective of GRIP. This is a concrete bug visible in source.
- Grip **27 activations / 21.52s active** (versus 17 / 11.51s in the prior run).
- Actual lap-3 rail contact **at s=9852m**, about 348m before the race finish, preceded by a GRIP activation at 9801m.
- **0 reverse-projection ticks, 0 invalid ghost samples** in 0.16.2; 0.16.2 solved the wrong source of the felt jerk.
- Average **41.5 FPS**, p95 frame time 50ms; rendering remains a separate consideration.

## 0.16.3 implementation
1. Replace the 0.16.2 discontinuous collision `heading=tangent+side*.52` with **bounded angular impulse**. Every 120Hz rail contact may bleed off *at most 1.9 rad/s*, or **0.91° per physics tick**; actual angular demand depends smoothly on how far the vehicle's nose is through the collision plane. An initial ~22° overage settles over multiple frames, not instantaneously. No direct camera adjustment.
2. When physically pressed against a side rail, outward steering demand (including GRIP) is blocked by that wall; **steering inward away from the wall retains the full existing GRIP authority**, original steering response, yaw acceleration and release. The contact suppresses outward torque only at an actual real guardrail hit, and never applies a road-following magnet or an impulse in open space. Skyline remains unchanged.
3. Preserve the same forward-only physical projection as 0.16.2, world-coordinate track and road/rail render meshes, pilot engine, speed and GRIP multipliers, wall penalties, and record keys. No new risk lines.
4. Add **actionable game audit diagnostics**: `railMaxInstantCorrectionDegrees`, `railMaxSingleStepYawDegrees`, `railGripBlockedTicks`, and up to 16 real rail-impact records (`s,t,side,speed,headingErrorDeg,gripHeld,gripIntensity,steer`). These are recorded on *actual new collisions* without per-frame allocations.
5. Keep 0.16.2 ghost records and PB values compatible, as underlying tracks and Time Trial fingerprint are unchanged.

## Testing contracts
- Direct regression reproduces a roughly **21.8° single-tick abrupt rail yaw** in archived 0.16.2 at the player's s=9852m last-corner contact. The 0.16.3 equivalent must be **under 1°**.
- Both left and right barriers, including s=3139, 8141, 9852 and 10060m, converge *smoothly* toward a glancing heading.
- Actual 120Hz simulation at **10 identified wall positions** with GRIP and **8 with GRIP held off**, verifying no backwards arc progress, no ghost rejects, no world-space teleport, and per-step turn continuity.
- Assert inward pilot/GRIP steering remains fully available during contact, while outward GRIP demand cannot continue spinning the craft into a solid rail.
- Compare exact free-road dynamics, GRIP authority, track coordinates, curvature, collision width and render-camera roll against 0.16.2 — all unchanged.
- Chrome WebGL loads both circuits, reaches the last corner through the opt-in test hook, runs physical collision tests and confirms Skyline's real corkscrew and risk lines.

### Limits and next gameplay question
The final 180° turn radius ~120m at 101m/s needs ~0.84rad/s yaw. Ordinary full-speed steering supplies ~0.50rad/s, while GRIP can provide ~1.21rad/s. This is a true *course-design GRIP requirement* at the fastest speed (not the collision bug) and should be evaluated based on player feel rather than silently weakening GRIP globally. Physical Android playtesting is still essential; a passing CI test cannot prove racing *feels* good.

Play directly: https://hajjen-game.github.io/Hajjen/skyshift/?track=aurora&v=0.16.3
