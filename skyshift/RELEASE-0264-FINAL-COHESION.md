# SKYSHIFT 0.26.4 – Lighting, Glow & Final Cohesion

## Goal: finish toward the supplied cinematic target
Passes 0.26.1–0.26.3.3 supplied **real localized physical GGX**
cyan/amber reflections, dark brushed titanium, ground-level **straight-only**
cyan rail lights, and warm **joined** arch-foot/floor bands.

The target reference has deeper graphite, cohesive cyan/orange lighting,
narrow bright emitters and *controlled* glow on surrounding metal.
The game before Pass 4 already has ACES exposure .96,
`UnrealBloomPass`, SMAA, OutputPass and an older optional unified-grade pass.
Adding global white light, turning up general exposure or enabling full
screen SSR would destroy the dark intended aesthetic.

## 0.26.4 implementation
**A. Actual fixture radiance:** only color-scale the EXISTING cyan straight
rail and amber connected-foot MeshBasic emitters, preserving their exact
meshes/locations/segments/collisions. HDR cyan/amber color is amplified
by restrained channel-specific gains (high 1.14–1.30, low 1.04–1.12);
no new lamp, no brighter corner arrows, no shader rewrite or white source.

**B. Calibrated existing bloom:** original UnrealBloom strength .43,
radius .21, threshold 1.4. High: strength .47, radius .235, threshold 1.34.
4GB: strength .44, radius .21, threshold 1.38. Existing bloom mip
resolution, SMAA, original ACES exposure, zone wave and OutputPass unchanged.
No additional new dynamic or ambient light or shadow pass.

**C. A high-graphics-only chromatic cohesion grade:** one 5-tap (source +
four near neighbors) linear-HDR shader pass after the original unified
grade/SMAA and before OutputPass. It deepens graphite mid-shadows without
raising black panel seams, selectively separates cyan/amber nearby spill
from their original luminous cores, and guards neutral white wave,
central road, ship and bright upper highlights. No AO/SSR, no new textures.
4GB has zero new full-screen passes and maintains original pipeline.

## Critical compatibility
The version 0.26.4 MUST keep the actual 0.26.3.3 **straight-only** rail
implementation by forwarding the 0.26.3.1, .2 and .3 gates when
`roadReflectionRelease[2] > 3`. Otherwise an older 0.26.3.1 continuous
curve-rail emitter could incorrectly be selected after the Pass 4 bump.
The release includes this important fix.

URL: `?v=0.26.4`. Exact all-effects-off A/B:
`?v=0.26.4&finalCohesion=classic` (reverts fixture radiance, existing bloom,
and optional Pass 4 shader at the same game frame). All earlier A/B
flags (`straightEdges=classic`, `edgeSources=classic`) remain.

## Release criteria
1. Native Chromium WebGL: high Gold straight, first transition/arch,
   Gold corner, Violet corner, plus 4GB Gold; same frame classic/Pass 4 PNGs.
2. Color/mid-shadow tonal changes visible without washing out central asphalt;
   neutrals above 240 remain controlled, almost-black panel seams remain.
3. 0.26.3.3 short LEDs still only on authored straights, corner chevrons
   remain untouched; 20 amber integrated floor bands remain.
4. 0.26.2 real physical material, 0.26.3 native GGX,
   solar seal and historical unit/browser suites remain passing.
5. No physics, GRIP, ship, camera, track, native spectral wave or external
   lights changes. Do not merge failed WebGL material or presentation tests.
