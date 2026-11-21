# SKYSHIFT 0.27.2 — Architectural Geometry & Panel Parity

This is not another painted-panel imitation. The approved Skyline 0.24.1 sculptor, itself upgraded from the authentic 0.21.3/0.23.1 geometry, is now a reusable function with optional arc bounds, curved profile sampler, source portal locations and sample step. Its **original defaults remain exactly s=0–368m** for Skyline, preserving its geometry, GPU shader and handling.

## Complete architecture port in this pass

- Reuse the ORIGINAL `buildStructuralTunnelData` with true 0.58m raised panels, faceted lips, recessed graphite scores, physical end caps, concave shoulder supports and (High) service conduits. No approximated 2D rectangles or shader-only bevels.
- For Neon Vault pass `vaultCrossSection0270` and its existing banked `positionAt` into the original sculptor: every panel sits on the real 3400m C2 race path, not on a straight-line copy of Skyline. Global 22m panel cadence; portal cutouts synchronized with the 42.5m native cyan arches, including every 170m chunk boundary.
- 20 independently frustum-culled 170m chunks. High appends 20 panel and 20 conduit batches; 4GB appends only 20 simplified original 0.23.3-style raised-panel batches. The 60 preexisting base draw batches remain untouched. The old source-colored cyan/orange lighting fixtures remain exactly where they are.
- The new geometry shares the single 0.26.2 packed-metal atlas already allocated by 0.27.1 and the same shader logic. No duplicate texture. Real recessed geometry and metallic finish layer are composed rather than reconstructed.
- No new colliders, world lights, HDR passes, physical reflection samples, road, rail, ship, GRIP, handling, camera or lap logic. Skyline and Aurora cannot activate this module.
- URL `?track=vault&v=0.27.2&vaultArchitecture=classic` restores the same 0.27.1 material/geometry. The original 0.27.1 option still controls the micro-material layer.

## Required acceptance and honest limits

- New Node tests validate the literal Skyline builder import, exact geometry invariants on first/last chunks and both graphics tiers, original profile clearance and old-track protection.
- Real Chromium/WebGL 1536×870 **same-frame** A/B at four High and two 4GB positions, including the final bend. White solar spill, dark road, native cyan fixtures, ship/camera alignment and finite triangle/draw-call budgets must remain valid.
- Only release when screenshots show the *structural* improvement, not merely painted seams, and the existing 0.27.1 and 0.26.5 historical tests are green.
- Future source-local GGX reflection transfer may still improve surface light response, but **the main Skyline raised-panel architecture is transferred in this pass**, not deferred to dozens of new passes.
