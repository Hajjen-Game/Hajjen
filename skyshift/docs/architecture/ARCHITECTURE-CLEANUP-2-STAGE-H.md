# SKYSHIFT Architecture Cleanup 2.0 – Stage H: Flight & Handling

Base: `737c45484d4b1c420ab0d874f1a76488cf511676`. This stage relocates **18 live/historical flight, kinetic camera, unified flight, GRIP, steering, trick, and boost-related modules** to `skyshift/flight/`. The ship art/GLTF relative asset loaders, shared tunnel, road materials, current HTML/boot/game entrypoints, graphics, shaders, vehicle feel and level design are untouched except for source import paths.

- `flight/stageH-migration-manifest.json` records the original immutable Git blob SHA for every relocated source, plus the exact external root-import paths that must be rebased.
- Independent architecture guard verifies all source hashes, moved ESM import resolution and no stale root paths in executable files or GitHub workflows.
- Original Stage 5–8 unit SHA expectations and assertions remain in force via a strict reversible Stage H path overlay.
- All identified historical game, trial, browser QA, unit test, and full-CI references to these moved modules are rebased. The active game remains `index.html` -> `boot-v0210.js` -> `game-v0210.mjs` and runs Skyline, Aurora and Vault.

**Mandatory before merge:** independent architecture guard green; **35/35 fast PR tests** green including all 33 actual Chromium/WebGL checks; diff verified to contain only path rewrites in consumer source plus unchanged relocated modules; base main checked for changes. After merge, full historical main suite and Pages deployment green. Roll back via one PR revert, without deleting old game versions.
