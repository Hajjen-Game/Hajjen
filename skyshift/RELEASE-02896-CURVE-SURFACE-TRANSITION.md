# SKYSHIFT 0.28.9.6 – Curve Surface Artifact & Transition Seam Cleanup

## Evidence and root-cause diagnosis
The user's full-resolution desktop screenshots 3 and 4 show disjoint dark/bright road patches in a curve and an abrupt rectangular chromatic surface boundary. 0.28.9.5's desirable Skyline-style source-local road glow and wave-coupled wall material must be retained.

Source audit:
1. `premium-track-v0160.mjs` builds the **original contiguous indexed road**, with shared normals from `smooth-track-v0160.mjs`. There is no detached physical plate to delete. The road shader evaluates `wave1/2/3D = mod(s - front + 0.5L, L) - 0.5L` and colors old/new via `1 - smoothstep(-66,66,signed)`. At the antipodal point `±L/2`, the signed coordinate jumps by 3400m and the color jumps directly between the two palettes, producing a hard full-road seam when the front is far away.
2. `shared-straight-edge-parity-v02891.mjs` correctly disables low cyan inlays in ALL curves and reserves **12m** on both sides of curve boundaries, but its original **0.8m** attenuation is used as a multiplier for the road's physical cyan reflected-light terms. That creates a visually sudden cut in the shoulder light response as the safe straight ends; changing the physical emitter's bend classifier would violate the approved behavior.
3. Other source-positioned portal/cove/cyan road GGX and the approved 0.28.9.5 real road pools are not broad overlays and remain untouched.

## Surgical implementation
- `curve-surface-continuity-v02896.mjs` wraps the **same existing** road `MeshStandardMaterial` after 0.28.9.5, no new shader attributes or mesh draws. Pre-existing `edgeStraightMask02891` per-vertex data is attenuated on the **safe straight only** with a C1-smoothed 8m ramp rather than the original abrupt 0.8m ramp. This never increases any vertex's value, emits no light in curves, and does not move or remove the original visible 6.5m LED geometry. Original float values are preserved and restorable for exact same-frame A/B.
- Correct only the **chromatic** old/new palette amount around the antipodal `±1700m` world-wave wrap with a 180m smooth window, matching both sides at 50% color and zero slope. The actual 66m main advancing wave and white-core, filaments, timing and speed remain unchanged. Applies to original wave stage 1–3, native arch GGX, original ceiling cove GGX and 0.28.9.5 local edge-pool pigment using the same helper. This prevents an old-to-new color slab across the road at half-lap, not a new wave.
- The same core source/mask rules can be reused for future courses: track-specific curve geometry data via shared sampler, no new Vault duplicate renderer. **Vault is first activated**; original Skyline 0.26.5 remains unchanged until independently visual-approved.
- Does **not** attempt to hide a possible actual geometry/normal error by painting over it. Original indexed positions, normals, colliders, rails, ship, grip, auto-gas and steering are untouched.

## Comparison URLs
- New: `https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.6`
- Exact original 0.28.9.5 presentation within the same new runtime: `?track=vault&v=0.28.9.6&surfaceContinuity=classic`.
- Only curve optical mask: `?track=vault&v=0.28.9.6&waveSeam=classic`.
- Only chromatic transition seam: `?track=vault&v=0.28.9.6&curveBlend=classic`.
- Real same-frame proof `?curveContinuitySmoke=1&archOpticsSmoke=1&trackRepairSmoke=1` exposes four road-render outputs (classic/curveOnly/waveOnly/after) with actual native Manta/GRIP/C2 track.

## Verification
- Source-specific Node tests: exact no-effect for versions <=0.28.9.5, strict nonincrease of any old safe-straight optical mask, zero effect anywhere in curves, smooth derivative within the old light cutoff, 3400m periodic palette continuity and exact rollback, no changes to white-core or wavefront shader logic.
- Real WebGL Chrome/SwiftShader screenshots at curve approaches, actual curves and antipodal colored zone transition, High + 4GB profiles; compare original render to each enabled optical change, check shader errors and large-scale wash.
- All prior 0.28.9.1, .3, .4, .5 visual/physics checks required before merge and Pages deployment.

*Interpretation*: This addresses specific light-mask and wave-wrap discontinuities found in code. If the user's next real-device screenshots reveal a separate surface geometry issue, that should be investigated independently rather than misrepresented as solved by shader smoothing.
