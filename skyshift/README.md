# SKYSHIFT 0.3.3.1 – Luminance & Atmosphere Rebalance

**Purpose:** Respond to feedback that 0.3.3 was too dark. Bring the track, panel materials, canyon and distant world back into a visible premium midtone range without recreating 0.3.1's blown-out highlights.

## Play
https://hajjen-game.github.io/Hajjen/skyshift/

## What changed
- **Playable deck:** Brighter blue slate surface with less metallic darkening, gentler panel stripes and slight non-bloom emissive fill. The thin HDR edge-core stays untouched.
- **Inlaid panels:** 0.3.3's near-black squares are now medium-dark satin plates that no longer resemble missing platforms.
- **Environment:** Canyon rock silhouettes, art-deco tower architecture and the physical beacon housings are more visible. Cyan/magenta/amber detailing retains its semantic role.
- **Lighting:** Balanced hemisphere light with lighter ground bounce, slightly more fill on rear-facing surfaces, and a very small exposure increase (0.96 -> 1.015).
- **Atmosphere:** All three sectors use richer, brighter sky/fog midtones; fog density adjusted slightly for a more legible horizon.
- **Vignette:** Reduced outer-screen darkening (0.44 -> 0.19).
- **Controls and performance:** Same WebGL HDR/UnrealBloom pipeline, same bloom tuning (strength .43, radius .21, threshold 1.40), up to 2x device pixel ratio. Designed for modern smartphones, not limited by the Galaxy A51.

## Code
- `luminance-v0331.mjs` – single pure color/material/atmosphere configuration, with guardrails for overexposure and fake-black-panel issues.
- `identity-v0331.mjs` – the 0.3.3 surface and landmark design, with brighter physical materials. Decoration plan and collision alignment unchanged.
- `game-v0331.mjs` – active game with new lighting, road base, fog, and telemetry.
- `style-v0331.css` – same UI and mobile controls, less edge vignette.
- `luminance-v0331.test.mjs` – dynamic configuration/invariants, static wiring, collision integrity and unchanged neon bloom.
- Prior `game-v033.mjs`, `identity-v033.mjs` and older lighting modules are retained for comparison / rollback.

## Testing
`node --test skyshift/luminance-v0331.test.mjs` and GitHub Actions full SKYSHIFT test suite.

Browser playtesting is still required: automated tests cannot prove perceived brightness or bloom sharpness. Suggested screenshots: 40-100m, Sky Islands 330-430m, Split 560-680m and Final Velocity 940-1300m.

## Gameplay untouched
Same 1300m course, six mandatory gaps, optional risk route, camera, physics, checkpoints, Skyshield, fullscreen and export. No changes to other games.