# CHROMA RUSH — Phase 3 / Chroma Trials 1.0: Challenge Engine
2026-11-10

## Goal
A second, opt-in, deterministic 90-second mode. Arcade remains the ranked,
endless, player-aware mode; Practice remains unlocked by Arcade progression.

## Trial 001 — FIRST LIGHT
- Duration: exactly 90 simulation seconds, pausable with existing pause menu
- Fixed seed: `0xC80A2026`; course ID `001`; no network or backend
- Authored sequence: 28 normal Jump/Duck obstacles with precise time/position,
  curated action variation and three fair, short, physical gaps
- Physical x coordinates are integrated once from the **existing GAME.speedAt**
  speed curve; obstacle dimensions share the same speed-tier width contract
- Gap widths are ~0.29–0.31 seconds of travel. All have at least 1.6 seconds
  of recovery either side and require no mandatory Dash
- The start and end of the course are flat; no random slopes or procedural
  terrain additions. The generator's regular world drawing and collision
  checks read these same authored terrain segments, so no visual fake gaps
- The seed generates modest, replayable height variations within the normal
  Jump/Duck limits. It never changes obstacle types, time or spacing
- Challenge is fully precomputed, not adapted by health, skill, input,
  graphics mode, browser refresh rate or Director phase
- No player-adaptive Gravity Shifts or health-based Shield Core spawns in
  Trial 001; those mechanics remain exactly as before in Arcade. Future
  explicitly scripted shifts may be added only after deterministic auditing
- Score, Flow, precision, combo and zone color waves reuse the existing game.
  Inputs, collision, camera, physics and audio are unchanged.

## Integration
- Pure `src/gameplay/chroma-trials.js` owns plan, safety validator,
  deterministic course installation and TrialRecords.
- Game switches only course construction and hurdle source when `runMode==='trial'`:
  * Terrain is installed once from the plan
  * Adaptive Director/Unified Terrain Director never tick or prepare
  * Scripted world-positioned obstacles stage ahead of camera using the
    existing hurdle collision/clearance loop
  * HUD shows a calm countdown next to ZONE
  * Trial ends at 90 seconds or immediately when health reaches zero
- Main menu retains one prominent START RUN CTA. TRIALS is a fourth
  unobtrusive disclosure beside Practice/Milestones/Help, with one
  PLAY TRIAL action, fixed-course description and local best.
- Run Complete reuses the existing results panel and adds Trial duration,
  actual damage hits and the existing max combo; it keeps RETRY TRIAL.
- Trial records live only at `chromaRushTrialsV1`; best score is saved only
  after completing all 90 seconds. Early failures track attempt count but
  never overwrite best score. Existing Arcade, Replay, milestone and Practice
  records remain untouched.
- Export diagnostics retain the normal audit format, tagged mode='trial'.

## Fairness and limitations
- Trial 001 uses one common seed and course; its positions are offset to
  the logical player's starting position so all viewport aspect ratios have
  the same relative encounter timeline. Dash adds voluntary world movement
  and may shift arrival time, never the course geometry.
- A local PB is not a verified online leaderboard. Sharing challenge codes,
  daily resets, network rankings and anti-cheat belong to later releases.
- Player skill still affects score, Flow and survival, not course generation.
- Trial gameplay receives no extra graphics assets or continuous render loop.

## Regression audit
Determinism across repeated starts and seeds, all obstacle widths and bounds,
three real gap colliders and continuous landings, rejection of unsafe tracks,
local-only record integrity, Arcade/Practice isolation, one Trial menu action,
responsive/pause UI, and browser integration with 60 Hz fixed-step execution.
