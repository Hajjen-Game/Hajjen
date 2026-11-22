# SKYSHIFT 0.13.4.2 — Stable Hover & Faceted Mechanical Tail

## Why we rolled back
Actual Samsung A51 feedback on 0.13.4.1: the dynamically compensated wing height made steering turns feel jerky/knocking and unpleasant. The enlarged V3 tail still looked like a rounded segmented intestine rather than an engineered articulated tail.

**0.13.4.1 is explicitly withdrawn as the active release.** The new `game-v01342.mjs` is branched from the original **0.13.4** game, with **NO imports or calls** to `wing-clearance-v01341.mjs`. The old sampled clearance/hysteresis, 36-point per-frame world transform, ground-roll clamp, and ad hoc rising/falling visual lift are gone. Historical files remain in GitHub for audit; they are not loaded and not part of active unit tests.

## Exact changes

### Smooth original turning restored
- `ship.rotation.z` = the original `motion.roll - bankAt(view.s) - trickVisualAngle ...` from 0.13.4, **unchanged**.
- No changes to `stepFlight` (120 Hz), steering authority, GRIP multiplier, Power Carve, rail collision radius, banking, camera, track geometry, ghost, time trial, zone wave, Fidelity or adaptive quality.
- Zero new game-loop clearance allocations or terrain queries.

### Less visual wing clipping by small static changes
- Stingray ship (entire group, including its animated segmented tail and the attached twin engines): **uniform visual scale 0.90**. Wing half-span is now approximately **3.64 m** in world space, versus 4.04 m in 0.13.4.1. Manta Blade remains scale 1.
- Stingray render root receives a **constant +0.18 m lift along the road normal** on every frame (including travel over the Skyline Leap lip, so there is no grounded/airborne correction snap).
- The physical position/state **is NOT raised**, so speed, gravity, collision, rail scrape and camera target remain completely original. The offset has **no dynamic wing-proximity feedback**, release spring or sudden correction. It is not an assertion that no wing can ever clip on every bank; it is the user-requested simpler solution to test.

### Mechanical tail, not biological tubing
- `stingray-evo-v01342.mjs`: original nine spring-driven hinges, lower yaw and pitch targets, increased damping **0.84**, shorter per-segment neon ticks, reduced idle wave and lower max joint yaw. Still follows direction of steering, GRIP, boost, and a subtle neutral idle.
- `assets/ships/stingray-evo-hero-v4.gltf`: a real V4 glTF, **34 mesh batches, 4184 triangles, 9 materials** (same budget as V3). The body/wing/canopy and engine shapes are deliberately unchanged in this bugfix/art-smaller patch.
- All nine tail plates are now planar/sharp-edged beveled polygon armor with separate front collars and short trailing tips. Plate length **0.548m** (from z=.02 to .568), leaving clear visible mechanical joint gaps within the existing **.68m pitch**. The maximum width reduces toward the tip; the old rounded normal interpolation is avoided through per-face vertices.
- Original articulated joint names, original twin-engine sockets and existing wing flaps remain.

### Hangar
- Keeps the 0.13.4 stable three-quarter Hangar. Scale applied to the entire ship/camera-local anchor means the ship remains legible while looking visibly smaller in race.
- Old menu/Ghost/Fidelity setting interface is unchanged.
- When Stingray Hero loads: `HERO 4.0 · PANSARSVANS · STABIL SVÄNG`.

## Technical scope / test status
- The V4 source generator is checked in at `blender/stingray-hero-v4-source-v01342.mjs`; the self-contained exact V4 glTF is published at `assets/ships/stingray-evo-hero-v4.gltf`. A new Blender converter `blender/convert_stingray_hero_v4.py` and existing GitHub Action can make editable `.blend` and binary `.glb` artifacts. Successful Blender/CI execution has **not** been verified.
- Source-level tests check a real reproducible 3D asset, nine shortened plates, decreasing physical widths, preserved tail movement, static presentation values, original steering/roll source, Manta/classic fallback and unchanged UI.
- The Chrome/WebGL smoke was updated to test **no dynamic solver**, static scale/lift, actual V4 model, and the calmer living tail. Chrome/WebGL results and Samsung FPS/playtest are **not yet verified**.

## How to test
- Active: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.2
- Original procedural craft comparison: https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.2&shipArt=classic
- Select STINGRAY EVO in Hangar and check that the tail now has angular, clearly separate metal sections and remains lightly animated.
- In races: make a few full-steering and GRIP turns at zone 1/2 including the corner near the wall. Look for absence of snapping/knocking, smoother banking, and less contact of the lower wing with the visual track. Also check the leap and wall/corkscrew.
- Export the run audit and compare FPS/frame p95 with 0.13.4 under matching Fidelity and phone thermal conditions. If a wing still intersects in a specific bank, prefer changing the static art geometry or stable hover offset, NOT bringing the dynamic sampler back.

## Design note
The new tail is deliberately less rounded and less wavy, not yet the final concept-art-quality metalwork. We should get the natural driving feel back first, then iterate the sculpt based on actual mobile screenshots.
