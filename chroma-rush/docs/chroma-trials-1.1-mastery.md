# CHROMA RUSH — Chroma Trials 1.1: Mastery Course
2026-11-10

## Playtest response
Player found Trial 001's 28 hurdles and 90-second runtime too easy, but
confirmed the 90 seconds feels right. Retain duration, significantly increase
action density and escalation, preserve honest one-course competition.

## Revision 2 course
- Same TRIAL 001 identifier and 90-second limit, but a NEW course revision.
- Six authored action phrases: 57 normal Jump/Duck barriers (+104%).
- Cadence progression in seconds between encounters: 1.65 (introduction),
  1.35 (first attack), 1.28, 1.25, 1.20, 1.14 (closing sprint).
- Four real terrain gaps at authored positions (26.2, 41.5, 60.45, 78.9 s)
  with length scaling from 0.38 to 0.42 seconds of game speed.
- 1.8–2.1 seconds on each side of each gap to give a short real breather.
- Variation is NOT alternating Jump/Duck. The fixed phrases have 4 consecutive
  Jumps, Duck pairs and mixed runs; the final 15 seconds are demanding.
- No mandatory Dash, Double Jump, Gravity Shift, new hazards or input tricks.
  The course increases challenge by requiring successive accurate decisions,
  not by changing physics or forcing fake obstacles.
- No procedural input adaptation, random obstacle types, dynamic terrain,
  shield-dependent recovery items or player-performance modification.
- Trial speed uses the exact existing GAME.speedAt curve, so higher speed
  compounds the tighter response times naturally.
- The safety validator enforces physical Jump/Duck commitment plus traversed
  obstacle width + manual buffer, not an arbitrary fixed 2.5-second minimum.
- The safety validator checks all timed obstacles against real terrain
  canSpawnObstacle geometry, gap approach and landing margins, and rejects
  stretched impossible gaps / overlapping hazards.
- Cached HTML build marker and the course module asset URL are incremented.

## Record fairness
The first, very easy course used localStorage key `chromaRushTrialsV1`.
Harder revision 2 starts a new independent PB key `chromaRushTrialsV2`:
it would be unfair to compare records earned with 28 barriers against 57.
The earlier records are NOT deleted, simply not displayed for the new course.
The Arcade/Practice/Replay progress and records are untouched.

## Testing
Test deterministic plan generation, authored density and length, six-stage
pressure progression, non-alternating phrases, full physical collision width,
jump/duck commitment time, all four real gap segments, gap runway clearances,
bad-plan rejection, local record isolation and unchanged Arcade Director.
Run the complete game smoke and independent mobile/browser checks.
