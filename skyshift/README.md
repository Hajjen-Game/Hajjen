# SKYSHIFT 0.3.1 – Premium Neon Identity

First Flight 2.0 remains the same complete, handcrafted 1300-metre browser-based 3D trial. **0.3.1 is a lighting, material and visual-cohesion pass, not a gameplay revision.**

## Play
https://hajjen-game.github.io/Hajjen/skyshift/

- **Mobile:** landscape; left thumb steering and right thumb JUMP. Fullscreen in the menu or the HUD; START TRIAL also requests fullscreen where supported.
- **Desktop:** A/D or arrows to steer; Space to jump; P/Esc to pause.

## Premium Neon pipeline

- `neon-v031.mjs`: a Three.js **EffectComposer → RenderPass → UnrealBloomPass → OutputPass** chain. Bloom is applied to bright HDR surfaces before final tonemapping.
- Road rails are three physical layers: soft tinted halo, saturated color body and a thin almost-white luminous core. This preserves precise boundaries and creates a real bloom halo.
- Jump warnings, landing pads, beacons, signs, arches and the finish gate use a coherent luminous material hierarchy.
- `game-v031.mjs`: darker satin deck, contrasting dark terrain, complementary fill lighting, clearcoat hull/cockpit, detailed wing-tip LEDs and a responsive local engine light.
- `premium-v031.mjs`: emissive engine trails and angular landing shards in the same palette, without ring-shaped visual noise.
- `style-v031.css`: restrained premium neon UI styling so gameplay remains readable.

## Performance target

The game now targets current mobile GPUs and desktop WebGL with a maximum device pixel ratio of 2, and real HDR bloom enabled by default. An older Samsung Galaxy A51 is **not** the limiting target, as requested. The GPU load is higher than v0.3, and should be evaluated on a newer phone.

Three.js 0.180.0 is loaded via a pinned CDN import map so all core/addon modules share the same runtime instance; internet is required for the first module download.

## Automated tests

- Run `node --check skyshift/game-v031.mjs` to check the browser JavaScript grammar.
- Run `node --test skyshift/neon-v031.test.mjs` for pipeline wiring, HDR hierarchy, material coverage, resolution policy and unchanged controls.
- CI continues the deterministic track/physics tests for all previous versions.

## Known limits

Automated tests cannot certify how the bloom actually looks, or measure phone GPU frame pacing. Real browser playtests should evaluate halo width, bright-core contrast, glow at sharp curves, readability of jump edges, colors at sector transitions and the effect on performance.

Full-screen controls, 1300m course, six mandatory gaps, safe/risk split and Skyshield behavior are retained. No new levels, sound, weapons or endless mode in 0.3.1. Other games in the repository are unchanged.