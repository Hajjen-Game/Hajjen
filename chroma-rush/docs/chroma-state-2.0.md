# Chroma State 2.0 — Multilayer Neon Transformation

## Intent
Make the 90% Flow milestone feel like a full *mode transformation*, not just
a higher score multiplier and faint square halo. The runner is still a white
square seen from a fixed side-on 2D camera: preserve its crisp silhouette and
all incoming obstacle/gap cues.

## Choreography
1. **Activation (first 0.62 s)** — When the player's actual Flow tier enters
   Chroma State, a single brief ground-line pulse and detached frame echo
   appear at the square, accompanied by a small colored particle release and
   an original, rising three-voice synthesizer cue. No full-screen flash.
2. **Sustained transformed square** — An 8/5/3-filament (High/Balanced/Performance)
   energy wake streams backward at run speed. Two lightweight light rails and
   four detached luminous corners surround the square without drawing rings
   or touching hitboxes. Both jump and duck poses remain recognizable.
3. **World resonance** — A low-opacity atmospheric glow and a few horizontal,
   offset prismatic streaks bring the world to life. These are composited
   before the terrain, obstacles and player so they cannot veil hazards.
4. **HUD and reactive audio** — The existing Flow meter, Chroma name and 2×
   multiplier gain restrained neon glows. A soft extra melodic shimmer is
   audible in non-RELAX music phases. The synth soundtrack and sound effects
   retain independent mute controls.
5. **Exit** — When the Flow model actually leaves Chroma State, the visual
   layers fade out in 0.26 s. A new entry never fires repeatedly within the
   87–90% hysteresis window.

## Non-negotiable gameplay boundaries
- Flow Balance 1.2 remains unchanged: enter at 90%, leave below 87%,
  2× obstacle score bonus while active, 35-point penalty on a normal hit.
- No extra buttons, dash, shield, slow motion, speed change, new physics or
  modifications to Director patterns/terrain.
- All Chroma VFX are deterministic cosmetic math (no new `Math.random`
  calls, particle pool, external textures, WebGL, timer, or shader allocation).
- Visual layers are gated by `prefers-reduced-motion`; the static HUD and
  original gameplay-tier feedback remain. Effects scale with existing
  High/Balanced/Performance quality presets. No circular ring effects.
- Effects are updated only during live fixed-step simulation and reset
  between runs. Pause cannot advance their time.

## Test plan
- Pure Node unit tests for entry/exit latching, 90/87 threshold behavior,
  fade timing, reduced motion, bounded draw operations, mobile quality scaling,
  deterministic simulation time, duck state and audio cue.
- Existing game smoke, Director/terrain, Flow, replay and audio tests.
- Chromium visual checks at 1440×600, 900×410, 740×360, 640×330 capturing
  baseline, activation, active and ducking states. The Canvas must differ
  from the baseline while the underlying Flow/score model is unchanged.
- On-device review for contrast against nearby jump/duck obstacles, entry
  effect audibility and smooth performance on modest Android phones.
