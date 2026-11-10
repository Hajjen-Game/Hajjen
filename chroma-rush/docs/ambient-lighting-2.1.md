# CHROMA RUSH — Ambient Lighting 2.1 (Phase 2 correction)

## Direct player feedback
Chroma Surge phases 1.0 and 2.0 were barely noticeable apart from music, and the player specifically disliked the extra streaks added *near* and *behind* the moving cube. The established Chroma Tide wave was already good and did not meaningfully change during these phases. Change underlying scene lighting rather than layering more moving graphics.

## Changes
- Completely remove the Surge-only canvas streaks: cube-attached chromatic afterimage (7 / 5 / 3 rows), the preceding screen-space ground conductors, decorative atmospheric line trails and additional white clear streaks. No hidden renderer still draws them.
- Retain the seven-second score/chain window and its small center-HUD timer. Those are functional gameplay rewards and were not what the player objected to.
- Remove the temporary extra ground/frame burst from `startSurge`. The already-existing spectral-wave crossing retains its established visuals.
- **Ambient relighting:** reframe the existing full-screen atmospheric diffuse primary light toward the playable lane and the existing distant lower glow toward the horizon. Use real zone palette values, current Flow and a subtle short-lived Surge illumination boost. These are radial color fields **without edges or rings**, not new game objects or line sprites.
- **Terrain bounce:** adjust the EXISTING solid clipped floor gradient to blend a little more primary and secondary palette color near the true track surface. The existing continuous surface stroke gains a slightly broader glow. There are no extra false edges, no bridges across gaps and no extra light-geometry meshes.
- **Player glass:** let the existing cube material/glow subtly reflect ambient light through existing shader gradients, without adding any new stripes, frame outlines, afterimages, symbols or geometry.
- Graphics presets scale light intensity with existing glow quality, not world simulation or difficulty.
- Original `spectral-wave.js` remains **byte-for-byte unchanged**; spatial palette replacement and the moving front are still owned entirely by it.
- Endless Escalation Director 4.0, acceleration, terrain generation, Gravity Shift, inputs, hitboxes, HP and gameplay RNG unchanged.

## Validation
Tests must prove there are zero Surge drawing methods or calls, identical palette-wave implementation, lighting attached to existing sky/floor/cube instead of new line geometry, renderer invariants and visual/mobile CI. Actual subjective difference is not proven until a modern-device playtest (ideally with music off).
