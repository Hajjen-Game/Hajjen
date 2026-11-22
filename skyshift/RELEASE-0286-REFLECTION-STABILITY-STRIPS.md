# SKYSHIFT 0.28.6 – Reflection Stability & Luminous Strip Definition

## User report and goal
The NEON VAULT roof appears to glitter/blink in motion; amber side lamps show milder hotspots. Target is clearer cyan strips with stable soft-metal responses, closer to the supplied new target image. Specular aliasing is a strong hypothesis, but motion evidence may reveal Z-fighting or temporal bloom instead.

## Actual source architecture
TrueSharedTunnelRenderer0281 instantiates the actual Skyline 0.26.5 material/fixture pipeline ten times. The native physical shader combines local GGX, finite multi-tap fixture sampling, packed 0.26.2 high-frequency normal/roughness atlas and later 0.26.4.2 roughness trimming. Vault 0.28.4 adds a one-time genuine PMREM capture. Real cyan/amber fixtures, native emissive strips and joined arch feet already exist.

## Changes on VAULT v0.28.6 ONLY
1. Physical panel/rib shader gets an upper-wall vs roof satin roughness floor and screen-derivative roughness bias, to reduce potential subpixel highlight aliasing. Existing 0.26.2 High micro-normal amplitude is reduced (panel .21 to .084, rib .12 to .052). Original GGX and PMREM remain.
2. The graphite substrate atlas grain is moderated mainly on the roof, preserving original physically raised panel silhouette and dual-tone lighting.
3. The existing cyan cove emitter receives a modest ~19 percent native output increase and warm emitter ~4.5 percent, without any additional light, geometry or material batch. Existing High-only arch halo opacity increases from .15 to .18. Four-GB path stays cheaper and does not create a halo.
4. Original warm foot-band alpha receives a soft feather, not a harder spotlight.
5. No changes to road, boost pads, ship, GRIP, flight physics, 0.28.5 wave, camera, white spill seals or scene render passes.
6. Historical Skyline, Aurora, and Vault 0.28.5 are untouched. The opt-out flag reflectionStability=classic gives exact old shader gains on the same 0.28.6 course.

## QA
Unit tests validate source-material anchors, original GGX survival, derivative filtering, real emitter tones, rollback and version gating. Real Chromium WebGL proves a same-frame change on original roof and side materials, 110/1840/3230 metres High and 1840 metres 4GB. Also check that road luminance and white spill do not increase, and all old GRIP, PMREM, wave and material checks pass.

Static screenshot differences and shader filtering alone do not prove shimmering is fixed IN MOTION. The user should compare running on PC and new Samsung, and any remaining glitter should trigger video-based temporal/Z-fighting diagnosis rather than indiscriminate bloom/PMREM increases.

## Test URLs
https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.6
https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.6&reflectionStability=classic
Audit only: append reflectionStabilitySmoke=1&trackRepairSmoke=1 then __skyshiftReflectionStabilityAudit() and __skyshiftReflectionStabilityFrames().