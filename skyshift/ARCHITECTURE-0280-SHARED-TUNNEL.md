# SKYSHIFT 0.28.0 — Shared Tunnel Architecture 1.0

## The architectural correction

SKYLINE 0.26.5 is the approved **visual source**, not a look that should be imitated independently for every track. NEON VAULT 0.27.0–0.27.4 gained duplicate track-specific geometry/lighting orchestration and small config copies, making repeated art changes expensive. This release makes the shared contract explicit and routes **both live tunnel tracks through it** without replacing any already-approved graphics pipeline.

### One source of truth

| Responsibility | Shared source | Track-specific inputs |
|---|---|---|
| Cross-section | Original `tunnel-megastructure-v0211.mjs`, `sampleSharedTunnelProfile0280` | start and period of bend |
| 3D panels | Original `structural-tunnel-v0213.mjs`, `buildSharedTunnelSection0280` | segments/chunks, banked `positionAt`, quality |
| Palette/depth/rhythm | `SHARED_TUNNEL_STYLE_0280` (original 0.24.1 colors/depth) | optional bounded authored source-proximity tint |
| GGX physical material | `sharedPhysicalPreset0280` plus source 0.26.0/0.26.1/0.26.5 shader functions | mobile opacity override for original Skyline versus Vault |
| Metal texture | Original `premium-metal-surface-v0262.mjs` | High 256 / 4 GB 128 |
| Fixture locations | `SHARED_TUNNEL_ROUTES_0280` | Skyline's irregular original portal list; Vault's 27/42.5/24m sources |
| Installer lifecycle | `createSharedTunnelRuntime0280` | original Skyline renderer vs existing full-circuit Vault renderer |
| Flight/road/GRIP | **NOT** inside the tunnel system | remains inside each circuit's one flight engine |

The 368m original Skyline shell and the 3400m full Vault use the **same profile function** with `period:368` vs `period:620` and the same 0.24.1 panel sculptor, instead of two separately maintained versions. `SHARED_TUNNEL_STYLE_0280` is deep-frozen and contains approved panel RGB, bay length, relief, metal PBR properties and source colors. Changing these common values propagates to both tracks wherever consumed, without editing two copies.

The **actual track shape and bank** remain independent. No road, ship, GRIP, collision, camera or physics code is moved into the tunnel runtime.

### Configuring a future track with multiple tunnels

Declare the tunnel ranges and optional source fixture schedule; *do not* copy Skyline or Vault's panel logic. `makeTunnelPlan0280` validates overlaps, out-of-range sections, positive profile phase, portal positions and graphics quality.

```js
import {makeTunnelPlan0280} from "./shared-tunnel-architecture-v0280.mjs";
import {buildSharedTunnelSection0280} from "./structural-tunnel-v0213.mjs";
const plan=makeTunnelPlan0280({
  track:"future-course",trackLength:6200,quality:"high",
  sections:[
    {start:0,end:235,profilePeriod:235,portalPitch:42.5},
    {start:845,end:1260,profilePeriod:415,portalPitch:42.5}
  ]
});
// positionAt(s,lateral,height) is PROVIDED by the future course.
// Use the same Skyline-authority sculptor in every interval/chunk.
const data=buildSharedTunnelSection0280(positionAt,plan,{
  segmentIndex:1,chunkIndex:0,lowMemory:false,panelStepMeters:3.8
});
```

The tests actually generate all five pieces of that two-section example, including the gap, with the original 0.24.1 panel geometry. No lighting, collisions, track layout or flight code is required just to author those panel assets.

### Backwards compatibility and A/B

The deployed Skyline original renderer and NEON VAULT 0.27.4 renderer are still used. They are invoked via `shared-tunnel-runtime-v0280.mjs`; we do **not** replace the current mature 0.26.5 Skyline fixture authoring with a weaker copy.

- `?track=skyline&v=0.28.0&sharedTunnelSmoke=1`
- `?track=vault&v=0.28.0&sharedTunnelSmoke=1`
- `?track=aurora&v=0.28.0&sharedTunnelSmoke=1` (no tunnel)
- `&sharedTunnel=classic` preserves the legacy panel-route dispatch for exact visual comparison
- Historical `v=0.27.0` through `0.27.4` preserve their older feature switches. `0.28.0` correctly enables all four former Vault layers instead of silently disabling them when the new version isn't matched.

No new geometry batches, sources, atlas allocations or shader sampling were introduced **by this organizational refactor**. New/source shaders are the exact old material algorithms, with their configuration now shared. High/4GB retain prior quality differences.

### Deliberate 1.0 boundary

**Shared component authoring is centralized; specialized production scene assembly is still separate for the two existing tracks.** This is necessary while retaining the exact older Skyline 0.26.5 fixture placement and the fully enclosed Vault's 3400m chunk renderer. When a future track is approved, it can use the shared blueprint, original geometry builder and material functions. Its course-specific fixture placement and streaming policy still need deliberate authored configuration—not another rebuild of panel shapes and shaders.

Do **not** advertise pixel-identical Skyline/Vault appearances merely from shared source code. That would require adapting some original 0.26.5 fixture assets and local authored exposure, and should be done by changing their **shared components** rather than layering yet another copy.

### Release gates

- Source/section/quality/material tests: `shared-tunnel-architecture-v0280.test.mjs`
- Real Chromium/WebGL checks: `browser-shared-tunnel-v0280.mjs` captures Skyline High/4GB, Vault High at 110,1840,3230m, Vault 4GB at 110,1910m, Aurora and the legacy comparison paths.
- All historical Skyline 0.26.5 and Vault 0.27.0–0.27.4 tests remain mandatory.
- Merge only if the post-merge `main` workflow and GitHub Pages also pass.

**Outcome sought:** One global tunnel look that can evolve across courses, without coupling track geometry or physics, and without repeating the 0.27.0–0.27.4 reimplementation cycle.
