# CHROMA RUSH — Duck Core Material Parity 4.0

## Investigation
The user's impression was partly correct: both hazards already called the
same `worldLighting.shellGradient()` with 4 matching stops
(white glint 0, colored fill .25, colored fill .75, dim fill 1).

The visible difference came from the layer UNDER that translucent gradient:
- Duck rendered its translucent energy field (same theme color and material
  veil opacity) first, then the rounded Duck solid core, then its inset.
- Jump rendered its rounded gradient core directly on opaque terrain, WITHOUT
  the extra tinted substrate, losing perceived depth and making the gradient
  look flatter.
- Jump's inner inset also had +0.10 additional opacity versus the Duck
  reference, an earlier attempt to compensate for the missing layer.

## Correction
- Use the Duck energy layer's original `material.veil` opacity as a
  subtle undercoat **within the SAME round-rectangle path** as Jump's
  physical core, not as any separate energy field, panel or additional box.
- Match Duck's inset alpha `material.inset` and fallback .18 exactly,
  rather than adding an arbitrary Jump-only .10.
- Keep identical 3px core stroke, bloom, shell-gradient stop colors/alpha,
  and inset geometry between Duck and Jump.
- Preserve intentional differences: Jump sits on ground with a lit top
  and four HORIZONTAL strokes; Duck hangs with a bottom light rail,
  four VERTICAL strokes and its existing hanging energy field.
- No edits to palette colors, width/height, collision, dash, jump, gravity,
  director, Chroma Tide or the opaque terrain.
- No extra rectangles, assets, or gradients. Jump uses one additional
  unshadowed fill of its already-existing rounded path. Underlying renderer
  work remains tiny relative to full-world passes.

## Regression
A live Canvas-command regression with the actual `drawObstacle` code and
`worldLighting.evaluate/shellGradient` checks identical gradient stops,
same inset values and light intensities at several flow/quality levels,
plus unchanged geometry and directional markings.

Both `chroma-build` and the cache-busted game.js URL advance together.
