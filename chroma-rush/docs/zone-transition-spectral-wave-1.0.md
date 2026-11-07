# Zone Transition Spectral Wave 1.0

## Creative intent
Each 12-second CHROMA RUSH zone change is a short visual highlight, not a global
fade. The incoming palette arrives **from the right**, sweeps left across the
2D world in about **0.92 seconds**, and then settles into the new zone.

The front is gently irregular and refracted: it is not a screen-wide flash,
circular pulse or hard rectangular divider.

## Visual sequence
- A new hue travels through the **parallax backdrop** and **terrain neon**
  via a clipped spatial recolor, with real old-zone colors on the left and
  incoming new-zone colors on the right.
- Obstacles and the runner use their **screen position** to sample the color
  boundary; neither changes color prematurely.
- A slim spectral seam adds a soft glow, a few horizontal prismatic streaks,
  and a ground-aligned line. The seam is intentionally drawn **under** hazards
  and the player so gaps and obstacles remain readable.
- When the front reaches the runner there is one short lateral ground pulse,
  a small rectangular-frame echo, and a restrained sparkle accent.
  The existing synthesized zone cue is synchronized with the crossing
  (unless a Perfect Zone cue already played).
- The existing ZONE title is timed to crest around this moment; the transition
  doesn't block input, stop acceleration, pause the Director or change any
  Flow/HP/score/terrain rules.

## Technical boundaries
- `src/render/spectral-wave.js` owns the deterministic front position, time,
  palette interpolation, spatial clips, and inexpensive line FX. No PRNG use,
  timers, offscreen texture allocation, shader passes or external assets.
- The game calls `tick(dt)` from its fixed-step update and composites the
  old/new world layers with Canvas 2D clips only for the transition window.
- Performance quality uses fewer accent strokes and less glow;
  clipping uses a bounded 12-segment path.
- With `prefers-reduced-motion: reduce`, the world changes instantly, no
  sweeping front is drawn, and the Zone callout does not animate.
- `spectral-wave-1.0` is the published build marker and query-tagged
  script/CSS versions, compatible with the existing safe HTML freshness probe.

## Validation
- Pure Node tests: right-to-left travel, per-position palette, clipping,
  crossing once, frame-rate independence, no ring geometry, performance
  reductions, reduced motion, and unchanged core rules.
- Existing gameplay regression tests validate controller/Director/terrain,
  Flow, audio, replay, and ranked persistence integrity.
- Chromium visual audit screenshots across four landscape viewports capture
  spectral entry, crossing, arrival and completion, and compare old-left /
  new-right background pixels against pre- and post-transition frames.

## Playtest checklist
Check a zone change with a gap or obstacle visible, a Perfect Zone transition,
late-zone high-speed play, and Auto/Performance graphics on a real phone. The
spectral front should register as a brief world-recoloring sweep rather than
a flash, with no missed cues or increased input latency.
