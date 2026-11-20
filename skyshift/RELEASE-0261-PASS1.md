# SKYSHIFT 0.26.1 — True Local Reflections · Pass 1

## Visual intent

Make the original dark titanium panels and curved ribs reflect the *actual
existing* cyan LED coves and orange portal fixtures as extended sources.
The intended result is wider, moving GGX highlights and stronger material
form, not global wash, a brighter sky, or extra fake neon strips.

## Implementation

- Preserve SKYSHIFT 0.26.0 True Metal Materials P2 and Unified Tunnel Lighting
  1.0, including original physical-metal coats and local cold/warm uniforms.
- Integrate finite emissive **line strips** by sampling the native Three.js
  `RE_Direct` GGX physical BRDF multiple times at track-tangent offsets.
- Derive world-space tangent from the **original banked tunnel**, not camera
  orientation. Avoid linear screen-space fake reflections.
- Compute masks based on the **existing 20 cyan 12–14m LED coves** and
  **20 short orange fixtures**, restricted to real tunnel portal segments.
- High graphics: three cyan and two amber GGX integration samples per pixel.
  Simulated 4GB: two cyan and one amber samples, panel layer only.
- Append shading to existing P2 MeshPhysicalMaterial; no added geometry,
  material layers, dynamic lights, environment maps, SSR passes or draw calls.
- Keep the existing 0.26.0 P2 physical point lights and 0.26.0 P1 graphite
  with original zone wave, rail/road and ship illumination unchanged.

## Why not PMREM or RectAreaLight yet?

Official Three.js PMREM documentation supports GGX-filtered environment
radiance, but injecting an unisolated scene/global environment would undo
the separately engineered solar-sealed material pipeline. Constructing and
prefiltering local tunnel-only cubemaps also costs memory at mobile scale.

RectAreaLight/LTC represents broad light panels well, but requires custom
lighting integration and associated textures to work with the P2 shader,
which currently deliberately replaces the global light loop. This first
pass samples source *extent* with the native RE_Direct implementation instead.

These are deliberate research-guided tradeoffs, not a claim that the
approximation is full ray-traced, LTC or PMREM reflections. After visual
verification we can benchmark optional static local PMREM probes on desktop
in a later dedicated pass.

## Comparison and acceptance

Default `?v=0.26.1` enables true finite local metal reflections.
`?v=0.26.1&localReflections=classic` reverts to the original 0.26.0 P2
metal response with no additional local reflections.

Browser QA: `?v=0.26.1&localReflectionsSmoke=1&localReflectionsFrameProof=1&trackRepairSmoke=1&waveSmoke=1`

Real Chromium screenshot test must:
- render identical camera and frame at cyan, violet, gold and jade zones;
- produce measurable change in wall/rib pixels with retained cyan/amber;
- avoid neutral overexposure and preserve original road pixel response;
- verify 8GB and 4GB quality variants, the original shadow room, GRIP,
  native zone wave and solar seals;
- verify `localReflections=classic` preserves the published P2 material.

**Release gate:** Keep PR unmerged if the real WebGL screenshot improvement
is too subtle, too bright, degrades contrast or lowers mobile quality.
Run full 67-job release suite only after fast tests, and publish via main
only after it is green. SSR road, premium texture library, and global color
grading are intentionally deferred to 0.26.1 Passes 2–4.
