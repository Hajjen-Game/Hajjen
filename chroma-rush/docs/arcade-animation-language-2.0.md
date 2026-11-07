# Arcade Animation Language 2.0 — CHROMA RUSH

## Design intent

Unify the game's most rewarding player moments into a readable, physically
consistent **side-on neon motion grammar**. Avoid piling more random particles
on top of Speed Trails 2.0, Chroma State 2.0 and Spectral Wave 1.0.

Gameplay and difficulty remain **identical**: the renderer never touches hitboxes,
score, Flow, speed, terrain, Director, inputs or collision outcomes.

## Seven action signatures

| Real game event | Short-lived cue | Duration |
| --- | --- | ---: |
| Player actually launches (incl. buffered/coyote jump) | Back-and-up diagonal neon launch slices, layered behind square | .28 s |
| Player actually lands | Opposed horizontal energy discharge parallel to floor | .31 s |
| Valid duck begins | Compressed cyan/palette streaks travelling backward close to floor | .23 s |
| Duck finishes | A small upward straight-line release spring | .24 s |
| Registered precision obstacle clear / near miss | Detached cross-cut accent behind square, stronger than routine clear | .40 s |
| First speed crossings 1.5×, 2×, 3×, 4×, 6×, 8× | A fast, multi-rail retrograde tail; never repeated while in same tier | .65 s |
| Confirmed Perfect Zone | Restrained horizontal local victory ribbons, complementing existing feedback | .72 s |

There is **no new Near Miss scoring mechanic**: the precise pass effect is
only produced when the existing Director genuinely records a near miss and
Flow receives the existing precision bonus.

The existing *groundPulse* and *frameEcho* assets are preserved for gameplay
clarity; their visual hierarchy is rebalanced by reducing redundant random
particles around jump, landing and Perfect Zone.

## Layering and performance

- All new cues draw **straight Canvas 2D segments only** — no rings, circles,
  radial overlays, large flashes, screen wobble, lens effect or shader.
- Directed jump/duck/precision/speed ribbons stay **behind the runner's x**
  so new effects cannot disguise incoming obstacles.
- Every cue is one entry in the **existing MAX_EFFECTS = 24 pool**; priority
  eviction keeps precision/perfect cues above routine dust and new cooldowns
  avoid spamming visual pulses during clustered clears.
- High/Balanced/Performance mode sets per-cue 3/2 support strokes and glow
  via existing `density` / `glow` profile numbers.
- The new cues are skipped for `prefers-reduced-motion`, while the original
  HUD, game state, audio and actions remain available.
- Animation time advances only in the game's fixed-step simulation update;
  pause freezes it; returning to menu, end of game or starting anew resets it.
- No `Math.random()`, extra DOM elements, image assets, timers, UI layout,
  draw-to-texture buffers or external dependencies.

## Verifications

- Node regressions verify 7 named grammar actions, fixed-step timing, pool
  bounds, cooldowns and priorities, reduced motion, actual speed scaling,
  spatial direction, hitbox independence and safe integration into game events.
- Browser visual audit checks each of the 7 cues on actual game Canvas across
  1440×600, 900×410, 740×360 and 640×330 viewports, captures images,
  checks state invariance and that precision remains visible at 0.30s but
  has ended by 0.43s.
- Existing world/Flow/Director/replay/zone/mobile tests continue unchanged.

## Playtest focus

At high speed on a real Android phone, judge whether the strong precision cue
is visible as a reward while ordinary jump/duck cues remain tasteful; check
there is no visual noise competing with the newly simplified mountain world.
