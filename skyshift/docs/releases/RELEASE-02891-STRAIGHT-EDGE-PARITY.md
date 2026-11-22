# SKYSHIFT 0.28.9.1 — Shared Straight-Only Edge Lighting Parity

## Exact historical source
This is a surgical port of the APPROVED Skyline 0.26.3.3 straight-only cyan inlays, commit f5d4005524702c5a7c570f7489133d2b05068a8e. The exact 0.26.3.2 mount profile and coloring are reused: two low-bevel strips per straight bay, 18 cm wide, 6.5m illuminated source length out of every 24m local source cycle. The orange 0.28.7 arch-foot source and illumination must not change.

## Root cause
0.28.1 shared renderer incorrectly used createLowerEdgeSources02632, which applies periodic cyan inlays without knowing the *actual* Vault track curvature. Although 0.26.3.3's straight classifier exists in the repository, the legacy Skyline-only installer is disabled for later Vault versions. Independently, native 0.28.2 road GGX / 0.28.9 extra cyan glints were not masked in turns.

## Fix
- shared-straight-edge-parity-v02891.mjs builds real-world safe intervals from Vault COURSE_SEGMENTS: 8 curves, 8 straight segments, 12m clearance BEFORE and AFTER any turn, 0.8m feather within that clearance. This includes all 3400m, both mirrored half-loops, and every internal 340m Skyline source-module seam.
- Keep EXACT pre-existing 0.26.3.2 low-bevel profile/positionAt, pitch, width and RGB. Clip each original 6.5m inlay to the intersection of the source module and a real straight. Discard clipped fragments shorter than 2.8 world metres; never add a new rail, road mesh, collider or light.
- The existing indexed road gets just one Float32BufferAttribute edgeStraightMask02891, generated from these SAME world-space safe intervals. A final lightweight shader wrapper after the genuine 0.28.2/0.28.9 material chain multiplies ONLY r263Source.x (cyan) by the straight mask. This suppresses both original GGX cyan lamps and 0.28.9 cyan glints in curves. r263Source.y (amber) remains exactly unchanged, as do turn arrows, 0.28.7 L-foot, PMREM, contrast, ceiling lighting, ship, boost, GRIP and driving physics.
- Fixed the 0.28.4–0.28.9 version gates to also recognize four-component patch versions. Without this, 0.28.9.1 could silently drop PMREM/neon/arch-foot/cinematic finish from the prior release.
- Skyline / Aurora unchanged. v0.28.9 and older Vault versions unchanged.

## Reversible comparison
- New: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.1
- Exact previous 0.28.9 cyan sources and road response in the NEW runtime: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.1&straightEdgeParity=classic
- Existing 0.28.9: https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9

## Acceptance
1. For all 8 authored Vault turn intervals, neither source polygons nor interpolated road GGX masks are allowed in or within 12m of turn entry/exit.
2. Straight LED segments retain original width/color/profile/24m local period, with original road and collider vertices unchanged.
3. No ghost cyan road reflection, including newly added 0.28.9 colored road-glints, on any turn. Amber foot bands and orange reflections remain as published in 0.28.9.
4. High and 4GB real Chromium WebGL checks at straight 110/1210/1840m and turns 292/540/955/1450/1995m, comparing prior material from the same release via straightEdgeParity=classic.
5. All old fast-core, grip, physics, metal and lighting WebGL regressions pass. No new light source, extra draw pass or gameplay logic changes.

Once the real preview workflow succeeds, original game screenshots are published to skyshift/previews/v02891-*.png. They are not pre-generated concept pictures.
