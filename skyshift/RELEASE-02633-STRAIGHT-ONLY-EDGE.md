# SKYSHIFT 0.26.3.3 – Straight-Only Cyan Edge Lighting

## Why
0.26.3.2 correctly repositioned the short, broad cyan rail inlays to the bottom
of the rail and connected the warm outer vault feet to their amber shoulder
floor bands. However, its periodic 24m placement did not recognize the
authored racing course's actual corner sections; blue LEDs appeared over the
many yellow arrow chevrons in the bend. This is explicitly unwanted.

## Surgical fix, before Pass 4
- The **source of truth** is `COURSE_SEGMENTS` from the original racing
  geometry, not manually selected world positions and not car steering.
- Only authored `type:"straight"` portions can contain the cyan rail
  emitters. Keep a **12m buffer** away from either adjoining corner and
  discard clipped islands smaller than 2.8m.
- The existing 6.5m / 24m cyan pattern, 18cm low-bevel width, height,
  color and 0.26.3.2 locally lit GGX response are otherwise preserved.
- Critically, an `edgeStraightMask02633` geometry attribute gates the
  **road's cyan GGX specular intensity**, too. In turns the visible LED
  and its cyan reflection are both absent, not merely hidden.
- Amber practicals and connected floor bands reuse the **EXACT unchanged
  `createConnectedFootBands02632`** implementation. Original yellow
  corner arrows remain entirely untouched and continue to guide turning.
- Original ship/physics/GRIP/rail collision/road geometry, spectral zone wave,
  tunnel solar seal, HDR and bloom are all untouched. No extra draw calls,
  textures, dynamic lights or render passes relative to 0.26.3.2.

## Exact comparison
- New default: `?v=0.26.3.3`.
- Historical: `?v=0.26.3.3&straightEdges=classic` selects the exact
  previous 0.26.3.2 implementation.
- Earlier A/B flags `edgeSources=classic` and `edgeFloor=classic` stay intact.

## QA
1. Unit: explicitly check the first authored turn and buffer; confirm
   that no rail-inlay vertex falls in bend and all road GGX turn masks are 0.
2. Real WebGL high/4GB same-frame screenshots at a straight, near turn apex
   and deeper corner, plus exact 0.26.3.2 comparison.
3. No new bright white spill; maintain graphite road and amber arch lighting.
4. Old physical road, titanium wall and steering regression CI remain green.
5. Publish only after these checks; Pass 4 can then focus on cinematic
   glow, bloom, material response and final color/contrast.
