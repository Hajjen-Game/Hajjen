# Steady Hazards 1.0 / Opaque Ground 1.0 — 2026-11-10

## Hazard pulse removal
- All ordinary Jump and Duck hazards (including wide Dash Duck) use constant
  opacity 1. Remove the per-obstacle `Math.sin(worldTime*6 + pulse)` animation
  and the unused random phase from spawn.
- The archived Dash Jump visual no longer has a per-frame brightness flash;
  its moving streak is still spatial, but its brightness is stable.
- Preserve Chroma Tide, the hue, bloom, inset, edge lighting, collisions, and
  all action feedback unrelated to the old obstacle twinkle.

## Fully opaque ground
- Replace the translucent **top two stops** in the existing ground gradient
  with opaque RGB colors. The same colored bounce is pre-composited against a
  deliberate dark track substrate; deeper stops were already opaque.
- Keep **one gradient and one fillRect** inside the original solid terrain clip
  for low overdraw and to prevent filling true gaps. No new render pass,
  geometry or shaders.
- Preserve perspective grid, edge glow, World Lighting, Chroma Tide and the
  dark lower fade. Backdrop architecture can no longer shine through solid
  terrain, while true gaps show the same world backdrop as before.

## Regression
Unit tests assert the absence of animated obstacle alpha and per-hazard pulse
RNG, opaque gradient stops, one original clipped gradient fill and preserved
open gap polygons. Build metadata and both edited JS asset URLs are versioned
to refresh mobile GitHub Pages clients.
