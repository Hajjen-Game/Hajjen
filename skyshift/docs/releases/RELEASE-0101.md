# SKYSHIFT 0.10.1 — Kinetic Tail & Hangar Polish

## Why
Player feedback after 0.10.0: Stingray EVO's nine tail joints were
physically present but looked like a thin, straight dark line, and the live
Hangar preview cropped most of the ship behind the left panel.

## Stingray EVO: tail physics of appearance only
- Nine independent faceted mechanical plates and thin emissive dorsal spines.
- Wider root that tapers to a narrow articulated tip, rather than a black rod.
- Real pilot steering/yaw demand bends the segment chain against the turn;
  GRIP increases visibly reactive curvature.
- Under-damped, frame-rate-aware spring settling introduces a short after-swing
  when releasing steering. Softer distal sections follow the stiff root.
- A restrained airflow vibration keeps the tail subtly alive while cruising.
- Boost pulls the spine straighter; takeoff/landing transmit vertical impulses
  down the links. Neon guide intensity reacts to grip, boost and motion.
- **No change to flight physics, GRIP calibration, collision, speed or camera
  rig in gameplay. No new point lights, shaders, particles or render passes.**

## Hangar
- The racing road and rails are hidden during Hangar inspection only, while the
  real WebGL ship, engine lights and existing star background remain.
- Ship remains in an independent showroom pose, 3/4 rear view, centered in
  the right-hand portion of the display with FOV 62°.
- Menu branding no longer overlaps HANGAR.
- Returning to the menu restores the road, and starting a run restores the
  original responsive chase camera and full gameplay geometry.
- Manta Blade, existing local-save progression and existing full-race unlock
  rule are preserved.

## QA
- `stingray-evo-v0101.test.mjs`: GRIP silhouette, damping and delayed settling,
  boost compression, airborne impulse, 30/60/120fps stability.
- `browser-smoke-v0101.mjs`: real Chrome WebGL rendering, 3D showroom camera,
  animated nine-link preview, save/equip, tunnel, controls and mobile HUD.
- Screenshot artifacts: `skyshift-v0101-stingray-hangar.png`,
  `skyshift-v0101-blackout-tunnel.png`.
- GitHub Actions run **43826925419** passed; captured Hangar peak cumulative
  tail bend 19.55°, no pilot physics changes.
- Playtest: https://hajjen-game.github.io/Hajjen/skyshift/

Next visual review: check full silhouette and whether the after-swing remains
easy to perceive on a phone at high speed without obscuring the racing lines.
