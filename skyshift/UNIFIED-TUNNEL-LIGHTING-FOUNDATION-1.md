# SKYSHIFT — Unified Tunnel Lighting Foundation 1.0

## Purpose

Reuse the original 0.9.2.1 **True Black-Room Tunnel Lighting** controller
instead of maintaining a second world-light controller for the new 0–368m
metal gallery. The old controller remains the ONLY per-frame writer for
the three global PBR lights: hemisphere ambient, key directional and fill.

**This is a source-level foundation, not permission to delete existing
road/ship/fog protections.** Only remove redundant shaders after visually
validating their absence with real 8GB/4GB WebGL A/B at the same camera pose.

## Profiles

| Component | Existing shadow tunnel | New 0–368m neon gallery |
|---|---|---|
| External ambient at core | 0.4% | 72% |
| External key at core | 0.8% | 38% |
| External fill at core | 0.4% | 56% |
| Engine point lights | unchanged | unchanged |
| Native colored neon | unchanged | unchanged |
| Moving zone wave | unchanged | unchanged |
| Original shadow room road blackout | unchanged | NOT added |
| Blade-tip blackout | unchanged | NOT added |
| Camera starfield blackout | unchanged | NOT added |
| Entry/exit transitions | original 30m | 14m in, 28m out |
| Other portions of the course | normal external lights | normal external lights |

Both masks are lap-aware and apply over all three laps. The new gallery
profile uses the existing world-light **blackout controller** with one
injected level-policy callback. This is a minimal change to
`tunnel-blackout-v0160.mjs`. No new engine, lights, materials, meshes, or
render passes were added.

## Reversible comparison

- Default build: both tunnels use the shared lighting policy.
- `?v=0.26.0&unifiedLighting=classic`: original 0.26.0 light policy.
- `?v=0.26.0&unifiedLightingSmoke=1&unifiedLightingFrameProof=1&trackRepairSmoke=1`:
  exact-frame comparative screenshots through the public test-only probe.

Legacy renderer source-level controls remain, including exterior fog seal,
ship neutral spill trim, solar road trim, native neon and original white
moving color crest.

## Acceptance

1. 0–368m main tunnel has no neutral exterior glare on ship/road.
2. Original 2050–2810m Shadow Tunnel (or Lumen Pass on Aurora circuit)
   stays pixel-for-pixel unchanged.
3. Same-frame switch proves that open track, original tunnel and native
   colored neon are unaffected, with smooth 14/28m entry/exit transitions.
4. Test both desktop 8GB and simulated 4GB using real Chromium WebGL.
5. Preserve all controls, camera, physics, driving line, GRIP and three laps.
6. No CI deployment until test output is reviewed. When accepted, merge
   the foundation and run the full release-gated regression suite.

## Future cleanup, NOT performed in 1.0

After the new light policy is visually validated, investigate consolidating
the earlier multiple solar/white-shader decorators. Measure before deletion.
Do not remove the road's native white wave or animated neon while doing so.
