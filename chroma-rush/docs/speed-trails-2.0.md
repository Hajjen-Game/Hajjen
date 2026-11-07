# Speed Trails 2.0 — CHROMA RUSH

## Design goal
Running fast should look fast *even outside Chroma State*. The two-thumb,
side-on 2D arcade camera must retain instant jump/duck/gap readability.

This release replaces the original static, repainted copies of the player's
current square with three coordinated, genuinely moving visual layers:

1. **Pose-history echoes.** At 45 ms intervals, retain a small, bounded
   history of the player square's size and height, including its prior jump
   arc and duck pose. Each echo moves backward according to travelled world
   distance, fades, and is capped by a speed-dependent trail reach.
2. **Continuous speed rails.** Two to four thin, parallel horizontal neon
   lines extend behind the square. Length increases gradually with speed,
   from a restrained launch trail to a long high-zone streak.
3. **Backward light fragments.** Short, narrow light marks emit from the
   square's trailing edge, travel strictly left, and disappear. Spacing,
   length, and the count of visible fragments adapt to speed and quality.
   No radial rings, wide flashes, or full-screen overlays.

Chroma State keeps its existing entry fanfare, square corner highlights and
ambient resonance, while Speed Trails owns the actual multi-filament wake
in both regular and Chroma play. That avoids duplicate trails in Chroma.

## Gameplay and rendering boundaries
- Cosmetic only. No score, Flow, HP, speed, Director, physics, obstacle,
  collision, jump/duck, terrain or input changes.
- No `Math.random` calls or PRNG consumption in the speed-trails module.
  Repeated tests with identical game inputs produce the same simulation.
- Canvas 2D only, no images, WebGL or offscreen buffers. At most
  **10 snapshots** and **36 small line fragments** are held in memory;
  rendering budgets are 7/4/2 echo silhouettes and 20/12/6 fragments for
  High/Balanced/Performance graphics.
- Trails render **after the terrain and below obstacles and the player**.
  The square remains solid white, and incoming obstacle warnings remain on
  top of the trail graphics.
- A real HP-damaging hit or failed gap clears the existing history and
  briefly weakens trails as a visual momentum break. This does not change
  Flow/HP mechanics; harmless contacts do not restart the effect.
- Changes in logical canvas aspect ratio clear the history. Starting a new
  run, returning to the menu and death clear it too.
- `prefers-reduced-motion: reduce` disables animated speed echoes and
  fragments entirely.

## Visual feel
The first zone gets a few tight light slices. At 1,000+ logical speed,
silhouette afterimages separate noticeably, neon rails stretch further,
and fragments form a readable backward stream. In Chroma, the same wake
intensifies without a competing second set of speed lines.

## Testing
- Node tests: speed-vs-reach, historical pose accuracy, strict left-only
  direction, capped memory, graphics scaling, damage interruption, reset,
  reduced-motion, deterministic fixed-step output, Chroma integration.
- Existing Director/terrain/Flow/audio/replay and game integrity tests.
- Chromium screenshots at 1440×600, 900×410, 740×360 and 640×330 for
  cruise speed, high speed, Chroma, duck and jump; check that the high-speed
  reach is actually greater and jump-history echoes retain past heights.
- Real-phone playtesting still matters for battery, glow and readability
  at later zones. The game's existing Adaptive graphics setting handles
  performance adaptation.
