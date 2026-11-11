# Chroma Clash — Visual Cohesion 1.0

Implemented 2026-11-11. This is a **visual-only identity pass** following the user's side-by-side comparison of Rush High and Clash 1.4 (both screenshots supplied). The Clash 1.4 run log recorded a strong performance recovery: 33.125 seconds, 1,969 render frames, 4 intervals over 50ms, 0 over 100ms, max synchronous Canvas render time 9.4ms, no quality drops or color-wave fallback. Preserve that flow.

## Shared identity with the real Rush code

Clash now loads the **same** \`src/core/config.js\` and \`src/render/chroma-identity.js\` as Rush. The first seven \`ChromaConfig.PALETTES\` supply its exact \`primary\`, \`secondary\`, and \`shadow\` colors, not Clash's unrelated custom cyan/amber/violet tones. The palette cycles after seven zones as in Clash 1.4, and the 10-second speed increase remains unchanged.

The **actual Rush glass cube painter** is used to rasterize each Clash cube into one small (72×72) sprite cache per identity color. The player stays cyan and all AI stay distinct colors, but share the runner's near-white glass face, soft beveled light and tinted edge. The cube remains square; no arrow graphics, interior stripes or dash trails.

## World and arena

- Replace the dense diagonal “tech wallpaper” with Rush's dark atmospheric sky, wide two-color haze, faint horizontal energy streaks, tiny distant lights, subdued architectural-depth silhouettes and a thin horizon.
- The rounded-square platform is still the collision geometry. Its art now has a richer cool glass/metal fill, sparse perspective lines instead of graph-paper squares, soft white surface glints and a layered thin energy rim.
- As before, platform and backdrop are rasterized into only **two reusable scene caches** and rebuilt only when color or floor stage changes. These higher-quality materials add no per-frame background paint.
- The original instant mobile response, 120Hz physics step, fair AI push/knockback, staggered falling edges, warning overlay, local Run Log and performance metrics are unchanged.

## Center-out Chroma Pulse

The four-corner implementation was visually weak and did not feel like the runner. New standalone \`src/render/chroma-center-pulse.js\` computes a **single circular progress mask** from the screen/arena center outward. At each ten-second zone:
1. The world center changes to the next **real Rush palette** first.
2. One broad, continuous lightly glowing refractive seam travels outward across the existing arena and background.
3. The new scene fills the outer world only after the center has changed. The player/AI colors do not change and the transition cannot be collided with.
4. The pulse completes in 1.10 seconds, using **one old cached scene draw + one new cached scene draw behind one center-out clip**. There are no new fullscreen glows, shadow blurs, motion trails, extra geometry or GPU shaders.

The energy seam is intentionally ambient, not a solid obstacle-looking ring. Color change and speed still share the same exact 10s simulation boundary. The platform collapse remains independent.

## UI cohesion

Zone number and speed now sit **centered at the top**, matching Rush's HUD hierarchy. Alive count, timer and pause remain right-aligned; mode name is a quiet left eyebrow. The intrusive large "LAST CUBE STANDING" and zone announcements are smaller and briefer. The joystick/button material borrows Rush's dark glass and restrained cyan edges, while remaining the same size/interaction geometry.

## Quality & performance acceptance

No separate "Clash Low style" exists: high- and low-performance devices share exactly the same cached source palette, glass materials and transition geometry. 1.4's 750,000-pixel backing budget and automatic staged resolution downgrade still control *only render resolution*, never art identity. If low frame rate persists, decorative transition is disabled without hiding cubes.

Test with:
- \`node --test chroma-rush/tests/chroma-clash-*.test.cjs\` and full regression suite
- Chromium smoke on desktop plus high-DPR mobile, render scenes at 0%, 25%, 100% pulse progress, assert center recolors before arena corners and sprites stay visible
- Paused JSON run export, first 10s zone switch, first 14s collapse, gameplay after pulse, no uncaught exceptions
- Real handset Rush-vs-Clash screenshots **on same quality/device**, visually compare cyan sky, glass cube, border, HUD hierarchy and pulse
- Next local run log: check \`slowFrames50ms\`, \`worstRenderMs\`, \`qualityDrops\`, \`adaptiveTideDisables\`. Do not claim real-device validation from headless CI alone.

Existing Rush/Trials/Reality source is not edited. This is the first cohesive art pass, not a final tuning of how physically aggressive AI should be.
