# Adaptive Camera Horizon 1.0 — Real Visible Lookahead

**Release:** 2026-11-09  
**Game:** CHROMA RUSH  
**Scope:** camera projection and viewport-aware rendering/planning only. **Speed Curve 3.2 stays unchanged** following positive iPhone playtest feedback at zone 15.

## Goals

- Make future obstacles and gaps physically visible earlier instead of hiding them past a fixed screen edge.
- Preserve the player's familiar left-of-center horizontal position and track height. Shrink the **world course**, not the UI or its touch targets.
- Maintain the premium Chroma Tide transition without moving the original screen-space background or adding a second expensive render pass.
- Work equally in normal floor and inverted ceiling mode, including the short transition between them.
- Keep jump and double-jump height, gravity, Dash, hitboxes, HP, Flow, procedural terrain, RNG, Director pacing, 12-second zones and speed exactly as before.

## Camera model

```js
const t = clamp((speed - 650) / (1850 - 650), 0, 1);
const eased = t*t*(3 - 2*t);
targetZoom = 1 - 0.20*eased;              // 1.00 to 0.80
zoom += (targetZoom - zoom) * (1 - exp(-dt / 1.15));
```

At 370 the course is fully sized. Between 650 and 1,850 world units/s the camera gently zooms out. The maximum zoom-out is **80%** (25% additional horizontal world span). No discontinuities when changing zones. At later-zone practice entry, the camera starts at the appropriate zoom instead of dramatically animating from 100%. Reduced Motion snaps directly to the moving target while still benefiting from the longer view.

On a typical logical **1280 × 720** landscape with the player at **x=339.2**:

| World zoom | Actual visible world right | Extra real lookahead | Visible world left |
| ---: | ---: | ---: | ---: |
| 100% | 1,280 | 0 | 0 |
| 90% | ~1,384.5 | ~104.5 | ~−37.7 |
| 80% | ~1,515.2 | ~235.2 | ~−84.8 |

The projection is anchored to the player and the canonical floor, not centered on the screen:

```js
screenX = playerX + (worldX - playerX) * zoom;
screenY = groundY + (worldY - groundY) * zoom;
visibleWorldRight = playerX + (screenWidth - playerX) / zoom;
visibleWorldLeft = playerX - playerX / zoom;
visibleWorldBottom = groundY + (screenHeight - groundY) / zoom;
```

The vertical gravity mirror is applied *outside* the camera transform. Hence both ceiling and floor anchor their track to its existing on-screen line, with symmetric jumps. On-screen HUD, buttons and offscreen obstacle warnings remain upright and at the same CSS sizes.

## World-space fairness and render integration

- Obstacle generation, collision and terrain are still in world units. A newly spawned obstacle must begin at least `visibleWorldRight + 90`, or farther when its reaction budget requires it.
- `FAIR.metrics` and `FAIR.warning` use the exact same newly expanded world-right boundary. Warnings that are no longer needed because of the extra visible runway disappear automatically; at faster speeds, Echo/Dash warnings remain as needed.
- The Shield Core spawner uses the same expanded visible boundary; its pickup animation starts from the *projected, gravity-correct* screen position and flies to the unchanged HUD.
- The terrain renderer extends both horizontal bounds and the lower world-space fill limit, preventing black/transparent strips at the bottom (or, after gravity flip, at the top). Gap geometry remains literal transparent gaps over the original atmospheric background. An optional *render-only* start-run flat fill covers the small negative-world sliver visible in high-zone practice.
- The original world background stays screen-aligned: no loss of parallax, no architecture changes, no doubled fill cost. The Chroma Tide wave overlay also stays screen-aligned and draws once. Terrain and obstacles use inverse-projected Chroma Tide color coordinates and gradients, keeping their color changes synchronized with the same visible front.
- Course actors, afterimages, sparks and environmental collision visuals use the world camera. Screen-wide HP hit flashes are separated and remain full-viewport. The Gravity Shift HUD, warnings and Shield Core HUD transfer are outside world-camera scaling.
- Native Canvas 2D transformations are used in the existing frame, with scoped `save/restore` calls. No new canvases, shaders, images or offscreen rendering passes. Existing graphics-quality tiers retain their standard pixel budgets.

## Validation

`node --test chroma-rush/tests/*.test.cjs` and the existing independent browser / mobile CI must pass.

New tests check:

1. Speed-to-zoom thresholds and smooth, frame-rate-independent transitions.
2. Both x/y projection inverses and true visibility on 900, 1280 and 1600 logical widths.
3. Exact normal/ceiling gravity anchoring and transform composition.
4. Action-specific spawn and visible reaction budgets for Jump, Duck, Echo, gap, Echo gap, Air Dash and Ground Dash.
5. Projected Chroma Tide alignment with its original screen-space boundary.
6. Ground coverage beyond physical bottom and left edges without filling legitimate gaps.
7. Browser script order, HTML build/cache marker and simulated game physics unchanged.

## Playtest checkpoints

Test on iPhone and an older Android using AUTO and PERFORMANCE profiles:

- Zone 1–6: verify the original visual size and comfortable easy introduction.
- Zone 10–16: evaluate the gradual camera pullback and whether the extra runway makes actions more readable without feeling smaller or visually disconnected.
- Zone 20–30: ensure advanced Dash, long gaps and Echo obstacles don't pop in on the right or flicker offscreen.
- Cross a color transition while already zoomed out: the wave should light background, ground and hazards at the *same horizontal position*. Check inverted ceiling too.
- Watch floor and ceiling edge fill during hills and gaps. The far background should remain uninterrupted behind true openings.
- Inspect exported `camera` fields (`finalZoom`, `minimumZoom`, expanded world bounds and additional visible seconds). Compare performance recordings to the previous Speed Curve 3.2 baseline.

The 80% bound is an initial art/readability compromise, not an absolute requirement. Adjust based on actual player comfort and perceived speed, **without changing Speed Curve 3.2** until a separate balance decision.
