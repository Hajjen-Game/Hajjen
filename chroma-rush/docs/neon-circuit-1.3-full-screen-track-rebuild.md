# Neon Circuit 1.3 — Full-Screen Track Rebuild

Date: 2026-11-12

## User's playtest intent
The player's yellow drawings are rough spatial examples, not exact tracks to trace. The requested improvement is to USE THE WHOLE LANDSCAPE SURFACE, with long honest straights and broad rounded turns in the visual language of the earlier simple circuit. The user likes the new Wipeout-style Track Tide that recolors the road in driving direction and wants it preserved.

## Root causes
Prior 1.2 courses were all minor sine-based deformations of the same small rounded rectangle. Even on ultra-wide mobile, the renderer fitted a 960×540 world uniformly, leaving extra lateral gutters.

## Implementation
Replace the common oval deformation builder with THREE CURATED VERTEX PATHS using actual line segments and quadratic fillets. Fillets have matching straight-line tangents and use up to 46% of adjacent edges, without arbitrary waves or bottlenecks.

- FULL SPAN LOOP: long upper straight with sweeping lower span
- WIDE CORNER CUT: wider side reach and a distinctive left cut-in
- LOWER SWEEP HOOK: asymmetric extended bottom hook and broad sweep

Coverage based on real geometric samples and 47-unit road half-width:

| Course | Width | Height | Lap length |
| --- | --- | --- | --- |
| Full Span Loop | 89.7% | 79.5% | ~1835 |
| Wide Corner Cut | 90.1% | 75.6% | ~1833 |
| Lower Sweep Hook | 92.6% | 78.8% | ~1918 |

Non-neighboring centerline sections remain over 140 world units apart, leaving over 40 units between the two separate road surfaces. The course builder rejects too-short tracks and tiny on-screen footprints.

The responsive camera now maps the whole 960×540 world into the REAL landscape viewport width and height, filling even panoramic 20:9 phones. Sprite/label horizontal scaling is compensated so glass cubes stay square; the joystick direction is adjusted for the same aspect transform. The Canvas backing still respects its 750,000-pixel budget.

## Preserved
Track Tide 1.2.1: the new zone pigment begins behind the player, follows the circuit in the forward direction and fills the roadway in ~1.45 seconds. No background recolor. Keep four independent racers, 3 legitimate physical-gate laps, AI lookahead, Brake and Dash, ramp knockouts, depth falls, respawns and run log. Do not change Runner, Clash, or Trails.

## Validation
Run the full Node suite, then Playwright Chromium desktop/mobile:
- Each track is closed, non-self-intersecting, has real straight segments and full-size footprint.
- All three support genuine three-lap runs with precisely 13 ordered checkpoint crossings.
- No unsafe short curves or non-local choke points; physics, AI, Track Tide and respawns reference the selected track.
- 960×540, 812×375 and 1400×700: no side gutters, square cubes, responsive analog steering, Dash, Brake, pause, fullscreen, downloadable JSON.
- World background stays fixed as the roadway changes pigment.
- Human phone playtesting still needed to validate fun, readability and difficulty.

Play URL after deployment: https://hajjen-game.github.io/Hajjen/chroma-rush/neon-circuit.html
