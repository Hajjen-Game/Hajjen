# SKYSHIFT 0.9.1 — Signature Flight Motion
**Release:** 2026-11-15  |  **Branch:** main

## Purpose
Make the Manta Blade feel alive and responsive, without masking the pilot's
GRIP-first steering decisions or destabilizing the Kinetic Camera. This release
changes **rendering feedback only**; the 0.9.0.1 physical controller, 120Hz
collision/landing judge, banked track and air-trick reward system are unchanged.

## What changed
- **Signature banking:** up to 2.7° normal and 7.2° additional GRIP-directed
  power-carve, scaled with real speed and yaw demand. This adds to existing
  flight-motion banking rather than replacing it.
- **Hull attitude and weight:** bounded pitch and lift suspension respond to
  air velocity, active GRIP, boost, launch and landing impulse.
- **Twin-engine choreography:** both inset exhausts react to speed/boost while
  their relative intensities, widths and engine-light strengths are split by
  actual steering + GRIP. No new meshes, dynamic lights, GPU passes or particles.
- **Camera coordination:** animated hull settles against existing chase
  framing. The complete 360° corkscrew, magnetic wall and voluntary 360°
  air roll suppress overlapping decorative banking. Existing Classic /
  Balanced / Kinetic options remain accessible via `?camera=...`.
- **Flight audit:** new `skyshift-signature-flight-v091-audit.json` tracks peak
  decorative bank, pitch, suspension, twin-engine split, launch/landing/boost
  feedback and protected bank frames.
- **Safety:** all presentation springs freeze on pause and reinitialize at
  the next run; authoritative heading, yaw, steering, physics and score
  remain on `trial-v0901.mjs`.

## Playtest
Open [SKYSHIFT](https://hajjen-game.github.io/Hajjen/skyshift/) and compare:
1. Normal steering in a shallow curve vs holding GRIP and steering in a sharper
   curve. GRIP should feel distinctly more mechanical, without a delayed input.
2. Watch each of the two exhausts through opposite turns and on boost pads.
3. Check airborne rotation, landing compression, magnetic wall and corkscrew.
   Decorative lean should never introduce apparent camera snaps.
4. Test on iPhone 16 and Android if available; note perceived vibration/jitter
   and any visible stutter at speed. Use the in-game audit export for measured
   render costs and motion peaks.

## Validation
- `signature-flight-v091.test.mjs` verifies frame-rate independence
  (30/60/120Hz), ordinary vs GRIP response, bounded land/boost motion,
  pause freeze, protected inversions and live integration references.
- `browser-smoke-v091.mjs` exercises the production ESM module and real
  Chrome + Android viewport in CI.
- Previous `game-v0901.mjs`, `boot-v0901.js`, physical trial and camera rig
  remain retained for inspection/regression.

**Important:** 0.9.0.1 steering calibration remains a player trial, not
a finalized approval. This release deliberately does not adjust that balance.
