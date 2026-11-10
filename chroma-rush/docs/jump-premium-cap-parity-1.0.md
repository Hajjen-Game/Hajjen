# Jump Premium Cap Parity 1.0
2026-11-10

## Reference
The screenshot highlighted the luminous **top edge of the Duck solid core**,
where the overhead energy shaft meets the solid material. The user perceived
Duck as premium because that junction creates a clear cap/shoulder and
layer separation. Jump had exactly the same World Lighting gradient,
undercoat and inset after Material Parity 4.0, but still read as a flat block
because its luminous top rail had no separately visible interior shoulder.

## Change
Only the ordinary `jump` renderer is altered.
- The approved solid core and inner tinted gradient stay exactly the same.
- Add one shallow translucent trapezoidal cap strip to the top 13–17 world
  units of Jump, INSIDE its existing rounded collision silhouette.
- Add a 2.2px internal shoulder/seam at the lower edge of that strip and a
  narrow white glint near its upper edge, echoing Duck's strong junction.
- Place Jump's four horizontal engravings below the shoulder. The Duck's
  own four vertical engravings are unchanged.
- Retain the existing 5px top rail, 3px outer border, 4px corners, gradient,
  recessed material and World Lighting.
- No additional rectangle, gradient, texture, asset, collision, field,
  flash, dash cue, HUD element, particle or standalone game object.
- Do not alter Duck or dash-duck, any palette, geometry, animation speed,
  obstacle width, gravity, camera, Director or gameplay.
- Internal cap contours scale with the existing 59–73 jump height range;
  in ceiling orientation the existing world transform mirrors them.

## Regression
Draw-command tests protect material parity with Duck, the single rounded
body and single inset, existing four horizontal stripes and the extra
shoulder/glint. The shoulder must stay within the collider for every Jump
height and be visible without a separate energy curtain. CSS-free canvas
path fill has no added glow shadow and allocates no new gradient per frame.
HTML meta + game script asset version updated for mobile cache.
