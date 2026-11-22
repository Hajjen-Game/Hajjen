# SKYSHIFT 0.28.9.7 – Startup Stability & Shared Resource Deduplication

## Why this is a startup problem (source-verified)
- `game-v0210.mjs` calls `initScene()` synchronously before `__skyshiftBootReady`. For Vault it immediately builds one contiguous 3,400m native road and then `installTrueSharedTunnelRenderer0281` installs **ten full Skyline 0.26.5 tunnel-source modules**, each with original geometry, physical metal coats, local-source buffers and fixture shader wrappers. This is legitimate geometry reuse but is not a lightweight shared instance.
- Every invocation of `installPremiumMetalSurfaceLibrary` previously called `makePremiumMetalTexture0262`, generating the **same deterministic 256² or 128² RGBA packed titanium atlas** for each of the 10 modules, uploading/holding 10 separate identical mipmapped WebGL textures.
- Later, still before boot-ready, the real `PMREMGenerator.fromScene` captures the completed Vault scene at 110m with six faces and GGX radiance filtering, 256px High or 128px 4GB. This is a separate large GPU/driver operation and potential context-loss site, **not yet proven to be the user's crash**.

## Safe first optimization
- Lease ONE original packed atlas per Three.js runtime and graphics quality through a reference-counted WeakMap. No changes to generator, texels, mipmap, filtering, UVs, normal response, PBR shaders, source positions, camera, ship, GRIP, physics or tunnel geometry. 10 modules reference one exact same GPU texture; it is freed only after all original source modules release it.
- `?startupAtlas=classic` reverts to **10 independent original atlas allocations**, for same-build A/B timing and visual comparison without editing any tunnel.
- Add `window.__skyshiftStartupAudit()` accessible in browser (optionally with `?startupAudit=1`), with boot elapsed time, each major installation phase, shared tunnel CPU duration, PMREM synchronous GPU duration, WebGL memory/program counts, distinct scene material/geometry counts, allocated atlas count and optional JS heap.
- Record `__skyshiftBoot.readyAfterMs` and `failedAfterMs` to distinguish slow import/network from synchronous scene creation.
- In new real Chrome/WebGL regression use four cold boots: normal High, old independent 10-atlas High, `?pmrem=off` High for GPU cost isolation, and normal 4GB. Each check original ship and native scene after starting, detects crashes/context loss and publishes screenshots/metrics.

## Remaining investigation gate
**Do not call this a complete startup-crash cure without measurements.** Chrome renderer-process crashes, PMREM compile stalls and giant 10-module geometry still need evidence. If PMREM dominates elapsed time, optimize/cull the actual reflective scene capture or defer it safely in a subsequent change while keeping the approved metal/reflection appearance. If main-thread tunnel-building dominates, optimize repeated position sampling and shader/material build work without deleting geometry or lowering quality. First wait for the before/after benchmark and read its JSON.

## Verification
- Node deterministic cache checks: exact pixels 256/128, high vs 4GB independence, 10:1 upload, reference-counted safe disposal, A/B old separate allocations.
- All existing 0.28.1–0.28.9.6 historical and real-game regressions remain required to merge.
- Skyline uses the same atlas generator, but since it installs one source, its output remains unchanged.

## Links (once Pages deployed)
- `https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.7`
- Old allocations in exactly same 0.28.9.7 shaders: `?track=vault&v=0.28.9.7&startupAtlas=classic`
- GPU-capture diagnostic: `?track=vault&v=0.28.9.7&pmrem=off`
