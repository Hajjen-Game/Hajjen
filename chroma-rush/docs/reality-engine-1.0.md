# CHROMA RUSH — Reality Engine 1.0 (opt-in prototype)
Date: 2026-11-11

## Intent and scope
A playable proof-of-concept for three unusual features, not an Arcade replacement:
- **World Fold**: two scripted, protected floor ↔ ceiling transitions in safe
  corridors, with restrained curved horizon cues. Uses the original canonical
  floor physics, shared terrain, existing jump/duck/dash and collision engine.
  The curve is a visual transition effect, **not yet a physical spline track**.
- **Sentinel**: a non-collidable, geometric antagonist in the sky during a
  fixed late-game action phrase. It responds visually to approaching authored
  obstacles but never generates extra hidden hazards or attacks.
- **World Symphony**: correct hazard/gap clears lift world lighting and thin
  atmospheric underlighting, without attaching more stripes to the player.
  Works with music disabled. No new score multiplier, collision logic or input.

## UX and isolation
- Main menu's TRIALS disclosure contains two peer choices: Mastery Trial 001
  (unchanged) and REALITY 001 · EXPERIMENT.
- Both use the same two existing thumb controls, pause/continue, trial timer,
  result panel and 90-second format.
- Reality has its own storage key **chromaRushRealityV1**, separate from
  Arcade scores and Mastery Trial 001 (chromaRushTrialsV2).
- Reality has a separate exportable local run log tagged mode='reality' and
  includes fold warnings/completions and Sentinel clear counts.
- Arcade's adaptive Director, procedural terrain, zone gravity scheduling,
  shield pickup, scoring and speed acceleration remain unchanged.
- Mastery Trial 001's course, score record and validator remain unchanged.

## Authored course
- 90 seconds, 50 normal Jump/Duck obstacles in six non-alternating phrases,
  with **two real terrain gaps**. No compulsory Dash, no new buttons or boss
  projectile collision.
- First World Fold warning at simulation time 34.0 s, aimed at ceiling.
  First fold is preceded by a clean movement recovery window, with following
  obstacles delayed until 41.5 s.
- Second fold warning at 55.0 s, aimed at floor. Next gap at 58.8 s, with
  a clearance buffer following the visual transition.
- Sentinel set piece from 61.5 to 86.5 s. The preauthored attack phrase is
  visible and uses exactly the same physical and collision rules as normal
  obstacles. The effect anticipates the *existing* next obstacle timing.
- No auto-return from the ceiling during Reality: only the second scripted
  Fold returns to normal. Arcade's timed ceiling return is retained.

## Determinism and safety
- Physical obstacle positions are preintegrated from the existing speed curve
  at 0.025s granularity. They do not depend on device FPS, graphics quality,
  player HP, performance, or Director confidence.
- Validator checks obstacle spacing against jump flight, duck commitment,
  collision traversal, takeoff/landing margins, and the two Fold corridors.
  Actual TerrainSystem.canSpawnObstacle acceptance is regression-tested.
- Fold starts only after the normal GravityShift warning expires and the
  existing safeShift predicate finds the player grounded, no dangerous nearby
  gap and no unresolved mechanic-intro obstacle. During Fold, the normal
  GravityShift protection and input restrictions remain in force.
- Reduced-motion users skip the fold animation while preserving the same
  orientation outcome and real collision mechanics.
- Sentinel/Symphony visuals use only a few Canvas 2D paths and translucent
  fills. No asset pipeline, continuous new audio, particles or server state.

## Manual playtest gates (not yet verified by human players)
1. On phone, confirm the two World Fold warnings are clear at 34s and 55s
   and the floor/ceiling remapping feels logical, not like a screen glitch.
2. Confirm all obstacle silhouettes remain visible during the transition.
3. Observe whether Sentinel at ~62s reads as an antagonist rather than an
   unimportant decoration, and whether attack anticipation is noticed.
4. Play with music OFF; check that Symphony still feels reactive.
5. Test HIGH/BALANCED/PERFORMANCE and reduced-motion, including landscape
   heights 330–410, and verify no flicker or frame spikes.
6. Export a Reality round log after completion or failure, and report fold
   completions, hits and the most confusing moment.

## Deferred, deliberately not included in 1.0
True curved-platform physics, alternative routes, time-delay Echo Twin,
interactive boss hitboxes, a shared ranked leaderboard, Portal transports
and Endless Director adoption. Those should follow only after hands-on
Reality Trial feedback and a separate feasibility/fairness audit.
