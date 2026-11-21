# SKYSHIFT 0.27.3 — Full Tunnel Lighting & Visual Parity

## Why this is a single integrated port

SKYLINE 0.26.5 already contains approved true metal and local finite-source light transport. NEON VAULT 0.27.2 now has the real raised-panel sculptor, but its panel surfaces were dark MeshBasicMaterial and its inlaid lights rarely reflected off that metal. This pass **calls the actual Skyline source functions** rather than inventing another set of fake neon/gloss effects.

## Implemented in this PR

- The **original 0.26.0 Pass 2** `installTrueMetalPBRShader` is attached to new `MeshPhysicalMaterial` coats sharing the existing 0.27.2 raised-panel geometry, using native GGX Fresnel, metallic roughness and zero external directional/hemisphere loop.
- The **original 0.26.1** `installLocalStripShader0261` adds multi-sample cyan and warm finite-source GGX. High quality has the original 3+2 strip taps (in addition to the initial 2 native lights); 4GB has 2+1 taps.
- **0.26.5 wall-local response** `patchPhysicalWall0265` reuses the existing physically based light and roughness mask instead of blanket brightening the roof.
- The **same 0.26.2 shared packed metal atlas** now drives the physical coat's true roughness and finish, not just a cosmetic basic-material tint.
- Precise 27m roof cyan, 42.5m orange wall and 24m lower rail source coordinates come from NEON VAULT's **actual 0.27.0 authored emitter geometry**, projected into the native C2-banked 3400m positions. No old 368m source mask may clip the late circuit.
- Reuse the **real 0.26.5 original aero-barrier MeshStandardMaterial** with bounded lower bevel GGX close to the actual short cyan inlays: two rail taps High, one on 4GB, instead of global glossy rails.
- Increase the existing emissive RGB response of the original source ribbons locally; do not add fake light objects, bloom passes, outdoor sun, global exposure or road washout.
- No different flight physics, GRIP, lap logic, ship, camera, collision geometry, or track shape. Older Skyline and Aurora lighting remains unchanged.

## Honest boundaries / performance

The new physical coats add 40 High / 20 mobile render batches to NEON VAULT. This is intentional reuse of Skyline's approved overlay technique; no duplicate 0.26.2 texture is allocated. The 0.27.2 basic substrates remain underneath the physical coats for dark panel recesses. Mobile uses a single shared physical material and fewer finite samples.

The full 0.26.5 Skyline room is visually composed from other bespoke light meshes as well; this pass aims for comparable **local material physics and luminous hierarchy** rather than falsely claiming pixel-identical geometry or global exposure.

## Tests and release gates

- `node --test skyshift/vault-full-lighting-v0273.test.mjs`: actual 0.26.x shared functions, exact 3400m source positions and attributes, native rail GGX, original course/version protections.
- `node skyshift/browser-vault-lighting-v0273.mjs`: **real** Chromium/WebGL 1536×870 same-frame 0.27.2-vs-0.27.3 comparison, High at 110/995/1840/3230m, 4GB at 110/1910m; separate shader compile, white spill, cyan survival, dark road, GRIP and full-lap checks.
- Historical 0.26.x source tests, 0.27.0/0.27.1/0.27.2 WebGL and post-merge version guards still run.
- Use `?track=vault&v=0.27.3&vaultLighting=classic` to restore the exact 0.27.2 look for any detected visual regression.

No merge until **all** real GPU and legacy controls pass.
