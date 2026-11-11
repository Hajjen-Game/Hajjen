# CHROMA RUSH – Clash Impact & Depth 1.2 / Neon Trails 1.0

2026-11-11

## Chroma Clash: visual changes only

The circular collision rings are replaced by the short, straight, directional compression flashes and multicolored energy cuts associated with Rush's Arcade Animation Language. Visual lifetime 0.27 seconds; maximum 10 simultaneously visible effects. Physics, AI collision forces, gameplay and logs remain untouched.

When the outer platform segments detach, they now sink into world depth: their world/screen center remains fixed with **no sideways displacement, no downward screen drift and no rotation**. Each segment fades, darkens and decreases in apparent scale from 100% to 8% over one second. Fragments are staggered by 14ms to communicate depth. The existing floor physics and danger warnings remain identical.

Existing cached panoramic arena rendering, centered Chroma Pulse, fullscreen and 750k pixel mobile canvas cap are preserved.

## Neon Trails 1.0 – second mini game

A separate standalone top-down Tailblazer-style arcade mode with a cyan player cube and three color-coded AI cubes, all rendered with Rush's shared glass cube material. Each player runs continuously and leaves a dangerous glowing trail. Cross a wall or any older trail (including your own older trail) and you are out; last survivor wins. Swept segment collision prevents passing through narrow trails between frames.

Controls: a left direction joystick + right optional BOOST button; WASD/arrows and Space on desktop. Boost lasts 0.65s with 5.2s cooldown. AI evaluates alternative directions for projected walls, trails and opponent interception, with deterministic seeded tie-breaks.

Progression: every 10s shared Rush palette/center-out pulse, base speed 108 +13/zone (max 222). To gradually increase spatial pressure the arena reduces every 20s. Trail lifespan fades from 9.4s to a minimum 4.8s and segments are capped to 135 per cube, protecting performance.

Visuals: world/arena background prerendered and cached per zone/stage, thin colored trail rails with a faint bloom and white core, glass cubes, panoramic layout, native fullscreen, same small mobile pixel budget and adaptive resolution downgrade. The joystick and Boost are separate controls; no extra dash/jump.

Run Log: downloadable local JSON of time, seed, zone, speed, boosts, eliminations/causes, remaining players, trail counts and frame performance. No network upload.

QA: deterministic Node tests for geometry, AI, boost, zones, logs and styling, plus Chromium smoke at desktop and high-density mobile viewport including actual joystick, boost, fullscreen, exported JSON and pixel-filled edges. Tests run in GitHub Actions.

Playtest goals: judge trail collision readability, steering/turn feel, AI opponent survival and whether traps emerge naturally. This is a **first playable prototype**, not a claim of final balance or verified physical-phone performance.

## Routes

- Rush: https://hajjen-game.github.io/Hajjen/chroma-rush/
- Clash: https://hajjen-game.github.io/Hajjen/chroma-rush/clash.html
- Neon Trails: https://hajjen-game.github.io/Hajjen/chroma-rush/neon-trails.html
