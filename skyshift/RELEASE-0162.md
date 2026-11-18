# SKYSHIFT 0.16.2 — Aurora Rail Contact & Forward-Progress Integrity

**Player report (18 Nov 2026):** On 0.16.1 Aurora Run, collision with a curved guardrail sometimes causes a severe visible gameplay error, particularly at the end of lap 3. A new game audit captures the phenomenon.

## Evidence from the player's real 0.16.1 log

- 3 laps completed in 168.03s, with no crashes or damage.
- **8 distinct rail contacts**; **31.16s** total wall-scrub time, **245.64m** speed lost.
- One recorded **left-rail contact at s=9867m, ~333m before finish**; other contacts at s=1402, 5776, 6452, 7299, 8137, 8817 and 8898.
- Worst heading error **107.8°** and **481 rejected Time Trial ghost samples** despite no crashes.
- Ghost capture explicitly rejects nonmonotone progression in `captureTimeTrialSample`. The old projection solver had a 4m backwards tracking window and 10m forwards window. In a curved wall where the pilot continues steering into the rail, the ship's world-space position is clipped to the rail while yaw can rotate through >90° relative to the road tangent; projected race distance may rewind and then repeatedly reject ghost frames. This is a source-backed hypothesis from log+code, and specifically stress-tested in the new build.
- Average observed FPS **42.168** (improved from 33.237 in 0.16.0), p95 50ms, with no GPU timer. Additional rendering tuning is **not** the current physics fix.

## Narrow, gameplay-correct repair

`trial-v0162.mjs` changes *only Aurora's* wall-contact and forward-progress arbitration:

1. **Physically forward-only progress:** Aurora's local world-to-track projection begins at the current `s` rather than `s−4m`. Max advancement per 120Hz physics tick is also bounded by the pilot's actual world travel plus 15% numerical tolerance; no 10m jumps. Both restrictions are Aurora-only.
2. **Tangent glancing constraint while physically hitting the rail:** If the craft's nose is pointing outward into the contacted barrier, the contact plane prevents it rotating beyond ~30° into the solid wall, and damps the outward yaw *rate*. Steering away remains 100% pilot controlled; no road-centerline magnet, no extra rotation impulse in open road, no automatic throttle. Interior road and Skyline steering response are untouched.
3. **Diagnostic ownership:** `railHeadingCorrections`, `railMaxBlockedYawDegrees` and `reverseProjectionTicks` are exported in subsequent game audits. This makes any recurrence observable, rather than relying on a camera-video guess.
4. Active game, shared cinematic rig, unified motion, rendered 3D guardrails and contact sparks explicitly share the new track-aware physics module; rendering and physical rail width/geometries remain identical.
5. Versioned bootstrap `0.16.2`, original Aurora Run/old PB data and Skyline Circuit are preserved. No risk lines introduced on Aurora.

## Regression acceptance criteria

- Seven deterministic **actual 120Hz** impact points sourced from the report, including s=9867m in the last hairpin.
- Opposite-rail pressure and subsequent countersteering over multiple seconds.
- No backwards arc movement, no per-tick 10m projection snap, no world-space teleport, no nose rotation through the physical rail, no invalid Time Trial ghost capture.
- The entire 3400m centerline, elevation/roll, rail limits, ship steering, speed/GRIP timing exactly match previous Aurora baseline.
- Chrome WebGL loads both tracks, reaches the final corner via test hook, executes live physics stress scenarios, and preserves original Skyline corkscrew, risk lines, and Challenges.

### Play
https://hajjen-game.github.io/Hajjen/skyshift/?track=aurora&v=0.16.2

### Verification limits
The production log does not record every 120Hz heading/s coordinate, so it cannot prove which individual contact caused every one of the 481 rejected ghost samples. Instrumentation and stress tests target the directly identified numerical and collision failure modes. Human mobile playtesting remains essential.
