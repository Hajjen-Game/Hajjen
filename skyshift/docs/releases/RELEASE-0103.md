# SKYSHIFT 0.10.3 — Premium Ship Readability & Living Tail

## Player feedback
The Stingray EVO's silhouette and material quality looked too simple on
mobile, and its articulated tail became almost completely motionless during
straight-line driving. The goal is a deliberately crafted indie-game look,
without distracting wiggles or sacrificing track readability.

## New premium surfaces (both ships)
- New `ship-polish-v0103.mjs` builds four **batched** visual-only mesh layers:
  raised satin shoulder facets, recessed contrasting aero channels, thin
  cool wing/cockpit accent strokes and precision twin engine bezels.
- Upgrades Stingray and lightly refreshes Manta Blade while preserving their
  different silhouettes and the same twin-engine socket locations.
- Gentle speed/boost/GRIP-driven seam brightness (without a UI pulse, new
  particles, dynamic lights, textures or new post-processing stages).
- Bounded to four extra static draw calls per ship and zero extra point lights.

## Living articulated Stingray tail
- Nine original joints remain, still following the steering direction,
  with inertial settling and stronger GRIP carving.
- New **travelling airflow wave** is produced even with zero steering:
  lower amplitude near the root, gently moving toward the last links.
- Slow speed-dependent lateral and vertical movements with a deliberately
  capped amplitude to avoid an animated snake.
- Boost partly stiffens the idle wave, while jump/landing impulses and
  deliberate turns remain dominant.
- Tail movement in meters is exported in the run audit as
  `peakIdleTipMeters` and `neutralSamples`.

## Technical preservation
- Flight, steering, GRIP calibration, physics, collision, 3-lap track,
  Kinetic camera, Shadow Tunnel lighting, HUD, Fleet unlocks and the
  **live racetrack Hangar** are unchanged.
- `manta-blade-v0103.mjs` applies the shared surface language to Manta.
- `stingray-evo-v0103.mjs` applies the surface language and idle wave.
- `game-v0103.mjs` invokes the polish layer only as a presentation effect;
  it does not pass any animation state into the pilot controller.
- `premium-ship-v0103.test.mjs` validates idle tip travel, direction,
  boost restraint, frame-rate safety and geometry budget.
- `browser-smoke-v0103.mjs` validates production WebGL, actual Hangar
  mesh, original race and tunnel, Android touch controls and straight-flight
  motion. GitHub Actions uploads Hangar/tunnel screenshots for review.

## Playtest
https://hajjen-game.github.io/Hajjen/skyshift/

Inspect Stingray in Hangar, then on a **long straight** without steering.
Watch for gentle rhythmic motion at the tip while the tail root remains
stable. Repeat with GRIP left/right and boost to feel the difference.
Examine whether the cockpit, wing facets and motor bezels read from the
gameplay camera at 2–3× normal speed. These are artistic decisions and must
still be judged through real play on a phone.
