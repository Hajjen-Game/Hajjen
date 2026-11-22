# SKYSHIFT 0.26.0 — True Metal Materials · Pass 2

## Goal and approach
Use real Three.js native MeshPhysicalMaterial parameters and its built-in
GGX/Fresnel BRDF for brushed metal that reflects the already-approved
cool cyan coves and warm orange portal practicals. Keep the pass-1 deep
graphite, neon arches, white-core containment, original road and flight
mechanics unchanged.

## Technical scope
- Apply source-local physically lit transparent metal specular coats to the
  original raised HARDSURFACE_PANELS and CURVED_RIBS (desktop), and only
  HARDSURFACE_PANELS on low-memory devices.
- Real material roughness/metalness and selective clearcoat. CPU positions
  of the actual banked tunnel coves and existing portal lamps are supplied
  as vertex attributes; world-space emitter positions are camera-independent.
- Replace the MeshPhysicalMaterial **global scene light loop** with two native
  RE_Direct physical BRDF evaluations. This prevents bright exterior solar
  illumination from reaching the interior metal. Original Basic graphite
  remains behind the physical layer, untouched.
- Two added draw calls high, one on low-memory devices. Zero new lights,
  texture maps, bloom passes, colliders, road or ship changes.
- Same-build comparison: `?v=0.26.0&trueMetal=classic` restores exact
  original dual-tone Pass 1 surface appearance. For earlier 0.25.1 baseline,
  `?dualTone=classic` also turns off the physical layer.

## Definition of complete
- Unit regression for native PBR shader patch, dynamic A/B, original banked
  profile, source positioning, and no gameplay or solar changes.
- **Real Chromium WebGL same-camera** screenshots and pixel QA across
  cyan, violet, gold and jade, plus 4 GB simulation; check unchanged road,
  protected neon and no new white glare.
- GitHub artifact `skyshift-v0260p2-physical-metal-webgl-proof` required.
- If the real metal looks too glassy, bright, or too subtle, tune the
  local specular/roughness **before merge**. Do not accept green unit tests
  as visual evidence.

## Explicit design limitation
Pass 2 introduces genuine physically based reflective material on key
surface layers, rather than replacing the entire earlier
solar-isolated multi-version shader chain. The existing authored graphite
substrate is deliberately preserved for look and stability.
