# SKYSHIFT 0.9.2 — Shadow Tunnel

## Goal
Create a **real**, long dark tunnel with the racing surface still readable by
its neon guide lines, chromatic zone waves, boost inlays and raised edge rails.
The requested reference is the current SKYSHIFT gameplay: deep space darkness
with strong glow, not a separate prerendered image.

## Layout
- Authored lap interval: **2,050m–2,810m**; length **760m** (repeats naturally
  on laps 1, 2 and 3).
- First 2km are completely unchanged.
- Starts **208m after** the physical 70° wall ends at 1,842m; exits **195m
  before** the 360° corkscrew begins at 3,005m.
- Follows the 3D road through the back sweeper, the long coast straight,
  the final corner and a short exit section.
- Geometric clearance: ~33.2m across at the wide point with an 18.4m
  overhead vault, leaving the full existing 23.2m driving deck and rails
  untouched.

## Implementation
- `shadow-tunnel-v092.mjs` generates a continuous near-black opaque vault,
  two pairs of restrained longitudinal roof/wall neon pipes, thin luminous
  ceiling ribs spaced ~38m apart and white-core entrance/exit portals.
- All geometry uses **authoritative** `positionAt(s,lateral,height)` and is
  independent of the simulation. The existing guardrails and road remain the
  only collision boundaries.
- On top of the unchanged `premium-track-v0901.mjs`, a shader decorator
  darkens the *diffuse road base* inside the tunnel, using smoothly eased
  30m entry and exit transitions. It **preserves and slightly increases**
  emissions for the racing guides and boost inlays, and retains the moving
  spectral white-core world wave at full intensity.
- The sky/fog ambient colors also dim inside the tunnel, while an opaque
  fog-free vault blocks the distant starfield. Tunnel rim colors follow the
  active zone palette.
- The entire tunnel uses four extra batched static meshes, zero dynamic
  lights/particles, zero render passes, zero added physical colliders.
- A small `SHADOW TUNNEL` approach sign and GRIP-friendly cue appear before
  entry. The audit exports tunnel entries, exits, duration, render geometry
  and atmosphere strength.

## Preservation
- The original `trial-v0901.mjs` and 0.9.0.1 GRIP-first balance remain
  unchanged and awaiting a real player review.
- `signature-flight-v091.mjs`, `kinetic-camera-v090.mjs`, HUD, zone timing,
  3-lap distance, jumps, magnetic wall and corkscrew are unchanged.
- Previous `game-v091.mjs` and `boot-v091.js` remain archived.

## Validation
- Deterministic layout, arc-length recurrence, clearance and darkening/emission
  shader checks: `shadow-tunnel-v092.test.mjs`.
- Production WebGL + Android controls smoke: `browser-smoke-v092.mjs`;
  contains a **dev-only** legal track-pose screenshot probe reachable only with
  `?tunnelSmoke=1`. No player-facing teleport or shortcut is introduced.
- GitHub Actions saves `skyshift-v092-shadow-tunnel.png` for visual regression.

## Player test
Play the normal 3-lap route at
https://hajjen-game.github.io/Hajjen/skyshift/

Look for the tunnel around 2.05km, after the wall ride. Confirm that the
nighttime glow is punchy without losing the track edge, and that the entry and
exit are smooth rather than abrupt screen-wide black flashes.
