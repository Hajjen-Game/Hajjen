# Replay Challenge 1.0 — One More Run

## Player loop
- Continue using Arcade Progression 1.0 for ranked score, zone and streak records.
- Snapshot score and distance personal bests when a ranked run begins.
- While running, show a compact score PB bar and once-per-run, nonblocking new-record cue.
- On Run Complete, display distance, previous bests, improvements and a personal next-run goal.
- Keep the existing instant RUN AGAIN control. Practice retries remain practice.

## Fairness and persistence
- No changes to Director, obstacles, acceleration, player physics or Flow scoring.
- Only completed ranked runs write to localStorage `chromaRushReplayV1`, at most once per run.
- Practice writes nothing and cannot claim score/distance record notices.
- Store best distance, best peak Flow, best single-run Perfect Zone count and last ranked
  run aggregate. No personal identifiers, telemetry uploads, ghosts or online leaderboard.
- Distance is game-world units, not calibrated real-world meters.
- Challenge progression responds to achieved capacity: Zone 03, 65% Flow,
  one Perfect Zone, Zone 05, then beating score PB.
- Existing Flow 1.0 score key migration remains unchanged.
- Blocked or corrupted storage is handled safely.

## Testing
Node regressions: `node --test chroma-rush/tests/*.test.cjs`
Browser audits: existing CI visual and mobile-polish scripts.
