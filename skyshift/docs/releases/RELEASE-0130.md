# SKYSHIFT 0.13.0 — Time Trial & Personal Ghost System

## Concept
Time Trial is a separate, selectable three-lap mode on the existing 3,400m Skyline Circuit (10,200m total). It uses the **same** steering, GRIP handling, adaptive acceleration, lap geometry, jumps, boosts, magnetic wall and 360° corkscrew as START RUN. The ghost does not compete in physics or change the player’s speed. START RUN stays exactly as before.

### Time Trial selection
- Main menu includes **START RUN** and a compact **TIME TRIAL** button plus **GHOST ON/OFF**.
- TIME TRIAL is opt-in; normal START RUN never shows the ghost/time-trial timing row.
- A full race time is shown in centiseconds **MM:SS.hh**. After the first completed valid time trial, a locally stored PB appears in the start menu; the next Time Trial loads and races against it.
- The status line under the existing zone/lap HUD shows **Δ −0.86** for 0.86 s ahead and **Δ +1.20** when behind the personal best. Delta compares arrival time **at the same covered course distance**, not arbitrary elapsed or positional differences.
- Finish screen shows New Personal Best / behind PB / incomplete or invalid result. Existing fleet/hangar unlock and old classic fastest-time storage stay intact.

### Real-world personal ghost
- `time-trial-v0130.mjs` records **actual authoritative 120 Hz pilot flight** downsampled to 10 Hz, then linearly interpolates frames for playback. Each row is 8 compact quantized numbers: elapsed, absolute distance, physical world X/Y/Z, heading, roll, pitch.
- Reflects real left/right positioning and turn choices, not a spline centered in the road and **never automatic steering**.
- Validated PB record version and track fingerprint `skyline-grip-first-v0901|skyline-0130-v1|10200|3` to avoid old track incompatibility; records monotonic times/distances, correct final distance and 3 accurate lap times. Corrupted, partial, falling or backward/checkpoint-reset traces do not replace an existing PB. Only faster, successful clean three-lap attempts save a new best ghost.
- Record stored **locally in the browser** under `skyshift-time-trial-ghost-0130`. No cloud account, external leaderboard, telemetry upload or external ghost network. Max 3,600 samples / 340,000 characters.
- The player may disable the visible ghost without deleting the PB, and enabling again shows the saved trace. The ghost never races or repeats after its original finish time.

### Visual and performance budget
- `ghost-visual-v0130.mjs` uses a hand-assembled manta-like translucent ship silhouette with slender white-core edge detail; only **two batched draw calls**, **14 triangles**, **zero lights, collisions, shadows and extra post-processing passes**. Regular START RUN renders no ghost.
- No new track decorations, billboards, glow streaks or general-purpose particle systems. Everything in v0.12.1—including default vertex-space Fidelity on A51, normal adaptive HDR DPR and low-memory bloom—remains.
- Pausing stops the timer and hides the ghost; resume continues the same run. A restart discards the incomplete trace but never deletes PB.

### Robustness
- 12 new deterministic tests include best time replacement, failed/crashed runs, trace validation, real-world lateral deviations and interpolation, pace deltas, storage corruption, visibility opt-out, 3-lap geometry budget and time display.
- The release also retains original 0.12.1 Power Carve, Fidelity, device and rail-spark regression tests, plus a Chrome/WebGL smoke script that seeds a valid local PB, reloads, starts Time Trial, sees a ghost and validates HUD/recording.
- A developer-only audit/probe reports `timeTrial` and `ghostVisual` summaries, **not the personal 10Hz positional samples**.
- **Mobile hardware FPS/visual fluidity are not verified until a device playtest.** When user returns, compare A51 with Ghost ON/OFF and share log if needed.

## Links
- [Live 0.13.0](https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.0)
- [GitHub](https://github.com/Hajjen-Game/Hajjen/tree/main/skyshift)

## Suggested manual test
1. Start TIME TRIAL and drive three clean laps with no falling. During this first attempt, clock is visible but the delta is a dash because no ghost has been recorded.
2. At the finish, confirm NEW PERSONAL BEST / GHOST SAVED.
3. Press RETRY TRIAL, and watch the translucent personal ghost in the actual track; compare signed delta. GRIP, boosts, zone-wave and corkscrew should remain physically identical.
4. Hide ghost with the menu toggle, start another Time Trial, and confirm the clock + PB delta still work and the PB remains saved.
5. Try START RUN, confirm ordinary racing HUD shows **no Time Trial clock and no ghost**.
