# SKYSHIFT Architecture Cleanup 2.0 — Final Stage N acceptance review

**Baseline:** `03f2566aa4d3efaa7773db4cf4989353a6a79c29` (Stage M merged; real historical WebGL QA and GitHub Pages guard/deployment succeeded).  
**Scope:** Cross-track verification and closing out the architecture effort. **No new source-file moves or runtime changes.**

## Decision

**Architecture Cleanup 2.0 can close after this final audit PR passes.** Stage O is reserved for a *reproducible, release-relevant defect*; no extra mass migration is justified by the number of remaining historical files.

The experimental Stingray HERO relocation PR #191 was **closed without merging** because it exceeded the agreed Stage N scope. Its branch/history is retained. The game still uses its prior tested shipping layout.

## Verified current release contracts

| Course | Geometry and gameplay | Tunnel policy | Shared components |
| --- | --- | --- | --- |
| Skyline | Independent original Skyline course; shared flight/GRIP engine | Authored 368 m tunnel | Original 0.26.5 panel/material/GGX source, common style |
| Aurora | Independent open-road course; shared flight/GRIP engine | **No tunnel** | Shared route plan/style contract, no unwanted tunnel mesh |
| Neon Vault | Independent 3400 m circuit geometry; shared flight/GRIP engine | 3400 m enclosed | Actual original Skyline tunnel renderer remapped to Vault's banked sampler, including mobile/4 GB mode |

Evidence:
- `tracks/shared/track-selection-v0160.mjs` declares exactly these three live course IDs.
- `tracks/shared/circuit-layout-v0160.mjs` chooses distinct authored geometries; `trial-v0165.mjs` is the common flight engine.
- `shared-tunnel-architecture-v0280.mjs` defines a single immutable style and separate route sections.
- `shared-tunnel-runtime-v0280.mjs` installs the original Skyline pipeline or the original Skyline source reused over Vault, with legacy fallback.
- `true-shared-tunnel-renderer-v0281.mjs` reuses the original `installPremiumMetalSurfaceLibrary` and remaps `positionAt` rather than implementing a second imitation tunnel.
- Existing `tests/browser/browser-shared-tunnel-v0280.mjs` and `tests/browser/browser-true-shared-tunnel-v0281.mjs` exercise real Chromium/WebGL, skyline, vault and aurora, 4 GB and historical comparisons.
- The mandatory `tests/architecture/active-entrypoint.test.mjs` imports the final Stage N test, so its contract runs in the existing architecture safety gate without introducing another heavyweight CI workflow.

## Future fourth course: reuse boundary

The shared geometry and material *authoring primitives* accept a new track ID, its own `positionAt` sampler and any ordered, disjoint tunnel sections. The final test constructs and checks five 4 GB geometry chunks across two disjoint intervals of a synthetic 6200 m course. There is no second source geometry or material palette.

**Honest limitation:** An unregistered fourth course is **not yet playable**. It still needs the normal game-content integration: a course layout, registration, UI selection and explicit hookup of the appropriate tunnel renderer, plus WebGL and performance verification. In particular, the current live renderer activation is deliberately guarded to protect the existing three routes. Those steps belong to the future course feature, **not** a prerequisite to finish restructuring today's game, and must not be simulated by silently enabling Vault-only lighting on arbitrary tracks.

## Stage O decision and final exit criteria

- Stage O: **not triggered by this code audit**. Open only if CI or the next game release exposes a specific reproducible architectural regression.
- No production rendering, physics, GRIP, camera, track, menu, assets or module moves in this PR.
- All existing historical integrity and active-module graph tests remain mandatory.
- PR cannot merge with any failing mandatory checks. Post-merge confirm `main` historical track QA, Pages publication guard and Pages deployment.
- Keep historical `game-v*` snapshots intact. Root-file count by itself is not a correctness defect.
- Resume game-development priorities: gameplay, performance/startup stability and the approved tunnel's visual finish, rather than further generalized cleanup.
