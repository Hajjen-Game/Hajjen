# Shared Jump / Duck Core 1.0 — 2026-11-10

## Why the previous pass looked worse
Jump Premium Cap Parity 1.0 added a trapezoidal shoulder, an internal glowing
seam, a narrow upper glint and pushed four horizontal stripes downward. It
invented a second ornamental layer that Duck did NOT have. This produced a
flattened, overworked Jump box on the small 59–73 unit obstacle, whereas the
Duck's 115–158 unit high core already reads as premium due to its visible
transition from the overhead veil.

## Definitive parity fix
- Remove the entire extra Jump cap, shoulder seam, white glint and spacing
  adjustment of the prior pass.
- **One shared paintGateCore(box,floorMounted) implementation** is now called
  by BOTH normal Jump and standard/long Duck. There is no separate Jump/ Duck
  copy of the gradient shell, inset, edge, bloom or stripe illumination code.
- Both cores have the same rounded shape (r=4), shell, inset geometry, 3px
  outline, white upper glint, strong 5px rail and four engravings.
- Duck's overhead rectangular energy field remains entirely unchanged and
  its core uses vertical lines plus the illuminated lower rail.
- Jump has the same material pigment beneath its core, confined to the same
  rounded outer body; horizontal lines and the strong upper rail.
- The only intentional size difference is gameplay height (Jump 59–73, Duck
  core 115–158). Width remains the common speed-dependent step.
- No new cap part, detachable underbody, glow pass, energy curtain or collision.
- All original palette colors and Chroma Tide, opaque terrain, motion,
  Gravity Shift, Director and HUD stay untouched.

## Verification
Tests render the real shared code path and compare Duck and Jump:
gradient stops, inset alpha, shell/border/shadow, draw-operation counts,
outer rounded geometry, engraving direction, intact Duck field and colliders.
One script asset cache bust + HTML build marker update.
