# SKYSHIFT 0.10.0 — Fleet Foundation & Stingray EVO

## Two racing ships
**Manta Blade** remains the original starter with its existing physics and
visual silhouette. **Stingray EVO** is a new procedural 3D stingray-inspired
craft with broader, curved manta wings, two original thrust positions,
indigo titanium and a nine-link segmented tail with violet emissive trim.

The tail counter-steers with real player input; GRIP increases bending,
boost straightens the chain, and jumps generate a restrained wave along
the segments. Animation uses frame-rate-independent smoothing and does
not steer the vehicle, change its collision size, or alter camera math.

## Hangar and progression
A minimal ship-select Hangar is available from the start menu and the
results screen, with the **actual rendered 3D spacecraft**, not an image.
Stingray can be previewed even while locked. Completing the full
three-lap race unlocks it, persistently via localStorage. Previous
successful clears recorded by earlier versions count as well.
Choosing an unlocked craft saves the selection; previews alone do not
equip locked ships. Blocked/malformed storage gracefully falls back
to the starter ship.

Both ships have **exactly the same flight physics** at launch to keep
the 0.9.0.1 GRIP steering study valid.

## Files and tests
- `fleet-v010.mjs`: pure registry, unlock/equip, persistence validation
- `stingray-evo-v010.mjs`: generated wing contour, nine tail joints,
  normal steering/GRIP/boost/air movement
- `game-v010.mjs`: safe ship swapping, live WebGL Hangar orbit, unlock
- `fleet-v010.css`: responsive landscape Hangar
- `fleet-v010.test.mjs`, `stingray-evo-v010.test.mjs`
- `browser-smoke-v010.mjs`: full Chrome/WebGL regression, Hangar preview,
  persistent equip, 760m blackout tunnel and Android thumb HUD

## Playtest
https://hajjen-game.github.io/Hajjen/skyshift/

Open HANGAR. Preview the locked Stingray's tail, check the ordinary steering
sway and increased movement during GRIP. Finish a full race (or use an
already-recorded clear) to equip it. Repeat the dark tunnel to inspect
its purple tail and preserved twin engine glow.
