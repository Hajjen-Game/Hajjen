# Wildpath — Color & Material Overhaul 1.0

## Direction
Vivid, readable gameplay color inspired by the *clarity* and contrast hierarchy of energetic top-down action games such as Brawl Stars, while keeping Wildpath's gentle organic silhouettes and nature identity.

**Play:** https://hajjen-game.github.io/Hajjen/wildpath/?rev=color-material-1

## Changes
- Open world: one 20-subdivision, vertex-painted green meadow. Emerald center, richer teal distance and gentle tonal variation; one ground draw call, no generated puddles.
- Ambient and sunlight: stronger top highlights, cooler green shadows and a matching distance-fog color.
- Scenery: six more saturated woodland canopies, flowers, shrubs, richer bark, mint fireflies and brighter shrine gems. Existing meshes/placement preserved.
- Nature Rebirth: rose, lilac, amber, mint, aqua and cream now use stronger leaf/petal hues with brighter top tones, light-catching specular and lower baked emission. No nature generation, fusion or progression logic changed.
- Player/foes: stronger aqua hero, peach/orange bramble and ember, violet guardian and lime mossling with satin-candy specular highlights. One extra top pearl glint only for the player, not for each enemy.
- Magic: water spell effects shifted to cleaner saturated cyan/teal and pearl-white; collection glints have warmer gold centers with mint rims. Attack timing, damage, radius and cooldowns unchanged.
- HUD materials: embossed gradient glass, brighter health and energy meters, warm golden score, crisp ability-ready borders and polished small buttons. No HUD coordinates or screen arrangement changed.

## Boundaries
- Willowglow remains **not mounted**, including legacy preview query strings.
- Living Water ponds and wet-surface rendering remain **removed**. Rainfall's active damage field is retained.
- No new textures, GPU postprocess, GlowLayer, ShadowGenerator, remote assets, extra tree geometry or additional combat systems.
- Original road mode, camera framing, touch controls, combat physics and progression remain unchanged.

## QA / review
- Automated Node tests in color-material-overhaul.test.js cover material accents, six palettes, cached production imports and the absence of removed scenery features.
- Existing Node regression and portrait Chromium smoke live in GitHub Actions; verify their results after deployment.
- On mobile evaluate hero/hostile separation, yellow energy collection, low-clutter nature growth, frame time on older Android and readable cooldown numbers.
- If colors are too intense, tune shared palette and specular material numbers first instead of multiplying transparent overlays.
