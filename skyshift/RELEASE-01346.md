# SKYSHIFT 0.13.4.6 — Ship Scale Ownership & True Width Parity

## Actual root cause found in Chrome
The 0.13.4.5 matched-camera test found Stingray wings 265px while a hypothetical Manta at the same camera pose would be 184px (44% wider). This was with the supposed Stingray static X scale of just 0.581, which should have made it narrower than Manta.

A code trace identified the actual conflict: `createTwinEngineFX().frame()` in `engine-trails-v0104.mjs` ran *after* `makeShip()` and overwrote `currentShip.scale` **every frame** with absolute values near 1.0. Every previous Stingray size reduction was silently overwritten during gameplay.

## Actual fix
- `engine-trails-v01346.mjs` captures the ship's configured static X/Y/Z root scale once and multiplies the established land/jump/speed/boost effects by those three baselines. No new shader, camera correction, or dynamic clearance probes.
- Stingray wing scale is restored to **5.80 / 8.08 = 0.71782**, because the true imported wing is 8.08m wide and standard Manta Blade is 5.80m. The prior extra 170/210 shrink is withdrawn.
- Y/Z remain .68; static road-normal visual lift remains +0.26m; relative cosmetic GRIP lean still gently caps at .25rad. The nine hinged tail plates, 120Hz steering, collision, real hover, camera, and wall/corkscrew mechanics remain unchanged.
- The QA-only projected-width probe now exposes the actual live root scale during a real Chrome race. WebGL CI checks the active glTF wings against Manta at the same camera transform and verifies the scale remains 0.718 while engine effects animate.

**Test:** https://hajjen-game.github.io/Hajjen/skyshift/?v=0.13.4.6
