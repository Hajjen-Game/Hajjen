# SKYSHIFT 0.28.1 — True Shared Tunnel Renderer

## Why this exists
The two user screenshots after 0.28.0 revealed a real mismatch: Skyline's approved actual mesh/fixture installer still differed from the separately built Vault pipeline. Sharing a panel palette and sculptor was insufficient. **Skyline's installed artwork is the source of truth.**

## What 0.28.1 actually changes
- **Same concrete original renderer:** the NEON VAULT route calls `installPremiumMetalSurfaceLibrary`, which installs the existing Skyline source chain, including the real 0.21.1 swept shell, 0.24.1 raised panels, 0.26.0 native physical metal, 0.26.1 finite local reflections, and 0.26.2 packed metal finish.
- **Same original final wall response:** apply the already-authored 0.26.4.1 unified metal surface response, 0.26.4.2 local physical reflection finish, 0.26.4.3 fixture transport, and 0.26.5 wall-local shader wrappers to these **same original material instances**. No parallel Vault PBR shader or custom visual approximation is used in shared mode.
- **Same original practical fixture meshes:** the 0.26.3.2 connected amber arch-foot geometry and short cyan edge inlay geometry are built using their existing exported Skyline generators on the same banked adapter.
- **Modules, not a replacement course:** the 3,400 m Vault is covered by 10 balanced 340 m modules. Each module calls the 368 m original Skyline authoring function with a deterministic, normalized along-track adapter. Source-local x/y, color masks, material geometries, GL/GGX, and section shape remain in original Skyline space. The longitudinal spacing is compressed by 7.6% in Vault to avoid a short final fragment; it is not claimed to be pixel-identical in arbitrary bends.
- **Road, collision rails, ship, GRIP, camera and flight physics remain the course's existing implementation.** The 0.26.5 **wall** finish is shared; the original Skyline **road and rail** response cannot simply be installed on Vault's independent road geometry. Their separate visual finish must be validated and consolidated deliberately; no silent physics changes are acceptable.
- **Safety:** `?trueSharedRenderer=classic` reinstates the entire preexisting Vault 0.27.0–0.27.4 renderer. Failure during shared source installation disposes partial modules and triggers that same fallback. Historical `?v=0.28.0` remains unchanged. Skyline 0.26.5 remains the original reference path.
- **Cost:** this is the genuine source renderer instantiated on 10 sections, not 10 separately maintained material/shape definitions. Source texture assets are presently allocated per module. This is deliberately verified on both High and 4 GB profiles before release; a further pooled atlas and streaming optimization may be needed if device testing shows a regression.

## QA / acceptance
The PR must pass source-module geometry tests, full existing flight/GRIP and release-version tests, and **real Chrome/WebGL** screenshots for Skyline 0.26.5, Vault 0.28.1 at the beginning/middle/end, Vault 4 GB, old Vault fallback and Aurora. Do not infer visual success from unit tests alone.

- Shared: `?track=vault&v=0.28.1&sharedTunnelSmoke=1`
- Classic A/B: `?track=vault&v=0.28.1&trueSharedRenderer=classic&sharedTunnelSmoke=1`
- Reference: `?track=skyline&v=0.26.5&sharedTunnelSmoke=1`
- Audit: `window.__skyshiftSharedTunnelAudit().trueSharedRenderer`. Require 10 original source/metal/wall sections, 3,400 m coverage and `legacyVaultRendererUsed:false`.
- Test: `node --test skyshift/true-shared-tunnel-renderer-v0281.test.mjs`, `node skyshift/browser-true-shared-tunnel-v0281.mjs`.

## Important release boundary
**A green source-only test does not establish visual parity.** The PR remains a release candidate until its real WebGL proof confirms the authentic renderer is active, correctly sun-isolated, and visually close enough to the user-provided Skyline reference, with acceptable High/4GB performance. Preserve the source game until then.
