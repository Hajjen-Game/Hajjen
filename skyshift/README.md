# SKYSHIFT 0.3.3 — Neon Surface Language & World Identity

SKYSHIFT remains a standalone, finite, handcrafted 3D trial. This version implements visual identity, not gameplay changes.

## Play
https://hajjen-game.github.io/Hajjen/skyshift/

## 0.3.3A · Authored surfaces
- A pure, deterministic decoration plan derives all graphics from the actual roadIntervals collision intervals.
- Dark metallic inset panel pairs, sparse seams, cyan navigation chips and controlled magenta energy details.
- Sky Islands use separate landing braces; no decorative bridges are ever drawn across gaps.
- Safe route is cyan; optional right-hand risk route uses magenta; amber continues to indicate jumps.
- All surfaces are batched by material into a handful of meshes; no extra global post-processing.

## 0.3.3B · World identity
- Sparse far-below-track energy grid, visibly disconnected from the drivable path.
- Instanced angular towers, subdued neon inlays and five pairs of structural landmarks outside the racing corridor.
- Landmark spacing emphasizes Sky Islands, Split Horizon, elevated sections and the finish.

## 0.3.3C · Hero ship
- Split dorsal armor, swept shoulder vanes, dark rear engine hardware and narrow cyan/magenta inlays.
- Physical clearcoat metal and dark recesses remain dominant rather than bloom.

## 0.3.3D · Integration and coherence
- Dark physical housings on the existing beacons so lights read as built-in hardware.
- Restrained dual-tone HUD/menu adjustments.
- The 0.3.2 HDR bloom, modern-resolution target, track layout, controls, camera, jump physics, checkpoints and fullscreen are unchanged.

## Code
- identity-v033.mjs: visual plan, validation, batched geometry, world architecture and ship enhancements.
- identity-v033.test.mjs: geometric safety, collision alignment, safe/risk semantics and integration tests.
- game-v033.mjs, style-v033.css, index.html: active version.
- trial-v03.mjs, neon-v032.mjs, neon-balance-v032.mjs, premium-v032.mjs: retained foundations.

## Testing
- node --check skyshift/identity-v033.mjs && node --check skyshift/game-v033.mjs
- node --test skyshift/identity-v033.test.mjs
- CI continues all existing gameplay, fullscreen and lighting regression tests.

Unit tests cannot verify the final WebGL appearance. Review first deck at 40-100m, Sky Islands at 330-430m, optional split route 560-680m and finish 1200-1300m for visual clarity.

No new levels, mechanics, audio or endless mode in this visual pass; other games in the repository are untouched.