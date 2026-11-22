# SKYSHIFT 0.28.5 – Shared Tunnel Spatial Wavefront Parity

## Reported issue
In NEON VAULT the tunnel changes zone color before the actual white/color wave crosses the road. The original Skyline-shaped tunnel is now correctly reused, but it is ten 368-metre *source* modules adapted onto the new 3400-metre course. Its original shader's `trackS` is module-local, while the road/rail and fixed-step wave scheduler track a global race arc.

This is not a PMREM filtering problem. The static PMREM probe of 0.28.4 can stay unchanged.

## Root cause
1. Native tunnel shader fragments compared `vTunnelTrack-uTunnelFront` and `vRebirthTrack-uRebirthFront` **without** converting local source metres into their real VAULT track position. After the wavefront moves beyond 368m, most tunnel modules recolor early or in unison.
2. The original road shader recolors only a narrow crest in space, then changes its *entire base palette* when the player's stage switches. The tunnel shader already colors the entire region behind its front. These two models cannot display an aligned moving color boundary.

## Fix (Vault 0.28.5 only)
- Attach a late, reversible shader decorator to the original Skyline tunnel surface materials, AFTER all native 0.26.5 GGX/finish wrappers. Each module receives its existing `start`, `scale` and the original lap length as read-only uniforms.
- Compute `globalS = moduleStart + sourceTrackS * moduleScale` and use the exact road periodic signed wave distance `mod(globalS-front + 0.5*lap,lap)-0.5*lap`. Preserve local `trackS` for microtexture, local cyan/amber GGX light sources, gradients and all authored geometry.
- Make VAULT's existing indexed road material color from the same old palette behind/ahead split, with the original tunnel's **66m transition feather**. Keep the existing wave core/halo/white seam, boost glyphs, scene postprocessing and source fixtures intact.
- Maintain fixed 120Hz wave scheduling, nine-zone order, zone duration, speed escalation, steering, GRIP, collision, boost physics, camera and PMREM exactly as in 0.28.4.
- Skyline, Aurora, 0.28.1–0.28.4 and `?waveSync=classic` do not install these changes.

## QA
- Unit: 10 module positions, every module seam and 3400m wrap, fronts on all 3 race laps, identical road/tunnel signed distance to within 0.00001m, correct 66m feather, same physical panel/metal fixture shader, reversible wrapper.
- Real Chromium/WebGL screenshots: wavefront at 350m, 1840m and 3230m, real High and simulated 4GB, original 0.28.4 comparison. Two wavefront positions and an unchanged camera/frozen flight allow simultaneous before/after wall-and-road pixel checks.
- Fail release on a blank ShaderProgram, absent source module, changed physical geometry, misplaced wavefront, legacy regression or excessive white illumination.

## Test URLs
- `https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.5`
- Classic fallback: `?track=vault&v=0.28.5&waveSync=classic`
- Historical PMREM version: `?track=vault&v=0.28.4`
- QA: `?track=vault&v=0.28.5&waveParitySmoke=1&trackRepairSmoke=1` then `__skyshiftVaultWaveParityAudit()`.

Any separate visual defects can be reviewed with PC captures later. This pass is exclusively focused on a correct shared spatial wave.
