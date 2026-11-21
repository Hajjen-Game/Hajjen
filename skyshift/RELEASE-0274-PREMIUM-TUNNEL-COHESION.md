# SKYSHIFT 0.27.4 — Premium Tunnel Cohesion & Finish

## Release goal

**NEON VAULT stays the same 3 × 3400m race.** Do not invent new road structures, jump sections, missing mobile panels or new lighting technologies. This is the finishing pass for the already working 0.27.0–0.27.3 source art. The core visual reference remains Skyline 0.26.5.

## Exactly what changes

- The original `0.27.3` native physical GGX coats are retained. Add optional `uVaultPremiumFinish0274` to those SAME programs, with deterministic track-metre (22m bay) roughness shaping. Recesses farther from existing sources stay darker/satin; real source-near metal has tighter highlights. The High tier adds extremely mild per-bay directional variation; the 4GB tier deliberately omits micro sparkle.
- Preserve the original `0.27.2` **real raised panels** (20 chunk batches mobile, 40 High). No additional mesh, triangles, physics collider or texture allocations. The existing `0.26.2` packed metal atlas is still reused, and the `0.26.0/0.26.1/0.26.5` strip-GGX code remains authoritative.
- Small cyan/amber brightness-shape differential applied solely to the existing **authored lamp emitter material**. Less uniform cyan wash, readable warm practicals. Nothing is added to world directional/hemisphere light, bloom strength or exposure.
- Existing lower rail's **native 0.27.3 MeshStandardMaterial GGX** becomes satin farther from its actual 24m cyan source windows, with unchanged source positions and the original source mask. No new reflection samples.
- All 0.27.3 physical lights and fixtures stay available when selecting `?vaultFinish=classic` to disable ONLY 0.27.4. This is an exact same-frame A/B with `__skyshiftVaultFinishFrameProof` when `vaultFinishFrameProof=1` is passed.
- High / 4GB preserve large structural relief. No attempt to force desktop 40 mesh batches onto old low-memory Samsung phones.
- Skyline and Aurora, track, camera, GRIP, ship, road, 120Hz driving, 3 laps, local fixture positions and source palettes stay unchanged.

## Verification and release criteria

- New unit tests for source-only 0.27.4 shader hooks, deterministic 22m material coordinates, mobile detail suppression, existing sampler preservation, exact original 0.27.3 fallback and no new drawing cost.
- Genuine Chromium/WebGL proof at 1536×870 with **same camera/ship/zone and the same physical 0.27.3 GGX**: 110/985/1820/3230m High and 110/1910m 4GB. Capture 12 PNG images. Fail for no visible change, road washout, white sun leakage, lost cyan/amber fixture identity, lost darkness, shader compilation errors, absent large mobile panel geometry or changed physics.
- Retain all historical Skyline 0.26.5 and Vault 0.27.0–0.27.3 tests and the post-merge version check.
- The stable geometry/lighting pipeline is deliberately **not expanded** beyond this point pending human gameplay screenshots. No promise that generic screenshot tests substitute for actual phone GPU/performance observation.

Browser A/B: `?track=vault&v=0.27.4` vs `?track=vault&v=0.27.4&vaultFinish=classic`.
